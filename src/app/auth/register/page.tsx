"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "CUSTOMER",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.message);
        setLoading(false);
        return;
      }

      router.push("/auth/signin?registered=true");
    } catch {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="glass rounded-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold gradient-text">Create Account</h1>
            <p className="text-[var(--text-secondary)] mt-2">
              Join to book movies and concerts
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Full Name
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="John Doe"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Email
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Password
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                I am a
              </label>
              <div className="grid grid-cols-2 gap-3">
                {["CUSTOMER", "ORGANISER"].map((role) => (
                  <button
                    type="button"
                    key={role}
                    onClick={() => setForm({ ...form, role })}
                    className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                      form.role === role
                        ? "gradient-primary text-white shadow-lg"
                        : "bg-white/5 text-[var(--text-secondary)] border border-white/10 hover:bg-white/10"
                    }`}
                  >
                    {role === "CUSTOMER" ? "🎫 Customer" : "🎪 Organiser"}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {loading ? "Creating Account..." : "Register"}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-[var(--primary)] hover:underline font-medium">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
