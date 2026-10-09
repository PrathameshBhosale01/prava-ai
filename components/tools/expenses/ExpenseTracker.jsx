"use client";

import { useMemo, useRef, useState } from "react";
import {
  Download,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  SearchX,
  TriangleAlert,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import { useExpenses } from "@/hooks/useExpenses";
import { useRates } from "@/hooks/useRates";
import { useStoredState } from "@/hooks/useStoredState";
import { CURRENCIES } from "@/lib/currencyOptions";
import { formatMoney } from "@/lib/tools/currency";
import {
  ALL,
  expensesToCsv,
  filterExpenses,
  GENERAL,
  NO_TRIP,
  summarize,
  totalsBy,
} from "@/lib/tools/expenseSummary";
import { LIMITS, localIsoDate } from "@/lib/tools/expenseValidation";
import { cn } from "@/lib/utils";
import ExpenseForm from "./ExpenseForm";
import ExpenseList from "./ExpenseList";
import SpendingBreakdown from "./SpendingBreakdown";

const DEFAULT_CURRENCY = "INR";
const CODES = new Set(CURRENCIES.map((currency) => currency.code));

function Stat({ label, children, hint, className }) {
  return (
    <Card className={cn("p-4", className)}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-xl font-semibold tabular-nums text-foreground sm:text-2xl">{children}</div>
      {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        active
          ? "border-primary bg-primary-soft text-primary"
          : "border-border bg-surface text-muted-foreground hover:bg-surface-muted hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

function downloadCsv(text) {
  // BOM so Excel reads UTF-8 (₹, accents) correctly.
  const blob = new Blob(["\uFEFF", text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `prava-expenses-${localIsoDate()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function ExpenseTracker() {
  const data = useExpenses();
  const rateState = useRates();
  const formRef = useRef(null);

  const [storedCurrency, setCurrency] = useStoredState("prava.tools.expenses.currency", DEFAULT_CURRENCY);
  const currency = CODES.has(storedCurrency) ? storedCurrency : DEFAULT_CURRENCY;

  const [filters, setFilters] = useState({ bucket: ALL, trip: ALL, query: "" });
  const [editing, setEditing] = useState(null);
  const [newBucket, setNewBucket] = useState(null); // null = closed, string = input value
  const [bucketError, setBucketError] = useState("");
  const [bucketToDelete, setBucketToDelete] = useState(null);

  const { expenses, buckets, trips, tripsLoaded } = data;
  const bucketNames = useMemo(() => new Map(buckets.map((b) => [b.id, b.title])), [buckets]);
  const tripNames = useMemo(() => new Map(trips.map((t) => [t.id, t.title])), [trips]);

  const bucketName = (id) => (id ? bucketNames.get(id) ?? "General" : "General");
  const tripName = (id) => tripNames.get(id) ?? (tripsLoaded ? "Deleted trip" : "Trip");

  const visible = useMemo(() => filterExpenses(expenses, filters), [expenses, filters]);
  const isFiltered = filters.bucket !== ALL || filters.trip !== ALL || filters.query.trim() !== "";

  const { rates } = rateState;
  const summary = useMemo(() => summarize(visible, currency, rates), [visible, currency, rates]);
  const byBucket = useMemo(
    () => totalsBy(visible, (e) => e.bucketId ?? GENERAL, currency, rates),
    [visible, currency, rates]
  );
  const byTrip = useMemo(
    () => totalsBy(visible.filter((e) => e.tripId), (e) => e.tripId, currency, rates),
    [visible, currency, rates]
  );

  const needsRates = visible.some((e) => e.currency !== currency);
  const ratesPending = needsRates && rateState.status === "loading";
  const someUnconverted = summary.missing > 0 && !ratesPending;

  function startEdit(expense) {
    setEditing(expense);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    formRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }

  async function submitExpense(input) {
    if (editing) {
      await data.saveExpense(editing.id, input);
      setEditing(null);
    } else {
      await data.addExpense(input);
    }
  }

  async function deleteExpense(expense) {
    try {
      await data.removeExpense(expense);
    } catch (error) {
      toast.error(error.message);
      return;
    }
    if (editing?.id === expense.id) setEditing(null);

    toast("Expense deleted", {
      action: {
        label: "Undo",
        onClick: () =>
          data
            .addExpense({
              title: expense.title,
              amount: expense.amount,
              currency: expense.currency,
              date: expense.date,
              note: expense.note,
              bucketId: bucketNames.has(expense.bucketId) ? expense.bucketId : null,
              tripId: expense.tripId,
            })
            .catch((error) => toast.error(`Couldn't restore it: ${error.message}`)),
      },
    });
  }

  async function submitBucket(event) {
    event.preventDefault();
    try {
      const bucket = await data.addBucket(newBucket);
      setNewBucket(null);
      setBucketError("");
      setFilters((current) => ({ ...current, bucket: bucket.id }));
    } catch (error) {
      setBucketError(error.fields?.title ?? error.message);
    }
  }

  async function confirmDeleteBucket() {
    const bucket = bucketToDelete;
    try {
      const { moved } = await data.removeBucket(bucket.id);
      setFilters((current) => (current.bucket === bucket.id ? { ...current, bucket: ALL } : current));
      toast.success(
        moved > 0 ? `Bucket deleted. ${moved} expense${moved === 1 ? "" : "s"} moved to General.` : "Bucket deleted"
      );
    } catch (error) {
      toast.error(error.message);
    }
    setBucketToDelete(null);
  }

  function exportCsv() {
    downloadCsv(expensesToCsv(visible, { bucketName, tripName, currency, rates }));
  }

  // ---------------------------------------------------------------- states

  if (data.status === "error") {
    return (
      <Card>
        <EmptyState
          icon={TriangleAlert}
          title="Couldn't load your expenses"
          description={data.error}
          action={
            <Button onClick={data.reload}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          }
        />
      </Card>
    );
  }

  const loading = data.status === "loading";
  const bucketToDeleteCount = bucketToDelete
    ? expenses.filter((e) => e.bucketId === bucketToDelete.id).length
    : 0;
  const activeBucket = buckets.find((b) => b.id === filters.bucket);

  return (
    <div className="space-y-6">
      {/* Currency + export */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-52">
          <label htmlFor="expense-currency" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Show totals in
          </label>
          <Select id="expense-currency" value={currency} onChange={(event) => setCurrency(event.target.value)}>
            {CURRENCIES.map((option) => (
              <option key={option.code} value={option.code}>
                {option.code} · {option.name}
              </option>
            ))}
          </Select>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={loading || visible.length === 0}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Export CSV
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {loading || ratesPending ? (
          <>
            <Skeleton className="col-span-2 h-[88px] sm:col-span-1" />
            <Skeleton className="h-[88px]" />
            <Skeleton className="h-[88px]" />
          </>
        ) : (
          <>
            <Stat className="col-span-2 sm:col-span-1" label={isFiltered ? "Total (filtered)" : "Total spent"} hint={`${summary.count} expense${summary.count === 1 ? "" : "s"}`}>
              {formatMoney(summary.total, currency)}
            </Stat>
            <Stat label="Average">{formatMoney(summary.average, currency)}</Stat>
            <Stat label="Biggest" hint={summary.largest?.expense.title}>
              {summary.largest ? formatMoney(summary.largest.value, currency) : "—"}
            </Stat>
          </>
        )}
      </div>

      {someUnconverted && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm">
          <TriangleAlert className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <p className="min-w-0 flex-1 text-foreground">
            {summary.missing} expense{summary.missing === 1 ? "" : "s"} in other currencies couldn&apos;t be
            converted, so {summary.missing === 1 ? "it isn't" : "they aren't"} in the totals.
          </p>
          <Button variant="outline" size="sm" onClick={rateState.refresh} disabled={rateState.refreshing}>
            <RefreshCw className={cn("h-3.5 w-3.5", rateState.refreshing && "animate-spin")} aria-hidden="true" />
            Retry rates
          </Button>
        </div>
      )}

      {data.truncated && (
        <p role="status" className="text-xs text-muted-foreground">
          Showing your {LIMITS.listMax} most recent expenses.
        </p>
      )}

      {/* Add / edit */}
      <Card ref={formRef} className="scroll-mt-20 space-y-4 p-4 sm:p-5">
        <h3 className="text-base font-semibold text-foreground">{editing ? "Edit expense" : "Add an expense"}</h3>
        <ExpenseForm
          key={editing?.id ?? "new"}
          expense={editing}
          buckets={buckets}
          trips={trips}
          defaultCurrency={currency}
          onSubmit={submitExpense}
          onCancel={() => setEditing(null)}
        />
      </Card>

      {/* Filters */}
      <Card className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={filters.query}
              onChange={(event) => setFilters((c) => ({ ...c, query: event.target.value }))}
              placeholder="Search expenses"
              aria-label="Search expenses"
              autoComplete="off"
              className="pl-9"
            />
          </div>
          {trips.length > 0 && (
            <Select
              aria-label="Filter by trip"
              className="sm:w-56"
              value={filters.trip}
              onChange={(event) => setFilters((c) => ({ ...c, trip: event.target.value }))}
            >
              <option value={ALL}>All trips</option>
              <option value={NO_TRIP}>Not linked to a trip</option>
              {trips.map((trip) => (
                <option key={trip.id} value={trip.id}>
                  {trip.title}
                </option>
              ))}
            </Select>
          )}
        </div>

        <div role="group" aria-label="Filter by bucket" className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
          <FilterChip active={filters.bucket === ALL} onClick={() => setFilters((c) => ({ ...c, bucket: ALL }))}>
            All
          </FilterChip>
          <FilterChip active={filters.bucket === GENERAL} onClick={() => setFilters((c) => ({ ...c, bucket: GENERAL }))}>
            General
          </FilterChip>
          {buckets.map((bucket) => (
            <FilterChip
              key={bucket.id}
              active={filters.bucket === bucket.id}
              onClick={() => setFilters((c) => ({ ...c, bucket: bucket.id }))}
            >
              {bucket.title}
            </FilterChip>
          ))}
          <button
            type="button"
            onClick={() => {
              setNewBucket((value) => (value === null ? "" : null));
              setBucketError("");
            }}
            className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-full border border-dashed border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
            New bucket
          </button>
        </div>

        {newBucket !== null && (
          <form onSubmit={submitBucket} className="flex flex-wrap items-start gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              <Input
                autoFocus
                value={newBucket}
                onChange={(event) => {
                  setNewBucket(event.target.value);
                  setBucketError("");
                }}
                maxLength={LIMITS.bucketMax}
                placeholder="Bucket name (Food, Hotel, Transport)"
                aria-label="New bucket name"
                aria-invalid={bucketError ? true : undefined}
                aria-describedby={bucketError ? "bucket-error" : undefined}
                autoComplete="off"
              />
              {bucketError && (
                <p id="bucket-error" role="alert" className="text-xs text-danger">
                  {bucketError}
                </p>
              )}
            </div>
            <Button type="submit">Add bucket</Button>
            <Button type="button" variant="ghost" onClick={() => setNewBucket(null)}>
              Cancel
            </Button>
          </form>
        )}

        {activeBucket && (
          <Button variant="ghost" size="sm" onClick={() => setBucketToDelete(activeBucket)} className="hover:text-danger">
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Delete &ldquo;{activeBucket.title}&rdquo; bucket
          </Button>
        )}
      </Card>

      {/* Results */}
      {loading ? (
        <div className="space-y-3" role="status" aria-label="Loading expenses">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-[68px] w-full" />
          ))}
        </div>
      ) : expenses.length === 0 ? (
        <Card>
          <EmptyState
            icon={Wallet}
            title="No expenses yet"
            description="Add your first expense above. Group them into buckets and link them to a trip to see where the money goes."
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={SearchX}
            title="No matching expenses"
            description="Try a different search or clear the filters."
            action={
              <Button variant="outline" onClick={() => setFilters({ bucket: ALL, trip: ALL, query: "" })}>
                <X className="h-4 w-4" aria-hidden="true" />
                Clear filters
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SpendingBreakdown
              title="By bucket"
              groups={byBucket}
              labelOf={(key) => (key === GENERAL ? "General" : bucketName(key))}
              currency={currency}
              grandTotal={summary.total}
            />
            <SpendingBreakdown
              title="By trip"
              groups={byTrip}
              labelOf={tripName}
              currency={currency}
              grandTotal={summary.total}
            />
          </div>

          <section aria-labelledby="expense-list-heading" className="space-y-3">
            <h3 id="expense-list-heading" className="flex items-center gap-2 text-base font-semibold text-foreground">
              <Receipt className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {isFiltered ? `${visible.length} of ${expenses.length} expenses` : "Recent expenses"}
            </h3>
            <ExpenseList
              expenses={visible}
              editingId={editing?.id}
              bucketName={bucketName}
              tripName={tripName}
              currency={currency}
              rates={rates}
              onEdit={startEdit}
              onDelete={deleteExpense}
            />
          </section>
        </>
      )}

      <Modal
        open={Boolean(bucketToDelete)}
        onClose={() => setBucketToDelete(null)}
        title="Delete this bucket?"
        description={
          bucketToDelete
            ? bucketToDeleteCount > 0
              ? `"${bucketToDelete.title}" will be removed. Its ${bucketToDeleteCount} expense${bucketToDeleteCount === 1 ? "" : "s"} will move to General, not be deleted.`
              : `"${bucketToDelete.title}" is empty and will be removed.`
            : undefined
        }
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setBucketToDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={confirmDeleteBucket}>
              Delete bucket
            </Button>
          </>
        }
      />
    </div>
  );
}
