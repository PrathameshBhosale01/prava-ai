import { Suspense } from "react";

import ZoneFeed from "@/components/zone/ZoneFeed";

export const metadata = { title: "Travel Blog" };

// useSearchParams (filters live in the URL) needs a Suspense boundary.
export default function ZonePage() {
  return (
    <Suspense fallback={null}>
      <ZoneFeed />
    </Suspense>
  );
}
