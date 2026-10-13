"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Compass, TriangleAlert } from "lucide-react";

import Button, { buttonVariants } from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { getTrip } from "@/lib/tripService";

import TripForm from "./TripForm";

function Shell({ id, children }) {
  return (
    <div className="mx-auto max-w-5xl">
      <Link href={id ? `/trips/${id}` : "/trips"} className="mb-6 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {id ? "Back to trip" : "Back to Trips Inbox"}
      </Link>
      {children}
    </div>
  );
}

function Problem({ icon: Icon, title, message, action }) {
  return (
    <Shell>
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-lg font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">{message}</p>
        <div className="mt-5">{action}</div>
      </div>
    </Shell>
  );
}

/** Loads one of the signed-in user's trips and shows the trip form pre-filled to edit it. */
export default function EditTrip({ id }) {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid;

  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: null, trip: null, problem: "" });
  const key = `${id}|${uid ?? ""}|${attempt}`;

  useEffect(() => {
    if (authLoading || !uid) return;
    let cancelled = false;
    getTrip(id)
      .then((trip) => {
        if (cancelled) return;
        // Firestore rules already restrict this to the owner; this is a second lock.
        const mine = trip && (!trip.userId || trip.userId === uid);
        setState({ key, trip: mine ? trip : null, problem: mine ? "" : "notFound" });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load trip:", error);
        setState({ key, trip: null, problem: error?.code === "permission-denied" ? "notFound" : "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [id, uid, authLoading, key]);

  if (authLoading || !uid || state.key !== key) {
    return (
      <div className="mx-auto max-w-5xl space-y-6" role="status" aria-label="Loading trip">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }

  if (state.problem === "notFound") {
    return (
      <Problem
        icon={Compass}
        title="Trip not found"
        message="It may have been deleted, or the link is wrong."
        action={
          <Link href="/trips" className={buttonVariants()}>
            Go to Trips Inbox
          </Link>
        }
      />
    );
  }
  if (state.problem === "error" || !state.trip) {
    return <Problem icon={TriangleAlert} title="Couldn't load this trip" message="Check your connection and try again." action={<Button onClick={() => setAttempt((n) => n + 1)}>Try again</Button>} />;
  }

  return (
    <Shell id={state.trip.id}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Edit trip</h1>
        <p className="mt-2 text-muted-foreground">Change the route, dates or preferences for “{state.trip.title}”.</p>
      </div>
      <div className="rounded-xl border bg-surface p-6 shadow-sm">
        <TripForm key={state.trip.id} trip={state.trip} />
      </div>
    </Shell>
  );
}
