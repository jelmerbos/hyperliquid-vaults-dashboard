import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VaultSnapshotCard } from "@/components/portfolio/vault-snapshot-card";
import { PortfolioNotes } from "@/components/portfolio/portfolio-notes";
import type { VaultDetails, VaultPositions } from "@/lib/api/types";

// Mock localStorage for happy-dom
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((i: number) => Object.keys(store)[i] ?? null),
  };
})();

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

function mockVault(overrides: Partial<VaultDetails> = {}): VaultDetails {
  return {
    name: "Test Vault",
    vaultAddress: "0xtest",
    leader: "0xleader",
    description: "A test vault",
    portfolio: [],
    apr: 0.15,
    followers: [],
    leaderFraction: 0.25,
    leaderCommission: 0.10,
    maxDistributable: "1000000",
    maxWithdrawable: "500000",
    isClosed: false,
    allowDeposits: true,
    alwaysCloseOnWithdraw: false,
    ...overrides,
  } as VaultDetails;
}

function mockPositions(accountValue: string = "1000000", notional: string = "2000000"): VaultPositions {
  return {
    perp: {
      assetPositions: [],
      marginSummary: {
        accountValue,
        totalMarginUsed: "100000",
        totalNtlPos: notional,
        totalRawUsd: "900000",
      },
      withdrawable: "800000",
      time: Date.now(),
    },
    spot: { balances: [] },
  };
}

function mockPositionsWithPerps(): VaultPositions {
  return {
    perp: {
      assetPositions: [
        { type: "oneWay", position: { coin: "BTC", szi: "0.5", entryPx: "60000", positionValue: "30000", leverage: { type: "cross", value: 3, rawUsd: "10000" }, liquidationPx: "0", marginUsed: "10000", unrealizedPnl: "500", returnOnEquity: "0.05", maxLeverage: 50, cumFunding: { allTime: "0", sinceChange: "0", sinceOpen: "0" } } },
        { type: "oneWay", position: { coin: "ETH", szi: "10", entryPx: "3000", positionValue: "30000", leverage: { type: "cross", value: 3, rawUsd: "10000" }, liquidationPx: "0", marginUsed: "10000", unrealizedPnl: "200", returnOnEquity: "0.02", maxLeverage: 50, cumFunding: { allTime: "0", sinceChange: "0", sinceOpen: "0" } } },
        { type: "oneWay", position: { coin: "SOL", szi: "-100", entryPx: "150", positionValue: "15000", leverage: { type: "cross", value: 2, rawUsd: "7500" }, liquidationPx: "0", marginUsed: "7500", unrealizedPnl: "-100", returnOnEquity: "-0.01", maxLeverage: 20, cumFunding: { allTime: "0", sinceChange: "0", sinceOpen: "0" } } },
      ],
      marginSummary: {
        accountValue: "100000",
        totalMarginUsed: "27500",
        totalNtlPos: "75000",
        totalRawUsd: "72500",
      },
      withdrawable: "72500",
      time: Date.now(),
    },
    spot: { balances: [] },
  };
}

describe("VaultSnapshotCard", () => {
  /** @req PC-10 */
  it("displays TVL, leader stake, leverage, redemption status", () => {
    render(
      <VaultSnapshotCard vault={mockVault()} positions={mockPositions()} />,
    );
    expect(screen.getByText("Test Vault")).toBeDefined();
    expect(screen.getByText("TVL")).toBeDefined();
    expect(screen.getByText("Leader Stake")).toBeDefined();
    expect(screen.getByText("Leverage")).toBeDefined();
    expect(screen.getByText("Redemption")).toBeDefined();
    expect(screen.getByText("$1.0M")).toBeDefined(); // TVL
    expect(screen.getByText("25.00%")).toBeDefined(); // Leader stake
    expect(screen.getByText("2.0x")).toBeDefined(); // Leverage
    expect(screen.getByText("Open")).toBeDefined(); // Redemption
  });

  /** @req PC-10 */
  it("shows red for closed vault", () => {
    render(
      <VaultSnapshotCard vault={mockVault({ isClosed: true })} positions={mockPositions()} />,
    );
    expect(screen.getByText("Closed")).toBeDefined();
  });

  /** @req PC-10 */
  it("shows yellow for high leverage", () => {
    // 4x leverage: notional = 4 * accountValue
    render(
      <VaultSnapshotCard vault={mockVault()} positions={mockPositions("1000000", "4000000")} />,
    );
    expect(screen.getByText("4.0x")).toBeDefined();
  });

  /** @req PC-10 */
  it("displays position breakdown with longs, shorts, and net direction", () => {
    render(
      <VaultSnapshotCard vault={mockVault()} positions={mockPositionsWithPerps()} />,
    );
    // 3 positions total: 2 long (BTC, ETH) + 1 short (SOL)
    const countEl = screen.getByTestId("position-count");
    expect(countEl.textContent).toContain("3");
    expect(countEl.textContent).toContain("2L");
    expect(countEl.textContent).toContain("1S");

    // Net direction: long notional=60000, short=15000, ratio=0.8 -> "Long"
    const dirEl = screen.getByTestId("net-direction");
    expect(dirEl.textContent).toContain("Long");

    // Margin utilization: 27500 / 100000 = 27.5%
    const marginEl = screen.getByTestId("margin-util");
    expect(marginEl.textContent).toContain("27.50%");
  });

  /** @req PC-10 */
  it("shows zero positions gracefully", () => {
    render(
      <VaultSnapshotCard vault={mockVault()} positions={mockPositions()} />,
    );
    const countEl = screen.getByTestId("position-count");
    expect(countEl.textContent).toContain("0");
  });
});

describe("PortfolioNotes", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  /** @req PC-11 */
  it("renders textarea for each vault", () => {
    render(
      <PortfolioNotes
        vaultAddresses={["0xaaa", "0xbbb"]}
        vaultNames={["Vault A", "Vault B"]}
      />,
    );
    expect(screen.getByTestId("note-0xaaa")).toBeDefined();
    expect(screen.getByTestId("note-0xbbb")).toBeDefined();
  });

  /** @req PC-11 */
  it("persists notes to localStorage on blur", () => {
    render(
      <PortfolioNotes
        vaultAddresses={["0xaaa"]}
        vaultNames={["Vault A"]}
      />,
    );
    const textarea = screen.getByTestId("note-0xaaa") as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Good performance in downturns" } });
    fireEvent.blur(textarea);

    const stored = JSON.parse(localStorage.getItem("hl-portfolio-notes") ?? "{}");
    expect(stored["0xaaa"]).toBe("Good performance in downturns");
  });

  /** @req PC-11 */
  it("loads existing notes from localStorage", () => {
    localStorage.setItem(
      "hl-portfolio-notes",
      JSON.stringify({ "0xaaa": "Previously saved note" }),
    );
    render(
      <PortfolioNotes
        vaultAddresses={["0xaaa"]}
        vaultNames={["Vault A"]}
      />,
    );
    const textarea = screen.getByTestId("note-0xaaa") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Previously saved note");
  });
});
