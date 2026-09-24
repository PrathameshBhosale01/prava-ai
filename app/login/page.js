"use client";

import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();

      const result = await signInWithPopup(auth, provider);

      console.log("Logged in user:", result.user);

      router.push("/dashboard");
    } catch (error) {
      console.error("Google login failed:", error);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md rounded-xl border bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold">
          Welcome to Prava AI
        </h1>

        <p className="mt-2 text-gray-600">
          Sign in to start planning your trips.
        </p>

        <button
          onClick={handleGoogleLogin}
          className="mt-6 w-full rounded-lg bg-black px-4 py-3 text-white hover:bg-gray-800"
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}