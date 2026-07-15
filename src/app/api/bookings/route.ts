import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/bookings — Get user's booking history.
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

    const bookings = await prisma.booking.findMany({
      where: { userId: session.user.id },
      include: {
        bookingItems: true,
        event: {
          include: {
            venue: { select: { name: true } },
          },
        },
        ticket: { select: { qrCodeData: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    console.error("Bookings fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
