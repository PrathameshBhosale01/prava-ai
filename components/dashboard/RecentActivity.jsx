"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, CircleAlert, Pencil, Plus, RotateCw, Sparkles, Trash2 } from "lucide-react";

import Button, { buttonVariants } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { getRecentActivities } from "@/lib/activityService";
import {
  formatActivity,
  formatRelativeTime,
  getActivityTone,
  toDate,
} from "@/lib/activityFormat";
import { cn } from "@/lib/utils";

// Static class names so Tailwind can detect them.
const TONES = {
  success: "bg-success-soft text-success",
  info: "bg-info-soft text-info",
  danger: "bg-danger-soft text-danger",
  neutral: "bg-surface-muted text-muted-foreground",
};

function ActivityIcon({ action, entity, className }) {
  const props = { "aria-hidden": true, className };

  if (entity === "ITINERARY") return <Sparkles {...props} />;
  if (action === "CREATE") return <Plus {...props} />;
  if (action === "UPDATE") return <Pencil {...props} />;
  if (action === "DELETE") return <Trash2 {...props} />;
  return <Activity {...props} />;
}

function ActivitySkeleton() {
  return (
    <ul role="status" aria-label="Loading activity" className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
          <Skeleton className="h-3 w-16" />
        </li>
      ))}
    </ul>
  );
}

function Message({ icon: Icon, title, children }) {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm font-medium text-foreground">{title}</p>
      {children}
    </div>
  );
}

export default function RecentActivity() {
  const { user } = useAuth();
  const uid = user?.uid;

  const [state, setState] = useState({ status: "loading", items: [] });
  const [attempt, setAttempt] = useState(0);
  const [now] = useState(() => Date.now()); // stable reference for "x minutes ago"

  useEffect(() => {
    if (!uid) return;

    let cancelled = false;

    getRecentActivities(uid)
      .then((items) => {
        if (!cancelled) setState({ status: "ready", items });
      })
      .catch((error) => {
        console.error("Failed to load activity:", error);
        if (!cancelled) setState({ status: "error", items: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [uid, attempt]);

  function retry() {
    setState({ status: "loading", items: [] });
    setAttempt((n) => n + 1);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Your latest actions and updates.</CardDescription>
      </CardHeader>

      <CardContent>
        {state.status === "loading" && <ActivitySkeleton />}

        {state.status === "error" && (
          <Message icon={CircleAlert} title="We couldn't load your activity">
            <p className="mt-1 text-sm text-muted-foreground">Please try again in a moment.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={retry}>
              <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
              Try again
            </Button>
          </Message>
        )}

        {state.status === "ready" && state.items.length === 0 && (
          <Message icon={Activity} title="No activity yet">
            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
              Create your first trip and your activity will show up here.
            </p>
            <Link
              href="/trips/new"
              className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4" })}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Plan a trip
            </Link>
          </Message>
        )}

        {state.status === "ready" && state.items.length > 0 && (
          <ul className="divide-y divide-border">
            {state.items.map((activity) => {
              const date = toDate(activity.createdAt);

              return (
                <li key={activity.id} className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
                  <span
                    className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      TONES[getActivityTone(activity.action)]
                    )}
                  >
                    <ActivityIcon
                      action={activity.action}
                      entity={activity.entity}
                      className="h-4 w-4"
                    />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">
                      {formatActivity(activity)}
                    </p>
                    {activity.title && (
                      <p className="truncate text-sm text-muted-foreground">{activity.title}</p>
                    )}
                  </div>

                  {date && (
                    <time
                      dateTime={date.toISOString()}
                      title={date.toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                      className="shrink-0 pt-0.5 text-xs text-muted-foreground"
                    >
                      {formatRelativeTime(date, now)}
                    </time>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}