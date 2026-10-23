import Link from "next/link";
import { ArrowUpRight, Mail } from "lucide-react";
import { FaGithub, FaLinkedin } from "react-icons/fa";

import BrandMark from "@/components/custom/BrandMark";
import { BRAND_NAME } from "@/lib/brand";
import { teamMember } from "@/lib/landing";

const columns = [
  {
    title: "Product",
    links: [
      { label: "Trip planner", href: "/trips" },
      { label: "AI assistant", href: "/assistant" },
      { label: "Discover", href: "/discover" },
      { label: "Travel Zone", href: "/zone" },
      { label: "Travel tools", href: "/tools" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Pricing", href: "/#pricing" },
      { label: "FAQ", href: "/#faq" },
      { label: "About", href: "/#about" },
    ],
  },
];

export default function Footer() {
  return (
    <footer
      id="contact"
      className="scroll-mt-20 border-t border-[var(--l-line)] bg-[var(--l-sunken)] px-5 pb-10 pt-16 sm:px-6"
    >
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1.1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2">
              <BrandMark size={28} />
              <span className="text-[19px] font-semibold tracking-[-0.02em] text-[var(--l-ink)]">
                {BRAND_NAME}
              </span>
            </Link>

            <p className="l-lede mt-4 max-w-xs text-[13.5px] text-[var(--l-ink-soft)]">
              An AI travel workspace: itineraries, budgets, expenses and an assistant that actually
              knows your trips.
            </p>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--l-ink)]">
                {column.title}
              </h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13.5px] text-[var(--l-ink-soft)] transition-colors hover:text-[var(--l-brand)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h2 className="text-[12px] font-medium uppercase tracking-[0.14em] text-[var(--l-ink)]">Contact</h2>
            <p className="l-lede mt-4 text-[13.5px] text-[var(--l-ink-soft)]">
              Found a bug or have an idea for {BRAND_NAME}? I read everything.
            </p>

            <a
              href={`mailto:${teamMember.email}`}
              className="group mt-4 inline-flex items-center gap-2 text-[13.5px] font-medium text-[var(--l-ink)] transition-colors hover:text-[var(--l-brand)]"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {teamMember.email}
              <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5" aria-hidden="true" />
            </a>

            <ul className="mt-5 flex gap-2">
              {[
                { href: teamMember.github, label: "GitHub", Icon: FaGithub },
                { href: teamMember.linkedin, label: "LinkedIn", Icon: FaLinkedin },
              ].map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${label} (opens in a new tab)`}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--l-line)] bg-[var(--l-raise)] text-[var(--l-ink-soft)] transition-colors hover:border-[var(--l-brand)]/60 hover:text-[var(--l-brand)]"
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-[var(--l-line)] pt-7 sm:flex-row">
          <p className="text-[12.5px] text-[var(--l-ink-soft)]">
            © {new Date().getFullYear()} {BRAND_NAME}. Built by {teamMember.name}.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-[12.5px] text-[var(--l-ink-soft)] transition-colors hover:text-[var(--l-brand)]"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-[12.5px] font-medium text-[var(--l-ink)] transition-colors hover:text-[var(--l-brand)]"
            >
              Get started free
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
