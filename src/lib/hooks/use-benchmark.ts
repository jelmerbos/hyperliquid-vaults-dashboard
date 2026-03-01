"use client";

import { useQuery } from "@tanstack/react-query";
import { benchmarkProvider } from "@/lib/benchmarks";
import type { BenchmarkId, BenchmarkSeries } from "@/lib/benchmarks";

export function useBenchmark(
  id: BenchmarkId,
  startMs: number | undefined,
  endMs: number | undefined,
) {
  return useQuery<BenchmarkSeries>({
    queryKey: ["benchmark", id, startMs, endMs],
    queryFn: () => benchmarkProvider.getSeries(id, startMs!, endMs!),
    enabled: startMs != null && endMs != null,
    staleTime: 5 * 60 * 1000, // benchmark data doesn't change often
  });
}
