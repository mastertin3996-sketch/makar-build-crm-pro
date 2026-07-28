"use client";

import { useState } from "react";

export type BarDatum = { label: string; value: number };

export function BarChart({
  data,
  barColor = "bg-teal-500",
  barColorHover = "bg-teal-600",
}: {
  data: BarDatum[];
  barColor?: string;
  barColorHover?: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const pct = (d.value / max) * 100;
        const isHovered = hovered === i;
        return (
          <div
            key={d.label}
            className="flex items-center gap-3 outline-none"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(null)}
            tabIndex={0}
            role="img"
            aria-label={`${d.label}: ${d.value}`}
          >
            <div
              className="w-32 shrink-0 truncate text-sm text-slate-600"
              title={d.label}
            >
              {d.label}
            </div>
            <div className="relative h-5 flex-1 rounded-r bg-slate-100">
              <div
                className={`h-5 rounded-r transition-[width,background-color] duration-200 ease-out ${
                  isHovered ? barColorHover : barColor
                }`}
                style={{ width: `${pct}%` }}
              />
              {isHovered && (
                <div
                  className="pointer-events-none absolute bottom-full z-10 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white shadow-lg"
                  style={{ left: `${pct}%` }}
                >
                  {d.label}: {d.value}
                </div>
              )}
            </div>
            <div className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums text-slate-700">
              {d.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}
