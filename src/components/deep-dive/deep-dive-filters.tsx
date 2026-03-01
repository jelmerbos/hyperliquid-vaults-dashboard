"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils/format";

interface DeepDiveFiltersProps {
  minTvl: number;
  minAgeDays: number;
  onMinTvlChange: (value: number) => void;
  onMinAgeDaysChange: (value: number) => void;
}

const TVL_PRESETS = [100_000, 250_000, 500_000, 1_000_000, 5_000_000];
const AGE_PRESETS = [30, 90, 180, 365];

export function DeepDiveFilters({
  minTvl,
  minAgeDays,
  onMinTvlChange,
  onMinAgeDaysChange,
}: DeepDiveFiltersProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row gap-6">
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
                  {formatCurrency(preset)}
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
        </div>
      </CardContent>
    </Card>
  );
}
