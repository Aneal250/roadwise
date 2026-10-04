import { API_URL } from "./constants";
import { formatInstructions, localDeparture } from "./format";
import { locateQuery } from "./places";
import type { GeocodedPlace, LocationKey, OsrmLeg, RouteGeo, TripForm, TripPlan } from "./types";

const METERS_PER_MILE = 1609.344;
const LOCATION_KEYS: LocationKey[] = ["current", "pickup", "dropoff"];

type OsrmResponse = {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: { coordinates: [number, number][] };
    legs?: OsrmLeg[];
  }[];
};

type PlanError = {
  error?: string;
};

export async function buildTrip(
  form: TripForm,
  selected: Partial<Record<LocationKey, GeocodedPlace>>,
): Promise<{
  route: RouteGeo;
  plan: TripPlan;
}> {
  const places: GeocodedPlace[] = [];
  const seen = new Map<string, GeocodedPlace>();

  for (const key of LOCATION_KEYS) {
    const query = form[key].trim();
    if (!query) throw new Error("Enter a current location, pickup, and drop-off.");
    const queryKey = query.toLowerCase();
    const chosen = selected[key];
    const picked = chosen?.name === query && Number.isFinite(chosen.lat) ? chosen : undefined;
    const cached = (picked?.placeId && seen.get(picked.placeId)) || seen.get(queryKey);
    if (cached) {
      places.push(cached);
      continue;
    }
    const found = picked ?? (await locateQuery(query));
    seen.set(queryKey, found);
    if (found.placeId) seen.set(found.placeId, found);
    places.push(found);
  }

  const coordinateText = places.map((place) => `${place.lon},${place.lat}`).join(";");
  const response = await fetch(
    `https://router.project-osrm.org/route/v1/driving/${coordinateText}?overview=full&geometries=geojson&steps=true`,
  );
  if (!response.ok) {
    throw new Error("Could not calculate this route. Please try again.");
  }

  const data = (await response.json()) as OsrmResponse;
  if (data.code !== "Ok" || !data.routes?.length) {
    throw new Error("No drivable route found for these locations.");
  }

  const routed = data.routes[0];
  if ((routed.legs?.length ?? 0) < places.length - 1) {
    throw new Error("Could not calculate this route. Please try again.");
  }
  const milesToPickup = (routed.legs?.[0]?.distance ?? 0) / METERS_PER_MILE;
  const route: RouteGeo = {
    coordinates: routed.geometry.coordinates.map(([lon, lat]) => [lat, lon]),
    distance: routed.distance,
    duration: routed.duration,
    places,
    steps: formatInstructions(routed.legs ?? []),
  };

  // this  is giving this
  // https://roadwise-production.up.railway.app//api/plan/
 // how  do i resolve this on deployment?

  const res = await fetch(`${API_URL}/api/plan/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      current_location: form.current,
      pickup_location: form.pickup,
      dropoff_location: form.dropoff,
      total_miles: routed.distance / METERS_PER_MILE,
      miles_to_pickup: milesToPickup,
      cycle_used: Number(form.cycle),
      departure: localDeparture(),
    }),
  });

  const body = (await res.json()) as TripPlan | PlanError;
  if (!res.ok) {
    throw new Error(
      ("error" in body && body.error) ||
        "Could not build the hours-of-service plan.",
    );
  }

  return { route, plan: body as TripPlan };
}
