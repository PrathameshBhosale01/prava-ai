"use client";

import { useEffect, useRef } from "react";
import { Loader2, TriangleAlert } from "lucide-react";

import Button from "@/components/ui/Button";

/**
 * Confirmation built on the native <dialog>: focus trap, Escape to close and
 * a backdrop come for free, with no extra dependency.
 */
export default function DeleteTripDialog({ trip, deleting, error, onCancel, onConfirm }) {
  const ref = useRef(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (trip && !dialog.open) dialog.showModal();
    if (!trip && dialog.open) dialog.close();
  }, [trip]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="delete-trip-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!deleting) onCancel();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !deleting) onCancel();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-border bg-surface p-0 text-foreground shadow-pop backdrop:bg-black/50 backdrop:backdrop-blur-[2px]"
    >
      {trip && (
        <div className="space-y-4 p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger">
              <TriangleAlert className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="delete-trip-title" className="text-base font-semibold">
                Delete this trip?
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                “{trip.title}” and its itinerary will be permanently removed. This can’t be undone.
              </p>
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={deleting} autoFocus>
              Cancel
            </Button>
            <Button variant="danger" onClick={onConfirm} disabled={deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {deleting ? "Deleting…" : "Delete trip"}
            </Button>
          </div>
        </div>
      )}
    </dialog>
  );
}
