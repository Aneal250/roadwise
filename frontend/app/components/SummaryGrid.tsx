import { Clock3, Fuel, Route, ShieldCheck } from "lucide-react";
import { FUEL_INTERVAL_MILES } from "@/lib/constants";
import { fmtHours } from "@/lib/format";
import type { RouteGeo, TripPlan } from "@/lib/types";

type SummaryGridProps = {
  plan: TripPlan;
  route: RouteGeo | null;
  miles: number;
  hours: number;
  fuelStops: number;
};

export function SummaryGrid({
  plan,
  route,
  miles,
  hours,
  fuelStops,
}: SummaryGridProps) {
  const origin = route?.places?.[0]?.name.split(",").slice(0, 2).join(",");
  const dayLabel = plan.estimated_days === 1 ? "day" : "days";

  return (
    <div className="summary-grid">
      <div className="summary-card summary-distance">
        <span className="summary-icon">
          <Route size={17} />
        </span>
        <small>TOTAL ROUTE</small>
        <b>
          {Math.round(miles).toLocaleString()} <i>mi</i>
        </b>
        <span className="summary-note">
          {plan.estimated_days} driving {dayLabel}
          {origin ? ` · ${origin}` : ""}
        </span>
      </div>
      <div className="summary-card">
        <span className="summary-icon">
          <Clock3 size={17} />
        </span>
        <small>WHEEL TIME</small>
        <b>{fmtHours(hours)}</b>
        <span className="summary-note">At a planning average of 55 mph</span>
      </div>
      <div className="summary-card">
        <span className="summary-icon fuel-icon">
          <Fuel size={17} />
        </span>
        <small>FUEL STOPS</small>
        <b>
          {fuelStops.toString().padStart(2, "0")} <i>planned</i>
        </b>
        <span className="summary-note">At least every {FUEL_INTERVAL_MILES.toLocaleString()} miles</span>
      </div>
      <div className="summary-card">
        <span className="summary-icon">
          <ShieldCheck size={17} />
        </span>
        <small>CYCLE REMAINING</small>
        <b>
          {plan.logs.at(-1)?.cycle_remaining}
          <i> hrs</i>
        </b>
        <span className="summary-note">70-hour / 8-day property rule</span>
      </div>
    </div>
  );
}
