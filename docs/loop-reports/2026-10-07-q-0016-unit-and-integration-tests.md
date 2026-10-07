# Loop Report: q-0016 Unit & integration tests

## Item Details
- **ID**: `q-0016`
- **Title**: Unit & integration tests
- **Acceptance**: `npm run test` passes with >=80% line coverage on src/app/api and src/lib

## Findings & Status
- **Needs Decision**: Vitest framework dependencies (`vitest`, `@vitest/coverage-v8`, `@testing-library/react`, etc.) are not present in `package.json`.
- Per the loop instructions: "Before writing a test, read package.json and use ONLY a test runner and libraries already in its dependencies/devDependencies — never import a package that isn't installed... If the item's acceptance needs a runner the repo lacks, adding it to package.json is part of the diff — and a manifest change parks for a human, so say so in the report."
- Consequently, this branch is parked as `q-0016: NEEDS DECISION — Vitest test setup requires package dependency additions and lockfile refresh`.

## Remaining & Next Steps
- A human engineer needs to decide on adding test dependencies to `package.json` and refreshing `package-lock.json`.
