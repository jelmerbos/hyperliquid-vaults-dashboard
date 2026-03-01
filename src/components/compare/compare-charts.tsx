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
import type { TimeSeries } from "@/lib/metrics";

const COLORS = ["#97fce4", "#f0883e", "#58a6ff", "#bc8cff"];

interface ChartVault {
  name: string;
  avHistory: TimeSeries;
  pnlHistory: TimeSeries;
}

/**
 * PnL-based normalization: shows what $100 invested would have become
 * based purely on trading P&L, stripping deposit/withdrawal effects.
 * Formula: 100 + (cumulativePnL / startAV) * 100
 */
function pnlNormalize(avHistory: TimeSeries, pnlHistory: TimeSeries) {
  // Strip leading zeros
  const firstNonZero = avHistory.findIndex(([, val]) => val > 0.01);
  const cleanAv = firstNonZero > 0 ? avHistory.slice(firstNonZero) : avHistory;

  if (cleanAv.length === 0 || pnlHistory.length === 0) return [];

  const startAv = cleanAv[0][1];
  if (startAv === 0) return [];

  // Build PnL lookup by day
  const MS_PER_DAY = 86_400_000;
  const pnlByDay = new Map<number, number>();
  for (const [ts, val] of pnlHistory) {
    pnlByDay.set(Math.floor(ts / MS_PER_DAY), val);
  }
  const startPnl = pnlHistory[0][1];

  return cleanAv.map(([ts]) => {
    const day = Math.floor(ts / MS_PER_DAY);
    const pnlVal = pnlByDay.get(day);
    const cumPnl = pnlVal != null ? pnlVal - startPnl : 0;
    return {
      ts,
      date: new Date(ts).toLocaleDateString(),
      value: 100 + (cumPnl / startAv) * 100,
    };
  });
}

export function CompareCharts({ vaults }: { vaults: ChartVault[] }) {
  if (vaults.length === 0) return null;

  // PnL-based normalization: strips deposit/withdrawal effects
  const normalized = vaults.map((v) => ({
    name: v.name,
    data: pnlNormalize(v.avHistory, v.pnlHistory),
  })).filter((v) => v.data.length > 0);

  // Merge all dates
  const dateSet = new Set<number>();
  for (const v of normalized) {
    for (const d of v.data) dateSet.add(d.ts);
  }
  const allDates = Array.from(dateSet).sort((a, b) => a - b);

  // Build combined data
  const chartData = allDates.map((ts) => {
    const point: Record<string, number | string> = {
      date: new Date(ts).toLocaleDateString(),
    };
    for (const v of normalized) {
      const closest = v.data.reduce((prev, curr) =>
        Math.abs(curr.ts - ts) < Math.abs(prev.ts - ts) ? curr : prev,
      );
      point[v.name] = closest.value;
    }
    return point;
  });

  // Sample down if too many points
  const maxPoints = 200;
  const step = Math.max(1, Math.floor(chartData.length / maxPoints));
  const sampled = chartData.filter((_, i) => i % step === 0 || i === chartData.length - 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Normalized Performance (base 100)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sampled}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} stroke="var(--border)" interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} stroke="var(--border)" />
              <Tooltip contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)" }} />
              <Legend />
              {normalized.map((v, i) => (
                <Line
                  key={v.name}
                  type="monotone"
                  dataKey={v.name}
                  stroke={COLORS[i % COLORS.length]}
                  dot={false}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
