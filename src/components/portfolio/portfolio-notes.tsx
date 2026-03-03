"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const STORAGE_KEY = "hl-portfolio-notes";

interface PortfolioNotesProps {
  vaultAddresses: string[];
  vaultNames: string[];
}

function loadNotes(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveNotes(notes: Record<string, string>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

export function PortfolioNotes({ vaultAddresses, vaultNames }: PortfolioNotesProps) {
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    setNotes(loadNotes());
  }, []);

  const handleChange = useCallback((address: string, value: string) => {
    setNotes((prev) => {
      const updated = { ...prev, [address]: value };
      return updated;
    });
  }, []);

  const handleBlur = useCallback(() => {
    saveNotes(notes);
  }, [notes]);

  if (vaultAddresses.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {vaultAddresses.map((addr, i) => (
          <div key={addr}>
            <label className="text-sm text-muted-foreground block mb-1">
              {vaultNames[i] ?? addr}
            </label>
            <textarea
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y min-h-[60px]"
              placeholder="Add notes about this vault..."
              value={notes[addr] ?? ""}
              onChange={(e) => handleChange(addr, e.target.value)}
              onBlur={handleBlur}
              data-testid={`note-${addr}`}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
