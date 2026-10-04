"use client";

import { useState } from "react";
import { ArrowDown, Fuel, MapPin, Navigation } from "lucide-react";
import { DutyChart } from "./DutyChart";
import { fmtHours, formatLogDate } from "@/lib/format";
import type { DailyLog, TripForm } from "@/lib/types";

const TOTALS = [
  { key: "off", label: "Off duty" },
  { key: "sleeper", label: "Sleeper" },
  { key: "drive", label: "Driving" },
  { key: "on", label: "On duty" },
] as const;

type LogCardProps = {
  log: DailyLog;
  form: TripForm;
};

export function LogCard({ log, form }: LogCardProps) {
  const [open, setOpen] = useState(log.day === 1);
  const sums = { off: 0, sleeper: 0, drive: 0, on: 0 };
  log.events.forEach((event) => {
    sums[event.status] += Math.max(0, event.end - event.start);
  });
  const stopNames = log.events
    .filter((event) => event.label !== "Off duty" && event.status !== "drive" && event.end > event.start)
    .map((event) => event.label);

  return (
    <article className="log-card">
      <button
        className="log-card-head"
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="log-date">
          <span className="day-badge">{String(log.day).padStart(2, "0")}</span>
          <span>
            <b>Day {log.day}</b>
            <small>{formatLogDate(log.date)}</small>
          </span>
        </span>
        <span className="day-stats">
          <span>
            <b>{log.miles}</b>
            <small>MI</small>
          </span>
          <span>
            <b>{fmtHours(log.driving_hours)}</b>
            <small>DRIVING</small>
          </span>
          <span className="cycle-pill">{log.cycle_remaining}h cycle left</span>
        </span>
        <ArrowDown size={17} className={open ? "rotated" : ""} />
      </button>
      <div className={`log-content ${open ? "show" : ""}`}>
        <div className="log-fields">
          <div>
            <small>DRIVER</small>
            <b>{form.driver.trim()}</b>
          </div>
          <div>
            <small>CARRIER</small>
            <b>{form.carrier.trim()}</b>
          </div>
          <div>
            <small>VEHICLE</small>
            <b>{form.vehicle.trim()}</b>
          </div>
          <div>
            <small>SHIPMENT / COMMODITY</small>
            <b>{form.shipping.trim()}</b>
          </div>
        </div>
        <DutyChart events={log.events} />
        <div className="log-footer">
          <div className="totals">
            {TOTALS.map(({ key, label }) => (
              <span key={key}>
                <i className={`dot ${key === "off" ? "" : key}`} />
                {label}
                <b>{fmtHours(sums[key])}</b>
              </span>
            ))}
          </div>
          <div className="remarks">
            <b>REMARKS</b>
            <span>
              <MapPin size={13} />
              {log.day === 1 ? form.current : "Trip route"} · start
            </span>
            {stopNames.map((stop, index) => (
              <span key={`${stop}-${index}`}>
                {/fuel/i.test(stop) ? <Fuel size={13} /> : <MapPin size={13} />}
                {stop}
              </span>
            ))}
            {log.miles > 0 && (
              <span>
                <Navigation size={13} />
                Daily route · {log.miles} mi
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
