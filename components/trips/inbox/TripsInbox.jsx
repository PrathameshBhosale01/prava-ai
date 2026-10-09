"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CircleAlert, Map, Plus, RotateCw, SearchX } from "lucide-react";
import { MotionConfig, motion } from "framer-motion";
import { toast } from "sonner";

import Button, { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { deleteTrip, getUserTrips } from "@/lib/tripService";
import {
  PAGE_SIZE,
  countByStatus,
  filterTrips,
  normalizeInboxTrip,
  paginate,
  uniqueCategories,
} from "@/lib/tripInbox";

import DeleteTripDialog from "./DeleteTripDialog";
import Pagination from "./Pagination";
import TripCard from "./TripCard";
import TripCardSkeleton from "./TripCardSkeleton";
import TripsToolbar from "./TripsToolbar";

function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <Card className="flex flex-col items-center px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{children}</p>
      <div className="mt-5">{action}</div>
    </Card>
  );
}

export default function TripsInbox() {
  const { user } = useAuth();

  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!user) return;

    // `cancelled` stops a stale update after unmount or a user change.
    let cancelled = false;

    (async () => {
      try {
        const data = await getUserTrips(user.uid);
        if (cancelled) return;

        const now = new Date();
        setTrips(data.map((trip) => normalizeInboxTrip(trip, now)));
      } catch (err) {
        if (cancelled) return;

        console.error("Failed to load trips:", err);
        setError("We couldn’t load your trips. Check your connection and try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  const retry = () => {
    setLoading(true);
    setError("");
    setReloadKey((k) => k + 1);
  };

  // Typing stays responsive even with a long list.
  const deferredQuery = useDeferredValue(query);

  const filtered = useMemo(
    () => filterTrips(trips, { query: deferredQuery, status, category, sort }),
    [trips, deferredQuery, status, category, sort]
  );
  const counts = useMemo(() => countByStatus(trips), [trips]);
  const categories = useMemo(() => uniqueCategories(trips), [trips]);
  const view = paginate(filtered, page, PAGE_SIZE);

  // Any change to the result set starts again from page 1.
  const withReset = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const hasFilters = query.trim() !== "" || status !== "all" || category !== "all";

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setCategory("all");
    setPage(1);
  };

  const closeDialog = () => {
    if (deleting) return;
    setPendingDelete(null);
    setDeleteError("");
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    setDeleting(true);
    setDeleteError("");

    try {
      await deleteTrip(pendingDelete.id, {
        userId: user.uid,
        title: pendingDelete.title,
      });
      setTrips((prev) => prev.filter((t) => t.id !== pendingDelete.id));
      toast.success(`Deleted “${pendingDelete.title}”`);
      setPendingDelete(null);
    } catch (err) {
      console.error("Failed to delete trip:", err);
      setDeleteError("Couldn’t delete this trip. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  let content;

  if (loading) {
    content = (
      <div role="status" aria-label="Loading trips" className="grid gap-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <TripCardSkeleton key={i} />
        ))}
      </div>
    );
  } else if (error) {
    content = (
      <EmptyState
        icon={CircleAlert}
        title="Something went wrong"
        action={
          <Button variant="outline" onClick={retry}>
            <RotateCw className="h-4 w-4" aria-hidden="true" /> Try again
          </Button>
        }
      >
        {error}
      </EmptyState>
    );
  } else if (trips.length === 0) {
    content = (
      <EmptyState
        icon={Map}
        title="No trips yet"
        action={
          <Link href="/trips/new" className={buttonVariants()}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Plan your first trip
          </Link>
        }
      >
        Trips you create are saved here so you can revisit, search and manage them.
      </EmptyState>
    );
  } else if (filtered.length === 0) {
    content = (
      <EmptyState
        icon={SearchX}
        title="No matching trips"
        action={
          <Button variant="outline" onClick={clearFilters}>
            Clear filters
          </Button>
        }
      >
        Nothing matches your search or filters. Try a different keyword.
      </EmptyState>
    );
  } else {
    content = (
      <div className="space-y-6">
        <ul className="grid gap-5">
          {view.items.map((trip, i) => (
            <motion.li
              key={trip.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(i, 5) * 0.04 }}
            >
              <TripCard trip={trip} onDelete={setPendingDelete} />
            </motion.li>
          ))}
        </ul>
        <Pagination
          page={view.page}
          totalPages={view.totalPages}
          total={view.total}
          pageSize={PAGE_SIZE}
          onChange={(p) => {
            setPage(p);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      </div>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Trips Inbox
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage and explore your travel plans
            </p>
          </div>
          <Link href="/trips/new" className={buttonVariants({ className: "w-full sm:w-auto" })}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Create new trip
          </Link>
        </header>

        {!loading && !error && trips.length > 0 && (
          <TripsToolbar
            query={query}
            onQueryChange={withReset(setQuery)}
            status={status}
            onStatusChange={withReset(setStatus)}
            counts={counts}
            category={category}
            onCategoryChange={withReset(setCategory)}
            categories={categories}
            sort={sort}
            onSortChange={withReset(setSort)}
          />
        )}

        {content}
      </div>

      <DeleteTripDialog
        trip={pendingDelete}
        deleting={deleting}
        error={deleteError}
        onCancel={closeDialog}
        onConfirm={confirmDelete}
      />
    </MotionConfig>
  );
}
