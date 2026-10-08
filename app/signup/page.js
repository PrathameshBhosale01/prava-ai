import { Suspense } from "react";

import SignupForm from "@/components/auth/SignupForm";

export const metadata = { title: "Create account" };

// SignupForm reads ?next= via useSearchParams, which needs a Suspense boundary.
export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
