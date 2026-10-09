import { redirect } from "next/navigation";

// Expenses now live in Travel Tools. Kept so old links and bookmarks still work.
export default function ExpensesPage() {
  redirect("/tools?tab=expenses");
}
