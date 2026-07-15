-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Venue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "totalCols" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SeatCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SeatLayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "venueId" TEXT NOT NULL,
    "seatCategoryId" TEXT NOT NULL,
    "seatLabel" TEXT NOT NULL,
    "rowNum" INTEGER NOT NULL,
    "colNum" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SeatLayout_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SeatLayout_seatCategoryId_fkey" FOREIGN KEY ("seatCategoryId") REFERENCES "SeatCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT 'MOVIE',
    "date" DATETIME NOT NULL,
    "time" TEXT NOT NULL,
    "venueId" TEXT NOT NULL,
    "organiserId" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL DEFAULT '',
    "isSoldOut" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_venueId_fkey" FOREIGN KEY ("venueId") REFERENCES "Venue" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Event_organiserId_fkey" FOREIGN KEY ("organiserId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventPricing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "seatCategoryId" TEXT NOT NULL,
    "price" REAL NOT NULL,
    CONSTRAINT "EventPricing_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventPricing_seatCategoryId_fkey" FOREIGN KEY ("seatCategoryId") REFERENCES "SeatCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EventSeat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventId" TEXT NOT NULL,
    "seatLayoutId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "heldBy" TEXT,
    "heldUntil" DATETIME,
    "bookedBy" TEXT,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "EventSeat_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "EventSeat_seatLayoutId_fkey" FOREIGN KEY ("seatLayoutId") REFERENCES "SeatLayout" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingRef" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BookingItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "seatLabel" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,
    "price" REAL NOT NULL,
    CONSTRAINT "BookingItem_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "qrCodeData" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Ticket_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Waitlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "seatCategoryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WAITING',
    "offerToken" TEXT,
    "offerExpiresAt" DATETIME,
    "position" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Waitlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Waitlist_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Waitlist_seatCategoryId_fkey" FOREIGN KEY ("seatCategoryId") REFERENCES "SeatCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "SeatLayout_venueId_idx" ON "SeatLayout"("venueId");

-- CreateIndex
CREATE UNIQUE INDEX "SeatLayout_venueId_rowNum_colNum_key" ON "SeatLayout"("venueId", "rowNum", "colNum");

-- CreateIndex
CREATE INDEX "Event_venueId_idx" ON "Event"("venueId");

-- CreateIndex
CREATE INDEX "Event_organiserId_idx" ON "Event"("organiserId");

-- CreateIndex
CREATE INDEX "Event_date_idx" ON "Event"("date");

-- CreateIndex
CREATE UNIQUE INDEX "EventPricing_eventId_seatCategoryId_key" ON "EventPricing"("eventId", "seatCategoryId");

-- CreateIndex
CREATE INDEX "EventSeat_eventId_status_idx" ON "EventSeat"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EventSeat_eventId_seatLayoutId_key" ON "EventSeat"("eventId", "seatLayoutId");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_bookingRef_key" ON "Booking"("bookingRef");

-- CreateIndex
CREATE INDEX "BookingItem_bookingId_idx" ON "BookingItem"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_bookingId_key" ON "Ticket"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Waitlist_offerToken_key" ON "Waitlist"("offerToken");

-- CreateIndex
CREATE INDEX "Waitlist_eventId_seatCategoryId_status_idx" ON "Waitlist"("eventId", "seatCategoryId", "status");

-- CreateIndex
CREATE INDEX "Waitlist_userId_idx" ON "Waitlist"("userId");
