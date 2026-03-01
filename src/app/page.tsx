"use client";

import { useMemo } from "react";
import { VaultTable } from "@/components/vault-table/vault-table";
import { StatCard } from "@/components/stat-card";
import { useVaults } from "@/lib/hooks/use-vaults";
import { formatCurrency, formatPercent } from "@/lib/utils/format";

export default function Home() {
  const { data: vaults } = useVaults();

  const stats = useMemo(() => {
    if (!vaults) return null;
    const active = vaults.filter((v) => !v.summary.isClosed);
    const totalVaults = active.length;
    const totalTvl = active.reduce((sum, v) => sum + parseFloat(v.summary.tvl), 0);
    const aprs = active.map((v) => v.apr).filter((a) => a !== 0);
    const avgApr = aprs.length > 0 ? aprs.reduce((s, a) => s + a, 0) / aprs.length : 0;
    const topApr = aprs.length > 0 ? Math.max(...aprs) : 0;
    return { totalVaults, totalTvl, avgApr, topApr };
  }, [vaults]);

  return (
    <div className="py-6 px-4 md:px-6 space-y-6">
      <h1 className="text-2xl font-bold">Vaults</h1>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Vaults" value={stats.totalVaults.toLocaleString()} />
          <StatCard label="Total TVL" value={formatCurrency(stats.totalTvl)} />
          <StatCard label="Avg APR" value={formatPercent(stats.avgApr)} />
          <StatCard label="Top Vault APR" value={formatPercent(stats.topApr)} />
        </div>
      )}

      <VaultTable />
    </div>
  );
}
