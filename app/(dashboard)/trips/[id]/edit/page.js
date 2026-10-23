import EditTrip from "@/components/trips/EditTrip";
import { pageTitle } from "@/lib/brand";

export const metadata = { title: pageTitle("Edit trip") };

// In Next 16 `params` is a Promise.
export default async function EditTripPage({ params }) {
  const { id } = await params;
  return <EditTrip id={id} />;
}
