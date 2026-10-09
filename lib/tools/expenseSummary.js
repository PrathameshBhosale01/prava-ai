import { convertAmount } from "./currency.js";

// Pure helpers that turn a list of expenses into what the tracker shows.
// Nothing here guesses: an expense we can't convert is counted in `missing`
// and left out of totals, instead of being added at its face value.

export const ALL = "all";
export const GENERAL = "general"; // filter value for expenses without a bucket
export const NO_TRIP = "none"; // filter value for expenses not linked to a trip

const byNewest = (a, b) =>
  b.date.localeCompare(a.date) || String(b.createdAt).localeCompare(String(a.createdAt));

export const sortExpenses = (expenses) => [...expenses].sort(byNewest);

/** Filter by bucket, trip and free text (title or note). */
export function filterExpenses(expenses, { bucket = ALL, trip = ALL, query = "" } = {}) {
  const q = query.trim().toLowerCase();

  return expenses.filter((expense) => {
    if (bucket === GENERAL && expense.bucketId) return false;
    if (bucket !== ALL && bucket !== GENERAL && expense.bucketId !== bucket) return false;

    if (trip === NO_TRIP && expense.tripId) return false;
    if (trip !== ALL && trip !== NO_TRIP && expense.tripId !== trip) return false;

    if (q && !`${expense.title} ${expense.note ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

/** Group an already-sorted list by date: [{ date, items }], keeping order. */
export function groupByDate(expenses) {
  const groups = [];
  for (const expense of expenses) {
    const last = groups.at(-1);
    if (last && last.date === expense.date) last.items.push(expense);
    else groups.push({ date: expense.date, items: [expense] });
  }
  return groups;
}

function totalOf(expenses, currency, rates) {
  let total = 0;
  let missing = 0;
  let largest = null;

  for (const expense of expenses) {
    const value = convertAmount(expense.amount, expense.currency, currency, rates);
    if (value === null) {
      missing += 1;
      continue;
    }
    total += value;
    if (!largest || value > largest.value) largest = { expense, value };
  }

  const counted = expenses.length - missing;
  return { total, count: expenses.length, missing, average: counted ? total / counted : 0, largest };
}

/** Total, count, average and biggest expense in `currency`. */
export const summarize = (expenses, currency, rates) => totalOf(expenses, currency, rates);

/** Totals grouped by any key, e.g. (e) => e.bucketId ?? GENERAL. Returns a Map, biggest first. */
export function totalsBy(expenses, keyOf, currency, rates) {
  const groups = new Map();
  for (const expense of expenses) {
    const key = keyOf(expense);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(expense);
  }

  return new Map(
    [...groups.entries()]
      .map(([key, list]) => [key, totalOf(list, currency, rates)])
      .sort((a, b) => b[1].total - a[1].total)
  );
}

// ---------------------------------------------------------------- CSV

const FORMULA_START = /^[=+\-@\t\r]/;

/** Quote a CSV cell and neutralise spreadsheet formulas ("=HYPERLINK(...)"). */
export function csvCell(value) {
  let text = String(value ?? "");
  if (FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * CSV for the given expenses. `bucketName(id)` and `tripName(id)` resolve labels.
 * Adds a converted column when `currency` and `rates` are provided.
 */
export function expensesToCsv(expenses, { bucketName, tripName, currency, rates } = {}) {
  const withConverted = Boolean(currency && rates);
  const header = ["Date", "Title", "Bucket", "Trip", "Amount", "Currency", "Note"];
  if (withConverted) header.push(`Amount (${currency})`);

  const rows = sortExpenses(expenses).map((expense) => {
    const row = [
      expense.date,
      expense.title,
      bucketName ? bucketName(expense.bucketId) : expense.bucketId ?? "General",
      expense.tripId ? (tripName ? tripName(expense.tripId) : expense.tripId) : "",
      expense.amount,
      expense.currency,
      expense.note ?? "",
    ];
    if (withConverted) {
      const value = convertAmount(expense.amount, expense.currency, currency, rates);
      row.push(value === null ? "" : value.toFixed(2));
    }
    return row;
  });

  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
