"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  formatPercent,
  formatRatio,
  formatDaysAgo,
} from "@/lib/utils/format";
import type { DeepDiveRow } from "@/lib/hooks/use-deep-dive-vaults";

function SortHeader({
  column,
  label,
}: {
  column: {
    toggleSorting: (desc: boolean) => void;
    getIsSorted: () => false | "asc" | "desc";
  };
  label: string;
}) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="px-0 whitespace-nowrap"
    >
      {label}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );
}

function colorClass(value: number | null | undefined): string {
  if (value == null) return "text-muted-foreground";
  if (value > 0) return "text-green-600";
  if (value < 0) return "text-red-600";
  return "";
}

function MetricCell({
  value,
  formatter,
}: {
  value: number | null | undefined;
  formatter: (v: number) => string;
}) {
  if (value == null) return <span className="text-muted-foreground">N/A</span>;
  return <span className={colorClass(value)}>{formatter(value)}</span>;
}

function RatioCell({ value }: { value: number | null | undefined }) {
  if (value == null) return <span className="text-muted-foreground">N/A</span>;
  return <span>{formatRatio(value)}</span>;
}

export const deepDiveColumns: ColumnDef<DeepDiveRow>[] = [
  // Checkbox
  {
    id: "select",
    header: ({ table }) => (
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300"
        checked={table.getIsAllRowsSelected()}
        onChange={table.getToggleAllRowsSelectedHandler()}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-gray-300"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        aria-label={`Select ${row.original.vault.name}`}
      />
    ),
    enableSorting: false,
  },

  // Identity
  {
    accessorFn: (row) => row.vault.name,
    id: "name",
    header: ({ column }) => <SortHeader column={column} label="Name" />,
    cell: ({ row }) => (
      <div className="font-medium max-w-[200px] truncate" title={row.original.vault.name}>
        {row.original.vault.name}
      </div>
    ),
  },
  {
    accessorFn: (row) => parseFloat(row.listItem.summary.tvl),
    id: "tvl",
    header: ({ column }) => <SortHeader column={column} label="TVL" />,
    cell: ({ row }) =>
      formatCurrency(parseFloat(row.original.listItem.summary.tvl)),
  },
  {
    accessorFn: (row) => row.listItem.summary.createTimeMillis,
    id: "age",
    header: ({ column }) => <SortHeader column={column} label="Age" />,
    cell: ({ row }) =>
      formatDaysAgo(row.original.listItem.summary.createTimeMillis),
    sortDescFirst: true,
  },

  // Return
  {
    accessorFn: (row) => row.metrics?.annReturn ?? null,
    id: "annReturn",
    header: ({ column }) => <SortHeader column={column} label="Ann. Return" />,
    cell: ({ row }) => (
      <MetricCell value={row.original.metrics?.annReturn} formatter={formatPercent} />
    ),
    sortDescFirst: true,
    sortUndefined: "last",
  },
  {
    accessorFn: (row) => row.metrics?.cumReturn ?? null,
    id: "cumReturn",
    header: ({ column }) => <SortHeader column={column} label="Cum. Return" />,
    cell: ({ row }) => (
      <MetricCell value={row.original.metrics?.cumReturn} formatter={formatPercent} />
    ),
    sortDescFirst: true,
    sortUndefined: "last",
  },

  // Risk
  {
    accessorFn: (row) => row.metrics?.annVol ?? null,
    id: "annVol",
    header: ({ column }) => <SortHeader column={column} label="Vol" />,
    cell: ({ row }) =>
      row.original.metrics ? (
        <span>{formatPercent(row.original.metrics.annVol)}</span>
      ) : (
        <span className="text-muted-foreground">N/A</span>
      ),
    sortUndefined: "last",
  },
  {
    accessorFn: (row) => row.metrics?.maxDD ?? null,
    id: "maxDD",
    header: ({ column }) => <SortHeader column={column} label="Max DD" />,
    cell: ({ row }) => (
      <MetricCell value={row.original.metrics?.maxDD} formatter={formatPercent} />
    ),
    sortUndefined: "last",
  },
  {
    accessorFn: (row) => row.metrics?.var95 ?? null,
    id: "var95",
    header: ({ column }) => <SortHeader column={column} label="VaR 95%" />,
    cell: ({ row }) => (
      <MetricCell value={row.original.metrics?.var95} formatter={formatPercent} />
    ),
    sortUndefined: "last",
  },
  {
    accessorFn: (row) => row.metrics?.cvar95 ?? null,
    id: "cvar95",
    header: ({ column }) => <SortHeader column={column} label="CVaR 95%" />,
    cell: ({ row }) => (
      <MetricCell value={row.original.metrics?.cvar95} formatter={formatPercent} />
    ),
    sortUndefined: "last",
  },

  // Risk-Adjusted
  {
    accessorFn: (row) => row.metrics?.sharpe ?? null,
    id: "sharpe",
    header: ({ column }) => <SortHeader column={column} label="Sharpe" />,
    cell: ({ row }) => <RatioCell value={row.original.metrics?.sharpe} />,
    sortDescFirst: true,
    sortUndefined: "last",
  },
  {
    accessorFn: (row) => row.metrics?.sortino ?? null,
    id: "sortino",
    header: ({ column }) => <SortHeader column={column} label="Sortino" />,
    cell: ({ row }) => <RatioCell value={row.original.metrics?.sortino} />,
    sortDescFirst: true,
    sortUndefined: "last",
  },
  {
    accessorFn: (row) => row.metrics?.calmar ?? null,
    id: "calmar",
    header: ({ column }) => <SortHeader column={column} label="Calmar" />,
    cell: ({ row }) => <RatioCell value={row.original.metrics?.calmar} />,
    sortDescFirst: true,
    sortUndefined: "last",
  },
  {
    accessorFn: (row) => row.metrics?.winRate ?? null,
    id: "winRate",
    header: ({ column }) => <SortHeader column={column} label="Win Rate" />,
    cell: ({ row }) =>
      row.original.metrics ? (
        <span>{formatPercent(row.original.metrics.winRate)}</span>
      ) : (
        <span className="text-muted-foreground">N/A</span>
      ),
    sortDescFirst: true,
    sortUndefined: "last",
  },

  // Benchmark
  {
    accessorFn: (row) => row.metrics?.betaBtc ?? null,
    id: "betaBtc",
    header: ({ column }) => <SortHeader column={column} label="Beta (BTC)" />,
    cell: ({ row }) => <RatioCell value={row.original.metrics?.betaBtc} />,
    sortUndefined: "last",
  },
  {
    accessorFn: (row) => row.metrics?.betaHype ?? null,
    id: "betaHype",
    header: ({ column }) => <SortHeader column={column} label="Beta (HYPE)" />,
    cell: ({ row }) => <RatioCell value={row.original.metrics?.betaHype} />,
    sortUndefined: "last",
  },
];
