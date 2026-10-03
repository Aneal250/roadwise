from datetime import datetime

from django.test import TestCase
from rest_framework.test import APIClient

from planner.schedule import build_schedule


DEPARTURE = datetime(2026, 10, 1, 7, 0)


def flatten(logs):
    rows = []
    for log in logs:
        base = (log["day"] - 1) * 24
        for event in log["events"]:
            rows.append({**event, "abs_start": base + event["start"], "abs_end": base + event["end"]})
    return rows


def labels(logs):
    return [event["label"] for log in logs for event in log["events"]]


def miles_before(logs, label_part):
    driven = 0
    for event in flatten(logs):
        if label_part in event["label"]:
            return driven
        if event["status"] == "drive":
            driven += event["miles"]
    return None


def assert_day_bounds(logs):
    for log in logs:
        total = sum(event["end"] - event["start"] for event in log["events"])
        if abs(total - 24) > 0.05:
            raise AssertionError(f"day {log['day']} covers {total} hours")
        for event in log["events"]:
            if event["start"] < -1e-6 or event["end"] > 24 + 1e-6 or event["end"] <= event["start"]:
                raise AssertionError(f"day {log['day']} has an event outside the log: {event}")


def assert_hos(logs):
    """Property-carrier limits across the stitched 24-hour sheets."""
    since_break = 0.0
    shift_drive = 0.0
    shift_elapsed = 0.0
    off_run = 99.0
    in_shift = False

    for event in flatten(logs):
        duration = event["abs_end"] - event["abs_start"]
        if event["status"] == "off":
            off_run += duration
            if in_shift:
                shift_elapsed += duration
            if duration >= 0.49:
                since_break = 0.0
            if off_run >= 9.99:
                in_shift = False
                shift_drive = 0.0
                shift_elapsed = 0.0
                since_break = 0.0
            continue

        if off_run >= 9.99:
            in_shift = False
            shift_drive = 0.0
            shift_elapsed = 0.0
            since_break = 0.0
        in_shift = True
        off_run = 0.0
        if event["status"] == "on" and duration >= 0.49:
            since_break = 0.0
        shift_elapsed += duration
        if event["status"] != "drive":
            continue
        if since_break > 8.05:
            raise AssertionError(f"drove {since_break}h without a 30-minute break")
        if shift_drive > 11.05:
            raise AssertionError(f"drove {shift_drive}h in one shift")
        if shift_elapsed - duration > 14.05:
            raise AssertionError("driving started after the 14-hour window")
        since_break += duration
        shift_drive += duration
        if since_break > 8.05:
            raise AssertionError(f"drive segment crossed 8 hours ({since_break})")
        if shift_drive > 11.05:
            raise AssertionError(f"drive segment crossed 11 hours ({shift_drive})")
        if shift_elapsed > 14.05:
            raise AssertionError(f"driving ended {shift_elapsed}h after coming on duty")


