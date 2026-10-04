import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const AUTOCOMPLETE_URL = "https://places.googleapis.com/v1/places:autocomplete";
const AUTOCOMPLETE_FIELDS = [
  "suggestions.placePrediction.placeId",
  "suggestions.placePrediction.text",
  "suggestions.placePrediction.structuredFormat",
].join(",");

type GoogleText = { text?: string };

type GoogleSuggestion = {
  placePrediction?: {
    placeId?: string;
    text?: GoogleText;
    structuredFormat?: {
      mainText?: GoogleText;
      secondaryText?: GoogleText;
    };
  };
};

type GoogleError = {
  error?: { message?: string };
};

function apiKey() {
  return process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
}

function googleError(payload: GoogleError, fallback: string) {
  const message = payload.error?.message?.replace(/AIza[\w-]+/g, "").trim();
  return message || fallback;
}

export async function GET(request: NextRequest) {
  const key = apiKey();
  if (!key) {
    return Response.json(
      { error: "Google location search needs a GOOGLE_MAPS_API_KEY." },
      { status: 503 },
    );
  }

  const placeId = request.nextUrl.searchParams.get("placeId")?.trim() || "";
  const query = request.nextUrl.searchParams.get("q")?.trim() || "";
  const sessionToken = request.nextUrl.searchParams.get("sessionToken")?.trim() || "";

  if (placeId) return placeDetails(placeId, sessionToken, key);
  if (query.length < 2) return Response.json({ suggestions: [] });
  return autocomplete(query.slice(0, 200), sessionToken, key);
}

async function autocomplete(input: string, sessionToken: string, key: string) {
  const response = await fetch(AUTOCOMPLETE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": AUTOCOMPLETE_FIELDS,
    },
    body: JSON.stringify({
      input,
      languageCode: "en",
      includedRegionCodes: ["us"],
      ...(sessionToken ? { sessionToken } : {}),
    }),
    signal: AbortSignal.timeout(8000),
  });
  const payload = (await response.json()) as GoogleError & { suggestions?: GoogleSuggestion[] };
  if (!response.ok) {
    return Response.json(
      { error: googleError(payload, "Google location search failed.") },
      { status: response.status },
    );
  }

  const suggestions = (payload.suggestions ?? [])
    .map((suggestion) => suggestion.placePrediction)
    .filter((prediction) => prediction?.placeId && prediction.text?.text)
    .map((prediction) => ({
      placeId: prediction!.placeId,
      label: prediction!.text!.text,
      mainText: prediction!.structuredFormat?.mainText?.text || prediction!.text!.text,
      secondaryText: prediction!.structuredFormat?.secondaryText?.text || "",
    }));

  return Response.json({ suggestions });
}

async function placeDetails(placeId: string, sessionToken: string, key: string) {
  const url = new URL(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`);
  if (sessionToken) url.searchParams.set("sessionToken", sessionToken);

  const response = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "location,formattedAddress,displayName",
    },
    signal: AbortSignal.timeout(8000),
  });
  const payload = (await response.json()) as GoogleError & {
    formattedAddress?: string;
    displayName?: GoogleText;
    location?: { latitude?: number; longitude?: number };
  };
  if (!response.ok) {
    return Response.json(
      { error: googleError(payload, "Could not load that Google location.") },
      { status: response.status },
    );
  }

  const lat = payload.location?.latitude;
  const lon = payload.location?.longitude;
  if (typeof lat !== "number" || typeof lon !== "number") {
    return Response.json({ error: "That Google location has no map coordinates." }, { status: 422 });
  }

  return Response.json({
    placeId,
    lat,
    lon,
    name: payload.formattedAddress || payload.displayName?.text || placeId,
  });
}
