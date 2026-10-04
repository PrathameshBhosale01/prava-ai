"use client";

// Plain Leaflet again. This component only DRAWS: the page decides what to
// show (markers, line, mode) and passes it in as props.
// It must only ever load in the browser (see the dynamic import in the page).

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { TILE_ATTRIBUTION, TILE_URL } from "@/lib/mapConfig";
import { TRAVEL_MODES } from "@/lib/travelModes";

const WORLD_CENTER = [20, 0];
const WORLD_ZOOM = 2;

const MARKER_STYLE = {
  start: { color: "#16a34a", label: "Start" },
  end: { color: "#dc2626", label: "End" },
};

// Built with DOM APIs (textContent), never innerHTML with place names.
function makePillIcon(kind) {
  const { color, label } = MARKER_STYLE[kind];

  const pill = document.createElement("div");
  pill.style.cssText =
    `display:inline-flex;align-items:center;gap:5px;background:#fff;border:2px solid ${color};` +
    `border-radius:999px;padding:3px 10px;font-size:11px;font-weight:700;color:${color};` +
    "box-shadow:0 2px 8px rgba(0,0,0,.22);white-space:nowrap;transform:translate(-50%,-50%)";

  const dot = document.createElement("span");
  dot.style.cssText = `width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0`;

  const text = document.createElement("span");
  text.textContent = label;

  pill.append(dot, text);

  // iconSize [0, 0] + translate(-50%, -50%) centers the pill on the coordinate
  return L.divIcon({ className: "", html: pill, iconSize: [0, 0] });
}

function makePopup(kind, name) {
  const box = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = MARKER_STYLE[kind].label;
  const place = document.createElement("div");
  place.textContent = name;
  box.append(title, place);
  return box;
}

export default function DiscoverMap({ markers, line, mode, onModeChange, busy }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);

  // Effect 1: create the map once, remove it on unmount.
  useEffect(() => {
    const map = L.map(containerRef.current, {
      center: WORLD_CENTER,
      zoom: WORLD_ZOOM,
      minZoom: 2,
      // Wheel-zoom would hijack page scrolling, so it's off until the user
      // clicks the map, and off again when the mouse leaves.
      scrollWheelZoom: false,
    });

    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 19 }).addTo(map);

    map.on("click", () => map.scrollWheelZoom.enable());
    map.on("mouseout", () => map.scrollWheelZoom.disable());

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // StrictMode runs effects twice in dev; without this Leaflet throws
    // "Map container is already initialized".
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  // Effect 2: redraw whenever the route changes. Declared AFTER effect 1 so on
  // first mount the map already exists when this runs.
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    if (!markers) {
      map.setView(WORLD_CENTER, WORLD_ZOOM);
      return;
    }

    if (line) {
      L.polyline(line, {
        color: mode.color,
        weight: mode.weight,
        opacity: 0.85,
        dashArray: mode.dash ?? undefined,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(layer);
    }

    markers.forEach((m) => {
      L.marker([m.lat, m.lng], { icon: makePillIcon(m.kind) })
        .bindPopup(makePopup(m.kind, m.name))
        .addTo(layer);
    });

    const bounds = L.latLngBounds(line ?? markers.map((m) => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
  }, [markers, line, mode]);

  return (
    // isolate: Leaflet panes use z-index up to ~1000; keep them inside this box
    <div className="relative isolate h-[350px] overflow-hidden rounded-xl border md:h-[520px]">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Travel mode switcher */}
      <div className="absolute left-1/2 top-3 z-[1000] flex -translate-x-1/2 items-center gap-1 rounded-full border bg-surface/90 px-2 py-1.5 shadow-lg backdrop-blur-sm">
        {TRAVEL_MODES.map((m) => {
          const active = m.id === mode.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onModeChange(m.id)}
              aria-pressed={active}
              title={m.label}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                active ? "text-white shadow-md" : "text-muted-foreground hover:bg-surface-muted"
              }`}
              style={active ? { background: m.color } : undefined}
            >
              <span className="text-sm leading-none">{m.icon}</span>
              <span className="hidden sm:inline">{m.label}</span>
            </button>
          );
        })}
      </div>

      {busy && (
        <div className="absolute bottom-4 left-1/2 z-[1000] flex -translate-x-1/2 items-center gap-2 rounded-full border bg-surface/90 px-4 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur-sm">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Drawing {mode.label.toLowerCase()} route…
        </div>
      )}
    </div>
  );
}