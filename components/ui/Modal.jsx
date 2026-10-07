"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const SIZES = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg" };
/**
 * Accessible modal built on the native <dialog> element, so the browser
 * handles focus trapping, Esc to close, and making the page behind inert.
 *
 * Controlled: pass `open` and `onClose`. Children are only mounted while
 * open, so anything that fetches data does so when the modal is opened.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  size = "md",
  className,
  children,
}) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  // Keep the DOM dialog in sync with the `open` prop.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      // Fires for Esc and for dialog.close(); keeps the parent's state honest.
      onClose={onClose}
      // A click on the dialog element itself (not its content) is a click on the backdrop.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] overflow-hidden rounded-2xl border border-border bg-surface p-0 text-foreground shadow-pop",
        "max-h-[calc(100dvh-2rem)] open:flex open:flex-col",
        "backdrop:bg-black/50 backdrop:backdrop-blur-[2px]",
        SIZES[size],
        className
      )}
    >
      {open && (
        <>
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 id={titleId} className="text-lg font-semibold tracking-tight">
                {title}
              </h2>
              {description && (
                <p id={descriptionId} className="mt-0.5 text-sm text-muted-foreground">
                  {description}
                </p>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Close"
              className="-mr-2 -mt-1 shrink-0"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>

          {footer && (
            <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-surface-muted/50 px-5 py-3 sm:px-6">
              {footer}
            </div>
          )}
        </>
      )}
    </dialog>
  );
}