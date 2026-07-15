"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Booking {
  id: string;
  bookingRef: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  bookingItems: { seatLabel: string; categoryName: string; price: number }[];
  event: { title: string; date: string; time: string; type: string; venue: { name: string } };
  ticket: { qrCodeData: string } | null;
}

export default function BookingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated") {
      fetch("/api/bookings")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setBookings(data.bookings);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [status, router]);

  const handleCancel = async (bookingId: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;

    setCancellingId(bookingId);

    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId }),
      });

      const data = await res.json();

      if (data.success) {
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: "CANCELLED" } : b))
        );
      } else {
        alert(data.message);
      }
    } catch {
      alert("Failed to cancel booking");
    } finally {
      setCancellingId(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl h-40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-white mb-2">My Bookings</h1>
      <p className="text-[var(--text-secondary)] mb-8">
        View your booking history and manage reservations
      </p>

      {bookings.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-6xl mb-4">🎫</p>
          <p className="text-xl font-semibold text-white mb-2">No bookings yet</p>
          <p className="text-[var(--text-secondary)]">
            Browse events and book your first experience!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking, index) => (
            <div
              key={booking.id}
              className="glass rounded-2xl p-6 animate-fade-in-up"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl">
                      {booking.event.type === "MOVIE" ? "🎬" : "🎵"}
                    </span>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {booking.event.title}
                      </h3>
                      <p className="text-sm text-[var(--text-secondary)]">
                        📍 {booking.event.venue.name} · 📅{" "}
                        {new Date(booking.event.date).toLocaleDateString()} · 🕐{" "}
                        {booking.event.time}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {booking.bookingItems.map((item, i) => (
                      <span key={i} className="badge badge-info">
                        {item.seatLabel} ({item.categoryName})
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-xs text-[var(--text-secondary)]">
                      Ref: <span className="font-mono">{booking.bookingRef}</span>
                    </span>
                    <span
                      className={`badge ${
                        booking.status === "CONFIRMED"
                          ? "badge-success"
                          : "badge-danger"
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <p className="text-2xl font-bold gradient-text">
                    ₹{booking.totalAmount.toFixed(2)}
                  </p>

                  {/* QR Code */}
                  {booking.ticket?.qrCodeData && booking.status === "CONFIRMED" && (
                    <img
                      src={booking.ticket.qrCodeData}
                      alt="QR Ticket"
                      className="w-24 h-24 rounded-lg border border-white/10"
                    />
                  )}

                  {booking.status === "CONFIRMED" && (
                    <button
                      onClick={() => handleCancel(booking.id)}
                      disabled={cancellingId === booking.id}
                      className="btn-danger text-xs"
                    >
                      {cancellingId === booking.id ? "Cancelling..." : "Cancel Booking"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
