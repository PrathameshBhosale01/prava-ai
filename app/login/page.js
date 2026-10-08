import { Suspense } from "react";

import LoginForm from "@/components/auth/LoginForm";

export const metadata = { title: "Sign in" };

// LoginForm reads ?next= via useSearchParams, which needs a Suspense boundary.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
