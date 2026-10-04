import type { DutyEvent, GeocodedPlace, LatLng, MapStop, TripPlan } from "./types";

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function segmentMiles(a: LatLng, b: LatLng) {
  const dLat = toRadians(b[0] - a[0]);
  const dLon = toRadians(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a[0])) *
      Math.cos(toRadians(b[0])) *
      Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function routePointAt(
  points: LatLng[],
  miles: number,
  routeMiles: number,
): LatLng {
  const geometricMiles = points
    .slice(1)
    .reduce((sum, point, index) => sum + segmentMiles(points[index], point), 0);
  const target = routeMiles ? (miles * geometricMiles) / routeMiles : miles;
  let walked = 0;

  for (let index = 1; index < points.length; index += 1) {
    const segment = segmentMiles(points[index - 1], points[index]);
    if (walked + segment >= target) {
      const t = segment ? (target - walked) / segment : 0;
      return [
        points[index - 1][0] + (points[index][0] - points[index - 1][0]) * t,
        points[index - 1][1] + (points[index][1] - points[index - 1][1]) * t,
      ];
    }
    walked += segment;
  }

  return points.at(-1) ?? [0, 0];
}

function stopKind(label: string): MapStop["kind"] | null {
  if (/fuel/i.test(label)) return "Fuel";
  if (/30-minute break|10-hour rest|34-hour cycle restart/i.test(label)) return "Rest";
  return null;
}

export function samePlace(a: GeocodedPlace, b: GeocodedPlace) {
  return Math.abs(a.lat - b.lat) < 0.0008 && Math.abs(a.lon - b.lon) < 0.0008;
}

export function buildMapStops(
  plan: TripPlan,
  points: LatLng[],
  miles: number,
): MapStop[] {
  if (!points.length) return [];

  const found: MapStop[] = [];
  const seen = new Set<string>();
  let walked = 0;

  plan.logs.forEach((log) => {
    log.events.forEach((event: DutyEvent) => {
      if (event.status === "drive") {
        walked += event.miles || 0;
        return;
      }
      const kind = stopKind(event.label);
      if (!kind || walked <= 1 || walked >= miles - 1) return;
      const key = `${kind}-${Math.round(walked)}`;
      if (seen.has(key)) return;
      seen.add(key);
      found.push({
        miles: walked,
        kind,
        position: routePointAt(points, walked, miles),
      });
    });
  });

  return found.sort((a, b) => a.miles - b.miles);
}
