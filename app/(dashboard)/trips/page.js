import { Suspense } from "react";

import TripCardSkeleton from "@/components/trips/inbox/TripCardSkeleton";
import TripsInbox from "@/components/trips/inbox/TripsInbox";

export const metadata = {
  title: "Trips Inbox | Prava AI",
};

// TripsInbox reads the URL (useSearchParams), which needs a Suspense boundary.
function InboxFallback() {
  return (
    <div className="mx-auto max-w-4xl space-y-5" role="status" aria-label="Loading trips">
      <TripCardSkeleton />
      <TripCardSkeleton />
    </div>
  );
}

export default function TripsPage() {
  return (
    <Suspense fallback={<InboxFallback />}>
      <TripsInbox />
    </Suspense>
  );
}
