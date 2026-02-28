"use client";

import { useQuery } from "@tanstack/react-query";
import type { VaultDetails } from "@/lib/api/types";

async function getVaultDetails(address: string): Promise<VaultDetails> {
  const res = await fetch(`/api/vaults/${address}`);
  if (!res.ok) throw new Error("Failed to fetch vault details");
  return res.json();
}

export function useVaultDetails(address: string) {
  return useQuery({
    queryKey: ["vault", address],
    queryFn: () => getVaultDetails(address),
    enabled: !!address,
  });
}
