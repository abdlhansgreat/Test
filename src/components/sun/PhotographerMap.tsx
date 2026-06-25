import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { Link } from "@tanstack/react-router";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCityCoords, jitterCoords } from "@/lib/cities";
import type { PhotographerResult } from "@/lib/photographer-search";

// Fix default icon paths (works with bundler).
const icon = L.divIcon({
  className: "",
  html: `<div style="width:28px;height:28px;border-radius:9999px;background:linear-gradient(135deg,#FF7A1A,#FFB020);box-shadow:0 4px 12px rgba(255,122,26,.45);border:2px solid #fff"></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

export function PhotographerMap({ results }: { results: PhotographerResult[] }) {
  // Force leaflet to recalc size on mount (in case container animates in).
  useEffect(() => {
    setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
  }, []);

  const points = results
    .map((r) => {
      const c = getCityCoords(r.base_city);
      return c ? { r, coords: jitterCoords(c, r.id) } : null;
    })
    .filter((p): p is { r: PhotographerResult; coords: [number, number] } => p !== null);

  const center: [number, number] = points[0]?.coords ?? [22.5937, 78.9629]; // India

  return (
    <div className="h-[600px] w-full overflow-hidden rounded-3xl border border-line shadow-soft">
      <MapContainer
        center={center}
        zoom={points.length > 1 ? 5 : 11}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map(({ r, coords }) => (
          <Marker key={r.id} position={coords} icon={icon}>
            <Popup>
              <div className="font-sans">
                <div className="font-display text-base font-bold text-ink">{r.business_name}</div>
                <div className="text-xs text-ink-muted">{r.base_city}</div>
                <div className="mt-1 text-sm">
                  ★ {Number(r.rating_avg ?? 0).toFixed(1)} · {r.review_count ?? 0} reviews
                </div>
                <div className="mt-1 text-sm font-semibold">
                  {r.starting_price ? `From ₹${Number(r.starting_price).toLocaleString("en-IN")}` : "On request"}
                </div>
                <Link
                  to="/p/$slug"
                  params={{ slug: r.slug }}
                  className="mt-2 inline-block rounded-full bg-gradient-primary px-3 py-1 text-xs font-bold text-white"
                >
                  View profile
                </Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
