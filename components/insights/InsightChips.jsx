import { CalendarDays, MapPin, Wallet } from "lucide-react";

import { formatINR } from "@/lib/insights";

function Chip({ icon: Icon, children }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground">
      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      {children}
    </span>
  );
}

export default function InsightChips({ summary }) {
  const { favourite, daysOnRoad, avgPerTrip, totalTrips } = summary;
  if (totalTrips === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {favourite && <Chip icon={MapPin}>Favourite: {favourite}</Chip>}
      {daysOnRoad > 0 && (
        <Chip icon={CalendarDays}>
          {daysOnRoad} {daysOnRoad === 1 ? "day" : "days"} on the road
        </Chip>
      )}
      <Chip icon={Wallet}>Avg. {formatINR(avgPerTrip)} per trip</Chip>
    </div>
  );
}
