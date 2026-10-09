import { Suspense } from "react";

import OnboardingForm from "@/components/auth/OnboardingForm";

export const metadata = { title: "Complete your profile" };

// OnboardingForm reads ?next= via useSearchParams, which needs a Suspense boundary.
export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <OnboardingForm />
    </Suspense>
  );
}
