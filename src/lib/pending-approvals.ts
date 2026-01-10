export type PendingApprovalType = 'dish' | 'image';

export interface PendingApprovalEntry {
  id: string; // dish id
  type: PendingApprovalType;
  name?: string; // dish name
  imageUrl?: string; // for image uploads
  createdAt: number; // epoch ms
  lastChecked?: number; // epoch ms
}

import { STORAGE_KEYS } from './constants';

function readAll(): PendingApprovalEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PENDING_APPROVALS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PendingApprovalEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Error reading pending approvals from localStorage', err);
    return [];
  }
}

// Event dispatched when pending approvals change
export const PENDING_UPDATE_EVENT = 'cantina:pending-update';

function writeAll(entries: PendingApprovalEntry[]) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.PENDING_APPROVALS,
      JSON.stringify(entries),
    );
    // Dispatch custom event for same-window updates
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(PENDING_UPDATE_EVENT));
    }
  } catch (err) {
    console.error('Error writing pending approvals to localStorage', err);
  }
}

export function addPendingApproval(entry: PendingApprovalEntry) {
  const entries = readAll();
  // Avoid duplicates: same id + type + imageUrl
  const exists = entries.some(
    (e) =>
      e.id === entry.id &&
      e.type === entry.type &&
      (e.imageUrl || '') === (entry.imageUrl || ''),
  );
  if (!exists) {
    entries.push(entry);
    writeAll(entries);
  }
}

export function removePendingApproval(
  matcher: (e: PendingApprovalEntry) => boolean,
) {
  const entries = readAll().filter((e) => !matcher(e));
  writeAll(entries);
}

export function getPendingApprovals(): PendingApprovalEntry[] {
  const entries = readAll();
  // Keep only entries younger than 30 days
  // Remove entries older than 3 days
  const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000;
  const valid = entries.filter((e) => e.createdAt > threeDaysAgo);
  if (valid.length !== entries.length) writeAll(valid);
  return valid;
}

export function updateLastChecked(id: string, imageUrl: string | undefined) {
  const entries = readAll();
  const now = Date.now();
  let changed = false;
  for (const e of entries) {
    if (e.id === id && e.imageUrl === imageUrl) {
      e.lastChecked = now;
      changed = true;
    }
  }
  if (changed) writeAll(entries);
}
