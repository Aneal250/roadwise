import type { GeocodedPlace, PlaceSuggestion } from "./types";

type PlaceResponse = GeocodedPlace & { error?: string };
type SearchResponse = { suggestions?: PlaceSuggestion[]; error?: string };

async function readError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return body.error || fallback;
}

export async function searchPlaces(query: string, sessionToken: string) {
  const params = new URLSearchParams({ q: query, sessionToken });
  const response = await fetch(`/api/places?${params}`);
  if (!response.ok) {
    throw new Error(await readError(response, "Google location search failed."));
  }
  const body = (await response.json()) as SearchResponse;
  return body.suggestions ?? [];
}

export async function resolvePlace(placeId: string, sessionToken: string, fallbackLabel: string) {
  const params = new URLSearchParams({ placeId, sessionToken });
  const response = await fetch(`/api/places?${params}`);
  if (!response.ok) {
    throw new Error(await readError(response, "Could not load that Google location."));
  }
  const place = (await response.json()) as PlaceResponse;
  if (typeof place.lat !== "number" || typeof place.lon !== "number") {
    throw new Error("That Google location has no map coordinates.");
  }
  return {
    placeId,
    lat: place.lat,
    lon: place.lon,
    name: place.name || fallbackLabel,
  } satisfies GeocodedPlace;
}

export async function locateQuery(query: string) {
  const sessionToken = crypto.randomUUID();
  const suggestions = await searchPlaces(query, sessionToken);
  if (!suggestions.length) {
    throw new Error(`No Google location found for “${query}”. Choose a suggestion from the list.`);
  }
  const exact = suggestions.find((item) => item.label.toLowerCase() === query.toLowerCase());
  const match = exact ?? suggestions[0];
  return resolvePlace(match.placeId, sessionToken, match.label);
}
