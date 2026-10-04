export type LatLng = [number, number];

export type TripForm = {
  current: string;
  pickup: string;
  dropoff: string;
  cycle: string;
  driver: string;
  carrier: string;
  vehicle: string;
  shipping: string;
};

export type LocationKey = "current" | "pickup" | "dropoff";
export type LogMetaKey = "driver" | "carrier" | "vehicle" | "shipping";

export type GeocodedPlace = {
  lat: number;
  lon: number;
  name: string;
  placeId?: string;
};

export type PlaceSuggestion = {
  placeId: string;
  label: string;
  mainText: string;
  secondaryText: string;
};

export type RouteStep = {
  text: string;
  miles: number;
  minutes: number;
};

export type RouteGeo = {
  coordinates: LatLng[];
  distance: number;
  duration: number;
  places: GeocodedPlace[];
  steps: RouteStep[];
};

export type DutyStatus = "off" | "sleeper" | "drive" | "on";

export type DutyEvent = {
  status: DutyStatus;
  start: number;
  end: number;
  label: string;
  miles: number;
};

export type DailyLog = {
  day: number;
  date: string;
  on_duty_hours: number;
  driving_hours: number;
  miles: number;
  cycle_remaining: number;
  events: DutyEvent[];
};

export type TripPlan = {
  total_miles: number;
  estimated_days: number;
  logs: DailyLog[];
};

export type MapStop = {
  miles: number;
  kind: "Rest" | "Fuel";
  position: LatLng;
};

export type OsrmManeuver = {
  type?: string;
  modifier?: string;
  exit?: number;
};

export type OsrmStep = {
  distance: number;
  duration: number;
  name?: string;
  maneuver?: OsrmManeuver;
};

export type OsrmLeg = {
  distance?: number;
  duration?: number;
  steps?: OsrmStep[];
};
