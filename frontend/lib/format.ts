import type { OsrmLeg, RouteStep } from "./types";

const MANEUVER_LABELS: Record<string, string> = {
  depart: "Depart",
  arrive: "Arrive",
  turn: "Turn",
  "end of road": "At the end of the road, turn",
  fork: "Keep",
  merge: "Merge",
  "on ramp": "Take the ramp",
  "off ramp": "Take the exit",
  continue: "Continue",
  "new name": "Continue",
  roundabout: "At the roundabout",
};

const ONTO_TYPES = new Set([
  "turn",
  "fork",
  "merge",
  "continue",
  "new name",
]);

export function fmtHours(value: number) {
  const mins = Math.round(value * 60);
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

export function formatClockMinutes(totalMinutes: number) {
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

export function cityName(value: string) {
  return value.split(",")[0]?.trim() ?? "";
}

export function formatLogDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function formatInstructions(legs: OsrmLeg[]): RouteStep[] {
  return legs
    .flatMap((leg) =>
      (leg.steps ?? []).map((step) => {
        const move = step.maneuver ?? {};
        const type = move.type || "continue";
        const direction = move.modifier ? ` ${move.modifier}` : "";
        const road = step.name || "the road";
        const label = MANEUVER_LABELS[type] || "Continue";
        let text = `${label}${direction} on ${road}`;
        if (ONTO_TYPES.has(type)) text = `${label}${direction} onto ${road}`;
        if (type === "roundabout") {
          text = `At the roundabout, take exit ${move.exit || ""} onto ${road}`;
        }
        if (type === "arrive") text = `Arrive via ${road}`;
        return {
          text: `${text}.`,
          miles: step.distance / 1609.344,
          minutes: step.duration / 60,
        };
      }),
    )
    .filter((step) => step.miles > 0.02);
}

export function localDeparture(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T07:00`;
}