class ScheduleTests(TestCase):
    def test_short_trip_picks_up_before_driving_and_fits_one_log(self):
        logs = build_schedule(330, 18, DEPARTURE, 0)
        self.assertEqual(sum(log["miles"] for log in logs), 330)
        self.assertEqual(miles_before(logs, "Pickup"), 0)
        self.assertEqual(logs[0]["date"], "2026-10-01")
        self.assertEqual(logs[0]["cycle_remaining"], 43.5)
        self.assertNotIn("30-minute break", labels(logs))
        self.assertEqual(len(logs), 1)
        assert_day_bounds(logs)
        assert_hos(logs)

    def test_deadhead_is_driven_before_pickup(self):
        logs = build_schedule(600, 10, DEPARTURE, 100)
        self.assertEqual(miles_before(logs, "Pickup"), 100)
        self.assertGreater(miles_before(logs, "Drop-off"), 100)
        self.assertEqual(sum(log["miles"] for log in logs), 600)
        assert_day_bounds(logs)
        assert_hos(logs)

    def test_break_fuel_and_split_shift_follow_the_limits(self):
        logs = build_schedule(1200, 10, DEPARTURE, 0)
        self.assertEqual(labels(logs).count("Fuel stop"), 1)
        self.assertGreaterEqual(labels(logs).count("30-minute break"), 1)
        self.assertIn("10-hour rest", labels(logs))
        flat = flatten(logs)
        for index, event in enumerate(flat[:-1]):
            if event["label"] == "Fuel stop":
                self.assertNotEqual(flat[index + 1]["label"], "30-minute break")
        self.assertEqual(sum(log["miles"] for log in logs), 1200)
        assert_day_bounds(logs)
        assert_hos(logs)

    def test_exhausted_cycle_restarts_for_34_hours_and_still_finishes(self):
        logs = build_schedule(200, 69, DEPARTURE, 0)
        restart = [event for event in flatten(logs) if event["label"] == "34-hour cycle restart"]
        self.assertGreaterEqual(sum(event["abs_end"] - event["abs_start"] for event in restart), 34 - 0.05)
        self.assertEqual(logs[0]["events"][0]["label"], "34-hour cycle restart")
        self.assertEqual(logs[0]["on_duty_hours"], 0)
        self.assertEqual(sum(log["miles"] for log in logs), 200)
        assert_day_bounds(logs)
        assert_hos(logs)

    def test_fuel_stop_also_satisfies_the_thirty_minute_break(self):
        logs = build_schedule(1500, 8, DEPARTURE, 560)
        flat = flatten(logs)
        for index, event in enumerate(flat[:-1]):
            if event["label"] == "Fuel stop":
                self.assertNotEqual(flat[index + 1]["label"], "30-minute break")
        self.assertGreaterEqual(labels(logs).count("Fuel stop"), 1)
        self.assertEqual(sum(log["miles"] for log in logs), 1500)
        assert_day_bounds(logs)
        assert_hos(logs)

    def test_long_trip_stays_inside_the_rules(self):
        logs = build_schedule(2500, 50, DEPARTURE, 400)
        self.assertEqual(sum(log["miles"] for log in logs), 2500)
        self.assertEqual(miles_before(logs, "Pickup"), 400)
        self.assertLessEqual(len(logs), 30)
        assert_day_bounds(logs)
        assert_hos(logs)

    def test_eleven_hour_day_does_not_paint_past_midnight(self):
        logs = build_schedule(700, 5, DEPARTURE, 0)
        self.assertGreater(len(logs), 1)
        assert_day_bounds(logs)
        assert_hos(logs)


class PlanApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_health(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "ok")

    def test_plan_accepts_miles_to_pickup(self):
        response = self.client.post(
            "/api/plan/",
            {
                "current_location": "Atlanta, GA",
                "pickup_location": "Chicago, IL",
                "dropoff_location": "Denver, CO",
                "total_miles": 600,
                "miles_to_pickup": 100,
                "cycle_used": 10,
                "departure": "2026-10-01T07:00",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(miles_before(response.json()["logs"], "Pickup"), 100)

    def test_plan_rejects_a_full_cycle_and_a_blank_stop(self):
        cycle = self.client.post(
            "/api/plan/",
            {
                "current_location": "Richmond, VA",
                "pickup_location": "Richmond, VA",
                "dropoff_location": "Newark, NJ",
                "total_miles": 330,
                "cycle_used": 70,
            },
            format="json",
        )
        self.assertEqual(cycle.status_code, 400)
        self.assertIn("70", cycle.json()["error"])

        blank = self.client.post(
            "/api/plan/",
            {
                "current_location": "   ",
                "pickup_location": "Richmond, VA",
                "dropoff_location": "Newark, NJ",
                "total_miles": 330,
                "cycle_used": 10,
            },
            format="json",
        )
        self.assertEqual(blank.status_code, 400)
        self.assertIn("error", blank.json())
