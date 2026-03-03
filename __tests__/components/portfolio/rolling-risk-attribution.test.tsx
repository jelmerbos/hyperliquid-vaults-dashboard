import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { RollingRiskAttribution } from "@/components/portfolio/rolling-risk-attribution";

// Mock recharts
vi.mock("recharts", () => ({
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => null,
  Area: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => null,
}));

const mockSharpeData = {
  vaultValues: [
    [0.5, 0.8, 1.2, 0.6, 0.9],
    [0.3, 0.5, 0.7, 0.4, 0.6],
  ],
  portfolioValues: [0.4, 0.7, 1.0, 0.5, 0.8],
};

const mockBetaData = [
  [0.8, 1.0, 1.2, 0.9, 1.1],
  [0.5, 0.7, 0.6, 0.8, 0.7],
];

const mockRiskData = [
  [0.6, 0.55, 0.58, 0.62, 0.57],
  [0.4, 0.45, 0.42, 0.38, 0.43],
];

describe("RollingRiskAttribution", () => {
  const defaultProps = {
    vaultNames: ["Vault A", "Vault B"],
    windowDays: 60,
    onWindowChange: vi.fn(),
    rollingSharpeData: mockSharpeData,
    rollingBetaData: mockBetaData,
    riskContributionData: mockRiskData,
  };

  /** @req PC-16 */
  it("renders window selector with 3 buttons", () => {
    render(<RollingRiskAttribution {...defaultProps} />);
    expect(screen.getByTestId("window-selector")).toBeDefined();
    expect(screen.getByTestId("window-btn-30")).toBeDefined();
    expect(screen.getByTestId("window-btn-60")).toBeDefined();
    expect(screen.getByTestId("window-btn-90")).toBeDefined();
  });

  /** @req PC-16 */
  it("renders rolling Sharpe chart", () => {
    render(<RollingRiskAttribution {...defaultProps} />);
    expect(screen.getByTestId("rolling-sharpe-chart")).toBeDefined();
    expect(screen.getByText(/Rolling Sharpe Ratio/)).toBeDefined();
  });

  /** @req PC-16 */
  it("renders rolling beta chart", () => {
    render(<RollingRiskAttribution {...defaultProps} />);
    expect(screen.getByTestId("rolling-beta-chart")).toBeDefined();
    expect(screen.getByText(/Rolling Beta to BTC/)).toBeDefined();
  });

  /** @req PC-16 */
  it("renders risk contribution chart", () => {
    render(<RollingRiskAttribution {...defaultProps} />);
    expect(screen.getByTestId("risk-contribution-chart")).toBeDefined();
  });

  /** @req PC-16 */
  it("returns null when data insufficient", () => {
    const { container } = render(
      <RollingRiskAttribution
        {...defaultProps}
        rollingSharpeData={{ vaultValues: [], portfolioValues: [] }}
        rollingBetaData={[]}
        riskContributionData={[]}
      />,
    );
    expect(container.innerHTML).toBe("");
  });
});
