"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { useVaults } from "@/lib/hooks/use-vaults";
import { columns } from "./columns";
import { DataTable } from "./data-table";
import type { VaultListItem } from "@/lib/api/types";

const MS_PER_DAY = 86_400_000;

export function VaultTable() {
  const router = useRouter();
  const { data: vaults, isLoading, error } = useVaults();
  const [search, setSearch] = useState("");
  const [minTvl, setMinTvl] = useState("1000");
  const [minAgeDays, setMinAgeDays] = useState("7");

  const now = Date.now();
  const filteredVaults = useMemo(() => {
    const all = (vaults ?? []).filter(
      (v) => !v.summary.isClosed && parseFloat(v.summary.tvl) > 100,
    );

    return all.filter((v) => {
      if (search && !v.summary.name.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      const tvlThreshold = parseFloat(minTvl) || 0;
      if (parseFloat(v.summary.tvl) < tvlThreshold) return false;
      const ageDays = (now - v.summary.createTimeMillis) / MS_PER_DAY;
      const ageThreshold = parseFloat(minAgeDays) || 0;
      if (ageDays < ageThreshold) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vaults, search, minTvl, minAgeDays]);

  if (isLoading) {
    return <div className="py-10 text-center text-muted-foreground">Loading vaults...</div>;
  }

  if (error) {
    return (
      <div className="py-10 text-center text-[#f85149]">
        Failed to load vaults: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-[250px]"
        />
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Min TVL ($)</span>
          <Input
            type="number"
            value={minTvl}
            onChange={(e) => setMinTvl(e.target.value)}
            className="w-[120px]"
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Min age (days)</span>
          <Input
            type="number"
            value={minAgeDays}
            onChange={(e) => setMinAgeDays(e.target.value)}
            className="w-[100px]"
          />
        </div>
      </div>
      <DataTable
        columns={columns}
        data={filteredVaults}
        onRowClick={(row: VaultListItem) =>
          router.push(`/vaults/${row.summary.vaultAddress}`)
        }
      />
    </div>
  );
}
