const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";
const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

// ---------------------------------------------
// Date helpers (YYYY-MM-DD strings compare
// correctly with < and >)
// ---------------------------------------------

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateStr, n) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------
// WMO weather codes → label + emoji
// ---------------------------------------------

const WEATHER_CODES = {
  0: ["Clear sky", "☀️"],
  1: ["Mostly clear", "🌤️"],
  2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"],
  48: ["Rime fog", "🌫️"],
  51: ["Light drizzle", "🌦️"],
  53: ["Drizzle", "🌦️"],
  55: ["Heavy drizzle", "🌧️"],
  56: ["Freezing drizzle", "🌧️"],
  57: ["Freezing drizzle", "🌧️"],
  61: ["Light rain", "🌦️"],
  63: ["Rain", "🌧️"],
  65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"],
  67: ["Freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"],
  73: ["Snow", "🌨️"],
  75: ["Heavy snow", "❄️"],
  77: ["Snow grains", "❄️"],
  80: ["Light showers", "🌦️"],
  81: ["Showers", "🌧️"],
  82: ["Violent showers", "⛈️"],
  85: ["Snow showers", "🌨️"],
  86: ["Heavy snow showers", "❄️"],
  95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm, hail", "⛈️"],
  99: ["Thunderstorm, hail", "⛈️"],
};

function describeWeather(code) {
  const [label, emoji] = WEATHER_CODES[code] || ["Unknown", "🌡️"];
  return { label, emoji };
}

const round = (v) => (v == null ? null : Math.round(v));

// ---------------------------------------------
// Geocoding: "Goa, India" → coordinates
// ---------------------------------------------

export async function geocodeDestination(destination) {
  const [name, ...rest] = destination
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (!name) return null;

  const hint = rest.join(" ").toLowerCase();

  const url = new URL(GEOCODING_URL);
  url.searchParams.set("name", name);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed (${res.status})`);

  const data = await res.json();
  const results = data.results || [];
  if (results.length === 0) return null;

  // If the user typed "Paris, France", prefer the result
  // whose country or region matches the part after the comma.
  const match = hint
    ? results.find((r) =>
        [r.country, r.admin1].filter(Boolean).some((v) => hint.includes(v.toLowerCase()))
      )
    : null;

  const best = match || results[0];

  return {
    name: best.name,
    country: best.country,
    countryCode: best.country_code, // ← add this
    latitude: best.latitude,
    longitude: best.longitude,
  };
}

// ---------------------------------------------
// Forecast for a date range
// ---------------------------------------------

export async function fetchForecast({ latitude, longitude, startDate, endDate }) {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
  );
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("start_date", startDate);
  url.searchParams.set("end_date", endDate);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Forecast failed (${res.status})`);

  const { daily } = await res.json();

  return daily.time.map((date, i) => ({
    date,
    max: round(daily.temperature_2m_max[i]),
    min: round(daily.temperature_2m_min[i]),
    rainChance: daily.precipitation_probability_max?.[i] ?? null,
    ...describeWeather(daily.weather_code[i]),
  }));
}

// ---------------------------------------------
// Dashboard: current conditions + next 3 days
// ---------------------------------------------

const REVERSE_GEOCODE_URL = "https://api.bigdatacloud.net/data/reverse-geocode-client";

/** Parse a query-string number and range-check it. Returns null if invalid. */
export function parseCoordinate(value, min, max) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

/**
 * Coordinates → place name ("Panvel", "India").
 * Open-Meteo has no reverse geocoding, so this uses BigDataCloud's free
 * endpoint. It's best-effort: any failure returns null and the caller
 * falls back to a generic label.
 */
export async function reverseGeocode(latitude, longitude) {
  try {
    const url = new URL(REVERSE_GEOCODE_URL);
    url.searchParams.set("latitude", latitude);
    url.searchParams.set("longitude", longitude);
    url.searchParams.set("localityLanguage", "en");

    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;

    const data = await res.json();
    const name = data.city || data.locality || data.principalSubdivision;
    if (!name) return null;

    return { name, country: data.countryName || null };
  } catch {
    return null;
  }
}

/** Current conditions plus the next 3 days (today is covered by "current"). */
export async function fetchCurrentWeather({ latitude, longitude }) {
  const url = new URL(FORECAST_URL);
  url.searchParams.set("latitude", latitude);
  url.searchParams.set("longitude", longitude);
  url.searchParams.set(
    "current",
    "temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day"
  );
  url.searchParams.set(
    "daily",
    "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
  );
  url.searchParams.set("forecast_days", "4");
  url.searchParams.set("timezone", "auto");

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Forecast failed (${res.status})`);

  const { current, daily } = await res.json();

  return {
    current: {
      temperature: round(current.temperature_2m),
      feelsLike: round(current.apparent_temperature),
      humidity: round(current.relative_humidity_2m),
      windSpeed: round(current.wind_speed_10m), // km/h
      isDay: current.is_day === 1,
      code: current.weather_code,
      label: describeWeather(current.weather_code).label,
    },
    forecast: daily.time.slice(1).map((date, i) => {
      const idx = i + 1;
      return {
        date,
        max: round(daily.temperature_2m_max[idx]),
        min: round(daily.temperature_2m_min[idx]),
        rainChance: daily.precipitation_probability_max?.[idx] ?? null,
        code: daily.weather_code[idx],
        label: describeWeather(daily.weather_code[idx]).label,
      };
    }),
  };
}