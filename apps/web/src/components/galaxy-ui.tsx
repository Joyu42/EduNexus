import type { ReactNode } from "react";

type HeroMetric = {
  label: string;
  value: string;
  hint?: string;
};

type GalaxyHeroProps = {
  badge: string;
  title: string;
  description: string;
  quote: string;
  chips?: string[];
  metrics?: HeroMetric[];
  actions?: ReactNode;
};

export function GalaxyHero({
  badge,
  title,
  description,
  quote,
  chips = [],
  metrics = [],
  actions
}: GalaxyHeroProps) {
  return (
    <article className="panel hero galaxy-hero">
      <div>
        <span className="headline-badge">{badge}</span>
        <h3 className="galaxy-hero-title">{title}</h3>
        <p className="muted">{description}</p>
        {chips.length > 0 ? (
          <div className="chip-row">
            {chips.map((chip) => (
              <span className="feature-chip" key={chip}>
                {chip}
              </span>
            ))}
          </div>
        ) : null}
        {actions ? <div className="galaxy-hero-actions">{actions}</div> : null}
      </div>

      <div className="galaxy-hero-side">
        <p className="hero-quote">{quote}</p>
        {metrics.length > 0 ? (
          <div className="hero-metric-grid">
            {metrics.map((metric) => (
              <div className="hero-metric-card" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                {metric.hint ? <em>{metric.hint}</em> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

type SpotlightProps = {
  title: string;
  description: string;
  status?: string;
};

export function GalaxySpotlight({ title, description, status }: SpotlightProps) {
  return (
    <div className="galaxy-spotlight">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {status ? <span className="galaxy-status">{status}</span> : null}
    </div>
  );
}
