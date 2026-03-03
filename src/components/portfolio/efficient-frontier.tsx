"use client";

import {
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Line,
  ComposedChart,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EfficientFrontierPoint } from "@/lib/portfolio/types";

export interface VaultPoint {
  name: string;
  volatility: number;
  return: number;
  sharpe: number;
  tvl?: number;
  leverage?: number;
  maxDrawdown?: number;
}

interface EfficientFrontierProps {
  vaultPoints: VaultPoint[];
  frontierPoints: EfficientFrontierPoint[];
  currentPortfolio?: { volatility: number; return: number };
  equalWeightPortfolio?: { volatility: number; return: number };
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function VaultTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  // Check if this is a vault point (has name + sharpe) vs frontier/portfolio point
  const isVault = data.name && data.sharpe !== undefined;

  return (
    <div
      className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md"
      style={{ color: "var(--foreground)" }}
    >
      {isVault ? (
        <>
          <p className="font-semibold mb-1">{data.name}</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
            <span className="text-muted-foreground">Return</span>
            <span className="text-right">{formatPct(data.return)}</span>
            <span className="text-muted-foreground">Volatility</span>
            <span className="text-right">{formatPct(data.volatility)}</span>
            <span className="text-muted-foreground">Sharpe</span>
            <span className="text-right">{data.sharpe.toFixed(2)}</span>
            {data.tvl != null && (
              <>
                <span className="text-muted-foreground">TVL</span>
                <span className="text-right">{formatUsd(data.tvl)}</span>
              </>
            )}
            {data.leverage != null && (
              <>
                <span className="text-muted-foreground">Leverage</span>
                <span className="text-right">{data.leverage.toFixed(1)}x</span>
              </>
            )}
            {data.maxDrawdown != null && (
              <>
                <span className="text-muted-foreground">Max DD</span>
                <span className="text-right">{formatPct(data.maxDrawdown)}</span>
              </>
            )}
          </div>
        </>
      ) : (
        <div className="text-xs">
          <p>Return: {formatPct(data.return ?? 0)}</p>
          <p>Volatility: {formatPct(data.volatility ?? 0)}</p>
        </div>
      )}
    </div>
  );
}

export function EfficientFrontier({
  vaultPoints,
  frontierPoints,
  currentPortfolio,
  equalWeightPortfolio,
}: EfficientFrontierProps) {
  if (vaultPoints.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Efficient Frontier</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground" data-testid="frontier-empty">
            Select at least 2 vaults to see the efficient frontier.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Build chart data
  const frontierData = frontierPoints.map((p) => ({
    volatility: p.volatility,
    return: p.return,
  }));

  const vaultData = vaultPoints.map((v) => ({
    volatility: v.volatility,
    return: v.return,
    name: v.name,
    sharpe: v.sharpe,
    tvl: v.tvl,
    leverage: v.leverage,
    maxDrawdown: v.maxDrawdown,
  }));

  const portfolioData = currentPortfolio ? [currentPortfolio] : [];
  const eqData = equalWeightPortfolio ? [equalWeightPortfolio] : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Efficient Frontier</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]" data-testid="frontier-chart">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="volatility"
                type="number"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
                tickFormatter={formatPct}
                label={{ value: "Volatility", position: "bottom", offset: -5, fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                dataKey="return"
                type="number"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                stroke="var(--border)"
                tickFormatter={formatPct}
                label={{ value: "Return", angle: -90, position: "insideLeft", offset: 10, fontSize: 12, fill: "var(--muted-foreground)" }}
              />
              <Tooltip content={<VaultTooltip />} />
              <Legend />

              {/* Frontier curve */}
              <Line
                data={frontierData}
                dataKey="return"
                type="monotone"
                stroke="#97fce4"
                strokeWidth={2}
                dot={false}
                name="Frontier"
              />

              {/* Individual vaults */}
              <Scatter
                data={vaultData}
                fill="#58a6ff"
                name="Vaults"
                shape="circle"
              />

              {/* Current portfolio */}
              {portfolioData.length > 0 && (
                <Scatter
                  data={portfolioData}
                  fill="#f0883e"
                  name="Portfolio"
                  shape="star"
                />
              )}

              {/* Equal weight reference */}
              {eqData.length > 0 && (
                <Scatter
                  data={eqData}
                  fill="#6e7681"
                  name="Equal Weight"
                  shape="diamond"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
