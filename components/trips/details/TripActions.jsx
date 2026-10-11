"use client";

import { Printer, Trash2 } from "lucide-react";

import Button from "@/components/ui/Button";

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
export default function TripActions({ title, onDelete }) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <Button variant="inverse" size="sm" onClick={() => printTrip(title)}>
        <Printer className="h-3.5 w-3.5" aria-hidden="true" />
        Print / Save PDF
      </Button>
      <Button size="sm" onClick={onDelete} className="border border-white/40 bg-white/10 text-white hover:bg-red-500/80">
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        Delete trip
      </Button>
    </div>
  );
}
