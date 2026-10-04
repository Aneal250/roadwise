import { ArrowUpRight, ShieldCheck } from "lucide-react";

export function ComplianceNote() {
  return (
    <div className="compliance-note">
      <ShieldCheck size={16} />
      <span>
        <b>Planning estimate, not an ELD record.</b> OSRM routes for ordinary
        vehicles and does not account for truck restrictions; stop pins mark
        approximate route miles, not confirmed parking or fuel facilities. Duty
        times assume 55 mph, a 07:00 local start with the home-terminal zone
        assumed, and a static cycle-used total without rolling day-by-day
        credit. Verify the truck-legal route, duty history, logs, and stops
        before driving.
      </span>
      <a
        href="https://www.fmcsa.dot.gov/regulations/hours-service/summary-hours-service-regulations"
        target="_blank"
        rel="noreferrer"
      >
        HOS rules <ArrowUpRight size={12} />
      </a>
    </div>
  );
}
