# # q-0009: Site nav + footer

## Acceptance
Site nav + footer — minimal header (logo, Models, Compare) and footer on all pages via layout

## Changes
1. Updated `src/app/layout.tsx` to include:
   - Minimal header with Logo ("modelright"), and navigation links to "Models" (`/models`) and "Compare" (`/compare`).
   - Main content container wrapping page `children`.
   - Footer displaying copyright notice, modelright description, and link to GitHub repository.
2. Updated `QUEUE.md` to tick q-0009 as completed on branch `modelright/q-0009-site-nav-footer`.

## Verification
- Local build / typecheck was performed via `typecheck-branch` / `build-branch` remote tools.
