import { Compass, Plane, Sparkles, Wallet } from "lucide-react";

import { QUICK_PROMPTS } from "@/lib/assistant/config";
import AssistantMark from "./AssistantMark";

const ICONS = { plane: Plane, sparkles: Sparkles, wallet: Wallet, compass: Compass };

/** Empty state: greeting plus one-tap starter prompts. */
export default function WelcomeScreen({ name, onPick, disabled }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 py-8 sm:px-6">
      <AssistantMark size="lg" />
      <h2 className="mt-5 text-center text-2xl font-semibold tracking-tight text-gray-900">
        {name ? `Hi ${name}, where to next?` : "Where to next?"}
      </h2>
      <p className="mt-2 max-w-md text-center text-[15px] leading-6 text-gray-500">
        Tell me your dream destination and I&apos;ll help you plan the perfect trip.
      </p>

      <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-2">
        {QUICK_PROMPTS.map((item) => {
          const Icon = ICONS[item.icon] ?? Sparkles;
          return (
            <button
              key={item.title}
              type="button"
              disabled={disabled}
              onClick={() => onPick(item.prompt)}
              className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left transition hover:border-gray-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-gray-400 disabled:opacity-60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition group-hover:bg-blue-50 group-hover:text-blue-600">
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-gray-900">{item.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-gray-500">{item.hint}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}