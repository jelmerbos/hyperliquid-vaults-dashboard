"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDeepDiveVaults } from "@/lib/hooks/use-deep-dive-vaults";
import { DeepDiveTable } from "@/components/deep-dive/deep-dive-table";
import { DeepDiveFilters } from "@/components/deep-dive/deep-dive-filters";

const DEFAULT_MIN_TVL = 500_000;
const DEFAULT_MIN_AGE_DAYS = 180;

function DeepDiveContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const minTvl = Number(searchParams.get("minTvl")) || DEFAULT_MIN_TVL;
  const minAgeDays = Number(searchParams.get("minAge")) || DEFAULT_MIN_AGE_DAYS;

  const { rows, qualifying, isLoading } = useDeepDiveVaults(minTvl, minAgeDays);

  const updateParam = (key: string, value: number) => {
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
        onMinTvlChange={(v) => updateParam("minTvl", v)}
        onMinAgeDaysChange={(v) => updateParam("minAge", v)}
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
