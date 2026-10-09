// Pure currency helpers (no React, no network) shared by the converter, the
// expense tracker and the rates API. Relative imports only, so node can test it.

export const BASE_CURRENCY = "EUR";
export const MAX_AMOUNT = 1e12;

/**
 * Turn Frankfurter's flat rows ([{ date, base, quote, rate }, ...]) into
 * { base, date, rates: { USD: 1.17, ... } } with EUR = 1.
 *
 * Rows can carry different dates per currency (and range queries return many
 * days), so for each currency we keep the NEWEST row. `date` is the newest
 * date seen. Bad rows are skipped; an empty result throws.
 */
export function parseRateRows(rows, wanted, base = BASE_CURRENCY) {
  if (!Array.isArray(rows)) throw new Error("Unexpected rates response");

  const allow = wanted ? new Set(wanted) : null;
  const latest = new Map(); // quote -> { date, rate }

  for (const row of rows) {
    const quote = row?.quote;
    const rate = row?.rate;
    if (typeof quote !== "string" || !Number.isFinite(rate) || rate <= 0) continue;
    if (row.base && row.base !== base) continue;
    if (allow && !allow.has(quote)) continue;

    const date = typeof row.date === "string" ? row.date : "";
    const previous = latest.get(quote);
    // ISO dates (YYYY-MM-DD) compare correctly as plain strings
    if (!previous || date > previous.date) latest.set(quote, { date, rate });
  }

  const rates = {};
  let newest = "";
  for (const [quote, { date, rate }] of latest) {
    rates[quote] = rate;
    if (date > newest) newest = date;
  }
  rates[base] = 1;

  if (Object.keys(rates).length < 2) throw new Error("No exchange rates returned");

  return { base, date: newest || null, rates };
}

/** amount in `from` -> amount in `to`, or null when we have no rate for one side. */
export function convertAmount(amount, from, to, rates) {
  if (!Number.isFinite(amount)) return null;
  if (from === to) return amount;

  const fromRate = rates?.[from];
  const toRate = rates?.[to];
  if (!(fromRate > 0) || !(toRate > 0)) return null;

  return (amount / fromRate) * toRate;
}

/** How many `to` you get for one `from`. */
export const exchangeRate = (from, to, rates) => convertAmount(1, from, to, rates);

/**
 * Parse what a person typed into an amount field.
 * Commas and spaces are ignored ("1,250.50"); use a dot for decimals.
 * Empty input is neutral (no value, no error); bad input gives an error message.
 */
export function parseAmount(input) {
  const cleaned = String(input ?? "").replace(/[,\s]/g, "");
  if (cleaned === "") return { value: null, error: null };

  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === ".") {
    return { value: null, error: "Enter a number, like 1250.50" };
  }

  const value = Number(cleaned);
  if (!Number.isFinite(value) || value > MAX_AMOUNT) {
    return { value: null, error: "That number is too large" };
  }

  return { value, error: null };
}

const moneyFormatters = new Map();

/** "₹1,250.50", "¥1,250", "$1.17". Falls back to "XYZ 1.17" for unknown codes. */
export function formatMoney(amount, currency, locale) {
  if (!Number.isFinite(amount)) return "—";

  const key = `${locale ?? ""}|${currency}`;
  let entry = moneyFormatters.get(key);

  if (!entry) {
    try {
      entry = { format: new Intl.NumberFormat(locale, { style: "currency", currency }), prefix: "" };
    } catch {
      entry = {
        format: new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        prefix: `${currency} `,
      };
    }
    moneyFormatters.set(key, entry);
  }

  return entry.prefix + entry.format.format(amount);
}

/** Number of decimal places a currency normally uses (JPY 0, USD 2). */
export function currencyDigits(currency, locale) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits;
  } catch {
    return 2;
  }
}

/**
 * A plain number for an input field: grouped, currency-appropriate decimals,
 * but small values keep significant digits so 1 VND in INR isn't "0.00".
 */
export function formatPlainAmount(amount, currency, locale) {
  if (!Number.isFinite(amount)) return "";

  if (amount !== 0 && Math.abs(amount) < 1) {
    return new Intl.NumberFormat(locale, { maximumSignificantDigits: 4 }).format(amount);
  }

  const digits = currencyDigits(currency, locale);

  // Whole-unit currencies (JPY, KRW...) would turn 1.68 into "2": keep decimals for small amounts.
  if (digits === 0 && Math.abs(amount) < 100) {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

/** "108.12", "0.009212", "1,496.25": enough precision to be useful, no noise. */
export function formatRate(rate, locale) {
  if (!Number.isFinite(rate)) return "—";

  if (rate >= 1000) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(rate);
  }
  if (rate >= 1) {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 4 }).format(rate);
  }
  return new Intl.NumberFormat(locale, { maximumSignificantDigits: 4 }).format(rate);
}

/** "2026-10-07" -> "7 Oct 2026" (UTC, so the day never shifts with the viewer's timezone). */
export function formatRateDate(isoDate, locale) {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return "";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}
