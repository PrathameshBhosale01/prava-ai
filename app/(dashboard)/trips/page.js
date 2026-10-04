"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserTrips } from "@/lib/tripService";
import Link from "next/link";



export default function TripsPage() {
  const { user, loading } = useAuth();

  const [trips, setTrips] = useState([]);

  useEffect(() => {
    if (!user) return;

    async function loadTrips() {
      try {
        const data = await getUserTrips(user.uid);
        setTrips(data);
      } catch (error) {
        console.error("Failed to load trips:", error);
      }
    }

    loadTrips();
  }, [user]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!user) {
    return <p>Please log in.</p>;
  }

  return (
    <div>
     <div className="flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-bold">
      My Trips
    </h1>

    <p className="mt-2 text-muted-foreground">
      Manage your travel plans.
    </p>
  </div>

  <Link
    href="/trips/new"
    className="rounded-lg bg-primary px-5 py-3 text-sm font-medium text-white hover:bg-primary-hover"
  >
    + Create Trip
  </Link>
</div>

      <p className="mt-2 text-muted-foreground">
        Logged in as {user.email}
      </p>

      <div className="mt-6">
        {trips.length === 0 ? (
          <p className="text-muted-foreground">
            No trips yet.
          </p>
        ) : (
        trips.map((trip) => (
          <Link
            key={trip.id}
            href={`/trips/${trip.id}`}
            className="mb-3 block rounded-lg border bg-surface p-4 transition hover:shadow-md"
          >
            <h2 className="font-semibold">
              {trip.title}
            </h2>

            <p className="text-sm text-muted-foreground">
              {trip.destination}
            </p>
          </Link>
        ))

        )}
      </div>
    </div>
  );
}