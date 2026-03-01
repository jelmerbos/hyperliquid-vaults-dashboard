import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeepDiveFilters } from "@/components/deep-dive/deep-dive-filters";

describe("DeepDiveFilters", () => {
  /** @req DIVE-02 */
  it("renders TVL preset buttons", () => {
    render(
      <DeepDiveFilters
        minTvl={500000}
        minAgeDays={180}
        onMinTvlChange={vi.fn()}
        onMinAgeDaysChange={vi.fn()}
      />,
    );

    expect(screen.getByText("$100.0K")).toBeInTheDocument();
    expect(screen.getByText("$250.0K")).toBeInTheDocument();
    expect(screen.getByText("$500.0K")).toBeInTheDocument();
    expect(screen.getByText("$1.0M")).toBeInTheDocument();
    expect(screen.getByText("$5.0M")).toBeInTheDocument();
  });

  /** @req DIVE-03 */
  it("renders age preset buttons", () => {
    render(
      <DeepDiveFilters
        minTvl={500000}
        minAgeDays={180}
        onMinTvlChange={vi.fn()}
        onMinAgeDaysChange={vi.fn()}
      />,
    );

    expect(screen.getByText("30d")).toBeInTheDocument();
    expect(screen.getByText("90d")).toBeInTheDocument();
    expect(screen.getByText("180d")).toBeInTheDocument();
    expect(screen.getByText("1y")).toBeInTheDocument();
  });

  /** @req DIVE-02 */
  it("calls onMinTvlChange when TVL preset is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DeepDiveFilters
        minTvl={500000}
        minAgeDays={180}
        onMinTvlChange={onChange}
        onMinAgeDaysChange={vi.fn()}
      />,
    );

    await user.click(screen.getByText("$1.0M"));
    expect(onChange).toHaveBeenCalledWith(1_000_000);
  });

  /** @req DIVE-03 */
  it("calls onMinAgeDaysChange when age preset is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DeepDiveFilters
        minTvl={500000}
        minAgeDays={180}
        onMinTvlChange={vi.fn()}
        onMinAgeDaysChange={onChange}
      />,
    );

    await user.click(screen.getByText("90d"));
    expect(onChange).toHaveBeenCalledWith(90);
  });

  /** @req DIVE-02 */
  it("renders custom TVL input with current value", () => {
    render(
      <DeepDiveFilters
        minTvl={750000}
        minAgeDays={180}
        onMinTvlChange={vi.fn()}
        onMinAgeDaysChange={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("Minimum TVL") as HTMLInputElement;
    expect(input.value).toBe("750000");
  });

  /** @req DIVE-03 */
  it("renders custom age input with current value", () => {
    render(
      <DeepDiveFilters
        minTvl={500000}
        minAgeDays={120}
        onMinTvlChange={vi.fn()}
        onMinAgeDaysChange={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("Minimum age in days") as HTMLInputElement;
    expect(input.value).toBe("120");
  });
});
