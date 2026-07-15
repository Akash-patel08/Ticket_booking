import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { getSeatHolder, releaseSeatHold } from "@/lib/redis";
import { generateQRCode } from "@/lib/qrcode";
import { sendBookingConfirmationEmail } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const checkoutSchema = z.object({
  eventId: z.string().uuid(),
  seatIds: z.array(z.string().uuid()).min(1).max(10),
});

/**
 * POST /api/checkout — Complete booking for held seats.
 * Uses Prisma interactive transactions for ACID compliance.
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
    const { eventId, seatIds } = checkoutSchema.parse(body);
    const userId = session.user.id;

    // Step 1: Verify all seats are still held by this user in Redis
    for (const seatId of seatIds) {
      const holder = await getSeatHolder(eventId, seatId);
      if (holder !== userId) {
        return NextResponse.json(
          {
            success: false,
            message: `Seat hold expired or not held by you. Please re-select seats.`,
            seatId,
          },
          { status: 409 }
        );
      }
    }

    // Step 2: Use Prisma transaction to atomically book all seats
    const bookingRef = uuidv4().slice(0, 8).toUpperCase();

    const booking = await prisma.$transaction(async (tx) => {
      // Get event details
      const event = await tx.event.findUniqueOrThrow({
        where: { id: eventId },
        include: {
          venue: true,
          eventPricings: { include: { seatCategory: true } },
        },
      });

      let totalAmount = 0;
      const bookingItems: { seatLabel: string; categoryName: string; price: number }[] = [];

      // Verify and update each seat
      for (const seatId of seatIds) {
        const eventSeat = await tx.eventSeat.findUniqueOrThrow({
          where: {
            eventId_seatLayoutId: {
              eventId,
              seatLayoutId: seatId,
            },
          },
          include: {
            seatLayout: {
              include: { seatCategory: true },
            },
          },
        });

        // Double-check: seat must be HELD by this user (DB-level verification)
        if (eventSeat.status !== "HELD" || eventSeat.heldBy !== userId) {
          throw new Error(
            `Seat ${eventSeat.seatLayout.seatLabel} is no longer available`
          );
        }

        // Find pricing for this seat category
        const pricing = event.eventPricings.find(
          (p) => p.seatCategoryId === eventSeat.seatLayout.seatCategoryId
        );
        const price = pricing?.price || 0;

        // Mark seat as BOOKED
        await tx.eventSeat.update({
          where: { id: eventSeat.id },
          data: {
            status: "BOOKED",
            bookedBy: userId,
            heldBy: null,
            heldUntil: null,
            version: { increment: 1 },
          },
        });

        totalAmount += price;
        bookingItems.push({
          seatLabel: eventSeat.seatLayout.seatLabel,
          categoryName: eventSeat.seatLayout.seatCategory.name,
          price,
        });
      }

      // Create booking record
      const newBooking = await tx.booking.create({
        data: {
          bookingRef,
          userId,
          eventId,
          totalAmount,
          status: "CONFIRMED",
          bookingItems: {
            create: bookingItems,
          },
        },
        include: {
          bookingItems: true,
          user: { select: { name: true, email: true } },
          event: {
            include: { venue: true },
          },
        },
      });

      // Generate QR code and create ticket
      const qrCodeData = await generateQRCode(bookingRef);
      await tx.ticket.create({
        data: {
          bookingId: newBooking.id,
          qrCodeData,
        },
      });

      // Check if event is now sold out
      const availableSeats = await tx.eventSeat.count({
        where: {
          eventId,
          status: "AVAILABLE",
        },
      });

      if (availableSeats === 0) {
        await tx.event.update({
          where: { id: eventId },
          data: { isSoldOut: true },
        });
      }

      return newBooking;
    });

    // Step 3: Release Redis holds (post-transaction cleanup)
    for (const seatId of seatIds) {
      await releaseSeatHold(eventId, seatId, userId);
    }

    // Step 4: Send confirmation email (fire-and-forget)
    sendBookingConfirmationEmail({
      to: booking.user.email,
      customerName: booking.user.name,
      bookingRef,
      eventTitle: booking.event.title,
      eventDate: booking.event.date.toLocaleDateString(),
      eventTime: booking.event.time,
      venueName: booking.event.venue.name,
      seats: booking.bookingItems.map((item) => item.seatLabel),
      totalAmount: booking.totalAmount,
    }).catch((err) => console.error("Email send failed:", err));

    return NextResponse.json({
      success: true,
      message: "Booking confirmed!",
      booking: {
        id: booking.id,
        bookingRef,
        eventTitle: booking.event.title,
        seats: booking.bookingItems.map((item) => item.seatLabel),
        totalAmount: booking.totalAmount,
        status: booking.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Checkout error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
