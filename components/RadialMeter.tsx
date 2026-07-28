"use client";

import { useEffect, useState } from "react";

export function RadialMeter({ ratio, size = 168 }: { ratio: number; size?: number }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = mounted ? ratio : 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#radial-grad)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - pct * c}
        className="transition-[stroke-dashoffset] duration-1000 ease-out"
      />
      <defs>
        <linearGradient id="radial-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2dd4bf" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-slate-900 text-2xl font-bold"
        style={{ transform: "rotate(90deg)", transformOrigin: "center", transformBox: "fill-box" }}
      >
        {Math.round(ratio * 100)}%
      </text>
    </svg>
  );
}
