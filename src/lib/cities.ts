// Approx lat/lng for major Indian cities — used for map plotting.
export const CITY_COORDS: Record<string, [number, number]> = {
  "delhi ncr": [28.6139, 77.209],
  delhi: [28.6139, 77.209],
  mumbai: [19.076, 72.8777],
  bengaluru: [12.9716, 77.5946],
  bangalore: [12.9716, 77.5946],
  hyderabad: [17.385, 78.4867],
  chennai: [13.0827, 80.2707],
  kolkata: [22.5726, 88.3639],
  pune: [18.5204, 73.8567],
  jaipur: [26.9124, 75.7873],
  ahmedabad: [23.0225, 72.5714],
  goa: [15.2993, 74.124],
  chandigarh: [30.7333, 76.7794],
  lucknow: [26.8467, 80.9462],
  surat: [21.1702, 72.8311],
  kochi: [9.9312, 76.2673],
  indore: [22.7196, 75.8577],
  bhopal: [23.2599, 77.4126],
  nagpur: [21.1458, 79.0882],
  coimbatore: [11.0168, 76.9558],
};

export const POPULAR_CITIES = [
  "Delhi NCR",
  "Mumbai",
  "Bengaluru",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Jaipur",
  "Ahmedabad",
  "Goa",
];

export function getCityCoords(city: string | null | undefined): [number, number] | null {
  if (!city) return null;
  return CITY_COORDS[city.trim().toLowerCase()] ?? null;
}

// Deterministic small offset (in degrees) for pin de-overlap.
export function jitterCoords([lat, lng]: [number, number], seed: string): [number, number] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const dx = ((h & 0xff) / 255 - 0.5) * 0.06;
  const dy = (((h >> 8) & 0xff) / 255 - 0.5) * 0.06;
  return [lat + dy, lng + dx];
}
