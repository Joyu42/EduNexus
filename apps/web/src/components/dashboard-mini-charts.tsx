"use client";

import { useMemo, useState, type MouseEvent } from "react";

type TrendSparkCardProps = {
  id: string;
  title: string;
  value: string;
  delta: string;
  points: number[];
  labels: string[];
  activeIndex?: number | null;
  onActiveIndexChange?: (next: number | null) => void;
  locked?: boolean;
};

type RatioRingProps = {
  label: string;
  value: number;
  hint: string;
};

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, value));
}

function buildSparklinePoints(points: number[], width: number, height: number) {
  if (points.length === 0) {
    return [] as Array<{ x: number; y: number; point: number }>;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  return points.map((point, index) => {
    const x = (index / Math.max(1, points.length - 1)) * width;
    const y = height - ((point - min) / range) * height;
    return { x, y, point };
  });
}

function pickClosestPointIndex(
  event: MouseEvent<SVGSVGElement>,
  pointCount: number,
  width: number
) {
  if (pointCount <= 1) {
    return 0;
  }

  const rect = event.currentTarget.getBoundingClientRect();
  const x = Math.max(0, Math.min(width, event.clientX - rect.left));
  const ratio = x / width;
  return Math.max(0, Math.min(pointCount - 1, Math.round(ratio * (pointCount - 1))));
}

export function TrendSparkCard({
  id,
  title,
  value,
  delta,
  points,
  labels,
  activeIndex,
  onActiveIndexChange,
  locked = false
}: TrendSparkCardProps) {
  const width = 208;
  const height = 64;
  const [internalActiveIndex, setInternalActiveIndex] = useState<number | null>(null);

  const chartPoints = useMemo(
    () => buildSparklinePoints(points, width, height),
    [points, width, height]
  );

  const polylinePoints = chartPoints.map((item) => `${item.x},${item.y}`).join(" ");
  const areaPoints =
    chartPoints.length > 0
      ? `0,${height} ${polylinePoints} ${width},${height}`
      : `0,${height} ${width},${height}`;

  const gradientId = `spark_gradient_${id}`;
  const deltaClass =
    delta.startsWith("+") ? "trend-delta trend-delta-up" : "trend-delta trend-delta-down";

  const resolvedActiveIndex =
    typeof activeIndex === "number" || activeIndex === null ? activeIndex : internalActiveIndex;

  function updateActiveIndex(next: number | null) {
    if (onActiveIndexChange) {
      onActiveIndexChange(next);
      return;
    }
    setInternalActiveIndex(next);
  }

  const hoverPoint =
    resolvedActiveIndex !== null && chartPoints[resolvedActiveIndex]
      ? chartPoints[resolvedActiveIndex]
      : null;

  return (
    <article className={`trend-card ${locked ? "locked" : ""}`}>
      <header>
        <span>{title}</span>
        <strong>{value}</strong>
      </header>
      <p className={deltaClass}>{delta}</p>

      <div className="trend-chart-wrap">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="trend-spark"
          role="img"
          aria-label={title}
          onMouseMove={(event) =>
            updateActiveIndex(pickClosestPointIndex(event, chartPoints.length, width))
          }
          onMouseLeave={() => updateActiveIndex(null)}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(97, 199, 255, 0.42)" />
              <stop offset="100%" stopColor="rgba(97, 199, 255, 0.02)" />
            </linearGradient>
          </defs>

          <polygon points={areaPoints} fill={`url(#${gradientId})`} />
          <polyline points={polylinePoints} fill="none" className="trend-line" />

          {hoverPoint ? (
            <g>
              <line
                x1={hoverPoint.x}
                y1="0"
                x2={hoverPoint.x}
                y2={height}
                className="trend-hover-line"
              />
              <circle
                cx={hoverPoint.x}
                cy={hoverPoint.y}
                r="3.8"
                className="trend-hover-dot"
              />
            </g>
          ) : null}
        </svg>

        {hoverPoint && resolvedActiveIndex !== null ? (
          <div className="trend-tooltip">
            <span>{labels[resolvedActiveIndex] ?? `点 ${resolvedActiveIndex + 1}`}</span>
            <strong>{hoverPoint.point}</strong>
          </div>
        ) : null}
      </div>
    </article>
  );
}

export function RatioRing({ label, value, hint }: RatioRingProps) {
  const safeValue = clampPercentage(value);
  const radius = 36;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - safeValue / 100);

  return (
    <div className="ratio-ring">
      <svg viewBox="0 0 96 96" aria-label={label}>
        <circle
          cx="48"
          cy="48"
          r={radius}
          strokeWidth={stroke}
          className="ratio-ring-track"
        />
        <circle
          cx="48"
          cy="48"
          r={radius}
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="ratio-ring-fill"
        />
        <text x="48" y="53" textAnchor="middle" className="ratio-ring-value">
          {safeValue}%
        </text>
      </svg>
      <strong>{label}</strong>
      <p>{hint}</p>
    </div>
  );
}
