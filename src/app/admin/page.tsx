"use client";

import { useSession } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    address: "",
    totalRows: 10,
    totalCols: 15,
    premiumRows: "1,2,3",
    standardRows: "4,5,6,7,8,9,10",
  });

  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-6xl mb-4">🔒</p>
        <p className="text-xl font-semibold text-white">Admin access required</p>
      </div>
    );
  }

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const premiumRowNums = form.premiumRows.split(",").map((r) => parseInt(r.trim()));
    const standardRowNums = form.standardRows.split(",").map((r) => parseInt(r.trim()));

    try {
      const res = await fetch("/api/venues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          address: form.address,
          totalRows: form.totalRows,
          totalCols: form.totalCols,
          categories: [
            { name: "Premium", color: "#F59E0B", rows: premiumRowNums },
            { name: "Standard", color: "#3B82F6", rows: standardRowNums },
          ],
        }),
      });

      const data = await res.json();
      if (data.success) {
        setMessage("✅ Venue created successfully!");
        setForm({ name: "", address: "", totalRows: 10, totalCols: 15, premiumRows: "1,2,3", standardRows: "4,5,6,7,8,9,10" });
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch {
      setMessage("❌ Failed to create venue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold text-white mb-2">Admin Dashboard</h1>
      <p className="text-[var(--text-secondary)] mb-8">
        Manage venues and seat layouts
      </p>

      {message && (
        <div className={`mb-6 p-4 rounded-xl text-sm animate-fade-in-up ${
          message.startsWith("✅")
            ? "bg-green-500/10 border border-green-500/30 text-green-400"
            : "bg-red-500/10 border border-red-500/30 text-red-400"
        }`}>
          {message}
        </div>
      )}

      <div className="glass rounded-2xl p-8">
        <h2 className="text-xl font-bold text-white mb-6">Create New Venue</h2>

        <form onSubmit={handleCreateVenue} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Venue Name
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Grand Cinema Hall"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Address
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="123 Main Street, City"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Total Rows
              </label>
              <input
                type="number"
                className="input-field"
                value={form.totalRows}
                onChange={(e) => setForm({ ...form, totalRows: parseInt(e.target.value) || 0 })}
                min={1}
                max={50}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Seats per Row
              </label>
              <input
                type="number"
                className="input-field"
                value={form.totalCols}
                onChange={(e) => setForm({ ...form, totalCols: parseInt(e.target.value) || 0 })}
                min={1}
                max={50}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Premium Rows (comma-separated)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="1,2,3"
                value={form.premiumRows}
                onChange={(e) => setForm({ ...form, premiumRows: e.target.value })}
                required
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                🟡 Rows assigned to Premium category
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Standard Rows (comma-separated)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="4,5,6,7,8,9,10"
                value={form.standardRows}
                onChange={(e) => setForm({ ...form, standardRows: e.target.value })}
                required
              />
              <p className="text-xs text-[var(--text-secondary)] mt-1">
                🔵 Rows assigned to Standard category
              </p>
            </div>
          </div>

          {/* Preview */}
          <div className="glass-light rounded-xl p-4">
            <p className="text-sm font-semibold text-white mb-2">Layout Preview</p>
            <p className="text-xs text-[var(--text-secondary)]">
              {form.totalRows} rows × {form.totalCols} seats = {form.totalRows * form.totalCols} total seats
            </p>
            <div className="mt-3 flex gap-4">
              <span className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-yellow-500" />
                Premium: Rows {form.premiumRows}
              </span>
              <span className="flex items-center gap-2 text-xs">
                <span className="w-3 h-3 rounded-full bg-blue-500" />
                Standard: Rows {form.standardRows}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-3"
          >
            {loading ? "Creating..." : "🏟️ Create Venue"}
          </button>
        </form>
      </div>
    </div>
  );
}
