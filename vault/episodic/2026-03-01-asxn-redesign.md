---
date: 2026-03-01
tags: [type/episodic, project/hyperliquid-vaults-dashboard]
project: Hyperliquid Vaults Dashboard
cwd: /Users/jelmerbos/hyperliquid-vaults-dashboard
---

# Hyperliquid Vaults Dashboard: ASXN-style redesign

## What happened
Full UI redesign to match ASXN HyperScreener layout. Added sidebar navigation, dark/light theme toggle, stat cards on home page, and integrated the actual Hyperliquid logo with exact brand colors sampled from the logo files. Also fixed a critical metrics bug and enhanced the Deep Dive page.

## Key decisions
- Used `next-themes` with `attribute="class"` for dark/light mode (Tailwind dark: variant)
- Sampled exact brand colors from logo PNGs using PIL: mint #97fce4 (dark mode), dark green #042720 (light mode)
- `accent-teal` CSS variable stays mint (#97fce4) in both themes (used for button backgrounds); dark green used for text/foreground in light mode
- `useSyncExternalStore` for recent vaults (localStorage-backed, avoids hydration mismatch)
- Kept SVG bowtie for small icon contexts (Trade on button), full wordmark PNG for sidebar/mobile brand
- Deep Dive search is client-side filter (no URL param), other filters persist in URL params

## Errors and workarounds
- `getServerSnapshot should be cached`: useSyncExternalStore infinite loop when returning new `[]` array. Fix: stable `const EMPTY: RecentVault[] = []` reference + cached snapshot.
- `Cannot access 'EMPTY' before initialization`: const temporal dead zone. Fix: moved declaration above all usages.
- Vault metrics showing 0.00%: `computeVaultMetrics` didn't strip leading near-zero entries from account value history. Fix: imported `stripLeadingZeros` from deep-dive module.

## Files created/modified
**New files:**
- `src/components/theme-provider.tsx`, `theme-toggle.tsx`, `sidebar.tsx`, `top-bar.tsx`, `stat-card.tsx`, `hl-logo.tsx`
- `src/lib/hooks/use-recent-vaults.ts`
- `public/hl-logo-dark.png`, `public/hl-logo-light.jpg`

**Modified:**
- `src/app/globals.css` (complete color system rewrite)
- `src/app/layout.tsx` (sidebar + theme provider layout)
- `src/app/page.tsx` (stat cards)
- `src/lib/metrics/index.ts` (stripLeadingZeros fix)
- `src/components/vault-detail/metrics-grid.tsx` (compact layout)
- `src/components/deep-dive/*` (search, leader stake, frozen columns)
- 10+ component files (color variable migration)

## Open items
- Vault detail page needs ASXN profile-style redesign
- Responsive/mobile testing needed
- Production deployment to Vercel
