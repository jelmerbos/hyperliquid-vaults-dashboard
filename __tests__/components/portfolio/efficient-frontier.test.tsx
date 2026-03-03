import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EfficientFrontier } from "@/components/portfolio/efficient-frontier";
import type { EfficientFrontierPoint } from "@/lib/portfolio/types";

const mockVaultPoints = [
  { name: "Vault A", volatility: 0.20, return: 0.15, sharpe: 0.75 },
  { name: "Vault B", volatility: 0.35, return: 0.30, sharpe: 0.86 },
  { name: "Vault C", volatility: 0.10, return: 0.08, sharpe: 0.80 },
];

const mockFrontier: EfficientFrontierPoint[] = [
  { volatility: 0.10, return: 0.08, weights: [0.1, 0.2, 0.7] },
  { volatility: 0.15, return: 0.12, weights: [0.2, 0.3, 0.5] },
  { volatility: 0.20, return: 0.18, weights: [0.3, 0.4, 0.3] },
  { volatility: 0.30, return: 0.25, weights: [0.4, 0.5, 0.1] },
];

describe("EfficientFrontier", () => {
  /** @req PC-07 */
  it("renders chart with vault points and frontier", () => {
    render(
      <EfficientFrontier
        vaultPoints={mockVaultPoints}
        frontierPoints={mockFrontier}
      />,
    );
    expect(screen.getByTestId("frontier-chart")).toBeDefined();
    expect(screen.getByText("Efficient Frontier")).toBeDefined();
  });

  /** @req PC-07 */
  it("renders current portfolio marker when provided", () => {
    render(
      <EfficientFrontier
        vaultPoints={mockVaultPoints}
        frontierPoints={mockFrontier}
        currentPortfolio={{ volatility: 0.18, return: 0.14 }}
      />,
    );
    expect(screen.getByTestId("frontier-chart")).toBeDefined();
  });

  /** @req PC-07 */
  it("shows empty message for < 2 vaults", () => {
    render(
      <EfficientFrontier
        vaultPoints={[mockVaultPoints[0]]}
        frontierPoints={[]}
      />,
    );
    expect(screen.getByTestId("frontier-empty")).toBeDefined();
  });

  /** @req PC-07 */
  it("handles empty frontier gracefully", () => {
    render(
      <EfficientFrontier
        vaultPoints={mockVaultPoints}
        frontierPoints={[]}
      />,
    );
    // Should still render the chart container (scatter points visible, no frontier line)
    expect(screen.getByTestId("frontier-chart")).toBeDefined();
  });
});
