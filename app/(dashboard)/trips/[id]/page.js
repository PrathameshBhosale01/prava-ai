import TripDetails from "@/components/trips/details/TripDetails";

export const metadata = { title: "Trip details | Prava AI" };

// In Next 16 `params` is a Promise.
export default async function TripDetailsPage({ params }) {
  const { id } = await params;
  return <TripDetails id={id} />;
}
