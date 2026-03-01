"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercent, formatDaysAgo } from "@/lib/utils/format";
import type { VaultListItem } from "@/lib/api/types";

function SortHeader({
  column,
  label,
}: {
  column: { toggleSorting: (desc: boolean) => void; getIsSorted: () => false | "asc" | "desc" };
  label: string;
}) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      className="px-0"
    >
      {label}
      <ArrowUpDown className="ml-1 h-4 w-4" />
    </Button>
  );
}

export const columns: ColumnDef<VaultListItem>[] = [
  {
    accessorFn: (row) => row.summary.name,
    id: "name",
    header: ({ column }) => <SortHeader column={column} label="Name" />,
    cell: ({ row }) => (
      <div className="font-medium">{row.original.summary.name}</div>
    ),
  },
  {
    accessorKey: "apr",
    header: ({ column }) => <SortHeader column={column} label="APR" />,
    cell: ({ row }) => {
      const apr = row.original.apr;
      return (
        <span className={apr >= 0 ? "text-accent-teal" : "text-[#f85149]"}>
          {formatPercent(apr)}
        </span>
      );
    },
  },
  {
    accessorFn: (row) => parseFloat(row.summary.tvl),
    id: "tvl",
    header: ({ column }) => <SortHeader column={column} label="TVL" />,
    cell: ({ row }) => formatCurrency(parseFloat(row.original.summary.tvl)),
  },
  {
    accessorFn: (row) => row.summary.createTimeMillis,
    id: "age",
    header: ({ column }) => <SortHeader column={column} label="Age" />,
    cell: ({ row }) => formatDaysAgo(row.original.summary.createTimeMillis),
    sortDescFirst: true,
  },
];
