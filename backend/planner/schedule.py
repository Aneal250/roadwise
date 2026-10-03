"""Property-carrier hours-of-service schedule.

Durations are hours. The log day starts at 07:00 local time and each sheet
covers exactly 24 hours. The cycle input is a single hours-used total, so the
70-hour clock counts down from that value and resets only after 34 consecutive
hours off duty.
"""

import math
from datetime import timedelta

AVERAGE_SPEED_MPH = 55.0
PRE_TRIP_HOURS = 0.5
STOP_HOURS = 1.0
BREAK_HOURS = 0.5
FUEL_HOURS = 0.5
FUEL_EVERY_MILES = 1000.0
DRIVE_LIMIT = 11.0
WINDOW_LIMIT = 14.0
BREAK_AFTER = 8.0
RESET_HOURS = 10.0
RESTART_HOURS = 34.0
CYCLE_LIMIT = 70.0
DAY_HOURS = 24.0
MAX_DAYS = 30


def build_schedule(total_miles, cycle_used, departure, miles_to_pickup=0.0):
    """Build one 24-hour log per day for a property-carrying trip."""
    total = float(total_miles)
    pickup_mile = float(miles_to_pickup or 0)
    if not math.isfinite(total) or total <= 0 or total > 20000:
        raise ValueError("The route must be between 1 and 20,000 miles.")
    if not math.isfinite(pickup_mile) or pickup_mile < 0 or pickup_mile > total + 1:
        raise ValueError("Pickup miles cannot exceed the total route.")
    pickup_mile = min(pickup_mile, total)

    cycle_left = CYCLE_LIMIT - float(cycle_used)
    if not math.isfinite(cycle_left) or cycle_left <= 0:
        raise ValueError("The 70-hour cycle is exhausted. Enter a cycle restart before planning this trip.")

    timeline = _Timeline(cycle_left)
    mile = 0.0
    since_fuel = 0.0
    pickup_done = False
    dropoff_done = False

    for _ in range(MAX_DAYS * 3):
        if timeline.t > MAX_DAYS * DAY_HOURS:
            break

        # Don't start a shift that cannot both cover the required stop and move the truck.
        if cycle_left < _needed_to_continue(mile, total, pickup_done, pickup_mile):
            cycle_left = _restart(timeline)
            continue

        shift_start = timeline.t
        driving_shift = 0.0
        since_break = 0.0

        if mile < total - 0.01:
            cycle_left = _duty(timeline, PRE_TRIP_HOURS, "on", "Pre-trip inspection", cycle_left)

        for _step in range(80):
            if not pickup_done and mile >= pickup_mile - 0.01:
                if cycle_left < STOP_HOURS and mile < total - 0.01:
                    break
                cycle_left = _duty(timeline, STOP_HOURS, "on", "Pickup · loading", cycle_left)
                pickup_done = True
                since_break = 0.0
                continue

            if mile >= total - 0.01:
                cycle_left = _duty(timeline, STOP_HOURS, "on", "Drop-off · unloading", cycle_left)
                dropoff_done = True
                break

            window_left = WINDOW_LIMIT - (timeline.t - shift_start)
            drive_left = DRIVE_LIMIT - driving_shift
            if window_left <= 0.02 or drive_left <= 0.02 or cycle_left <= 0.02:
                break

            # A fuel stop is on-duty, not driving, so it also satisfies the 30-minute break.
            if since_fuel >= FUEL_EVERY_MILES - 0.05:
                if cycle_left < FUEL_HOURS - 1e-6:
                    break
                cycle_left = _duty(timeline, FUEL_HOURS, "on", "Fuel stop", cycle_left)
                since_fuel = 0.0
                since_break = 0.0
                continue

            if since_break >= BREAK_AFTER - 0.02:
                timeline.add(BREAK_HOURS, "off", "30-minute break", cycle_after=cycle_left)
                since_break = 0.0
                continue

            hours_can = min(window_left, drive_left, BREAK_AFTER - since_break, cycle_left)
            miles_can = hours_can * AVERAGE_SPEED_MPH
            gaps = [total - mile, FUEL_EVERY_MILES - since_fuel]
            if not pickup_done:
                gaps.append(pickup_mile - mile)
            segment = min([miles_can, *[gap for gap in gaps if gap > 0]])
            if segment <= 0.01:
                break

            drive_hours = segment / AVERAGE_SPEED_MPH
            cycle_left = max(0.0, cycle_left - drive_hours)
            timeline.add(drive_hours, "drive", "Driving", miles=segment, cycle_after=cycle_left)
            mile += segment
            since_fuel += segment
            since_break += drive_hours
            driving_shift += drive_hours
        else:
            raise ValueError("This trip exceeds the planner's 30-day horizon. Check route length and cycle hours.")

        if dropoff_done:
            break

        if cycle_left < _needed_to_continue(mile, total, pickup_done, pickup_mile):
            cycle_left = _restart(timeline)
        else:
            timeline.add(RESET_HOURS, "off", "10-hour rest", cycle_after=cycle_left)
    else:
        dropoff_done = False

    if not dropoff_done:
        raise ValueError("This trip exceeds the planner's 30-day horizon. Check route length and cycle hours.")

    logs = _slice_logs(timeline.events, departure)
    _reconcile_miles(logs, total)
    return logs


