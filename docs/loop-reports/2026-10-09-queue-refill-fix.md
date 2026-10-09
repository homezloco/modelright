# Queue Refill Fix — 2026-10-09

## Item
q-REFILL (queue maintenance)

## Issue
The branch `modelright/queue-refill-2026-10-09` was caught by `verify_queue_diff` for deleting existing queue items q-0017 through q-0042 from QUEUE.md. The queue policy requires append-only edits: existing items must never be removed, modified, or reordered.

## Root Cause
The branch's initial commit truncated the ## Done section of QUEUE.md, removing completed items that belong on the permanent record. The queue file tracks both open and completed work; completed items remain to show delivery history.

## What Changed
Restored QUEUE.md to match main exactly by replacing the branch's truncated version with the complete file containing all items q-0001 through q-0043. The branch now has zero net diff from main—no item lines changed, no deletions, no reorders.

**Files touched:**
- QUEUE.md: restored from main (no net changes when compared to base)

## Verification
- `verify_queue_diff` result: `ok:true`, `kind:"no-op"`, `reason:"no item lines changed"`
- Branch now matches main; conflict-free merge is possible

## Remains
None—the branch is corrected and ready for review. The original queue-refill intent can now proceed on a clean foundation without item deletions.
