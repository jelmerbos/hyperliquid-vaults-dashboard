import { describe, it, expect } from "vitest";
import {
  beta,
  alpha,
  correlation,
  informationRatio,
  correlationMatrix,
} from "@/lib/metrics/benchmark";

describe("beta", () => {
  /** @req INST-17 INST-18 */
  it("returns 0 for insufficient data", () => {
    expect(beta([], [])).toBe(0);
    expect(beta([0.01], [0.02])).toBe(0);
  });

  /** @req INST-17 INST-18 */
  it("beta of a series against itself is 1.0", () => {
    const returns = [0.01, -0.02, 0.03, -0.01, 0.02, -0.03, 0.015];
    expect(beta(returns, returns)).toBeCloseTo(1.0);
  });

  /** @req INST-17 INST-18 */
  it("beta of 2x leveraged series is 2.0", () => {
    const benchmark = [0.01, -0.02, 0.03, -0.01, 0.02, -0.03, 0.015];
    const leveraged = benchmark.map((r) => r * 2);
    expect(beta(leveraged, benchmark)).toBeCloseTo(2.0);
  });

  /** @req INST-17 INST-18 */
  it("beta of inverse series is -1.0", () => {
    const benchmark = [0.01, -0.02, 0.03, -0.01, 0.02, -0.03, 0.015];
    const inverse = benchmark.map((r) => -r);
    expect(beta(inverse, benchmark)).toBeCloseTo(-1.0);
  });

  /** @req INST-17 INST-18 */
  it("returns 0 when benchmark has zero variance", () => {
    const vault = [0.01, -0.02, 0.03];
    const flat = [0.01, 0.01, 0.01];
    expect(beta(vault, flat)).toBe(0);
  });
});

describe("alpha", () => {
  /** @req INST-20 */
  it("alpha is zero when vault return equals beta * benchmark return", () => {
    // vault: 20% return, benchmark: 10% return, beta: 2.0
    // alpha = 0.20 - 2.0 * 0.10 = 0.0
    expect(alpha(0.20, 0.10, 2.0)).toBeCloseTo(0.0);
  });

  /** @req INST-20 */
  it("positive alpha means outperformance", () => {
    // vault: 25% return, benchmark: 10% return, beta: 1.0
    // alpha = 0.25 - 1.0 * 0.10 = 0.15
    expect(alpha(0.25, 0.10, 1.0)).toBeCloseTo(0.15);
  });

  /** @req INST-20 */
  it("negative alpha means underperformance", () => {
    // vault: 5% return, benchmark: 10% return, beta: 1.0
    // alpha = 0.05 - 1.0 * 0.10 = -0.05
    expect(alpha(0.05, 0.10, 1.0)).toBeCloseTo(-0.05);
  });
});

describe("correlation", () => {
  /** @req INST-19 */
  it("returns 0 for insufficient data", () => {
    expect(correlation([], [])).toBe(0);
    expect(correlation([0.01], [0.02])).toBe(0);
  });

  /** @req INST-19 */
  it("perfect positive correlation = 1.0", () => {
    const a = [0.01, -0.02, 0.03, -0.01, 0.02];
    const b = a.map((r) => r * 3 + 0.001); // linear transform
    expect(correlation(a, b)).toBeCloseTo(1.0);
  });

  /** @req INST-19 */
  it("perfect negative correlation = -1.0", () => {
    const a = [0.01, -0.02, 0.03, -0.01, 0.02];
    const b = a.map((r) => -r * 2); // inverse linear transform
    expect(correlation(a, b)).toBeCloseTo(-1.0);
  });

  /** @req INST-19 */
  it("correlation of a series with itself is 1.0", () => {
    const a = [0.01, -0.02, 0.03, -0.01, 0.02, -0.03];
    expect(correlation(a, a)).toBeCloseTo(1.0);
  });

  /** @req INST-19 */
  it("returns 0 when one series has zero variance", () => {
    const a = [0.01, -0.02, 0.03];
    const flat = [0.05, 0.05, 0.05];
    expect(correlation(a, flat)).toBeCloseTo(0);
  });
});

describe("informationRatio", () => {
  /** @req INST-21 */
  it("returns 0 for insufficient data", () => {
    expect(informationRatio([], [])).toBe(0);
    expect(informationRatio([0.01], [0.02])).toBe(0);
  });

  /** @req INST-21 */
  it("returns 0 when vault tracks benchmark perfectly", () => {
    const returns = [0.01, -0.02, 0.03, -0.01, 0.02];
    expect(informationRatio(returns, returns)).toBe(0);
  });

  /** @req INST-21 */
  it("positive IR when vault consistently outperforms", () => {
    const benchmark = [0.01, -0.02, 0.03, -0.01, 0.02, -0.03];
    // Vault beats benchmark by 0.5% every day
    const vault = benchmark.map((r) => r + 0.005);
    const ir = informationRatio(vault, benchmark);
    expect(ir).toBeGreaterThan(0);
  });

  /** @req INST-21 */
  it("negative IR when vault consistently underperforms", () => {
    const benchmark = [0.01, -0.02, 0.03, -0.01, 0.02, -0.03];
    const vault = benchmark.map((r) => r - 0.005);
    const ir = informationRatio(vault, benchmark);
    expect(ir).toBeLessThan(0);
  });
});

describe("correlationMatrix", () => {
  /** @req INST-19 */
  it("returns empty matrix for no vaults", () => {
    expect(correlationMatrix([])).toEqual([]);
  });

  /** @req INST-19 */
  it("single vault returns 1x1 matrix with 1.0", () => {
    const matrix = correlationMatrix([[0.01, -0.02, 0.03]]);
    expect(matrix).toEqual([[1.0]]);
  });

  /** @req INST-19 */
  it("diagonal is always 1.0", () => {
    const vaults = [
      [0.01, -0.02, 0.03, -0.01, 0.02],
      [0.02, -0.01, 0.01, -0.03, 0.01],
      [-0.01, 0.03, -0.02, 0.02, -0.01],
    ];
    const matrix = correlationMatrix(vaults);
    expect(matrix[0][0]).toBe(1.0);
    expect(matrix[1][1]).toBe(1.0);
    expect(matrix[2][2]).toBe(1.0);
  });

  /** @req INST-19 */
  it("matrix is symmetric", () => {
    const vaults = [
      [0.01, -0.02, 0.03, -0.01, 0.02],
      [0.02, -0.01, 0.01, -0.03, 0.01],
      [-0.01, 0.03, -0.02, 0.02, -0.01],
    ];
    const matrix = correlationMatrix(vaults);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(matrix[i][j]).toBeCloseTo(matrix[j][i]);
      }
    }
  });

  /** @req INST-19 */
  it("all values between -1 and 1", () => {
    const vaults = [
      [0.01, -0.02, 0.03, -0.01, 0.02, -0.03, 0.015],
      [0.02, -0.01, 0.01, -0.03, 0.01, -0.02, 0.005],
      [-0.01, 0.03, -0.02, 0.02, -0.01, 0.01, -0.005],
    ];
    const matrix = correlationMatrix(vaults);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(matrix[i][j]).toBeGreaterThanOrEqual(-1);
        expect(matrix[i][j]).toBeLessThanOrEqual(1);
      }
    }
  });
});
