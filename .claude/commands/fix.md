---
description: Fix issues, run tests, iterate until working
---

Fix and iterate on: $ARGUMENTS

## Systematic Process:

### 1. **Identify the Problem**
   - What's the expected behavior?
   - What's actually happening?
   - Read error messages and stack traces

### 2. **Reproduce Consistently**
   - Find minimal steps to trigger the issue
   - Note patterns (browser-specific, data-specific, etc.)

### 3. **Fix with Minimal Changes**
   - Make the smallest change that could work
   - Don't refactor while debugging
   - Add defensive checks if needed

### 4. **Run Tests**
   - Execute `npm test` or `npm run test:ui`
   - Check if tests pass now
   - Fix any new test failures

### 5. **Verify the Fix**
   - Test the original failure case
   - Test related functionality
   - Check for regressions
   - Test manually in browser

### 6. **Iterate if Needed**
   - If not fixed, try next hypothesis
   - If new issues appear, keep iterating
   - Continue until stable

## Common Issues to Check:
- Missing `await` on async operations
- Incorrect mock setup in tests
- Race conditions in async code
- Missing cleanup between tests
- Outdated snapshots
- Type errors
- Import errors

## Stop When:
- ✓ Original issue is resolved
- ✓ All tests pass
- ✓ No new issues introduced
- ✓ Code is clean
- ✓ Works in browser

## Report:
- What was broken
- Root cause found
- Changes made
- Test results (X/X passing)
- Current status
