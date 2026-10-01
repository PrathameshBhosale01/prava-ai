// kind: "arc"  = drawn as a straight-line / great-circle path (no external call)
//       "road" = needs a road route from /api/route
export const TRAVEL_MODES = [
  { id: "flight", icon: "✈️", label: "Flight", color: "#7c3aed", weight: 3, dash: "10,7", kind: "arc" },
  { id: "drive", icon: "🚗", label: "Drive", color: "#2563eb", weight: 5, dash: null, kind: "road" },
  { id: "bus", icon: "🚌", label: "Bus", color: "#16a34a", weight: 5, dash: "10,5", kind: "road" },
  { id: "train", icon: "🚂", label: "Train", color: "#dc2626", weight: 5, dash: "16,5", kind: "road" },
  { id: "ferry", icon: "⛴️", label: "Ferry", color: "#0891b2", weight: 3, dash: "6,8", kind: "arc" },
];

export function getMode(id) {
  return TRAVEL_MODES.find((m) => m.id === id) ?? TRAVEL_MODES[0];
}