import { Backpack, Bus, ShieldAlert, Sun, UtensilsCrossed } from "lucide-react";

import { cn } from "@/lib/utils";

import SectionCard from "./SectionCard";

const dots = { warning: "marker:text-warning", danger: "marker:text-danger", primary: "marker:text-primary" };

function InfoList({ id, icon, title, tone, items }) {
  return (
    <SectionCard id={id} icon={icon} title={title} tone={tone}>
      <ul className={cn("list-disc space-y-2.5 pl-5 text-sm leading-relaxed text-foreground/85", dots[tone])}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </SectionCard>
  );
}

function Callout({ id, icon: Icon, title, tone, children }) {
  const tones = {
    info: "border-info/30 bg-info-soft text-info",
    success: "border-success/30 bg-success-soft text-success",
  };
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className={cn("break-inside-avoid rounded-2xl border p-5 sm:p-6", tones[tone])}>
      <h2 id={`${id}-heading`} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/90">{children}</p>
    </section>
  );
}

/** Cuisine / safety / packing lists and the two short callouts. Each renders only if the itinerary has it. */
export default function TipsSections({ view }) {
  const lists = [
    view.localCuisine.length > 0 && <InfoList key="cuisine" id="trip-cuisine" icon={UtensilsCrossed} title="Local cuisine" tone="warning" items={view.localCuisine} />,
    view.safetyTips.length > 0 && <InfoList key="safety" id="trip-safety" icon={ShieldAlert} title="Safety tips" tone="danger" items={view.safetyTips} />,
    view.packingSuggestions.length > 0 && <InfoList key="packing" id="trip-packing" icon={Backpack} title="Packing suggestions" tone="primary" items={view.packingSuggestions} />,
  ].filter(Boolean);

  if (lists.length === 0 && !view.transportationTips && !view.bestSeason) return null;

  return (
    <>
      {lists.length > 0 && <div className="grid gap-5 md:grid-cols-2">{lists}</div>}
      {view.transportationTips && (
        <Callout id="trip-transport" icon={Bus} title="Transportation tips" tone="info">
          {view.transportationTips}
        </Callout>
      )}
      {view.bestSeason && (
        <Callout id="trip-season" icon={Sun} title="Best season to visit" tone="success">
          {view.bestSeason}
        </Callout>
      )}
    </>
  );
}
