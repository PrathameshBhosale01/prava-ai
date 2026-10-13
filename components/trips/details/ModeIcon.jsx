import { Bike, Bus, Car, Plane, Shuffle, TrainFront } from "lucide-react";

const ICONS = { flight: Plane, fly: Plane, train: TrainFront, bus: Bus, car: Car, drive: Car, bike: Bike };

/** An icon for "Flight", "Overnight train", "Mixed"… Anything unrecognised gets a neutral shuffle icon. */
export default function ModeIcon({ mode, className }) {
  const text = String(mode ?? "").toLowerCase();
  const key = Object.keys(ICONS).find((name) => text.includes(name));
  const Icon = key ? ICONS[key] : Shuffle;
  return <Icon className={className} aria-hidden="true" />;
}
