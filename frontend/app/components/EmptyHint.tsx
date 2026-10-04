import { ArrowUpRight, Zap } from "lucide-react";

export function EmptyHint() {
  return (
    <div className="empty-hint">
      <span className="hint-icon">
        <Zap size={17} />
      </span>
      <span>
        <b>Your next trip, made simpler.</b>
        <small>
          Enter the trip and log details above to see a route, daily logs, and
          a downloadable PDF report.
        </small>
      </span>
      <ArrowUpRight size={16} />
    </div>
  );
}
