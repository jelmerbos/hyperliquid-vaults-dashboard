# ASXN-Style Redesign Brainstorm

**Date:** 2026-03-01
**Goal:** Redesign the Hyperliquid vaults dashboard to match the ASXN Hyperscreener layout and aesthetic.

## User Decisions

- **Sidebar:** Current 3 pages + recently viewed vault quick links
- **Theme:** Dark + light toggle (dark default)
- **Home stats:** Vault ecosystem stats (Total Vaults, Total TVL, Avg APR, Top Vault APR)

## Design Reference (from screenshot)

### Colors (ASXN dark theme)
- Page background: `#0d1117` (very dark blue-black)
- Card background: `#161b22` (slightly lighter)
- Card border: `#21262d` (subtle gray border)
- Sidebar background: `#0d1117` (same as page)
- Sidebar category text: `#8b949e` (muted gray)
- Sidebar active indicator: teal left border
- Accent/teal: `#2dd4a0` (primary accent for active states, charts)
- Text primary: `#e6edf3` (near-white)
- Text secondary: `#8b949e` (muted gray)
- Chart green bars: `#2ea67a` / `#3fb68b`
- Chart orange line: `#f0883e`

### Typography
- Clean sans-serif (Inter-like, Geist works well)
- Page titles: ~24px bold
- Stat labels: ~12px uppercase muted
- Stat values: ~28px bold
- Nav items: ~14px regular
- Category headers: ~11px uppercase muted, letter-spacing

### Layout
- Sidebar: ~220px fixed width, collapsible
- Top bar: logo left, theme toggle + CTA right, ~56px height
- Content area: padded, max-width container
- Stat cards: 4-column grid, minimal padding
- Chart cards: bordered, rounded-lg, internal padding

## Approach

### Files to Change

| File | Change |
|------|--------|
| `src/app/globals.css` | New color variables for ASXN dark/light theme |
| `src/app/layout.tsx` | Sidebar layout wrapper, remove NavHeader from here |
| `src/components/nav-header.tsx` | Replace with top bar (logo, theme toggle) |
| `src/components/sidebar.tsx` | **NEW** - Sidebar navigation with categories + recent vaults |
| `src/components/theme-toggle.tsx` | **NEW** - Dark/light mode toggle button |
| `src/components/theme-provider.tsx` | **NEW** - next-themes provider |
| `src/components/stat-card.tsx` | **NEW** - Stat card component for home page |
| `src/app/page.tsx` | Add stat cards grid above vault table |
| All page files | Update container styles for sidebar layout |

### Dependencies
- `next-themes` for dark/light mode toggle

### Edge Cases
- Sidebar collapse on mobile (hamburger menu)
- Recently viewed vaults: stored in localStorage, max 5-8
- Theme persistence across sessions (next-themes handles this)
- Sidebar should not overlap content on desktop

## Recommendation

Full redesign with sidebar layout, ASXN color palette, dark/light toggle, and stat cards. Estimated ~10 files touched. Use next-themes for theme management. Store recent vaults in localStorage.
