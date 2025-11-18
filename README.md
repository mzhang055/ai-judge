# AI Judge

An AI-powered evaluation system that automatically reviews human annotations and provides pass/fail verdicts with reasoning.

## Overview

AI Judge is an internal annotation platform where AI judges automatically review human answers to questions (multiple-choice, single-choice, or free-form) and record verdicts with reasoning. Built with React 18, TypeScript, and Supabase.

## Features

### ✅ All Features Completed!

- **Data Ingestion (3.1)** - Upload and validate JSON submissions
  - Drag-and-drop file upload with visual feedback
  - Comprehensive JSON validation with detailed error messages
  - Automatic persistence to Supabase database
  - Clean, minimal UI

- **AI Judge Definitions (3.2)** - CRUD interface for managing judges
  - Create, edit, and delete AI judges
  - Configure system prompts and rubrics
  - **Configurable prompt fields** - Choose which data (question text, answer, metadata) to include in LLM prompts
  - Toggle active/inactive status
  - Persistent storage in Supabase

- **Judge Assignment (3.3)** - Assign judges to questions
  - Multi-select interface for assigning judges to questions
  - Visual feedback for assignments
  - Queue-based organization
  - Persistent assignments in Supabase

- **Evaluation Runner (3.4)** - Run AI evaluations with LLM APIs
  - Real-time LLM API calls (OpenAI GPT-5o-mini)
  - Parallel batch processing for efficiency
  - Progress tracking with visual feedback
  - Graceful error handling (timeouts, rate limits, quota errors)
  - Automatic verdict parsing (pass/fail/inconclusive)

- **Results View (3.5)** - View and filter evaluation results
  - Comprehensive evaluation listing
  - Multi-select filters (Judge, Question, Verdict)
  - Aggregate pass rate display
  - Sortable, filterable results table
  - Detailed reasoning for each evaluation

- **Human Review Queue (3.6)** - Review inconclusive AI verdicts
  - Auto-flagged inconclusive evaluations
  - Priority-based review queue (high/medium/low)
  - Full submission context in review modal
  - Human verdict options: Pass, Fail, or categorized bad data
  - Reviewer name and notes tracking
  - Stats dashboard (pending/in-progress/completed)

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL)
- **Testing**: Vitest, React Testing Library
- **Icons**: Lucide React
- **LLM Providers**: OpenAI, Anthropic, Gemini (configurable)

## Setup Instructions

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account and project

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ai-judge
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up the database**

   Run the SQL schema setup in your Supabase project:
   - Go to Supabase Dashboard → SQL Editor
   - Copy the complete SQL from [`DATABASE_SETUP.md`](./DATABASE_SETUP.md)
   - Paste and run in the SQL Editor
   - Verify with the provided verification queries

