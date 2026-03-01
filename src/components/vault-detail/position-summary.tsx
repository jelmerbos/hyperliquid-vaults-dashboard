"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatCurrency,
  formatPercent,
  formatMultiple,
} from "@/lib/utils/format";
import { positionConcentration, totalLeverage } from "@/lib/metrics/positions";
import type { VaultPositions } from "@/lib/api/types";

interface PositionSummaryProps {
  positions: VaultPositions;
  leaderFraction: number;
  maxDistributable: number;
  maxWithdrawable: number;
}

function SummaryCard({
  title,
  value,
  className,
}: {
  title: string;
  value: string;
  className?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-xl font-bold ${className ?? ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

export function PositionSummary({
  positions,
  leaderFraction,
  maxDistributable,
  maxWithdrawable,
}: PositionSummaryProps) {
  const leverage = totalLeverage(positions.perp);
  const concentration = positionConcentration(positions.perp, 3);
  const positionCount = positions.perp.assetPositions.length;
  const accountValue = parseFloat(
    positions.perp.marginSummary.accountValue,
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      <SummaryCard
        title="Total Leverage"
        value={formatMultiple(leverage)}
        className={leverage > 3 ? "text-[#f85149]" : ""}
      />
      <SummaryCard
        title="Top 3 Concentration"
        value={formatPercent(concentration)}
      />
      <SummaryCard
        title="Open Positions"
        value={positionCount.toString()}
      />
      <SummaryCard
        title="Leader Stake"
        value={formatPercent(leaderFraction)}
      />
      <SummaryCard
        title="Account Value"
        value={formatCurrency(accountValue)}
      />
      <SummaryCard
        title="Capacity"
        value={formatCurrency(maxWithdrawable)}
      />
    </div>
  );
}
