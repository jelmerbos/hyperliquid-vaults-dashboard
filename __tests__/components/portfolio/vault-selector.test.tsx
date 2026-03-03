import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VaultSelector } from "@/components/portfolio/vault-selector";
import type { VaultListItem } from "@/lib/api/types";

function mockVault(name: string, address: string, tvl: number = 1_000_000): VaultListItem {
  return {
    apr: 0.15,
    pnls: [],
    summary: {
      name,
      vaultAddress: address,
      leader: "0xleader",
      tvl: String(tvl),
      isClosed: false,
      createTimeMillis: Date.now() - 365 * 86_400_000,
    },
  } as VaultListItem;
}

const vaults = [
  mockVault("Alpha Vault", "0xaaa"),
  mockVault("Beta Vault", "0xbbb"),
  mockVault("Gamma Vault", "0xccc"),
  mockVault("Delta Vault", "0xddd"),
];

describe("VaultSelector", () => {
  /** @req PC-01 */
  it("renders vault count and add button", () => {
    render(
      <VaultSelector vaults={vaults} selected={[]} onSelect={() => {}} />,
    );
    expect(screen.getByText("0 of 10 selected")).toBeDefined();
    expect(screen.getByText("Add vault to portfolio...")).toBeDefined();
  });

  /** @req PC-01 */
  it("shows selected vaults as badges", () => {
    render(
      <VaultSelector
        vaults={vaults}
        selected={["0xaaa", "0xbbb"]}
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText("Alpha Vault")).toBeDefined();
    expect(screen.getByText("Beta Vault")).toBeDefined();
    expect(screen.getByText("2 of 10 selected")).toBeDefined();
  });

  /** @req PC-01 */
  it("calls onSelect when removing a badge", () => {
    const onSelect = vi.fn();
    render(
      <VaultSelector
        vaults={vaults}
        selected={["0xaaa", "0xbbb"]}
        onSelect={onSelect}
      />,
    );
    const removeBtn = screen.getByLabelText("Remove Alpha Vault");
    fireEvent.click(removeBtn);
    expect(onSelect).toHaveBeenCalledWith(["0xbbb"]);
  });

  /** @req PC-01 */
  it("disables add button when max reached", () => {
    render(
      <VaultSelector
        vaults={vaults}
        selected={["0xaaa", "0xbbb", "0xccc"]}
        onSelect={() => {}}
        maxSelections={3}
      />,
    );
    const btn = screen.getByText("Max 3 vaults");
    expect(btn.closest("button")?.disabled).toBe(true);
  });
});
