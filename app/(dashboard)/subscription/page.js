import SubscriptionClient from "@/components/subscription/SubscriptionClient";
import { pageTitle } from "@/lib/brand";

export const metadata = { title: pageTitle("Subscription & Plans") };

export default function SubscriptionPage() {
  return <SubscriptionClient />;
}
