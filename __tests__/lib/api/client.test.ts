import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchVaultList, fetchVaultDetails, ApiError } from "@/lib/api/client";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("fetchVaultList", () => {
  it("returns vault list on success", async () => {
    const mockData = [
      {
        apr: 0.5,
        pnls: [["day", ["100", "200"]]],
        summary: {
          name: "Test Vault",
          vaultAddress: "0xabc",
          leader: "0xdef",
          tvl: "1000.0",
          isClosed: false,
          relationship: { type: "normal" },
          createTimeMillis: 1700000000000,
        },
      },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await fetchVaultList();
    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://stats-data.hyperliquid.xyz/Mainnet/vaults",
    );
  });

  it("throws ApiError on failure", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(fetchVaultList()).rejects.toThrow(ApiError);
    await expect(fetchVaultList()).rejects.toThrow("Failed to fetch vault list");
  });
});

describe("fetchVaultDetails", () => {
  it("returns vault details on success", async () => {
    const mockData = {
      name: "Test Vault",
      vaultAddress: "0xabc",
      leader: "0xdef",
      description: "A test vault",
      portfolio: [],
      apr: 0.5,
      followers: [],
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await fetchVaultDetails("0xabc");
    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "vaultDetails", vaultAddress: "0xabc" }),
    });
  });

  it("throws ApiError on failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(fetchVaultDetails("0xbad")).rejects.toThrow(ApiError);
  });
});
