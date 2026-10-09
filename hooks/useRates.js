"use client";

import { useCallback, useEffect, useState } from "react";

const TTL_MS = 30 * 60 * 1000;
const ERROR_MESSAGE = "Couldn't load exchange rates.";

// Module-level cache: the converter and the expense tracker share one request.
let cache = null; // { data, at }
let inflight = null;

async function loadRates({ force = false } = {}) {
  if (!force && cache && Date.now() - cache.at < TTL_MS) return cache.data;
  if (inflight) return inflight;

  inflight = fetch("/api/currency/rates")
    .then(async (response) => {
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.rates) throw new Error(data?.error || ERROR_MESSAGE);
      cache = { data, at: Date.now() };
      return data;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

/**
 * Live exchange rates.
 * Returns { status: "loading" | "ready" | "error", rates, date, error, refreshing, refresh }.
 * After a failed refresh we keep showing the last good rates.
 */
export function useRates() {
  const [state, setState] = useState(() =>
    cache
      ? { status: "ready", data: cache.data, error: null, refreshing: false }
      : { status: "loading", data: null, error: null, refreshing: false }
  );

  useEffect(() => {
    let cancelled = false;

    loadRates().then(
      (data) => {
        if (!cancelled) setState({ status: "ready", data, error: null, refreshing: false });
      },
      (error) => {
        if (!cancelled) {
          setState({ status: "error", data: null, error: error.message, refreshing: false });
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, []);

  const refresh = useCallback(() => {
    setState((current) => ({
      ...current,
      status: current.data ? "ready" : "loading",
      refreshing: true,
    }));

    loadRates({ force: true }).then(
      (data) => setState({ status: "ready", data, error: null, refreshing: false }),
      (error) =>
        setState((current) => ({
          status: current.data ? "ready" : "error",
          data: current.data,
          error: error.message,
          refreshing: false,
        }))
    );
  }, []);

  return {
    status: state.status,
    rates: state.data?.rates ?? null,
    date: state.data?.date ?? null,
    error: state.error,
    refreshing: state.refreshing,
    refresh,
  };
}
