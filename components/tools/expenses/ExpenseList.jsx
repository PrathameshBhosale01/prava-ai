"use client";

import { Pencil, Plane, Tag, Trash2 } from "lucide-react";

import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { groupByDate, sortExpenses } from "@/lib/tools/expenseSummary";
import { convertAmount, formatMoney } from "@/lib/tools/currency";
import { localIsoDate } from "@/lib/tools/expenseValidation";

function dayLabel(isoDate) {
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);

  if (isoDate === localIsoDate(today)) return "Today";
  if (isoDate === localIsoDate(yesterday)) return "Yesterday";

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: isoDate.slice(0, 4) === String(today.getFullYear()) ? undefined : "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

function Chip({ icon: Icon, children }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-muted-foreground">
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{children}</span>
    </span>
  );
}

function ExpenseRow({ expense, bucketName, tripName, currency, rates, onEdit, onDelete, active }) {
  const converted =
    expense.currency !== currency
      ? convertAmount(expense.amount, expense.currency, currency, rates)
      : null;

  return (
    <li
      className={
        "flex items-start gap-3 px-4 py-3 sm:px-5 " + (active ? "bg-primary-soft/60" : "")
      }
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="truncate text-sm font-medium text-foreground">{expense.title}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip icon={Tag}>{bucketName(expense.bucketId)}</Chip>
          {expense.tripId && <Chip icon={Plane}>{tripName(expense.tripId)}</Chip>}
        </div>
        {expense.note && <p className="text-xs text-muted-foreground">{expense.note}</p>}
      </div>

      <div className="shrink-0 text-right">
        <p className="text-sm font-semibold tabular-nums text-foreground">
          {formatMoney(expense.amount, expense.currency)}
        </p>
        {converted !== null && (
          <p className="text-xs tabular-nums text-muted-foreground">
            ≈ {formatMoney(converted, currency)}
          </p>
        )}
      </div>

      <div className="-mr-2 flex shrink-0 items-center">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(expense)}
          aria-label={`Edit ${expense.title}`}
          title="Edit"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(expense)}
          aria-label={`Delete ${expense.title}`}
          title="Delete"
          className="hover:text-danger"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

export default function ExpenseList({ expenses, editingId, ...rowProps }) {
  const groups = groupByDate(sortExpenses(expenses));

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.date} aria-label={dayLabel(group.date)}>
          <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {dayLabel(group.date)}
          </h3>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-border">
              {group.items.map((expense) => (
                <ExpenseRow
                  key={expense.id}
                  expense={expense}
                  active={expense.id === editingId}
                  {...rowProps}
                />
              ))}
            </ul>
          </Card>
        </section>
      ))}
    </div>
  );
}
