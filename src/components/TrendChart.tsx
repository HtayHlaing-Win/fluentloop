"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function LineTrend({ data }: { data: { label: string; score: number }[] }) {
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="label" stroke="var(--muted)" />
          <YAxis domain={[0, 100]} stroke="var(--muted)" />
          <Tooltip />
          <Line type="monotone" dataKey="score" stroke="var(--brand)" strokeWidth={2} dot />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarCounts({ data }: { data: { label: string; count: number }[] }) {
  return (
    <div style={{ width: "100%", height: 220 }}>
      <ResponsiveContainer>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="label" stroke="var(--muted)" />
          <YAxis allowDecimals={false} stroke="var(--muted)" />
          <Tooltip />
          <Bar dataKey="count" fill="var(--brand)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
