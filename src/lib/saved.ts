"use client";

import { useSyncExternalStore } from "react";

// Saved deals live only in this browser (localStorage). Nothing is sent to a server,
// so there is nothing to track, and nothing to delete under GDPR.
const KEY = "iesales.saved.v1";
const listeners = new Set<() => void>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const arr: unknown = raw ? JSON.parse(raw) : [];
    cache = Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string").slice(0, 200) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: string[]) {
  cache = next;
  try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode: keep in memory */ }
  listeners.forEach((l) => l());
}

export function toggleSaved(id: string) {
  const cur = read();
  write(cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur].slice(0, 200));
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = null; cb(); } };
  window.addEventListener("storage", onStorage);
  return () => { listeners.delete(cb); window.removeEventListener("storage", onStorage); };
}

const EMPTY: string[] = [];
export function useSaved(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
