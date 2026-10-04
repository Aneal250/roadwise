import { Eyebrow } from "./Eyebrow";
import { cityName } from "@/lib/format";

export function Hero({ origin, destination }: { origin: string; destination: string }) {
  return (
    <section className="hero">
      <div>
        <Eyebrow>DRIVER WORKSPACE</Eyebrow>
        <h1>
          Make every mile
          <br />
          <em>count.</em>
        </h1>
        <p>
          Plan an HOS-aware route, know where the day ends, and keep every log
          in one place.
        </p>
      </div>
      <div className="hero-side">
        <div className="hero-label">YOUR ROAD, PLANNED</div>
        <div className="hero-route">
          <span>{cityName(origin) || "Origin"}</span>
          <span className="route-dash" />
          <span>{cityName(destination) || "Destination"}</span>
        </div>
        <small>
          <span className="live-dot" /> Built around property-carrier HOS rules
        </small>
      </div>
    </section>
  );
}
