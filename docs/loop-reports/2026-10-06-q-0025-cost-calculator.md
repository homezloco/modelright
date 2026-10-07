# Loop Report — q-0025 Cost Calculator

## Item & Acceptance
- **Item**: `q-0025 Cost calculator`
- **Acceptance**: test for cost calculation function with various token volumes (e.g., 1M input + 500k output = exact math check); interactive UI component rendered

## What Changed
- `src/lib/calculator.ts`: Pure cost calculation helper function computing input, output, per-call, and monthly costs for given token counts and prices.
- `tests/calculator.test.ts`: Vitest test suite checking math correctness (1M input + 500k output = exact math check), zero values, and edge inputs.
- `src/components/CostCalculator.tsx`: Interactive React client component for inputting token counts, request frequency, and prices with dynamic breakdown.
- `src/app/calculator/page.tsx`: Standalone `/calculator` page route for direct access.
- `src/app/models/[provider]/[slug]/page.tsx`: Embedded cost calculator on model detail pages pre-seeded with model pricing.
- `src/app/layout.tsx`: Added "Calculator" to primary navigation header.

## Verification
- Unit tests written in `tests/calculator.test.ts`. CI will verify via vitest and build checks.

## Remaining Gaps / Next Steps
- None for q-0025.
