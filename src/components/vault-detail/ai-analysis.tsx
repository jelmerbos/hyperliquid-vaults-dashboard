"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAiAnalysis, useGenerateMemo } from "@/lib/hooks/use-ai-analysis";
import { AiChat } from "@/components/vault-detail/ai-chat";
import { buildVaultContext } from "@/lib/ai/prompts";
import { positionConcentration, totalLeverage } from "@/lib/metrics/positions";
import type { AnalyzeRequest } from "@/lib/ai/types";
import type { VaultDetails, VaultPositions } from "@/lib/api/types";
import type { VaultMetrics } from "@/lib/metrics";
import { Brain, FileText, Loader2 } from "lucide-react";

interface AiAnalysisProps {
  vault: VaultDetails;
  metrics: VaultMetrics;
  positions: VaultPositions | undefined;
  tvl: number | undefined;
}

function buildRequest(
  vault: VaultDetails,
  metrics: VaultMetrics,
  positions: VaultPositions | undefined,
  tvl: number | undefined,
): AnalyzeRequest {
  const req: AnalyzeRequest = {
    mode: "classify",
    vaultName: vault.name,
    vaultDescription: vault.description,
    metrics: {
      annualizedReturn: metrics.annualizedReturn,
      annualizedVolatility: metrics.annualizedVolatility,
      maxDrawdown: metrics.maxDrawdown,
      sharpeRatio: metrics.sharpeRatio,
      sortinoRatio: metrics.sortinoRatio,
      calmarRatio: metrics.calmarRatio,
      recoveryFactor: metrics.recoveryFactor,
      cumulativeReturn: metrics.cumulativeReturn,
    },
    tvl,
    followerCount: vault.followers.length,
  };

  // VaultDetails doesn't include createTimeMillis; age is not available here

  if (positions) {
    req.positions = {
      perpPositions: positions.perp.assetPositions.map((ap) => ({
        coin: ap.position.coin,
        size: ap.position.szi,
        entryPrice: ap.position.entryPx,
        leverage: ap.position.leverage.value,
        unrealizedPnl: ap.position.unrealizedPnl,
      })),
      spotBalances: positions.spot.balances
        .filter((b) => parseFloat(b.total) > 0)
        .map((b) => ({ coin: b.coin, total: b.total })),
      totalLeverage: totalLeverage(positions.perp),
      topConcentration: positionConcentration(positions.perp),
    };
  }

  return req;
}

const STRATEGY_COLORS: Record<string, string> = {
  "delta-neutral": "bg-blue-100 text-blue-800",
  "directional-long": "bg-green-100 text-green-800",
  "directional-short": "bg-red-100 text-red-800",
  "market-making": "bg-purple-100 text-purple-800",
  "momentum": "bg-orange-100 text-orange-800",
  "mean-reversion": "bg-teal-100 text-teal-800",
  "arbitrage": "bg-indigo-100 text-indigo-800",
  "multi-strategy": "bg-yellow-100 text-yellow-800",
  "yield-farming": "bg-emerald-100 text-emerald-800",
  "unknown": "bg-gray-100 text-gray-800",
};

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = (value / 10) * 100;
  const color =
    value >= 7 ? "bg-green-500" : value >= 4 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}/10</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function AiAnalysis({
  vault,
  metrics,
  positions,
  tvl,
}: AiAnalysisProps) {
  const requestData = useMemo(
    () => buildRequest(vault, metrics, positions, tvl),
    [vault, metrics, positions, tvl],
  );

  const vaultContext = useMemo(
    () => buildVaultContext(requestData),
    [requestData],
  );

  const {
    data: analysis,
    isLoading: analysisLoading,
    error: analysisError,
  } = useAiAnalysis(requestData);

  const {
    mutate: generateMemo,
    data: memo,
    isPending: memoLoading,
    error: memoError,
  } = useGenerateMemo(requestData);

  // If AI is unavailable (no API key), don't render the section
  if (analysisError?.message === "AI_UNAVAILABLE") {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Brain className="h-5 w-5" />
        <h2 className="text-lg font-semibold">AI Analysis</h2>
        <Badge variant="outline" className="text-xs">Beta</Badge>
      </div>

      {/* Classification and Scores */}
      {analysisLoading && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
            Analyzing vault strategy...
          </CardContent>
        </Card>
      )}

      {analysisError && analysisError.message !== "AI_UNAVAILABLE" && (
        <Card>
          <CardContent className="py-6 text-center text-red-600 text-sm">
            {analysisError.message}
          </CardContent>
        </Card>
      )}

      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Strategy Classification */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Strategy Classification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                    STRATEGY_COLORS[analysis.classification.primaryStrategy] ??
                    STRATEGY_COLORS.unknown
                  }`}
                >
                  {analysis.classification.primaryStrategy}
                </span>
                {analysis.classification.secondaryStrategies.map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
              <div className="text-xs text-muted-foreground">
                Confidence: {(analysis.classification.confidence * 100).toFixed(0)}%
              </div>
              <p className="text-sm">{analysis.classification.reasoning}</p>
            </CardContent>
          </Card>

          {/* Scores */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Quality Score
                </CardTitle>
                <span className="text-2xl font-bold">
                  {analysis.score.overall}/10
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <ScoreBar label="Risk Management" value={analysis.score.riskManagement} />
              <ScoreBar label="Return Quality" value={analysis.score.returnQuality} />
              <ScoreBar label="Consistency" value={analysis.score.consistency} />
              <ScoreBar label="Transparency" value={analysis.score.transparency} />
              <p className="text-sm text-muted-foreground mt-2">
                {analysis.score.summary}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* DD Memo */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Due Diligence Memo
            </CardTitle>
            {!memo && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateMemo()}
                disabled={memoLoading}
              >
                {memoLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Generating...
                  </>
                ) : (
                  "Generate DD Memo"
                )}
              </Button>
            )}
          </div>
        </CardHeader>
        {memoError && (
          <CardContent className="pt-0">
            <p className="text-sm text-red-600">
              {memoError instanceof Error ? memoError.message : "Failed to generate memo"}
            </p>
          </CardContent>
        )}
        {memo && (
          <CardContent className="space-y-4 text-sm">
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
          </CardContent>
        )}
      </Card>

      {/* Chat */}
      <AiChat vaultContext={vaultContext} />
    </div>
  );
}
