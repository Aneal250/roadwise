# Roadwise

Roadwise is a trip planner for a property-carrying driver. Enter where the truck is, where the load is picked up, where it is dropped off, and how many hours are already used on the 70-hour cycle. The app returns a driving route, turn-by-turn directions, fuel and rest stops on a map, and a daily log sheet for each day of the trip.

It follows the full-stack assessment: a Django API and a React UI, a free map, and hours-of-service logs for a property carrier on a 70-hour / 8-day cycle, with fuel at least every 1,000 miles and one hour each for pickup and drop-off. No adverse driving conditions are applied.

The logs are a planning estimate. They are not an electronic logging device record.

## What you enter

- Current location, pickup, and drop-off, chosen with Google location search
- Hours already used in the current 70-hour cycle (from 0 up to, but not including, 70)
- Driver name, carrier, truck or tractor number, and shipping document or commodity

The identity fields are required. They appear on every daily log and on the PDF report.

## What you get

- A map of the route with the start, pickup, drop-off, fuel stops, 30-minute breaks, 10-hour rests, and 34-hour restarts
- Turn-by-turn driving directions
- One 24-hour log sheet per day, with a duty graph and remarks
- A downloadable PDF of the route, directions, and every daily log
- A printable view of the logs

## How a plan is built

1. The browser sends each location through a Next.js route that calls the Google Places API. The API key stays on the server.
2. The chosen coordinates are sent to the public OSRM driving service. The first leg is the deadhead from the current location to the pickup. That distance is driven before the one-hour pickup.
3. The frontend posts the routed miles, miles to pickup, and cycle hours to the Django API.
4. Django builds the duty timeline, slices it into 24-hour log days starting at 07:00 local time, and returns the logs.
5. The map places fuel and rest pins along the route from those events.

Driving time is estimated at 55 mph. If the current location and the pickup are the same place, there is no deadhead and the pickup marker is not drawn twice.

## Hours-of-service rules

The schedule uses these property-carrier limits:

| Rule | Value |
| --- | --- |
| Cycle | 70 hours, counting down from the hours already used |
| Driving limit | 11 hours |
| On-duty window | 14 hours |
| Break | 30 minutes after 8 hours of driving |
| Daily rest | 10 hours off duty |
| Cycle restart | 34 hours off duty when the remaining cycle cannot cover the next move |
| Pre-trip | 30 minutes on duty before driving |
| Pickup and drop-off | 1 hour on duty each |
| Fuel | 30 minutes on duty at least every 1,000 miles |

A fuel stop is on duty and not driving, so it also satisfies the 30-minute break. The cycle is a single hours-used total: it counts down and returns to 70 only after a 34-hour restart. It does not reconstruct a rolling 8-day recap. Events are clipped so no log sheet runs past 24 hours, and the remainder of a day is filled as off duty.

## Stack

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4
- **Map:** Leaflet and OpenStreetMap tiles
- **Locations:** Google Places API (New), proxied by `frontend/app/api/places`
- **Routing:** [OSRM](https://project-osrm.org/) public driving service
- **PDF:** jsPDF, generated in the browser
- **Backend:** Django 5.2, Django REST Framework, OpenAPI docs via drf-spectacular

The API does not store trips. SQLite is configured, and the planner has no models.

## Project layout

```text
backend/
  ena_spotter/          Django project settings and root URLs
  planner/
    schedule.py         Hours-of-service timeline and daily logs
    views.py            Health check and trip plan endpoints
    serializers.py      Request and response validation
    tests.py            Schedule and API tests
frontend/
  app/                  Planner page, styles, and Places proxy
  app/components/       Form, map, logs, and results
  lib/                  Routing, geocoding, and the PDF report
```

## Run it locally

Use two terminals. Python 3.13 and Node.js are enough for local development.

**API** (http://localhost:8000):

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py runserver
```

**App** (http://localhost:3000):

```bash
cd frontend
npm install
npm run dev
```

Create `frontend/.env.local` before starting the app, then restart `npm run dev` if the file is added later:

```bash
GOOGLE_MAPS_API_KEY=your-google-maps-key
```

The key needs the Places API (New). An optional `NEXT_PUBLIC_API_URL` overrides the API base URL. It defaults to `http://localhost:8000`.

Interactive API docs are at http://localhost:8000/api/docs/.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/health/` | Returns `{ "status": "ok" }` |
| `POST` | `/api/plan/` | Builds daily logs from routed miles and cycle hours |

`POST /api/plan/` accepts `current_location`, `pickup_location`, `dropoff_location`, `total_miles`, `miles_to_pickup`, `cycle_used`, and an optional `departure` in `YYYY-MM-DDTHH:MM`. Departure defaults to today at 07:00. The response includes the daily logs, total miles, estimated driving hours, estimated days, and the 55 mph planning speed.

While `DEBUG` is true, the API allows any browser origin. For a deployed API, set `CORS_ALLOWED_ORIGINS` to the frontend origin and set `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=false`, and `DJANGO_ALLOWED_HOSTS`.

## Tests

From `backend`, with the virtual environment active:

```bash
python manage.py test planner
```

The tests cover short trips, deadhead before pickup, fuel stops, the 30-minute break, the 10-hour rest, the 34-hour restart, 24-hour log bounds, and request validation.
