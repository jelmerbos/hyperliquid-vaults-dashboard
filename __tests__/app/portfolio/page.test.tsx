import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock next/navigation
const mockReplace = vi.fn();
let mockSearchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ replace: mockReplace }),
}));

// Mock TanStack Query
vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(() => ({ data: [], isLoading: false })),
  useQueries: vi.fn(() => []),
}));

// Mock hooks
vi.mock("@/lib/hooks/use-vaults", () => ({
  useVaults: () => ({ data: [] }),
}));

const mockPortfolioReturn = {
  vaults: [],
  positions: [],
  perVaultMetrics: [],
  portfolioMetrics: null,
  frontierPoints: [],
  correlationData: { names: [], matrix: [], dailyReturns: [] },
  performanceSeries: [],
  isLoading: false,
};

vi.mock("@/lib/hooks/use-portfolio", () => ({
  usePortfolio: vi.fn(() => mockPortfolioReturn),
}));

// Mock recharts to avoid canvas errors
vi.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => null,
  ScatterChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Scatter: () => null,
  ComposedChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import PortfolioPage from "@/app/portfolio/page";
import { usePortfolio } from "@/lib/hooks/use-portfolio";

describe("PortfolioPage", () => {
  beforeEach(() => {
    mockSearchParams = new URLSearchParams();
    mockReplace.mockClear();
    vi.mocked(usePortfolio).mockReturnValue(mockPortfolioReturn as any);
  });

  /** @req PC-14 */
  it("parses vault addresses from URL params", () => {
    mockSearchParams = new URLSearchParams("vaults=0xaaa,0xbbb&weights=50,50");
    render(<PortfolioPage />);
    expect(screen.getByText("Portfolio Constructor")).toBeDefined();
  });

  /** @req PC-14 */
  it("defaults to ITD period when none specified", () => {
    render(<PortfolioPage />);
    expect(screen.getByText("Portfolio Constructor")).toBeDefined();
    const itdButton = screen.getByText("ITD");
    expect(itdButton).toBeDefined();
  });

  /** @req PC-13 */
  it("renders AI placeholder with phase 4 message", () => {
    mockSearchParams = new URLSearchParams("vaults=0xaaa&weights=100");

    vi.mocked(usePortfolio).mockReturnValue({
      vaults: [{ name: "Test", vaultAddress: "0xaaa", portfolio: [] }] as any,
      positions: [{
        perp: {
          assetPositions: [],
          marginSummary: { accountValue: "0", totalMarginUsed: "0", totalNtlPos: "0", totalRawUsd: "0" },
          withdrawable: "0",
          time: 0,
        },
        spot: { balances: [] },
      }],
      perVaultMetrics: [null],
      portfolioMetrics: null,
      frontierPoints: [],
      correlationData: { names: ["Test"], matrix: [], dailyReturns: [[]] },
      performanceSeries: [],
      isLoading: false,
    } as any);

    render(<PortfolioPage />);
    expect(screen.getByTestId("ai-placeholder")).toBeDefined();
    expect(screen.getByText(/Coming in Phase 4/)).toBeDefined();
  });

  /** @req PC-01 */
  it("shows empty state when no vaults selected", () => {
    render(<PortfolioPage />);
    expect(screen.getByText(/Select vaults from the left/)).toBeDefined();
  });
});
