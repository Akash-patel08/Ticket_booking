const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...\n");

  // ─── Create Admin User ────────────────────────────────────────
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@ticketbooking.com" },
    update: {},
    create: {
      name: "System Admin",
      email: "admin@ticketbooking.com",
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("✅ Admin user created:", admin.email);

  // ─── Create Organiser User ───────────────────────────────────
  const organiserPassword = await bcrypt.hash("organiser123", 12);
  const organiser = await prisma.user.upsert({
    where: { email: "organiser@ticketbooking.com" },
    update: {},
    create: {
      name: "Event Organiser",
      email: "organiser@ticketbooking.com",
      passwordHash: organiserPassword,
      role: "ORGANISER",
    },
  });
  console.log("✅ Organiser user created:", organiser.email);

  // ─── Create Customer User ────────────────────────────────────
  const customerPassword = await bcrypt.hash("customer123", 12);
  const customer = await prisma.user.upsert({
    where: { email: "customer@ticketbooking.com" },
    update: {},
    create: {
      name: "John Customer",
      email: "customer@ticketbooking.com",
      passwordHash: customerPassword,
      role: "CUSTOMER",
    },
  });
  console.log("✅ Customer user created:", customer.email);

  // ─── Create Seat Categories ──────────────────────────────────
  const premiumCategory = await prisma.seatCategory.create({
    data: { name: "Premium", color: "#F59E0B" },
  });

  const standardCategory = await prisma.seatCategory.create({
    data: { name: "Standard", color: "#3B82F6" },
  });
  console.log("✅ Seat categories created: Premium, Standard");

  // ─── Create Venue ────────────────────────────────────────────
  const venue = await prisma.venue.create({
    data: {
      name: "Grand Cinema Hall",
      address: "123 Movie Lane, Entertainment City",
      totalRows: 8,
      totalCols: 12,
    },
  });
  console.log("✅ Venue created:", venue.name);

  // ─── Create Seat Layout ──────────────────────────────────────
  const seatLayouts = [];
  for (let row = 1; row <= 8; row++) {
    for (let col = 1; col <= 12; col++) {
      const rowLetter = String.fromCharCode(64 + row);
      const category = row <= 3 ? premiumCategory : standardCategory;
      
      const seatLayout = await prisma.seatLayout.create({
        data: {
          venueId: venue.id,
          seatCategoryId: category.id,
          seatLabel: `${rowLetter}${col}`,
          rowNum: row,
          colNum: col,
          isActive: true,
        },
      });
      seatLayouts.push(seatLayout);
    }
  }
  console.log(`✅ ${seatLayouts.length} seats created (${8 * 12} total)`);

  // ─── Create Sample Events ────────────────────────────────────
  const events = [
    {
      title: "Inception - IMAX Experience",
      description: "Experience Christopher Nolan's masterpiece in stunning IMAX quality. A mind-bending journey through dreams within dreams.",
      type: "MOVIE",
      date: new Date("2026-07-20T00:00:00Z"),
      time: "19:30",
    },
    {
      title: "The Dark Knight Returns",
      description: "The legendary sequel returns to the big screen. Watch Batman face his greatest challenge yet.",
      type: "MOVIE",
      date: new Date("2026-07-22T00:00:00Z"),
      time: "20:00",
    },
    {
      title: "AR Rahman Live in Concert",
      description: "India's Mozart performs his greatest hits live! An unforgettable musical experience.",
      type: "CONCERT",
      date: new Date("2026-07-25T00:00:00Z"),
      time: "18:00",
    },
    {
      title: "Dune: Part Three",
      description: "The epic conclusion to the Dune saga. Witness the final battle for Arrakis.",
      type: "MOVIE",
      date: new Date("2026-07-28T00:00:00Z"),
      time: "21:00",
    },
  ];

  for (const eventData of events) {
    const event = await prisma.event.create({
      data: {
        ...eventData,
        venueId: venue.id,
        organiserId: organiser.id,
        eventPricings: {
          create: [
            { seatCategoryId: premiumCategory.id, price: 500 },
            { seatCategoryId: standardCategory.id, price: 250 },
          ],
        },
      },
    });

    // Create EventSeat records
    for (const seatLayout of seatLayouts) {
      await prisma.eventSeat.create({
        data: {
          eventId: event.id,
          seatLayoutId: seatLayout.id,
          status: "AVAILABLE",
        },
      });
    }

    console.log(`✅ Event created: ${event.title} (${seatLayouts.length} seats)`);
  }

  console.log("\n🎉 Seeding complete!");
  console.log("\n─── Login Credentials ────────────────────────────────");
  console.log("Admin:     admin@ticketbooking.com / admin123");
  console.log("Organiser: organiser@ticketbooking.com / organiser123");
  console.log("Customer:  customer@ticketbooking.com / customer123");
  console.log("────────────────────────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
