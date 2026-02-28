"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import type { VaultMetrics } from "@/lib/metrics";

interface MetricCardProps {
  title: string;
  value: string;
  className?: string;
}

function MetricCard({ title, value, className }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${className ?? ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

export function MetricsGrid({ metrics, apr }: { metrics: VaultMetrics; apr: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <MetricCard
        title="APR"
        value={formatPercent(apr)}
        className={apr >= 0 ? "text-green-600" : "text-red-600"}
      />
      <MetricCard
        title="Cumulative PnL"
        value={formatCurrency(metrics.cumulativePnL)}
        className={metrics.cumulativePnL >= 0 ? "text-green-600" : "text-red-600"}
      />
      <MetricCard
        title="Max Drawdown"
        value={formatPercent(metrics.maxDrawdown)}
        className="text-red-600"
      />
      <MetricCard title="Sharpe" value={metrics.sharpeRatio.toFixed(2)} />
      <MetricCard title="Volatility" value={formatPercent(metrics.annualizedVolatility)} />
      <MetricCard title="RoMaD" value={metrics.romad.toFixed(2)} />
    </div>
  );
}
