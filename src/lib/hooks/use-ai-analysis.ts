"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AnalyzeRequest, AnalyzeResponse, DDMemo } from "@/lib/ai/types";

async function fetchAnalysis(body: AnalyzeRequest): Promise<AnalyzeResponse> {
  const res = await fetch("/api/ai/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (res.status === 503) {
    throw new Error("AI_UNAVAILABLE");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(data.error || `Error ${res.status}`);
  }
  return res.json();
}

async function fetchMemo(body: AnalyzeRequest): Promise<DDMemo> {
  const res = await fetch("/api/ai/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, mode: "memo" }),
  });
  if (res.status === 503) {
    throw new Error("AI_UNAVAILABLE");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(data.error || `Error ${res.status}`);
  }
  return res.json();
}

export function useAiAnalysis(requestData: AnalyzeRequest | null) {
  return useQuery<AnalyzeResponse>({
    queryKey: ["ai-analysis", requestData?.vaultName],
    queryFn: () => fetchAnalysis(requestData!),
    enabled: requestData != null,
    staleTime: 10 * 60 * 1000, // cache for 10 minutes
    retry: false,
  });
}

export function useGenerateMemo(requestData: AnalyzeRequest | null) {
  const queryClient = useQueryClient();

  return useMutation<DDMemo>({
    mutationFn: () => fetchMemo(requestData!),
    onSuccess: (data) => {
      queryClient.setQueryData(
        ["ai-memo", requestData?.vaultName],
        data,
      );
    },
  });
}
