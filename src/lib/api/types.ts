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
