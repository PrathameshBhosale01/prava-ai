"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { createTrip, getUserTrips, updateTrip } from "@/lib/tripService";
import { useUpgrade } from "@/components/billing/UpgradeProvider";
import { usePlan } from "@/hooks/usePlan";
import { limitMessage } from "@/lib/billing/upgrade";
import { checkTripLimits } from "@/lib/plans";
import { TRAVEL_INTERESTS as interestOptions } from "@/lib/travelInterests";
import { MAX_TRIP_DAYS, totalDays, validateRoute } from "@/lib/trips/stops";
import { buildTripFields, buildUpdate, routeChanged, tripToFormState } from "@/lib/trips/editTrip";
import { buttonVariants } from "@/components/ui/Button";
import RouteBuilder from "@/components/trips/route/RouteBuilder";


const categoryOptions = [
  "Leisure",
  "Adventure",
  "Family",
  "Business",
  "Honeymoon",
  "Solo",
  "Backpacking",
];

const accommodationOptions = [
  "Hotel",
  "Hostel",
  "Resort",
  "Apartment",
  "Villa",
  "Homestay",
];

const transportationOptions = [
  "Flight",
  "Train",
  "Bus",
  "Car",
  "Bike",
  "Mixed",
];

const EMPTY_TRIP = {
  formData: {
    title: "",
    category: "",
    description: "",
    budget: "",
    currency: "INR",
    travelers: 1,
    startDate: "",
    interests: [],
    accommodation: "",
    transportation: "",
  },
  startingFrom: "",
  stops: [{ id: "stop-1", place: "", nights: 3 }],
  end: { mode: "return", place: "" },
};

/**
 * The trip form. Without `trip` it creates a new trip; with a saved `trip` it edits that one
 * (same fields, same checks) and saves changes instead.
 */
export default function TripForm({ trip = null }) {
  const router = useRouter();
  const { user } = useAuth();
  const { plan, limits, ready: planReady } = usePlan();
  const { openUpgrade } = useUpgrade();
  const editing = Boolean(trip);

  const [initial] = useState(() => (trip ? tripToFormState(trip) : EMPTY_TRIP));
  const [formData, setFormData] = useState(initial.formData);

  // The route: where you start, the ordered destinations, and how the trip ends.
  const [startingFrom, setStartingFrom] = useState(initial.startingFrom);
  const [stops, setStops] = useState(initial.stops);
  const [end, setEnd] = useState(initial.end);

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const route = validateRoute({ stops, startingFrom, transportation: formData.transportation });

    const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

    const handleInterestChange = (interest) => {
    setFormData((previous) => {
      const alreadySelected =
        previous.interests.includes(interest);

      return {
        ...previous,
        interests: alreadySelected
          ? previous.interests.filter(
              (item) => item !== interest
            )
          : [...previous.interests, interest],
      };
    });
  };

    const validateForm = () => {
    if (!formData.title.trim()) {
      return "Trip title is required.";
    }

    if (!formData.category) {
      return "Please select a trip category.";
    }

    if (!startingFrom.trim()) {
      return "Starting location is required.";
    }

    if (!route.ok) {
      return route.error;
    }

    if (end.mode === "elsewhere" && !end.place.trim()) {
      return "Enter where the trip ends, or choose another option.";
    }

    if (!formData.budget || Number(formData.budget) <= 0) {
      return "Budget must be greater than zero.";
    }

    if (!formData.travelers || Number(formData.travelers) <= 0) {
      return "Travelers must be at least one.";
    }

    if (!formData.startDate) {
      return "Start date is required.";
    }

    if (formData.interests.length === 0) {
      return "Select at least one interest.";
    }

    if (!formData.accommodation) {
      return "Please select accommodation.";
    }

    if (!formData.transportation) {
      return "Please select transportation.";
    }

    return "";
  };

    const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!user) {
      setError(`You must be logged in to ${editing ? "edit" : "create"} a trip.`);
      return;
    }

    try {
      setSaving(true);

      const fields = buildTripFields({ formData, startingFrom, stops: route.stops, end });

      // Plan limits. A new trip also counts how many the person already has; an edit is only checked when it
      // changes the route, so an older long trip can still be renamed. (Credits are enforced on the server.)
      if (planReady && (!editing || routeChanged(trip, fields))) {
        let gate = checkTripLimits(plan, { stops: route.stops.length, days: totalDays(route.stops) });
        if (gate.ok && !editing) gate = checkTripLimits(plan, { tripCount: (await getUserTrips(user.uid)).length });
        if (!gate.ok) {
          setError(gate.message);
          openUpgrade({ reason: gate.code, message: gate.message });
          return;
        }
      }

      if (editing) {
        await updateTrip(trip.id, buildUpdate(trip, fields), { userId: user.uid });
        toast.success("Trip updated");
        router.push(`/trips/${trip.id}`);
      } else {
        await createTrip(user.uid, fields);
        router.push("/trips");
      }
    } catch (error) {
      console.error(`Failed to ${editing ? "update" : "create"} trip:`, error);
      setError(
        error?.code === "permission-denied"
          ? "You don't have permission to change this trip."
          : `Failed to ${editing ? "save your changes" : "create trip"}. Please try again.`
      );
    } finally {
      setSaving(false);
    }
  };   
