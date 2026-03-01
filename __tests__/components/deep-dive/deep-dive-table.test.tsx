import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DeepDiveTable } from "@/components/deep-dive/deep-dive-table";
import type { DeepDiveRow } from "@/lib/hooks/use-deep-dive-vaults";
import type { DeepDiveMetrics } from "@/lib/metrics/deep-dive";
import type { VaultDetails, VaultListItem } from "@/lib/api/types";
import type { TimeSeries } from "@/lib/metrics";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

function makeMetrics(overrides: Partial<DeepDiveMetrics> = {}): DeepDiveMetrics {
  return {
    annReturn: 0.45,
    cumReturn: 0.32,
    pnl: 32000,
    annVol: 0.25,
    maxDD: -0.15,
    maxDDDuration: 12,
    sharpe: 1.8,
    sortino: 2.5,
    calmar: 3.0,
    recoveryFactor: 2.1,
    var95: -0.02,
    cvar95: -0.03,
    winRate: 0.55,
    positiveMonthPct: 0.67,
    betaBtc: 0.8,
    betaHype: 1.2,
    ...overrides,
  };
}

function makeRow(
  name: string,
  address: string,
  metrics: DeepDiveMetrics | null = makeMetrics(),
): DeepDiveRow {
  return {
    vault: {
      name,
      vaultAddress: address,
      leader: "0xleader",
      description: "",
      portfolio: [],
      apr: 0.45,
      followerState: null,
      leaderFraction: 0.1,
      leaderCommission: 0.1,
      followers: [],
      maxDistributable: 0,
      maxWithdrawable: 0,
      isClosed: false,
      relationship: { type: "normal" },
      allowDeposits: true,
      alwaysCloseOnWithdraw: false,
    } as VaultDetails,
    listItem: {
      apr: 0.45,
      pnls: [],
      summary: {
        name,
        vaultAddress: address,
        leader: "0xleader",
        tvl: "1000000",
        isClosed: false,
        relationship: { type: "normal" },
        createTimeMillis: Date.now() - 200 * 86_400_000,
      },
    } as VaultListItem,
    metrics,
    percentiles: {},
    accountValueHistory: [[Date.now(), 10000]] as TimeSeries,
  };
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("DeepDiveTable", () => {
  /** @req DIVE-11 */
  it("shows skeleton loading state", () => {
    renderWithProviders(<DeepDiveTable rows={[]} isLoading={true} />);
    // Skeleton rows should be visible (animated pulse divs)
    const pulses = document.querySelectorAll(".animate-pulse");
    expect(pulses.length).toBeGreaterThan(0);
  });

  /** @req DIVE-08 */
  it("renders metric columns for all rows", () => {
    const rows = [
      makeRow("Vault Alpha", "0xaaa"),
      makeRow("Vault Beta", "0xbbb"),
    ];
    renderWithProviders(<DeepDiveTable rows={rows} isLoading={false} />);

    expect(screen.getByText("Vault Alpha")).toBeInTheDocument();
    expect(screen.getByText("Vault Beta")).toBeInTheDocument();
  });

  /** @req DIVE-08 */
  it("renders all column headers", () => {
    const rows = [makeRow("Test Vault", "0xaaa")];
    renderWithProviders(<DeepDiveTable rows={rows} isLoading={false} />);

    const expectedHeaders = [
      "Name", "TVL", "Age",
      "Ann. Return", "Cum. Return",
      "Vol", "Max DD", "VaR 95%", "CVaR 95%",
      "Sharpe", "Sortino", "Calmar", "Win Rate",
      "Beta (BTC)", "Beta (HYPE)",
    ];

    for (const header of expectedHeaders) {
      expect(screen.getByText(header)).toBeInTheDocument();
    }
  });

  /** @req DIVE-12 */
  it("shows N/A for vaults with null metrics", () => {
    const rows = [makeRow("Young Vault", "0xaaa", null)];
    renderWithProviders(<DeepDiveTable rows={rows} isLoading={false} />);

    expect(screen.getByText("Young Vault")).toBeInTheDocument();
    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBeGreaterThan(0);
  });

  /** @req DIVE-12 */
  it("applies muted styling for null-metrics rows", () => {
    const rows = [makeRow("Insufficient Vault", "0xaaa", null)];
    renderWithProviders(<DeepDiveTable rows={rows} isLoading={false} />);

    const row = screen.getByText("Insufficient Vault").closest("tr");
    expect(row?.className).toContain("opacity-60");
  });

  /** @req DIVE-09 */
  it("renders checkboxes for each row", () => {
    const rows = [
      makeRow("Vault A", "0xaaa"),
      makeRow("Vault B", "0xbbb"),
    ];
    renderWithProviders(<DeepDiveTable rows={rows} isLoading={false} />);

    const checkboxes = screen.getAllByRole("checkbox");
    // 1 header checkbox + 2 row checkboxes
    expect(checkboxes).toHaveLength(3);
  });

  /** @req DIVE-09 DIVE-10 */
  it("shows compare button when 2+ rows selected", async () => {
    const user = userEvent.setup();
    const rows = [
      makeRow("Vault A", "0xaaa"),
      makeRow("Vault B", "0xbbb"),
      makeRow("Vault C", "0xccc"),
    ];
    renderWithProviders(<DeepDiveTable rows={rows} isLoading={false} />);

    // Initially no compare button
    expect(screen.queryByText("Compare Selected")).not.toBeInTheDocument();

    // Select two rows
    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]); // first row
    await user.click(checkboxes[2]); // second row

    expect(screen.getByText("Compare Selected")).toBeInTheDocument();
    expect(screen.getByText("2 vaults selected")).toBeInTheDocument();
  });

  /** @req DIVE-10 */
  it("navigates to compare page on compare click", async () => {
    const user = userEvent.setup();
    const rows = [
      makeRow("Vault A", "0xaaa"),
      makeRow("Vault B", "0xbbb"),
    ];
    renderWithProviders(<DeepDiveTable rows={rows} isLoading={false} />);

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[1]);
    await user.click(checkboxes[2]);

    const compareBtn = screen.getByText("Compare Selected");
    await user.click(compareBtn);

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/compare?vaults="),
    );
  });

  /** @req DIVE-08 */
  it("shows empty state when no rows", () => {
    renderWithProviders(<DeepDiveTable rows={[]} isLoading={false} />);
    expect(
      screen.getByText("No qualifying vaults found. Try lowering the filters."),
    ).toBeInTheDocument();
  });

  /** @req DIVE-08 */
  it("displays vault count", () => {
    const rows = [
      makeRow("Vault A", "0xaaa"),
      makeRow("Vault B", "0xbbb"),
    ];
    renderWithProviders(<DeepDiveTable rows={rows} isLoading={false} />);
    expect(screen.getByText("2 vaults displayed")).toBeInTheDocument();
  });
});
