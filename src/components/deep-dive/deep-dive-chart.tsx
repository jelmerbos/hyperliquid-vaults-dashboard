"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DeepDiveRow } from "@/lib/hooks/use-deep-dive-vaults";

const COLORS = [
  "#7cfcce", "#f0883e", "#58a6ff", "#bc8cff", "#3fb68b",
  "#f778ba", "#79c0ff", "#d2a8ff", "#56d364", "#ffa657",
];

const MS_PER_DAY = 86_400_000;

interface DeepDiveChartProps {
  rows: DeepDiveRow[];
}

/**
 * PnL-based normalized performance chart for all deep dive vaults.
 * Shows what $100 invested would have become based purely on trading P&L.
 */
export function DeepDiveChart({ rows }: DeepDiveChartProps) {
  if (rows.length === 0) return null;

  // Build normalized series per vault using PnL
  const normalized = rows
    .map((row) => {
      const allTime = row.vault.portfolio.find(([p]) => p === "allTime");
      if (!allTime) return null;

      const avRaw = allTime[1].accountValueHistory;
      const pnlRaw = allTime[1].pnlHistory;

      // Strip leading zeros from AV
      const firstNonZero = avRaw.findIndex(([, val]) => parseFloat(val) > 0.01);
      const avClean = firstNonZero > 0 ? avRaw.slice(firstNonZero) : avRaw;
      if (avClean.length === 0 || pnlRaw.length === 0) return null;

      const startAv = parseFloat(avClean[0][1]);
      if (startAv === 0) return null;

      // Build PnL lookup by day
      const pnlByDay = new Map<number, number>();
      for (const [ts, val] of pnlRaw) {
        pnlByDay.set(Math.floor(ts / MS_PER_DAY), parseFloat(val));
      }
      const startPnl = parseFloat(pnlRaw[0][1]);

      const points = avClean.map(([ts]) => {
        const day = Math.floor(ts / MS_PER_DAY);
        const pnlVal = pnlByDay.get(day);
        const cumPnl = pnlVal != null ? pnlVal - startPnl : 0;
        return { ts, value: 100 + (cumPnl / startAv) * 100 };
      });

      return { name: row.vault.name, points };
    })
    .filter(Boolean) as { name: string; points: { ts: number; value: number }[] }[];

  if (normalized.length === 0) return null;

  // Merge all timestamps
  const dateSet = new Set<number>();
  for (const v of normalized) {
    for (const p of v.points) dateSet.add(Math.floor(p.ts / MS_PER_DAY));
  }
  const allDays = Array.from(dateSet).sort((a, b) => a - b);

  // Build chart data: one row per day, one column per vault
  const chartData = allDays.map((day) => {
    const point: Record<string, number | string> = {
      date: new Date(day * MS_PER_DAY).toLocaleDateString(),
    };
    for (const v of normalized) {
      // Find closest point for this day (forward-fill)
      let best = v.points[0];
      for (const p of v.points) {
        if (Math.floor(p.ts / MS_PER_DAY) <= day) best = p;
        else break;
      }
      point[v.name] = Math.round(best.value * 100) / 100;
    }
    return point;
  });

  // Downsample if too many points
  const maxPoints = 300;
  const step = Math.max(1, Math.floor(chartData.length / maxPoints));
  const sampled = chartData.filter(
    (_, i) => i % step === 0 || i === chartData.length - 1,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Normalized Performance (base 100, PnL-adjusted)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sampled}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
                interval="preserveStartEnd"
              />
              <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)" }} />
              <Legend />
              {normalized.map((v, i) => (
                <Line
                  key={v.name}
                  type="monotone"
                  dataKey={v.name}
                  stroke={COLORS[i % COLORS.length]}
                  dot={false}
                  strokeWidth={1.5}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
