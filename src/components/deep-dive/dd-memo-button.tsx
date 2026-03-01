"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGenerateMemo } from "@/lib/hooks/use-ai-analysis";
import { FileText, Loader2 } from "lucide-react";
import type { VaultDetails } from "@/lib/api/types";
import type { DeepDiveMetrics } from "@/lib/metrics/deep-dive";
import type { AnalyzeRequest } from "@/lib/ai/types";

interface DDMemoButtonProps {
  vault: VaultDetails;
  metrics: DeepDiveMetrics;
}

function buildMemoRequest(
  vault: VaultDetails,
  metrics: DeepDiveMetrics,
): AnalyzeRequest {
  return {
    mode: "memo",
    vaultName: vault.name,
    vaultDescription: vault.description,
    metrics: {
      annualizedReturn: metrics.annReturn,
      annualizedVolatility: metrics.annVol,
      maxDrawdown: metrics.maxDD,
      sharpeRatio: metrics.sharpe,
      sortinoRatio: metrics.sortino,
      calmarRatio: metrics.calmar,
      recoveryFactor: metrics.recoveryFactor,
      cumulativeReturn: metrics.cumReturn,
    },
    tvl: undefined,
    followerCount: vault.followers.length,
  };
}

export function DDMemoButton({ vault, metrics }: DDMemoButtonProps) {
  const [open, setOpen] = useState(false);

  const requestData = useMemo(
    () => buildMemoRequest(vault, metrics),
    [vault, metrics],
  );

  const {
    mutate: generateMemo,
    data: memo,
    isPending,
    error,
  } = useGenerateMemo(requestData);

  const handleClick = () => {
    setOpen(true);
    if (!memo) {
      generateMemo();
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={handleClick}
      >
        <FileText className="h-3 w-3 mr-1" />
        DD
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              DD Memo: {vault.name}
            </DialogTitle>
          </DialogHeader>

          {isPending && (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
              Generating due diligence memo...
            </div>
          )}

          {error && (
            <div className="py-4 text-center text-sm text-red-600">
              {error instanceof Error ? error.message : "Failed to generate memo"}
            </div>
          )}

          {memo && (
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-semibold mb-1">Strategy Overview</h4>
                <p className="text-muted-foreground">{memo.sections.strategyOverview}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Risk Assessment</h4>
                <p className="text-muted-foreground">{memo.sections.riskAssessment}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Edge Hypothesis</h4>
                <p className="text-muted-foreground">{memo.sections.edgeHypothesis}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Concerns</h4>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  {memo.sections.concerns.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Capacity Analysis</h4>
                <p className="text-muted-foreground">{memo.sections.capacityAnalysis}</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">Recommendation</h4>
                <p className="font-medium">{memo.sections.recommendation}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
