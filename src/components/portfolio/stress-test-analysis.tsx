"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPercent } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { StressTestResult } from "@/lib/portfolio/metrics";

interface StressTestAnalysisProps {
  vaultNames: string[];
  stressResults: StressTestResult[];
  worstReturns: { vault: string; worst1d: number; worst5d: number; worst10d: number }[];
}

function impactColor(impact: number): string {
  if (impact < -0.15) return "text-red-500";
  if (impact < -0.05) return "text-yellow-500";
  return "text-green-500";
}

export function StressTestAnalysis({
  vaultNames,
  stressResults,
  worstReturns,
}: StressTestAnalysisProps) {
  if (stressResults.length === 0 && worstReturns.length === 0) return null;

  return (
    <Card data-testid="stress-test-analysis">
      <CardHeader>
        <CardTitle className="text-base">Stress Test / Scenario Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scenario Impact Table */}
        {stressResults.length > 0 && (
          <div data-testid="scenario-table">
            <h3 className="text-sm font-medium mb-2">Scenario Impact</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-1 pr-3">Scenario</th>
                    <th className="text-right py-1 pr-3">Portfolio Impact</th>
                    {vaultNames.map((name) => (
                      <th key={name} className="text-right py-1 pr-3 hidden lg:table-cell">
                        {name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stressResults.map((result, i) => (
                    <tr key={i} className="border-b last:border-0" data-testid={`scenario-row-${i}`}>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{result.scenario.name}</div>
                        <div className="text-xs text-muted-foreground">{result.scenario.description}</div>
                      </td>
                      <td className={cn(
                        "py-2 pr-3 text-right tabular-nums font-medium",
                        impactColor(result.portfolioImpact),
                      )}>
                        {formatPercent(result.portfolioImpact)}
                      </td>
                      {result.perVaultImpact.map((impact, vi) => (
                        <td
                          key={vi}
                          className={cn(
                            "py-2 pr-3 text-right tabular-nums hidden lg:table-cell",
                            impactColor(impact),
                          )}
                        >
                          {formatPercent(impact)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Historical Worst Returns */}
        {worstReturns.length > 0 && (
          <div data-testid="worst-returns-table">
            <h3 className="text-sm font-medium mb-2">Historical Worst Returns</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-1 pr-3">Vault</th>
                    <th className="text-right py-1 pr-3">Worst 1D</th>
                    <th className="text-right py-1 pr-3">Worst 5D</th>
                    <th className="text-right py-1">Worst 10D</th>
                  </tr>
                </thead>
                <tbody>
                  {worstReturns.map((row, i) => (
                    <tr key={i} className="border-b last:border-0" data-testid={`worst-return-row-${i}`}>
                      <td className="py-1 pr-3 truncate max-w-[150px]">{row.vault}</td>
                      <td className={cn("py-1 pr-3 text-right tabular-nums", impactColor(row.worst1d))}>
                        {formatPercent(row.worst1d)}
                      </td>
                      <td className={cn("py-1 pr-3 text-right tabular-nums", impactColor(row.worst5d))}>
                        {formatPercent(row.worst5d)}
                      </td>
                      <td className={cn("py-1 text-right tabular-nums", impactColor(row.worst10d))}>
                        {formatPercent(row.worst10d)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Stress tests estimate portfolio impact under hypothetical shock scenarios using
          historical beta sensitivities. Worst returns show actual observed drawdowns over
          1, 5, and 10-day windows.
        </p>
      </CardContent>
    </Card>
  );
}
