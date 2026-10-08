import Link from "next/link";
import { BookOpenText, PenLine, SearchX, TriangleAlert } from "lucide-react";

import Button, { buttonVariants } from "@/components/ui/Button";

function Panel({ icon: Icon, tone, title, children }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-xl border border-dashed border-border bg-surface px-6 py-14 text-center">
      <span className={`flex h-12 w-12 items-center justify-center rounded-full ${tone}`}>
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </div>
  );
}

export function EmptyFeed({ filtered, onClear }) {
  if (filtered) {
    return (
      <Panel icon={SearchX} tone="bg-surface-muted text-muted-foreground" title="No stories match that">
        <p className="mt-1.5 text-sm text-muted-foreground">Try a different word, or browse everything.</p>
        <Button variant="outline" className="mt-5" onClick={onClear}>
          Clear filters
        </Button>
      </Panel>
    );
  }
  return (
    <Panel icon={BookOpenText} tone="bg-primary-soft text-primary" title="No stories yet">
      <p className="mt-1.5 text-sm text-muted-foreground">Be the first to share a trip, a tip, or a hidden gem.</p>
      <Link href="/zone/new" className={buttonVariants({ className: "mt-5" })}>
        <PenLine className="h-4 w-4" aria-hidden="true" />
        Write the first story
      </Link>
    </Panel>
  );
}

export function FeedError({ message, onRetry }) {
  return (
    <div role="alert">
      <Panel icon={TriangleAlert} tone="bg-danger-soft text-danger" title="Couldn't load stories">
        <p className="mt-1.5 text-sm text-muted-foreground">{message}</p>
        <Button className="mt-5" onClick={onRetry}>
          Try again
        </Button>
      </Panel>
    </div>
  );
}
