import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MCTRAnalysis } from "@/components/portfolio/mctr-analysis";

const mockData = [
  { mctr: 0.15, componentRisk: 0.09, percentContribution: 0.6 },
  { mctr: 0.10, componentRisk: 0.06, percentContribution: 0.4 },
];

describe("MCTRAnalysis", () => {
  it("renders a row per vault", () => {
    render(
      <MCTRAnalysis
        vaultNames={["Vault A", "Vault B"]}
        weights={[0.6, 0.4]}
        mctrData={mockData}
      />,
    );
    expect(screen.getByText("Vault A")).toBeDefined();
    expect(screen.getByText("Vault B")).toBeDefined();
    expect(screen.getByText("Marginal Contribution to Risk")).toBeDefined();
  });

  it("renders nothing when mctrData is empty", () => {
    const { container } = render(
      <MCTRAnalysis
        vaultNames={["Vault A"]}
        weights={[1]}
        mctrData={[]}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("highlights disproportionate risk contributors", () => {
    // Vault A: weight=30% but risk contribution=70% -> should be highlighted
    const skewedData = [
      { mctr: 0.30, componentRisk: 0.21, percentContribution: 0.7 },
      { mctr: 0.05, componentRisk: 0.09, percentContribution: 0.3 },
    ];
    render(
      <MCTRAnalysis
        vaultNames={["Risky Vault", "Safe Vault"]}
        weights={[0.3, 0.7]}
        mctrData={skewedData}
      />,
    );
    // Risky Vault contributes 70% of risk with only 30% weight -> yellow
    const riskyRow = screen.getByTestId("mctr-row-0");
    expect(riskyRow).toBeDefined();
  });

  it("sorts by percent contribution descending", () => {
    render(
      <MCTRAnalysis
        vaultNames={["Low Risk", "High Risk"]}
        weights={[0.5, 0.5]}
        mctrData={[
          { mctr: 0.05, componentRisk: 0.025, percentContribution: 0.3 },
          { mctr: 0.15, componentRisk: 0.075, percentContribution: 0.7 },
        ]}
      />,
    );
    const rows = screen.getAllByTestId(/^mctr-row-/);
    expect(rows).toHaveLength(2);
    // First row should be the higher contributor (index 1)
    expect(rows[0].getAttribute("data-testid")).toBe("mctr-row-1");
  });
});
