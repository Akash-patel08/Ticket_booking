import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/organiser/dashboard — Get organiser's event summary and revenue.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["ORGANISER", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json(
        { success: false, message: "Organiser access required" },
        { status: 403 }
      );
    }

    const events = await prisma.event.findMany({
      where: { organiserId: session.user.id },
      include: {
        venue: { select: { name: true } },
        bookings: {
          where: { status: "CONFIRMED" },
          include: { bookingItems: true },
        },
        _count: {
          select: {
            eventSeats: true,
            bookings: { where: { status: "CONFIRMED" } },
            waitlistItems: { where: { status: "WAITING" } },
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const summary = events.map((event) => {
      const totalRevenue = event.bookings.reduce(
        (sum, b) => sum + b.totalAmount,
        0
      );
      const totalTickets = event.bookings.reduce(
        (sum, b) => sum + b.bookingItems.length,
        0
      );

      return {
        id: event.id,
        title: event.title,
        date: event.date,
        time: event.time,
        venue: event.venue.name,
        totalSeats: event._count.eventSeats,
        ticketsSold: totalTickets,
        confirmedBookings: event._count.bookings,
        waitlistCount: event._count.waitlistItems,
        totalRevenue,
        isSoldOut: event.isSoldOut,
      };
    });

    const overallRevenue = summary.reduce((sum, e) => sum + e.totalRevenue, 0);
    const totalTicketsSold = summary.reduce((sum, e) => sum + e.ticketsSold, 0);

    return NextResponse.json({
      success: true,
      events: summary,
      overall: {
        totalEvents: events.length,
        totalRevenue: overallRevenue,
        totalTicketsSold,
      },
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
