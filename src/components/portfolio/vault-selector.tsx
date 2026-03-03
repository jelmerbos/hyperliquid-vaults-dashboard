"use client";

import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { VaultListItem } from "@/lib/api/types";

interface VaultSelectorProps {
  vaults: VaultListItem[];
  selected: string[];
  onSelect: (addresses: string[]) => void;
  maxSelections?: number;
  minTvl?: number;
  minAgeDays?: number;
}

const MS_PER_DAY = 86_400_000;

export function VaultSelector({
  vaults,
  selected,
  onSelect,
  maxSelections = 10,
  minTvl = 0,
  minAgeDays = 0,
}: VaultSelectorProps) {
  const [open, setOpen] = useState(false);

  const filteredVaults = useMemo(() => {
    const now = Date.now();
    return vaults.filter((v) => {
      const tvl = parseFloat(String(v.summary.tvl ?? "0"));
      if (tvl < minTvl) return false;

      if (minAgeDays > 0 && v.summary.createTimeMillis) {
        const ageDays = (now - v.summary.createTimeMillis) / MS_PER_DAY;
        if (ageDays < minAgeDays) return false;
      }

      return !v.summary.isClosed;
    });
  }, [vaults, minTvl, minAgeDays]);

  const toggle = (address: string) => {
    if (selected.includes(address)) {
      onSelect(selected.filter((a) => a !== address));
    } else if (selected.length < maxSelections) {
      onSelect([...selected, address]);
    }
  };

  const selectedVaults = selected
    .map((addr) => vaults.find((v) => v.summary.vaultAddress === addr))
    .filter(Boolean) as VaultListItem[];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {selected.length} of {maxSelections} selected
        </span>
      </div>

      <div className="flex flex-wrap gap-2 min-h-[28px]">
        {selectedVaults.map((v) => (
          <Badge key={v.summary.vaultAddress} variant="secondary" className="gap-1">
            {v.summary.name}
            <button
              onClick={() => toggle(v.summary.vaultAddress)}
              aria-label={`Remove ${v.summary.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="justify-between w-full"
            disabled={selected.length >= maxSelections}
          >
            {selected.length < maxSelections
              ? "Add vault to portfolio..."
              : `Max ${maxSelections} vaults`}
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search by name or address..." />
            <CommandList>
              <CommandEmpty>No vault found.</CommandEmpty>
              <CommandGroup heading={`${filteredVaults.length} qualifying vaults`}>
                {filteredVaults.slice(0, 100).map((v) => {
                  const isSelected = selected.includes(v.summary.vaultAddress);
                  const tvl = parseFloat(String(v.summary.tvl ?? "0"));
                  return (
                    <CommandItem
                      key={v.summary.vaultAddress}
                      value={`${v.summary.name} ${v.summary.vaultAddress}`}
                      onSelect={() => toggle(v.summary.vaultAddress)}
                      disabled={selected.length >= maxSelections && !isSelected}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          isSelected ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{v.summary.name}</span>
                        <span className="text-xs text-muted-foreground">
                          TVL: ${tvl >= 1_000_000 ? `${(tvl / 1_000_000).toFixed(1)}M` : `${(tvl / 1_000).toFixed(0)}K`}
                          {" | "}APR: {(v.apr * 100).toFixed(1)}%
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
