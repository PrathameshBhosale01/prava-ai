import test from "node:test";
import assert from "node:assert/strict";

import {
  convertAmount,
  currencyDigits,
  exchangeRate,
  formatMoney,
  formatPlainAmount,
  formatRate,
  formatRateDate,
  parseAmount,
  parseRateRows,
} from "../../lib/tools/currency.js";

const row = (quote, rate, date = "2026-10-07", base = "EUR") => ({ date, base, quote, rate });

test("parseRateRows builds a rate table with EUR = 1", () => {
  const table = parseRateRows([row("USD", 1.17), row("INR", 105.5)], ["USD", "INR", "EUR"]);
  assert.deepEqual(table, {
    base: "EUR",
    date: "2026-10-07",
    rates: { USD: 1.17, INR: 105.5, EUR: 1 },
  });
});

test("parseRateRows keeps the newest row per currency", () => {
  const table = parseRateRows([
    row("USD", 1.1, "2026-10-05"),
    row("USD", 1.2, "2026-10-07"),
    row("USD", 1.15, "2026-10-06"),
    row("INR", 100, "2026-10-04"),
  ]);
  assert.equal(table.rates.USD, 1.2);
  assert.equal(table.rates.INR, 100);
  assert.equal(table.date, "2026-10-07"); // newest date overall
});

test("parseRateRows filters to wanted currencies and skips bad rows", () => {
  const table = parseRateRows(
    [
      row("USD", 1.17),
      row("XAU", 0.00026), // not wanted
      row("JPY", 0), // zero rate
      row("GBP", -1), // negative
      row("AUD", "1.7"), // string, not a number
      row("CAD", 1.6, "2026-10-07", "USD"), // wrong base
      null,
      { rate: 2 }, // no quote
    ],
    ["USD", "JPY", "GBP", "AUD", "CAD"]
  );
  assert.deepEqual(Object.keys(table.rates).sort(), ["EUR", "USD"]);
});

test("parseRateRows throws on garbage or empty tables", () => {
  assert.throws(() => parseRateRows({ error: "nope" }), /Unexpected/);
  assert.throws(() => parseRateRows([]), /No exchange rates/);
  assert.throws(() => parseRateRows([row("ZZZ", 1)], ["USD"]), /No exchange rates/);
});

test("convertAmount crosses through EUR", () => {
  const rates = { EUR: 1, USD: 1.2, INR: 108 };
  assert.equal(convertAmount(120, "USD", "EUR", rates), 100);
  assert.equal(convertAmount(1, "EUR", "INR", rates), 108);
  assert.ok(Math.abs(convertAmount(12, "USD", "INR", rates) - 1080) < 1e-9);
  assert.equal(convertAmount(50, "INR", "INR", rates), 50);
  assert.equal(convertAmount(50, "INR", "INR", {}), 50); // same currency needs no rates
});

test("convertAmount returns null instead of a wrong number", () => {
  const rates = { EUR: 1, USD: 1.2 };
  assert.equal(convertAmount(10, "USD", "XYZ", rates), null);
  assert.equal(convertAmount(10, "USD", "INR", undefined), null);
  assert.equal(convertAmount(NaN, "USD", "EUR", rates), null);
});

test("exchangeRate is the conversion of one unit", () => {
  assert.equal(exchangeRate("EUR", "USD", { EUR: 1, USD: 1.2 }), 1.2);
});

test("parseAmount accepts typical input", () => {
  assert.deepEqual(parseAmount("1250.5"), { value: 1250.5, error: null });
  assert.deepEqual(parseAmount(" 1,250.50 "), { value: 1250.5, error: null });
  assert.deepEqual(parseAmount(".5"), { value: 0.5, error: null });
  assert.deepEqual(parseAmount("12."), { value: 12, error: null });
  assert.deepEqual(parseAmount("0"), { value: 0, error: null });
});

test("parseAmount: empty is neutral, junk is an error", () => {
  assert.deepEqual(parseAmount(""), { value: null, error: null });
  assert.deepEqual(parseAmount("   "), { value: null, error: null });
  assert.deepEqual(parseAmount(null), { value: null, error: null });

  for (const bad of ["abc", "-5", "1.2.3", ".", "1e5", "12abc"]) {
    const result = parseAmount(bad);
    assert.equal(result.value, null, bad);
    assert.match(result.error, /number/i, bad);
  }
  assert.match(parseAmount("9".repeat(20)).error, /too large/);
});

test("formatMoney uses the right symbol and decimals", () => {
  assert.equal(formatMoney(1250.5, "USD", "en-US"), "$1,250.50");
  assert.equal(formatMoney(1250, "JPY", "en-US"), "¥1,250");
  assert.equal(formatMoney(1250.5, "INR", "en-IN"), "₹1,250.50");
  assert.equal(formatMoney(NaN, "USD", "en-US"), "—");
});

test("formatMoney shows the code for unknown or malformed currencies", () => {
  // Well-formed but unknown codes are formatted by Intl itself (code + nbsp)
  assert.match(formatMoney(5, "ZZZ", "en-US"), /^ZZZ\s5\.00$/);
  // Malformed codes make Intl throw, so we use our own fallback
  assert.equal(formatMoney(5, "NOPE", "en-US"), "NOPE 5.00");
});

test("currencyDigits", () => {
  assert.equal(currencyDigits("USD", "en-US"), 2);
  assert.equal(currencyDigits("JPY", "en-US"), 0);
  assert.equal(currencyDigits("NOPE", "en-US"), 2);
});

test("formatPlainAmount groups, rounds, and keeps small values readable", () => {
  assert.equal(formatPlainAmount(1234.5, "USD", "en-US"), "1,234.50");
  assert.equal(formatPlainAmount(1234.4, "JPY", "en-US"), "1,234");
  assert.equal(formatPlainAmount(1.676, "JPY", "en-US"), "1.68"); // small yen amounts keep decimals
  assert.equal(formatPlainAmount(50, "JPY", "en-US"), "50");
  assert.equal(formatPlainAmount(0.0034567, "INR", "en-US"), "0.003457");
  assert.equal(formatPlainAmount(0, "USD", "en-US"), "0.00");
  assert.equal(formatPlainAmount(NaN, "USD", "en-US"), "");
});

test("formatRate adapts precision to magnitude", () => {
  assert.equal(formatRate(1496.256, "en-US"), "1,496.26");
  assert.equal(formatRate(108.11654, "en-US"), "108.1165");
  assert.equal(formatRate(1.1, "en-US"), "1.1");
  assert.equal(formatRate(0.009212345, "en-US"), "0.009212");
  assert.equal(formatRate(undefined, "en-US"), "—");
});

test("formatRateDate", () => {
  assert.equal(formatRateDate("2026-10-07", "en-GB"), "7 Oct 2026");
  assert.equal(formatRateDate("garbage", "en-GB"), "");
  assert.equal(formatRateDate(null, "en-GB"), "");
});
