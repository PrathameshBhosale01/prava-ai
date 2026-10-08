import { Suspense } from "react";

import ZoneFeed from "@/components/zone/ZoneFeed";

export const metadata = { title: "Stories" };

// In Next 16 `params` is a Promise. useSearchParams (sort lives in the URL) needs Suspense.
export default async function AuthorPage({ params }) {
  const { uid } = await params;
  return (
    <Suspense fallback={null}>
      <ZoneFeed authorUid={uid} />
    </Suspense>
  );
}
