---
description: Build, test, and integrate a complete UI component
---

Build a complete UI component: $ARGUMENTS

## Process:

### 1. **Create the Component**
   - Build the React component with TypeScript
   - Add clear JSDoc comments explaining purpose and props
   - Include proper TypeScript prop interfaces
   - Handle loading, error, and empty states
   - Make it reusable and composable

### 2. **Create Test File**
   - Create `ComponentName.test.tsx` in same directory
   - Test basic rendering
   - Test user interactions (clicks, inputs, etc.)
   - Test different prop combinations
   - Test edge cases (empty data, errors, loading)
   - Mock any Supabase/API calls

### 3. **Run Tests & Iterate**
   - Run `npm test` to execute tests
   - Fix any failures
   - Re-run until all tests pass ✓
   - Ensure no warnings or errors

### 4. **Add to Demo Page**
   - Create or update a page to showcase the component
   - Show multiple variants:
     - **Default state** - Basic usage with typical data
     - **Loading state** - Show loading spinner/skeleton
     - **Empty state** - No data available
     - **Error state** - API error or validation error
     - **With data** - Populated with realistic data
     - **Edge cases** - Very long text, many items, etc.
   - Make it viewable at http://localhost:5173

### 5. **Verify in Browser**
   - Start dev server if not running
   - Navigate to the component demo page
   - Verify all variants render correctly
   - Test interactions manually
   - Check responsive behavior

## Component Checklist:
- [ ] TypeScript interfaces defined
- [ ] JSDoc comments added
- [ ] Handles all states (loading/error/empty/success)
- [ ] Test file created and passing
- [ ] Added to demo page with variants
- [ ] Viewable in browser
- [ ] Interactions work correctly

## Example variants to show:
```tsx
{/* Default */}
<ComponentName data={sampleData} />

{/* Loading */}
<ComponentName isLoading={true} />

{/* Empty */}
<ComponentName data={[]} />

{/* Error */}
<ComponentName error="Failed to load" />

{/* With many items */}
<ComponentName data={longList} />
```

Report when complete:
- Component location
- Test results (X/X passing)
- Demo page URL
- Any issues or trade-offs made
