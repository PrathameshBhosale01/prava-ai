"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { ArrowRight, Menu, Moon, Sun, User, X } from "lucide-react";

import BrandMark from "@/components/custom/BrandMark";
import ProfileModal from "@/components/profile/ProfileModal";
import { useAuth } from "@/context/AuthContext";
import { BRAND_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

const menus = [
  { name: "Features", id: "features" },
  { name: "How it works", id: "how-it-works" },
  { name: "Pricing", id: "pricing" },
  { name: "FAQ", id: "faq" },
  { name: "About", id: "about" },
];

export default function Navbar() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const { user, profile, loading } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeId, setActiveId] = useState("");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Scroll-spy: underline the section currently filling the viewport.
  useEffect(() => {
    if (!isLanding) return undefined;

    // Track every section currently crossing the band rather than the last one
    // seen, so scrolling back to the top clears the highlight instead of
    // leaving a stale section underlined.
    const visible = new Set();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        setActiveId(menus.find((menu) => visible.has(menu.id))?.id ?? "");
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );

    for (const menu of menus) {
      const element = document.getElementById(menu.id);
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [isLanding]);

  // Esc closes the mobile sheet, and an open sheet locks the page behind it.
  useEffect(() => {
    const onKey = (event) => event.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  const signedIn = Boolean(user);
  const name = profile?.displayName || user?.displayName || user?.email || "";
  const initial = name.charAt(0).toUpperCase();
  const photo = profile?.photoURL || user?.photoURL || "";

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 transition-all duration-300",
          scrolled
            ? "border-b border-[var(--l-line)] bg-[var(--l-canvas)]/80 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent",
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-5 sm:px-6">
          <Link href="/" className="group flex shrink-0 items-center gap-2">
            <BrandMark size={28} className="transition-transform group-hover:-translate-y-0.5" />
            <span className="text-[19px] font-semibold tracking-[-0.02em] text-[var(--l-ink)]">
              {BRAND_NAME}
            </span>
          </Link>

          <nav aria-label="Primary" className="ml-2 hidden flex-1 md:block">
            <ul className="flex items-center gap-0.5">
              {menus.map((menu) => {
                const active = isLanding && activeId === menu.id;
                return (
                  <li key={menu.id}>
                    <Link
                      href={`/#${menu.id}`}
                      aria-current={active ? "true" : undefined}
                      className={cn(
                        "relative rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
                        active ? "text-[var(--l-ink)]" : "text-[var(--l-ink-soft)] hover:text-[var(--l-ink)]",
                      )}
                    >
                      {menu.name}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute inset-x-3 bottom-1 h-px origin-left bg-[var(--l-brand)] transition-transform duration-300",
                          active ? "scale-x-100" : "scale-x-0",
                        )}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[var(--l-ink-soft)] transition-colors hover:bg-[var(--l-sunken)] hover:text-[var(--l-ink)]"
            >
              <Moon className="h-[17px] w-[17px] dark:hidden" aria-hidden="true" />
              <Sun className="hidden h-[17px] w-[17px] dark:block" aria-hidden="true" />
            </button>

            {/* `loading` keeps the auth buttons from flickering between states. */}
            {!loading && signedIn && (
              <>
                <Link
                  href="/dashboard"
                  className="hidden h-9 items-center gap-1.5 rounded-lg bg-[var(--l-ink)] px-3.5 text-[13.5px] font-medium text-[var(--l-canvas)] transition-opacity hover:opacity-90 sm:inline-flex"
                >
                  Open app
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  aria-label="Open profile"
                  className="flex h-9 w-9 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[var(--l-line-strong)] bg-[var(--l-sunken)] text-[13px] font-semibold text-[var(--l-ink)] transition-colors hover:border-[var(--l-brand)]"
                >
                  {photo ? (
                    <Image src={photo} alt="" width={36} height={36} className="h-full w-full object-cover" unoptimized />
                  ) : initial ? (
                    initial
                  ) : (
                    <User className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </>
            )}

            {!loading && !signedIn && (
              <>
                <Link
                  href="/login"
                  className="hidden h-9 items-center rounded-lg px-3 text-[13.5px] font-medium text-[var(--l-ink-soft)] transition-colors hover:text-[var(--l-ink)] sm:inline-flex"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--l-ink)] px-3.5 text-[13.5px] font-medium text-[var(--l-canvas)] transition-opacity hover:opacity-90"
                >
                  Get started
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-[var(--l-ink-soft)] transition-colors hover:bg-[var(--l-sunken)] hover:text-[var(--l-ink)] md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40 border-t border-[var(--l-line)] bg-[var(--l-canvas)]/97 backdrop-blur-xl md:hidden">
          <nav aria-label="Mobile" className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-5">
            {menus.map((menu, index) => (
              <Link
                key={menu.id}
                href={`/#${menu.id}`}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-xl px-4 py-3.5 text-[15px] font-medium transition-colors",
                  isLanding && activeId === menu.id
                    ? "bg-[var(--l-sunken)] text-[var(--l-ink)]"
                    : "text-[var(--l-ink-soft)] hover:bg-[var(--l-sunken)] hover:text-[var(--l-ink)]",
                )}
              >
                {menu.name}
              </Link>
            ))}

            <div className="mt-4 grid gap-2 border-t border-[var(--l-line)] pt-5">
              {signedIn ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--l-ink)] text-[15px] font-medium text-[var(--l-canvas)]"
                >
                  Open app
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--l-ink)] text-[15px] font-medium text-[var(--l-canvas)]"
                  >
                    Get started free
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-[var(--l-line-strong)] text-[15px] font-medium text-[var(--l-ink)]"
                  >
                    Log in
                  </Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}

      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
}
