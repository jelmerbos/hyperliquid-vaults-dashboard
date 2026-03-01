import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchVaultList,
  fetchVaultDetails,
  fetchClearinghouseState,
  fetchSpotClearinghouseState,
  ApiError,
} from "@/lib/api/client";

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

describe("fetchClearinghouseState", () => {
  /** @req INST-10 */
  it("returns clearinghouse state on success", async () => {
    const mockData = {
      assetPositions: [
        {
          position: {
            coin: "ETH",
            szi: "0.5",
            entryPx: "3000.0",
            leverage: { type: "cross", value: 5, rawUsd: "-1500.0" },
            liquidationPx: "2500.0",
            marginUsed: "300.0",
            positionValue: "1500.0",
            unrealizedPnl: "50.0",
            returnOnEquity: "0.033",
            maxLeverage: 50,
            cumFunding: { allTime: "10.0", sinceChange: "0.0", sinceOpen: "1.0" },
          },
          type: "oneWay",
        },
      ],
      marginSummary: {
        accountValue: "10000.0",
        totalMarginUsed: "300.0",
        totalNtlPos: "1500.0",
        totalRawUsd: "8500.0",
      },
      withdrawable: "9700.0",
      time: 1700000000000,
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await fetchClearinghouseState("0xabc");
    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "clearinghouseState", user: "0xabc" }),
    });
  });

  /** @req INST-10 */
  it("throws ApiError on failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      statusText: "Bad Gateway",
    });

    await expect(fetchClearinghouseState("0xbad")).rejects.toThrow(ApiError);
  });
});

describe("fetchSpotClearinghouseState", () => {
  /** @req INST-11 */
  it("returns spot balances on success", async () => {
    const mockData = {
      balances: [
        { coin: "USDC", token: 0, hold: "0.0", total: "5000.0", entryNtl: "0.0" },
        { coin: "HYPE", token: 2, hold: "0", total: "100", entryNtl: "250.0" },
      ],
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await fetchSpotClearinghouseState("0xabc");
    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "spotClearinghouseState", user: "0xabc" }),
    });
  });

  /** @req INST-11 */
  it("throws ApiError on failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(fetchSpotClearinghouseState("0xbad")).rejects.toThrow(ApiError);
  });
});
