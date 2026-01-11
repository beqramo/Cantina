export type PendingApprovalType = 'dish' | 'image';

export interface PendingApprovalEntry {
  id: string; // dish id
  type: PendingApprovalType;
  name?: string; // dish name
  imageUrl?: string; // for image uploads
  createdAt: number; // epoch ms
  lastChecked?: number; // epoch ms
  dishName?: string; // Resolved name for Thank You card
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

// Event dispatched when approvals change
export const PENDING_UPDATE_EVENT = 'cantina:pending-update';
export const RESOLVED_UPDATE_EVENT = 'cantina:resolved-update';

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

// Resolved Approvals Logic (Thank You Card Persistence)
function readResolved(): PendingApprovalEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.RESOLVED_APPROVALS);
    if (!raw) return [];
    return JSON.parse(raw) || [];
  } catch {
    return [];
  }
}

function writeResolved(entries: PendingApprovalEntry[]) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.RESOLVED_APPROVALS,
      JSON.stringify(entries),
    );
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(RESOLVED_UPDATE_EVENT));
    }
  } catch (err) {
    console.error('Error writing resolved approvals', err);
  }
}

export function getResolvedApprovals(): PendingApprovalEntry[] {
  return readResolved();
}

export function addResolvedApproval(entry: PendingApprovalEntry) {
  const entries = readResolved();
  const exists = entries.some(
    (e) =>
      e.id === entry.id &&
      e.type === entry.type &&
      e.imageUrl === entry.imageUrl,
  );
  if (!exists) {
    entries.push(entry);
    writeResolved(entries);
  }
}

export function removeResolvedApproval(
  matcher: (e: PendingApprovalEntry) => boolean,
) {
  const entries = readResolved().filter((e) => !matcher(e));
  writeResolved(entries);
}

// Logic to check pending items against a loaded menu
import { Menu, MenuItem, MealType } from '@/types';

export function checkApprovalsWithMenu(menu: Menu | undefined | null) {
  if (!menu) return;
  const pending = readAll();
  if (pending.length === 0) return;

  let changed = false;
  const toResolve: PendingApprovalEntry[] = [];

  const checkItem = (item: MenuItem | undefined) => {
    if (!item || !item.dishId) return;

    // Find matching pending entries for this dish
    const matches = pending.filter((p) => p.id === item.dishId);

    for (const match of matches) {
      if (match.type === 'dish') {
        // If it's in the menu, it's inherently approved (dishes are only added if approved or suggested)
        // But specifically, if it has a dishId, it means it exists in Firestore as a dish.
        // We can assume it's approved if it's visible in the menu.
        toResolve.push({ ...match, dishName: item.dishName });
        changed = true;
      } else if (match.type === 'image' && match.imageUrl) {
        // Check if this specific image is now the one in the menu and NOT pending approval
        const isMatchedImage = item.imageUrl === match.imageUrl;
        const isApproved = item.imagePendingApproval === false;

        if (isMatchedImage && isApproved) {
          toResolve.push({ ...match, dishName: item.dishName });
          changed = true;
        }
      }
    }
  };

  // Check all dishes in lunch and dinner
  if (menu.lunch) {
    Object.values(menu.lunch).forEach(checkItem);
  }
  if (menu.dinner) {
    Object.values(menu.dinner).forEach(checkItem);
  }

  if (changed) {
    // Remove from pending
    const remainingPending = pending.filter(
      (p) =>
        !toResolve.some(
          (r) =>
            r.id === p.id && r.type === p.type && r.imageUrl === p.imageUrl,
        ),
    );
    writeAll(remainingPending);

    // Add to resolved
    toResolve.forEach(addResolvedApproval);
  }
}
