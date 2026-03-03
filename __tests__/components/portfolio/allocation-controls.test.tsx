import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AllocationControls } from "@/components/portfolio/allocation-controls";
import type { PortfolioConstraints, OptimizerStrategy } from "@/lib/portfolio/types";

const defaultConstraints: PortfolioConstraints = { minWeight: 0.05, maxWeight: 0.50 };

describe("AllocationControls", () => {
  /** @req PC-02 */
  it("renders slider for each vault", () => {
    render(
      <AllocationControls
        vaultNames={["Vault A", "Vault B", "Vault C"]}
        weights={[0.4, 0.35, 0.25]}
        onWeightsChange={() => {}}
        constraints={defaultConstraints}
        onConstraintsChange={() => {}}
        onOptimize={() => {}}
      />,
    );
    expect(screen.getByText("Vault A")).toBeDefined();
    expect(screen.getByText("Vault B")).toBeDefined();
    expect(screen.getByText("Vault C")).toBeDefined();
    expect(screen.getAllByRole("slider")).toHaveLength(3);
  });

  /** @req PC-02 */
  it("triggers onWeightsChange when slider changes", () => {
    const onWeightsChange = vi.fn();
    render(
      <AllocationControls
        vaultNames={["Vault A", "Vault B"]}
        weights={[0.5, 0.5]}
        onWeightsChange={onWeightsChange}
        constraints={defaultConstraints}
        onConstraintsChange={() => {}}
        onOptimize={() => {}}
      />,
    );
    const sliders = screen.getAllByRole("slider");
    fireEvent.change(sliders[0], { target: { value: "60" } });
    expect(onWeightsChange).toHaveBeenCalledTimes(1);
    const newWeights = onWeightsChange.mock.calls[0][0] as number[];
    // Should sum to ~1
    expect(newWeights.reduce((s: number, w: number) => s + w, 0)).toBeCloseTo(1.0, 1);
  });

  /** @req PC-03 */
  it("renders optimizer preset buttons", () => {
    const onOptimize = vi.fn();
    render(
      <AllocationControls
        vaultNames={["Vault A"]}
        weights={[1]}
        onWeightsChange={() => {}}
        constraints={defaultConstraints}
        onConstraintsChange={() => {}}
        onOptimize={onOptimize}
      />,
    );
    const eqBtn = screen.getByText("Equal Weight");
    fireEvent.click(eqBtn);
    expect(onOptimize).toHaveBeenCalledWith("equal-weight");

    const mvBtn = screen.getByText("Min Variance");
    fireEvent.click(mvBtn);
    expect(onOptimize).toHaveBeenCalledWith("min-variance");

    const rpBtn = screen.getByText("Risk Parity");
    fireEvent.click(rpBtn);
    expect(onOptimize).toHaveBeenCalledWith("risk-parity");
  });

  /** @req PC-04 */
  it("renders constraint inputs with current values", () => {
    const onConstraintsChange = vi.fn();
    render(
      <AllocationControls
        vaultNames={["Vault A"]}
        weights={[1]}
        onWeightsChange={() => {}}
        constraints={{ minWeight: 0.10, maxWeight: 0.40 }}
        onConstraintsChange={onConstraintsChange}
        onOptimize={() => {}}
      />,
    );
    const minInput = screen.getByLabelText("Min weight constraint") as HTMLInputElement;
    const maxInput = screen.getByLabelText("Max weight constraint") as HTMLInputElement;
    expect(minInput.value).toBe("10");
    expect(maxInput.value).toBe("40");

    fireEvent.change(minInput, { target: { value: "15" } });
    expect(onConstraintsChange).toHaveBeenCalledWith({ minWeight: 0.15, maxWeight: 0.40 });
  });
});
