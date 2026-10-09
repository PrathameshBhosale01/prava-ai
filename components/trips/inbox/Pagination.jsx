import { ChevronLeft, ChevronRight } from "lucide-react";

import Button from "@/components/ui/Button";

export default function Pagination({ page, totalPages, total, pageSize, onChange }) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Trips pagination"
      className="flex flex-col-reverse items-center justify-between gap-3 sm:flex-row"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        Showing {from}–{to} of {total} trips
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
        </Button>
        <span className="px-1 text-sm text-muted-foreground">
          {page} / {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
