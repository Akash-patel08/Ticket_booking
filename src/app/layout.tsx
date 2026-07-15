import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import AuthProvider from "@/components/AuthProvider";

const inter = Inter({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "TicketBooking — Book Movies & Concerts",
  description:
    "High-demand ticket booking platform for movies and concerts. Real-time seat selection, waitlist management, and QR code tickets.",
  keywords: "tickets, booking, movies, concerts, events, seats",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <Navbar />
          <main className="min-h-[calc(100vh-72px)]">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
