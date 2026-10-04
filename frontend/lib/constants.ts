import type { LocationKey, LogMetaKey, TripForm } from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const CYCLE_LIMIT_HOURS = 70;
export const AVERAGE_SPEED_MPH = 55;
export const FUEL_INTERVAL_MILES = 1000;

export const LOCATION_FIELDS: {
  key: LocationKey;
  label: string;
  placeholder: string;
}[] = [
  {
    key: "current",
    label: "Current location",
    placeholder: "Where are you now?",
  },
  {
    key: "pickup",
    label: "Pickup location",
    placeholder: "Where is the load?",
  },
  {
    key: "dropoff",
    label: "Drop-off location",
    placeholder: "Final destination",
  },
];

export const LOG_META_FIELDS: {
  key: LogMetaKey;
  label: string;
  placeholder: string;
}[] = [
  { key: "driver", label: "Driver name", placeholder: "Full legal name" },
  { key: "carrier", label: "Carrier", placeholder: "Carrier name" },
  { key: "vehicle", label: "Truck / tractor number", placeholder: "Unit number" },
  {
    key: "shipping",
    label: "Shipping document or commodity",
    placeholder: "BOL or commodity",
  },
];

export const INITIAL_FORM: TripForm = {
  current: "Richmond, VA",
  pickup: "Richmond, VA",
  dropoff: "Newark, NJ",
  cycle: "18",
  driver: "",
  carrier: "",
  vehicle: "",
  shipping: "",
};

export const DUTY_ROWS: { key: "off" | "sleeper" | "drive" | "on"; label: string }[] =
  [
    { key: "off", label: "Off duty" },
    { key: "sleeper", label: "Sleeper berth" },
    { key: "drive", label: "Driving" },
    { key: "on", label: "On duty · not driving" },
  ];
