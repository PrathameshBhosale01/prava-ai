import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { formatTripBudget, formatTripDate } from "@/lib/insights";

export default function RecentTrips({ trips }) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Recent trips</CardTitle>
        <Link href="/trips" className="inline-flex items-center gap-0.5 text-sm font-medium text-primary hover:text-primary-hover">
          View all
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </CardHeader>

      <CardContent className="pt-2 sm:pt-3">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Destination</th>
                <th className="px-4 py-2 font-medium">Budget</th>
                <th className="hidden px-4 py-2 font-medium sm:table-cell">Start date</th>
                <th className="py-2 pl-4 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="max-w-[16rem] truncate py-3 pr-4 font-medium text-foreground">
                    {t.destination || t.title || "Untitled trip"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success tabular-nums">
                      {formatTripBudget(t)}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-muted-foreground tabular-nums sm:table-cell">
                    {formatTripDate(t.start)}
                  </td>
                  <td className="py-3 pl-4 text-right">
                    <Link
                      href={`/trips/${t.id}`}
                      className="inline-flex items-center gap-0.5 font-medium text-primary hover:text-primary-hover"
                    >
                      View
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
