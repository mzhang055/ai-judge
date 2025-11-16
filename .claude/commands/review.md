---
description: Review code for quality, bugs, and improvements
---

Review the code in: $ARGUMENTS

Check for:

1. **TypeScript issues**
   - Any `any` types that should be specific?
   - Missing type definitions?
   - Type safety holes?

2. **React best practices**
   - Unnecessary re-renders?
   - Missing dependencies in useEffect?
   - Proper cleanup?
   - Key prop issues in lists?

3. **Error handling**
   - Are all errors caught?
   - User-friendly error messages?
   - Graceful degradation?

4. **Code quality**
   - Clear naming?
   - Small, focused functions?
   - DRY principles?
   - Comments where needed?

5. **Performance**
   - Expensive operations memoized?
   - Large lists virtualized?
   - Unnecessary data fetching?

6. **Security**
   - API keys exposed?
   - User input sanitized?
   - Injection vulnerabilities?

Provide specific suggestions with code examples for improvements.
