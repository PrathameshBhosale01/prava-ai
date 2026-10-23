import TripDetails from "@/components/trips/details/TripDetails";
import { pageTitle } from "@/lib/brand";

export const metadata = { title: pageTitle("Trip details") };

// In Next 16 `params` is a Promise.
export default async function TripDetailsPage({ params }) {
  const { id } = await params;
  return <TripDetails id={id} />;
}
