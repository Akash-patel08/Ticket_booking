# Ticket Booking System - System Design

## 1. Introduction & Objectives

Building a high-demand Ticket Booking System presents unique challenges, primarily dealing with high concurrency during popular event launches. If a highly anticipated movie or concert opens for booking, thousands of users might attempt to book the same seats simultaneously. The core objectives of this system design are:
1.  **Strict Concurrency Prevention:** Guaranteeing that no two users can book the exact same seat under any circumstance (no double-booking).
2.  **Optimized Seat Holding:** Temporarily locking seats while a user is in the checkout process, preventing others from attempting to purchase them, and automatically releasing them if the checkout is abandoned.
3.  **Automated Waitlist Management:** When an event is sold out, providing a fair, automated queue system to reallocate seats that become available due to cancellations.

---

## 2. Concurrency Prevention & The Seat Hold Mechanism

The crux of the ticket booking problem lies in handling state transitions for a specific resource (a seat) across a distributed environment. Relying solely on a relational database's basic updates can lead to race conditions or locking bottlenecks.

To address this, we leverage **Redis** as an in-memory, highly performant distributed lock and state management layer, working in tandem with our primary database (PostgreSQL via Prisma).

### 2.1 The Redis `SETNX` Approach

When a user selects a set of seats and clicks "Hold", the system does not immediately update the permanent database. Instead, it interacts with Redis.

1.  **Lock Generation:** For each selected seat, the backend generates a unique Redis key, for example: `seat_hold:{eventId}:{seatLayoutId}`.
2.  **Atomic Operations:** The system uses the Redis `SETNX` command (Set if Not eXists). This operation is strictly atomic. If the key already exists (meaning another user is holding the seat), `SETNX` returns `0`. If the key does not exist, Redis sets the key and returns `1`.
3.  **Pipelining:** To ensure the user gets *all* selected seats or *none* at all, we execute the `SETNX` commands for all selected seats within a Redis Pipeline or Transaction (`MULTI`/`EXEC`).
4.  **Time-To-Live (TTL):** Crucially, when `SETNX` succeeds, we immediately set a TTL (Time-To-Live) on that key, typically 600 seconds (10 minutes). 
5.  **Validation:** If the pipeline returns `1` for every seat, the hold is successful, and the user proceeds to checkout. If any seat returns `0`, the system immediately rolls back any successful holds in that batch and informs the user that some seats were just snatched.

### 2.2 Why Redis over Database Locks?
While PostgreSQL supports row-level locking (`SELECT ... FOR UPDATE`), relying on it for the temporary "hold" phase is inefficient. Users frequently abandon checkouts. If we updated the DB to 'HELD' and relied on cron jobs to clean them up, we'd add immense write-heavy load to the DB. Redis handles TTLs natively. When the 10 minutes expire, Redis simply evicts the key. The source of truth for "Available vs. Held" becomes a union of the DB state and the Redis state, significantly offloading the primary database.

### 2.3 The Final Checkout Transaction

When the user completes payment within the 10-minute window, the final checkout request is sent. This is where ACID compliance is critical.

1.  **Verification:** The system first checks Redis to ensure the keys still exist and belong to the requesting user.
2.  **Database Transaction:** We initiate a Prisma Interactive Transaction.
3.  **Final Validation:** Inside the transaction, we verify the seat's permanent status in the DB is still `AVAILABLE`.
4.  **Mutation:** We update the seat status to `BOOKED` and create the `Booking` and `BookingItem` records.
5.  **Cleanup:** Finally, upon a successful DB transaction, we explicitly delete the Redis hold keys.

---

## 3. Waitlist Auto-Assignment Flow

Handling sold-out events manually is tedious and results in lost revenue when last-minute cancellations occur. The automated waitlist system ensures maximum occupancy.

### 3.1 Waitlist Architecture
Waitlists are managed at the **Seat Category** level (e.g., Premium vs. Standard), not the specific seat level. When an event is sold out, users can opt into a category waitlist. The system records their User ID, Event ID, Category ID, and a timestamp to maintain a strict FIFO (First-In-First-Out) queue.

### 3.2 The Cancellation Trigger
The reallocation process is event-driven. When a user cancels a booking:
1.  The seats associated with that booking revert to `AVAILABLE` in the database.
2.  An asynchronous background task (`processWaitlist`) is triggered.

### 3.3 The Reallocation Logic
The `processWaitlist` function performs the following steps:
1.  It checks how many seats just became available in a specific category.
2.  It queries the `Waitlist` table, ordering by `createdAt` ascending, to find the next eligible user.
3.  **Secure Token Generation:** The system generates a cryptographically secure, time-limited token (e.g., using JWT or a random hash stored in the DB with an expiration timestamp).
4.  **Notification:** The system utilizes Nodemailer to send an automated email to the waitlisted user. The email contains a unique link embedded with the secure token.

### 3.4 Handling Unclaimed Offers (The Cron Job)
Users might miss the email. We cannot hold the seat indefinitely.
1.  The secure link has a strict expiration (e.g., 2 hours).
2.  A scheduled Cron Job (running every few minutes) scans for expired waitlist offers.
3.  If an offer expires without being claimed, the cron job marks that waitlist entry as `EXPIRED` or removes it.
4.  It then immediately recursively triggers the `processWaitlist` function to roll the offer over to the *next* person in line.

---

## 4. Conclusion

This architecture ensures a robust, scalable, and fair ticket booking experience. By offloading temporary state management to Redis, we protect our relational database from excessive load and handle concurrency elegantly. The automated waitlist system maximizes revenue and customer satisfaction by ensuring cancelled tickets never go to waste.
