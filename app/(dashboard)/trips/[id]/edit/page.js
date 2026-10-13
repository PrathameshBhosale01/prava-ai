import EditTrip from "@/components/trips/EditTrip";

export const metadata = { title: "Edit trip | Prava AI" };

// In Next 16 `params` is a Promise.
export default async function EditTripPage({ params }) {
  const { id } = await params;
  return <EditTrip id={id} />;
}
