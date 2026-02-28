"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import type { VaultDetails } from "@/lib/api/types";
import type { VaultMetrics } from "@/lib/metrics";

interface CompareRow {
  vault: VaultDetails;
  metrics: VaultMetrics;
}

function bestClass(values: number[], idx: number, higherIsBetter: boolean): string {
  const best = higherIsBetter ? Math.max(...values) : Math.min(...values);
  const worst = higherIsBetter ? Math.min(...values) : Math.max(...values);
  if (values[idx] === best) return "text-green-600 font-semibold";
  if (values[idx] === worst) return "text-red-600";
  return "";
}

export function CompareGrid({ rows }: { rows: CompareRow[] }) {
  if (rows.length === 0) return null;

  const metrics: {
    label: string;
    getValue: (r: CompareRow) => number;
    format: (v: number) => string;
    higherIsBetter: boolean;
  }[] = [
    { label: "APR", getValue: (r) => r.vault.apr, format: formatPercent, higherIsBetter: true },
    { label: "Cumulative PnL", getValue: (r) => r.metrics.cumulativePnL, format: formatCurrency, higherIsBetter: true },
    { label: "Max Drawdown", getValue: (r) => r.metrics.maxDrawdown, format: formatPercent, higherIsBetter: true },
    { label: "Sharpe Ratio", getValue: (r) => r.metrics.sharpeRatio, format: (v) => v.toFixed(2), higherIsBetter: true },
    { label: "Volatility", getValue: (r) => r.metrics.annualizedVolatility, format: formatPercent, higherIsBetter: false },
    { label: "RoMaD", getValue: (r) => r.metrics.romad, format: (v) => v.toFixed(2), higherIsBetter: true },
  ];

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Metric</TableHead>
          {rows.map((r) => (
            <TableHead key={r.vault.vaultAddress}>{r.vault.name}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {metrics.map((m) => {
          const values = rows.map((r) => m.getValue(r));
          return (
            <TableRow key={m.label}>
              <TableCell className="font-medium">{m.label}</TableCell>
              {rows.map((r, i) => (
                <TableCell
                  key={r.vault.vaultAddress}
                  className={bestClass(values, i, m.higherIsBetter)}
                >
                  {m.format(values[i])}
                </TableCell>
              ))}
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
