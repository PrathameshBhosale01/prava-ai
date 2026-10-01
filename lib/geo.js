// Pure geometry helpers (no network, no browser APIs), safe to import anywhere.

const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

// Straight-line ("as the crow flies") distance over the Earth's surface.
export function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Great-circle arc between two points (spherical linear interpolation).
// Returns n + 1 points as [lat, lng].
//
// Longitudes are "unwrapped" so consecutive points never jump by more than 180
// degrees. Without this, a flight across the Pacific makes Leaflet draw a line
// the long way around the whole map. Unwrapped values can fall outside
// -180..180 (e.g. -241), which Leaflet handles by drawing on the world copy.
export function greatCircleArc(from, to, n = 120) {
  const phi1 = toRad(from.lat);
  const lam1 = toRad(from.lng);
  const phi2 = toRad(to.lat);
  const lam2 = toRad(to.lng);

  const d = haversineKm(from, to) / EARTH_RADIUS_KM; // angular distance (radians)

  // Same point, or exactly opposite points (sin(d) = 0 would divide by zero).
  if (d < 0.001 || d > Math.PI - 0.001) {
    return [
      [from.lat, from.lng],
      [to.lat, to.lng],
    ];
  }

  const points = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(phi1) * Math.cos(lam1) + B * Math.cos(phi2) * Math.cos(lam2);
    const y = A * Math.cos(phi1) * Math.sin(lam1) + B * Math.cos(phi2) * Math.sin(lam2);
    const z = A * Math.sin(phi1) + B * Math.sin(phi2);
    points.push([toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))]);
  }

  // Unwrap longitudes
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1][1];
    while (points[i][1] - prev > 180) points[i][1] -= 360;
    while (points[i][1] - prev < -180) points[i][1] += 360;
  }

  return points;
}