"use client";

import { useQuery } from "@tanstack/react-query";
import type { VaultPositions } from "@/lib/api/types";

async function getVaultPositions(address: string): Promise<VaultPositions> {
  const res = await fetch(`/api/vaults/${address}/positions`);
  if (!res.ok) throw new Error("Failed to fetch vault positions");
  return res.json();
}

export function useVaultPositions(address: string) {
  return useQuery({
    queryKey: ["vault-positions", address],
    queryFn: () => getVaultPositions(address),
    enabled: !!address,
    refetchInterval: 60_000, // positions are live; refresh every 60s
  });
}
