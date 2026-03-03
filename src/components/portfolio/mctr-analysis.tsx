"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

interface MCTRRow {
  mctr: number;
  componentRisk: number;
  percentContribution: number;
}

interface MCTRAnalysisProps {
  vaultNames: string[];
  weights: number[];
  mctrData: MCTRRow[];
}

export function MCTRAnalysis({ vaultNames, weights, mctrData }: MCTRAnalysisProps) {
  if (mctrData.length === 0 || mctrData.length !== vaultNames.length) {
    return null;
  }

  // Sort by percent contribution descending for display
  const indexed = mctrData.map((row, i) => ({ ...row, index: i }));
  const sorted = [...indexed].sort((a, b) => b.percentContribution - a.percentContribution);

  const maxPct = Math.max(...mctrData.map((r) => Math.abs(r.percentContribution)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Marginal Contribution to Risk</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {/* Header */}
          <div className="grid grid-cols-[1fr_80px_80px_80px_1fr] gap-2 text-xs text-muted-foreground border-b pb-1">
            <span>Vault</span>
            <span className="text-right">Weight</span>
            <span className="text-right">MCTR</span>
            <span className="text-right">% of Risk</span>
            <span />
          </div>
          {sorted.map((row) => {
            const barWidth = maxPct > 0 ? (Math.abs(row.percentContribution) / maxPct) * 100 : 0;
            const isOverweight = row.percentContribution > (weights[row.index] + 0.05);
            return (
              <div
                key={row.index}
                className="grid grid-cols-[1fr_80px_80px_80px_1fr] gap-2 items-center text-sm py-1"
                data-testid={`mctr-row-${row.index}`}
              >
                <span className="truncate" title={vaultNames[row.index]}>
                  {vaultNames[row.index]}
                </span>
                <span className="text-right tabular-nums">
                  {formatPercent(weights[row.index])}
                </span>
                <span className="text-right tabular-nums">
                  {formatPercent(row.mctr)}
                </span>
                <span className={cn(
                  "text-right tabular-nums font-medium",
                  isOverweight ? "text-yellow-500" : "text-foreground",
                )}>
                  {formatPercent(row.percentContribution)}
                </span>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      isOverweight ? "bg-yellow-500/60" : "bg-primary/40",
                    )}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          MCTR shows each vault&apos;s marginal impact on portfolio volatility. Highlighted rows
          contribute disproportionately more risk than their weight.
        </p>
      </CardContent>
    </Card>
  );
}
