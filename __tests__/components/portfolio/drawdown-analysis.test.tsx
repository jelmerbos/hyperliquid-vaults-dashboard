import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DrawdownAnalysis } from "@/components/portfolio/drawdown-analysis";
import type { TimeSeries } from "@/lib/metrics/returns";
import type { DrawdownEpisode } from "@/lib/metrics/risk";

// Mock recharts to avoid rendering issues in test environment
vi.mock("recharts", () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => null,
}));

const MS_PER_DAY = 86_400_000;

const mockPortfolioDD: TimeSeries = [
  [0, 0],
  [MS_PER_DAY, -0.05],
  [MS_PER_DAY * 2, -0.10],
  [MS_PER_DAY * 3, -0.03],
  [MS_PER_DAY * 4, 0],
];

const mockVaultDD: TimeSeries[] = [
  [
    [0, 0],
    [MS_PER_DAY, -0.08],
    [MS_PER_DAY * 2, -0.15],
    [MS_PER_DAY * 3, -0.05],
    [MS_PER_DAY * 4, 0],
  ],
  [
    [0, 0],
    [MS_PER_DAY, -0.02],
    [MS_PER_DAY * 2, -0.05],
    [MS_PER_DAY * 3, -0.01],
    [MS_PER_DAY * 4, 0],
  ],
];

const mockEpisodes: DrawdownEpisode[][] = [
  [
    {
      startTs: 0,
      troughTs: MS_PER_DAY * 2,
      recoveryTs: MS_PER_DAY * 4,
      depth: -0.15,
      durationDays: 4,
      recoveryDays: 2,
    },
  ],
  [
    {
      startTs: 0,
      troughTs: MS_PER_DAY * 2,
      recoveryTs: null,
      depth: -0.05,
      durationDays: 4,
      recoveryDays: null,
    },
  ],
];

describe("DrawdownAnalysis", () => {
  /** @req PC-15 */
  it("renders episodes table with correct row count", () => {
    render(
      <DrawdownAnalysis
        vaultNames={["Vault A", "Vault B"]}
        perVaultDrawdownSeries={mockVaultDD}
        portfolioDrawdownSeries={mockPortfolioDD}
        perVaultEpisodes={mockEpisodes}
      />,
    );
    expect(screen.getByTestId("episodes-table")).toBeDefined();
    expect(screen.getByTestId("episode-row-0")).toBeDefined();
    expect(screen.getByTestId("episode-row-1")).toBeDefined();
  });

  /** @req PC-15 */
  it("shows 'Ongoing' for unrecovered drawdown", () => {
    render(
      <DrawdownAnalysis
        vaultNames={["Vault A", "Vault B"]}
        perVaultDrawdownSeries={mockVaultDD}
        portfolioDrawdownSeries={mockPortfolioDD}
        perVaultEpisodes={mockEpisodes}
      />,
    );
    expect(screen.getByText("Ongoing")).toBeDefined();
  });

  /** @req PC-15 */
  it("returns null when no data", () => {
    const { container } = render(
      <DrawdownAnalysis
        vaultNames={["Vault A"]}
        perVaultDrawdownSeries={[[]]}
        portfolioDrawdownSeries={[]}
        perVaultEpisodes={[[]]}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  /** @req PC-15 */
  it("renders worst DD comparison section", () => {
    render(
      <DrawdownAnalysis
        vaultNames={["Vault A", "Vault B"]}
        perVaultDrawdownSeries={mockVaultDD}
        portfolioDrawdownSeries={mockPortfolioDD}
        perVaultEpisodes={mockEpisodes}
      />,
    );
    expect(screen.getByTestId("worst-dd-comparison")).toBeDefined();
    expect(screen.getByText("Worst Drawdown per Vault")).toBeDefined();
  });
});
