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

const COLORS = ["#2563eb", "#dc2626", "#16a34a", "#ca8a04"];

interface ChartVault {
  name: string;
  data: TimeSeries;
}

export function CompareCharts({ vaults }: { vaults: ChartVault[] }) {
  if (vaults.length === 0) return null;

  // Normalize all series to start at 100
  const normalized = vaults.map((v) => {
    const start = v.data[0]?.[1] ?? 1;
    return {
      name: v.name,
      data: v.data.map(([ts, val]) => ({
        ts,
        date: new Date(ts).toLocaleDateString(),
        value: start === 0 ? 0 : (val / start) * 100,
      })),
    };
  });

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
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              {vaults.map((v, i) => (
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
