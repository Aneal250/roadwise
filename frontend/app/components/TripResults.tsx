"use client";

import { useState } from "react";
import { FileDown, Printer } from "lucide-react";
import { downloadTripReport } from "@/lib/trip-report";
import { ComplianceNote } from "./ComplianceNote";
import { Eyebrow } from "./Eyebrow";
import { LogCard } from "./LogCard";
import { RouteCard } from "./RouteCard";
import { SummaryGrid } from "./SummaryGrid";
import type { LatLng, MapStop, RouteGeo, TripForm, TripPlan } from "@/lib/types";

type TripResultsProps = {
  plan: TripPlan;
  route: RouteGeo;
  form: TripForm;
  miles: number;
  hours: number;
  fuelStops: number;
  mins: number | null;
  points: LatLng[];
  stops: MapStop[];
};

export function TripResults({
  plan,
  route,
  form,
  miles,
  hours,
  fuelStops,
  mins,
  points,
  stops,
}: TripResultsProps) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const sheetLabel = plan.logs.length === 1 ? "SHEET" : "SHEETS";

  async function exportPdf() {
    setExporting(true);
    setExportError("");
    try {
      await downloadTripReport({
        form,
        plan,
        miles,
        hours,
        fuelStops,
        mins,
        stops,
      });
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : "Could not create the PDF report.",
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="results" id="trip-results">
      <div className="results-heading">
        <div>
          <Eyebrow>ROUTE BRIEF</Eyebrow>
          <h2>Your trip, at a glance</h2>
        </div>
        <div className="results-actions">
          <button className="print-button" type="button" onClick={() => window.print()}>
            <Printer size={16} /> Print logs
          </button>
          <button
            className="print-button export-button"
            type="button"
            disabled={exporting}
            onClick={() => void exportPdf()}
          >
            <FileDown size={16} /> {exporting ? "Preparing PDF" : "Download PDF"}
          </button>
        </div>
      </div>
      {exportError && <div className="error-banner">{exportError}</div>}
      <SummaryGrid
        plan={plan}
        route={route}
        miles={miles}
        hours={hours}
        fuelStops={fuelStops}
      />
      <RouteCard
        form={form}
        route={route}
        points={points}
        stops={stops}
        miles={miles}
        mins={mins}
      />
      <div className="logs-heading">
        <div>
          <Eyebrow>DRIVER&apos;S DAILY LOGS</Eyebrow>
          <h2>Hours, accounted for.</h2>
          <p>One 24-hour log per day. Open a day to see its duty grid and remarks.</p>
        </div>
        <span className="log-count">
          {plan.logs.length} {sheetLabel}
        </span>
      </div>
      <div className="log-list">
        {plan.logs.map((log) => (
          <LogCard key={log.day} log={log} form={form} />
        ))}
      </div>
      <ComplianceNote />
    </section>
  );
}
