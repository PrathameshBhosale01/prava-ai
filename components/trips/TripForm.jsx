"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { createTrip } from "@/lib/tripService";

const interestOptions = [
  "History & Culture",
  "Nature & Outdoors",
  "Food & Dining",
  "Nightlife",
  "Shopping",
  "Art & Museums",
  "Adventure Sports",
  "Photography",
  "Beaches",
  "Mountains",
  "Architecture",
  "Music & Festivals",
  "Wellness & Spa",
];

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

export default function TripForm() {
  const router = useRouter();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    category: "",
    description: "",
    destination: "",
    startingFrom: "",
    budget: "",
    currency: "INR",
    duration: "",
    travelers: 1,
    startDate: "",
    interests: [],
    accommodation: "",
    transportation: "",
  });

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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

    if (!formData.destination.trim()) {
      return "Destination is required.";
    }

    if (!formData.startingFrom.trim()) {
      return "Starting location is required.";
    }

    if (!formData.budget || Number(formData.budget) <= 0) {
      return "Budget must be greater than zero.";
    }

    if (!formData.duration || Number(formData.duration) <= 0) {
      return "Duration must be greater than zero.";
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
      setError("You must be logged in to create a trip.");
      return;
    }

    try {
      setSaving(true);

      const tripId = await createTrip(user.uid, {
        title: formData.title.trim(),
        category: formData.category,
        description: formData.description.trim(),
        destination: formData.destination.trim(),
        startingFrom: formData.startingFrom.trim(),
        budget: Number(formData.budget),
        currency: formData.currency,
        duration: Number(formData.duration),
        travelers: Number(formData.travelers),
        startDate: formData.startDate,
        interests: formData.interests,
        accommodation: formData.accommodation,
        transportation: formData.transportation,
      });

    //   router.push(`/trips/${tripId}`);
      router.push("/trips");
    } catch (error) {
      console.error("Failed to create trip:", error);
      setError("Failed to create trip. Please try again.");
    } finally {
      setSaving(false);
    }
  };   
const today = new Date()
  .toISOString()
  .split("T")[0];

    return (
    <form
      onSubmit={handleSubmit}
      className="space-y-8"
    >
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
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

            {/* Destination */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Destination
        </h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Destination
            </label>

            <input
              type="text"
              name="destination"
              value={formData.destination}
              onChange={handleChange}
              placeholder="e.g. Goa, India"
              className="w-full rounded-lg border px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Starting From
            </label>

            <input
              type="text"
              name="startingFrom"
              value={formData.startingFrom}
              onChange={handleChange}
              placeholder="e.g. Mumbai"
              className="w-full rounded-lg border px-4 py-3"
            />
          </div>
        </div>
      </section>

            {/* Trip Details */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Trip Details
        </h2>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              Duration (days)
            </label>
 
             <input
              type="number"
              name="duration"
              max="365"
              value={formData.duration}
              onChange={handleChange}
              min="1"
              placeholder="4"
              className="w-full rounded-lg border px-4 py-3"
            />
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
  min={today}
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

          <p className="mt-1 text-sm text-gray-500">
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
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-gray-50"
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

            <button
        type="submit"
        disabled={saving}
        className="w-full rounded-lg bg-black px-6 py-3 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? "Creating Trip..." : "Create Trip"}
      </button>
    </form>
  );
}