import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";

const BULLETS = [
  "Plan trips with an AI travel assistant",
  "Keep budgets and expenses in one place",
  "Share stories with fellow travelers",
];

/**
 * Split-screen layout shared by Login and Sign Up: brand panel on the left (hidden on
 * phones, where the form gets a compact logo header instead), form on the right.
 */
export default function AuthShell({ title, subtitle, brandTitle, brandText, children, footer }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-8 sm:py-12">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface shadow-pop md:grid-cols-2">
        <aside className="relative hidden flex-col justify-center overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-10 text-white md:flex">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-fuchsia-300/20 blur-3xl" />

          <div className="relative">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur">
              <Image src="/logo2.png" alt="" width={36} height={36} />
            </span>
            <p className="mt-8 text-3xl font-bold leading-tight tracking-tight">{brandTitle}</p>
            <p className="mt-3 text-base text-white/85">{brandText}</p>
            <ul className="mt-8 space-y-3 text-sm text-white/90">
              {BULLETS.map((text) => (
                <li key={text} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/25">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="flex flex-col justify-center p-6 sm:p-10">
          <Link href="/" className="mb-6 flex items-center justify-center gap-2 md:hidden" aria-label="Prava AI home">
            <Image src="/logo2.png" alt="" width={28} height={28} />
            <span className="text-xl font-black tracking-tight text-foreground">Prava AI</span>
          </Link>

          <header className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>
          </header>

          <div className="mt-7">{children}</div>

          <footer className="mt-6 space-y-4 text-center text-sm">
            {footer}
            <Link href="/" className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Back to home
            </Link>
          </footer>
        </section>
      </div>
    </main>
  );
}
