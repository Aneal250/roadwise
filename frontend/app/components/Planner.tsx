"use client";

import { EmptyHint } from "./EmptyHint";
import { Hero } from "./Hero";
import { SiteFooter } from "./SiteFooter";
import { TopBar } from "./TopBar";
import { TripFormCard } from "./TripFormCard";
import { TripResults } from "./TripResults";
import { useTripPlanner } from "./useTripPlanner";

export function Planner() {
  const trip = useTripPlanner();

  return (
    <main className="app-shell">
      <TopBar />
      <Hero origin={trip.form.current} destination={trip.form.dropoff} />
      <TripFormCard
        form={trip.form}
        busy={trip.busy}
        error={trip.error}
        onChange={trip.update}
        onLocationChange={trip.updateLocation}
        onLocationSelect={trip.selectLocation}
        onSubmit={trip.generate}
      />
      {!trip.plan && <EmptyHint />}
      {trip.plan && trip.route && (
        <TripResults
          plan={trip.plan}
          route={trip.route}
          form={trip.form}
          miles={trip.miles}
          hours={trip.hours}
          fuelStops={trip.fuelStops}
          mins={trip.mins}
          points={trip.points}
          stops={trip.stops}
        />
      )}
      <SiteFooter />
    </main>
  );
}
