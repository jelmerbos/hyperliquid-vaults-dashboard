"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/utils/format";
import type { VaultPositions } from "@/lib/api/types";

function colorForValue(value: number): string {
  if (value > 0) return "text-accent-teal";
  if (value < 0) return "text-[#f85149]";
  return "";
}

export function PositionsTable({ positions }: { positions: VaultPositions }) {
  const perps = positions.perp.assetPositions;
  const spots = positions.spot.balances.filter(
    (b) => parseFloat(b.total) > 0 && b.coin !== "USDC",
  );

  if (perps.length === 0 && spots.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No open positions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {perps.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Perpetual Positions
              <Badge variant="secondary" className="ml-2">
                {perps.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Size</TableHead>
                  <TableHead className="text-right">Entry Price</TableHead>
                  <TableHead className="text-right">Position Value</TableHead>
                  <TableHead className="text-right">Leverage</TableHead>
                  <TableHead className="text-right">Unrealized PnL</TableHead>
                  <TableHead className="text-right">ROE</TableHead>
                  <TableHead className="text-right">Liq. Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perps
                  .sort(
                    (a, b) =>
                      Math.abs(parseFloat(b.position.positionValue)) -
                      Math.abs(parseFloat(a.position.positionValue)),
                  )
                  .map((p) => {
                    const pos = p.position;
                    const size = parseFloat(pos.szi);
                    const uPnl = parseFloat(pos.unrealizedPnl);
                    const roe = parseFloat(pos.returnOnEquity);
                    return (
                      <TableRow key={pos.coin}>
                        <TableCell className="font-medium">
                          {pos.coin}
                          <Badge
                            variant={size >= 0 ? "default" : "destructive"}
                            className="ml-2 text-xs"
                          >
                            {size >= 0 ? "Long" : "Short"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Math.abs(size).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(parseFloat(pos.entryPx))}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(
                            Math.abs(parseFloat(pos.positionValue)),
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {pos.leverage.value}x
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${colorForValue(uPnl)}`}
                        >
                          {formatCurrency(uPnl)}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${colorForValue(roe)}`}
                        >
                          {formatPercent(roe)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(parseFloat(pos.liquidationPx))}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {spots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Spot Holdings
              <Badge variant="secondary" className="ml-2">
                {spots.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Asset</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Entry Notional</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {spots.map((b) => (
                  <TableRow key={b.coin}>
                    <TableCell className="font-medium">{b.coin}</TableCell>
                    <TableCell className="text-right font-mono">
                      {parseFloat(b.total).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(parseFloat(b.entryNtl))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
