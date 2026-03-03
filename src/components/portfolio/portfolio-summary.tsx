"use client";

import { Card, CardContent } from "@/components/ui/card";
import { formatPercent, formatRatio } from "@/lib/utils/format";
import type { PortfolioMetrics } from "@/lib/portfolio/types";
import { cn } from "@/lib/utils";

interface PortfolioSummaryProps {
  metrics: PortfolioMetrics | null;
}

interface StatItem {
  label: string;
  value: string;
  color: string;
}

function getColor(value: number, thresholds: { good: number; bad: number; higherIsBetter: boolean }): string {
  if (thresholds.higherIsBetter) {
    if (value >= thresholds.good) return "text-green-500";
    if (value <= thresholds.bad) return "text-red-500";
  } else {
    if (value <= thresholds.good) return "text-green-500";
    if (value >= thresholds.bad) return "text-red-500";
  }
  return "text-foreground";
}

function buildStats(m: PortfolioMetrics): StatItem[] {
  return [
    {
      label: "Ann. Return",
      value: formatPercent(m.annualizedReturn),
      color: getColor(m.annualizedReturn, { good: 0.10, bad: 0, higherIsBetter: true }),
    },
    {
      label: "Volatility",
      value: formatPercent(m.annualizedVolatility),
      color: getColor(m.annualizedVolatility, { good: 0.20, bad: 0.50, higherIsBetter: false }),
    },
    {
      label: "Sharpe",
      value: formatRatio(m.sharpeRatio),
      color: getColor(m.sharpeRatio, { good: 1.0, bad: 0, higherIsBetter: true }),
    },
    {
      label: "Sortino",
      value: formatRatio(m.sortinoRatio),
      color: getColor(m.sortinoRatio, { good: 1.5, bad: 0, higherIsBetter: true }),
    },
    {
      label: "Max Drawdown",
      value: formatPercent(m.maxDrawdown),
      color: getColor(m.maxDrawdown, { good: -0.10, bad: -0.30, higherIsBetter: true }),
    },
    {
      label: "VaR (95%)",
      value: formatPercent(m.var95),
      color: getColor(m.var95, { good: -0.02, bad: -0.05, higherIsBetter: true }),
    },
    {
      label: "Div. Ratio",
      value: formatRatio(m.diversificationRatio),
      color: getColor(m.diversificationRatio, { good: 1.5, bad: 1.0, higherIsBetter: true }),
    },
    {
      label: "Beta (BTC)",
      value: m.betaBtc !== null ? formatRatio(m.betaBtc) : "N/A",
      color: "text-foreground",
    },
  ];
}

export function PortfolioSummary({ metrics }: PortfolioSummaryProps) {
  if (!metrics) {
    return (
      <div className="grid grid-cols-4 gap-3" data-testid="portfolio-summary-loading">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="py-3 px-4">
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              <div className="h-6 w-20 bg-muted animate-pulse rounded mt-1" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = buildStats(metrics);

  return (
    <div className="grid grid-cols-4 gap-3" data-testid="portfolio-summary">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className={cn("text-lg font-semibold", stat.color)}>{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
