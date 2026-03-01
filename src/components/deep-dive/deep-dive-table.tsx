"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  SortingState,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { deepDiveColumns } from "./deep-dive-columns";
import type { DeepDiveRow } from "@/lib/hooks/use-deep-dive-vaults";

interface DeepDiveTableProps {
  rows: DeepDiveRow[];
  isLoading: boolean;
}

export function DeepDiveTable({ rows, isLoading }: DeepDiveTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([
    { id: "sharpe", desc: true },
  ]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useReactTable({
    data: rows,
    columns: deepDiveColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    state: { sorting, rowSelection },
  });

  const selectedAddresses = useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((key) => {
        const row = table.getRowModel().rowsById[key] ?? table.getCoreRowModel().rowsById[key];
        return row?.original?.vault?.vaultAddress;
      })
      .filter(Boolean) as string[];
  }, [rowSelection, table]);

  const canCompare = selectedAddresses.length >= 2 && selectedAddresses.length <= 4;

  const handleCompare = () => {
    if (!canCompare) return;
    router.push(`/compare?vaults=${selectedAddresses.join(",")}`);
  };

  if (isLoading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {deepDiveColumns.map((col, i) => (
                <TableHead key={i}>
                  <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {deepDiveColumns.map((_, j) => (
                  <TableCell key={j}>
                    <div className="h-4 w-12 bg-muted animate-pulse rounded" />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {selectedAddresses.length > 0 && (
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {selectedAddresses.length} vault{selectedAddresses.length !== 1 ? "s" : ""} selected
          </span>
          <Button
            onClick={handleCompare}
            disabled={!canCompare}
            size="sm"
          >
            Compare Selected
          </Button>
          {selectedAddresses.length > 4 && (
            <span className="text-sm text-[#f85149]">Max 4 vaults for comparison</span>
          )}
          {selectedAddresses.length === 1 && (
            <span className="text-sm text-muted-foreground">Select at least 2</span>
          )}
        </div>
      )}

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, idx) => (
                  <TableHead
                    key={header.id}
                    className={`whitespace-nowrap ${
                      idx === 0
                        ? "sticky left-0 z-20 bg-background"
                        : idx === 1
                          ? "sticky left-[40px] z-20 bg-background"
                          : ""
                    }`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={
                    row.original.metrics === null
                      ? "text-muted-foreground opacity-60"
                      : ""
                  }
                >
                  {row.getVisibleCells().map((cell, idx) => (
                    <TableCell
                      key={cell.id}
                      className={`whitespace-nowrap ${
                        idx === 0
                          ? "sticky left-0 z-10 bg-background"
                          : idx === 1
                            ? "sticky left-[40px] z-10 bg-background"
                            : ""
                      }`}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={deepDiveColumns.length}
                  className="h-24 text-center"
                >
                  No qualifying vaults found. Try lowering the filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        {rows.length} vault{rows.length !== 1 ? "s" : ""} displayed
      </div>
    </div>
  );
}
