import { useMemo, useRef, useState } from 'react';

type TrendPoint = { date: string; total: number };

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 34;
const PAD_RIGHT = 16;
const PAD_TOP = 20;
const PAD_BOTTOM = 28;

function formatDate(date: string) {
  const [, month, day] = date.split('-');
  return `${Number(month)}/${Number(day)}`;
}

function niceTicks(min: number, max: number, count: number) {
  if (min === max) return [min];
  const step = Math.max(1, Math.round((max - min) / (count - 1)));
  const ticks: number[] = [];
  for (let value = Math.floor(min / step) * step; value <= max + step; value += step) {
    // Only keep ticks that fall inside the plotted range — one just outside it
    // would land on top of the x-axis date labels.
    if (value >= min && value <= max) ticks.push(value);
  }
  return ticks;
}

// A single-series line trend: chronological (oldest to newest, left to right),
// with a hover crosshair + tooltip and a direct label on the most recent point.
// No legend — there's only one series, and the chart title already names it.
export default function ScoreTrendChart({ points }: { points: TrendPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const { ticks, xForIndex, yForValue } = useMemo(() => {
    const values = points.map((p) => p.total);
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const span = rawMax - rawMin || 1;
    const minValue = rawMin - span * 0.1;
    const maxValue = rawMax + span * 0.1;
    const ticks = niceTicks(minValue, maxValue, 4);

    const xForIndex = (index: number) =>
      points.length <= 1 ? PAD_LEFT + plotWidth / 2 : PAD_LEFT + (plotWidth * index) / (points.length - 1);
    const yForValue = (value: number) => PAD_TOP + plotHeight - ((value - minValue) / (maxValue - minValue)) * plotHeight;

    return { ticks, xForIndex, yForValue };
  }, [points, plotWidth, plotHeight]);

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xForIndex(i)},${yForValue(p.total)}`).join(' ');
  const areaPath = `${linePath} L${xForIndex(points.length - 1)},${PAD_TOP + plotHeight} L${xForIndex(0)},${PAD_TOP + plotHeight} Z`;

  // Thin x-axis date labels so they don't collide when there are many rounds.
  const labelEvery = Math.max(1, Math.ceil(points.length / 6));

  const handleMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || points.length === 0) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = WIDTH / rect.width;
    const pointerX = (event.clientX - rect.left) * scaleX;
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((_, i) => {
      const dist = Math.abs(xForIndex(i) - pointerX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  };

  if (points.length === 0) return null;

  const hovered = hoverIndex !== null ? points[hoverIndex] : null;
  const hoverX = hoverIndex !== null ? xForIndex(hoverIndex) : 0;
  const hoverY = hoverIndex !== null ? yForValue(points[hoverIndex].total) : 0;
  const tooltipLeftPct = Math.min(85, Math.max(15, (hoverX / WIDTH) * 100));

  const lastIndex = points.length - 1;

  return (
    <div className="score-trend-chart">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Total score by round, oldest to newest"
        onPointerMove={handleMove}
        onPointerLeave={() => setHoverIndex(null)}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yForValue(tick)}
              y2={yForValue(tick)}
              stroke="var(--color-border)"
              strokeWidth={1}
            />
            <text x={PAD_LEFT - 8} y={yForValue(tick)} textAnchor="end" dominantBaseline="middle" className="score-trend-axis-label">
              {tick}
            </text>
          </g>
        ))}

        {points.map((p, i) =>
          i % labelEvery === 0 || i === lastIndex ? (
            <text key={p.date} x={xForIndex(i)} y={HEIGHT - 6} textAnchor="middle" className="score-trend-axis-label">
              {formatDate(p.date)}
            </text>
          ) : null
        )}

        <path d={areaPath} fill="var(--color-primary)" opacity={0.1} stroke="none" />
        <path d={linePath} fill="none" stroke="var(--color-primary)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {points.map((p, i) => (
          <circle
            key={p.date}
            cx={xForIndex(i)}
            cy={yForValue(p.total)}
            r={5}
            fill="var(--color-primary)"
            stroke="var(--color-surface)"
            strokeWidth={2}
          />
        ))}

        <text
          x={xForIndex(lastIndex)}
          y={yForValue(points[lastIndex].total) - 12}
          textAnchor="middle"
          className="score-trend-end-label"
        >
          {points[lastIndex].total}
        </text>

        {hovered && (
          <line x1={hoverX} x2={hoverX} y1={PAD_TOP} y2={PAD_TOP + plotHeight} stroke="var(--color-border-strong)" strokeWidth={1} />
        )}
        {hovered && <circle cx={hoverX} cy={hoverY} r={7} fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth={2} />}
      </svg>

      {hovered && (
        <div className="score-trend-tooltip" style={{ left: `${tooltipLeftPct}%` }}>
          <div className="score-trend-tooltip-value">{hovered.total}</div>
          <div className="score-trend-tooltip-date">{hovered.date}</div>
        </div>
      )}
    </div>
  );
}
