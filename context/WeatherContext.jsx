"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

const STORAGE_KEY = "prava:weather";
const FRESH_MS = 30 * 60 * 1000; // after this, refresh quietly on next visit

const WeatherContext = createContext(null);

const GEO_ERRORS = {
  1: "Location access was denied. Allow it in your browser, or search by city.",
  2: "Your location is unavailable right now. Try searching by city.",
  3: "Finding your location timed out. Please try again.",
  default: "We couldn't get your location. Try searching by city.",
};

// ---- storage (every access guarded: it can throw in private mode) ----------

function readCache() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCache(entry) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    /* storage unavailable: weather still works, just isn't remembered */
  }
}

// ---- network ----------------------------------------------------------------

async function requestWeather(query) {
  const params = new URLSearchParams(
    query.type === "city"
      ? { city: query.city }
      : { lat: String(query.lat), lon: String(query.lon) }
  );

  const res = await fetch(`/api/weather/current?${params}`);
  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    const error = new Error(body.error || "Failed to fetch weather");
    error.status = res.status;
    throw error;
  }
  return body;
}

function getPosition() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject({ code: 0 });
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 10000,
      maximumAge: 300000,
    });
  });
}

const round2 = (n) => Number(n.toFixed(2));

// ---- provider ---------------------------------------------------------------

/**
 * Mount this only on the client after auth has resolved (DashboardShell
 * does). It reads localStorage during initial state, which would cause a
 * hydration mismatch if it were server-rendered.
 */
export function WeatherProvider({ children }) {
  const [cached] = useState(() =>
    typeof window === "undefined" ? null : readCache()
  );

  const [weather, setWeather] = useState(cached?.data ?? null);
  const [pending, setPending] = useState(0); // in-flight operations
  const queryRef = useRef(cached?.query ?? null); // last successful query
  const latestRequest = useRef(0);

  const load = useCallback(async (query) => {
    const id = ++latestRequest.current;
    setPending((n) => n + 1);

    try {
      const data = await requestWeather(query);
      if (id !== latestRequest.current) return false; // a newer request won

      queryRef.current = query;
      setWeather(data);
      writeCache({ data, query, savedAt: Date.now() });
      return true;
    } catch (error) {
      if (id === latestRequest.current) {
        toast.error(
          error.status === 404
            ? "We couldn't find that city. Check the spelling or try another."
            : "Couldn't load the weather. Please try again."
        );
      }
      return false;
    } finally {
      setPending((n) => n - 1);
    }
  }, []);

  const locate = useCallback(async () => {
    setPending((n) => n + 1); // covers the wait for the browser permission prompt
    let position;

    try {
      position = await getPosition();
    } catch (error) {
      toast.error(GEO_ERRORS[error?.code] ?? GEO_ERRORS.default);
      return false;
    } finally {
      setPending((n) => n - 1);
    }

    return load({
      type: "coords",
      lat: round2(position.coords.latitude),
      lon: round2(position.coords.longitude),
    });
  }, [load]);

  const searchCity = useCallback(
    async (city) => {
      const name = city.trim();
      if (!name) {
        toast.error("Enter a city name first.");
        return false;
      }
      return load({ type: "city", city: name });
    },
    [load]
  );

  // Re-run whatever the user last asked for; fall back to their location.
  const refresh = useCallback(
    () => (queryRef.current ? load(queryRef.current) : locate()),
    [load, locate]
  );

  // Saved data older than FRESH_MS is shown immediately, then updated quietly.
  // Failures are ignored (the saved data stays), and if the user has already
  // searched or located in the meantime, their request wins.
  useEffect(() => {
    if (!cached?.query || Date.now() - cached.savedAt <= FRESH_MS) return;

    let cancelled = false;
    requestWeather(cached.query)
      .then((data) => {
        if (cancelled || latestRequest.current !== 0) return;
        setWeather(data);
        writeCache({ data, query: cached.query, savedAt: Date.now() });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [cached]);

  const value = useMemo(
    () => ({
      weather,
      isLoading: pending > 0,
      locate,
      searchCity,
      refresh,
    }),
    [weather, pending, locate, searchCity, refresh]
  );

  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
}

export function useWeather() {
  const ctx = useContext(WeatherContext);
  if (!ctx) throw new Error("useWeather must be used inside <WeatherProvider>");
  return ctx;
}