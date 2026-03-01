import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DeepDiveFilters } from "@/components/deep-dive/deep-dive-filters";

describe("DeepDiveFilters", () => {
  /** @req DIVE-11 */
  it("renders period buttons", () => {
    render(
      <DeepDiveFilters
        minTvl={500000}
        minAgeDays={180}
        period="ITD"
        onMinTvlChange={vi.fn()}
        onMinAgeDaysChange={vi.fn()}
        onPeriodChange={vi.fn()}
      />,
    );

    expect(screen.getByText("7D")).toBeInTheDocument();
    expect(screen.getByText("30D")).toBeInTheDocument();
    expect(screen.getByText("90D")).toBeInTheDocument();
    expect(screen.getByText("365D")).toBeInTheDocument();
    expect(screen.getByText("YTD")).toBeInTheDocument();
    expect(screen.getByText("ITD")).toBeInTheDocument();
  });

  /** @req DIVE-11 */
  it("calls onPeriodChange when period button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <DeepDiveFilters
        minTvl={500000}
        minAgeDays={180}
        period="ITD"
        onMinTvlChange={vi.fn()}
        onMinAgeDaysChange={vi.fn()}
        onPeriodChange={onChange}
      />,
    );

    await user.click(screen.getByText("30D"));
    expect(onChange).toHaveBeenCalledWith("30D");
  });

  /** @req DIVE-02 */
  it("renders TVL preset buttons", () => {
    render(
      <DeepDiveFilters
        minTvl={500000}
        minAgeDays={180}
        period="ITD"
        onMinTvlChange={vi.fn()}
        onMinAgeDaysChange={vi.fn()}
        onPeriodChange={vi.fn()}
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
        period="ITD"
        onMinTvlChange={vi.fn()}
        onMinAgeDaysChange={vi.fn()}
        onPeriodChange={vi.fn()}
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
        period="ITD"
        onMinTvlChange={onChange}
        onMinAgeDaysChange={vi.fn()}
        onPeriodChange={vi.fn()}
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
        period="ITD"
        onMinTvlChange={vi.fn()}
        onMinAgeDaysChange={onChange}
        onPeriodChange={vi.fn()}
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
        period="ITD"
        onMinTvlChange={vi.fn()}
        onMinAgeDaysChange={vi.fn()}
        onPeriodChange={vi.fn()}
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
        period="ITD"
        onMinTvlChange={vi.fn()}
        onMinAgeDaysChange={vi.fn()}
        onPeriodChange={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("Minimum age in days") as HTMLInputElement;
    expect(input.value).toBe("120");
  });

});
