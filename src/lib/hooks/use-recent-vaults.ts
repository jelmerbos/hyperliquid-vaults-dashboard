"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "hl-recent-vaults";
const MAX_RECENT = 5;
const EMPTY: RecentVault[] = [];

export interface RecentVault {
  address: string;
  name: string;
}

let listeners: (() => void)[] = [];
let cachedSnapshot: RecentVault[] = EMPTY;
let cachedRaw: string | null = null;

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function getSnapshot(): RecentVault[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== cachedRaw) {
      cachedRaw = stored;
      cachedSnapshot = stored ? JSON.parse(stored) : EMPTY;
    }
    return cachedSnapshot;
  } catch {
    return EMPTY;
  }
}

function getServerSnapshot(): RecentVault[] {
  return EMPTY;
}

export function addRecentVault(address: string, name: string) {
  const current = getSnapshot();
  const filtered = current.filter((v) => v.address !== address);
  const updated = [{ address, name }, ...filtered].slice(0, MAX_RECENT);
  const raw = JSON.stringify(updated);
  localStorage.setItem(STORAGE_KEY, raw);
  cachedRaw = raw;
  cachedSnapshot = updated;
  emitChange();
}

export function useRecentVaults() {
  const recentVaults = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const addVault = useCallback((address: string, name: string) => {
    addRecentVault(address, name);
  }, []);

  return { recentVaults, addVault };
}
