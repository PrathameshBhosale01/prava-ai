import { Sparkles } from "lucide-react";

const SIZES = {
  sm: { box: "h-7 w-7 rounded-lg", icon: 14 },
  md: { box: "h-9 w-9 rounded-xl", icon: 18 },
  lg: { box: "h-14 w-14 rounded-2xl", icon: 26 },
};

/** The assistant's avatar: a small gradient tile that matches the Prava AI logo colours. */
export default function AssistantMark({ size = "md" }) {
  const { box, icon } = SIZES[size];

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center bg-linear-to-br from-primary to-violet-500 text-primary-foreground shadow-card ${box}`}
    >
      <Sparkles size={icon} strokeWidth={2} />
    </span>
  );
}