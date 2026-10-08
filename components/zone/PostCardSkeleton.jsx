import Skeleton from "@/components/ui/Skeleton";

export default function PostCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-card">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-5 w-4/5" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
        <div className="flex items-center gap-2 pt-3">
          <Skeleton className="h-7 w-7 rounded-full" />
          <Skeleton className="h-3.5 w-28" />
        </div>
      </div>
    </div>
  );
}
