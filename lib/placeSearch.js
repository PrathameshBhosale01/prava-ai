// Place autocomplete for the route builder: "goa" → [{ place: "Goa, India", detail: "Goa, India", ... }].
// Uses the same free Open-Meteo geocoder as weather/currency, so no new key or service.
// normalizePlaceResults is pure (unit-tested); searchPlaces only adds the network call.

const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

export const MIN_QUERY_CHARS = 2;
export const MAX_QUERY_CHARS = 80;

const text = (value, max) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

/**
 * Turns the geocoder's JSON into a short, de-duplicated list the UI can show.
 * `place` is what gets saved on the stop ("Goa, India": same style the app already uses, so
 * weather and currency lookups keep working). `detail` is the grey line under the name that
 * tells two "Paris" apart.
 */
export function normalizePlaceResults(data, limit = 6) {
  const results = Array.isArray(data?.results) ? data.results : [];
  const seen = new Set();
  const out = [];

  for (const r of results) {
    const name = text(r?.name, 80);
    const lat = r?.latitude;
    const lon = r?.longitude;
    if (!name || typeof lat !== "number" || typeof lon !== "number" || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;

    const country = text(r?.country, 60);
    const admin1 = text(r?.admin1, 60);
    const code = typeof r?.country_code === "string" ? r.country_code.trim().toUpperCase() : "";

    const key = `${name}|${admin1}|${country}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    out.push({
      id: String(r?.id ?? key),
      name,
      place: country ? `${name}, ${country}` : name,
      detail: [admin1 && admin1.toLowerCase() !== name.toLowerCase() ? admin1 : "", country].filter(Boolean).join(", "),
      country,
      countryCode: /^[A-Z]{2}$/.test(code) ? code : "",
      lat,
      lon,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** Looks places up. Returns [] for queries that are too short; throws if the geocoder fails. */
export async function searchPlaces(query, { fetchImpl = fetch, signal } = {}) {
  const q = text(query, MAX_QUERY_CHARS);
  if (q.length < MIN_QUERY_CHARS) return [];

  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", q);
  url.searchParams.set("count", "8");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const res = await fetchImpl(url, { signal });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  return normalizePlaceResults(await res.json());
}
