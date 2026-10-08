"use client";

import { useEffect, useId, useRef } from "react";

import Button from "@/components/ui/Button";

/**
 * Modal confirmation on the native <dialog>: focus is trapped, Esc closes it, and the
 * page behind is inert — all provided by the browser. Focus starts on "Cancel" so a
 * stray Enter can't trigger the destructive action.
 */
export default function ConfirmDialog({ open, title, description, confirmLabel = "Delete", busyLabel = "Deleting…", busy = false, onConfirm, onCancel }) {
  const ref = useRef(null);
  const uid = useId(); // several dialogs can live on one page, so ids must be unique
  const titleId = `${uid}-title`;
  const descId = `${uid}-desc`;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={descId}
      onCancel={(e) => {
        e.preventDefault(); // we close it ourselves via `open`
        if (!busy) onCancel();
      }}
      onClick={(e) => e.target === ref.current && !busy && onCancel()} // backdrop click
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl border border-border bg-surface p-0 text-foreground shadow-pop backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <h2 id={titleId} className="text-lg font-semibold tracking-tight">
          {title}
        </h2>
        <p id={descId} className="mt-2 text-sm text-muted-foreground">
          {description}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={busy} autoFocus>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={busy}>
            {busy ? busyLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </dialog>
  );
}
