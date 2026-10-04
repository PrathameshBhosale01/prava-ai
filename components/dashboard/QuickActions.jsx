import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { quickActions } from "@/lib/navigation";
import { cn } from "@/lib/utils";

// Static class names (not built from strings) so Tailwind can detect them.
const tones = {
  info: "bg-info-soft text-info",
  success: "bg-success-soft text-success",
  primary: "bg-primary-soft text-primary",
};

export default function QuickActions() {
  return (
    <section aria-labelledby="quick-actions-heading">
      <h2
        id="quick-actions-heading"
        className="text-lg font-semibold tracking-tight text-foreground"
      >
        Quick actions
      </h2>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {quickActions.map(({ title, description, href, icon: Icon, tone }) => (
          <Link
            key={href}
            href={href}
            className="group flex flex-col rounded-xl border border-border bg-surface p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-pop"
          >
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-lg",
                tones[tone]
              )}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>

            <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
            <p className="mt-1 flex-1 text-sm text-muted-foreground">{description}</p>

            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Get started
              <ArrowRight
                className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}