"use client";

import {
  LineChart,
  Line,
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
import { Button } from "@/components/ui/button";
import { formatPercent } from "@/lib/utils/format";

const VAULT_COLORS = ["#f0883e", "#58a6ff", "#bc8cff", "#f778ba", "#7ee787", "#d29922"];
const PORTFOLIO_COLOR = "#97fce4";

interface RollingRiskAttributionProps {
  vaultNames: string[];
  windowDays: number;
  onWindowChange: (days: number) => void;
  rollingSharpeData: { vaultValues: number[][]; portfolioValues: number[] };
  rollingBetaData: number[][];
  riskContributionData: number[][];
}

const WINDOWS = [30, 60, 90] as const;

export function RollingRiskAttribution({
  vaultNames,
  windowDays,
  onWindowChange,
  rollingSharpeData,
  rollingBetaData,
  riskContributionData,
}: RollingRiskAttributionProps) {
  const hasData = rollingSharpeData.portfolioValues.length > 0;
  if (!hasData) return null;

  const numPoints = rollingSharpeData.portfolioValues.length;

  // Build rolling Sharpe chart data
  const sharpeChartData = rollingSharpeData.portfolioValues.map((val, idx) => {
    const point: Record<string, number | string> = {
      idx: String(idx),
      Portfolio: val,
    };
    for (let v = 0; v < vaultNames.length; v++) {
      if (rollingSharpeData.vaultValues[v]?.[idx] !== undefined) {
        point[vaultNames[v]] = rollingSharpeData.vaultValues[v][idx];
      }
    }
    return point;
  });

  // Build rolling beta chart data
  const betaChartData = rollingBetaData.length > 0
    ? rollingBetaData[0].map((_, idx) => {
        const point: Record<string, number | string> = { idx: String(idx) };
        for (let v = 0; v < vaultNames.length; v++) {
          if (rollingBetaData[v]?.[idx] !== undefined) {
            point[vaultNames[v]] = rollingBetaData[v][idx];
          }
        }
        return point;
      })
    : [];

  // Build risk contribution stacked area data
  const riskChartData = riskContributionData.length > 0
    ? riskContributionData[0].map((_, idx) => {
        const point: Record<string, number | string> = { idx: String(idx) };
        for (let v = 0; v < vaultNames.length; v++) {
          if (riskContributionData[v]?.[idx] !== undefined) {
            point[vaultNames[v]] = riskContributionData[v][idx];
          }
        }
        return point;
      })
    : [];

  // Sample down long series
  const maxPoints = 150;
  function sample<T>(data: T[]): T[] {
    const step = Math.max(1, Math.floor(data.length / maxPoints));
    return data.filter((_, i) => i % step === 0 || i === data.length - 1);
  }

  return (
    <Card data-testid="rolling-risk-attribution">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Rolling Window Risk Attribution</CardTitle>
        <div className="flex gap-1" data-testid="window-selector">
          {WINDOWS.map((w) => (
            <Button
              key={w}
              variant={windowDays === w ? "default" : "outline"}
              size="sm"
              onClick={() => onWindowChange(w)}
              data-testid={`window-btn-${w}`}
            >
              {w}D
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Rolling Sharpe */}
        <div>
          <h3 className="text-sm font-medium mb-2">Rolling Sharpe Ratio ({windowDays}D)</h3>
          <div className="h-[250px]" data-testid="rolling-sharpe-chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sample(sharpeChartData)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="idx" tick={false} stroke="var(--border)" />
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
                  formatter={(v) => [(v as number).toFixed(2), undefined]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="Portfolio"
                  stroke={PORTFOLIO_COLOR}
                  dot={false}
                  strokeWidth={2}
                />
                {vaultNames.map((name, i) => (
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
        </div>

        {/* Rolling Beta to BTC */}
        {betaChartData.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Rolling Beta to BTC ({windowDays}D)</h3>
            <div className="h-[250px]" data-testid="rolling-beta-chart">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sample(betaChartData)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="idx" tick={false} stroke="var(--border)" />
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
                    formatter={(v) => [(v as number).toFixed(2), undefined]}
                  />
                  <Legend />
                  {vaultNames.map((name, i) => (
                    <Line
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={VAULT_COLORS[i % VAULT_COLORS.length]}
                      dot={false}
                      strokeWidth={1.5}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Risk Contribution Stacked Area */}
        {riskChartData.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2">Time-Varying Risk Contribution ({windowDays}D)</h3>
            <div className="h-[250px]" data-testid="risk-contribution-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sample(riskChartData)} stackOffset="expand">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="idx" tick={false} stroke="var(--border)" />
                  <YAxis
                    tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    stroke="var(--border)"
                    tickFormatter={(v) => formatPercent(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: "8px",
                      color: "var(--foreground)",
                    }}
                    formatter={(v) => [formatPercent(v as number), undefined]}
                  />
                  <Legend />
                  {vaultNames.map((name, i) => (
                    <Area
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stackId="1"
                      stroke={VAULT_COLORS[i % VAULT_COLORS.length]}
                      fill={VAULT_COLORS[i % VAULT_COLORS.length]}
                      fillOpacity={0.6}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Rolling metrics use a {windowDays}-day sliding window. Sharpe and beta show
          time-varying risk characteristics; the stacked area shows each vault&apos;s
          evolving contribution to total portfolio risk.
        </p>
      </CardContent>
    </Card>
  );
}
