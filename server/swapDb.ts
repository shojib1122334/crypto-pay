import fs from 'fs';
import path from 'path';

export interface SwapDbRecord {
  id: string;
  walletAddress: string;
  chainId: number;
  inputToken: string;
  outputToken: string;
  inputAmount: string;
  expectedOutputAmount: string;
  actualOutputAmount: string;
  minimumReceived: string;
  exchangeRate: string;
  priceImpact: number;
  slippage: number;
  providerFee: string;
  networkFee: string;
  gasUsed?: string;
  routerAddress: string;
  routerName: string;
  txHash: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED';
  errorMessage?: string;
  createdAt: number;
  confirmedAt?: number;
}

const SWAP_DB_FILE = path.join(process.cwd(), 'server', 'data', 'swap_history.json');

function ensureDirectoryExists() {
  const dir = path.dirname(SWAP_DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function loadSwapDb(): Record<string, SwapDbRecord> {
  try {
    ensureDirectoryExists();
    if (!fs.existsSync(SWAP_DB_FILE)) {
      return {};
    }
    const raw = fs.readFileSync(SWAP_DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[SwapDb] Error loading swap history DB:', err);
    return {};
  }
}

function saveSwapDb(data: Record<string, SwapDbRecord>) {
  try {
    ensureDirectoryExists();
    fs.writeFileSync(SWAP_DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('[SwapDb] Error saving swap history DB:', err);
  }
}

export async function recordSwap(record: SwapDbRecord): Promise<SwapDbRecord> {
  const db = loadSwapDb();
  const key = record.txHash.toLowerCase();
  db[key] = {
    ...record,
    walletAddress: record.walletAddress.toLowerCase(),
  };
  saveSwapDb(db);
  return db[key];
}

export async function updateSwapStatus(
  txHash: string,
  status: 'COMPLETED' | 'PENDING' | 'FAILED',
  updates?: Partial<SwapDbRecord>
): Promise<SwapDbRecord | null> {
  const db = loadSwapDb();
  const key = txHash.toLowerCase();
  if (!db[key]) {
    return null;
  }
  db[key] = {
    ...db[key],
    status,
    ...updates,
    confirmedAt: status === 'COMPLETED' ? Date.now() : db[key].confirmedAt,
  };
  saveSwapDb(db);
  return db[key];
}

export async function getSwapByTxHash(txHash: string): Promise<SwapDbRecord | null> {
  const db = loadSwapDb();
  return db[txHash.toLowerCase()] || null;
}

export async function getSwapHistoryForWallet(walletAddress: string): Promise<SwapDbRecord[]> {
  const db = loadSwapDb();
  const normalized = walletAddress.toLowerCase();
  return Object.values(db)
    .filter((rec) => rec.walletAddress.toLowerCase() === normalized)
    .sort((a, b) => b.createdAt - a.createdAt);
}
