"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Event {
  id: string;
  title: string;
  description: string;
  type: string;
  date: string;
  time: string;
  isSoldOut: boolean;
  venue: { name: string; address: string };
  organiser: { name: string };
  eventPricings: { seatCategory: { name: string; color: string }; price: number }[];
  _count: { eventSeats: number };
}

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "MOVIE" | "CONCERT">("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams({ upcoming: "true" });
    if (filter !== "ALL") params.set("type", filter);
    if (search) params.set("search", search);

    fetch(`/api/events?${params}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setEvents(data.events);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter, search]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Discover Events</h1>
        <p className="text-[var(--text-secondary)]">
          Find and book your next unforgettable experience
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <input
          type="text"
          className="input-field max-w-sm"
          placeholder="🔍 Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex gap-2">
          {(["ALL", "MOVIE", "CONCERT"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`py-2 px-5 rounded-xl text-sm font-semibold transition-all ${
                filter === type
                  ? "gradient-primary text-white"
                  : "bg-white/5 text-[var(--text-secondary)] hover:bg-white/10"
              }`}
            >
              {type === "ALL" ? "🎭 All" : type === "MOVIE" ? "🎬 Movies" : "🎵 Concerts"}
            </button>
          ))}
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="event-card h-80 animate-pulse">
              <div className="h-48 bg-white/5" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-white/5 rounded w-3/4" />
                <div className="h-3 bg-white/5 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event, index) => (
            <Link
              href={`/events/${event.id}`}
              key={event.id}
              className="event-card animate-fade-in-up"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className={`h-48 flex items-center justify-center ${
                event.type === "MOVIE"
                  ? "bg-gradient-to-br from-indigo-600 to-purple-700"
                  : "bg-gradient-to-br from-pink-600 to-orange-500"
              }`}>
                <span className="text-6xl">
                  {event.type === "MOVIE" ? "🎬" : "🎵"}
                </span>
              </div>
              <div className="p-5">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold text-white line-clamp-1">{event.title}</h3>
                  {event.isSoldOut ? (
                    <span className="badge badge-danger shrink-0">Sold Out</span>
                  ) : (
                    <span className="badge badge-success shrink-0">
                      {event._count.eventSeats} left
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--text-secondary)] mb-1">
                  📍 {event.venue.name}
                </p>
                <p className="text-sm text-[var(--text-secondary)] mb-3">
                  👤 {event.organiser.name}
                </p>
                <div className="flex justify-between items-center pt-3 border-t border-white/5">
                  <p className="text-sm text-[var(--text-secondary)]">
                    📅 {new Date(event.date).toLocaleDateString()} · {event.time}
                  </p>
                  {event.eventPricings.length > 0 && (
                    <p className="text-sm font-bold gradient-text">
                      ₹{Math.min(...event.eventPricings.map((p) => p.price))}+
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <p className="text-6xl mb-4">🎭</p>
          <p className="text-xl font-semibold text-white mb-2">No events found</p>
          <p className="text-[var(--text-secondary)]">
            Try adjusting your filters or check back later
          </p>
        </div>
      )}
    </div>
  );
}
