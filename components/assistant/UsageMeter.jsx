import { Zap } from "lucide-react";

/** Compact "trip plans left today" pill. Turns amber/red as the quota runs low. */
export default function UsageMeter({ usage }) {
  if (!usage) return null;

  const { plans, messages } = usage;
  const tone =
    plans.remaining === 0 || messages.remaining === 0
      ? "border-red-200 bg-red-50 text-red-700"
      : plans.remaining === 1
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-gray-200 bg-white text-gray-600";

  return (
    <span
      title={`${plans.remaining} of ${plans.limit} trip plans and ${messages.remaining} of ${messages.limit} messages left today`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${tone}`}
    >
      <Zap size={12} />
      {plans.remaining}/{plans.limit} plans left today
    </span>
  );
}