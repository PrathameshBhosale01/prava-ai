// Map settings live here so a provider swap is a one-line change.
// OSM's own tile server is fine for a portfolio project, but their policy
// forbids heavy use and asks apps not to hardcode the URL.
// To switch providers later, set NEXT_PUBLIC_MAP_TILE_URL (and the attribution).

export const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ||
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

export const DEFAULT_ZOOM = 11;