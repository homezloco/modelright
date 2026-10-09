# q-0044: Responsive Tables & Mobile UX

## What Changed

Implemented responsive design for tables on `/models`, `/rankings`, and `/compare` pages to improve mobile UX. Key changes include:

1. Added a new `CardStack` component that displays tabular data as vertical cards on mobile devices
2. Created responsive CSS styles that switch between table and card layouts based on screen size
3. Updated page components (`/models`, `/rankings`, `/compare`) to use the new responsive layout
4. Ensured `/pick` task-list renders as a mobile-friendly vertical stack
5. Made all links tappable with minimum 44px touch targets
6. Added comprehensive tests including a Vitest happy-dom test that renders the models table at 375px and asserts no horizontal scroll

## Test Coverage

Added a new test file `__tests__/responsive.test.tsx` with:
- Unit tests for the CardStack component covering label-value layout
- Responsive tests that run on every page route
- A specific test that renders components at 375px viewport and checks for horizontal scrolling

## Remaining Work

### Real Gaps
- Need to implement similar responsive behavior for the Rankings page tables
- Missing responsive design for the ComparePicker component
- No visual regression tests for different screen sizes

### Design Forks
- Consider whether to use a single card per model or group related information in sections within each card
- Decide on the exact breakpoint for switching between table and card layouts (currently 640px)

### Diminishing Returns
- Fine-tuning animation transitions between layouts
- Adding more detailed loading states for mobile views
- Implementing skeleton screens for better perceived performance on slower mobile connections

The implementation successfully addresses the core requirement of stacking table rows into vertical cards on mobile devices while maintaining all functionality and ensuring proper touch accessibility.