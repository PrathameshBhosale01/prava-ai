"use client";

import Link from "next/link";
import { Pencil, Printer, Trash2 } from "lucide-react";

import Button, { buttonVariants } from "@/components/ui/Button";

import ExportMenu from "./ExportMenu";

/**
 * Opens the browser's print dialog ("Save as PDF" is one of its destinations).
 * The page title becomes the default file name, then is restored afterwards.
 */
export function printTrip(title) {
  const previous = document.title;
  const restore = () => {
    document.title = previous;
    window.removeEventListener("afterprint", restore);
  };
  document.title = `${title || "Trip"} - itinerary`;
  window.addEventListener("afterprint", restore);
  window.print();
}

/** Header buttons, styled for the gradient banner. Not printed. */
export default function TripActions({ title, onDelete, editHref, trip, days }) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {editHref && (
        <Link href={editHref} className={buttonVariants({ variant: "inverse", size: "sm" })}>
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          Edit trip
        </Link>
      )}
      <Button variant="inverse" size="sm" onClick={() => printTrip(title)}>
        <Printer className="h-3.5 w-3.5" aria-hidden="true" />
        Print / Save PDF
      </Button>
      {trip?.itinerary && <ExportMenu trip={trip} days={days} />}
      <Button size="sm" onClick={onDelete} className="border border-white/40 bg-white/10 text-white hover:bg-red-500/80">
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        Delete trip
      </Button>
    </div>
  );
}
