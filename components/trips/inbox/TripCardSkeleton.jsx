import { Card } from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";

export default function TripCardSkeleton() {
  return (
    <Card className="space-y-5 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-6 w-2/3 rounded-full" />
    </Card>
  );
}
