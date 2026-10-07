"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, X } from "lucide-react";

import UserAvatar from "@/components/layout/UserAvatar";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { sidebarMenus } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export default function Sidebar({ mobileOpen, desktopOpen, onClose, onOpenProfile }) {
  const pathname = usePathname();
  const { user, profile } = useAuth();

  const displayName =
    profile?.name || user?.displayName || user?.email?.split("@")[0] || "Traveler";

  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        aria-label="Primary"
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-surface",
          "transition-transform duration-200 ease-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          desktopOpen ? "md:translate-x-0" : "md:-translate-x-full"
        )}
      >
        {/* Brand */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo2.png" alt="" width={28} height={28} />
            <span className="text-lg font-semibold tracking-tight text-foreground">
              Prava AI
            </span>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Close menu"
            className="md:hidden"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {sidebarMenus.map(({ name, href, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                  )}
                />
                {name}
              </Link>
            );
          })}
        </nav>

        {/* Account: opens the profile modal */}
        <div className="shrink-0 border-t border-border p-3">
          <button
            type="button"
            onClick={() => {
              onClose(); // close the mobile drawer first
              onOpenProfile();
            }}
            aria-haspopup="dialog"
            className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-muted"
          >
            <UserAvatar
              photoURL={user?.photoURL}
              name={displayName}
              className="h-9 w-9 text-xs"
            />

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {displayName}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {user?.email}
              </span>
            </span>

            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        </div>
      </aside>
    </>
  );
}