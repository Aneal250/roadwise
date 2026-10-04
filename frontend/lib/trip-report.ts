import { jsPDF } from "jspdf";
import { DUTY_ROWS } from "./constants";
import { cityName, fmtHours, formatClockMinutes, formatLogDate } from "./format";
import type { DailyLog, DutyEvent, MapStop, TripForm, TripPlan } from "./types";

const PAGE_W = 215.9;
const PAGE_H = 279.4;
const MARGIN = 14;
const INK: [number, number, number] = [28, 47, 46];
const MUTED: [number, number, number] = [120, 134, 126];
const GREEN: [number, number, number] = [24, 60, 57];
const LINE: [number, number, number] = [226, 232, 226];

const DUTY_COLORS: Record<DutyEvent["status"], [number, number, number]> = {
  off: [174, 187, 177],
  sleeper: [131, 149, 175],
  drive: [34, 76, 69],
  on: [223, 166, 102],
};

type ReportInput = {
  form: TripForm;
  plan: TripPlan;
  miles: number;
  hours: number;
  fuelStops: number;
  mins: number | null;
  stops: MapStop[];
};

export function createTripReport(input: ReportInput) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  drawSummary(doc, input);
  input.plan.logs.forEach((log, index) => {
    doc.addPage();
    drawLog(doc, input, log, index);
  });
  stampPages(doc);
  return doc;
}

export async function downloadTripReport(input: ReportInput) {
  createTripReport(input).save(reportFileName(input.form, input.plan));
}

function drawSummary(doc: jsPDF, input: ReportInput) {
  const { form, plan, miles, hours, fuelStops, mins, stops } = input;
  let y = drawBanner(doc, "Trip report", `${cityName(form.current)} to ${cityName(form.dropoff)}`);

  y = sectionTitle(doc, y, "Log details");
  y = fieldGrid(doc, y, [
    ["Driver", form.driver.trim()],
    ["Carrier", form.carrier.trim()],
    ["Vehicle", form.vehicle.trim()],
    ["Shipment", form.shipping.trim()],
  ]);

  y = sectionTitle(doc, y + 2, "Route");
  y = fieldGrid(doc, y, [
    ["Current location", form.current],
    ["Pickup", form.pickup],
    ["Drop-off", form.dropoff],
    ["Cycle used", `${form.cycle} h of 70`],
    ["Distance", `${Math.round(miles).toLocaleString()} mi`],
    ["Wheel time", `${fmtHours(hours)} at 55 mph`],
    ["Driving days", String(plan.estimated_days)],
    ["Route estimate", mins ? formatClockMinutes(mins) : "Unavailable"],
    ["Fuel stops", String(fuelStops)],
    ["Cycle left", `${plan.logs.at(-1)?.cycle_remaining ?? "—"} h`],
  ]);

  if (stops.length) {
    y = sectionTitle(doc, y + 2, "Stops along the route");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...INK);
    stops.forEach((stop) => {
      y = ensureSpace(doc, y, 6);
      doc.text(`${stop.kind} stop · mile ${Math.round(stop.miles).toLocaleString()}`, MARGIN, y);
      y += 5;
    });
  }

  y = ensureSpace(doc, y + 4, 16);
  doc.setFontSize(8);
  doc.setTextColor(...MUTED);
  const note = doc.splitTextToSize(
    "Planning estimate, not an ELD record. Duty times use 55 mph and a 07:00 log start. Confirm the truck-legal route, stops, and duty history before driving.",
    PAGE_W - MARGIN * 2,
  );
  doc.text(note, MARGIN, y);
}

function drawLog(doc: jsPDF, input: ReportInput, log: DailyLog, index: number) {
  const { form } = input;
  let y = drawBanner(
    doc,
    `Daily log ${String(log.day).padStart(2, "0")}`,
    formatLogDate(log.date),
  );

  y = fieldGrid(doc, y, [
    ["Driver", form.driver.trim()],
    ["Carrier", form.carrier.trim()],
    ["Vehicle", form.vehicle.trim()],
    ["Shipment", form.shipping.trim()],
    ["From", index === 0 ? form.current : "Continuing trip"],
    ["Toward", form.dropoff],
    ["Miles", String(log.miles)],
    ["Driving", fmtHours(log.driving_hours)],
    ["On duty", fmtHours(log.on_duty_hours)],
    ["Cycle left", `${log.cycle_remaining} h`],
  ]);

  y = sectionTitle(doc, y + 3, "24-hour duty status · period begins 07:00");
  y = drawDutyGrid(doc, y, log.events);

  const sums = dutySums(log);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  doc.text(
    `Off ${fmtHours(sums.off)}    Sleeper ${fmtHours(sums.sleeper)}    Driving ${fmtHours(sums.drive)}    On duty ${fmtHours(sums.on)}`,
    MARGIN,
    y,
  );

  const remarks = log.events
    .filter((event) => event.label !== "Off duty" && event.status !== "drive" && event.end > event.start)
    .map((event) => event.label);
  y = sectionTitle(doc, y + 6, "Remarks");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  const remarkText = [
    index === 0 ? `Start · ${form.current}` : "Continuing the trip",
    ...remarks,
    log.miles > 0 ? `Daily route · ${log.miles} mi` : "",
  ]
    .filter(Boolean)
    .join("   ·   ");
  const lines = doc.splitTextToSize(remarkText, PAGE_W - MARGIN * 2);
  doc.text(lines, MARGIN, y);
}

