import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StressTestAnalysis } from "@/components/portfolio/stress-test-analysis";
import { PREDEFINED_SCENARIOS } from "@/lib/portfolio/metrics";

const mockResults = PREDEFINED_SCENARIOS.map((scenario) => ({
  scenario,
  portfolioImpact: -0.25,
  perVaultImpact: [-0.30, -0.20],
}));

const mockWorstReturns = [
  { vault: "Vault A", worst1d: -0.08, worst5d: -0.15, worst10d: -0.22 },
  { vault: "Vault B", worst1d: -0.04, worst5d: -0.10, worst10d: -0.16 },
];

describe("StressTestAnalysis", () => {
  /** @req PC-17 */
  it("renders one row per scenario", () => {
    render(
      <StressTestAnalysis
        vaultNames={["Vault A", "Vault B"]}
        stressResults={mockResults}
        worstReturns={mockWorstReturns}
      />,
    );
    expect(screen.getByTestId("scenario-table")).toBeDefined();
    for (let i = 0; i < PREDEFINED_SCENARIOS.length; i++) {
      expect(screen.getByTestId(`scenario-row-${i}`)).toBeDefined();
    }
  });

  /** @req PC-17 */
  it("applies conditional coloring for severe impacts", () => {
    const severeResults = [
      {
        scenario: PREDEFINED_SCENARIOS[0],
        portfolioImpact: -0.40, // red: < -15%
        perVaultImpact: [-0.50, -0.08], // red, yellow
      },
    ];
    render(
      <StressTestAnalysis
        vaultNames={["Vault A", "Vault B"]}
        stressResults={severeResults}
        worstReturns={[]}
      />,
    );
    const row = screen.getByTestId("scenario-row-0");
    // The portfolio impact cell should contain the formatted percent
    expect(row.textContent).toContain("-40.00%");
  });

  /** @req PC-17 */
  it("renders worst returns table", () => {
    render(
      <StressTestAnalysis
        vaultNames={["Vault A", "Vault B"]}
        stressResults={[]}
        worstReturns={mockWorstReturns}
      />,
    );
    expect(screen.getByTestId("worst-returns-table")).toBeDefined();
    expect(screen.getByTestId("worst-return-row-0")).toBeDefined();
    expect(screen.getByTestId("worst-return-row-1")).toBeDefined();
  });

  /** @req PC-17 */
  it("returns null when no results", () => {
    const { container } = render(
      <StressTestAnalysis
        vaultNames={[]}
        stressResults={[]}
        worstReturns={[]}
      />,
    );
    expect(container.innerHTML).toBe("");
  });
});
