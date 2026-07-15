import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const waitlistSchema = z.object({
  eventId: z.string().uuid(),
  seatCategoryId: z.string().uuid(),
});

/**
 * POST /api/waitlist — Join the waitlist for a seat category.
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
    const { eventId, seatCategoryId } = waitlistSchema.parse(body);
    const userId = session.user.id;

    // Check if already on waitlist
    const existing = await prisma.waitlist.findFirst({
      where: {
        userId,
        eventId,
        seatCategoryId,
        status: { in: ["WAITING", "OFFERED"] },
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: "You are already on the waitlist for this category" },
        { status: 409 }
      );
    }

    // Get the next position
    const lastEntry = await prisma.waitlist.findFirst({
      where: { eventId, seatCategoryId },
      orderBy: { position: "desc" },
    });

    const position = (lastEntry?.position || 0) + 1;

    const waitlistEntry = await prisma.waitlist.create({
      data: {
        userId,
        eventId,
        seatCategoryId,
        position,
        status: "WAITING",
      },
      include: {
        seatCategory: true,
        event: { select: { title: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Added to waitlist at position ${position}`,
      waitlistEntry: {
        id: waitlistEntry.id,
        position,
        categoryName: waitlistEntry.seatCategory.name,
        eventTitle: waitlistEntry.event.title,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: "Validation error", errors: error.errors },
        { status: 400 }
      );
    }
    console.error("Waitlist error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/waitlist — Get user's waitlist entries.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const entries = await prisma.waitlist.findMany({
      where: { userId: session.user.id },
      include: {
        event: { select: { title: true, date: true, time: true } },
        seatCategory: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, waitlist: entries });
  } catch (error) {
    console.error("Waitlist fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
