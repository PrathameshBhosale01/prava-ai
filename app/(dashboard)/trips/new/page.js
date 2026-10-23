import TripForm from "@/components/trips/TripForm";
import { BRAND_NAME } from "@/lib/brand";

export default function NewTripPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          Create a New Trip
        </h1>

        <p className="mt-2 text-muted-foreground">
          Tell {BRAND_NAME} about your trip preferences.
        </p>
      </div>

      <div className="rounded-xl border bg-surface p-6 shadow-sm">
        <TripForm />
      </div>
    </div>
  );
}