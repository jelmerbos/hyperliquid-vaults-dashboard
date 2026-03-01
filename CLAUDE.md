# Hyperliquid Vaults Dashboard

## What This Is

Next.js analytics dashboard for Hyperliquid vaults. Shows risk-adjusted performance metrics, vault comparisons, and historical charts.

## Stack

- Next.js 16 (App Router), React 19, TypeScript (strict)
- TanStack Query (data fetching), TanStack Table (vault listing)
- Recharts (charts), shadcn/ui + Radix (components), Tailwind CSS 4
- Vitest + Testing Library + happy-dom (testing)

## Project Structure

```
src/
  app/                    # Pages and API routes
    page.tsx              # Home: vault listing table
    vaults/[address]/     # Vault detail page (metrics + charts)
    compare/              # Compare 2-4 vaults side-by-side
    api/vaults/           # Proxy routes to Hyperliquid API
  components/
    ui/                   # shadcn/ui primitives
    vault-table/          # Listing table (search, filter, sort)
    vault-detail/         # Detail page components (header, metrics, charts)
    compare/              # Comparison selector, grid, charts
    nav-header.tsx        # Top navigation
    providers.tsx         # TanStack Query provider
  lib/
    api/client.ts         # API fetch wrappers
    api/types.ts          # TypeScript interfaces
    hooks/                # React Query hooks (use-vaults, use-vault-details)
    metrics/              # Risk-adjusted metric calculations
      returns.ts          # PnL, cumulative return, annualized return, daily returns
      risk.ts             # Max drawdown, drawdown series, volatility
      risk-adjusted.ts    # Sharpe ratio, ROMAD
    utils/format.ts       # Currency, percent, date formatters
__tests/                  # Test files mirror src/lib structure
```

## Commands

```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint
npx vitest               # Run tests
npx vitest --run         # Run tests once (CI mode)
```

## External APIs

- `https://stats-data.hyperliquid.xyz/Mainnet/vaults` - GET vault list
- `https://api.hyperliquid.xyz/info` - POST vault details (body: `{type: "vaultDetails", vaultAddress}`)
- `https://pro-api.coingecko.com/api/v3/coins/{id}/market_chart/range` - GET benchmark prices (BTC/HYPE). Requires `COINGECKO_API_KEY`.
- Claude API via `@anthropic-ai/sdk` - strategy classification, DD memos, chat. Requires `ANTHROPIC_API_KEY`.

API routes in `src/app/api/` proxy these to avoid CORS issues and protect API keys.

## Key Patterns

- All data fetching via React Query hooks (no server actions)
- Metrics computed client-side from portfolio snapshots (see `src/lib/metrics/`)
- Compare page uses URL params for vault selection (`/compare?vaults=0xabc,0xdef`)
- API errors use custom `ApiError` class with status codes
- Components use composition; shadcn/ui for UI primitives

## Testing

Tests live in `__tests__/` and cover metrics calculations and API client logic. Run with `npx vitest`. Config in `vitest.config.ts` (happy-dom environment, `@` path alias).

## Conventions

- Follow existing component patterns (see `src/components/vault-detail/` for reference)
- Types go in `src/lib/api/types.ts`
- New metrics go in the appropriate file under `src/lib/metrics/`
- Format helpers go in `src/lib/utils/format.ts`
