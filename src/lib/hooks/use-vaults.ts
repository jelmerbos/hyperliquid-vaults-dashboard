"use client";

import { useQuery } from "@tanstack/react-query";
import type { VaultListItem } from "@/lib/api/types";

async function getVaults(): Promise<VaultListItem[]> {
  const res = await fetch("/api/vaults");
  if (!res.ok) throw new Error("Failed to fetch vaults");
  return res.json();
}

export function useVaults() {
  return useQuery({
    queryKey: ["vaults"],
    queryFn: getVaults,
  });
}
