import { SwapHistoryRecord } from '../types/swap';

const STORAGE_PREFIX = 'cryptopay_swap_history_';

/**
 * Gets cached swap history records from localStorage for a specific wallet address
 */
export function getLocalSwapHistory(walletAddress?: string): SwapHistoryRecord[] {
  if (!walletAddress || typeof window === 'undefined') return [];

  try {
    const key = `${STORAGE_PREFIX}${walletAddress.toLowerCase()}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
  } catch (err) {
    console.warn('[SwapHistoryStorage] Error loading local swap history:', err);
  }
  return [];
}

/**
 * Saves a new or updated swap record to localStorage
 */
export function saveLocalSwapRecord(record: SwapHistoryRecord): void {
  if (!record || !record.walletAddress || typeof window === 'undefined') return;

  try {
    const key = `${STORAGE_PREFIX}${record.walletAddress.toLowerCase()}`;
    const existing = getLocalSwapHistory(record.walletAddress);

    // Merge or replace by txHash or id
    const matchIndex = existing.findIndex(
      (r) =>
        (r.txHash && r.txHash.toLowerCase() === record.txHash.toLowerCase()) ||
        (r.id && r.id === record.id)
    );

    let updated: SwapHistoryRecord[];
    if (matchIndex >= 0) {
      updated = [...existing];
      updated[matchIndex] = { ...updated[matchIndex], ...record };
    } else {
      updated = [record, ...existing];
    }

    // Keep up to 100 most recent records
    const trimmed = updated
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      .slice(0, 100);

    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('[SwapHistoryStorage] Error saving local swap record:', err);
  }
}

/**
 * Merges local and remote swap histories, eliminating duplicates
 */
export function mergeSwapHistories(
  local: SwapHistoryRecord[],
  remote: SwapHistoryRecord[]
): SwapHistoryRecord[] {
  const map = new Map<string, SwapHistoryRecord>();

  // Add remote first
  for (const item of remote) {
    const key = (item.txHash || item.id || '').toLowerCase();
    if (key) map.set(key, item);
  }

  // Overlay local (keeps local overrides or pending statuses if newer)
  for (const item of local) {
    const key = (item.txHash || item.id || '').toLowerCase();
    if (key) {
      const existing = map.get(key);
      if (!existing || (item.createdAt || 0) >= (existing.createdAt || 0)) {
        map.set(key, { ...existing, ...item });
      }
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
  );
}

/**
 * Syncs swap history from server API with local storage
 */
export async function syncSwapHistory(
  walletAddress?: string
): Promise<{ history: SwapHistoryRecord[]; fromServer: boolean }> {
  if (!walletAddress) {
    return { history: [], fromServer: false };
  }

  const normalized = walletAddress.toLowerCase();
  const localRecords = getLocalSwapHistory(normalized);

  try {
    // Try primary path first
    let res = await fetch(`/api/swap/history/${encodeURIComponent(normalized)}`, {
      headers: { Accept: 'application/json' },
    });

    // Fallback to query parameter if route not matched
    if (!res.ok || res.status === 404) {
      res = await fetch(`/api/swap/history?wallet=${encodeURIComponent(normalized)}`, {
        headers: { Accept: 'application/json' },
      });
    }

    if (res.ok) {
      const text = await res.text();
      // Ensure response is JSON and not HTML error page
      if (text.trim().startsWith('{')) {
        const data = JSON.parse(text);
        if (data && Array.isArray(data.history)) {
          const merged = mergeSwapHistories(localRecords, data.history);
          // Update localStorage cache with merged list
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(
                `${STORAGE_PREFIX}${normalized}`,
                JSON.stringify(merged.slice(0, 100))
              );
            } catch {
              // Ignore localStorage quota errors
            }
          }
          return { history: merged, fromServer: true };
        }
      }
    }
  } catch (err) {
    console.debug('[SwapHistoryStorage] Remote fetch skipped or failed, using local:', err);
  }

  // Gracefully fallback to local storage records without failing
  return { history: localRecords, fromServer: false };
}
