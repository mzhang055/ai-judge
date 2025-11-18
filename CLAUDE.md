# AI Judge Project

## Overview
Building an AI-powered evaluation system that automatically reviews human annotations and provides pass/fail verdicts with reasoning.

**Purpose**: Internal annotation platform where AI judges automatically review human answers to questions (multiple-choice, single-choice, or free-form) and record verdicts with reasoning.

## Tech Stack
- React 18 + TypeScript + Vite
- Supabase (PostgreSQL backend)
- LLM Provider: OpenAI, Anthropic, or Gemini (configurable per judge)
- NO localStorage - all data must persist in Supabase

## Functional Requirements

### 3.1 Data Ingestion ✅ COMPLETED
- ✅ Accept JSON file upload (shape: array of submissions)
- ✅ Parse and validate submissions
- ✅ Persist to Supabase (not localStorage/memory)
- ✅ Each submission has: id, queueId, labelingTaskId, createdAt, questions[], answers{}
- ✅ Drag-and-drop support with visual feedback
- ✅ Comprehensive validation with detailed error messages

### 3.2 AI Judge Definitions ✅ COMPLETED
- ✅ CRUD interface for judges
- ✅ Each judge stores: name, system_prompt/rubric, target_model_name, is_active flag, prompt_config
- ✅ **Configurable prompt fields** - Control which data (question text, answer, metadata) is sent to LLM
- ✅ Must persist in Supabase and survive page reloads

### 3.3 Assigning Judges
- UI to select one or more judges per question within a queue
- Persist judge-to-question assignments in Supabase
- Must be fetchable by evaluation runner later

### 3.4 Running Evaluations
- "Run AI Judges" action on queue page
- Iterate submissions → for each question → call assigned judges
- Real LLM API calls (OpenAI/Anthropic/Gemini)
- Parse response for: verdict (pass/fail/inconclusive), reasoning
- Persist evaluation records to Supabase
- Show summary: planned/completed/failed counts
- Graceful error handling (timeouts, quota errors)

### 3.5 Results View
- List evaluations with: Submission, Question, Judge, Verdict, Reasoning, Created
- Filters: Judge (multi-select), Question (multi-select), Verdict
- Aggregate pass rate display: "42% pass of 120 evaluations"

## Database Schema (Supabase)

```sql
submissions (
  id TEXT PRIMARY KEY,
  queue_id TEXT,
  labeling_task_id TEXT,
  created_at BIGINT,
  questions JSONB,
  answers JSONB,
  uploaded_at TIMESTAMP
)

judges (
  id UUID PRIMARY KEY,
  name TEXT,
  system_prompt TEXT,
  model_name TEXT,
  is_active BOOLEAN,
  prompt_config JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

judge_assignments (
  id UUID PRIMARY KEY,
  queue_id TEXT,
  question_id TEXT,
  judge_id UUID → judges(id),
  UNIQUE(queue_id, question_id, judge_id)
)

evaluations (
  id UUID PRIMARY KEY,
  submission_id TEXT → submissions(id),
  question_id TEXT,
  judge_id UUID → judges(id),
  judge_name TEXT (denormalized for history),
  verdict TEXT CHECK ('pass'/'fail'/'inconclusive'),
  reasoning TEXT,
  created_at TIMESTAMP
)
```

## Sample Input JSON Structure

```json
[
  {
    "id": "sub_1",
    "queueId": "queue_1",
    "labelingTaskId": "task_1",
    "createdAt": 1690000000000,
    "questions": [
      {
        "rev": 1,
        "data": {
          "id": "q_template_1",
          "questionType": "single_choice_with_reasoning",
          "questionText": "Is the sky blue?"
        }
      }
    ],
    "answers": {
      "q_template_1": {
        "choice": "yes",
        "reasoning": "Observed on a clear day."
      }
    }
  }
]
```

## Key Files

### Completed (3.1 Data Ingestion)
- ✅ `src/types/index.ts` - TypeScript interfaces for Submission, Judge, Evaluation, ValidationResult
- ✅ `src/lib/supabase.ts` - Supabase client initialization
- ✅ `src/services/submissionService.ts` - Data ingestion & persistence with validation
- ✅ `src/components/FileUpload.tsx` - JSON file upload component with drag-and-drop
- ✅ `src/components/FileUpload.test.tsx` - Comprehensive test suite (9/9 passing)
- ✅ `src/App.tsx` - Main app with clean, minimal layout
- ✅ `src/App.css` - Styling with FigJam-style dotted background
- ✅ `src/assets/besimple-logo.png` - BeSimple branding logo

### To Be Implemented
- `src/lib/llm.ts` - LLM provider abstraction (OpenAI/Anthropic/Gemini)
- `src/services/judgeService.ts` - Judge CRUD operations
- `src/services/evaluationService.ts` - Run evaluations, call LLM APIs
- `src/pages/QueuePage.tsx` - View submissions, assign judges, run evaluations
- `src/pages/ResultsPage.tsx` - Filter and view evaluation results

## Evaluation Rubric (What Matters)
1. **Correctness** - All functional requirements met, no crashes
2. **Backend & LLM** - Clean persistence, proper LLM integration
3. **Code Quality** - Clear naming, small components, idiomatic React
4. **TypeScript** - Accurate types, minimal `any`
5. **UX & Polish** - Usable layout, sensible empty/loading states
6. **Judgment** - Clear reasoning for scope cuts or decisions

## Bonus Features (Optional)
- ✅ **File attachments** (screenshots, PDFs) forwarded to LLM API - IMPLEMENTED
- ✅ **Configurable prompt fields** (include/exclude question text, answers, metadata) - IMPLEMENTED
- Animated charts (pass-rate by judge)
- Other relevant features

## Deliverables
- Vite project with React 18 + TypeScript
- README with setup instructions
- Loom/GIF demo walkthrough
- Time spent estimate + trade-offs
- App runs on `npm run dev` → http://localhost:5173

## Development Workflow
- Start with data ingestion (3.1)
- Then judge CRUD (3.2)
- Then judge assignment UI (3.3)
- Then evaluation runner (3.4)
- Finally results view (3.5)

## Current Progress
- [x] Supabase setup with schema
- [x] Environment variables configured
- [x] Custom /review slash command created
- [x] Install React dependencies
- [x] **Data ingestion component (3.1) - COMPLETE**
  - [x] React 18 + TypeScript + Vite setup
  - [x] FileUpload component with drag-and-drop
  - [x] JSON validation with detailed error messages
  - [x] Supabase persistence (no localStorage)
  - [x] Comprehensive test suite (9/9 passing)
  - [x] Clean UI with BeSimple branding
  - [x] Lucide icons integration
- [x] **Judge CRUD (3.2) - COMPLETE**
  - [x] PromptConfigEditor component for field selection
  - [x] Category toggles and individual field controls
  - [x] Validation with toast notifications
  - [x] Comprehensive test suite (18/18 passing)
- [x] Assignment UI (3.3)
- [x] Evaluation runner (3.4)
- [x] Results view (3.5)
- [x] **Bonus: File attachments**
- [x] **Bonus: Configurable prompt fields**

## Architectural Decisions (3.1)
1. **Testing Strategy**: Vitest + React Testing Library for component tests
2. **Styling Approach**: Inline styles for rapid development; can migrate to CSS modules later
3. **File Validation**: Client-side validation before upload to provide immediate feedback
4. **Error Handling**: Granular error messages showing specific validation failures
5. **State Management**: React hooks (useState) - sufficient for current scope
6. **Type Safety**: Strict TypeScript with verbatimModuleSyntax enabled