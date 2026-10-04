"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { cityName } from "@/lib/format";
import { samePlace } from "@/lib/geo";
import type { LatLng, MapStop, RouteGeo } from "@/lib/types";

const PLACE_ICONS = ["pin-start", "pin-pickup", "pin-drop"] as const;

function markerIcon(className: string) {
  return L.divIcon({
    className: "pin-wrap",
    html: `<span class="map-pin ${className}"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 16],
  });
}

const ICONS = {
  start: markerIcon(PLACE_ICONS[0]),
  pickup: markerIcon(PLACE_ICONS[1]),
  drop: markerIcon(PLACE_ICONS[2]),
  fuel: markerIcon("pin-fuel"),
  rest: markerIcon("pin-rest"),
};

function FitRoute({ points }: { points: LatLng[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length < 2) return;
    map.fitBounds(points, { padding: [36, 36] });
    map.invalidateSize();
  }, [map, points]);

  return null;
}

type TripMapProps = {
  points: LatLng[];
  route: RouteGeo;
  stops: MapStop[];
  labels: string[];
  miles: number;
};

export default function TripMap({ points, route, stops, labels, miles }: TripMapProps) {
  const center = points[0] ?? ([39.8, -98.5] as LatLng);

  return (
    <div className="map-frame">
      <MapContainer
        center={center}
        zoom={6}
        className="leaflet-map"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.length > 1 && (
          <Polyline
            positions={points}
            pathOptions={{ color: "#1b4240", weight: 4, opacity: 0.9 }}
          />
        )}
        <FitRoute points={points} />
        {route.places.map((place, index) => {
          if (index === 1 && route.places[0] && samePlace(route.places[0], place)) {
            return null;
          }
          return (
            <Marker
              key={`${place.lat}-${place.lon}-${index}`}
              position={[place.lat, place.lon]}
              icon={index === 0 ? ICONS.start : index === 1 ? ICONS.pickup : ICONS.drop}
            >
              <Popup>{labels[index] || place.name}</Popup>
            </Marker>
          );
        })}
        {stops.map((stop) => (
          <Marker
            key={`${stop.kind}-${stop.miles}`}
            position={stop.position}
            icon={stop.kind === "Fuel" ? ICONS.fuel : ICONS.rest}
          >
            <Popup>
              {stop.kind} stop · mile {Math.round(stop.miles).toLocaleString()}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="map-caption">
        <span>
          <i />
          {Math.round(miles).toLocaleString()} mi
        </span>
        <b>
          {cityName(labels[0] || "") || "Origin"} →{" "}
          {cityName(labels[2] || "") || "Destination"}
        </b>
      </div>
    </div>
  );
}
