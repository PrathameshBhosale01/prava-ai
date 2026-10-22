"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Crown, Loader2 } from "lucide-react";

import Button from "@/components/ui/Button";
import { auth } from "@/lib/firebase";
import { billingOptions, perkRows, requestBillingUrl, upgradePrompt } from "@/lib/billing/upgrade";
import { cn } from "@/lib/utils";

const OPTIONS = billingOptions();

/**
 * "Upgrade to Pro" modal on the native <dialog> (same pattern as ConfirmDialog: focus trap, Esc, inert page).
 * `prompt` = { reason, message } says WHY it opened, so the headline and the highlighted row match the limit
 * the person just hit.
 */
export default function UpgradeDialog({ open, prompt, onClose }) {
  const ref = useRef(null);
  const uid = useId();
  const [period, setPeriod] = useState("year");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const copy = upgradePrompt(prompt?.reason, prompt?.message);
  const chosen = OPTIONS.find((option) => option.interval === period);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function upgrade() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Please sign in again.");
      const token = await user.getIdToken();
      const url = await requestBillingUrl({ path: "/api/billing/checkout", body: { interval: period }, token });
      window.location.assign(url); // leaves the app for the hosted checkout; keep the button disabled
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  function close() {
    if (busy) return;
    setError("");
    onClose();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${uid}-title`}
      aria-describedby={`${uid}-desc`}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => e.target === ref.current && close()}
      className="m-auto max-h-[92dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface p-0 text-foreground shadow-pop backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Crown className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id={`${uid}-title`} className="text-lg font-semibold tracking-tight">
              {copy.title}
            </h2>
            <p id={`${uid}-desc`} className="mt-1 text-sm text-muted-foreground">
              {copy.message}
            </p>
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="sr-only">Billing period</legend>
          <div className="grid grid-cols-2 gap-2">
            {OPTIONS.map((option) => {
              const selected = option.interval === period;
              return (
                <label
                  key={option.interval}
                  className={cn(
                    "relative flex cursor-pointer flex-col rounded-xl border px-3.5 py-3 transition-colors focus-within:ring-2 focus-within:ring-primary/40",
                    selected ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-muted",
                  )}
                >
                  <input type="radio" name={`${uid}-interval`} value={option.interval} checked={selected} onChange={() => setPeriod(option.interval)} className="sr-only" />
                  <span className="flex items-center justify-between gap-2 text-sm font-medium">
                    {option.label}
                    {option.badge && <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-medium text-success">{option.badge}</span>}
                  </span>
                  <span className="mt-1 text-lg font-semibold tabular-nums">{option.price}</span>
                  <span className="text-xs text-muted-foreground">{option.note}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <table className="mt-5 w-full text-sm">
          <caption className="sr-only">Free Explorer compared with Pro Wanderer</caption>
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
              <th scope="col" className="py-2 pr-2 font-medium">
                What you get
              </th>
              <th scope="col" className="px-2 py-2 text-center font-medium">
                Free
              </th>
              <th scope="col" className="py-2 pl-2 text-center font-medium text-primary">
                Pro
              </th>
            </tr>
          </thead>
          <tbody>
            {perkRows().map((row) => (
              <tr key={row.key} className={cn("border-b border-border last:border-0", copy.highlight === row.key && "bg-warning-soft")}>
                <th scope="row" className="py-2 pr-2 text-left font-normal">
                  {row.label}
                </th>
                <td className="px-2 py-2 text-center text-muted-foreground tabular-nums">{row.free}</td>
                <td className="py-2 pl-2 text-center font-medium tabular-nums">
                  {row.pro === "Included" ? (
                    <>
                      <Check className="mx-auto h-4 w-4 text-success" aria-hidden="true" />
                      <span className="sr-only">Included</span>
                    </>
                  ) : (
                    row.pro
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={close} disabled={busy} autoFocus>
            Maybe later
          </Button>
          <Button onClick={upgrade} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Crown className="h-4 w-4" aria-hidden="true" />}
            {busy ? "Opening checkout…" : `Upgrade · ${chosen.cta}`}
          </Button>
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">Secure checkout. Cancel anytime.</p>
      </div>
    </dialog>
  );
}
