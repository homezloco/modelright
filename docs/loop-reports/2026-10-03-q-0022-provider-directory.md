# Loop Report: q-0022 Fix Next.js 15 searchParams Type Check

- **Task**: q-0022 Provider directory (Fix CI run 37119933298)
- **Error**: `npm run typecheck` failed because Next.js 15 page component signatures require `searchParams` props to be `Promise<...>` and awaited before accessing properties.
- **Fix**: Updated `src/app/compare/page.tsx` and `src/app/models/page.tsx` to type `searchParams` as a `Promise` and await it in the async page functions before reading URL parameter properties.
