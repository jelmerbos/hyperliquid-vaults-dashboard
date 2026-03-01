"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/format";
import type { TimeSeries } from "@/lib/metrics";

export function PerformanceChart({ data }: { data: TimeSeries }) {
  const chartData = data.map(([ts, val]) => ({
    date: new Date(ts).toLocaleDateString(),
    value: val,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Value</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
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
                tickFormatter={(v) => formatCurrency(v)}
              />
              <Tooltip
                formatter={(v) => [formatCurrency(v as number), "Value"]}
                contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--foreground)" }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="var(--accent-teal)"
                dot={false}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
