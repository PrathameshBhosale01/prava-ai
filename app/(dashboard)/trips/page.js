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

    <p className="mt-2 text-gray-600">
      Manage your travel plans.
    </p>
  </div>

  <Link
    href="/trips/new"
    className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
  >
    + Create Trip
  </Link>
</div>

      <p className="mt-2 text-gray-600">
        Logged in as {user.email}
      </p>

      <div className="mt-6">
        {trips.length === 0 ? (
          <p className="text-gray-500">
            No trips yet.
          </p>
        ) : (
          trips.map((trip) => (
            <div
              key={trip.id}
              className="mb-3 rounded-lg border bg-white p-4"
            >
              <h2 className="font-semibold">
                {trip.title}
              </h2>

              <p className="text-sm text-gray-600">
                {trip.destination}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}