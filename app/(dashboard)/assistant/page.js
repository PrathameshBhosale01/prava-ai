import AssistantWorkspace from "@/components/assistant/AssistantWorkspace";
import { pageTitle } from "@/lib/brand";

export const metadata = { title: pageTitle("AI Assistant") };

 export default function AssistantPage() {

  return <AssistantWorkspace />;
}