"use client";

import Image from "next/image";
import { FaEnvelope, FaGithub, FaLinkedin } from "react-icons/fa";

import Reveal from "./Reveal";
import { aboutHighlights, teamMember } from "@/lib/landing";

const socials = [
  { href: teamMember.linkedin, label: "LinkedIn", Icon: FaLinkedin, external: true },
  { href: teamMember.github, label: "GitHub", Icon: FaGithub, external: true },
  { href: `mailto:${teamMember.email}`, label: "Email", Icon: FaEnvelope, external: false },
];

export default function AboutSection() {
  return (
    <section id="about" className="relative scroll-mt-20 px-5 py-24 sm:px-6 lg:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-20">
        <div>
          <Reveal>
            <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--l-brand)]">About</p>
          </Reveal>

          <Reveal delay={60}>
            <h2 className="l-title mt-3 text-[clamp(2rem,4.4vw,3rem)] text-[var(--l-ink)]">
              Built by one developer who got tired of planning trips in a spreadsheet.
            </h2>
          </Reveal>

          <Reveal delay={120}>
            <p className="l-lede mt-5 max-w-xl text-[16px] text-[var(--l-ink-soft)]">
              I&apos;m Prathamesh, a full-stack developer. Prava AI started as a personal project after one
              too many trips planned across twelve browser tabs — and turned into a proper travel
              workspace: itineraries, budgets, expenses, a travel blog and an assistant that knows your trips.
            </p>
          </Reveal>

          <dl className="mt-10 grid gap-5 sm:grid-cols-3">
            {aboutHighlights.map((item, index) => (
              <Reveal key={item.label} delay={180 + index * 70}>
                <dt className="flex items-center gap-2 text-[14px] font-medium text-[var(--l-ink)]">
                  <item.icon className="h-4 w-4 text-[var(--l-brand)]" aria-hidden="true" />
                  {item.label}
                </dt>
                <dd className="mt-1 text-[13px] text-[var(--l-ink-soft)]">{item.detail}</dd>
              </Reveal>
            ))}
          </dl>
        </div>

        <Reveal delay={140}>
          <div className="l-card l-edge relative mx-auto max-w-sm overflow-hidden rounded-3xl p-8 text-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-[var(--l-brand)]/14 blur-3xl"
            />

            <div className="relative mx-auto h-28 w-28">
              <span className="l-pulse absolute inset-0 rounded-full" aria-hidden="true" />
              <Image
                src={teamMember.image}
                alt={teamMember.name}
                width={112}
                height={112}
                className="relative h-28 w-28 rounded-full border border-[var(--l-line)] object-cover"
              />
            </div>

            <h3 className="l-title relative mt-5 text-[19px] text-[var(--l-ink)]">{teamMember.name}</h3>
            <p className="relative mt-1 text-[13px] text-[var(--l-ink-soft)]">{teamMember.role}</p>

            <ul className="relative mt-6 flex justify-center gap-2">
              {socials.map(({ href, label, Icon, external }) => (
                <li key={label}>
                  <a
                    href={href}
                    aria-label={external ? `${label} (opens in a new tab)` : label}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--l-line)] bg-[var(--l-sunken)] text-[var(--l-ink-soft)] transition-colors hover:border-[var(--l-brand)]/60 hover:text-[var(--l-brand)]"
                  >
                    <Icon className="h-[17px] w-[17px]" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
