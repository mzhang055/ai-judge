---
description: Mark a task complete and update all docs
---

Mark task as complete: $ARGUMENTS

## Workflow:

### 1. **Verify Completion**
   - Feature works as expected
   - Tests are passing
   - No console errors
   - Code is clean and commented

### 2. **Update CLAUDE.md**
   - Mark task as [x] in "Current Progress"
   - Add any new files to "Key Files" section
   - Note architectural decisions made
   - Document any patterns established

### 3. **Update README.md**
   - Mark feature as complete in features list
   - Update setup instructions if needed
   - Add to "Time Spent" estimate
   - Document any trade-offs made

### 4. **Git Commit** (optional)
   - Stage relevant files
   - Write clear commit message
   - Follow conventional commits format

### 5. **Report Summary**
   - What was completed
   - Files created/modified
   - Next task to tackle
   - Any blockers or questions

## Example Usage:
```
/task-complete Data ingestion feature
/task-complete Judge CRUD UI
/task-complete Evaluation runner with OpenAI integration
```

This keeps your docs in sync and gives you a clear record of progress!
