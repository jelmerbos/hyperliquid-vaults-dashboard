"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { TimeSeries } from "@/lib/metrics/returns";
import type { DrawdownEpisode } from "@/lib/metrics/risk";

const VAULT_COLORS = ["#f0883e", "#58a6ff", "#bc8cff", "#f778ba", "#7ee787", "#d29922"];
const PORTFOLIO_COLOR = "#f85149";

interface DrawdownAnalysisProps {
  vaultNames: string[];
  perVaultDrawdownSeries: TimeSeries[];
  portfolioDrawdownSeries: TimeSeries;
  perVaultEpisodes: DrawdownEpisode[][];
}

export function DrawdownAnalysis({
  vaultNames,
  perVaultDrawdownSeries,
  portfolioDrawdownSeries,
  perVaultEpisodes,
}: DrawdownAnalysisProps) {
  if (portfolioDrawdownSeries.length === 0 && perVaultDrawdownSeries.every((s) => s.length === 0)) {
    return null;
  }

  // Build chart data from portfolio drawdown series
  const dateSet = new Map<number, Record<string, number | string>>();
  for (const [ts, val] of portfolioDrawdownSeries) {
    dateSet.set(ts, {
      date: new Date(ts).toLocaleDateString(),
      Portfolio: val,
    });
  }

  for (let i = 0; i < perVaultDrawdownSeries.length; i++) {
    for (const [ts, val] of perVaultDrawdownSeries[i]) {
      const point = dateSet.get(ts);
      if (point) {
        point[vaultNames[i]] = val;
      }
    }
  }

  const chartData = Array.from(dateSet.entries())
    .sort(([a], [b]) => a - b)
    .map(([, point]) => point);

  // Flatten all episodes with vault info for the table
  const allEpisodes = perVaultEpisodes.flatMap((episodes, vaultIdx) =>
    episodes.map((ep) => ({ ...ep, vaultIdx, vaultName: vaultNames[vaultIdx] })),
  );

  // Sort by depth (worst first)
  allEpisodes.sort((a, b) => a.depth - b.depth);

  // Worst DD per vault for comparison
  const worstPerVault = vaultNames.map((name, i) => {
    const episodes = perVaultEpisodes[i];
    if (episodes.length === 0) return { name, depth: 0, durationDays: 0 };
    const worst = episodes.reduce((w, ep) => (ep.depth < w.depth ? ep : w), episodes[0]);
    return { name, depth: worst.depth, durationDays: worst.durationDays };
  });

  return (
    <Card data-testid="drawdown-analysis">
      <CardHeader>
        <CardTitle className="text-base">Drawdown Recovery Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Underwater Chart */}
        {chartData.length > 0 && (
          <div className="h-[300px]" data-testid="underwater-chart">
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
                  formatter={(v) => [formatPercent(v as number), undefined]}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--foreground)",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="Portfolio"
                  stroke={PORTFOLIO_COLOR}
                  fill={PORTFOLIO_COLOR}
                  fillOpacity={0.15}
                  dot={false}
                  strokeWidth={2}
                />
                {vaultNames.map((name, i) => (
                  <Area
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={VAULT_COLORS[i % VAULT_COLORS.length]}
                    fill="none"
                    dot={false}
                    strokeWidth={1}
                    strokeDasharray="4 2"
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Episodes Table */}
        {allEpisodes.length > 0 && (
          <div data-testid="episodes-table">
            <h3 className="text-sm font-medium mb-2">Drawdown Episodes</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-1 pr-3">Vault</th>
                    <th className="text-left py-1 pr-3">Start</th>
                    <th className="text-left py-1 pr-3">Trough</th>
                    <th className="text-left py-1 pr-3">Recovery</th>
                    <th className="text-right py-1 pr-3">Depth</th>
                    <th className="text-right py-1 pr-3">Duration</th>
                    <th className="text-right py-1">Recovery Time</th>
                  </tr>
                </thead>
                <tbody>
                  {allEpisodes.slice(0, 20).map((ep, i) => (
                    <tr key={i} className="border-b last:border-0" data-testid={`episode-row-${i}`}>
                      <td className="py-1 pr-3 truncate max-w-[120px]">{ep.vaultName}</td>
                      <td className="py-1 pr-3 tabular-nums">{new Date(ep.startTs).toLocaleDateString()}</td>
                      <td className="py-1 pr-3 tabular-nums">{new Date(ep.troughTs).toLocaleDateString()}</td>
                      <td className="py-1 pr-3 tabular-nums">
                        {ep.recoveryTs ? new Date(ep.recoveryTs).toLocaleDateString() : (
                          <span className="text-yellow-500">Ongoing</span>
                        )}
                      </td>
                      <td className={cn(
                        "py-1 pr-3 text-right tabular-nums font-medium",
                        ep.depth < -0.15 ? "text-red-500" : ep.depth < -0.05 ? "text-yellow-500" : "text-foreground",
                      )}>
                        {formatPercent(ep.depth)}
                      </td>
                      <td className="py-1 pr-3 text-right tabular-nums">{Math.round(ep.durationDays)}d</td>
                      <td className="py-1 text-right tabular-nums">
                        {ep.recoveryDays !== null ? `${Math.round(ep.recoveryDays)}d` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Worst DD Comparison */}
        {worstPerVault.some((w) => w.depth < 0) && (
          <div data-testid="worst-dd-comparison">
            <h3 className="text-sm font-medium mb-2">Worst Drawdown per Vault</h3>
            <div className="grid grid-cols-[1fr_80px_80px] gap-2 text-xs text-muted-foreground border-b pb-1">
              <span>Vault</span>
              <span className="text-right">Max DD</span>
              <span className="text-right">Duration</span>
            </div>
            {worstPerVault.map((w, i) => (
              <div
                key={i}
                className="grid grid-cols-[1fr_80px_80px] gap-2 text-sm py-1"
                data-testid={`worst-dd-row-${i}`}
              >
                <span className="truncate">{w.name}</span>
                <span className={cn(
                  "text-right tabular-nums",
                  w.depth < -0.15 ? "text-red-500" : w.depth < -0.05 ? "text-yellow-500" : "text-foreground",
                )}>
                  {formatPercent(w.depth)}
                </span>
                <span className="text-right tabular-nums">{Math.round(w.durationDays)}d</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
