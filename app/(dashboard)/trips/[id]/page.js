import Link from "next/link";
import { getTrip } from "@/lib/tripService";
import GenerateItineraryButton from "@/components/trips/GenerateItineraryButton";

export default async function TripDetailsPage({ params }) {
  const { id } = await params;

  const trip = await getTrip(id);

  if (!trip) {
    return (
      <div className="rounded-xl border bg-white p-8">
        <h1 className="text-2xl font-bold">
          Trip not found
        </h1>

        <Link
          href="/trips"
          className="mt-4 inline-block text-sm underline"
        >
          Back to My Trips
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
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back to My Trips
        </Link>

        <h1 className="mt-4 text-4xl font-bold">
          {trip.title}
        </h1>

        <p className="mt-2 text-lg text-gray-600">
          {trip.destination}
        </p>
      </div>

      {/* Trip Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">
            Duration
          </p>

          <p className="mt-1 text-xl font-semibold">
            {trip.duration} days
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">
            Travelers
          </p>

          <p className="mt-1 text-xl font-semibold">
            {trip.travelers}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">
            Budget
          </p>

          <p className="mt-1 text-xl font-semibold">
            {trip.currency} {trip.budget}
          </p>
        </div>

        <div className="rounded-xl border bg-white p-5">
          <p className="text-sm text-gray-500">
            Start Date
          </p>

          <p className="mt-1 text-xl font-semibold">
            {trip.startDate}
          </p>
        </div>
      </div>
      
      {/* Generate AI Itinerary */}
      <GenerateItineraryButton tripId={trip.id} />

      {/* Preferences */}
      <div className="rounded-xl border bg-white p-6">
        <h2 className="text-xl font-semibold">
          Trip Preferences
        </h2>

        <div className="mt-5 space-y-4">

          <div>
            <p className="text-sm text-gray-500">
              Category
            </p>

            <p className="font-medium">
              {trip.category}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Starting From
            </p>

            <p className="font-medium">
              {trip.startingFrom}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Interests
            </p>

            <div className="mt-2 flex flex-wrap gap-2">
              {trip.interests?.map((interest) => (
                <span
                  key={interest}
                  className="rounded-full bg-gray-100 px-3 py-1 text-sm"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Accommodation
            </p>

            <p className="font-medium">
              {trip.accommodation}
            </p>
          </div>

          <div>
            <p className="text-sm text-gray-500">
              Transportation
            </p>

            <p className="font-medium">
              {trip.transportation}
            </p>
          </div>

          {trip.description && (
            <div>
              <p className="text-sm text-gray-500">
                Description
              </p>

              <p className="mt-1">
                {trip.description}
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}