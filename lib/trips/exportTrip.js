// Pro export: a clean JSON file and a calendar (.ics) file. Pure, so it can be tested without a browser.
import { BRAND_NAME } from "../brand.js";


const TRIP_FIELDS = ["title", "destination", "startingFrom", "stops", "endingAt", "oneWay", "start", "end", "startDate", "duration", "budget", "currency", "travelers", "category", "interests", "accommodation", "transportation", "description"];

/** The trip as a portable object: a whitelist of fields, so ids, owners and timestamps never leak. */
export function buildTripJson(trip, now = new Date()) {
  const out = {};
  for (const key of TRIP_FIELDS) if (trip?.[key] !== undefined && trip[key] !== null) out[key] = trip[key];
  return { app: BRAND_NAME, exportedAt: now.toISOString(), trip: out, itinerary: trip?.itinerary ?? null };
}

/** "My trip: Goa!" → "my-trip-goa" for file names. */
export function fileSlug(text, fallback = "trip") {
  const slug = String(text ?? "").normalize("NFKD").replace(/[^\w\s-]/g, "").trim().toLowerCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 60);
  return slug || fallback;
}

/* ------------------------------- iCalendar ------------------------------- */

const escapeText = (v) => String(v ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

/** RFC 5545: lines are at most 75 octets; continuation lines start with a space. Never splits a character. */
export function foldLine(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts = [];
  let cur = "";
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > limit) {
      parts.push(cur);
      cur = "";
      bytes = 0;
      limit = 74; // the leading space counts
    }
    cur += ch;
    bytes += n;
  }
  parts.push(cur);
  return parts.join("\r\n ");
}

const pad = (n) => String(n).padStart(2, "0");

/** "09:00", "9:30 AM", "14.15", "7pm" → {h, m}, or null when it isn't a clock time. */
export function parseTime(value) {
  const m = /^\s*(\d{1,2})(?:[:.](\d{2}))?\s*([ap]\.?m\.?)?\s*$/i.exec(String(value ?? ""));
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const ap = m[3]?.[0]?.toLowerCase();
  if (min > 59) return null;
  if (ap) {
    if (h < 1 || h > 12) return null;
    h = (h % 12) + (ap === "p" ? 12 : 0);
  } else if (h > 23) return null;
  return { h, m: min };
}

/** "2 hours", "90 min", "1.5 hrs", "1h 30m" → minutes (default 60). */
export function parseDuration(value) {
  const text = String(value ?? "").toLowerCase();
  let total = 0;
  const hours = /(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/.exec(text);
  const mins = /(\d+)\s*(?:m|min|mins|minute|minutes)\b/.exec(text);
  if (hours) total += Math.round(Number(hours[1]) * 60);
  if (mins) total += Number(mins[1]);
  return total > 0 && total <= 24 * 60 ? total : 60;
}

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`));
const compact = (iso) => iso.replaceAll("-", "");

function addMinutes(iso, h, m, plus) {
  const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10), h, m + plus));
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00`;
}
function nextDay(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}
const stamp = (now) => now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Calendar file with one event per activity (and one per journey). Times are "floating": the local time at the place. */
export function buildIcs(trip, itinerary, { now = new Date() } = {}) {
  const id = trip?.id ?? "trip";
  const dtstamp = stamp(now);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", `PRODID:-//${BRAND_NAME}//Trip//EN`, "CALSCALE:GREGORIAN", `X-WR-CALNAME:${escapeText(trip?.title || "Trip")}`];

  for (const day of itinerary?.days ?? []) {
    if (!isDate(day.date)) continue; // no date, nothing to put on a calendar

    const event = (uid, summary, extra, description, location) => {
      lines.push("BEGIN:VEVENT", `UID:${uid}@velmora`, `DTSTAMP:${dtstamp}`, ...extra, `SUMMARY:${escapeText(summary)}`);
      if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
      if (location) lines.push(`LOCATION:${escapeText(location)}`);
      lines.push("END:VEVENT");
    };

    if (day.transfer?.from && day.transfer?.to) {
      const t = day.transfer;
      event(`${id}-d${day.day}-travel`, `Travel: ${t.from} → ${t.to}`, [`DTSTART;VALUE=DATE:${compact(day.date)}`, `DTEND;VALUE=DATE:${nextDay(day.date)}`], [t.mode, t.duration, t.notes].filter(Boolean).join(" · "));
    }

    (day.activities ?? []).forEach((a, i) => {
      if (!a?.title) return;
      const time = parseTime(a.time);
      const when = time
        ? [`DTSTART:${addMinutes(day.date, time.h, time.m, 0)}`, `DTEND:${addMinutes(day.date, time.h, time.m, parseDuration(a.duration))}`]
        : [`DTSTART;VALUE=DATE:${compact(day.date)}`, `DTEND;VALUE=DATE:${nextDay(day.date)}`];
      event(`${id}-d${day.day}-a${i}`, a.title, when, [a.description, a.price && `Price: ${a.price}`, a.travel && `Getting there: ${a.travel}`].filter(Boolean).join("\n"), a.location);
    });
  }

  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/** True when at least one event can be created (so the UI can explain "set a start date" instead of downloading an empty file). */
export const hasCalendarEvents = (itinerary) => (itinerary?.days ?? []).some((d) => isDate(d.date) && ((d.activities?.length ?? 0) > 0 || d.transfer));
