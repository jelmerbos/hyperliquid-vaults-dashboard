"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useVaults } from "@/lib/hooks/use-vaults";
import { CompareSelector } from "@/components/compare/compare-selector";
import { CompareGrid } from "@/components/compare/compare-grid";
import { CompareCharts } from "@/components/compare/compare-charts";
import { CorrelationMatrix } from "@/components/compare/correlation-matrix";
import { computeVaultMetrics, dailyReturns } from "@/lib/metrics";
import type { TimeSeries } from "@/lib/metrics";
import type { VaultDetails } from "@/lib/api/types";

function parseTimeSeries(raw: [number, string][]): TimeSeries {
  return raw.map(([ts, val]) => [ts, parseFloat(val)]);
}

async function getVaultDetails(address: string): Promise<VaultDetails> {
  const res = await fetch(`/api/vaults/${address}`);
  if (!res.ok) throw new Error("Failed to fetch vault details");
  return res.json();
}

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: vaults } = useVaults();

  const selected = useMemo(() => {
    const param = searchParams.get("vaults");
    return param ? param.split(",").filter(Boolean) : [];
  }, [searchParams]);

  const setSelected = (addresses: string[]) => {
    const params = new URLSearchParams();
    if (addresses.length > 0) {
      params.set("vaults", addresses.join(","));
    }
    router.replace(`/compare?${params.toString()}`);
  };

  const detailQueries = useQueries({
    queries: selected.map((address) => ({
      queryKey: ["vault", address],
      queryFn: () => getVaultDetails(address),
      enabled: !!address,
    })),
  });

  const isLoading = detailQueries.some((q) => q.isLoading);

  const compareRows = useMemo(() => {
    return detailQueries
      .filter((q) => q.data)
      .map((q) => {
        const vault = q.data!;
        const allTime = vault.portfolio.find(([p]) => p === "allTime");
        if (!allTime) return null;
        const avHistory = parseTimeSeries(allTime[1].accountValueHistory);
        const pnlHistory = parseTimeSeries(allTime[1].pnlHistory);
        return { vault, metrics: computeVaultMetrics(avHistory, pnlHistory) };
      })
      .filter(Boolean) as { vault: VaultDetails; metrics: ReturnType<typeof computeVaultMetrics> }[];
  }, [detailQueries]);

  const chartVaults = useMemo(() => {
    return compareRows.map((r) => {
      const allTime = r.vault.portfolio.find(([p]) => p === "allTime");
      return {
        name: r.vault.name,
        avHistory: allTime ? parseTimeSeries(allTime[1].accountValueHistory) : [],
        pnlHistory: allTime ? parseTimeSeries(allTime[1].pnlHistory) : [],
      };
    });
  }, [compareRows]);

  const correlationData = useMemo(() => {
    return {
      names: compareRows.map((r) => r.vault.name),
      returns: compareRows.map((r) => {
        const allTime = r.vault.portfolio.find(([p]) => p === "allTime");
        if (!allTime) return [];
        return dailyReturns(parseTimeSeries(allTime[1].accountValueHistory));
      }),
    };
  }, [compareRows]);

  const activeVaults = (vaults ?? []).filter(
    (v) => !v.summary.isClosed && parseFloat(v.summary.tvl) > 100,
  );

  return (
    <main className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Compare Vaults</h1>
        <p className="text-muted-foreground mt-1">
          Select 2-4 vaults to compare side by side
        </p>
      </div>

      <CompareSelector
        vaults={activeVaults}
        selected={selected}
        onSelect={setSelected}
      />

      {isLoading && (
        <div className="py-10 text-center text-muted-foreground">
          Loading vault data...
        </div>
      )}

      {!isLoading && compareRows.length >= 2 && (
        <>
          <CompareGrid rows={compareRows} />
          <CompareCharts vaults={chartVaults} />
          <CorrelationMatrix
            vaultNames={correlationData.names}
            allDailyReturns={correlationData.returns}
          />
        </>
      )}

      {!isLoading && selected.length > 0 && compareRows.length < 2 && (
        <div className="py-10 text-center text-muted-foreground">
          Select at least 2 vaults to compare
        </div>
      )}
    </main>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="container mx-auto py-8 px-4">Loading...</div>}>
      <CompareContent />
    </Suspense>
  );
}
