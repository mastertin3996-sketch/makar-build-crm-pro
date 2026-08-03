"use client";

import { useState, useRef, useEffect, type MouseEvent } from "react";
import { formatUAH } from "@/lib/labels";

// Валідована категоріальна палітра (адаптована під золото-чорний бренд,
// перевірена скриптом дата-віз скіла проти --color-background #0a0a0b):
// gold, blue, aqua, violet, red — CVD-безпечний фіксований порядок.
export const CHART_CATEGORICAL = ["#c9a227", "#3987e5", "#1fb787", "#9085e9", "#e66767"];
// Ordinal-градієнт золота (світлий → темний) для впорядкованих етапів воронки.
export const CHART_GOLD_ORDINAL = ["#f3e3ad", "#e2c465", "#d4af37", "#b8942c", "#8a6a1f", "#6b530f"];

// ----------------------------------------------------------------------------
// Лічильник цифр, що "накручується" від 0 до фінального значення
// ----------------------------------------------------------------------------
export function CountUp({
  to,
  duration = 500,
  startDelay = 0,
  format,
}: {
  to: number;
  duration?: number;
  startDelay?: number;
  /** "currency" форматує через formatUAH; без значення — просте ціле число. */
  format?: "currency";
}) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    function tick(t: number) {
      const elapsed = t - t0 - startDelay;
      if (elapsed < 0) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const p = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, startDelay]);
  return <>{format === "currency" ? formatUAH(val) : val}</>;
}

function pathFromPoints(data: number[], w: number, h: number, pad: number) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = data.length > 1 ? (w - pad * 2) / (data.length - 1) : 0;
  const points = data.map((v, i) => ({
    x: pad + i * step,
    y: h - pad - ((v - min) / range) * (h - pad * 2),
  }));
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return { d, points };
}

