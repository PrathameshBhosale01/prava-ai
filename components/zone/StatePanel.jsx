import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackLink({ href = "/zone", children = "All stories" }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      {children}
    </Link>
  );
}

/** Full-page "something's wrong / nothing here" panel with a back link, used by the story and edit pages. */
export function Problem({ icon: Icon, title, message, action }) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <BackLink />
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{message}</p>
        <div className="mt-5">{action}</div>
      </div>
    </div>
  );
}
