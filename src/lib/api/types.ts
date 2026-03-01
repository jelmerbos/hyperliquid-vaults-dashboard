// --- Vault List (GET /Mainnet/vaults) ---

export interface VaultSummary {
  name: string;
  vaultAddress: string;
  leader: string;
  tvl: string;
  isClosed: boolean;
  relationship: { type: string };
  createTimeMillis: number;
}

export type PnlPeriod = "day" | "week" | "month" | "allTime";

export interface VaultListItem {
  apr: number;
  pnls: [PnlPeriod, string[]][];
  summary: VaultSummary;
}

// --- Vault Details (POST /info, type: vaultDetails) ---

export interface PortfolioSnapshot {
  accountValueHistory: [number, string][];
  pnlHistory: [number, string][];
  vlm: string;
}

export type PortfolioPeriod =
  | "day"
  | "week"
  | "month"
  | "allTime"
  | "perpDay"
  | "perpWeek"
  | "perpMonth"
  | "perpAllTime";

export interface VaultFollower {
  user: string;
  vaultEquity: string;
  pnl: string;
  allTimePnl: string;
  daysFollowing: number;
  vaultEntryTime: number;
  lockupUntil: number;
}

export interface VaultDetails {
  name: string;
  vaultAddress: string;
  leader: string;
  description: string;
  portfolio: [PortfolioPeriod, PortfolioSnapshot][];
  apr: number;
  followerState: unknown;
  leaderFraction: number;
  leaderCommission: number;
  followers: VaultFollower[];
  maxDistributable: number;
  maxWithdrawable: number;
  isClosed: boolean;
  relationship: { type: string; data?: unknown };
  allowDeposits: boolean;
  alwaysCloseOnWithdraw: boolean;
}

// --- Clearinghouse State (POST /info, type: clearinghouseState) ---

export interface PerpPosition {
  coin: string;
  szi: string;
  entryPx: string;
  leverage: {
    type: string;
    value: number;
    rawUsd: string;
  };
  liquidationPx: string;
  marginUsed: string;
  positionValue: string;
  unrealizedPnl: string;
  returnOnEquity: string;
  maxLeverage: number;
  cumFunding: {
    allTime: string;
    sinceChange: string;
    sinceOpen: string;
  };
}

export interface MarginSummary {
  accountValue: string;
  totalMarginUsed: string;
  totalNtlPos: string;
  totalRawUsd: string;
}

export interface ClearinghouseState {
  assetPositions: {
    position: PerpPosition;
    type: string;
  }[];
  marginSummary: MarginSummary;
  withdrawable: string;
  time: number;
}

// --- Spot Clearinghouse State (POST /info, type: spotClearinghouseState) ---

export interface SpotBalance {
  coin: string;
  token: number;
  hold: string;
  total: string;
  entryNtl: string;
}

export interface SpotClearinghouseState {
  balances: SpotBalance[];
}

// --- Combined positions response ---

export interface VaultPositions {
  perp: ClearinghouseState;
  spot: SpotClearinghouseState;
}
