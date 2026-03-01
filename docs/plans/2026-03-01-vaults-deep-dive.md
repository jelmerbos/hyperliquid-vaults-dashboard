# Plan: Vaults Deep Dive Page

Date: 2026-03-01
Brainstorm: docs/brainstorms/2026-02-28-institutional-upgrade.md
Approved approach: Deep Dive page (from interview session)

## Context

A dedicated `/deep-dive` page showing a filtered table of institutional-quality vaults with all computed metrics. Users can filter by TVL and age thresholds, sort by any metric, and checkbox-select vaults to send to the `/compare` page.

Key design challenge: the vault list endpoint only provides basic data (name, tvl, apr, pnl periods). All risk-adjusted metrics (Sharpe, Sortino, Calmar, VaR, vol, beta) require per-vault `vaultDetails` fetches to get the `accountValueHistory`. The page needs to batch-fetch the top N qualifying vaults and compute metrics client-side.

## Requirements Covered

| ID | Requirement | Status |
|----|-------------|--------|
| DIVE-01 | Page route at `/deep-dive` with nav link | New |
| DIVE-02 | Filter vaults by min TVL (default $500K, user-adjustable) | New |
| DIVE-03 | Filter vaults by min age (default 180 days, user-adjustable) | New |
| DIVE-04 | Select top 10 qualifying vaults (5 by TVL + 5 by return) for detail fetch | New |
| DIVE-05 | Batch-fetch vaultDetails for qualifying vaults via `useQueries` | New |
| DIVE-06 | Compute all metrics per vault: Sharpe, Sortino, Calmar, VaR, CVaR, vol, maxDD, recoveryFactor | New |
| DIVE-07 | Compute beta to BTC and beta to HYPE per vault (requires benchmark data) | New |
| DIVE-08 | Display metrics in a sortable TanStack Table | New |
| DIVE-09 | Checkbox column for selecting vaults to compare | New |
| DIVE-10 | "Compare Selected" button that navigates to `/compare?vaults=...` | New |
| DIVE-11 | Loading states: skeleton rows while vaultDetails are being fetched | New |
| DIVE-12 | Graceful handling when vault has insufficient data (< 30 days) | New |

## Steps

### Step 1: Data layer - useDeepDiveVaults hook

Create a hook that orchestrates the full data pipeline: filter vault list, pick top N, batch-fetch details, compute metrics.

- Files:
  - Create `src/lib/hooks/use-deep-dive-vaults.ts`
  - Create `src/lib/metrics/deep-dive.ts` (compute all metrics for a single vault into a flat row)
- Tests:
  - Create `__tests__/lib/metrics/deep-dive.test.ts`
- Requirement IDs: DIVE-02, DIVE-03, DIVE-04, DIVE-05, DIVE-06, DIVE-12
- Checkpoint: Tests pass for metric computation. Hook returns typed rows with all metrics.

**Design notes:**
- `useDeepDiveVaults(minTvl, minAgeDays)`:
  1. Calls `useVaults()` to get the full list
  2. Filters by TVL >= minTvl and age >= minAgeDays
  3. Picks top 5 by TVL + top 5 by APR (deduped, capped at 10)
  4. Uses `useQueries` to fetch `vaultDetails` for each
  5. Computes `DeepDiveRow` per vault: `{ vault: VaultDetails, metrics: DeepDiveMetrics }`
- `DeepDiveMetrics` interface: sharpe, sortino, calmar, var95, cvar95, annVol, maxDD, maxDDDuration, recoveryFactor, annReturn, cumReturn, winRate, positiveMonthPct
- Vaults with < 30 data points get `metrics: null` and show "Insufficient data" in the table

### Step 2: Benchmark beta integration

Add BTC and HYPE beta to each DeepDiveRow, using the existing `useBenchmark` hook and `beta()` function.

- Files:
  - Modify `src/lib/hooks/use-deep-dive-vaults.ts` (add benchmark data merging)
  - Modify `src/lib/metrics/deep-dive.ts` (add betaBtc, betaHype to DeepDiveMetrics)
- Tests:
  - Add to `__tests__/lib/metrics/deep-dive.test.ts`
