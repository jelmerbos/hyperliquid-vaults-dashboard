"use client";

import { Badge } from "@/components/ui/badge";
import { shortenAddress } from "@/lib/utils/format";
import type { VaultDetails } from "@/lib/api/types";

export function VaultHeader({ vault }: { vault: VaultDetails }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-bold">{vault.name}</h1>
        {vault.isClosed && <Badge variant="destructive">Closed</Badge>}
      </div>
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span>Leader: {shortenAddress(vault.leader)}</span>
        <span>Commission: {(vault.leaderCommission * 100).toFixed(1)}%</span>
        <span>Followers: {vault.followers.length}</span>
      </div>
      {vault.description && (
        <p className="text-sm text-muted-foreground max-w-2xl">
          {vault.description}
        </p>
      )}
    </div>
  );
}
