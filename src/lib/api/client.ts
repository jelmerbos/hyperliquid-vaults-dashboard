import type { VaultListItem, VaultDetails } from "./types";

const STATS_BASE = "https://stats-data.hyperliquid.xyz";
const API_BASE = "https://api.hyperliquid.xyz";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchVaultList(): Promise<VaultListItem[]> {
  const res = await fetch(`${STATS_BASE}/Mainnet/vaults`);
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to fetch vault list: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchVaultDetails(address: string): Promise<VaultDetails> {
  const res = await fetch(`${API_BASE}/info`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "vaultDetails", vaultAddress: address }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, `Failed to fetch vault details: ${res.statusText}`);
  }
  return res.json();
}
