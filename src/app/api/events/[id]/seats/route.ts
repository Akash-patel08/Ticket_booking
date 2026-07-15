import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSeatHolder } from "@/lib/redis";

/**
 * GET /api/events/[id]/seats — Get real-time seat map for an event.
 * Combines DB status with Redis hold status for accuracy.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;

    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        venue: true,
        eventPricings: {
          include: { seatCategory: true },
        },
      },
    });

    if (!event) {
      return NextResponse.json(
        { success: false, message: "Event not found" },
        { status: 404 }
      );
    }

    // Get all seats with their layout info
    const eventSeats = await prisma.eventSeat.findMany({
      where: { eventId },
      include: {
        seatLayout: {
          include: { seatCategory: true },
        },
      },
      orderBy: [
        { seatLayout: { rowNum: "asc" } },
        { seatLayout: { colNum: "asc" } },
      ],
    });

    // Enrich with real-time Redis hold status
    const seats = await Promise.all(
      eventSeats.map(async (es) => {
        let status = es.status;

        // If DB says HELD, check if Redis hold still exists
        if (status === "HELD") {
          const redisHolder = await getSeatHolder(eventId, es.seatLayoutId);
          if (!redisHolder) {
            // Redis TTL expired — seat should be available
            // Update DB asynchronously
            prisma.eventSeat
              .update({
                where: { id: es.id },
                data: {
                  status: "AVAILABLE",
                  heldBy: null,
                  heldUntil: null,
                  version: { increment: 1 },
                },
              })
              .catch(console.error);
            status = "AVAILABLE";
          }
        }

        return {
          id: es.seatLayoutId,
          eventSeatId: es.id,
          label: es.seatLayout.seatLabel,
          row: es.seatLayout.rowNum,
          col: es.seatLayout.colNum,
          status,
          categoryId: es.seatLayout.seatCategoryId,
          categoryName: es.seatLayout.seatCategory.name,
          categoryColor: es.seatLayout.seatCategory.color,
          isActive: es.seatLayout.isActive,
        };
      })
    );

    // Get pricing info
    const pricing = event.eventPricings.map((ep) => ({
      categoryId: ep.seatCategoryId,
      categoryName: ep.seatCategory.name,
      categoryColor: ep.seatCategory.color,
      price: ep.price,
    }));

    return NextResponse.json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        venue: event.venue,
        isSoldOut: event.isSoldOut,
      },
      seats,
      pricing,
      grid: {
        rows: event.venue.totalRows,
        cols: event.venue.totalCols,
      },
    });
  } catch (error) {
    console.error("Seat map fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
