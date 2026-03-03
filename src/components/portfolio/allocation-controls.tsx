"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioConstraints, OptimizerStrategy } from "@/lib/portfolio/types";

interface AllocationControlsProps {
  vaultNames: string[];
  weights: number[];
  onWeightsChange: (weights: number[]) => void;
  constraints: PortfolioConstraints;
  onConstraintsChange: (constraints: PortfolioConstraints) => void;
  onOptimize: (strategy: OptimizerStrategy) => void;
}

const STRATEGIES: { label: string; value: OptimizerStrategy }[] = [
  { label: "Equal Weight", value: "equal-weight" },
  { label: "Min Variance", value: "min-variance" },
  { label: "Risk Parity", value: "risk-parity" },
];

export function AllocationControls({
  vaultNames,
  weights,
  onWeightsChange,
  constraints,
  onConstraintsChange,
  onOptimize,
}: AllocationControlsProps) {
  const weightSum = weights.reduce((s, w) => s + w, 0);
  const isBalanced = Math.abs(weightSum - 1) < 0.01;

  const handleWeightChange = (index: number, newWeight: number) => {
    const clamped = Math.max(0, Math.min(1, newWeight));
    const updated = [...weights];
    updated[index] = clamped;

    // Auto-normalize: distribute remaining weight proportionally among others
    const remaining = 1 - clamped;
    const othersSum = weights.reduce((s, w, i) => (i === index ? s : s + w), 0);

    if (othersSum > 0) {
      for (let i = 0; i < updated.length; i++) {
        if (i !== index) {
          updated[i] = (weights[i] / othersSum) * remaining;
        }
      }
    } else if (updated.length > 1) {
      const equalShare = remaining / (updated.length - 1);
      for (let i = 0; i < updated.length; i++) {
        if (i !== index) updated[i] = equalShare;
      }
    }

    onWeightsChange(updated);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Allocation</CardTitle>
          <div className="flex gap-2">
            {STRATEGIES.map((s) => (
              <Button
                key={s.value}
                variant="outline"
                size="sm"
                onClick={() => onOptimize(s.value)}
                data-strategy={s.value}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {vaultNames.map((name, i) => {
          const pct = (weights[i] ?? 0) * 100;
          return (
            <div key={name} className="flex items-center gap-3">
              <span className="text-sm w-32 truncate" title={name}>
                {name}
              </span>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(pct)}
                onChange={(e) => handleWeightChange(i, Number(e.target.value) / 100)}
                className="flex-1 h-2 accent-primary"
                aria-label={`${name} weight`}
              />
              <Input
                type="number"
                min={0}
                max={100}
                value={Math.round(pct)}
                onChange={(e) => handleWeightChange(i, Number(e.target.value) / 100)}
                className="w-16 text-right"
                aria-label={`${name} weight input`}
              />
              <span className="text-sm text-muted-foreground w-4">%</span>
            </div>
          );
        })}

        {!isBalanced && (
          <p className="text-sm text-destructive">
            Weights sum to {(weightSum * 100).toFixed(0)}% (should be 100%)
          </p>
        )}

        <div className="flex items-center gap-4 pt-2 border-t">
          <span className="text-sm text-muted-foreground">Constraints:</span>
          <div className="flex items-center gap-1">
            <span className="text-xs">Min</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={Math.round(constraints.minWeight * 100)}
              onChange={(e) =>
                onConstraintsChange({
                  ...constraints,
                  minWeight: Number(e.target.value) / 100,
                })
              }
              className="w-16 text-right"
              aria-label="Min weight constraint"
            />
            <span className="text-xs">%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs">Max</span>
            <Input
              type="number"
              min={0}
              max={100}
              value={Math.round(constraints.maxWeight * 100)}
              onChange={(e) =>
                onConstraintsChange({
                  ...constraints,
                  maxWeight: Number(e.target.value) / 100,
                })
              }
              className="w-16 text-right"
              aria-label="Max weight constraint"
            />
            <span className="text-xs">%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
