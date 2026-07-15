import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSeatHolder } from "@/lib/redis";
import { sendWaitlistOfferEmail } from "@/lib/email";
import { v4 as uuidv4 } from "uuid";

/**
 * GET /api/cron/cleanup — Scheduled cleanup job.
 * 
 * 1. Release expired seat holds (Redis TTL expired but DB not yet updated)
 * 2. Expire waitlist offers that have timed out and roll to next person
 * 
 * This should be called by a cron service (e.g., Vercel Cron, Railway Cron)
 * every 1-2 minutes.
 */
export async function GET() {
  try {
    const results = {
      expiredHolds: 0,
      expiredOffers: 0,
      newOffers: 0,
    };

    // ─── 1. Clean up expired seat holds ─────────────────────────────────
    const heldSeats = await prisma.eventSeat.findMany({
      where: { status: "HELD" },
    });

    for (const seat of heldSeats) {
      const redisHolder = await getSeatHolder(seat.eventId, seat.seatLayoutId);

      if (!redisHolder) {
        // Redis TTL has expired — release the seat
        await prisma.eventSeat.update({
          where: { id: seat.id },
          data: {
            status: "AVAILABLE",
            heldBy: null,
            heldUntil: null,
            version: { increment: 1 },
          },
        });
        results.expiredHolds++;
      }
    }

    // ─── 2. Expire timed-out waitlist offers ────────────────────────────
    const expiredOffers = await prisma.waitlist.findMany({
      where: {
        status: "OFFERED",
        offerExpiresAt: { lt: new Date() },
      },
      include: {
        event: { select: { title: true } },
        seatCategory: { select: { name: true } },
      },
    });

    for (const offer of expiredOffers) {
      // Mark as expired
      await prisma.waitlist.update({
        where: { id: offer.id },
        data: {
          status: "EXPIRED",
          offerToken: null,
          offerExpiresAt: null,
        },
      });
      results.expiredOffers++;

      // Find next person in line
      const nextInLine = await prisma.waitlist.findFirst({
        where: {
          eventId: offer.eventId,
          seatCategoryId: offer.seatCategoryId,
          status: "WAITING",
        },
        orderBy: { position: "asc" },
        include: {
          user: { select: { name: true, email: true } },
          seatCategory: { select: { name: true } },
        },
      });

      if (nextInLine) {
        const offerToken = uuidv4();
        const ttlMinutes = parseInt(
          process.env.WAITLIST_OFFER_TTL_MINUTES || "30",
          10
        );
        const offerExpiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

        await prisma.waitlist.update({
          where: { id: nextInLine.id },
          data: {
            status: "OFFERED",
            offerToken,
            offerExpiresAt,
          },
        });

        // Send email to next person
        sendWaitlistOfferEmail({
          to: nextInLine.user.email,
          customerName: nextInLine.user.name,
          eventTitle: offer.event.title,
          categoryName: nextInLine.seatCategory.name,
          offerToken,
          expiresAt: offerExpiresAt.toLocaleString(),
        }).catch(console.error);

        results.newOffers++;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Cleanup completed",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cron cleanup error:", error);
    return NextResponse.json(
      { success: false, message: "Cleanup failed" },
      { status: 500 }
    );
  }
}