function drawBanner(doc: jsPDF, title: string, subtitle: string) {
  doc.setFillColor(...GREEN);
  doc.rect(0, 0, PAGE_W, 24, "F");
  doc.setTextColor(244, 247, 242);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("roadwise", MARGIN, 10);
  doc.setFontSize(16);
  doc.text(title, MARGIN, 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(subtitle, PAGE_W - MARGIN, 18, { align: "right" });
  return 32;
}

function sectionTitle(doc: jsPDF, y: number, title: string) {
  y = ensureSpace(doc, y, 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...GREEN);
  doc.text(title, MARGIN, y);
  return y + 6;
}

function fieldGrid(doc: jsPDF, y: number, rows: [string, string][]) {
  const colW = (PAGE_W - MARGIN * 2) / 2;
  for (let index = 0; index < rows.length; index += 2) {
    y = ensureSpace(doc, y, 11);
    drawField(doc, MARGIN, y, colW - 4, rows[index]);
    if (rows[index + 1]) drawField(doc, MARGIN + colW, y, colW - 4, rows[index + 1]);
    y += 11;
  }
  return y;
}

function drawField(doc: jsPDF, x: number, y: number, width: number, [label, value]: [string, string]) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  doc.text(label.toUpperCase(), x, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...INK);
  const lines = doc.splitTextToSize(value || "—", width);
  doc.text(lines.slice(0, 2), x, y + 4);
}

function drawDutyGrid(doc: jsPDF, y: number, events: DutyEvent[]) {
  const labelW = 34;
  const gridX = MARGIN + labelW;
  const gridW = PAGE_W - MARGIN - gridX;
  const rowH = 7;

  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  for (let hour = 0; hour <= 24; hour += 6) {
    const label = hour === 24 ? "07" : String((7 + hour) % 24).padStart(2, "0");
    const x = gridX + (hour / 24) * gridW;
    doc.text(label, x, y, { align: hour === 24 ? "right" : "left" });
  }
  y += 2;

  DUTY_ROWS.forEach((row) => {
    doc.setDrawColor(...LINE);
    doc.setFillColor(248, 249, 247);
    doc.rect(gridX, y, gridW, rowH, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(row.label, MARGIN, y + 4.5);
    doc.setFillColor(...DUTY_COLORS[row.key]);
    events
      .filter((event) => event.status === row.key)
      .forEach((event) => {
        const start = Math.max(0, Math.min(24, event.start));
        const end = Math.max(start, Math.min(24, event.end));
        const width = ((end - start) / 24) * gridW;
        if (width <= 0.2) return;
        doc.rect(gridX + (start / 24) * gridW, y + 1.6, width, rowH - 3.2, "F");
      });
    for (let hour = 0; hour <= 24; hour += 1) {
      doc.setDrawColor(hour % 6 === 0 ? 210 : 232, hour % 6 === 0 ? 216 : 234, hour % 6 === 0 ? 210 : 230);
      const x = gridX + (hour / 24) * gridW;
      doc.line(x, y, x, y + rowH);
    }
    y += rowH;
  });
  return y;
}

function dutySums(log: DailyLog) {
  const sums = { off: 0, sleeper: 0, drive: 0, on: 0 };
  log.events.forEach((event) => {
    sums[event.status] += Math.max(0, event.end - event.start);
  });
  return sums;
}

function ensureSpace(doc: jsPDF, y: number, needed: number) {
  if (y + needed <= PAGE_H - 16) return y;
  doc.addPage();
  return 18;
}

function stampPages(doc: jsPDF) {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Planning estimate, not an ELD record.", MARGIN, PAGE_H - 8);
    doc.text(`${page} / ${total}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
  }
}

function reportFileName(form: TripForm, plan: TripPlan) {
  const from = slug(cityName(form.current));
  const to = slug(cityName(form.dropoff));
  const date = plan.logs[0]?.date ?? "trip";
  return `roadwise-${from}-to-${to}-${date}.pdf`;
}

function slug(value: string) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return cleaned || "trip";
}
