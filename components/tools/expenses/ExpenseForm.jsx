"use client";

import { useId, useRef, useState } from "react";
import { Plus, Save, X } from "lucide-react";
import { toast } from "sonner";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { CURRENCIES } from "@/lib/currencyOptions";
import { LIMITS, localIsoDate, validateExpenseInput } from "@/lib/tools/expenseValidation";
import { cn } from "@/lib/utils";

function Field({ label, error, id, className, children }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Add or edit an expense. Pass `expense` to edit (give the component a new
 * `key` per expense so it resets). `onSubmit(input)` must return a promise and
 * throw an ApiError (with `fields`) on failure.
 */
export default function ExpenseForm({
  expense,
  buckets,
  trips,
  defaultCurrency,
  onSubmit,
  onCancel,
}) {
  const baseId = useId();
  const titleRef = useRef(null);
  const editing = Boolean(expense);

  const [values, setValues] = useState(() => ({
    title: expense?.title ?? "",
    amount: expense ? String(expense.amount) : "",
    currency: expense?.currency ?? defaultCurrency,
    bucketId: expense?.bucketId ?? "",
    tripId: expense?.tripId ?? "",
    date: expense?.date ?? localIsoDate(),
    note: expense?.note ?? "",
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const id = (name) => `${baseId}-${name}`;
  const set = (name) => (event) => {
    const { value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
    if (errors[name]) setErrors((current) => ({ ...current, [name]: undefined }));
  };
  const a11y = (name) => ({
    id: id(name),
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${id(name)}-error` : undefined,
  });

  async function handleSubmit(event) {
    event.preventDefault();
    if (saving) return;

    // Same rules the server enforces, so mistakes show up instantly.
    const { value, errors: found } = validateExpenseInput(
      { ...values, bucketId: values.bucketId || null, tripId: values.tripId || null },
      { today: localIsoDate() }
    );
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setSaving(true);
    try {
      await onSubmit(value);
      toast.success(editing ? "Expense updated" : "Expense added");

      if (!editing) {
        // Keep currency, bucket, trip and date: people add several in a row.
        setValues((current) => ({ ...current, title: "", amount: "", note: "" }));
        setErrors({});
        titleRef.current?.focus();
      }
    } catch (error) {
      if (error.fields) setErrors(error.fields);
      else toast.error(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4" aria-label={editing ? "Edit expense" : "Add expense"}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
        <Field label="What was it for?" error={errors.title} id={id("title")} className="sm:col-span-3">
          <Input
            {...a11y("title")}
            ref={titleRef}
            value={values.title}
            onChange={set("title")}
            maxLength={LIMITS.titleMax}
            placeholder="Dinner, taxi, museum tickets"
            autoComplete="off"
          />
        </Field>

        <Field label="Amount" error={errors.amount} id={id("amount")} className="sm:col-span-2">
          <Input
            {...a11y("amount")}
            value={values.amount}
            onChange={set("amount")}
            inputMode="decimal"
            placeholder="0.00"
            autoComplete="off"
            className="tabular-nums"
          />
        </Field>

        <Field label="Currency" error={errors.currency} id={id("currency")} className="sm:col-span-1">
          <Select {...a11y("currency")} value={values.currency} onChange={set("currency")}>
            {CURRENCIES.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.code}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Bucket" error={errors.bucketId} id={id("bucket")} className="sm:col-span-2">
          <Select {...a11y("bucket")} value={values.bucketId} onChange={set("bucketId")}>
            <option value="">General</option>
            {buckets.map((bucket) => (
              <option key={bucket.id} value={bucket.id}>
                {bucket.title}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Trip (optional)" error={errors.tripId} id={id("trip")} className="sm:col-span-2">
          <Select {...a11y("trip")} value={values.tripId} onChange={set("tripId")}>
            <option value="">Not linked to a trip</option>
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.title}
              </option>
            ))}
            {/* A linked trip that was deleted or didn't load must not silently unlink on save. */}
            {values.tripId && !trips.some((trip) => trip.id === values.tripId) && (
              <option value={values.tripId}>Unavailable trip</option>
            )}
          </Select>
        </Field>

        <Field label="Date" error={errors.date} id={id("date")} className="sm:col-span-2">
          <Input {...a11y("date")} type="date" value={values.date} onChange={set("date")} />
        </Field>

        <Field label="Note (optional)" error={errors.note} id={id("note")} className="sm:col-span-6">
          <Input
            {...a11y("note")}
            value={values.note}
            onChange={set("note")}
            maxLength={LIMITS.noteMax}
            placeholder="Anything worth remembering"
            autoComplete="off"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={saving}>
          {editing ? <Save className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
          {saving ? "Saving..." : editing ? "Save changes" : "Add expense"}
        </Button>
        {editing && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
            <X className="h-4 w-4" aria-hidden="true" />
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
