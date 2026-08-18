import { getCurrency } from "@/lib/money";
import type { DayPoint } from "@/lib/analytics";

const W = 720;
const H = 250;
const PAD_L = 64;
const PAD_R = 14;
const PAD_T = 14;
const PAD_B = 30;

function niceMax(value: number): number {
  if (value <= 0) {
    return 1;
  }
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalized = value / magnitude;
  const nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function shortMoney(cents: number): string {
  const currency = getCurrency();
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(cents / 100);
}

function tickLabel(dateKey: string): string {
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(
    new Date(`${dateKey}T12:00:00`),
  );
}

export function RevenueChart({ series }: { series: DayPoint[] }) {
  const maxVal = niceMax(
    Math.max(0, ...series.map((point) => Math.max(point.revenueCents, point.expenseCents))),
  );
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const n = series.length;
  const xAt = (index: number) => (n <= 1 ? PAD_L + plotW / 2 : PAD_L + (plotW * index) / (n - 1));
  const yAt = (value: number) => PAD_T + plotH * (1 - value / maxVal);
  const path = (get: (point: DayPoint) => number) =>
    series.map((point, index) => `${index === 0 ? "M" : "L"} ${xAt(index).toFixed(1)} ${yAt(get(point)).toFixed(1)}`).join(" ");

  if (maxVal === 1 && series.every((point) => point.revenueCents === 0 && point.expenseCents === 0)) {
    return <p className="empty-note">No sales or expenses in this range.</p>;
  }

  const ticks = [0, 1, 2, 3, 4];
  const xLabelStep = Math.max(1, Math.ceil(n / 6));

  return (
    <svg
      className="chart-svg"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Revenue and expenses over time"
    >
      {ticks.map((tick) => {
        const value = (maxVal * tick) / 4;
        const y = yAt(value);
        return (
          <g key={tick}>
            <line className="chart-grid" x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} />
            <text className="chart-tick" x={PAD_L - 8} y={y + 4} textAnchor="end">
              {tick === 0 ? "0" : shortMoney(Math.round(value))}
            </text>
          </g>
        );
      })}

      <path className="chart-line chart-line-expense" d={path((p) => p.expenseCents)} />
      <path className="chart-line chart-line-revenue" d={path((p) => p.revenueCents)} />

      {series.map((point, index) =>
        index % xLabelStep === 0 ? (
          <text
            key={point.key}
            className="chart-tick"
            x={xAt(index)}
            y={H - PAD_B + 18}
            textAnchor="middle"
          >
            {tickLabel(point.key)}
          </text>
        ) : null,
      )}
    </svg>
  );
}