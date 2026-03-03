"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useState, useMemo, useCallback } from "react";
import { useVaults } from "@/lib/hooks/use-vaults";
import { usePortfolio } from "@/lib/hooks/use-portfolio";
import { VaultSelector } from "@/components/portfolio/vault-selector";
import { AllocationControls } from "@/components/portfolio/allocation-controls";
import { PortfolioSummary } from "@/components/portfolio/portfolio-summary";
import { PortfolioPerformanceChart } from "@/components/portfolio/portfolio-performance-chart";
import { EfficientFrontier } from "@/components/portfolio/efficient-frontier";
import { VaultSnapshotCard } from "@/components/portfolio/vault-snapshot-card";
import { PortfolioNotes } from "@/components/portfolio/portfolio-notes";
import { MCTRAnalysis } from "@/components/portfolio/mctr-analysis";
import { DrawdownAnalysis } from "@/components/portfolio/drawdown-analysis";
import { RollingRiskAttribution } from "@/components/portfolio/rolling-risk-attribution";
import { StressTestAnalysis } from "@/components/portfolio/stress-test-analysis";
import { CorrelationMatrix } from "@/components/compare/correlation-matrix";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { equalWeight, minVariance, riskParity, covarianceMatrix } from "@/lib/portfolio/optimizer";
import {
  computeMCTR,
  computePortfolioReturns,
  rollingRiskContribution,
  stressTest,
  worstNDayReturn,
  PREDEFINED_SCENARIOS,
} from "@/lib/portfolio/metrics";
import type { PortfolioConstraints, OptimizerStrategy } from "@/lib/portfolio/types";
import { DEFAULT_CONSTRAINTS } from "@/lib/portfolio/types";
import type { DeepDivePeriod } from "@/lib/metrics/deep-dive";
import { annualizedVolatility, drawdownSeries, drawdownEpisodes } from "@/lib/metrics/risk";
import { rollingSharpe } from "@/lib/metrics/risk-adjusted";
import { rollingBeta } from "@/lib/metrics/benchmark";
import type { TimeSeries } from "@/lib/metrics/returns";

const PERIODS: { label: string; value: DeepDivePeriod }[] = [
  { label: "7D", value: "7D" },
  { label: "30D", value: "30D" },
  { label: "90D", value: "90D" },
  { label: "1Y", value: "365D" },
  { label: "YTD", value: "YTD" },
  { label: "ITD", value: "ITD" },
];

const MS_PER_DAY = 86_400_000;

function parseTimeSeries(raw: [number, string][]): TimeSeries {
  return raw.map(([ts, val]) => [ts, parseFloat(val)]);
}

/** Align timestamps to start-of-day to match portfolio series bucketing. */
function dayAlign(series: TimeSeries): TimeSeries {
  const dayMap = new Map<number, number>();
  for (const [ts, val] of series) {
    const day = Math.floor(ts / MS_PER_DAY) * MS_PER_DAY;
    dayMap.set(day, val);
  }
  return [...dayMap.entries()].sort(([a], [b]) => a - b);
}

function PortfolioContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: vaults } = useVaults();

  // Parse URL params
  const selected = useMemo(() => {
    const param = searchParams.get("vaults");
    return param ? param.split(",").filter(Boolean) : [];
  }, [searchParams]);

  const weights = useMemo(() => {
    const param = searchParams.get("weights");
    if (!param) return selected.map(() => 1 / Math.max(selected.length, 1));
    const parsed = param.split(",").map((w) => Number(w) / 100);
    if (parsed.length !== selected.length) return selected.map(() => 1 / Math.max(selected.length, 1));
    return parsed;
  }, [searchParams, selected]);

  const period = useMemo(() => {
    const param = searchParams.get("period");
    if (param && ["7D", "30D", "90D", "365D", "YTD", "ITD"].includes(param)) {
      return param as DeepDivePeriod;
    }
    return "ITD" as DeepDivePeriod;
  }, [searchParams]);

  const constraints = useMemo((): PortfolioConstraints => {
    const minW = searchParams.get("minW");
    const maxW = searchParams.get("maxW");
    return {
      minWeight: minW ? Number(minW) / 100 : DEFAULT_CONSTRAINTS.minWeight,
      maxWeight: maxW ? Number(maxW) / 100 : DEFAULT_CONSTRAINTS.maxWeight,
    };
  }, [searchParams]);

  const minAgeDays = useMemo(() => {
    const param = searchParams.get("minAge");
    return param ? Number(param) : 0;
  }, [searchParams]);

  // URL update helpers
  const updateUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, val] of Object.entries(updates)) {
        if (val === null) params.delete(key);
        else params.set(key, val);
      }
      router.replace(`/portfolio?${params.toString()}`);
    },
    [searchParams, router],
  );

  const setSelected = useCallback(
    (addresses: string[]) => {
      const equalW = addresses.map(() => Math.round(100 / Math.max(addresses.length, 1)));
      // Fix rounding: add remainder to first
      if (equalW.length > 0) {
        equalW[0] += 100 - equalW.reduce((s, w) => s + w, 0);
      }
      updateUrl({
        vaults: addresses.length > 0 ? addresses.join(",") : null,
        weights: addresses.length > 0 ? equalW.join(",") : null,
      });
    },
    [updateUrl],
  );

  const setWeights = useCallback(
    (newWeights: number[]) => {
      const pcts = newWeights.map((w) => Math.round(w * 100));
      // Fix rounding
      if (pcts.length > 0) {
        pcts[0] += 100 - pcts.reduce((s, w) => s + w, 0);
      }
      updateUrl({ weights: pcts.join(",") });
    },
    [updateUrl],
  );

  const setConstraints = useCallback(
    (c: PortfolioConstraints) => {
      updateUrl({
        minW: String(Math.round(c.minWeight * 100)),
        maxW: String(Math.round(c.maxWeight * 100)),
      });
    },
    [updateUrl],
  );

  const setPeriod = useCallback(
    (p: DeepDivePeriod) => {
      updateUrl({ period: p });
    },
    [updateUrl],
  );

  // Portfolio data
  const portfolioData = usePortfolio(selected, weights, period, constraints);

  // Build vault points for efficient frontier scatter (with details for tooltip)
  const vaultPoints = useMemo(() => {
    return portfolioData.vaults.map((v, i) => {
      const m = portfolioData.perVaultMetrics[i];
      const pos = portfolioData.positions[i];
      const accountValue = pos ? parseFloat(pos.perp.marginSummary.accountValue || "0") : 0;
      const totalNtl = pos ? parseFloat(pos.perp.marginSummary.totalNtlPos || "0") : 0;
      return {
        name: v.name ?? v.vaultAddress,
        volatility: m?.annVol ?? 0,
        return: m?.annReturn ?? 0,
        sharpe: m?.sharpe ?? 0,
        tvl: accountValue,
        leverage: accountValue > 0 ? totalNtl / accountValue : 0,
        maxDrawdown: m?.maxDD ?? undefined,
      };
    });
  }, [portfolioData.vaults, portfolioData.perVaultMetrics, portfolioData.positions]);

  // Current portfolio point for frontier
  const currentPortfolioPoint = useMemo(() => {
    if (!portfolioData.portfolioMetrics) return undefined;
    return {
      volatility: portfolioData.portfolioMetrics.annualizedVolatility,
      return: portfolioData.portfolioMetrics.annualizedReturn,
    };
  }, [portfolioData.portfolioMetrics]);

  // Build vault performance series for overlay (day-aligned + base-100 normalized)
  const vaultPerformanceSeries = useMemo(() => {
    // Use the portfolio series date range as reference for normalization start
    const portfolioStart = portfolioData.performanceSeries.length > 0
      ? portfolioData.performanceSeries[0][0]
      : 0;

    return portfolioData.vaults.map((v) => {
      const allTime = v.portfolio.find(([p]) => p === "allTime");
      if (!allTime) return { name: v.name ?? v.vaultAddress, series: [] as TimeSeries };
      const avHistory = dayAlign(parseTimeSeries(allTime[1].accountValueHistory));
      if (avHistory.length === 0) return { name: v.name ?? v.vaultAddress, series: [] as TimeSeries };

      // Find the value at or after portfolio start for normalization base
      let base = avHistory[0][1];
      for (const [ts, val] of avHistory) {
        if (ts >= portfolioStart && val > 0) {
          base = val;
          break;
        }
      }

      // Normalize and filter to portfolio date range
      const normalized: TimeSeries = avHistory
        .filter(([ts]) => ts >= portfolioStart)
        .map(([ts, val]) => [ts, base > 0 ? (val / base) * 100 : 100]);
      return { name: v.name ?? v.vaultAddress, series: normalized };
    });
  }, [portfolioData.vaults, portfolioData.performanceSeries]);

  // MCTR analysis
  const mctrData = useMemo(() => {
    const allReturns = portfolioData.correlationData.dailyReturns;
    if (allReturns.length < 2 || weights.length !== allReturns.length) return [];
    const cov = covarianceMatrix(allReturns);
    return computeMCTR(cov, weights);
  }, [portfolioData.correlationData.dailyReturns, weights]);

  // Rolling window state
  const [rollingWindow, setRollingWindow] = useState(60);

  const vaultNames = portfolioData.vaults.map((v) => v.name ?? v.vaultAddress);

  // Drawdown analysis: per-vault episodes and drawdown series
  const perVaultAvHistories = useMemo(() => {
    return portfolioData.vaults.map((v) => {
      const allTime = v.portfolio.find(([p]) => p === "allTime");
      if (!allTime) return [] as TimeSeries;
      return dayAlign(parseTimeSeries(allTime[1].accountValueHistory));
    });
  }, [portfolioData.vaults]);

  const perVaultEpisodes = useMemo(() => {
    return perVaultAvHistories.map((avh) => drawdownEpisodes(avh));
  }, [perVaultAvHistories]);

  const perVaultDrawdownSeries = useMemo(() => {
    return perVaultAvHistories.map((avh) => drawdownSeries(avh));
  }, [perVaultAvHistories]);

  const portfolioDrawdownSeries = useMemo(() => {
    if (portfolioData.performanceSeries.length < 2) return [] as TimeSeries;
    return drawdownSeries(portfolioData.performanceSeries);
  }, [portfolioData.performanceSeries]);

  // Rolling risk attribution data
  const rollingSharpeData = useMemo(() => {
    const allReturns = portfolioData.correlationData.dailyReturns;
    if (allReturns.length < 2 || weights.length !== allReturns.length) {
      return { vaultValues: [] as number[][], portfolioValues: [] as number[] };
    }
    const portfolioRets = computePortfolioReturns(allReturns, weights);
    const portfolioValues = rollingSharpe(portfolioRets, rollingWindow);
    const vaultValues = allReturns.map((r) => rollingSharpe(r, rollingWindow));
    return { vaultValues, portfolioValues };
  }, [portfolioData.correlationData.dailyReturns, weights, rollingWindow]);

  const rollingBetaData = useMemo(() => {
    const allReturns = portfolioData.correlationData.dailyReturns;
    const btcRets = portfolioData.btcReturns;
    if (allReturns.length < 2 || !btcRets || btcRets.length < rollingWindow) {
      return [] as number[][];
    }
    return allReturns.map((r) => rollingBeta(r, btcRets, rollingWindow));
  }, [portfolioData.correlationData.dailyReturns, portfolioData.btcReturns, rollingWindow]);

  const riskContributionData = useMemo(() => {
    const allReturns = portfolioData.correlationData.dailyReturns;
    if (allReturns.length < 2 || weights.length !== allReturns.length) return [] as number[][];
    return rollingRiskContribution(allReturns, weights, rollingWindow);
  }, [portfolioData.correlationData.dailyReturns, weights, rollingWindow]);

  // Stress test data
  const stressResults = useMemo(() => {
    const allReturns = portfolioData.correlationData.dailyReturns;
    if (allReturns.length < 1 || weights.length !== allReturns.length) return [];
    return stressTest(allReturns, weights, PREDEFINED_SCENARIOS);
  }, [portfolioData.correlationData.dailyReturns, weights]);

  const worstReturns = useMemo(() => {
    const allReturns = portfolioData.correlationData.dailyReturns;
    return allReturns.map((r, i) => ({
      vault: vaultNames[i] ?? `Vault ${i}`,
      worst1d: worstNDayReturn(r, 1),
      worst5d: worstNDayReturn(r, 5),
      worst10d: worstNDayReturn(r, 10),
    }));
  }, [portfolioData.correlationData.dailyReturns, vaultNames]);

  // Optimizer handler
  const handleOptimize = useCallback(
    (strategy: OptimizerStrategy) => {
      const n = selected.length;
      if (n === 0) return;

      let newWeights: number[];
      if (strategy === "equal-weight") {
        newWeights = equalWeight(n);
      } else if (strategy === "min-variance") {
        // Need daily returns from portfolio data
        const allReturns = portfolioData.correlationData.dailyReturns;
        if (allReturns.length < 2) {
          newWeights = equalWeight(n);
        } else {
          const cov = covarianceMatrix(allReturns);
          newWeights = minVariance(cov, constraints);
        }
      } else {
        // risk-parity
        const allReturns = portfolioData.correlationData.dailyReturns;
        const vols = allReturns.map((r) => annualizedVolatility(r));
        newWeights = riskParity(vols, constraints);
      }
      setWeights(newWeights);
    },
    [selected.length, portfolioData.correlationData.dailyReturns, constraints, setWeights],
  );

  // Active vaults for selector
  const activeVaults = (vaults ?? []).filter(
    (v) => !v.summary.isClosed && parseFloat(String(v.summary.tvl ?? "0")) > 100,
  );

  return (
    <div className="py-6 px-4 md:px-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Portfolio Constructor</h1>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value ? "default" : "outline"}
              size="sm"
              onClick={() => setPeriod(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6">
        {/* Left: Vault Selector */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Vaults</CardTitle>
            </CardHeader>
            <CardContent>
              <VaultSelector
                vaults={activeVaults}
                selected={selected}
                onSelect={setSelected}
                minAgeDays={minAgeDays}
              />
              <div className="pt-3 border-t">
                <label className="text-xs text-muted-foreground block mb-1">
                  Min vault age (days)
                </label>
                <Input
                  type="number"
                  min={0}
                  value={minAgeDays}
                  onChange={(e) => updateUrl({ minAge: Number(e.target.value) > 0 ? e.target.value : null })}
                  className="w-full"
                  placeholder="0"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Main content */}
        <div className="space-y-6">
          {selected.length === 0 && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                Select vaults from the left panel to build your portfolio.
              </CardContent>
            </Card>
          )}

          {selected.length > 0 && (
            <>
              {/* Portfolio Summary */}
              <PortfolioSummary metrics={portfolioData.portfolioMetrics} />

              {/* Allocation Controls */}
              <AllocationControls
                vaultNames={vaultNames}
                weights={weights}
                onWeightsChange={setWeights}
                constraints={constraints}
                onConstraintsChange={setConstraints}
                onOptimize={handleOptimize}
              />

              {/* Performance Chart */}
              <PortfolioPerformanceChart
                portfolioSeries={portfolioData.performanceSeries}
                vaultSeries={vaultPerformanceSeries}
              />

              {/* Efficient Frontier + Correlation Matrix */}
              {selected.length >= 2 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <EfficientFrontier
                    vaultPoints={vaultPoints}
                    frontierPoints={portfolioData.frontierPoints}
                    currentPortfolio={currentPortfolioPoint}
                  />
                  <CorrelationMatrix
                    vaultNames={portfolioData.correlationData.names}
                    allDailyReturns={portfolioData.correlationData.dailyReturns}
                  />
                </div>
              )}

              {/* MCTR Analysis */}
              {selected.length >= 2 && mctrData.length > 0 && (
                <MCTRAnalysis
                  vaultNames={vaultNames}
                  weights={weights}
                  mctrData={mctrData}
                />
              )}

              {/* Drawdown Analysis */}
              {selected.length >= 1 && perVaultDrawdownSeries.some((s) => s.length > 0) && (
                <DrawdownAnalysis
                  vaultNames={vaultNames}
                  perVaultDrawdownSeries={perVaultDrawdownSeries}
                  portfolioDrawdownSeries={portfolioDrawdownSeries}
                  perVaultEpisodes={perVaultEpisodes}
                />
              )}

              {/* Rolling Risk Attribution */}
              {selected.length >= 2 && rollingSharpeData.portfolioValues.length > 0 && (
                <RollingRiskAttribution
                  vaultNames={vaultNames}
                  windowDays={rollingWindow}
                  onWindowChange={setRollingWindow}
                  rollingSharpeData={rollingSharpeData}
                  rollingBetaData={rollingBetaData}
                  riskContributionData={riskContributionData}
                />
              )}

              {/* Stress Test Analysis */}
              {selected.length >= 1 && (stressResults.length > 0 || worstReturns.length > 0) && (
                <StressTestAnalysis
                  vaultNames={vaultNames}
                  stressResults={stressResults}
                  worstReturns={worstReturns}
                />
              )}

              {/* Vault Snapshot Cards */}
              {portfolioData.vaults.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">Vault Details</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {portfolioData.vaults.map((v, i) => (
                      <VaultSnapshotCard
                        key={v.vaultAddress}
                        vault={v}
                        positions={portfolioData.positions[i]}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {portfolioData.vaults.length > 0 && (
                <PortfolioNotes
                  vaultAddresses={selected}
                  vaultNames={vaultNames}
                />
              )}

              {/* AI Evaluation Placeholder */}
              <Card data-testid="ai-placeholder">
                <CardHeader>
                  <CardTitle className="text-base">AI Portfolio Evaluation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Coming in Phase 4: AI-powered portfolio analysis with regime detection,
                    rebalancing suggestions, and risk alerts.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={<div className="py-6 px-4 md:px-6">Loading...</div>}>
      <PortfolioContent />
    </Suspense>
  );
}
