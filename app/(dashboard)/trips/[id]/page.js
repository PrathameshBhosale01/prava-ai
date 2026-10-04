"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getTrip } from "@/lib/tripService";
import GenerateItineraryButton from "@/components/trips/GenerateItineraryButton";
import WeatherForecast from "@/components/trips/WeatherForecast";
import CurrencyConverter from "@/components/trips/CurrencyConverter";

export default function TripDetailsPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push("/login");
      return;
    }

    if (!id) return;

    async function loadTrip() {
      try {
        setLoading(true);
        setError("");
        const data = await getTrip(id);

        if (!data) {
          setError("Trip not found");
        } else {
          setTrip(data);
        }
      } catch (err) {
        console.error("Failed to load trip:", err);
        setError(err.message || "Failed to load trip details.");
      } finally {
        setLoading(false);
      }
    }

    loadTrip();
  }, [id, user, authLoading, router]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-5xl py-12 text-center">
        <p className="text-muted-foreground">Loading trip details...</p>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="mx-auto max-w-5xl rounded-xl border bg-surface p-8">
        <h1 className="text-2xl font-bold">{error || "Trip not found"}</h1>

        <Link
          href="/trips"
          className="mt-4 inline-block text-sm text-blue-600 underline hover:text-blue-800"
        >
          ← Back to My Trips
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/trips"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to My Trips
        </Link>

        <h1 className="mt-4 text-4xl font-bold">{trip.title}</h1>

        <p className="mt-2 text-lg text-muted-foreground">{trip.destination}</p>
      </div>

      {/* Trip Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-surface p-5">
          <p className="text-sm text-muted-foreground">Duration</p>
          <p className="mt-1 text-xl font-semibold">{trip.duration} days</p>
        </div>

        <div className="rounded-xl border bg-surface p-5">
          <p className="text-sm text-muted-foreground">Travelers</p>
          <p className="mt-1 text-xl font-semibold">{trip.travelers}</p>
        </div>

        <div className="rounded-xl border bg-surface p-5">
          <p className="text-sm text-muted-foreground">Budget</p>
          <p className="mt-1 text-xl font-semibold">
            {trip.currency} {trip.budget}
          </p>
        </div>

        <div className="rounded-xl border bg-surface p-5">
          <p className="text-sm text-muted-foreground">Start Date</p>
          <p className="mt-1 text-xl font-semibold">{trip.startDate}</p>
        </div>
      </div>

      {/* Weather */}
      <WeatherForecast
        destination={trip.destination}
        startDate={trip.startDate}
        duration={trip.duration}
      />
      
       {/* Currency */}
      <CurrencyConverter
        destination={trip.destination}
        from={trip.currency}
        amount={trip.budget}
        travelers={trip.travelers}
        duration={trip.duration}
      />

      {/* Generate AI Itinerary */}
      <GenerateItineraryButton
        tripId={trip.id}
        onGenerated={(itinerary) =>
          setTrip((prev) => (prev ? { ...prev, itinerary } : prev))
        }
      />

      {/* Generated Itinerary Display */}
      {trip.itinerary && (
        <div className="rounded-xl border bg-surface p-6 shadow-sm">
          <h2 className="text-2xl font-bold">Generated Itinerary</h2>
          {trip.itinerary.summary && (
            <p className="mt-2 text-foreground">{trip.itinerary.summary}</p>
          )}

          <div className="mt-6 space-y-6">
            {trip.itinerary.days?.map((day) => (
              <div
                key={day.day}
                className="rounded-lg border border-border bg-surface-muted p-5"
              >
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="text-lg font-semibold text-foreground">
                    Day {day.day}: {day.title}
                  </h3>
                  {day.date && (
                    <span className="rounded-full border bg-surface px-2.5 py-1 text-xs text-muted-foreground">
                      {day.date}
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {day.activities?.map((activity, idx) => (
                    <div
                      key={idx}
                      className="flex gap-4 rounded-md border border-border bg-surface p-3"
                    >
                      <div className="w-16 shrink-0 text-sm font-medium text-muted-foreground">
                        {activity.time}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {activity.title}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {activity.description}
                        </p>
                        {activity.location && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            📍 {activity.location}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preferences */}
      <div className="rounded-xl border bg-surface p-6">
        <h2 className="text-xl font-semibold">Trip Preferences</h2>

        <div className="mt-5 space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Category</p>
            <p className="font-medium">{trip.category}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Starting From</p>
            <p className="font-medium">{trip.startingFrom}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Interests</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {trip.interests?.map((interest) => (
                <span
                  key={interest}
                  className="rounded-full bg-surface-muted px-3 py-1 text-sm"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Accommodation</p>
            <p className="font-medium">{trip.accommodation}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Transportation</p>
            <p className="font-medium">{trip.transportation}</p>
          </div>

          {trip.description && (
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="mt-1">{trip.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}