import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { z } from "zod";

const venueSchema = z.object({
  name: z.string().min(2),
  address: z.string().min(5),
  totalRows: z.number().int().positive().max(50),
  totalCols: z.number().int().positive().max(50),
  categories: z.array(
    z.object({
      name: z.string(),
      color: z.string(),
      rows: z.array(z.number().int().positive()), // which rows belong to this category
    })
  ),
});

/**
 * GET /api/venues — List all venues.
 */
export async function GET() {
  try {
    const venues = await prisma.venue.findMany({
      include: {
        seatLayouts: {
          include: { seatCategory: true },
          orderBy: [{ rowNum: "asc" }, { colNum: "asc" }],
        },
        _count: { select: { events: true } },
      },
    });

    return NextResponse.json({ success: true, venues });
  } catch (error) {
    console.error("Venues fetch error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/venues — Create a venue with seat layout (Admin only).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validatedData = venueSchema.parse(body);

    const venue = await prisma.$transaction(async (tx) => {
      // Create venue
      const newVenue = await tx.venue.create({
        data: {
          name: validatedData.name,
          address: validatedData.address,
          totalRows: validatedData.totalRows,
          totalCols: validatedData.totalCols,
        },
      });

      // Create seat categories and layout
      for (const cat of validatedData.categories) {
        const category = await tx.seatCategory.create({
          data: {
            name: cat.name,
            color: cat.color,
          },
        });

        // Create seats for each row in this category
        for (const rowNum of cat.rows) {
          for (let colNum = 1; colNum <= validatedData.totalCols; colNum++) {
            const rowLetter = String.fromCharCode(64 + rowNum); // 1=A, 2=B, etc
            await tx.seatLayout.create({
              data: {
                venueId: newVenue.id,
                seatCategoryId: category.id,
                seatLabel: `${rowLetter}${colNum}`,
                rowNum,
                colNum,
                isActive: true,
              },
            });
          }
        }
      }

      return newVenue;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Venue created successfully",
        venue,
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
    console.error("Venue creation error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500 }
    );
  }
}
