from datetime import datetime
from pathlib import Path
from django.http import HttpResponse
from django.views.decorators.http import require_GET
from drf_spectacular.utils import OpenApiExample, extend_schema
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .schedule import AVERAGE_SPEED_MPH, build_schedule
from .serializers import ErrorResponseSerializer, HealthResponseSerializer, PlanRequestSerializer, PlanResponseSerializer

@require_GET
def favicon(request):
    icon_path = Path(__file__).parent / "static" / "planner" / "favicon.svg"
    return HttpResponse(icon_path.read_text(), content_type="image/svg+xml")

@extend_schema(operation_id="healthCheck", summary="Check API health", responses=HealthResponseSerializer)
@api_view(["GET"])
def health(request):
    return Response({"status": "ok", "service": "ena-spotter-api"})

def _first_error(errors):
    if isinstance(errors, dict):
        for value in errors.values():
            return _first_error(value)
    if isinstance(errors, list):
        return _first_error(errors[0]) if errors else "Check the trip details and try again."
    return str(errors)


def _departure(value):
    if not value:
        return datetime.now().replace(hour=7, minute=0, second=0, microsecond=0)
    try:
        return datetime.strptime(str(value), "%Y-%m-%dT%H:%M")
    except ValueError as exc:
        raise ValueError("Departure must use YYYY-MM-DDTHH:MM.") from exc


@extend_schema(
    operation_id="planTrip",
    summary="Create an HOS-aware trip plan",
    description="Builds duty logs from routed mileage and the driver's current cycle hours. Miles to pickup are driven before the one-hour pickup. The public route is calculated by the frontend.",
    request=PlanRequestSerializer,
    responses={200: PlanResponseSerializer, 400: ErrorResponseSerializer},
    examples=[OpenApiExample("Short trip", value={"current_location": "Richmond, VA", "pickup_location": "Richmond, VA", "dropoff_location": "Newark, NJ", "total_miles": 330.0, "miles_to_pickup": 0, "cycle_used": 18.0, "departure": "2026-10-01T07:00"}, request_only=True)],
)
@api_view(["POST"])
def plan_trip(request):
    serializer = PlanRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({"error": _first_error(serializer.errors)}, status=400)
    data = serializer.validated_data
    try:
        departure = _departure(data.get("departure"))
        miles = data["total_miles"]
        logs = build_schedule(miles, data["cycle_used"], departure, data.get("miles_to_pickup", 0))
    except ValueError as exc:
        return Response({"error": str(exc)}, status=400)
    return Response(
        {
            "logs": logs,
            "total_miles": round(miles),
            "estimated_driving_hours": round(miles / AVERAGE_SPEED_MPH, 1),
            "estimated_days": sum(1 for log in logs if log["driving_hours"] > 0),
            "cycle_used": data["cycle_used"],
            "average_speed_mph": int(AVERAGE_SPEED_MPH),
            "inputs": {
                "current_location": data["current_location"],
                "pickup_location": data["pickup_location"],
                "dropoff_location": data["dropoff_location"],
            },
        }
    )
