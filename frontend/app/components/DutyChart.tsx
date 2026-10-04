import { DUTY_ROWS } from "@/lib/constants";
import { fmtHours } from "@/lib/format";
import type { DutyEvent } from "@/lib/types";

const HOUR_MARKS = Array.from({ length: 25 }, (_, index) => index);

export function DutyChart({ events }: { events: DutyEvent[] }) {
  return (
    <div className="log-graph">
      <div className="graph-head">
        <span>24-hour duty status grid</span>
        <span>Period begins 07:00 · local time</span>
      </div>
      <div className="grid-hours">
        {HOUR_MARKS.map((hour) => (
          <span key={hour}>
            {hour % 6 === 0
              ? hour === 24
                ? "07"
                : String((7 + hour) % 24).padStart(2, "0")
              : ""}
          </span>
        ))}
      </div>
                                                  
                                                     
      <div className="graph-body">
        {DUTY_ROWS.map((row) => (
          <div className="graph-row" key={row.key}>
            <div className="graph-label">{row.label}</div>
            <div className="graph-track">
              {HOUR_MARKS.map((hour) => (
                <i
                  className="hour-line"
                  key={hour}
                  style={{ left: `${(hour * 100) / 24}%` }}
                />
              ))}
              {events
                .filter((event) => event.status === row.key)
                .map((event, index) => {
                  const start = Math.max(0, event.start);
                  const end = Math.max(0, Math.min(24, event.end));
                  return (
                    <div
                      key={`${event.label}-${index}`}
                      className={`duty-segment ${row.key}`}
                      style={{
                        left: `${(start * 100) / 24}%`,
                        width: `${((end - start) * 100) / 24}%`,
                      }}
                      title={`${event.label}: ${fmtHours(event.end - event.start)}`}
                    />
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
