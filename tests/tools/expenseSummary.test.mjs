import test from "node:test";
import assert from "node:assert/strict";

import {
  ALL,
  csvCell,
  expensesToCsv,
  filterExpenses,
  GENERAL,
  groupByDate,
  NO_TRIP,
  sortExpenses,
  summarize,
  totalsBy,
} from "../../lib/tools/expenseSummary.js";

const rates = { EUR: 1, USD: 1.2, INR: 120 };
let n = 0;
const exp = (over = {}) => ({
  id: `e${++n}`,
  title: "Item",
  amount: 100,
  currency: "INR",
  date: "2026-10-01",
  note: "",
  bucketId: null,
  tripId: null,
  createdAt: `2026-10-01T00:00:${String(n).padStart(2, "0")}Z`,
  ...over,
});

test("sortExpenses: newest date first, then newest created", () => {
  const a = exp({ date: "2026-10-01" });
  const b = exp({ date: "2026-10-03" });
  const c = exp({ date: "2026-10-03" });
  assert.deepEqual(sortExpenses([a, b, c]).map((e) => e.id), [c.id, b.id, a.id]);
});

test("filterExpenses by bucket, trip and text", () => {
  const food = exp({ title: "Pad Thai", bucketId: "food", tripId: "t1" });
  const taxi = exp({ title: "Taxi", note: "airport run", bucketId: "transit", tripId: "t1" });
  const misc = exp({ title: "Souvenir" });
  const all = [food, taxi, misc];

  assert.equal(filterExpenses(all).length, 3);
  assert.deepEqual(filterExpenses(all, { bucket: "food" }), [food]);
  assert.deepEqual(filterExpenses(all, { bucket: GENERAL }), [misc]);
  assert.deepEqual(filterExpenses(all, { trip: "t1" }), [food, taxi]);
  assert.deepEqual(filterExpenses(all, { trip: NO_TRIP }), [misc]);
  assert.deepEqual(filterExpenses(all, { query: "AIRPORT" }), [taxi]);
  assert.deepEqual(filterExpenses(all, { query: "thai", trip: "t1", bucket: "food" }), [food]);
  assert.deepEqual(filterExpenses(all, { bucket: ALL, trip: ALL, query: "  " }), all);
});

test("summarize converts everything into the display currency", () => {
  const list = [exp({ amount: 240, currency: "INR" }), exp({ amount: 3, currency: "USD" })];
  const s = summarize(list, "USD", rates); // 240 INR = 2.4 USD, plus 3 USD
  assert.ok(Math.abs(s.total - 5.4) < 1e-9);
  assert.equal(s.count, 2);
  assert.equal(s.missing, 0);
  assert.ok(Math.abs(s.average - 2.7) < 1e-9);
  assert.equal(s.largest.expense.currency, "USD");
});

test("summarize never adds an unconvertible expense at face value", () => {
  const list = [exp({ amount: 120, currency: "INR" }), exp({ amount: 999, currency: "JPY" })];
  const s = summarize(list, "EUR", rates);
  assert.equal(s.total, 1); // only the INR one
  assert.equal(s.missing, 1);
  assert.equal(s.count, 2);
  assert.equal(s.average, 1);

  const noRates = summarize(list, "EUR", null);
  assert.equal(noRates.total, 0);
  assert.equal(noRates.missing, 2);
  assert.equal(noRates.average, 0);
  assert.equal(noRates.largest, null);
});

test("same-currency totals work even without rates", () => {
  const s = summarize([exp({ amount: 10 }), exp({ amount: 5 })], "INR", null);
  assert.equal(s.total, 15);
  assert.equal(s.missing, 0);
});

test("totalsBy groups and orders biggest first", () => {
  const list = [
    exp({ amount: 100, bucketId: "food" }),
    exp({ amount: 500, bucketId: "stay" }),
    exp({ amount: 50, bucketId: "food" }),
    exp({ amount: 10 }),
  ];
  const groups = totalsBy(list, (e) => e.bucketId ?? GENERAL, "INR", rates);
  assert.deepEqual([...groups.keys()], ["stay", "food", GENERAL]);
  assert.equal(groups.get("food").total, 150);
  assert.equal(groups.get("food").count, 2);
});

test("csvCell quotes special characters and neutralises formulas", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell("a,b"), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell("line1\nline2"), '"line1\nline2"');
  assert.equal(csvCell("=HYPERLINK(\"http://x\")"), "\"'=HYPERLINK(\"\"http://x\"\")\"");
  assert.equal(csvCell("+1"), "'+1");
  assert.equal(csvCell("@cmd"), "'@cmd");
  assert.equal(csvCell(12.5), "12.5");
  assert.equal(csvCell(null), "");
});

test("expensesToCsv builds rows with labels and a converted column", () => {
  const list = [
    exp({ title: "Dinner, Bangkok", amount: 240, currency: "INR", date: "2026-10-02", bucketId: "food", tripId: "t1" }),
    exp({ title: "Taxi", amount: 3, currency: "USD", date: "2026-10-01" }),
  ];
  const csv = expensesToCsv(list, {
    bucketName: (id) => (id === "food" ? "Food" : "General"),
    tripName: (id) => (id === "t1" ? "Thailand" : id),
    currency: "USD",
    rates,
  });
  assert.deepEqual(csv.split("\r\n"), [
    "Date,Title,Bucket,Trip,Amount,Currency,Note,Amount (USD)",
    '2026-10-02,"Dinner, Bangkok",Food,Thailand,240,INR,,2.40',
    "2026-10-01,Taxi,General,,3,USD,,3.00",
  ]);
});

test("expensesToCsv without rates has no converted column", () => {
  const csv = expensesToCsv([exp({ title: "A" })]);
  assert.equal(csv.split("\r\n")[0], "Date,Title,Bucket,Trip,Amount,Currency,Note");
});

test("groupByDate keeps order and groups consecutive dates", () => {
  const a = exp({ date: "2026-10-03" });
  const b = exp({ date: "2026-10-03" });
  const c = exp({ date: "2026-10-01" });
  const groups = groupByDate([a, b, c]);
  assert.deepEqual(groups.map((g) => [g.date, g.items.length]), [["2026-10-03", 2], ["2026-10-01", 1]]);
  assert.deepEqual(groupByDate([]), []);
});
