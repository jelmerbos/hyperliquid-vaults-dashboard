"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import type { TimeSeries } from "@/lib/metrics/returns";

const PORTFOLIO_COLOR = "#97fce4";
const VAULT_COLORS = ["#f0883e", "#58a6ff", "#bc8cff", "#f778ba", "#7ee787", "#d29922", "#a5d6ff", "#f2cc60", "#79c0ff", "#d2a8ff"];

interface PortfolioPerformanceChartProps {
  portfolioSeries: TimeSeries;
  vaultSeries?: { name: string; series: TimeSeries }[];
}

export function PortfolioPerformanceChart({
  portfolioSeries,
  vaultSeries = [],
}: PortfolioPerformanceChartProps) {
  const [showVaults, setShowVaults] = useState(false);

  if (portfolioSeries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Portfolio Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Select at least 2 vaults to see portfolio performance.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Build chart data
  const dateSet = new Map<number, Record<string, number | string>>();
  for (const [ts, val] of portfolioSeries) {
    dateSet.set(ts, {
      date: new Date(ts).toLocaleDateString(),
      Portfolio: val,
    });
  }

  if (showVaults) {
    for (const { name, series } of vaultSeries) {
      for (const [ts, val] of series) {
        const point = dateSet.get(ts);
        if (point) {
          point[name] = val;
        }
      }
    }
  }

  const chartData = Array.from(dateSet.entries())
    .sort(([a], [b]) => a - b)
    .map(([, point]) => point);

  // Sample down if too many points
  const maxPoints = 200;
  const step = Math.max(1, Math.floor(chartData.length / maxPoints));
  const sampled = chartData.filter((_, i) => i % step === 0 || i === chartData.length - 1);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Portfolio Performance (base 100)</CardTitle>
        {vaultSeries.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVaults(!showVaults)}
            data-testid="toggle-vaults"
          >
            {showVaults ? "Hide Vaults" : "Show Vaults"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sampled}>
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
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  color: "var(--foreground)",
                }}
                formatter={(value) => [Number(value ?? 0).toFixed(2), undefined]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="Portfolio"
                stroke={PORTFOLIO_COLOR}
                dot={false}
                strokeWidth={3}
              />
              {showVaults &&
                vaultSeries.map(({ name }, i) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={VAULT_COLORS[i % VAULT_COLORS.length]}
                    dot={false}
                    strokeWidth={1}
                    strokeDasharray="4 2"
                  />
                ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
