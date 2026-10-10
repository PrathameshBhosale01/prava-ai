"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Compass, Info, Sparkles, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import Button, { buttonVariants } from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { buildItineraryView } from "@/lib/tripDetails";
import { deleteTrip, getTrip } from "@/lib/tripService";
import CurrencyConverter from "@/components/trips/CurrencyConverter";
import GenerateItineraryButton from "@/components/trips/GenerateItineraryButton";
import WeatherForecast from "@/components/trips/WeatherForecast";
import DeleteTripDialog from "@/components/trips/inbox/DeleteTripDialog";

import AccommodationSection from "./AccommodationSection";
import BudgetSection from "./BudgetSection";
import ItinerarySection from "./ItinerarySection";
import PrintStyles from "./PrintStyles";
import SectionCard from "./SectionCard";
import TipsSections from "./TipsSections";
import TripActions from "./TripActions";
import TripHeader from "./TripHeader";

function BackLink() {
  return (
    <Link href="/trips" className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground print:hidden">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to Trips Inbox
    </Link>
  );
}

function DetailsSkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6" role="status" aria-label="Loading trip details">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-64 w-full rounded-2xl" />
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}

function Problem({ icon: Icon, title, message, action }) {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <BackLink />
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
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

function Notice({ tone = "info", children }) {
  const tones = { info: "border-info/30 bg-info-soft", warning: "border-warning/30 bg-warning-soft" };
  return (
    <div role="note" className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm text-foreground ${tones[tone]}`}>
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

export default function TripDetails({ id }) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const uid = user?.uid;

  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ key: null, trip: null, problem: "" });
  const key = `${id}|${uid ?? ""}|${attempt}`;

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (authLoading || !uid) return;
    let cancelled = false;
    getTrip(id)
      .then((trip) => {
        if (cancelled) return;
        // Firestore rules already restrict reads to the owner; this is a second lock.
        const mine = trip && (!trip.userId || trip.userId === uid);
        setState({ key, trip: mine ? trip : null, problem: mine ? "" : "notFound" });
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to load trip:", error);
        // "permission denied" looks exactly like "doesn't exist", so we never reveal other people's trip ids.
        setState({ key, trip: null, problem: error?.code === "permission-denied" ? "notFound" : "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [id, uid, authLoading, key]);

  async function confirmDelete() {
    if (deleting || !state.trip) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteTrip(state.trip.id, { userId: uid, title: state.trip.title });
      toast.success(`Deleted “${state.trip.title}”`);
      router.replace("/trips");
    } catch (error) {
      console.error("Failed to delete trip:", error);
      setDeleteError("Couldn’t delete this trip. Please try again.");
      setDeleting(false);
    }
  }

  if (authLoading || !uid || state.key !== key) return <DetailsSkeleton />;

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

  const trip = state.trip;
  const view = buildItineraryView(trip.itinerary, trip);
  const onGenerated = (itinerary) => setState((s) => ({ ...s, trip: { ...s.trip, itinerary, itineraryGeneratedAt: { seconds: Date.now() } } }));

  return (
    <div id="trip-print-area" className="mx-auto max-w-5xl space-y-6">
      <PrintStyles />
      <BackLink />
      <TripHeader trip={trip} actions={<TripActions title={trip.title} onDelete={() => setConfirmingDelete(true)} />} />

      {view ? (
        <>
          <SectionCard id="trip-overview" icon={Sparkles} title="Trip overview">
            <p className="text-sm leading-relaxed text-foreground/90 sm:text-base">{view.summary}</p>
          </SectionCard>

          {!view.isRich && (
            <div className="space-y-3 print:hidden">
              <Notice>This plan was created before hotel suggestions, a budget breakdown and travel tips were added. Upgrade it to get the full version.</Notice>
              <GenerateItineraryButton tripId={trip.id} hasItinerary onGenerated={onGenerated} />
            </div>
          )}

          {view.accommodations.length > 0 && <AccommodationSection hotels={view.accommodations} trip={trip} />}
          <ItinerarySection key={trip.itineraryGeneratedAt?.seconds ?? "plan"} days={view.days} trip={trip} />
          {view.budget && <BudgetSection budget={view.budget} trip={trip} />}
          <TipsSections view={view} />

          {view.isRich && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-dashed border-border px-5 py-4 print:hidden">
              <p className="text-sm text-muted-foreground">Not quite what you had in mind? Create a fresh plan.</p>
              <GenerateItineraryButton tripId={trip.id} hasItinerary variant="outline" size="md" onGenerated={onGenerated} />
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3 rounded-2xl border border-dashed border-border bg-surface px-5 py-8 text-center print:hidden">
          <Sparkles className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
          <p role="note" className="text-sm text-muted-foreground">
            {trip.itinerary ? "We couldn't read the saved itinerary for this trip. Generate a new one." : "No itinerary yet. Let AI plan the days, hotels and budget for you."}
          </p>
          <div className="flex justify-center">
            <GenerateItineraryButton tripId={trip.id} hasItinerary={false} onGenerated={onGenerated} />
          </div>
        </div>
      )}

      <div className="space-y-6 print:hidden">
        <WeatherForecast destination={trip.destination} startDate={trip.startDate} duration={trip.duration} />
        <CurrencyConverter destination={trip.destination} from={trip.currency} amount={trip.budget} travelers={trip.travelers} duration={trip.duration} />
      </div>

      <SectionCard id="trip-preferences" icon={Compass} title="Trip preferences" tone="info">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Accommodation</dt>
            <dd className="mt-0.5 font-medium text-foreground">{trip.accommodation || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Transportation</dt>
            <dd className="mt-0.5 font-medium text-foreground">{trip.transportation || "—"}</dd>
          </div>
          {trip.description && (
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Notes</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-foreground">{trip.description}</dd>
            </div>
          )}
        </dl>
      </SectionCard>

      <DeleteTripDialog
        trip={confirmingDelete ? trip : null}
        deleting={deleting}
        error={deleteError}
        onCancel={() => {
          setConfirmingDelete(false);
          setDeleteError("");
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
