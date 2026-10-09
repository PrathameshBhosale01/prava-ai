import { redirect } from "next/navigation";

// The converter now lives in Travel Tools. Kept so old links and bookmarks still work.
export default function CurrencyPage() {
  redirect("/tools?tab=currency");
}
