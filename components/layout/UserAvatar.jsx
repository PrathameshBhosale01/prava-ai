import { cn } from "@/lib/utils";

export function getInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

/** Google photo when there is one, otherwise the user's initials. */
export default function UserAvatar({ photoURL, name, className }) {
  if (photoURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoURL}
        alt=""
        referrerPolicy="no-referrer"
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-primary-soft font-semibold text-primary",
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}