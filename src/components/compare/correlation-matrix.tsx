"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { correlationMatrix } from "@/lib/metrics/benchmark";

interface CorrelationMatrixProps {
  vaultNames: string[];
  allDailyReturns: number[][];
}

function colorForCorrelation(value: number): string {
  if (value >= 0.7) return "bg-red-100 text-red-800";
  if (value >= 0.3) return "bg-orange-50 text-orange-800";
  if (value >= -0.3) return "bg-gray-50 text-gray-700";
  if (value >= -0.7) return "bg-blue-50 text-blue-800";
  return "bg-blue-100 text-blue-800";
}

export function CorrelationMatrix({
  vaultNames,
  allDailyReturns,
}: CorrelationMatrixProps) {
  if (vaultNames.length < 2) return null;

  const matrix = correlationMatrix(allDailyReturns);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Correlation Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2 font-medium text-muted-foreground" />
                {vaultNames.map((name) => (
                  <th
                    key={name}
                    className="p-2 font-medium text-muted-foreground text-center max-w-[120px] truncate"
                    title={name}
                  >
                    {name.length > 12 ? `${name.slice(0, 12)}...` : name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrix.map((row, i) => (
                <tr key={vaultNames[i]}>
                  <td
                    className="p-2 font-medium max-w-[120px] truncate"
                    title={vaultNames[i]}
                  >
                    {vaultNames[i].length > 12
                      ? `${vaultNames[i].slice(0, 12)}...`
                      : vaultNames[i]}
                  </td>
                  {row.map((value, j) => (
                    <td
                      key={vaultNames[j]}
                      className={`p-2 text-center font-mono text-sm ${
                        i === j ? "bg-muted font-bold" : colorForCorrelation(value)
                      }`}
                    >
                      {value.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-red-100" /> High (&gt;0.7)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-orange-50 border" /> Moderate
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-gray-50 border" /> Low
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-blue-100" /> Negative
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
