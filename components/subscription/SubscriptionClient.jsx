"use client";

import { useEffect, useId, useState } from "react";
import { Check, ChevronDown, CreditCard, Crown, Loader2, Plane, TriangleAlert } from "lucide-react";

import Button from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { buildSnapshot, formatResetDate } from "@/lib/assistant/usage";
import { FAQ, describeSubscription, planBullets } from "@/lib/billing/subscriptionView";
import { billingOptions, requestBillingUrl } from "@/lib/billing/upgrade";
import { auth } from "@/lib/firebase";
import { PLANS } from "@/lib/plans";
import { getMeterPercent, getMeterTone } from "@/lib/profileStats";
import { subscribeToUserTrips } from "@/lib/tripService";
import { cn } from "@/lib/utils";

const OPTIONS = billingOptions();

const BADGE_TONES = {
  neutral: "bg-surface-muted text-muted-foreground",
  success: "bg-success-soft text-success",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
};
const BAR_TONES = { primary: "bg-primary", warning: "bg-warning", danger: "bg-danger" };

function Meter({ label, used, limit, hint }) {
  const id = useId();
  const tone = getMeterTone({ used, limit });
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span id={id} className="text-sm font-medium text-foreground">
          {label}
        </span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {used} of {limit} used
        </span>
      </div>
      <div role="progressbar" aria-labelledby={id} aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(used, limit)} className="mt-2 h-2 overflow-hidden rounded-full bg-surface-muted">
        <div className={cn("h-full rounded-full transition-[width] duration-300", BAR_TONES[tone])} style={{ width: `${getMeterPercent({ used, limit })}%` }} />
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Bullets({ planId }) {
  return (
    <ul className="mt-4 space-y-2.5">
      {planBullets(planId).map((text) => (
        <li key={text} className="flex items-start gap-2 text-sm text-foreground/90">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
          {text}
        </li>
      ))}
    </ul>
  );
}

/** Opens a Polar page (checkout or portal) and leaves the app. Shows its own error. */
function useBillingRedirect() {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  async function go(kind, body) {
    if (busy) return;
    setBusy(kind);
    setError("");
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Please sign in again.");
      const token = await user.getIdToken();
      const url = await requestBillingUrl({ path: kind === "portal" ? "/api/billing/portal" : "/api/billing/checkout", body, token });
      window.location.assign(url);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setBusy("");
    }
  }
  return { busy, error, go };
}

export default function SubscriptionClient() {
  const { user, profile } = useAuth();
  const uid = user?.uid;
  const [now] = useState(() => new Date());
  const [period, setPeriod] = useState("year");
  const [tripCount, setTripCount] = useState(null);
  const { busy, error, go } = useBillingRedirect();

  useEffect(() => {
    if (!uid) return;
    return subscribeToUserTrips(
      uid,
      (trips) => setTripCount(trips.length),
      () => setTripCount(null),
    );
  }, [uid]);

  const view = profile ? describeSubscription(profile, now) : null;
  const usage = profile ? buildSnapshot(profile, now) : null;
  const chosen = OPTIONS.find((o) => o.interval === period);
  const isPro = view?.planId === "pro";
  const trips = PLANS[view?.planId ?? "free"].maxTrips;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Subscription &amp; Plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">See what your plan includes, track your usage and manage billing.</p>
      </header>

      {view?.attention && (
        <p role="alert" className="flex items-start gap-2 rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {view.attention}
        </p>
      )}

      {/* Current plan */}
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your current plan</p>
            {view ? (
              <>
                <CardTitle className="mt-1 flex items-center gap-2 text-xl">
                  {isPro ? <Crown className="h-5 w-5 text-primary" aria-hidden="true" /> : <Plane className="h-5 w-5 text-primary" aria-hidden="true" />}
                  {view.name}
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", BADGE_TONES[view.tone])}>{view.badge}</span>
                </CardTitle>
                <CardDescription>{view.detail}</CardDescription>
              </>
            ) : (
              <Skeleton className="mt-2 h-12 w-64" />
            )}
          </div>
          {view?.hasBilling && (
            <Button variant="outline" onClick={() => go("portal")} disabled={Boolean(busy)}>
              {busy === "portal" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <CreditCard className="h-4 w-4" aria-hidden="true" />}
              {busy === "portal" ? "Opening…" : "Manage billing"}
            </Button>
          )}
        </CardHeader>

        <CardContent className="grid gap-6 pt-5 sm:grid-cols-2">
          {usage ? (
            <>
              <Meter label="AI credits this month" used={usage.credits.used} limit={usage.credits.limit} hint={`Resets on ${formatResetDate(usage.resetsOn)}`} />
              {tripCount === null ? <Skeleton className="h-10 w-full" /> : <Meter label="Trips" used={tripCount} limit={trips} hint={tripCount >= trips ? "You're at your trip limit." : `${trips - tripCount} more can be created`} />}
            </>
          ) : (
            <Skeleton className="h-10 w-full sm:col-span-2" />
          )}
        </CardContent>
      </Card>

      {/* Plans */}
      <section aria-labelledby="plans-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="plans-heading" className="text-lg font-semibold tracking-tight text-foreground">
            Compare plans
          </h2>
          {!isPro && (
            <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-lg border border-border bg-surface p-0.5">
              {OPTIONS.map((o) => (
                <button
                  key={o.interval}
                  type="button"
                  role="radio"
                  aria-checked={o.interval === period}
                  onClick={() => setPeriod(o.interval)}
                  className={cn("cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium transition-colors", o.interval === period ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
                >
                  {o.label}
                  {o.badge && o.interval === period && <span className="ml-1.5 opacity-90">· {o.badge}</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <Card className={cn(view?.planId === "free" && "border-primary/50")}>
            <CardContent className="pt-5 sm:pt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold">{PLANS.free.name}</h3>
                {view?.planId === "free" && <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">Current plan</span>}
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums">₹0</p>
              <p className="text-xs text-muted-foreground">Free forever</p>
              <Bullets planId="free" />
            </CardContent>
          </Card>

          <Card className={cn(isPro ? "border-primary/50" : "border-primary/30 shadow-pop")}>
            <CardContent className="pt-5 sm:pt-6">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-base font-semibold">
                  <Crown className="h-4 w-4 text-primary" aria-hidden="true" />
                  {PLANS.pro.name}
                </h3>
                {isPro && <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-xs font-medium text-primary">Current plan</span>}
              </div>
              <p className="mt-2 text-3xl font-bold tabular-nums">{chosen.price}</p>
              <p className="text-xs text-muted-foreground">{chosen.note}</p>
              <Bullets planId="pro" />

              {view?.canUpgrade && (
                <Button className="mt-6 w-full" onClick={() => go("checkout", { interval: period })} disabled={Boolean(busy)}>
                  {busy === "checkout" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Crown className="h-4 w-4" aria-hidden="true" />}
                  {busy === "checkout" ? "Opening checkout…" : `Upgrade · ${chosen.cta}`}
                </Button>
              )}
              {view?.canUpgrade && <p className="mt-2 text-center text-xs text-muted-foreground">Secure checkout. Cancel anytime.</p>}
            </CardContent>
          </Card>
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-lg font-semibold tracking-tight text-foreground">
          Subscription FAQ
        </h2>
        <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-surface">
          {FAQ.map((item) => (
            <details key={item.q} className="group px-5 py-3">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
                {item.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
