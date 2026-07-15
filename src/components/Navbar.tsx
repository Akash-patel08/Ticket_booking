"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="glass sticky top-0 z-50 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[72px]">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white font-bold text-lg group-hover:scale-105 transition-transform">
              🎬
            </div>
            <span className="text-xl font-bold gradient-text hidden sm:block">
              TicketBooking
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/events"
              className="text-sm font-medium text-[var(--text-secondary)] hover:text-white transition-colors"
            >
              Events
            </Link>

            {session?.user ? (
              <>
                {session.user.role === "ADMIN" && (
                  <Link
                    href="/admin"
                    className="text-sm font-medium text-[var(--text-secondary)] hover:text-white transition-colors"
                  >
                    Admin
                  </Link>
                )}
                {(session.user.role === "ORGANISER" || session.user.role === "ADMIN") && (
                  <Link
                    href="/organiser"
                    className="text-sm font-medium text-[var(--text-secondary)] hover:text-white transition-colors"
                  >
                    Dashboard
                  </Link>
                )}
                <Link
                  href="/bookings"
                  className="text-sm font-medium text-[var(--text-secondary)] hover:text-white transition-colors"
                >
                  My Bookings
                </Link>

                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-white/10">
                  <div className="text-right">
                    <p className="text-sm font-medium text-white">
                      {session.user.name}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)]">
                      {session.user.role}
                    </p>
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="btn-secondary text-xs py-2 px-4"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/auth/signin" className="btn-secondary text-sm py-2 px-4">
                  Sign In
                </Link>
                <Link href="/auth/register" className="btn-primary text-sm py-2 px-4">
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden text-white p-2"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden pb-4 space-y-3 animate-fade-in-up">
            <Link href="/events" className="block text-sm font-medium text-[var(--text-secondary)] hover:text-white py-2">
              Events
            </Link>
            {session?.user ? (
              <>
                <Link href="/bookings" className="block text-sm font-medium text-[var(--text-secondary)] hover:text-white py-2">
                  My Bookings
                </Link>
                <button onClick={() => signOut()} className="btn-secondary text-sm w-full mt-2">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/auth/signin" className="block text-center btn-secondary text-sm py-2">
                  Sign In
                </Link>
                <Link href="/auth/register" className="block text-center btn-primary text-sm py-2">
                  Register
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
