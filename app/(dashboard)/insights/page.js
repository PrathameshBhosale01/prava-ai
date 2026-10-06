// Put at: app/<your-signed-in-route-group>/insights/page.js
// (same folder level as your dashboard/ and trips/ routes)
import InsightsClient from "@/components/insights/InsightsClient";

export const metadata = { title: "Insights | Prava AI" };

export default function InsightsPage() {
  return <InsightsClient />;
}
