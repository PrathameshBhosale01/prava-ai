import { clsx } from "clsx";

/** Merge conditional class names: cn("a", cond && "b") */
export function cn(...inputs) {
  return clsx(inputs);
}