"use client";

import { useId, useMemo, useState } from "react";
import { ArrowLeftRight, RefreshCw, WifiOff } from "lucide-react";

import Button from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import CopyButton from "@/components/ui/CopyButton";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Skeleton from "@/components/ui/Skeleton";
import { useRates } from "@/hooks/useRates";
import { useStoredState } from "@/hooks/useStoredState";
import { CURRENCIES } from "@/lib/currencyOptions";
import {
  convertAmount,
  exchangeRate,
  formatPlainAmount,
  formatRate,
  formatRateDate,
  parseAmount,
} from "@/lib/tools/currency";
import { cn } from "@/lib/utils";

const DEFAULT_PAIR = { from: "INR", to: "USD" };
const QUICK_AMOUNTS = ["1", "10", "100", "1000"];
const CODES = new Set(CURRENCIES.map((currency) => currency.code));
const NAMES = Object.fromEntries(CURRENCIES.map((currency) => [currency.code, currency.name]));

function CurrencyField({ id, label, text, onTextChange, currency, onCurrencyChange, options, invalid, errorId }) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium text-muted-foreground">
        {label}
      </label>
      <Input
        id={id}
        value={text}
        onChange={(event) => onTextChange(event.target.value)}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0.00"
        aria-invalid={invalid || undefined}
        aria-describedby={invalid ? errorId : undefined}
        className="h-12 text-lg font-semibold tabular-nums"
      />
      <Select
        aria-label={`${label} currency`}
        value={currency}
        onChange={(event) => onCurrencyChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.code} · {option.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

function RatesError({ message, onRetry, retrying }) {
  return (
    <Card>
      <EmptyState
        icon={WifiOff}
        title="Exchange rates unavailable"
        description={`${message} Check your connection and try again.`}
        action={
          <Button onClick={onRetry} disabled={retrying}>
            <RefreshCw className={cn("h-4 w-4", retrying && "animate-spin")} aria-hidden="true" />
            Try again
          </Button>
        }
      />
    </Card>
  );
}

export default function CurrencyConverter() {
  const baseId = useId();
  const { status, rates, date, error, refreshing, refresh } = useRates();
  const [storedPair, setStoredPair] = useStoredState("prava.tools.converter", DEFAULT_PAIR);
  const [edit, setEdit] = useState({ side: "from", text: "1" });

  // Never trust storage: fall back if a code is no longer supported.
  const pair = {
    from: CODES.has(storedPair?.from) ? storedPair.from : DEFAULT_PAIR.from,
    to: CODES.has(storedPair?.to) ? storedPair.to : DEFAULT_PAIR.to,
  };

  // Hide currencies the rates provider doesn't carry once rates are known.
  const options = useMemo(
    () => (rates ? CURRENCIES.filter((currency) => rates[currency.code]) : CURRENCIES),
    [rates]
  );

  const ready = status === "ready" && rates;
  const typed = parseAmount(edit.text);
  const typedCurrency = edit.side === "from" ? pair.from : pair.to;
  const otherCurrency = edit.side === "from" ? pair.to : pair.from;

  const converted =
    ready && typed.value !== null
      ? convertAmount(typed.value, typedCurrency, otherCurrency, rates)
      : null;
  const otherText = converted === null ? "" : formatPlainAmount(converted, otherCurrency);

  const fromText = edit.side === "from" ? edit.text : otherText;
  const toText = edit.side === "to" ? edit.text : otherText;
  const fromAmount = edit.side === "from" ? typed.value : converted;
  const toAmount = edit.side === "from" ? converted : typed.value;

  const rateForward = ready ? exchangeRate(pair.from, pair.to, rates) : null;
  const rateBackward = ready ? exchangeRate(pair.to, pair.from, rates) : null;
  const rateMissing = ready && rateForward === null;

  function setPair(next) {
    setStoredPair({ ...pair, ...next });
  }

  // Picking the currency that's already on the other side swaps them.
  function changeFrom(code) {
    setPair(code === pair.to ? { from: code, to: pair.from } : { from: code });
  }
  function changeTo(code) {
    setPair(code === pair.from ? { to: code, from: pair.to } : { to: code });
  }
  function swap() {
    setPair({ from: pair.to, to: pair.from });
    setEdit({ side: "from", text: edit.text });
  }

  const summary =
    fromAmount !== null && toAmount !== null
      ? `${formatPlainAmount(fromAmount, pair.from)} ${pair.from} equals ${formatPlainAmount(toAmount, pair.to)} ${pair.to}`
      : "";

  // "Other currencies" tiles show the same amount (in the From currency) everywhere.
  const tiles = ready && fromAmount !== null
    ? options
        .filter((currency) => currency.code !== pair.from)
        .map((currency) => ({
          ...currency,
          value: convertAmount(fromAmount, pair.from, currency.code, rates),
        }))
        .filter((tile) => tile.value !== null)
    : [];

  if (status === "error") {
    return <RatesError message={error} onRetry={refresh} retrying={refreshing} />;
  }

  return (
    <div className="space-y-5">
      <Card className="space-y-5 p-4 sm:p-6">
        <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <CurrencyField
            id={`${baseId}-from`}
            label="From"
            text={fromText}
            onTextChange={(text) => setEdit({ side: "from", text })}
            currency={pair.from}
            onCurrencyChange={changeFrom}
            options={options}
            invalid={edit.side === "from" && !!typed.error}
            errorId={`${baseId}-error`}
          />

          <Button
            variant="outline"
            size="icon"
            onClick={swap}
            aria-label="Swap currencies"
            title="Swap currencies"
            className="mx-auto rounded-full sm:mt-7"
          >
            <ArrowLeftRight className="h-4 w-4 rotate-90 sm:rotate-0" aria-hidden="true" />
          </Button>

          <CurrencyField
            id={`${baseId}-to`}
            label="To"
            text={toText}
            onTextChange={(text) => setEdit({ side: "to", text })}
            currency={pair.to}
            onCurrencyChange={changeTo}
            options={options}
            invalid={edit.side === "to" && !!typed.error}
            errorId={`${baseId}-error`}
          />
        </div>

        {typed.error && (
          <p id={`${baseId}-error`} role="alert" className="text-sm text-danger">
            {typed.error}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick amounts">
          <span className="text-xs text-muted-foreground">Quick amounts</span>
          {QUICK_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setEdit({ side: "from", text: amount })}
              className="cursor-pointer rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium tabular-nums text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {Number(amount).toLocaleString()}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-muted px-4 py-3">
          {status === "loading" ? (
            <Skeleton className="h-5 w-56" />
          ) : rateMissing ? (
            <p className="text-sm text-warning">
              No rate available for {pair.from} to {pair.to}.
            </p>
          ) : (
            <div className="text-sm">
              <p className="font-medium text-foreground tabular-nums">
                1 {pair.from} = {formatRate(rateForward)} {pair.to}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                1 {pair.to} = {formatRate(rateBackward)} {pair.from}
              </p>
            </div>
          )}

          <div className="flex items-center gap-1">
            {summary && <CopyButton value={toText} label={`${pair.to} amount`} />}
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={refreshing}
              aria-label="Refresh exchange rates"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} aria-hidden="true" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          {summary}
        </p>
      </Card>

      <section aria-labelledby={`${baseId}-others`} className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id={`${baseId}-others`} className="text-base font-semibold text-foreground">
            {fromAmount !== null
              ? `${formatPlainAmount(fromAmount, pair.from)} ${pair.from} in other currencies`
              : "In other currencies"}
          </h2>
          {date && (
            <p className="text-xs text-muted-foreground">Rates as of {formatRateDate(date)}</p>
          )}
        </div>

        {status === "loading" ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, index) => (
              <li key={index}>
                <Skeleton className="h-[72px] w-full" />
              </li>
            ))}
          </ul>
        ) : tiles.length === 0 ? (
          <Card className="px-4 py-6 text-center text-sm text-muted-foreground">
            Enter an amount to see it in other currencies.
          </Card>
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {tiles.map((tile) => {
              const active = tile.code === pair.to;
              return (
                <li key={tile.code}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => changeTo(tile.code)}
                    title={`Convert to ${tile.name}`}
                    className={cn(
                      "w-full cursor-pointer rounded-xl border p-3 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                      active
                        ? "border-primary bg-primary-soft"
                        : "border-border bg-surface hover:bg-surface-muted"
                    )}
                  >
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-semibold text-foreground">{tile.code}</span>
                      <span className="truncate text-sm font-medium tabular-nums text-foreground">
                        {formatPlainAmount(tile.value, tile.code)}
                      </span>
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {NAMES[tile.code]}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Mid-market reference rates. Banks and exchange counters add their own margin.
      </p>
    </div>
  );
}