// ----------------------------------------------------------------------------
// Area-графік тренду з наведенням (crosshair + тултип)
// ----------------------------------------------------------------------------
export function AreaTrendChart({
  data,
  color = "#d4af37",
  height = 110,
  animateDelay,
  animateDuration = 1100,
}: {
  data: { label: string; value: number; displayValue?: string }[];
  color?: string;
  height?: number;
  /** Якщо задано — лінія "малюється", а заливка "піднімається" при першій появі. */
  animateDelay?: number;
  animateDuration?: number;
}) {
  const w = 700;
  const pad = 8;
  const values = data.map((d) => d.value);
  const { d: path, points } = pathFromPoints(values, w, height, pad);
  const areaPath = `${path} L${w - pad},${height - pad} L${pad},${height - pad} Z`;
  const gridY = [0.25, 0.5, 0.75].map((f) => height * f);
  const gradId = `area-grad-${color.replace("#", "")}`;

  const [hover, setHover] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  function handleMove(e: MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * w;
    let nearest = 0;
    let best = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.x - relX);
      if (dist < best) {
        best = dist;
        nearest = i;
      }
    });
    setHover(nearest);
  }

  const hp = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        width="100%"
        height={height}
        viewBox={`0 0 ${w} ${height}`}
        preserveAspectRatio="none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        className="cursor-crosshair"
      >
        {gridY.map((y) => (
          <line key={y} x1={pad} x2={w - pad} y1={y} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth={1} />
        ))}
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.32} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <path
          d={areaPath}
          fill={`url(#${gradId})`}
          stroke="none"
          className={animateDelay !== undefined ? "hero-rise" : undefined}
          style={animateDelay !== undefined ? { animationDelay: `${animateDelay}ms`, animationDuration: `${animateDuration}ms` } : undefined}
        />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={animateDelay !== undefined ? 100 : undefined}
          className={animateDelay !== undefined ? "hero-draw" : undefined}
          style={animateDelay !== undefined ? { animationDelay: `${animateDelay}ms`, animationDuration: `${animateDuration}ms` } : undefined}
        />
        {hp && (
          <>
            <line x1={hp.x} x2={hp.x} y1={pad} y2={height - pad} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
            <circle cx={hp.x} cy={hp.y} r={4} fill={color} stroke="#0a0a0b" strokeWidth={1.5} />
          </>
        )}
      </svg>
      {hp && hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-md border border-brand/20 bg-[#17171a] px-2.5 py-1.5 text-xs shadow-popover"
          style={{ left: `${(hp.x / w) * 100}%`, top: `${(hp.y / height) * 100 - 4}%` }}
        >
          <div className="font-semibold text-foreground">{data[hover].displayValue ?? data[hover].value}</div>
          <div className="text-[10px] text-muted">{data[hover].label}</div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Вертикальний бар-чарт (для впорядкованих статусів — ordinal золота шкала)
// ----------------------------------------------------------------------------
export function BarChartVertical({
  data,
  colors = CHART_GOLD_ORDINAL,
  height = 160,
  animateDelay,
  animateStagger = 100,
}: {
  data: { label: string; value: number }[];
  colors?: string[];
  height?: number;
  /** Якщо задано — стовпці виростають знизу по черзі при першій появі. */
  animateDelay?: number;
  animateStagger?: number;
}) {
  const w = 100 * data.length;
  const max = Math.max(...data.map((d) => d.value), 1);
  const gap = 12;
  const barW = (w - gap * (data.length - 1)) / data.length;
  const chartH = height - 22;
  const [hover, setHover] = useState<number | null>(null);

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="xMidYMid meet">
      <line x1={0} x2={w} y1={chartH} y2={chartH} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
      {data.map((d, i) => {
        const barH = (d.value / max) * (chartH - 6);
        const x = i * (barW + gap);
        const y = chartH - barH;
        return (
          <g
            key={d.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{ cursor: "pointer" }}
          >
            <title>{`${d.label}: ${d.value}`}</title>
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={4}
              fill={colors[i % colors.length]}
              opacity={hover === null || hover === i ? 1 : 0.55}
              className={animateDelay !== undefined ? "bar-grow" : undefined}
              style={
                animateDelay !== undefined
                  ? { animationDelay: `${animateDelay + i * animateStagger}ms`, transformOrigin: `${x + barW / 2}px ${chartH}px` }
                  : undefined
              }
            />
            <text x={x + barW / 2} y={chartH + 16} textAnchor="middle" fontSize={11} fill="#8c8578">
              {d.label}
            </text>
            <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize={12} fontWeight={700} fill="#f3efe6">
              {d.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ----------------------------------------------------------------------------
// Донат-діаграма з легендою (ідентичність ніколи лише кольором)
// ----------------------------------------------------------------------------
export function DonutChart({
  data,
  colors = CHART_CATEGORICAL,
  size = 120,
  animateDelay,
  animateStagger = 120,
}: {
  data: { label: string; value: number }[];
  colors?: string[];
  size?: number;
  /** Якщо задано — сегменти вимальовуються по черзі при першій появі. */
  animateDelay?: number;
  animateStagger?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const [hover, setHover] = useState<number | null>(null);

  const segments = data.reduce<{ dash: number; offset: number }[]>((acc, d, i) => {
    const dash = (d.value / total) * c;
    const offset = i === 0 ? 0 : acc[i - 1].offset + acc[i - 1].dash;
    acc.push({ dash, offset });
    return acc;
  }, []);

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={14} />
        {data.map((d, i) => {
          const { dash, offset } = segments[i];
          const dashArr = `${dash} ${c - dash}`;
          return (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth={14}
              strokeDasharray={dashArr}
              strokeDashoffset={-offset}
              opacity={hover === null || hover === i ? 1 : 0.4}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className={animateDelay !== undefined ? "donut-sweep" : undefined}
              style={{
                cursor: "pointer",
                transition: "opacity 0.15s",
                ...(animateDelay !== undefined ? { animationDelay: `${animateDelay + i * animateStagger}ms` } : {}),
              }}
            >
              <title>{`${d.label}: ${d.value}`}</title>
            </circle>
          );
        })}
      </svg>
      <ul className="space-y-1.5">
        {data.map((d, i) => (
          <li
            key={d.label}
            className="flex items-center gap-2 text-xs text-muted"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            style={{ opacity: hover === null || hover === i ? 1 : 0.5 }}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[i % colors.length] }} />
            <span className="text-[#b8935a]">{d.label}</span>
            <span className="font-bold text-foreground">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Дельта-індикатор для KPI (▲/▼ % порівняно з попереднім періодом)
// ----------------------------------------------------------------------------
export function KpiDelta({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) {
    return current > 0 ? <span className="text-xs font-semibold text-[#1fb787]">Нове</span> : null;
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="text-xs font-semibold text-muted">без змін</span>;
  const up = pct > 0;
  return (
    <span className={`text-xs font-semibold ${up ? "text-[#1fb787]" : "text-[#e66767]"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}
