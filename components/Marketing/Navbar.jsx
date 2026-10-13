"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Accessibility, Menu, X, User } from "lucide-react";
import ProfileModal from "@/components/profile/ProfileModal";
// import { useAuth } from "@/context/useAuth";

const menus = [
  { name: "Home", id: "home" },
  { name: "Services", id: "features" },
  { name: "How It Works", id: "how-it-works" },
  { name: "Pricing", id: "pricing" },
  { name: "About Us", id: "about" },
  { name: "Contact Us", id: "contact" },
];

const Navbar = () => {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  // TODO: swap with real auth -> const { user, profile } = useAuth();
  const user = { name: "Guest User", email: "guest@prava.ai", avatarUrl: "" };
  const isLoggedIn = true;

  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [activeId, setActiveId] = useState("home");

  // navbar bg on scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // scroll-spy: highlight the section you're currently on
  useEffect(() => {
    if (!isLanding) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => e.isIntersecting && setActiveId(e.target.id));
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    menus.forEach((m) => {
      const el = document.getElementById(m.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isLanding]);

  // Esc closes mobile menu
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const initial = user?.name?.charAt(0)?.toUpperCase();

  return (
    <>
      <header
        className={`sticky top-0 z-50 h-16 border-b backdrop-blur-xl transition-all duration-300 ${
          scrolled
            ? "border-border/60 bg-background/70 shadow-lg shadow-black/10"
            : "border-transparent bg-background"
        }`}
      >
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-4">
          {/* Logo */}
          <div className="flex-1">
            <Link href="/" className="group inline-flex items-center gap-2">
              <Image src="/logo2.png" alt="Prava AI logo" width={28} height={28} />
              <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-lg font-black tracking-tight text-transparent transition-transform group-hover:scale-105 md:text-2xl">
                Prava AI
              </span>
            </Link>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:block">
            <ul className="flex items-center gap-1">
              {menus.map((m) => {
                const active = isLanding && activeId === m.id;
                return (
                  <li key={m.id}>
                    <Link
                      href={`/#${m.id}`}
                      className={`relative rounded-full px-3 py-2 text-sm font-medium tracking-wide transition-colors ${
                        active
                          ? "text-foreground"
                          : "text-slate-500 hover:text-foreground dark:text-slate-400"
                      }`}
                    >
                      {m.name}
                      <span
                        className={`absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 ${
                          active ? "scale-x-100 opacity-100" : "scale-x-0 opacity-0"
                        }`}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Right controls */}
          <div className="flex flex-1 items-center justify-end gap-2">
            <button
              type="button"
              aria-label="Accessibility"
              className="hidden h-9 w-9 items-center justify-center rounded-full border border-purple-500/60 text-slate-600 transition hover:bg-purple-500/10 dark:text-slate-200 sm:flex"
            >
              <Accessibility className="h-4 w-4" />
            </button>

            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-purple-500/20 transition hover:brightness-110 sm:block"
                >
                  Console
                </Link>

                <button
                  type="button"
                  onClick={() => setProfileOpen(true)}
                  aria-label="Open profile"
                  className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-purple-500 bg-blue-500/20 text-sm font-semibold transition hover:scale-105 hover:border-purple-400"
                >
                  {user?.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.name}
                      width={36}
                      height={36}
                      className="h-full w-full object-cover"
                    />
                  ) : initial ? (
                    initial
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                </button>
              </>
            ) : (
              <Link
                href="/auth?continueTo=/dashboard"
                className="rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
              >
                Log In
              </Link>
            )}

            {/* Mobile toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label="Toggle menu"
              className="flex h-9 w-9 items-center justify-center rounded-full text-slate-600 hover:bg-purple-500/10 dark:text-slate-200 md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-b border-border/60 bg-background/95 backdrop-blur-xl md:hidden">
            <ul className="mx-auto flex max-w-7xl flex-col gap-1 p-4">
              {menus.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/#${m.id}`}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-lg px-4 py-3 text-sm font-medium ${
                      isLanding && activeId === m.id
                        ? "bg-purple-500/10 text-foreground"
                        : "text-slate-500 hover:bg-purple-500/5 dark:text-slate-400"
                    }`}
                  >
                    {m.name}
                  </Link>
                </li>
              ))}
              {isLoggedIn && (
                <li className="pt-2">
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 text-center text-sm font-semibold text-white"
                  >
                    Console
                  </Link>
                </li>
              )}
            </ul>
          </div>
        )}
      </header>

<ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} />
    </>
  );
};

export default Navbar;