def _needed_to_continue(mile, total, pickup_done, pickup_mile):
    if mile >= total - 0.01:
        return 0.0
    needs_pickup = not pickup_done and mile >= pickup_mile - 0.01
    return PRE_TRIP_HOURS + (STOP_HOURS if needs_pickup else 0.0) + 0.25


def _duty(timeline, hours, status, label, cycle_left):
    cycle_left = max(0.0, cycle_left - hours)
    timeline.add(hours, status, label, cycle_after=cycle_left)
    return cycle_left


def _restart(timeline):
    # Driving is not allowed during the restart, so the sheet shows no usable cycle until it ends.
    timeline.cycle = 0.0
    timeline.add(RESTART_HOURS, "off", "34-hour cycle restart", cycle_after=CYCLE_LIMIT)
    return CYCLE_LIMIT


class _Timeline:
    def __init__(self, cycle_left):
        self.events = []
        self.t = 0.0
        self.cycle = float(cycle_left)

    def add(self, hours, status, label, miles=0.0, cycle_after=0.0):
        hours = float(hours)
        if hours <= 1e-6:
            return
        self.events.append(
            {
                "start": self.t,
                "end": self.t + hours,
                "status": status,
                "label": label,
                "miles": float(miles),
                "cycle_before": self.cycle,
                "cycle_after": float(cycle_after),
            }
        )
        self.t += hours
        self.cycle = float(cycle_after)


def _slice_logs(events, departure):
    horizon = events[-1]["end"]
    if horizon > MAX_DAYS * DAY_HOURS + 1:
        raise ValueError("This trip exceeds the planner's 30-day horizon. Check route length and cycle hours.")

    day_count = int(horizon // DAY_HOURS)
    if horizon - day_count * DAY_HOURS > 1e-4:
        day_count += 1
    day_count = max(1, day_count)
    start_date = departure.date()
    logs = []

    for day in range(day_count):
        day_start = day * DAY_HOURS
        day_end = day_start + DAY_HOURS
        pieces = []
        cycle_remaining = events[0]["cycle_before"]
        for event in events:
            if event["end"] <= day_start + 1e-8:
                cycle_remaining = event["cycle_after"]
                continue
            if event["start"] >= day_end - 1e-8:
                break
            piece_start = max(event["start"], day_start) - day_start
            piece_end = min(event["end"], day_end) - day_start
            full = event["end"] - event["start"]
            miles = event["miles"] * ((piece_end - piece_start) / full) if event["status"] == "drive" and full else 0.0
            pieces.append(
                {
                    "start": piece_start,
                    "end": piece_end,
                    "status": event["status"],
                    "label": event["label"],
                    "miles": miles,
                }
            )
            cycle_remaining = event["cycle_after"] if event["end"] <= day_end + 1e-6 else event["cycle_before"]

        closed = _close_day(pieces)
        drive = sum(item["end"] - item["start"] for item in closed if item["status"] == "drive")
        on_duty = sum(item["end"] - item["start"] for item in closed if item["status"] == "on")
        logs.append(
            {
                "day": day + 1,
                "date": (start_date + timedelta(days=day)).strftime("%Y-%m-%d"),
                "miles": sum(item["miles"] for item in closed),
                "events": closed,
                "driving_hours": round(drive, 2),
                "on_duty_hours": round(drive + on_duty, 2),
                "cycle_remaining": round(max(0.0, cycle_remaining), 1),
            }
        )
    return logs


def _close_day(pieces):
    pieces = sorted(pieces, key=lambda item: item["start"])
    closed = []
    for piece in pieces:
        start = closed[-1]["end"] if closed and piece["start"] < closed[-1]["end"] else piece["start"]
        end = piece["end"]
        if end - start <= 1e-4:
            continue
        closed.append({**piece, "start": start, "end": end})

    cursor = closed[-1]["end"] if closed else 0.0
    if cursor < DAY_HOURS - 1e-4:
        closed.append({"start": cursor, "end": DAY_HOURS, "status": "off", "label": "Off duty", "miles": 0.0})

    for item in closed:
        item["start"] = round(item["start"], 4)
        item["end"] = round(min(DAY_HOURS, item["end"]), 4)
        item["miles"] = int(round(item["miles"]))
    if closed:
        closed[-1]["end"] = DAY_HOURS
        if closed[-1]["start"] >= DAY_HOURS:
            closed[-1]["start"] = round(DAY_HOURS - 0.01, 2)
    return closed


def _reconcile_miles(logs, total):
    target = int(round(total))
    delta = target - sum(log["miles"] for log in logs)
    if delta == 0:
        return
    for log in reversed(logs):
        for event in reversed(log["events"]):
            if event["status"] == "drive" and event["miles"] + delta >= 0:
                event["miles"] += delta
                log["miles"] += delta
                return
