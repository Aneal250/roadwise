import type { FormEvent, ReactNode } from "react";
import { ArrowRight, Clock3, MapPin, Navigation, Route, ShieldCheck } from "lucide-react";
import {
  CYCLE_LIMIT_HOURS,
  LOCATION_FIELDS,
  LOG_META_FIELDS,
} from "@/lib/constants";
import type { GeocodedPlace, LocationKey, TripForm } from "@/lib/types";
import { LocationField } from "./LocationField";

const LOCATION_ICONS: Record<LocationKey, ReactNode> = {
  current: <Navigation size={16} />,
  pickup: <MapPin size={16} />,
  dropoff: <MapPin size={16} />,
};

type TripFormProps = {
  form: TripForm;
  busy: boolean;
  error: string;
  onChange: <K extends keyof TripForm>(key: K, value: TripForm[K]) => void;
  onLocationChange: (key: LocationKey, value: string) => void;
  onLocationSelect: (key: LocationKey, place: GeocodedPlace) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function TripFormCard({
  form,
  busy,
  error,
  onChange,
  onLocationChange,
  onLocationSelect,
  onSubmit,
}: TripFormProps) {
  const cycleUsed = Number(form.cycle) || 0;
  const cycleAvailable = Math.max(0, CYCLE_LIMIT_HOURS - cycleUsed);

  return (
    <section className="planner-card">
      <div className="section-title">
        <div className="section-icon">
          <Route size={18} />
        </div>
        <div>
          <h2>Plan your trip</h2>
          <p>Tell us where you&apos;re headed. We&apos;ll take care of the hours.</p>
        </div>
        <span className="step-tag">
          01 <span>/</span> TRIP DETAILS
        </span>
      </div>
      <form onSubmit={onSubmit}>
        <div className="route-inputs">
          {LOCATION_FIELDS.map(({ key, label, placeholder }, index) => (
            <div className="field-wrap" key={key}>
              <label htmlFor={key}>{label}</label>
              <LocationField
                id={key}
                label={label}
                placeholder={placeholder}
                value={form[key]}
                icon={LOCATION_ICONS[key]}
                pinClass={`pin-${index}`}
                disabled={busy}
                onValueChange={(value) => onLocationChange(key, value)}
                onPlaceSelect={(place) => onLocationSelect(key, place)}
              />
              {index < 2 && <span className="input-connector" />}
            </div>
          ))}
          <div className="field-wrap cycle-field">
            <label htmlFor="cycle">
              Cycle used <span className="label-sub">(last 8 days)</span>
            </label>
            <div className="input-shell">
              <span className="clock-icon">
                <Clock3 size={16} />
              </span>
              <input
                id="cycle"
                type="number"
                min="0"
                max="69.9"
                step="0.25"
                required
                value={form.cycle}
                onChange={(event) => onChange("cycle", event.target.value)}
              />
              <span className="hours-unit">HRS</span>
            </div>
            <div className="cycle-track">
              <span
                style={{
                  width: `${Math.min(100, (cycleUsed / CYCLE_LIMIT_HOURS) * 100)}%`,
                }}
              />
            </div>
            <div className="cycle-meta">
              <span>0 hrs</span>
              <b>{cycleAvailable} hrs available</b>
              <span>{CYCLE_LIMIT_HOURS} hrs</span>
            </div>
          </div>
        </div>
        <div className="log-identity">
          <div className="identity-head">
            <b>Log sheet details</b>
            <span>Required on every daily log and the PDF report</span>
          </div>
          <div className="details-grid">
            {LOG_META_FIELDS.map(({ key, label, placeholder }) => (
              <label key={key} htmlFor={key}>
                {label}
                <input
                  id={key}
                  required
                  disabled={busy}
                  value={form[key]}
                  placeholder={placeholder}
                  autoComplete="off"
                  onChange={(event) => onChange(key, event.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
        <div className="form-bottom">
          <div className="assumption">
            <ShieldCheck size={15} />
            <span>70 / 8-day cycle</span>
            <i /> <span>10-hour reset</span>
            <i /> <span>30-minute break</span>
          </div>
          <button className="submit-button" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner" />
                Building your plan
              </>
            ) : (
              <>
                Build my route <ArrowRight size={17} />
              </>
            )}
          </button>
        </div>
      </form>
      {error && <div className="error-banner">{error}</div>}
    </section>
  );
}
