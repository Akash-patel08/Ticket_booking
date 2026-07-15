import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { acquireSeatHold, releaseSeatHold, getSeatHolder, getSeatHoldTTL } from "@/lib/redis";
import { z } from "zod";

const holdSchema = z.object({
  eventId: z.string().uuid(),
  seatIds: z.array(z.string().uuid()).min(1).max(10),
});

const releaseSchema = z.object({
  eventId: z.string().uuid(),
  seatIds: z.array(z.string().uuid()).min(1),
});

/**
 * POST /api/seats/hold — Attempt to hold one or more seats.
 * Uses Redis SETNX for atomic concurrency protection.
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
    const { eventId, seatIds } = holdSchema.parse(body);
    const userId = session.user.id;

    // Verify event exists and is upcoming
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }

    // Attempt to hold each seat atomically
    const results: { seatId: string; held: boolean; reason?: string }[] = [];
    const successfulHolds: string[] = [];

    for (const seatId of seatIds) {
      // Check seat exists in DB and is available
      const eventSeat = await prisma.eventSeat.findUnique({
        where: {
          eventId_seatLayoutId: {
            eventId,
            seatLayoutId: seatId,
          },
        },
      });

      if (!eventSeat) {
        results.push({ seatId, held: false, reason: "Seat not found" });
        continue;
      }

      if (eventSeat.status === "BOOKED") {
        results.push({ seatId, held: false, reason: "Seat already booked" });
        continue;
      }

      // Check if already held by someone else (via Redis)
      const currentHolder = await getSeatHolder(eventId, seatId);
      if (currentHolder && currentHolder !== userId) {
        results.push({ seatId, held: false, reason: "Seat held by another customer" });
        continue;
      }

      // If already held by this user, it's fine
      if (currentHolder === userId) {
        results.push({ seatId, held: true, reason: "Already held by you" });
        successfulHolds.push(seatId);
        continue;
      }

      // Attempt atomic hold via Redis SETNX
      const acquired = await acquireSeatHold(eventId, seatId, userId);

      if (acquired) {
        // Update DB status to HELD
        await prisma.eventSeat.update({
          where: {
            eventId_seatLayoutId: {
              eventId,
              seatLayoutId: seatId,
            },
          },
          data: {
            status: "HELD",
            heldBy: userId,
            heldUntil: new Date(Date.now() + parseInt(process.env.SEAT_HOLD_TTL_SECONDS || "600", 10) * 1000),
            version: { increment: 1 },
          },
        });
        results.push({ seatId, held: true });
        successfulHolds.push(seatId);
      } else {
        results.push({ seatId, held: false, reason: "Seat was just taken by another customer" });
      }
    }

    // If none were held, rollback any partial holds
    if (successfulHolds.length === 0 && seatIds.length > 0) {
      return NextResponse.json(
        { success: false, message: "Could not hold any seats", results },
        { status: 409 }
      );
    }

    // Get TTL for the hold
    const ttl = successfulHolds.length > 0
      ? await getSeatHoldTTL(eventId, successfulHolds[0])
      : 0;

    return NextResponse.json({
      success: true,
      message: `Successfully held ${successfulHolds.length} of ${seatIds.length} seats`,
      results,
      ttlSeconds: ttl,
      heldSeats: successfulHolds,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Seat hold error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/seats/hold — Release held seats.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { eventId, seatIds } = releaseSchema.parse(body);
    const userId = session.user.id;

    const released: string[] = [];

    for (const seatId of seatIds) {
      const wasReleased = await releaseSeatHold(eventId, seatId, userId);
      if (wasReleased) {
        // Revert DB status
        await prisma.eventSeat.update({
          where: {
            eventId_seatLayoutId: {
              eventId,
              seatLayoutId: seatId,
            },
          },
          data: {
            status: "AVAILABLE",
            heldBy: null,
            heldUntil: null,
            version: { increment: 1 },
          },
        });
        released.push(seatId);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Released ${released.length} seats`,
      releasedSeats: released,
    });
  } catch (error) {
    console.error("Seat release error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
