const globalForRedis = globalThis as unknown as {
  mockRedis: Map<string, { value: string; expiresAt: number }>;
};

// In-memory mock for local development without Redis
const mockRedis = globalForRedis.mockRedis || new Map<string, { value: string; expiresAt: number }>();
if (process.env.NODE_ENV !== "production") {
  globalForRedis.mockRedis = mockRedis;
}

const SEAT_HOLD_TTL = parseInt(process.env.SEAT_HOLD_TTL_SECONDS || "600", 10);

export function seatHoldKey(eventId: string, seatId: string): string {
  return `seat_hold:${eventId}:${seatId}`;
}

export async function acquireSeatHold(
  eventId: string,
  seatId: string,
  userId: string
): Promise<boolean> {
  const key = seatHoldKey(eventId, seatId);
  const now = Date.now();
  
  // Clean up expired mock keys
  const existing = mockRedis.get(key);
  if (existing && existing.expiresAt < now) {
    mockRedis.delete(key);
  }
  
  if (!mockRedis.has(key)) {
    mockRedis.set(key, { value: userId, expiresAt: now + SEAT_HOLD_TTL * 1000 });
    return true;
  }
  return false;
}

export async function releaseSeatHold(
  eventId: string,
  seatId: string,
  userId: string
): Promise<boolean> {
  const key = seatHoldKey(eventId, seatId);
  const existing = mockRedis.get(key);
  if (existing && existing.value === userId) {
    mockRedis.delete(key);
    return true;
  }
  return false;
}

export async function getSeatHolder(
  eventId: string,
  seatId: string
): Promise<string | null> {
  const key = seatHoldKey(eventId, seatId);
  const existing = mockRedis.get(key);
  const now = Date.now();
  
  if (existing) {
    if (existing.expiresAt < now) {
      mockRedis.delete(key);
      return null;
    }
    return existing.value;
  }
  return null;
}

export async function getSeatHoldTTL(
  eventId: string,
  seatId: string
): Promise<number> {
  const key = seatHoldKey(eventId, seatId);
  const existing = mockRedis.get(key);
  if (existing) {
    const remaining = Math.max(0, Math.floor((existing.expiresAt - Date.now()) / 1000));
    return remaining;
  }
  return 0;
}

