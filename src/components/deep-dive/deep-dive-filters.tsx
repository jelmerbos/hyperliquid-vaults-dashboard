"use client";

import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";
import type { DeepDivePeriod } from "@/lib/metrics/deep-dive";

interface DeepDiveFiltersProps {
  minTvl: number;
  minAgeDays: number;
  minLeaderStake: number;
  period: DeepDivePeriod;
  searchQuery: string;
  onMinTvlChange: (value: number) => void;
  onMinAgeDaysChange: (value: number) => void;
  onMinLeaderStakeChange: (value: number) => void;
  onPeriodChange: (value: DeepDivePeriod) => void;
  onSearchQueryChange: (value: string) => void;
}

const TVL_PRESETS = [0, 50_000, 100_000, 250_000, 500_000, 1_000_000, 5_000_000, 10_000_000];
const AGE_PRESETS = [30, 90, 180, 365];
const LEADER_STAKE_PRESETS = [0, 1, 5, 10, 20];
const PERIOD_OPTIONS: DeepDivePeriod[] = ["7D", "30D", "90D", "365D", "YTD", "ITD"];

export function DeepDiveFilters({
  minTvl,
  minAgeDays,
  minLeaderStake,
  period,
  searchQuery,
  onMinTvlChange,
  onMinAgeDaysChange,
  onMinLeaderStakeChange,
  onPeriodChange,
  onSearchQueryChange,
}: DeepDiveFiltersProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-6 flex-wrap">
          <div className="space-y-2 sm:min-w-[240px]">
            <label className="text-sm font-medium">Search Vault</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                placeholder="Filter by name or address..."
                className="w-full h-8 pl-9 pr-3 text-sm border rounded-md bg-background"
                aria-label="Search vaults by name"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Period</label>
            <div className="flex flex-wrap gap-2">
              {PERIOD_OPTIONS.map((p) => (
                <Button
                  key={p}
                  variant={period === p ? "default" : "outline"}
                  size="sm"
                  onClick={() => onPeriodChange(p)}
                >
                  {p}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Minimum TVL</label>
            <div className="flex flex-wrap gap-2">
              {TVL_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  variant={minTvl === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => onMinTvlChange(preset)}
                >
                  {preset === 0 ? "Any" : formatCurrency(preset)}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Custom:</span>
              <input
                type="number"
                value={minTvl}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 0) onMinTvlChange(val);
                }}
                className="w-32 h-8 px-2 text-sm border rounded-md bg-background"
                aria-label="Minimum TVL"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Minimum Age</label>
            <div className="flex flex-wrap gap-2">
              {AGE_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  variant={minAgeDays === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => onMinAgeDaysChange(preset)}
                >
                  {preset < 365 ? `${preset}d` : `${preset / 365}y`}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Custom:</span>
              <input
                type="number"
                value={minAgeDays}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!isNaN(val) && val >= 0) onMinAgeDaysChange(val);
                }}
                className="w-24 h-8 px-2 text-sm border rounded-md bg-background"
                aria-label="Minimum age in days"
              />
              <span className="text-xs text-muted-foreground">days</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Min Leader Stake</label>
            <div className="flex flex-wrap gap-2">
              {LEADER_STAKE_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  variant={minLeaderStake === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => onMinLeaderStakeChange(preset)}
                >
                  {preset === 0 ? "Any" : `${preset}%`}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Custom:</span>
              <input
                type="number"
                value={minLeaderStake}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val) && val >= 0 && val <= 100) onMinLeaderStakeChange(val);
                }}
                className="w-20 h-8 px-2 text-sm border rounded-md bg-background"
                aria-label="Minimum leader stake percentage"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
