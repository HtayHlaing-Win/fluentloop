"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontSize: "0.8rem",
  color: "var(--foreground)",
};
const tick = { fontSize: 12, fill: "var(--muted-foreground)" };

export function LineTrend({ data }: { data: { label: string; score: number }[] }) {
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={tick} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--border)" }} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--primary)"
            strokeWidth={2.5}
            fill="url(#trendFill)"
            dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarCounts({ data }: { data: { label: string; count: number }[] }) {
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={tick} axisLine={false} tickLine={false} />
          <YAxis allowDecimals={false} tick={tick} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="count" fill="var(--primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
