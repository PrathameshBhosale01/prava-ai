import { EMERGENCY_COUNTRIES, REGIONS } from "./emergencyData.js";

export const ALL_REGIONS = "All";

/** Lowercase, strip accents and surrounding space: "Türkiye " -> "turkiye". */
export function fold(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const byName = (a, b) => a.name.localeCompare(b.name);

/** Higher = better match, 0 = no match. */
function scoreCountry(country, query) {
  const names = [country.name, ...country.aliases].map(fold);
  const code = fold(country.code);

  if (code === query || names.includes(query)) return 100;
  if (names.some((name) => name.startsWith(query))) return 60;
  if (names.some((name) => name.includes(query))) return 30;
  // Searching "112" finds every country that uses 112
  if (country.numbers.some((item) => fold(item.number).replace(/[\s-]/g, "") === query.replace(/[\s-]/g, ""))) return 10;
  return 0;
}

/**
 * Filter + rank countries by free-text query and region.
 * No query: everything in the region, A to Z. With a query: best match first.
 */
export function filterCountries(
  countries = EMERGENCY_COUNTRIES,
  { query = "", region = ALL_REGIONS } = {}
) {
  const inRegion =
    region === ALL_REGIONS ? countries : countries.filter((c) => c.region === region);
  const q = fold(query);

  if (!q) return [...inRegion].sort(byName);

  return inRegion
    .map((country) => ({ country, score: scoreCountry(country, q) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || byName(a.country, b.country))
    .map((entry) => entry.country);
}

/** Regions that actually have countries, in display order. */
export function availableRegions(countries = EMERGENCY_COUNTRIES) {
  return REGIONS.filter((region) => countries.some((c) => c.region === region));
}

/** "+61-2-6261-3305" -> "tel:+61226613305". Keeps only digits and a leading +. */
export function telHref(number) {
  const cleaned = String(number ?? "").replace(/[^\d+]/g, "");
  return `tel:${cleaned}`;
}
