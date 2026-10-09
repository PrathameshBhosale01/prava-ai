import { BASE_CURRENCY, parseRateRows } from "./tools/currency.js";

const FRANKFURTER_URL = "https://api.frankfurter.dev/v2/rate";
const FRANKFURTER_RATES_URL = "https://api.frankfurter.dev/v2/rates";

// ISO country code → currency (only currencies in our dropdown)
const COUNTRY_CURRENCY = {
  IN: "INR", US: "USD", GB: "GBP", JP: "JPY", AU: "AUD", CA: "CAD",
  SG: "SGD", AE: "AED", TH: "THB", ID: "IDR", MY: "MYR", CH: "CHF",
  CN: "CNY", KR: "KRW", NZ: "NZD", TR: "TRY", ZA: "ZAR", MX: "MXN",
  BR: "BRL", PH: "PHP", HK: "HKD", VN: "VND",
  LK: "LKR", NP: "NPR", SA: "SAR", QA: "QAR", EG: "EGP", SE: "SEK",
  NO: "NOK", DK: "DKK", PL: "PLN", CZ: "CZK", TW: "TWD",
  // Eurozone
  FR: "EUR", DE: "EUR", IT: "EUR", ES: "EUR", PT: "EUR", NL: "EUR",
  BE: "EUR", AT: "EUR", GR: "EUR", IE: "EUR", FI: "EUR", HR: "EUR",
  SK: "EUR", SI: "EUR", LT: "EUR", LV: "EUR", EE: "EUR", LU: "EUR",
  MT: "EUR", CY: "EUR",
};

// Used when we can't tell the destination's currency
export function fallbackCurrency(from) {
  return from === "USD" ? "EUR" : "USD";
}

export function suggestCurrency(countryCode, from) {
  const currency = COUNTRY_CURRENCY[countryCode];

  // Unknown country, or a domestic trip (INR → INR is pointless)
  if (!currency || currency === from) return fallbackCurrency(from);

  return currency;
}

export async function fetchRate(from, to) {
  if (from === to) return 1;

  const res = await fetch(
    `${FRANKFURTER_URL}/${from.toLowerCase()}/${to.toLowerCase()}`
  );

  if (!res.ok) {
    const error = new Error(`Rate lookup failed (${res.status})`);
    error.status = res.status;
    throw error;
  }

  const data = await res.json();

  if (typeof data.rate !== "number") {
    throw new Error("Unexpected rate response");
  }

  return data.rate;
}

/**
 * One EUR-based table of rates for the given currency codes, for the
 * converter and expense totals. We ask for every currency and keep the ones we
 * want, so a code the provider doesn't carry is simply missing instead of
 * failing the whole request.
 */
export async function fetchRateTable(codes) {
  const res = await fetch(`${FRANKFURTER_RATES_URL}?base=${BASE_CURRENCY}`);

  if (!res.ok) {
    const error = new Error(`Rate table lookup failed (${res.status})`);
    error.status = res.status;
    throw error;
  }

  return parseRateRows(await res.json(), codes);
}
