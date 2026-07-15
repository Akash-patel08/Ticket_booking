"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface Event {
  id: string;
  title: string;
  description: string;
  type: string;
  date: string;
  time: string;
  imageUrl: string;
  isSoldOut: boolean;
  venue: { name: string; address: string };
  organiser: { name: string };
  eventPricings: { seatCategory: { name: string; color: string }; price: number }[];
  _count: { eventSeats: number };
}

export default function HomePage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/events?upcoming=true")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setEvents(data.events);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-[var(--primary)] opacity-10 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-[var(--secondary)] opacity-10 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="animate-fade-in-up">
            <h1 className="text-5xl sm:text-7xl font-bold mb-6">
              <span className="gradient-text">Book Your</span>
              <br />
              <span className="text-white">Experience</span>
            </h1>
            <p className="text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl mx-auto mb-8">
              Secure your seats for the hottest movies and concerts. Real-time seat
              selection, instant confirmation, and QR code tickets.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="/events" className="btn-primary text-base py-3 px-8">
                🎬 Browse Events
              </Link>
              {!session && (
                <Link href="/auth/register" className="btn-secondary text-base py-3 px-8">
                  Create Account
                </Link>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
            {[
              { label: "Events", value: events.length || "—" },
              { label: "Real-time", value: "Seats" },
              { label: "Instant", value: "QR Tickets" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold gradient-text">{stat.value}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-white">
              Upcoming Events
            </h2>
            <Link href="/events" className="text-sm text-[var(--primary)] hover:underline font-medium">
              View All →
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
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
              {events.slice(0, 6).map((event, index) => (
                <Link
                  href={`/events/${event.id}`}
                  key={event.id}
                  className="event-card animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  {/* Event image placeholder */}
                  <div className="h-48 gradient-primary opacity-80 flex items-center justify-center">
                    <span className="text-6xl">
                      {event.type === "MOVIE" ? "🎬" : "🎵"}
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-bold text-white">{event.title}</h3>
                      {event.isSoldOut ? (
                        <span className="badge badge-danger">Sold Out</span>
                      ) : (
                        <span className="badge badge-success">
                          {event._count.eventSeats} seats
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mb-3">
                      📍 {event.venue.name}
                    </p>
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-[var(--text-secondary)]">
                        📅 {new Date(event.date).toLocaleDateString()} · {event.time}
                      </p>
                      {event.eventPricings.length > 0 && (
                        <p className="text-sm font-semibold gradient-text">
                          From ₹{Math.min(...event.eventPricings.map((p) => p.price))}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-6xl mb-4">🎭</p>
              <p className="text-xl font-semibold text-white mb-2">No Events Yet</p>
              <p className="text-[var(--text-secondary)]">
                Check back soon for exciting events!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: "🪑",
                title: "Select Seats",
                desc: "Choose from our interactive seat map with real-time availability.",
              },
              {
                icon: "⏱️",
                title: "Secure Hold",
                desc: "Seats are held for 10 minutes while you complete checkout. No one else can grab them.",
              },
              {
                icon: "📱",
                title: "QR Ticket",
                desc: "Get instant confirmation with a scannable QR code ticket via email.",
              },
            ].map((feature) => (
              <div key={feature.title} className="glass-light rounded-2xl p-8 text-center">
                <p className="text-4xl mb-4 animate-float">{feature.icon}</p>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
