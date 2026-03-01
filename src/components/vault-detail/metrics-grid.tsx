"use client";

import { formatCurrency, formatPercent, formatRatio } from "@/lib/utils/format";
import type { VaultMetrics } from "@/lib/metrics";

interface MetricCardProps {
  title: string;
  value: string;
  className?: string;
}

function MetricCard({ title, value, className }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <p className={`mt-1 text-lg font-bold ${className ?? ""}`}>{value}</p>
    </div>
  );
}

function SectionLabel({ label }: { label: string }) {
  return (
    <h3 className="col-span-full text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-2">
      {label}
    </h3>
  );
}

function colorForValue(value: number): string {
  return value >= 0 ? "text-accent-teal" : "text-[#f85149]";
}

export function MetricsGrid({
  metrics,
  apr,
  volume,
  tvl,
}: {
  metrics: VaultMetrics;
  apr: number;
  volume?: number;
  tvl?: number;
}) {
  const capitalEfficiency =
    volume != null && tvl != null && tvl > 0 ? volume / tvl : null;

  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
      <SectionLabel label="Performance" />
      <MetricCard
        title="APR"
        value={formatPercent(apr)}
        className={colorForValue(apr)}
      />
      <MetricCard
        title="Cumulative PnL"
        value={formatCurrency(metrics.cumulativePnL)}
        className={colorForValue(metrics.cumulativePnL)}
      />
      <MetricCard
        title="Cumulative Return"
        value={formatPercent(metrics.cumulativeReturn)}
        className={colorForValue(metrics.cumulativeReturn)}
      />
      <MetricCard
        title="Ann. Return"
        value={formatPercent(metrics.annualizedReturn)}
        className={colorForValue(metrics.annualizedReturn)}
      />
      <MetricCard
        title="Win Rate"
        value={formatPercent(metrics.returnDistribution.winRate)}
      />
      <MetricCard
        title="Positive Months"
        value={formatPercent(metrics.monthlyDistribution.positiveMonthPct)}
      />

      <SectionLabel label="Risk" />
      <MetricCard
        title="Max Drawdown"
        value={formatPercent(metrics.maxDrawdown)}
        className="text-[#f85149]"
      />
      <MetricCard
        title="DD Duration"
        value={`${metrics.maxDrawdownDuration.toFixed(0)}d`}
      />
      <MetricCard
        title="Volatility"
        value={formatPercent(metrics.annualizedVolatility)}
      />
      <MetricCard
        title="Best Month"
        value={formatPercent(metrics.monthlyDistribution.bestMonth)}
        className="text-accent-teal"
      />
      <MetricCard
        title="Worst Month"
        value={formatPercent(metrics.monthlyDistribution.worstMonth)}
        className="text-[#f85149]"
      />
      <MetricCard
        title="Avg Win"
        value={formatPercent(metrics.returnDistribution.avgWin)}
        className="text-accent-teal"
      />
      <MetricCard
        title="Avg Loss"
        value={formatPercent(metrics.returnDistribution.avgLoss)}
        className="text-[#f85149]"
      />

      <SectionLabel label="Risk-Adjusted" />
      <MetricCard title="Sharpe" value={formatRatio(metrics.sharpeRatio)} />
      <MetricCard title="Sortino" value={formatRatio(metrics.sortinoRatio)} />
      <MetricCard title="Calmar" value={formatRatio(metrics.calmarRatio)} />
      <MetricCard title="RoMaD" value={formatRatio(metrics.romad)} />
      <MetricCard
        title="Recovery Factor"
        value={formatRatio(metrics.recoveryFactor)}
      />
      {capitalEfficiency != null && (
        <MetricCard
          title="Capital Efficiency"
          value={`${capitalEfficiency.toFixed(1)}x`}
        />
      )}
    </div>
  );
}
