"use client";

import { useState } from "react";
import Link from "next/link";
import { Plane, Sparkles } from "lucide-react";

import { buttonVariants } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getFirstName(profile, user) {
  const fullName = profile?.name || user?.displayName;
  const first = fullName?.trim().split(/\s+/)[0];
  return first || user?.email?.split("@")[0] || "Traveler";
}

export default function DashboardHero() {
    const { user, profile } = useAuth();
  // Computed once on mount so it never changes mid-session or during render.
  const [greeting] = useState(getGreeting);

  return (
    <section className="relative overflow-hidden rounded-2xl bg-linear-to-br from-indigo-600 via-indigo-600 to-violet-600 p-6 shadow-card sm:p-8">
      {/* Decorative shapes */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 right-24 h-48 w-48 rounded-full bg-white/5"
      />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            AI-powered trip planning
          </span>

          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                        {greeting}, {getFirstName(profile, user)}
          </h1>
          <p className="mt-2 text-sm text-indigo-100 sm:text-base">
            Ready to plan your next adventure? Let&apos;s make it unforgettable.
          </p>
        </div>

        <Link
          href="/trips/new"
          className={buttonVariants({ variant: "inverse", size: "lg", className: "shrink-0 self-start md:self-auto" })}
        >
          <Plane className="h-4 w-4" aria-hidden="true" />
          Create new trip
        </Link>
      </div>
    </section>
  );
}