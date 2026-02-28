"use client";

import { useState } from "react";
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

interface CompareSelectorProps {
  vaults: VaultListItem[];
  selected: string[];
  onSelect: (addresses: string[]) => void;
  maxSelections?: number;
}

export function CompareSelector({
  vaults,
  selected,
  onSelect,
  maxSelections = 4,
}: CompareSelectorProps) {
  const [open, setOpen] = useState(false);

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
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {selectedVaults.map((v) => (
          <Badge key={v.summary.vaultAddress} variant="secondary" className="gap-1">
            {v.summary.name}
            <button onClick={() => toggle(v.summary.vaultAddress)}>
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-between w-[300px]">
            {selected.length < maxSelections
              ? "Add vault to compare..."
              : `Max ${maxSelections} vaults`}
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Search vaults..." />
            <CommandList>
              <CommandEmpty>No vault found.</CommandEmpty>
              <CommandGroup>
                {vaults.slice(0, 100).map((v) => (
                  <CommandItem
                    key={v.summary.vaultAddress}
                    value={v.summary.name}
                    onSelect={() => toggle(v.summary.vaultAddress)}
                    disabled={
                      selected.length >= maxSelections &&
                      !selected.includes(v.summary.vaultAddress)
                    }
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selected.includes(v.summary.vaultAddress)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {v.summary.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
