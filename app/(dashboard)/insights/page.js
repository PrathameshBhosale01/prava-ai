// Put at: app/<your-signed-in-route-group>/insights/page.js
// (same folder level as your dashboard/ and trips/ routes)
import InsightsClient from "@/components/insights/InsightsClient";
import { pageTitle } from "@/lib/brand";

export const metadata = { title: pageTitle("Insights") };

export default function InsightsPage() {
  return <InsightsClient />;
}
