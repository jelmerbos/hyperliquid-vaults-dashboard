# Plan: ASXN-Style Redesign

Date: 2026-03-01
Brainstorm: `docs/brainstorms/2026-03-01-asxn-redesign.md`
Approved approach: Full redesign with sidebar, ASXN color palette, dark/light toggle, stat cards

## Steps

### Step 1: Install next-themes and set up theme provider
- Files: `package.json`, `src/components/theme-provider.tsx` (NEW)
- What: Install `next-themes`. Create ThemeProvider wrapper using `next-themes` with `attribute="class"`, `defaultTheme="dark"`.
- Checkpoint: `npm run build` passes, no errors.

### Step 2: Update color palette in globals.css
- Files: `src/app/globals.css`
- What: Replace OKLch color variables with ASXN-matching hex values converted to OKLch. Dark theme colors: background `#0d1117`, card `#161b22`, border `#21262d`, accent/teal `#2dd4a0`, text `#e6edf3`, muted `#8b949e`. Light theme: invert appropriately (white bg, dark text, same teal accent). Add `--accent-teal` custom property for the teal accent. Update chart colors to match ASXN (greens, orange).
- Checkpoint: Colors visible in browser dev tools when toggling `.dark` class.

### Step 3: Update layout with ThemeProvider and sidebar structure
- Files: `src/app/layout.tsx`, `src/components/providers.tsx`
- What: Wrap app in ThemeProvider (inside Providers or alongside). Change body layout to flex row: sidebar (fixed 220px) + main content area. Add `suppressHydrationWarning` to `<html>` for next-themes. Set `className="dark"` as default.
- Checkpoint: Layout renders with sidebar space on left, content on right. `npm run build` passes.

### Step 4: Create sidebar component
- Files: `src/components/sidebar.tsx` (NEW)
- What: Create sidebar with:
  - Logo/brand at top ("HL Vaults" with Hyperliquid-style icon)
  - Navigation section with category headers ("Analytics") in uppercase muted text
  - Nav links: Vaults (home), Deep Dive, Compare
  - Active link has teal left border indicator (like ASXN)
  - "Recent Vaults" section showing last 5 viewed vaults from localStorage
  - Collapsible on mobile (hamburger button in top bar)
  - Use `usePathname()` for active state, `useEffect` for localStorage reads
- Checkpoint: Sidebar renders, links navigate correctly, active state shows teal indicator.

### Step 5: Create theme toggle component and update top bar
- Files: `src/components/theme-toggle.tsx` (NEW), `src/components/nav-header.tsx`
- What: Create sun/moon toggle button using lucide icons and `useTheme()` from next-themes. Transform nav-header into a slim top bar: remove nav links (moved to sidebar), keep brand on left (hidden on desktop since sidebar has it), add theme toggle on right. On mobile, add hamburger menu button that toggles sidebar visibility.
- Checkpoint: Theme toggles between light/dark. Top bar shows toggle. Mobile hamburger works.

### Step 6: Create stat cards and update home page
- Files: `src/components/stat-card.tsx` (NEW), `src/app/page.tsx`
- What: Create StatCard component matching ASXN style: small uppercase muted label, large bold value, minimal padding, subtle border. Update home page to show 4 stat cards in a grid above the vault table: Total Vaults, Total TVL, Avg APR, Top Vault APR. Compute stats from the existing `useVaults()` data. Remove old page header styling, match ASXN page title style.
- Checkpoint: Stats display correctly computed from live vault data. Visual match to ASXN stat card style.

### Step 7: Create recent vaults hook for sidebar
- Files: `src/lib/hooks/use-recent-vaults.ts` (NEW), `src/app/vaults/[address]/page.tsx`
- What: Create `useRecentVaults()` hook that reads/writes to localStorage. Stores last 5 visited vaults as `{address, name}[]`. On vault detail page load, add vault to recent list. Sidebar reads from this hook to display recent vault links.
- Checkpoint: Visit a vault detail page, sidebar shows it in "Recent" section. Persists across page navigations.

### Step 8: Update all page container styles
- Files: `src/app/page.tsx`, `src/app/vaults/[address]/page.tsx`, `src/app/deep-dive/page.tsx`, `src/app/compare/page.tsx`
- What: Remove `container mx-auto` from all pages (content area already constrained by sidebar layout). Update padding/margin to work within the sidebar layout. Ensure page titles match ASXN style (~24px bold, no subtitle or muted subtitle below). Update loading/error states to fit new layout.
- Checkpoint: All 4 pages render correctly within sidebar layout. No horizontal overflow. Responsive on mobile.

### Step 9: Polish card and table styles
- Files: `src/components/ui/card.tsx` (if needed), various component files
- What: Ensure all Card components match ASXN aesthetic: `#161b22` dark bg, `#21262d` border, rounded-lg. Check vault table, compare grid, deep dive table for consistent dark theme styling. Update Recharts chart colors to use teal/green palette. Ensure all text contrast meets accessibility standards in both themes.
- Checkpoint: Visual consistency across all pages. No broken styles in light or dark mode.

### Step 10: Build and smoke test
- Files: None (verification only)
- What: Run `npm run build` to catch any SSR/hydration issues (next-themes is common source). Run `npm run lint`. Manual check all 4 pages in both themes. Verify mobile responsiveness.
- Checkpoint: Clean build, clean lint, all pages functional in both themes.

## Review Checkpoints
1. After Step 3: Layout structure works, build passes
2. After Step 5: Theme toggle works, sidebar + top bar functional
3. After Step 8: All pages render in new layout
4. After Step 10: Final build + visual verification

## Test Strategy
No new unit tests required for this UI-only redesign. Existing tests should continue passing. The smoke test in Step 10 covers visual verification.

## Rollback Plan
All changes are in tracked files. `git stash` or `git checkout .` to revert. No database or API changes.
