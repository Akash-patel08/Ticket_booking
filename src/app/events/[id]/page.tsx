"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import SeatMap from "@/components/SeatMap";
import CountdownTimer from "@/components/CountdownTimer";

export default function EventDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [eventData, setEventData] = useState<{
    event: { id: string; title: string; date: string; time: string; venue: { name: string; totalRows: number; totalCols: number }; isSoldOut: boolean };
    seats: never[];
    pricing: never[];
    grid: { rows: number; cols: number };
  } | null>(null);
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([]);
  const [totalPrice, setTotalPrice] = useState(0);
  const [holdActive, setHoldActive] = useState(false);
  const [holdTTL, setHoldTTL] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [holdLoading, setHoldLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/events/${eventId}/seats`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setEventData(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [eventId]);

  const handleSeatsSelected = useCallback((ids: string[], price: number) => {
    setSelectedSeatIds(ids);
    setTotalPrice(price);
  }, []);

  const handleHoldSeats = async () => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }
    if (selectedSeatIds.length === 0) return;

    setHoldLoading(true);
    setError("");

    try {
      const res = await fetch("/api/seats/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, seatIds: selectedSeatIds }),
      });

      const data = await res.json();

      if (data.success) {
        setHoldActive(true);
        setHoldTTL(data.ttlSeconds || 600);
      } else {
        setError(data.message || "Failed to hold seats");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setHoldLoading(false);
    }
  };

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    setError("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, seatIds: selectedSeatIds }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(
          `🎉 Booking confirmed! Ref: ${data.booking.bookingRef}. Check your email for the QR code ticket.`
        );
        setHoldActive(false);
        setSelectedSeatIds([]);
        // Refresh seat data
        const seatsRes = await fetch(`/api/events/${eventId}/seats`);
        const seatsData = await seatsRes.json();
        if (seatsData.success) setEventData(seatsData);
      } else {
        setError(data.message || "Checkout failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleHoldExpired = () => {
    setHoldActive(false);
    setError("⏰ Your seat hold has expired. Please re-select your seats.");
    setSelectedSeatIds([]);
  };

  const handleJoinWaitlist = async (categoryId: string) => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, seatCategoryId: categoryId }),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(`Added to waitlist at position ${data.waitlistEntry.position} for ${data.waitlistEntry.categoryName}`);
      } else {
        setError(data.message);
      }
    } catch {
      setError("Failed to join waitlist");
    }
  };

  const handleCancelHold = async () => {
    if (selectedSeatIds.length === 0) {
      setHoldActive(false);
      return;
    }
    setHoldLoading(true);
    try {
      await fetch("/api/seats/hold", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, seatIds: selectedSeatIds }),
      });
      // Refresh seat data
      const seatsRes = await fetch(`/api/events/${eventId}/seats`);
      const seatsData = await seatsRes.json();
      if (seatsData.success) setEventData(seatsData);
    } catch (err) {
      console.error("Failed to cancel hold", err);
    } finally {
      setHoldActive(false);
      setSelectedSeatIds([]);
      setHoldLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-6">
          <div className="h-10 bg-white/5 rounded w-1/2" />
          <div className="h-6 bg-white/5 rounded w-1/3" />
          <div className="h-96 bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <p className="text-6xl mb-4">😞</p>
        <p className="text-xl font-semibold text-white">Event not found</p>
      </div>
    );
  }

  const { event, seats, pricing, grid } = eventData;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Event Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">{event.title}</h1>
        <div className="flex flex-wrap gap-4 text-[var(--text-secondary)]">
          <span>📍 {event.venue.name}</span>
          <span>📅 {new Date(event.date).toLocaleDateString()}</span>
          <span>🕐 {event.time}</span>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm animate-fade-in-up">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm animate-fade-in-up">
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Seat Map */}
        <div className="lg:col-span-2">
          <div className="glass rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-4">Select Your Seats</h2>
            <SeatMap
              eventId={eventId}
              seats={seats}
              pricing={pricing}
              grid={grid}
              onSeatsSelected={handleSeatsSelected}
              isReadOnly={holdActive}
            />
          </div>
        </div>

        {/* Checkout Panel */}
        <div className="lg:col-span-1">
          <div className="glass rounded-2xl p-6 sticky top-24 space-y-6">
            <h2 className="text-xl font-bold text-white">Booking Summary</h2>

            {/* Hold Timer */}
            {holdActive && (
              <CountdownTimer ttlSeconds={holdTTL} onExpire={handleHoldExpired} />
            )}

            {/* Selected Seats */}
            {selectedSeatIds.length > 0 ? (
              <>
                <div>
                  <p className="text-sm text-[var(--text-secondary)] mb-2">
                    Selected ({selectedSeatIds.length} seats)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedSeatIds.map((id) => {
                      const seat = seats.find((s: { id: string }) => s.id === id);
                      return seat ? (
                        <span key={id} className="badge badge-info">
                          {(seat as { label: string }).label}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="border-t border-white/10 pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[var(--text-secondary)]">Total</span>
                    <span className="text-3xl font-bold gradient-text">
                      ₹{totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                {!holdActive ? (
                  <button
                    onClick={handleHoldSeats}
                    disabled={holdLoading}
                    className="btn-primary w-full justify-center py-3"
                  >
                    {holdLoading ? "Holding seats..." : "🔒 Hold Seats & Proceed"}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={handleCheckout}
                      disabled={checkoutLoading || holdLoading}
                      className="btn-primary w-full justify-center py-3 animate-pulse-glow"
                    >
                      {checkoutLoading ? "Processing..." : "✅ Confirm & Pay"}
                    </button>
                    <button
                      onClick={handleCancelHold}
                      disabled={checkoutLoading || holdLoading}
                      className="btn-secondary w-full justify-center py-3"
                    >
                      {holdLoading ? "Canceling..." : "❌ Cancel & Re-select"}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--text-secondary)] text-center py-8">
                Click on available seats to select them
              </p>
            )}

            {/* Waitlist (if sold out) */}
            {event.isSoldOut && (
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm font-semibold text-white mb-3">
                  Sold Out — Join Waitlist
                </h3>
                <div className="space-y-2">
                  {pricing.map((p: { categoryId: string; categoryName: string; categoryColor: string }) => (
                    <button
                      key={p.categoryId}
                      onClick={() => handleJoinWaitlist(p.categoryId)}
                      className="w-full btn-secondary text-left flex items-center gap-3 py-3"
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: p.categoryColor }}
                      />
                      <span className="text-sm">{p.categoryName}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
