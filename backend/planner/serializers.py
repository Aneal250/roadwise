from rest_framework import serializers


class PlanRequestSerializer(serializers.Serializer):
    current_location = serializers.CharField(help_text="Driver's starting location, preferably city and state.")
    pickup_location = serializers.CharField(help_text="Shipment pickup location.")
    dropoff_location = serializers.CharField(help_text="Shipment destination.")
    total_miles = serializers.FloatField(min_value=0, max_value=20000, help_text="Calculated route distance in miles; must be greater than zero.")
    miles_to_pickup = serializers.FloatField(
        required=False,
        default=0,
        min_value=0,
        help_text="Miles from the current location to the pickup. Driven before the one-hour pickup stop.",
    )
    cycle_used = serializers.FloatField(min_value=0, help_text="Hours already used in the current 70-hour cycle; must be less than 70.")
    departure = serializers.CharField(required=False, allow_blank=True, help_text="Local log-period start in YYYY-MM-DDTHH:MM format. Defaults to today at 07:00.")

    def validate(self, attrs):
        for key in ("current_location", "pickup_location", "dropoff_location"):
            attrs[key] = attrs[key].strip()
            if not attrs[key]:
                raise serializers.ValidationError("Enter a current location, pickup, and drop-off.")
        total = attrs["total_miles"]
        pickup = attrs.get("miles_to_pickup") or 0
        if total <= 0:
            raise serializers.ValidationError("The route must be between 1 and 20,000 miles.")
        if pickup > total:
            if pickup - total <= 1:
                attrs["miles_to_pickup"] = total
            else:
                raise serializers.ValidationError("Pickup miles cannot exceed the total route.")
        cycle = attrs["cycle_used"]
        if cycle >= 70:
            raise serializers.ValidationError("Cycle used must be from 0 up to (but not including) 70 hours.")
        return attrs


class TripInputSerializer(serializers.Serializer):
    current_location = serializers.CharField()
    pickup_location = serializers.CharField()
    dropoff_location = serializers.CharField()


class DutyEventSerializer(serializers.Serializer):
    start = serializers.FloatField(help_text="Hours from the beginning of the 24-hour log period.")
    end = serializers.FloatField(help_text="Hours from the beginning of the 24-hour log period.")
    status = serializers.ChoiceField(choices=["off", "sleeper", "drive", "on"])
    label = serializers.CharField()
    miles = serializers.IntegerField()


class DailyLogSerializer(serializers.Serializer):
    day = serializers.IntegerField()
    date = serializers.DateField()
    miles = serializers.IntegerField()
    events = DutyEventSerializer(many=True)
    driving_hours = serializers.FloatField()
    on_duty_hours = serializers.FloatField()
    cycle_remaining = serializers.FloatField()


class PlanResponseSerializer(serializers.Serializer):
    logs = DailyLogSerializer(many=True)
    total_miles = serializers.IntegerField()
    estimated_driving_hours = serializers.FloatField()
    estimated_days = serializers.IntegerField()
    cycle_used = serializers.FloatField()
    average_speed_mph = serializers.IntegerField()
    inputs = TripInputSerializer()


class ErrorResponseSerializer(serializers.Serializer):
    error = serializers.CharField()


class HealthResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    service = serializers.CharField()