- Requirement IDs: DIVE-07
- Checkpoint: DeepDiveMetrics includes betaBtc and betaHype. Values are null when benchmark data unavailable.

**Design notes:**
- Hook fetches `useBenchmark("BTC", ...)` and `useBenchmark("HYPE", ...)` using the min/max timestamps from the fetched vaults
- Beta computation uses `dailyReturns(avHistory)` aligned with benchmark dailyReturns
- When CoinGecko API key is missing, beta columns show "N/A"

### Step 3: Deep Dive table component

Build the TanStack Table with all metric columns, sortable headers, and checkbox selection.

- Files:
  - Create `src/components/deep-dive/deep-dive-columns.tsx`
  - Create `src/components/deep-dive/deep-dive-table.tsx`
- Tests:
  - Create `__tests__/components/deep-dive/deep-dive-table.test.tsx`
- Requirement IDs: DIVE-08, DIVE-09, DIVE-10, DIVE-11, DIVE-12
- Checkpoint: Table renders with all columns. Sorting works on all metric columns. Checkboxes select rows.

**Design notes:**
- Column groups: Identity (name, tvl, age), Return (annReturn, cumReturn, APR), Risk (vol, maxDD, maxDDDuration, VaR, CVaR), Risk-Adjusted (Sharpe, Sortino, Calmar, recoveryFactor, winRate, positiveMonthPct), Benchmark (betaBtc, betaHype)
- Use existing `SortHeader` pattern from `vault-table/columns.tsx`
- Checkbox column uses `@tanstack/react-table` row selection
- Color coding: green for positive metrics, red for negative
- "Insufficient data" row gets muted text and no sorting values

### Step 4: Page, filters, and navigation

Create the page route, filter controls, compare button, and add nav link.

- Files:
  - Create `src/app/deep-dive/page.tsx`
  - Create `src/components/deep-dive/deep-dive-filters.tsx`
  - Modify `src/components/nav-header.tsx` (add Deep Dive link)
- Tests:
  - Create `__tests__/components/deep-dive/deep-dive-filters.test.tsx`
- Requirement IDs: DIVE-01, DIVE-02, DIVE-03, DIVE-10, DIVE-11
- Checkpoint: Page loads at `/deep-dive`. Filters adjust TVL/age thresholds. "Compare Selected" navigates to `/compare?vaults=...`. Nav link works.

**Design notes:**
- Filters: two sliders or number inputs for min TVL and min age
- URL state: `?minTvl=500000&minAge=180` so filters are shareable
- "Compare Selected" button: disabled when < 2 or > 4 selected, navigates to `/compare?vaults=addr1,addr2,...`
- Loading state: skeleton table rows while vaultDetails are fetching
- Page layout: filters at top, table below, compare button sticky at bottom or in header

## Review Checkpoints

1. After Step 1: Verify metrics computation is correct with unit tests
2. After Step 2: Verify beta values appear correctly (or N/A when no API key)
3. After Step 3: Visual review of table in browser; sorting and selection work
4. After Step 4: End-to-end flow: adjust filters, sort, select vaults, navigate to compare

## Test Strategy

- Every test tagged with `/** @req DIVE-NN */` comments before `it()` or `test()`
- Pure metric computation (`deep-dive.ts`): unit tests with known inputs/outputs
- Hook (`use-deep-dive-vaults.ts`): tested indirectly through component tests
- Table rendering: render tests with mock data, verify columns, sorting, checkbox selection
- Filter component: render tests for input changes, URL param updates
- Requirements with no automated test:
  - DIVE-11 (loading skeleton): visual only, verified in browser at checkpoint 3

## Rollback Plan

Each step is additive (new files only except nav-header.tsx in Step 4). To rollback:
1. Delete `src/app/deep-dive/`, `src/components/deep-dive/`, `src/lib/hooks/use-deep-dive-vaults.ts`, `src/lib/metrics/deep-dive.ts`
2. Revert the nav-header.tsx change
3. Delete test files under `__tests__/components/deep-dive/` and `__tests__/lib/metrics/deep-dive.test.ts`
