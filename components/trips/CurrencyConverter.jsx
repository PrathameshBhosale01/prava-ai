"use client";

import { useEffect, useState } from "react";

import { CURRENCIES } from "@/lib/currencyOptions";

function money(amount, currency) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount < 100 ? 2 : 0,
  }).format(amount);
}

function formatRate(rate) {
  return rate >= 1 ? rate.toFixed(2) : rate.toPrecision(3);
}

export default function CurrencyConverter({
  destination,
  from,
  amount,
  travelers,
  duration,
}) {
  // null = "let the server suggest a currency for this destination"
  const [target, setTarget] = useState(null);
  const [state, setState] = useState({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        setState({ status: "loading" });

        const params = new URLSearchParams({ from, destination });
        if (target) params.set("to", target);

        const res = await fetch(`/api/currency?${params}`, {
          signal: controller.signal,
        });

        const data = await res.json().catch(() => null);

        if (!res.ok || !data) {
          throw new Error(data?.error || "Could not load exchange rate");
        }

        setState({ status: "done", data });
      } catch (err) {
        if (err.name === "AbortError") return;
        setState({ status: "error" });
      }
    }

    load();

    return () => controller.abort();
  }, [from, destination, target]);

  const { status, data } = state;
  const selected = target ?? data?.to ?? "";

  const converted = data ? Number(amount) * data.rate : 0;
  const people = Number(travelers);
  const days = Number(duration);
  const perPersonPerDay =
    people > 0 && days > 0 ? converted / people / days : null;

  return (
    <div className="rounded-xl border bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Budget Converter</h2>

        <select
          value={selected}
          onChange={(e) => setTarget(e.target.value)}
          disabled={!selected}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          {/* If the server picked something outside our list, still show it */}
          {selected && !CURRENCIES.some((c) => c.code === selected) && (
            <option value={selected}>{selected}</option>
          )}

          {CURRENCIES.filter((c) => c.code !== from).map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} - {c.name}
            </option>
          ))}
        </select>
      </div>

      {status === "loading" && (
        <p className="mt-4 text-sm text-gray-500">Loading exchange rate...</p>
      )}

      {status === "error" && (
        <p className="mt-4 text-sm text-gray-500">
          Couldn't load the exchange rate right now.
        </p>
      )}

      {status === "done" && (
        <>
          <p className="mt-4 text-2xl font-semibold">
            {money(Number(amount), from)}{" "}
            <span className="text-gray-400">≈</span>{" "}
            {money(converted, data.to)}
          </p>

          {perPersonPerDay && (
            <p className="mt-2 text-sm text-gray-600">
              About {money(perPersonPerDay, data.to)} per person per day
            </p>
          )}

          <p className="mt-3 text-xs text-gray-400">
            1 {from} = {formatRate(data.rate)} {data.to} · reference rate, your
            bank or money changer will be worse · Rates by Frankfurter
          </p>
        </>
      )}
    </div>
  );
}