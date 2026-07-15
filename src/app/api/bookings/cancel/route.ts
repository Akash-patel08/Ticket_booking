import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendWaitlistOfferEmail } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const cancelSchema = z.object({
  bookingId: z.string().uuid(),
});

/**
 * POST /api/bookings/cancel — Cancel a booking and trigger waitlist auto-assignment.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { bookingId } = cancelSchema.parse(body);
    const userId = session.user.id;

    // Find booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingItems: true,
        event: {
          include: {
            venue: true,
            eventPricings: { include: { seatCategory: true } },
          },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, message: "Booking not found" },
        { status: 404 }
      );
    }

    if (booking.userId !== userId) {
      return NextResponse.json(
        { success: false, message: "Not your booking" },
        { status: 403 }
      );
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json(
        { success: false, message: "Booking already cancelled" },
        { status: 409 }
      );
    }

    // Cancel booking in a transaction
    await prisma.$transaction(async (tx) => {
      // Update booking status
      await tx.booking.update({
        where: { id: bookingId },
        data: { status: "CANCELLED" },
      });

      // Release all booked seats
      for (const item of booking.bookingItems) {
        // Find the event seat by label
        const eventSeat = await tx.eventSeat.findFirst({
          where: {
            eventId: booking.eventId,
            seatLayout: { seatLabel: item.seatLabel },
            status: "BOOKED",
            bookedBy: userId,
          },
          include: {
            seatLayout: { include: { seatCategory: true } },
          },
        });

        if (eventSeat) {
          await tx.eventSeat.update({
            where: { id: eventSeat.id },
            data: {
              status: "AVAILABLE",
              bookedBy: null,
              version: { increment: 1 },
            },
          });

          // Check waitlist for this seat category
          const nextInLine = await tx.waitlist.findFirst({
            where: {
              eventId: booking.eventId,
              seatCategoryId: eventSeat.seatLayout.seatCategoryId,
              status: "WAITING",
            },
            orderBy: { position: "asc" },
            include: {
              user: { select: { name: true, email: true } },
              seatCategory: { select: { name: true } },
            },
          });

          if (nextInLine) {
            // Generate time-limited offer
            const offerToken = uuidv4();
            const ttlMinutes = parseInt(
              process.env.WAITLIST_OFFER_TTL_MINUTES || "30",
              10
            );
            const offerExpiresAt = new Date(
              Date.now() + ttlMinutes * 60 * 1000
            );

            await tx.waitlist.update({
              where: { id: nextInLine.id },
              data: {
                status: "OFFERED",
                offerToken,
                offerExpiresAt,
              },
            });

            // Send notification email (fire-and-forget)
            sendWaitlistOfferEmail({
              to: nextInLine.user.email,
              customerName: nextInLine.user.name,
              eventTitle: booking.event.title,
              categoryName: nextInLine.seatCategory.name,
              offerToken,
              expiresAt: offerExpiresAt.toLocaleString(),
            }).catch((err) =>
              console.error("Waitlist offer email failed:", err)
            );
          }
        }
      }

      // Update event soldOut status
      await tx.event.update({
        where: { id: booking.eventId },
        data: { isSoldOut: false },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Booking cancelled successfully. Refund will be processed.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Cancellation error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
