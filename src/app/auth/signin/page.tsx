"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError(res.error);
      setLoading(false);
    } else {
      router.push("/events");
      router.refresh();
    }
  };

  return (
    <div className="min-h-[calc(100vh-72px)] flex items-center justify-center px-4">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="glass rounded-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold gradient-text">Welcome Back</h1>
            <p className="text-[var(--text-secondary)] mt-2">
              Sign in to book your next experience
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
                Email
              </label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-sm text-[var(--text-secondary)] mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-[var(--primary)] hover:underline font-medium">
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
