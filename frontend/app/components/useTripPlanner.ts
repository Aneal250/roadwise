"use client";

import { useMemo, useState, type FormEvent } from "react";
import { buildTrip } from "@/lib/build-trip";
import { AVERAGE_SPEED_MPH, INITIAL_FORM, LOG_META_FIELDS } from "@/lib/constants";
import { buildMapStops } from "@/lib/geo";
import type { GeocodedPlace, LocationKey, RouteGeo, TripForm, TripPlan } from "@/lib/types";

export function useTripPlanner() {
  const [form, setForm] = useState<TripForm>(INITIAL_FORM);
  const [places, setPlaces] = useState<Partial<Record<LocationKey, GeocodedPlace>>>({});
  const [route, setRoute] = useState<RouteGeo | null>(null);
  const [plan, setPlan] = useState<TripPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const miles = plan?.total_miles || 0;
  const points = useMemo(() => route?.coordinates ?? [], [route]);
  const mins = route?.duration ? Math.round(route.duration / 60) : null;
  const hours = miles / AVERAGE_SPEED_MPH;
  const fuelStops = useMemo(() => {
    if (!plan) return 0;
    return plan.logs.reduce(
      (count, log) =>
        count + log.events.filter((event) => /fuel/i.test(event.label)).length,
      0,
    );
  }, [plan]);

  const stops = useMemo(
    () => (plan ? buildMapStops(plan, points, miles) : []),
    [plan, points, miles],
  );

  function update<K extends keyof TripForm>(key: K, value: TripForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateLocation(key: LocationKey, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setPlaces((current) => ({ ...current, [key]: undefined }));
  }

  function selectLocation(key: LocationKey, place: GeocodedPlace) {
    setForm((current) => ({ ...current, [key]: place.name }));
    setPlaces((current) => ({ ...current, [key]: place }));
  }

  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const missing = LOG_META_FIELDS.find((field) => !form[field.key].trim());
    if (missing) {
      setError(`Enter ${missing.label.toLowerCase()} before building the route.`);
      return;
    }
    setBusy(true);
    setError("");
    setPlan(null);
    setRoute(null);
    try {
      const result = await buildTrip(form, places);
      setRoute(result.route);
      setPlan(result.plan);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return {
    form,
    route,
    plan,
    busy,
    error,
    miles,
    points,
    mins,
    hours,
    fuelStops,
    stops,
    update,
    updateLocation,
    selectLocation,
    generate,
  };
}
