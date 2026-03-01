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
const DEFAULT_MIN_LEADER_STAKE = 0;
const DEFAULT_PERIOD: DeepDivePeriod = "ITD";
const VALID_PERIODS = new Set<DeepDivePeriod>(["7D", "30D", "90D", "365D", "YTD", "ITD"]);

function DeepDiveContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const minTvl = Number(searchParams.get("minTvl")) || DEFAULT_MIN_TVL;
  const minAgeDays = Number(searchParams.get("minAge")) || DEFAULT_MIN_AGE_DAYS;
  const minLeaderStake = Number(searchParams.get("minStake")) || DEFAULT_MIN_LEADER_STAKE;
  const periodParam = searchParams.get("period") as DeepDivePeriod | null;
  const period: DeepDivePeriod = periodParam && VALID_PERIODS.has(periodParam) ? periodParam : DEFAULT_PERIOD;

  const { rows, qualifying, isLoading } = useDeepDiveVaults(minTvl, minAgeDays, period, minLeaderStake / 100);

  const updateParam = (key: string, value: string | number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, String(value));
    router.replace(`/deep-dive?${params.toString()}`);
  };

  return (
    <div className="py-6 px-4 md:px-6 space-y-6">
      <h1 className="text-2xl font-bold">Deep Dive</h1>

      <DeepDiveFilters
        minTvl={minTvl}
        minAgeDays={minAgeDays}
        minLeaderStake={minLeaderStake}
        period={period}
        onMinTvlChange={(v) => updateParam("minTvl", v)}
        onMinAgeDaysChange={(v) => updateParam("minAge", v)}
        onMinLeaderStakeChange={(v) => updateParam("minStake", v)}
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
    </div>
  );
}

export default function DeepDivePage() {
  return (
    <Suspense
      fallback={
        <div className="py-6 px-4 md:px-6">Loading...</div>
      }
    >
      <DeepDiveContent />
    </Suspense>
  );
}
