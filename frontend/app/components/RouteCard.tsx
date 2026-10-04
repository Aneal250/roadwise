"use client";

import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { cityName, formatClockMinutes } from "@/lib/format";
import type { LatLng, MapStop, RouteGeo, TripForm } from "@/lib/types";

const TripMap = dynamic(() => import("./TripMap"), {
  ssr: false,
  loading: () => <div className="map-frame map-loading">Loading map…</div>,
});

type RouteCardProps = {
  form: TripForm;
  route: RouteGeo;
  points: LatLng[];
  stops: MapStop[];
  miles: number;
  mins: number | null;
};

export function RouteCard({
  form,
  route,
  points,
  stops,
  miles,
  mins,
}: RouteCardProps) {
  const labels = [form.current, form.pickup, form.dropoff];

  return (
    <div className="map-card">
      <div className="map-head">
        <div>
          <b>Route & stops</b>
          <span>
            {cityName(form.current)} <ArrowRight size={12} /> {cityName(form.dropoff)}
          </span>
        </div>
        <span className="map-key">
          <i /> Route <i className="fuel-key" /> Fuel <i className="rest-key" /> Rest
        </span>
      </div>
      <TripMap
        points={points}
        route={route}
        stops={stops}
        labels={labels}
        miles={miles}
      />
      <div className="route-strip">
        <span>
          <i className="strip-dot start" />
          {cityName(form.current)}
        </span>
        <ArrowRight size={14} />
        <span className="waypoint">
          <i className="strip-dot pickup" />
          {cityName(form.pickup)} <small>Pickup · 1 hr</small>
        </span>
        <ArrowRight size={14} />
        <span>
          <i className="strip-dot drop" />
          {cityName(form.dropoff)}
        </span>
        <span className="strip-distance">
          {mins
            ? `${formatClockMinutes(mins)} route est.`
            : `${Math.round(miles).toLocaleString()} mi`}
        </span>
      </div>
      {stops.length > 0 && (
        <div className="stop-summary">
          {stops.map((stop) => (
            <span key={`${stop.kind}-${stop.miles}`}>
              <i
                className={`strip-dot ${stop.kind === "Fuel" ? "fuel-stop" : "rest-stop"}`}
              />
              <b>{stop.kind} stop</b> · mile {Math.round(stop.miles).toLocaleString()}
            </span>
          ))}
        </div>
      )}
      <details className="route-instructions">
        <summary>
          Turn-by-turn instructions <small>{route.steps.length} steps</small>
        </summary>
        <ol>
          {route.steps.map((step, index) => (
            <li key={`${step.text}-${index}`}>
              <span className="instruction-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>
                {step.text}
                <small>
                  {step.miles.toFixed(1)} mi · approx. {Math.round(step.minutes)} min
                </small>
              </span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
