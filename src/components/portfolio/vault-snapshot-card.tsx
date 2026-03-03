"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent, formatMultiple } from "@/lib/utils/format";
import { cn } from "@/lib/utils";
import type { VaultDetails, VaultPositions } from "@/lib/api/types";

interface VaultSnapshotCardProps {
  vault: VaultDetails;
  positions: VaultPositions;
}

function statusColor(ok: boolean, caution: boolean): string {
  if (!ok) return "text-red-500";
  if (caution) return "text-yellow-500";
  return "text-green-500";
}

interface PositionBreakdown {
  totalPositions: number;
  longCount: number;
  shortCount: number;
  longNotional: number;
  shortNotional: number;
  netDirection: "Long" | "Short" | "Neutral";
  netRatio: number; // long / (long + short) notional, 0-1
  marginUtilization: number; // totalMarginUsed / accountValue
}

function analyzePositions(positions: VaultPositions): PositionBreakdown {
  const perps = positions.perp.assetPositions;
  let longCount = 0;
  let shortCount = 0;
  let longNotional = 0;
  let shortNotional = 0;

  for (const ap of perps) {
    const szi = parseFloat(ap.position.szi || "0");
    const posValue = Math.abs(parseFloat(ap.position.positionValue || "0"));
    if (szi > 0) {
      longCount++;
      longNotional += posValue;
    } else if (szi < 0) {
      shortCount++;
      shortNotional += posValue;
    }
  }

  const totalNotional = longNotional + shortNotional;
  const netRatio = totalNotional > 0 ? longNotional / totalNotional : 0.5;
  const netDirection: "Long" | "Short" | "Neutral" =
    netRatio > 0.6 ? "Long" : netRatio < 0.4 ? "Short" : "Neutral";

  const accountValue = parseFloat(positions.perp.marginSummary.accountValue || "0");
  const totalMarginUsed = parseFloat(positions.perp.marginSummary.totalMarginUsed || "0");
  const marginUtilization = accountValue > 0 ? totalMarginUsed / accountValue : 0;

  return {
    totalPositions: longCount + shortCount,
    longCount,
    shortCount,
    longNotional,
    shortNotional,
    netDirection,
    netRatio,
    marginUtilization,
  };
}

export function VaultSnapshotCard({ vault, positions }: VaultSnapshotCardProps) {
  const accountValue = parseFloat(positions.perp.marginSummary.accountValue || "0");
  const totalNotional = parseFloat(positions.perp.marginSummary.totalNtlPos || "0");
  const leverage = accountValue > 0 ? totalNotional / accountValue : 0;
  const leaderStake = vault.leaderFraction ?? 0;
  const maxWithdrawable = vault.maxWithdrawable ? parseFloat(String(vault.maxWithdrawable)) : 0;

  const isHighLeverage = leverage > 3;
  const isLowStake = leaderStake < 0.10;
  const isClosed = vault.isClosed;
  const noDeposits = !vault.allowDeposits;

  const pb = analyzePositions(positions);

  return (
    <Card data-testid={`snapshot-${vault.vaultAddress}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm truncate" title={vault.name}>
          {vault.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">TVL</p>
          <p className="font-medium">{formatCurrency(accountValue)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Leader Stake</p>
          <p className={cn("font-medium", statusColor(!isLowStake || !isClosed, isLowStake))}>
            {formatPercent(leaderStake)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Leverage</p>
          <p className={cn("font-medium", statusColor(!isHighLeverage, isHighLeverage))}>
            {formatMultiple(leverage)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Redemption</p>
          <p className={cn(
            "font-medium",
            isClosed || noDeposits ? "text-red-500" : "text-green-500",
          )}>
            {isClosed ? "Closed" : noDeposits ? "No deposits" : "Open"}
          </p>
        </div>

        {/* Position breakdown */}
        <div>
          <p className="text-xs text-muted-foreground">Positions</p>
          <p className="font-medium" data-testid="position-count">
            {pb.totalPositions}
            <span className="text-xs text-muted-foreground ml-1">
              ({pb.longCount}L / {pb.shortCount}S)
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Net Direction</p>
          <p className={cn("font-medium", {
            "text-green-500": pb.netDirection === "Long",
            "text-red-500": pb.netDirection === "Short",
            "text-foreground": pb.netDirection === "Neutral",
          })} data-testid="net-direction">
            {pb.netDirection}
            <span className="text-xs text-muted-foreground ml-1">
              ({formatPercent(pb.netRatio)} L)
            </span>
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Margin Used</p>
          <p className={cn(
            "font-medium",
            statusColor(pb.marginUtilization < 0.7, pb.marginUtilization > 0.5),
          )} data-testid="margin-util">
            {formatPercent(pb.marginUtilization)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Commission</p>
          <p className="font-medium">
            {formatPercent(vault.leaderCommission ?? 0)}
          </p>
        </div>

        {/* Long vs Short bar */}
        {pb.totalPositions > 0 && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground mb-1">Long/Short Exposure</p>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-muted">
              <div
                className="bg-green-500/70 transition-all"
                style={{ width: `${pb.netRatio * 100}%` }}
              />
              <div
                className="bg-red-500/70 transition-all"
                style={{ width: `${(1 - pb.netRatio) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
              <span>{formatCurrency(pb.longNotional)} Long</span>
              <span>{formatCurrency(pb.shortNotional)} Short</span>
            </div>
          </div>
        )}

        {maxWithdrawable > 0 && (
          <div className="col-span-2">
            <p className="text-xs text-muted-foreground">Max Withdrawable</p>
            <p className="font-medium">{formatCurrency(maxWithdrawable)}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
