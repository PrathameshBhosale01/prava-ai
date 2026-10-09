"use client";

import { useMemo, useState } from "react";
import {
  Flame,
  HeartPulse,
  Info,
  Phone,
  Search,
  SearchX,
  Shield,
  Siren,
  X,
} from "lucide-react";

import Button, { buttonVariants } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import CopyButton from "@/components/ui/CopyButton";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import { EMERGENCY_COUNTRIES } from "@/lib/tools/emergencyData";
import {
  ALL_REGIONS,
  availableRegions,
  filterCountries,
  telHref,
} from "@/lib/tools/emergency";
import { cn } from "@/lib/utils";

// Static class strings so Tailwind can see them.
const TONES = {
  primary: "bg-primary-soft text-primary",
  info: "bg-info-soft text-info",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  success: "bg-success-soft text-success",
};

const KIND_META = {
  universal: { icon: Siren, tone: "primary" },
  police: { icon: Shield, tone: "info" },
  fire: { icon: Flame, tone: "warning" },
  ambulance: { icon: HeartPulse, tone: "danger" },
  tourist: { icon: Info, tone: "success" },
  helpline: { icon: Phone, tone: "primary" },
};

const REGIONS = [ALL_REGIONS, ...availableRegions(EMERGENCY_COUNTRIES)];

function NumberRow({ item, countryName }) {
  const meta = KIND_META[item.kind] ?? KIND_META.helpline;
  const Icon = meta.icon;

  return (
    <li className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <span
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          TONES[meta.tone]
        )}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
        {item.note && (
          <p className="truncate text-xs text-muted-foreground" title={item.note}>
            {item.note}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <a
          href={telHref(item.number)}
          aria-label={`Call ${item.label} in ${countryName}: ${item.number}`}
          className={buttonVariants({
            variant: "outline",
            size: "sm",
            className: "font-mono tabular-nums",
          })}
        >
          <Phone className="h-3.5 w-3.5" aria-hidden="true" />
          {item.number}
        </a>
        <CopyButton value={item.number} label={`${item.label} number ${item.number}`} />
      </div>
    </li>
  );
}

function CountryCard({ country }) {
  const headingId = `emergency-${country.code}`;

  return (
    <li>
      <Card role="group" className="h-full overflow-hidden" aria-labelledby={headingId}>
        <div className="flex items-center justify-between gap-3 border-b border-border bg-surface-muted/60 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h3 id={headingId} className="truncate text-base font-semibold text-foreground">
              {country.name}
            </h3>
            <p className="text-xs text-muted-foreground">{country.region}</p>
          </div>
          <span className="shrink-0 rounded-md border border-border bg-surface px-2 py-0.5 font-mono text-xs font-medium text-muted-foreground">
            {country.code}
          </span>
        </div>

        <ul className="divide-y divide-border">
          {country.numbers.map((item) => (
            <NumberRow
              key={`${item.kind}-${item.label}-${item.number}`}
              item={item}
              countryName={country.name}
            />
          ))}
        </ul>
      </Card>
    </li>
  );
}

export default function EmergencyContacts({ initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [region, setRegion] = useState(ALL_REGIONS);

  const results = useMemo(
    () => filterCountries(EMERGENCY_COUNTRIES, { query, region }),
    [query, region]
  );

  const filtered = query.trim() !== "" || region !== ALL_REGIONS;

  function reset() {
    setQuery("");
    setRegion(ALL_REGIONS);
  }

  return (
    <div className="space-y-5">
      <div
        className="flex items-start gap-3 rounded-xl border border-danger/25 bg-danger-soft px-4 py-3 text-sm"
        role="note"
      >
        <Siren className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
        <p className="text-foreground">
          <span className="font-semibold text-danger">In immediate danger?</span>{" "}
          Call the local emergency number first. 112 connects to emergency services on
          most mobile networks worldwide.
        </p>
      </div>

      <Card className="space-y-4 p-4 sm:p-5">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search country, code or number"
            aria-label="Search emergency contacts"
            autoComplete="off"
            spellCheck={false}
            className="pl-9 pr-10"
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-0.5 top-1/2 h-8 w-8 -translate-y-1/2"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          )}
        </div>

        <div
          role="group"
          aria-label="Filter by region"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          {REGIONS.map((name) => {
            const active = region === name;
            return (
              <button
                key={name}
                type="button"
                aria-pressed={active}
                onClick={() => setRegion(name)}
                className={cn(
                  "shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  active
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-border bg-surface text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                )}
              >
                {name}
              </button>
            );
          })}
        </div>
      </Card>

      <p aria-live="polite" className="text-sm text-muted-foreground">
        {results.length} {results.length === 1 ? "country" : "countries"}
        {filtered && " found"}
      </p>

      {results.length === 0 ? (
        <Card>
          <EmptyState
            icon={SearchX}
            title="No matching country"
            description="Try a different spelling, a country code like JP, or clear the filters."
            action={
              <Button variant="outline" onClick={reset}>
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {results.map((country) => (
            <CountryCard key={country.code} country={country} />
          ))}
        </ul>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Numbers are compiled from public sources and can change. Confirm locally; some
        regions use different services.
      </p>
    </div>
  );
}
