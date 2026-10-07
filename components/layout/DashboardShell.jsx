"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import Skeleton from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { WeatherProvider } from "@/context/WeatherContext";
import ProfileModal from "@/components/profile/ProfileModal";

import { cn } from "@/lib/utils";

function ShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-background" role="status" aria-label="Loading">
      <div className="hidden w-64 shrink-0 border-r border-border bg-surface p-5 md:block">
        <Skeleton className="h-8 w-32" />
        <div className="mt-8 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-6 h-40 w-full max-w-5xl" />
      </div>
    </div>
  );
}

export default function DashboardShell({ children }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);

  // Auth guard: signed-out visitors go to /login.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  if (loading || !user) return <ShellSkeleton />;

    return (
    <WeatherProvider>
           <div className="app-shell min-h-screen bg-background text-foreground">
        <Sidebar
          mobileOpen={mobileOpen}
          desktopOpen={desktopOpen}
          onClose={() => setMobileOpen(false)}
          onOpenProfile={() => setProfileOpen(true)}
        />

        <div
          className={cn(
            "flex min-h-screen flex-col transition-[padding] duration-200 ease-out",
            desktopOpen && "md:pl-64"
          )}
        >
          <Header
            onToggleMobile={() => setMobileOpen((v) => !v)}
            onToggleDesktop={() => setDesktopOpen((v) => !v)}
          />

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
            {children}
          </main>
        </div>
           <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
      </div>    
    </WeatherProvider>
  );
}