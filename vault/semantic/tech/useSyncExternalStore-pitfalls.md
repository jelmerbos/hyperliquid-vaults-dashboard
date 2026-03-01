---
date: 2026-03-01
tags: [type/semantic, tech/react]
source: direct experience
status: verified
---

# useSyncExternalStore pitfalls with localStorage

## Summary
React's `useSyncExternalStore` requires snapshot functions to return referentially stable values. Returning a new array/object on every call causes infinite re-renders.

## Key points
- `getServerSnapshot` must return a cached value; `return []` creates a new reference each call, triggering infinite loops
- Use a module-level constant for empty states: `const EMPTY: T[] = []`
- Cache the parsed result and only update when the raw string changes: compare `localStorage.getItem()` against a `cachedRaw` variable
- `const` declarations have a temporal dead zone in JS; if the constant is referenced before its declaration line, you get `ReferenceError: Cannot access 'X' before initialization`
- Always declare module-level constants at the top of the file, before any function that references them
