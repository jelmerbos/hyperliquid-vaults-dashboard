"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils/format";
import type { TimeSeries } from "@/lib/metrics";

export function DrawdownChart({ data }: { data: TimeSeries }) {
  const chartData = data.map(([ts, val]) => ({
    date: new Date(ts).toLocaleDateString(),
    drawdown: val,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Drawdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
                tickFormatter={(v) => formatPercent(v)}
              />
              <Tooltip
                formatter={(v) => [formatPercent(v as number), "Drawdown"]}
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)" }}
              />
              <Area
                type="monotone"
                dataKey="drawdown"
                stroke="#f85149"
                fill="#f85149"
                fillOpacity={0.2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
