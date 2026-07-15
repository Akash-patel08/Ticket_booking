"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface EventSummary {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  totalSeats: number;
  ticketsSold: number;
  confirmedBookings: number;
  waitlistCount: number;
  totalRevenue: number;
  isSoldOut: boolean;
}

interface OverallStats {
  totalEvents: number;
  totalRevenue: number;
  totalTicketsSold: number;
}

export default function OrganiserPage() {
  const { data: session } = useSession();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [overall, setOverall] = useState<OverallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [venues, setVenues] = useState<{ id: string; name: string; seatLayouts: { seatCategory: { id: string; name: string } }[] }[]>([]);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "MOVIE",
    date: "",
    time: "19:30",
    venueId: "",
    pricing: [] as { seatCategoryId: string; price: number }[],
  });

  useEffect(() => {
    if (session?.user?.role === "ORGANISER" || session?.user?.role === "ADMIN") {
      // Fetch dashboard data
      fetch("/api/organiser/dashboard")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setEvents(data.events);
            setOverall(data.overall);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));

      // Fetch venues for event creation
      fetch("/api/venues")
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setVenues(data.venues);
        })
        .catch(console.error);
    }
  }, [session]);

  const handleVenueChange = (venueId: string) => {
    const venue = venues.find((v) => v.id === venueId);
    if (!venue) return;

    // Get unique categories from seat layouts
    const categoryMap = new Map<string, string>();
    venue.seatLayouts.forEach((sl) => {
      categoryMap.set(sl.seatCategory.id, sl.seatCategory.name);
    });

    const pricing = Array.from(categoryMap.entries()).map(([id]) => ({
      seatCategoryId: id,
      price: 0,
    }));

    setForm({ ...form, venueId, pricing });
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        setMessage("✅ Event created successfully!");
        setShowCreateForm(false);
        // Refresh dashboard
        const dashRes = await fetch("/api/organiser/dashboard");
        const dashData = await dashRes.json();
        if (dashData.success) {
          setEvents(dashData.events);
          setOverall(dashData.overall);
        }
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch {
      setMessage("❌ Failed to create event");
    } finally {
      setFormLoading(false);
    }
  };

  if (!session?.user || !["ORGANISER", "ADMIN"].includes(session.user.role)) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-6xl mb-4">🔒</p>
        <p className="text-xl font-semibold text-white">Organiser access required</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Organiser Dashboard</h1>
          <p className="text-[var(--text-secondary)]">Manage events and track revenue</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="btn-primary"
        >
          ➕ Create Event
        </button>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl text-sm animate-fade-in-up ${
          message.startsWith("✅")
            ? "bg-green-500/10 border border-green-500/30 text-green-400"
            : "bg-red-500/10 border border-red-500/30 text-red-400"
        }`}>
          {message}
        </div>
      )}

      {/* Overall Stats */}
      {overall && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Revenue", value: `₹${overall.totalRevenue.toFixed(2)}`, icon: "💰" },
            { label: "Tickets Sold", value: overall.totalTicketsSold, icon: "🎫" },
            { label: "Total Events", value: overall.totalEvents, icon: "🎪" },
          ].map((stat) => (
            <div key={stat.label} className="glass rounded-xl p-6 text-center">
              <p className="text-3xl mb-2">{stat.icon}</p>
              <p className="text-2xl font-bold gradient-text">{stat.value}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Create Event Form */}
      {showCreateForm && (
        <div className="glass rounded-2xl p-8 mb-8 animate-fade-in-up">
          <h2 className="text-xl font-bold text-white mb-6">Create New Event</h2>
          <form onSubmit={handleCreateEvent} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Title</label>
                <input type="text" className="input-field" placeholder="Event Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Type</label>
                <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="MOVIE">🎬 Movie</option>
                  <option value="CONCERT">🎵 Concert</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Description</label>
              <textarea className="input-field" rows={3} placeholder="Event description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Date</label>
                <input type="date" className="input-field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Time</label>
                <input type="time" className="input-field" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Venue</label>
                <select className="input-field" value={form.venueId} onChange={(e) => handleVenueChange(e.target.value)} required>
                  <option value="">Select venue...</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Category Pricing */}
            {form.pricing.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Category Pricing</label>
                <div className="space-y-3">
                  {form.pricing.map((p, i) => {
                    const venue = venues.find((v) => v.id === form.venueId);
                    const catName = venue?.seatLayouts.find(
                      (sl) => sl.seatCategory.id === p.seatCategoryId
                    )?.seatCategory.name || "Unknown";

                    return (
                      <div key={p.seatCategoryId} className="flex items-center gap-4 glass-light rounded-xl p-3">
                        <span className="text-sm font-medium w-24">{catName}</span>
                        <span className="text-[var(--text-secondary)]">₹</span>
                        <input
                          type="number"
                          className="input-field flex-1"
                          placeholder="Price"
                          value={p.price || ""}
                          onChange={(e) => {
                            const newPricing = [...form.pricing];
                            newPricing[i].price = parseFloat(e.target.value) || 0;
                            setForm({ ...form, pricing: newPricing });
                          }}
                          min={0}
                          required
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button type="submit" disabled={formLoading} className="btn-primary w-full justify-center py-3">
              {formLoading ? "Creating..." : "🎪 Create Event"}
            </button>
          </form>
        </div>
      )}

      {/* Events Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">Your Events</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-pulse text-[var(--text-secondary)]">Loading...</div>
          </div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[var(--text-secondary)]">No events created yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Event</th>
                  <th className="text-left p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Date</th>
                  <th className="text-center p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Tickets</th>
                  <th className="text-center p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Waitlist</th>
                  <th className="text-right p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Revenue</th>
                  <th className="text-center p-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4">
                      <p className="font-semibold text-white">{event.title}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{event.venue}</p>
                    </td>
                    <td className="p-4 text-sm text-[var(--text-secondary)]">
                      {new Date(event.date).toLocaleDateString()} · {event.time}
                    </td>
                    <td className="p-4 text-center text-sm">
                      <span className="font-semibold text-white">{event.ticketsSold}</span>
                      <span className="text-[var(--text-secondary)]"> / {event.totalSeats}</span>
                    </td>
                    <td className="p-4 text-center">
                      {event.waitlistCount > 0 ? (
                        <span className="badge badge-warning">{event.waitlistCount} waiting</span>
                      ) : (
                        <span className="text-xs text-[var(--text-secondary)]">—</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-semibold gradient-text">
                      ₹{event.totalRevenue.toFixed(2)}
                    </td>
                    <td className="p-4 text-center">
                      {event.isSoldOut ? (
                        <span className="badge badge-danger">Sold Out</span>
                      ) : (
                        <span className="badge badge-success">Active</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
