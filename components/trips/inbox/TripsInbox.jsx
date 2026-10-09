"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleAlert, Map, Plus, RotateCw, SearchX } from "lucide-react";
import { MotionConfig, motion } from "framer-motion";
import { toast } from "sonner";

import Button, { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/context/AuthContext";
import { deleteTrip, subscribeToUserTrips } from "@/lib/tripService";
import {
  PAGE_SIZE,
  buildInboxQuery,
  countByStatus,
  filterTrips,
  normalizeInboxTrip,
  paginate,
  parseInboxParams,
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

  // Filters live in the URL so Back, reload and shared links keep the view.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { query, status, category: urlCategory, sort, page } = useMemo(
    () => parseInboxParams(searchParams),
    [searchParams]
  );

  // The input is local so typing is instant; the URL is updated after a pause.
  const [queryInput, setQueryInput] = useState(query);
  const [syncedQuery, setSyncedQuery] = useState(query);
  const debounceRef = useRef(null);

  // Back/forward changed ?q= from outside: pull it into the input.
  if (query !== syncedQuery) {
    setSyncedQuery(query);
    setQueryInput(query);
  }

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  const updateUrl = (patch, { push = false } = {}) => {
    const qs = buildInboxQuery({ query, status, category: urlCategory, sort, page: 1, ...patch });
    const href = qs ? `${pathname}?${qs}` : pathname;

    // Filter tweaks replace the entry; only paging adds history.
    if (push) router.push(href, { scroll: false });
    else router.replace(href, { scroll: false });
  };

  // The debounce timer must see the filters as they are when it fires,
  // not as they were when typing started.
  const updateUrlRef = useRef(updateUrl);
  useEffect(() => {
    updateUrlRef.current = updateUrl;
  });

  const handleQueryChange = (value) => {
    setQueryInput(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSyncedQuery(value.trim());
      updateUrlRef.current({ query: value });
    }, 300);
  };

  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Live subscription: the list updates itself when trips change. State is
  // only set inside the snapshot callbacks, never synchronously in the effect.
  useEffect(() => {
    if (!user) return;

    return subscribeToUserTrips(
      user.uid,
      (data) => {
        const now = new Date();
        setTrips(data.map((trip) => normalizeInboxTrip(trip, now)));
        setError("");
        setLoading(false);
      },
      (err) => {
        console.error("Failed to load trips:", err);
        setError("We couldn’t load your trips. Check your connection and try again.");
        setLoading(false);
      }
    );
  }, [user, reloadKey]);

  const retry = () => {
    setLoading(true);
    setError("");
    setReloadKey((k) => k + 1);
  };

  // Typing stays responsive even with a long list.
  const deferredQuery = useDeferredValue(query);

  const counts = useMemo(() => countByStatus(trips), [trips]);
  const categories = useMemo(() => uniqueCategories(trips), [trips]);

  // A stale ?type= (e.g. its last trip was deleted) falls back to "all".
  const category = loading || categories.includes(urlCategory) ? urlCategory : "all";

  const filtered = useMemo(
    () => filterTrips(trips, { query: deferredQuery, status, category, sort }),
    [trips, deferredQuery, status, category, sort]
  );
  const view = paginate(filtered, page, PAGE_SIZE);

  const clearFilters = () => {
    clearTimeout(debounceRef.current);
    setQueryInput("");
    setSyncedQuery("");
    updateUrl({ query: "", status: "all", category: "all" });
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
        <ul role="list" className="grid gap-5">
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
            updateUrl({ page: p }, { push: true });
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
            query={queryInput}
            onQueryChange={handleQueryChange}
            status={status}
            onStatusChange={(value) => updateUrl({ status: value })}
            counts={counts}
            category={category}
            onCategoryChange={(value) => updateUrl({ category: value })}
            categories={categories}
            sort={sort}
            onSortChange={(value) => updateUrl({ sort: value })}
          />
        )}

        {/* Announces result changes to screen readers (search, filters). */}
        <p className="sr-only" role="status" aria-live="polite">
          {!loading && !error && trips.length > 0
            ? filtered.length === 0
              ? "No trips match your filters."
              : `${filtered.length} ${filtered.length === 1 ? "trip" : "trips"} found.`
            : ""}
        </p>

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
