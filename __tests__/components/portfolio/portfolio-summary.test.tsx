import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PortfolioSummary } from "@/components/portfolio/portfolio-summary";
import type { PortfolioMetrics } from "@/lib/portfolio/types";

const mockMetrics: PortfolioMetrics = {
  annualizedReturn: 0.25,
  annualizedVolatility: 0.35,
  sharpeRatio: 0.71,
  sortinoRatio: 1.2,
  maxDrawdown: -0.15,
  var95: -0.03,
  cvar95: -0.045,
  diversificationRatio: 1.4,
  betaBtc: 0.6,
  betaHype: null,
  alphaBtc: 0.05,
  alphaHype: null,
};

describe("PortfolioSummary", () => {
  /** @req PC-05 */
  it("renders all 8 metric cards", () => {
    render(<PortfolioSummary metrics={mockMetrics} />);
    expect(screen.getByText("Ann. Return")).toBeDefined();
    expect(screen.getByText("Volatility")).toBeDefined();
    expect(screen.getByText("Sharpe")).toBeDefined();
    expect(screen.getByText("Sortino")).toBeDefined();
    expect(screen.getByText("Max Drawdown")).toBeDefined();
    expect(screen.getByText("VaR (95%)")).toBeDefined();
    expect(screen.getByText("Div. Ratio")).toBeDefined();
    expect(screen.getByText("Beta (BTC)")).toBeDefined();
  });

  /** @req PC-05 */
  it("formats values correctly", () => {
    render(<PortfolioSummary metrics={mockMetrics} />);
    expect(screen.getByText("25.00%")).toBeDefined(); // Ann. Return
    expect(screen.getByText("0.71")).toBeDefined(); // Sharpe
    expect(screen.getByText("-15.00%")).toBeDefined(); // Max Drawdown
    expect(screen.getByText("1.40")).toBeDefined(); // Div Ratio
    expect(screen.getByText("0.60")).toBeDefined(); // Beta BTC
  });

  /** @req PC-05 */
  it("shows loading state when metrics are null", () => {
    render(<PortfolioSummary metrics={null} />);
    expect(screen.getByTestId("portfolio-summary-loading")).toBeDefined();
  });

  it("shows N/A for null beta", () => {
    const metricsNoHype = { ...mockMetrics, betaBtc: null };
    render(<PortfolioSummary metrics={metricsNoHype} />);
    expect(screen.getByText("N/A")).toBeDefined();
  });
});
