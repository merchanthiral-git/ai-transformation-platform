/**
 * Client-side finding store backed by sessionStorage.
 * URL carries only the findingId; the store holds the full Finding context.
 * Survives page refresh within a tab session.
 */
import type { Finding } from "./types";

const STORAGE_KEY = "ja_finding_store";

function readStore(): Map<string, Finding> {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? new Map(JSON.parse(raw)) : new Map();
  } catch {
    return new Map();
  }
}

function writeStore(map: Map<string, Finding>): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...map]));
  } catch {
    // sessionStorage full or unavailable — silent no-op
  }
}

export function putFinding(finding: Finding): void {
  const map = readStore();
  map.set(finding.id, finding);
  writeStore(map);
}

export function getFinding(id: string): Finding | null {
  return readStore().get(id) ?? null;
}

export function clearFindings(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}
