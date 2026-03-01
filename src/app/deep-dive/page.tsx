"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDeepDiveVaults } from "@/lib/hooks/use-deep-dive-vaults";
import { DeepDiveTable } from "@/components/deep-dive/deep-dive-table";
import { DeepDiveFilters } from "@/components/deep-dive/deep-dive-filters";
import { DeepDiveChart } from "@/components/deep-dive/deep-dive-chart";
import type { DeepDivePeriod } from "@/lib/metrics/deep-dive";

const DEFAULT_MIN_TVL = 500_000;
const DEFAULT_MIN_AGE_DAYS = 180;
const DEFAULT_PERIOD: DeepDivePeriod = "ITD";
const VALID_PERIODS = new Set<DeepDivePeriod>(["7D", "30D", "90D", "365D", "YTD", "ITD"]);

function DeepDiveContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const minTvl = Number(searchParams.get("minTvl")) || DEFAULT_MIN_TVL;
  const minAgeDays = Number(searchParams.get("minAge")) || DEFAULT_MIN_AGE_DAYS;
  const periodParam = searchParams.get("period") as DeepDivePeriod | null;
  const period: DeepDivePeriod = periodParam && VALID_PERIODS.has(periodParam) ? periodParam : DEFAULT_PERIOD;

  const { rows, qualifying, isLoading } = useDeepDiveVaults(minTvl, minAgeDays, period);

  const updateParam = (key: string, value: string | number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, String(value));
    router.replace(`/deep-dive?${params.toString()}`);
  };

  return (
    <main className="container mx-auto py-8 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Vaults Deep Dive</h1>
        <p className="text-muted-foreground mt-1">
          Institutional-grade analysis of top qualifying vaults. Sorted by Sharpe ratio.
        </p>
      </div>

      <DeepDiveFilters
        minTvl={minTvl}
        minAgeDays={minAgeDays}
        period={period}
        onMinTvlChange={(v) => updateParam("minTvl", v)}
        onMinAgeDaysChange={(v) => updateParam("minAge", v)}
        onPeriodChange={(v) => updateParam("period", v)}
      />

      {!isLoading && qualifying.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {qualifying.length} vault{qualifying.length !== 1 ? "s" : ""} qualify
          {rows.length < qualifying.length
            ? ` (loading details for ${qualifying.length - rows.length} more...)`
            : ""}
        </p>
      )}

      <DeepDiveTable rows={rows} isLoading={isLoading} />

      {!isLoading && rows.length > 0 && <DeepDiveChart rows={rows} />}
    </main>
  );
}

export default function DeepDivePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto py-8 px-4">Loading...</div>
      }
    >
      <DeepDiveContent />
    </Suspense>
  );
}
