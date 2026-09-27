"use client";

import { useState } from "react";

export default function GenerateItineraryButton({
  tripId,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/trips/${tripId}/itinerary`,
        {
          method: "POST",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to generate itinerary"
        );
      }

      console.log("Generated itinerary:", data.itinerary);

      alert("Itinerary generated successfully!");
    } catch (error) {
      console.error(error);

      setError(
        error.message ||
          "Failed to generate itinerary."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="rounded-lg bg-black px-6 py-3 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading
          ? "Generating..."
          : "Generate AI Itinerary"}
      </button>

      {error && (
        <p className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}