4. **Configure environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_OPENAI_API_KEY=your_openai_api_key
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

   Open [http://localhost:5173](http://localhost:5173) in your browser.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run test suite
- `npm run type-check` - Check TypeScript types
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

## Project Structure

```
ai-judge/
├── src/
│   ├── assets/              # Static assets (logo, images)
│   ├── components/          # React components
│   │   ├── FileUpload.tsx
│   │   ├── JudgeAssignment.tsx
│   │   ├── JudgeForm.tsx
│   │   └── ReviewModal.tsx
│   ├── lib/                # Library initialization
│   │   ├── supabase.ts
│   │   ├── llm.ts
│   │   └── errors.ts
│   ├── pages/              # Page components
│   │   ├── QueuesPage.tsx
│   │   ├── QueuePage.tsx
│   │   ├── JudgesPage.tsx
│   │   ├── ResultsPage.tsx
│   │   └── HumanReviewQueue.tsx
│   ├── services/           # Business logic services
│   │   ├── submissionService.ts
│   │   ├── judgeService.ts
│   │   ├── judgeAssignmentService.ts
│   │   ├── queueService.ts
│   │   ├── evaluationService.ts
│   │   └── humanReviewService.ts
│   ├── test/               # Test setup
│   │   └── setup.ts
│   ├── types/              # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx             # Main app component
│   ├── App.css             # Global styles
│   └── main.tsx            # App entry point
├── .env.local              # Environment variables (not in git)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Usage

### Complete Workflow

#### 1. Upload Submissions
1. Navigate to the app at [http://localhost:5173](http://localhost:5173)
2. Drag and drop a JSON file onto the upload area, or click to browse
3. The file will be validated and uploaded to Supabase automatically
4. You'll be redirected to the Queues page

#### 2. Manage AI Judges
1. Click "Manage Judges" from the navigation or queue page
2. Create new judges by clicking "Add Judge"
3. Configure each judge with:
   - Name (e.g., "Grammar Judge", "Accuracy Judge")
   - System prompt/rubric for evaluation
   - **Prompt field configuration** - Select which data fields to include in evaluation prompts:
     - Question fields (question text, question type)
     - Answer fields
     - Metadata (queue ID, labeling task ID, timestamps)
   - Active/inactive status
4. Edit or delete judges as needed

#### 3. Assign Judges to Questions
1. Navigate to a queue from the Queues page
2. For each question in the queue, select which judges should evaluate it
3. You can assign multiple judges to the same question
4. All assignments are saved automatically

#### 4. Run Evaluations
1. On the queue page, click "Run AI Judges"
2. Watch the real-time progress as evaluations run
3. The system will:
   - Call the LLM API for each submission/question/judge combination
   - Parse verdicts (pass/fail/inconclusive)
   - Extract reasoning from AI responses
   - Handle errors gracefully (timeouts, rate limits, etc.)
4. View the completion summary when finished

#### 5. View Results
1. Click "View Results" from the queue page
2. See aggregate pass rate at the top
3. Filter results by:
   - Judge (multi-select)
   - Question (multi-select)
   - Verdict (pass/fail/inconclusive/all)
4. Review detailed reasoning for each evaluation
5. Export or analyze the data as needed

#### 6. Human Review Queue (for inconclusive verdicts)
1. When AI judges return "inconclusive" verdicts, they're automatically added to the review queue
2. Click "Human Review Queue" from the Queues page
3. View stats dashboard (pending/in-progress/completed counts)
4. Filter by queue ID or status
5. Click "Review Now" on any item to open the review modal
6. Review the submission with full context:
   - Question text and type
   - Human's answer
   - AI judge's verdict and reasoning
7. Make your decision:
   - **Pass** - Override AI to passing
   - **Fail** - Override AI to failing
   - **Mark as Bad Data** - Categorize the issue (ambiguous question, insufficient context, corrupted data, etc.)
8. Enter your name and reasoning notes
9. Submit - the item is marked complete and removed from pending queue

### Expected JSON Format

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

A sample file (`sample-submissions.json`) is included in the project root for testing

## Development Notes

### Trade-offs & Decisions

1. **Inline Styles vs CSS Modules**: Used inline styles for rapid development and to avoid CSS class naming conflicts. Can migrate to CSS modules or styled-components if needed.

2. **Client-side Validation**: Validates JSON structure before uploading to provide immediate feedback. Server-side validation should be added for production.

3. **Test Coverage**: Focused on component behavior and user interactions. Integration tests with actual Supabase can be added later.

4. **Error Handling**: Currently shows user-friendly error messages. Production should add error logging/monitoring (e.g., Sentry).

5. **File Size Limits**: No explicit file size limits currently. Should add limits for production to prevent abuse.

6. **LLM Provider**: Currently uses OpenAI GPT-5o-mini. The architecture supports Anthropic and Gemini but would require API key configuration.

7. **Parallel Processing**: Evaluations run in batches of 10 to optimize performance while respecting API rate limits.

8. **Real-time Updates**: Progress tracking uses React state updates for smooth UX during long-running evaluations.

9. **Data Denormalization**: Judge names are stored in evaluations for historical accuracy (in case judge names change later).

10. **Filter Dropdowns**: Implemented with absolute positioning for optimal UX without requiring additional libraries.

## Testing

The project includes comprehensive unit tests for the FileUpload component:

```bash
npm test
```

**Test Coverage (9/9 passing)**:
- ✅ Initial render state
- ✅ File type validation
- ✅ JSON parsing and validation
- ✅ Successful upload flow
- ✅ Error handling
- ✅ User interactions
- ✅ Component states

## Key Features Highlights

### Complete End-to-End Workflow
- Upload submissions → Manage judges → Assign to questions → Run evaluations → View results
- All data persists in Supabase (no localStorage usage)
- Fully functional with real LLM API integration

### Performance Optimizations
- Parallel batch processing (10 evaluations at a time)
- Real-time progress tracking with visual feedback
- Efficient database queries with proper indexing

### User Experience
- Clean, minimal UI with BeSimple branding
- Drag-and-drop file upload
- Multi-select filters for results
- Responsive design for various screen sizes
- Visual feedback for all user actions

### Error Handling
- Graceful LLM API error handling (timeouts, rate limits, quotas)
- Detailed validation messages
- Failed evaluations saved with error reasoning
- User-friendly error displays

### Results & Analytics
- Aggregate pass rate calculation
- Flexible filtering (by judge, question, verdict)
- Detailed reasoning for each evaluation
- Historical data preservation

## Bonus Features

### File Attachments

**Feature**: Upload images and PDFs alongside submissions for multimodal AI evaluation.

**How it works**:
1. When uploading submissions JSON, you can attach files (images/PDFs) to each submission
2. Files are stored in Supabase Storage
3. When AI judges evaluate submissions, image attachments are sent to the LLM API
4. The AI can visually verify human annotations (e.g., "Is the sky blue in this photo?")

**Setup**:
1. File attachment support is included in the main database schema in `DATABASE_SETUP.md`
2. Follow the "File Attachments Support" section in DATABASE_SETUP.md to enable this feature
3. Supported formats: PNG, JPG, GIF, WEBP, PDF (max 50MB each)
4. During JSON upload preview, click "Add Files" for each submission

**Use cases**:
- UI/design review tasks (verify annotations on screenshots)
- Image labeling QA (verify object counts/labels are accurate)
- Document analysis (verify extracted information from PDFs)
- OCR/transcription verification

**Technical details**:
- Files stored in Supabase Storage bucket: `submission-attachments`
- Images sent as signed URLs to LLM API (GPT5-mini)
- Attachment metadata stored in `submissions.attachments` JSONB column

### Configurable Prompt Fields

**Feature**: Control which data fields are included in evaluation prompts sent to AI judges.

**How it works**:
1. When creating/editing a judge, configure which fields to include in prompts:
   - Question text, question type
   - Answer data
   - Submission metadata (queue ID, labeling task ID, timestamps)
2. The evaluation service builds prompts based on your configuration
3. AI judges only see the data you've selected

**Use cases**:
- **Blind evaluation**: Exclude metadata to prevent bias
- **Answer-only grading**: Evaluate answers without question context
- **Minimal context**: Reduce token usage by excluding unnecessary fields
- **Custom workflows**: Tailor evaluation context for specific use cases

**Technical details**:
- Configuration stored in `judges.prompt_config` JSONB column
- UI provides category toggles and individual field controls
- Defaults to all fields enabled for backward compatibility
- At least one field must be selected (enforced by validation)

### Human Review Queue

**Feature**: Automatically flag inconclusive AI verdicts for human review with full workflow support.

**How it works**:
1. When an AI judge returns verdict "inconclusive", a database trigger automatically:
   - Sets `requires_human_review = true` on the evaluation
   - Adds the item to the `human_review_queue` table
2. Navigate to the Human Review Queue page to see all pending reviews
3. Review each item with full context (question, answer, AI reasoning)
4. Make a final decision and provide your reasoning
5. The evaluation is updated with your human verdict and marked as completed

**Human verdict options**:
- **pass** - Override AI to mark as passing
- **fail** - Override AI to mark as failing
- **bad_data** - General data quality issue
- **ambiguous_question** - Question is unclear/poorly written
- **insufficient_context** - Answer lacks necessary information

**Use cases**:
- **Quality control**: Handle edge cases AI can't confidently judge
- **Data quality**: Identify and categorize bad/ambiguous data
- **Judge calibration**: Track which judges produce too many inconclusive verdicts
- **Audit trail**: Full history of human decisions with reviewer names and timestamps

**Technical details**:
- Two-trigger system (BEFORE + AFTER) to avoid foreign key violations
- `complete_human_review()` database function for atomic updates
- `human_review_queue_with_context` view for efficient querying
- Priority levels (high/medium/low) for review urgency
- Status tracking (pending/in_progress/completed)
- See `DATABASE_SETUP.md` for complete schema and setup instructions