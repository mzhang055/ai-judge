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
│   │   └── JudgeForm.tsx
│   ├── lib/                # Library initialization
│   │   ├── supabase.ts
│   │   ├── llm.ts
│   │   └── errors.ts
│   ├── pages/              # Page components
│   │   ├── QueuesPage.tsx
│   │   ├── QueuePage.tsx
│   │   ├── JudgesPage.tsx
│   │   └── ResultsPage.tsx
│   ├── services/           # Business logic services
│   │   ├── submissionService.ts
│   │   ├── judgeService.ts
│   │   ├── judgeAssignmentService.ts
│   │   ├── queueService.ts
│   │   └── evaluationService.ts
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

## Future Enhancements

Potential improvements for production use:

1. **File Attachments**: Forward screenshots/PDFs to LLM API for visual evaluation
2. **Configurable Prompts**: Template fields for including/excluding specific data
3. **Export Functionality**: CSV/JSON export for evaluation results
4. **Advanced Analytics**: Charts and graphs for pass rates over time
5. **User Authentication**: Role-based access control
6. **Audit Logs**: Track all user actions for compliance
7. **Bulk Operations**: Import/export judges, bulk edit assignments
8. **API Endpoints**: REST API for programmatic access
9. **Webhooks**: Notifications when evaluations complete
10. **Multi-LLM Support**: Switch between OpenAI, Anthropic, Gemini per judge

## License

Internal project - All rights reserved

## Contact

For questions or issues, please contact the development team.
