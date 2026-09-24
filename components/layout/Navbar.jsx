"use client";

import { useAuth } from "@/context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 border-b bg-white">
      <div className="flex h-full items-center justify-between px-6">
        <h1 className="text-xl font-bold">
          Prava AI
        </h1>

        <div className="flex items-center gap-4">
          {user && (
            <>
              <span className="text-sm text-gray-600">
                {user.displayName || user.email}
              </span>

              <button
                onClick={logout}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}