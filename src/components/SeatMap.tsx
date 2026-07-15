"use client";

import { useState, useEffect, useCallback } from "react";

interface Seat {
  id: string;
  eventSeatId: string;
  label: string;
  row: number;
  col: number;
  status: "AVAILABLE" | "HELD" | "BOOKED";
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  isActive: boolean;
}

interface Pricing {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  price: number;
}

interface SeatMapProps {
  eventId: string;
  seats: Seat[];
  pricing: Pricing[];
  grid: { rows: number; cols: number };
  onSeatsSelected: (seatIds: string[], totalPrice: number) => void;
  refreshInterval?: number;
  isReadOnly?: boolean;
}

export default function SeatMap({
  eventId,
  seats,
  pricing,
  grid,
  onSeatsSelected,
  refreshInterval = 5000,
  isReadOnly = false,
}: SeatMapProps) {
  const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
  const [seatData, setSeatData] = useState<Seat[]>(seats);
  const [isLoading, setIsLoading] = useState(false);

  // Refresh seat data periodically for real-time updates
  const fetchSeats = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/seats`);
      const data = await res.json();
      if (data.success) {
        setSeatData(data.seats);
        // Remove any selected seats that are no longer available
        setSelectedSeats((prev) => {
          const newSet = new Set(prev);
          for (const seatId of prev) {
            const seat = data.seats.find((s: Seat) => s.id === seatId);
            if (!seat || seat.status !== "AVAILABLE") {
              newSet.delete(seatId);
            }
          }
          return newSet;
        });
      }
    } catch (err) {
      console.error("Failed to refresh seats:", err);
    }
  }, [eventId]);

  useEffect(() => {
    const interval = setInterval(fetchSeats, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchSeats, refreshInterval]);

  // Update parent when selection changes
  useEffect(() => {
    const selectedArray = Array.from(selectedSeats);
    const totalPrice = selectedArray.reduce((sum, seatId) => {
      const seat = seatData.find((s) => s.id === seatId);
      if (!seat) return sum;
      const p = pricing.find((pr) => pr.categoryId === seat.categoryId);
      return sum + (p?.price || 0);
    }, 0);
    onSeatsSelected(selectedArray, totalPrice);
  }, [selectedSeats, seatData, pricing, onSeatsSelected]);

  const toggleSeat = (seat: Seat) => {
    if (seat.status !== "AVAILABLE" || !seat.isActive) return;

    setSelectedSeats((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(seat.id)) {
        newSet.delete(seat.id);
      } else {
        if (newSet.size >= 10) {
          alert("Maximum 10 seats per booking");
          return prev;
        }
        newSet.add(seat.id);
      }
      return newSet;
    });
  };

  const getSeatClass = (seat: Seat): string => {
    if (!seat.isActive) return "seat seat-inactive";
    if (selectedSeats.has(seat.id)) return "seat seat-selected";
    switch (seat.status) {
      case "AVAILABLE":
        return "seat seat-available";
      case "HELD":
        return "seat seat-held";
      case "BOOKED":
        return "seat seat-booked";
      default:
        return "seat seat-available";
    }
  };

  // Build grid rows
  const rowMap = new Map<number, Seat[]>();
  for (const seat of seatData) {
    const existing = rowMap.get(seat.row) || [];
    existing.push(seat);
    rowMap.set(seat.row, existing);
  }

  // Sort rows
  const sortedRows = Array.from(rowMap.entries()).sort(([a], [b]) => a - b);

  // Category legend
  const categories = pricing.map((p) => ({
    ...p,
    count: seatData.filter(
      (s) => s.categoryId === p.categoryId && s.status === "AVAILABLE"
    ).length,
  }));

  return (
    <div className="w-full">
      {/* Screen / Stage */}
      <div className="screen max-w-lg mx-auto">SCREEN / STAGE</div>

      {/* Seat Grid */}
      <div className="flex flex-col items-center gap-2 py-6 overflow-x-auto">
        {sortedRows.map(([rowNum, rowSeats]) => {
          const sortedSeats = rowSeats.sort((a, b) => a.col - b.col);
          const rowLetter = String.fromCharCode(64 + rowNum);

          return (
            <div key={rowNum} className="flex items-center gap-1">
              {/* Row label */}
              <span className="w-8 text-center text-xs font-semibold text-[var(--text-secondary)]">
                {rowLetter}
              </span>

              {/* Seats */}
              <div className="flex gap-1">
                {sortedSeats.map((seat) => (
                  <button
                    key={seat.id}
                    className={getSeatClass(seat)}
                    onClick={() => toggleSeat(seat)}
                    disabled={isReadOnly || seat.status !== "AVAILABLE" || !seat.isActive}
                    title={`${seat.label} — ${seat.categoryName} (${seat.status})`}
                  >
                    {seat.isActive && (
                      <span className="text-[9px]">{seat.col}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Row label (right) */}
              <span className="w-8 text-center text-xs font-semibold text-[var(--text-secondary)]">
                {rowLetter}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-6 mt-6 py-4 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[var(--seat-available)]" />
          <span className="text-xs text-[var(--text-secondary)]">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[var(--seat-selected)] animate-pulse-glow" />
          <span className="text-xs text-[var(--text-secondary)]">Selected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[var(--seat-held)] opacity-70" />
          <span className="text-xs text-[var(--text-secondary)]">Held</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[var(--seat-booked)] opacity-50" />
          <span className="text-xs text-[var(--text-secondary)]">Booked</span>
        </div>
      </div>

      {/* Category Pricing */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {categories.map((cat) => (
          <div
            key={cat.categoryId}
            className="glass-light rounded-xl p-4 flex justify-between items-center"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: cat.categoryColor }}
              />
              <div>
                <p className="text-sm font-semibold">{cat.categoryName}</p>
                <p className="text-xs text-[var(--text-secondary)]">
                  {cat.count} available
                </p>
              </div>
            </div>
            <p className="text-lg font-bold gradient-text">₹{cat.price}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
