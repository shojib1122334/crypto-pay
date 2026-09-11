import fs from 'fs';
import path from 'path';
import type { TopUpRecord } from '../src/types/topup';

const TOPUP_DB_FILE = path.join(process.cwd(), 'server', 'data', 'topup_history.json');

function ensureDirectoryExists() {
  const dir = path.dirname(TOPUP_DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadTopUpDb(): Record<string, TopUpRecord> {
  try {
    ensureDirectoryExists();
    if (!fs.existsSync(TOPUP_DB_FILE)) {
      return {};
    }
    const raw = fs.readFileSync(TOPUP_DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[TopUpDb] Error loading top-up history DB:', err);
    return {};
  }
}

function saveTopUpDb(data: Record<string, TopUpRecord>) {
  try {
    ensureDirectoryExists();
    fs.writeFileSync(TOPUP_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[TopUpDb] Error saving top-up history DB:', err);
  }
}

export async function getAllTopUpRecords(): Promise<TopUpRecord[]> {
  const db = loadTopUpDb();
  return Object.values(db).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getTopUpHistoryForWallet(walletAddress: string): Promise<TopUpRecord[]> {
  const db = loadTopUpDb();
  const lower = walletAddress.toLowerCase();
  return Object.values(db)
    .filter((r) => r.walletAddress.toLowerCase() === lower)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getTopUpById(id: string): Promise<TopUpRecord | null> {
  const db = loadTopUpDb();
  return db[id] || null;
}

export async function recordTopUp(record: TopUpRecord): Promise<TopUpRecord> {
  const db = loadTopUpDb();
  db[record.id] = record;
  saveTopUpDb(db);
  return record;
}

export async function updateTopUpStatus(
  id: string,
  status: TopUpRecord['status'],
  blockNumber?: number,
  errorMessage?: string
): Promise<TopUpRecord | null> {
  const db = loadTopUpDb();
  const record = db[id];
  if (!record) return null;
  record.status = status;
  if (blockNumber !== undefined) record.blockNumber = blockNumber;
  if (errorMessage !== undefined) record.errorMessage = errorMessage;
  db[id] = record;
  saveTopUpDb(db);
  return record;
}
