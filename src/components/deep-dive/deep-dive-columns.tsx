"use client";

import Link from "next/link";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatCurrency,
  formatPercent,
  formatRatio,
  formatDaysAgo,
} from "@/lib/utils/format";
import { inferStrategy } from "@/lib/utils/infer-strategy";
import { DDMemoButton } from "./dd-memo-button";
import type { StrategyCategory } from "@/lib/ai/types";
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

function PercentileBadge({ pct }: { pct: number | undefined }) {
  if (pct == null) return null;
  let bg = "bg-muted text-muted-foreground";
  if (pct >= 75) bg = "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
  else if (pct <= 25) bg = "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
  return (
    <span className={`ml-1 text-[10px] px-1 py-0.5 rounded ${bg}`}>
      p{pct}
    </span>
  );
}

const STRATEGY_COLORS: Record<StrategyCategory, string> = {
  "delta-neutral": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "directional-long": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "directional-short": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  "market-making": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  "momentum": "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
  "mean-reversion": "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300",
  "arbitrage": "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300",
  "multi-strategy": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  "yield-farming": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
  "unknown": "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
};

function StrategyBadge({ strategy }: { strategy: StrategyCategory }) {
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${STRATEGY_COLORS[strategy]}`}>
      {strategy}
    </span>
  );
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
      <Link
        href={`/vaults/${row.original.vault.vaultAddress}`}
        className="font-medium max-w-[200px] truncate flex items-center gap-1 hover:underline"
        title={row.original.vault.name}
      >
        {row.original.vault.name}
        <ExternalLink className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
      </Link>
    ),
  },
  {
    accessorFn: (row) => row.vault.description || "",
    id: "description",
    header: "Description",
    cell: ({ row }) => {
      const desc = row.original.vault.description;
      if (!desc) return <span className="text-muted-foreground">-</span>;
      return (
        <span
          className="max-w-[250px] truncate block text-xs text-muted-foreground"
          title={desc}
        >
          {desc}
        </span>
      );
    },
    enableSorting: false,
  },
  {
    accessorFn: (row) =>
      inferStrategy(row.vault.name, row.vault.description),
    id: "strategy",
    header: "Strategy",
    cell: ({ row }) => {
      const strategy = inferStrategy(
        row.original.vault.name,
        row.original.vault.description,
      );
      return <StrategyBadge strategy={strategy} />;
    },
    enableSorting: false,
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
      <span className="inline-flex items-center">
        <MetricCell value={row.original.metrics?.annReturn} formatter={formatPercent} />
        <PercentileBadge pct={row.original.percentiles?.annReturn} />
      </span>
    ),
    sortDescFirst: true,
    sortUndefined: "last",
  },
  {
    accessorFn: (row) => row.metrics?.cumReturn ?? null,
    id: "cumReturn",
    header: ({ column }) => <SortHeader column={column} label="Cum. Return" />,
    cell: ({ row }) => (
      <span className="inline-flex items-center">
        <MetricCell value={row.original.metrics?.cumReturn} formatter={formatPercent} />
        <PercentileBadge pct={row.original.percentiles?.cumReturn} />
      </span>
    ),
    sortDescFirst: true,
    sortUndefined: "last",
  },

  // P&L
  {
    accessorFn: (row) => row.metrics?.pnl ?? null,
    id: "pnl",
    header: ({ column }) => <SortHeader column={column} label="P&L" />,
    cell: ({ row }) => (
      <MetricCell value={row.original.metrics?.pnl} formatter={formatCurrency} />
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
        <span className="inline-flex items-center">
          <span>{formatPercent(row.original.metrics.annVol)}</span>
          <PercentileBadge pct={row.original.percentiles?.annVol} />
        </span>
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
      <span className="inline-flex items-center">
        <MetricCell value={row.original.metrics?.maxDD} formatter={formatPercent} />
        <PercentileBadge pct={row.original.percentiles?.maxDD} />
      </span>
    ),
    sortUndefined: "last",
  },
  {
    accessorFn: (row) => row.metrics?.var95 ?? null,
    id: "var95",
    header: ({ column }) => <SortHeader column={column} label="VaR 95%" />,
    cell: ({ row }) => (
      <span className="inline-flex items-center">
        <MetricCell value={row.original.metrics?.var95} formatter={formatPercent} />
        <PercentileBadge pct={row.original.percentiles?.var95} />
      </span>
    ),
    sortUndefined: "last",
  },
  {
    accessorFn: (row) => row.metrics?.cvar95 ?? null,
    id: "cvar95",
    header: ({ column }) => <SortHeader column={column} label="CVaR 95%" />,
    cell: ({ row }) => (
      <span className="inline-flex items-center">
        <MetricCell value={row.original.metrics?.cvar95} formatter={formatPercent} />
        <PercentileBadge pct={row.original.percentiles?.cvar95} />
      </span>
    ),
    sortUndefined: "last",
  },

  // Risk-Adjusted
  {
    accessorFn: (row) => row.metrics?.sharpe ?? null,
    id: "sharpe",
    header: ({ column }) => <SortHeader column={column} label="Sharpe" />,
    cell: ({ row }) => (
      <span className="inline-flex items-center">
        <RatioCell value={row.original.metrics?.sharpe} />
        <PercentileBadge pct={row.original.percentiles?.sharpe} />
      </span>
    ),
    sortDescFirst: true,
    sortUndefined: "last",
  },
  {
    accessorFn: (row) => row.metrics?.sortino ?? null,
    id: "sortino",
    header: ({ column }) => <SortHeader column={column} label="Sortino" />,
    cell: ({ row }) => (
      <span className="inline-flex items-center">
        <RatioCell value={row.original.metrics?.sortino} />
        <PercentileBadge pct={row.original.percentiles?.sortino} />
      </span>
    ),
    sortDescFirst: true,
    sortUndefined: "last",
  },
  {
    accessorFn: (row) => row.metrics?.calmar ?? null,
    id: "calmar",
    header: ({ column }) => <SortHeader column={column} label="Calmar" />,
    cell: ({ row }) => (
      <span className="inline-flex items-center">
        <RatioCell value={row.original.metrics?.calmar} />
        <PercentileBadge pct={row.original.percentiles?.calmar} />
      </span>
    ),
    sortDescFirst: true,
    sortUndefined: "last",
  },
  {
    accessorFn: (row) => row.metrics?.winRate ?? null,
    id: "winRate",
    header: ({ column }) => <SortHeader column={column} label="Win Rate" />,
    cell: ({ row }) =>
      row.original.metrics ? (
        <span className="inline-flex items-center">
          <span>{formatPercent(row.original.metrics.winRate)}</span>
          <PercentileBadge pct={row.original.percentiles?.winRate} />
        </span>
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

  // AI Due Diligence
  {
    id: "dd",
    header: "AI DD",
    cell: ({ row }) => {
      if (!row.original.metrics) {
        return <span className="text-muted-foreground text-xs">-</span>;
      }
      return (
        <DDMemoButton
          vault={row.original.vault}
          metrics={row.original.metrics}
        />
      );
    },
    enableSorting: false,
  },
];
