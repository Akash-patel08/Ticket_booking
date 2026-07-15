"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  ttlSeconds: number;
  onExpire: () => void;
}

export default function CountdownTimer({ ttlSeconds, onExpire }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(ttlSeconds);

  useEffect(() => {
    if (timeLeft <= 0) {
      onExpire();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onExpire]);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const isUrgent = timeLeft < 120; // Less than 2 minutes

  return (
    <div className={`timer-ring ${isUrgent ? "!border-red-500/50 !bg-red-500/10 !text-red-400" : ""}`}>
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span className="font-mono text-lg">
        {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
      </span>
      <span className="text-xs opacity-75">to complete checkout</span>
    </div>
  );
}
