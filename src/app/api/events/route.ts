import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const eventSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional().default(""),
  type: z.enum(["MOVIE", "CONCERT"]).default("MOVIE"),
  date: z.string(), // ISO date string
  time: z.string(), // e.g. "19:30"
  venueId: z.string().uuid(),
  imageUrl: z.string().optional().default(""),
  pricing: z.array(
    z.object({
      seatCategoryId: z.string().uuid(),
      price: z.number().positive(),
    })
  ),
});

/**
 * GET /api/events — List all events (with optional filters).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const search = searchParams.get("search");
    const upcoming = searchParams.get("upcoming");

    const where: Record<string, unknown> = {};

    if (type && (type === "MOVIE" || type === "CONCERT")) {
      where.type = type;
    }

    if (search) {
      where.title = { contains: search };
    }

    if (upcoming === "true") {
      where.date = { gte: new Date() };
    }

    const events = await prisma.event.findMany({
      where,
      include: {
        venue: { select: { name: true, address: true, totalRows: true, totalCols: true } },
        organiser: { select: { name: true } },
        eventPricings: {
          include: { seatCategory: { select: { id: true, name: true, color: true } } },
        },
        _count: {
          select: {
            eventSeats: { where: { status: "AVAILABLE" } },
          },
        },
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ success: true, events });
  } catch (error) {
    console.error("Events fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/events — Create a new event (Organiser only).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["ORGANISER", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Organiser access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = eventSchema.parse(body);

    // Create event with pricing
    const event = await prisma.$transaction(async (tx) => {
      const newEvent = await tx.event.create({
        data: {
          title: validatedData.title,
          description: validatedData.description,
          type: validatedData.type,
          date: new Date(validatedData.date),
          time: validatedData.time,
          venueId: validatedData.venueId,
          organiserId: session.user.id,
          imageUrl: validatedData.imageUrl,
          eventPricings: {
            create: validatedData.pricing.map((p) => ({
              seatCategoryId: p.seatCategoryId,
              price: p.price,
            })),
          },
        },
      });

      // Create EventSeat records for every seat in the venue
      const seatLayouts = await tx.seatLayout.findMany({
        where: { venueId: validatedData.venueId, isActive: true },
      });

      if (seatLayouts.length > 0) {
        await tx.eventSeat.createMany({
          data: seatLayouts.map((seat) => ({
            eventId: newEvent.id,
            seatLayoutId: seat.id,
            status: "AVAILABLE",
          })),
        });
      }

      return newEvent;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Event created successfully",
        event,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Event creation error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
