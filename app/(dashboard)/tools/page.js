import { Suspense } from "react";

import ToolsWorkspace from "@/components/tools/ToolsWorkspace";
import Skeleton from "@/components/ui/Skeleton";

export const metadata = { title: "Travel Tools | Prava AI" };

function ToolsSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading travel tools">
      <div className="space-y-2">
        <Skeleton className="h-8 w-44" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-11 w-full sm:w-96" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export default function ToolsPage() {
  return (
    <Suspense fallback={<ToolsSkeleton />}>
      <ToolsWorkspace />
    </Suspense>
  );
}
