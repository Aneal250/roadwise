import { ShieldCheck, Truck } from "lucide-react";

export function TopBar() {
  return (
    <header className="topbar">
      <a className="brand" href="#">
        <span className="brand-mark">
          <Truck size={19} />
        </span>
        <span>
          roadwise<span className="brand-period">.</span>
        </span>
      </a>
      <div className="topbar-right">
        <span className="reg-chip">
          <ShieldCheck size={14} /> FMCSA HOS planner
        </span>
        <span className="top-divider" />
        <button className="avatar" type="button">
          JD
        </button>
      </div>
    </header>
  );
}