const today = new Date()
  .toISOString()
  .split("T")[0];

  // Editing a trip that already started must not force a new date; just never allow going further back.
  const earliestStart = editing && trip.startDate && trip.startDate < today ? trip.startDate : today;

  const planOutOfDate =
    editing &&
    Boolean(trip.itinerary) &&
    routeChanged(trip, buildTripFields({ formData, startingFrom, stops: route.stops, end }));
  const tooLong = editing && Number(trip.duration) > MAX_TRIP_DAYS;

    return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8"
    >
      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Basic Information
        </h2>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Trip Title
          </label>

          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Goa Weekend"
            className="w-full rounded-lg border px-4 py-3"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Category
          </label>

          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full rounded-lg border px-4 py-3"
          >
            <option value="">
              Select category
            </option>

            {categoryOptions.map((category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Description
          </label>

          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            placeholder="Tell us about your trip..."
            className="w-full rounded-lg border px-4 py-3"
          />
        </div>
      </section>

      {/* Route */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Route</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Going to one place or several? Add each city in the order you will visit it.
          </p>
        </div>

        <RouteBuilder
          startingFrom={startingFrom}
          onStartingFromChange={setStartingFrom}
          stops={stops}
          onStopsChange={setStops}
          end={end}
          onEndChange={setEnd}
          startDate={formData.startDate}
          transportation={formData.transportation}
          warnings={route.warnings}
          stopLimit={planReady ? limits.maxStops : undefined}
          dayLimit={planReady ? limits.maxTripDays : undefined}
          onPlanLimit={(code) => openUpgrade({ reason: code, message: limitMessage(plan, code) })}
        />

        {planOutOfDate && (
          <p role="note" className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-foreground">
            Changing the route or dates makes your saved plan out of date. After saving, create a new plan on the trip page.
          </p>
        )}
        {tooLong && (
          <p role="note" className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-foreground">
            This trip was planned for {trip.duration} days. Trips are now limited to {MAX_TRIP_DAYS} days, so saving will shorten it.
          </p>
        )}
      </section>

            {/* Trip Details */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Trip Details
        </h2>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Budget
            </label>

            <input
              type="number"
              name="budget"
              value={formData.budget}
              onChange={handleChange}
              min="1"
              placeholder="25000"
              className="w-full rounded-lg border px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Currency
            </label>

            <select
              name="currency"
              value={formData.currency}
              onChange={handleChange}
              className="w-full rounded-lg border px-4 py-3"
            >
              <option value="INR">INR - Indian Rupee</option>
              <option value="USD">USD - US Dollar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="GBP">GBP - British Pound</option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Travelers
            </label>

            <input
              type="number"
              name="travelers"
              value={formData.travelers}
              onChange={handleChange}
              min="1"
              className="w-full rounded-lg border px-4 py-3"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Start Date
          </label>

<input
  type="date"
  name="startDate"
  value={formData.startDate}
  onChange={handleChange}
  min={earliestStart}
  className="w-full rounded-lg border px-4 py-3"
/>
        </div>
      </section>

            {/* Interests */}
      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">
            Interests & Preferences
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Select what you would like to experience.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {interestOptions.map((interest) => {
            const selected =
              formData.interests.includes(interest);

            return (
              <label
                key={interest}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-surface-muted"
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() =>
                    handleInterestChange(interest)
                  }
                  className="h-4 w-4"
                />

                <span className="text-sm">
                  {interest}
                </span>
              </label>
            );
          })}
        </div>
      </section>

            {/* Accommodation & Transportation */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Accommodation & Transportation
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Accommodation
            </label>

            <select
              name="accommodation"
              value={formData.accommodation}
              onChange={handleChange}
              className="w-full rounded-lg border px-4 py-3"
            >
              <option value="">
                Select accommodation
              </option>

              {accommodationOptions.map(
                (option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Transportation
            </label>

            <select
              name="transportation"
              value={formData.transportation}
              onChange={handleChange}
              className="w-full rounded-lg border px-4 py-3"
            >
              <option value="">
                Select transportation
              </option>

              {transportationOptions.map(
                (option) => (
                  <option
                    key={option}
                    value={option}
                  >
                    {option}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row-reverse">
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {editing ? (saving ? "Saving..." : "Save changes") : saving ? "Creating Trip..." : "Create Trip"}
        </button>
        {editing && (
          <Link href={`/trips/${trip.id}`} className={buttonVariants({ variant: "outline", size: "lg", className: "w-full sm:w-auto sm:px-8" })}>
            Cancel
          </Link>
        )}
      </div>
    </form>
  );
}