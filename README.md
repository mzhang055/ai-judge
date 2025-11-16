# AI Judge

An AI-powered evaluation system that automatically reviews human annotations and provides pass/fail verdicts with reasoning.

## Overview

AI Judge is an internal annotation platform where AI judges automatically review human answers to questions (multiple-choice, single-choice, or free-form) and record verdicts with reasoning. Built with React 18, TypeScript, and Supabase.

## Features

### ✅ Completed
- **Data Ingestion (3.1)** - Upload and validate JSON submissions
  - Drag-and-drop file upload with visual feedback
  - Comprehensive JSON validation with detailed error messages
  - Automatic persistence to Supabase database
  - Clean, minimal UI
  - BeSimple branding integration

### 🚧 In Progress
- **AI Judge Definitions (3.2)** - CRUD interface for managing judges
- **Judge Assignment (3.3)** - Assign judges to questions
- **Evaluation Runner (3.4)** - Run AI evaluations with LLM APIs
- **Results View (3.5)** - View and filter evaluation results

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

3. **Configure environment variables**

   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Set up Supabase database**

   Run the following SQL in your Supabase SQL editor:
   ```sql
   -- Create submissions table
   CREATE TABLE submissions (
     id TEXT PRIMARY KEY,
     queue_id TEXT,
     labeling_task_id TEXT,
     created_at BIGINT,
     questions JSONB,
     answers JSONB,
     uploaded_at TIMESTAMP DEFAULT NOW()
   );

   -- Create judges table (for future use)
   CREATE TABLE judges (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     system_prompt TEXT NOT NULL,
     model_name TEXT NOT NULL,
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP DEFAULT NOW()
   );

   -- Create judge_assignments table (for future use)
   CREATE TABLE judge_assignments (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     queue_id TEXT NOT NULL,
     question_id TEXT NOT NULL,
     judge_id UUID REFERENCES judges(id),
     UNIQUE(queue_id, question_id, judge_id)
   );

   -- Create evaluations table (for future use)
   CREATE TABLE evaluations (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     submission_id TEXT REFERENCES submissions(id),
     question_id TEXT NOT NULL,
     judge_id UUID REFERENCES judges(id),
     judge_name TEXT NOT NULL,
     verdict TEXT CHECK (verdict IN ('pass', 'fail', 'inconclusive')),
     reasoning TEXT,
     created_at TIMESTAMP DEFAULT NOW()
   );
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
│   ├── assets/           # Static assets (logo, images)
│   ├── components/       # React components
│   │   └── FileUpload.tsx
│   ├── lib/             # Library initialization
│   │   └── supabase.ts
│   ├── services/        # Business logic services
│   │   └── submissionService.ts
│   ├── test/            # Test setup
│   │   └── setup.ts
│   ├── types/           # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx          # Main app component
│   ├── App.css          # Global styles
│   └── main.tsx         # App entry point
├── .env.local           # Environment variables (not in git)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Usage

### Uploading Submissions

1. Navigate to the app at [http://localhost:5173](http://localhost:5173)
2. Drag and drop a JSON file onto the upload area, or click to browse
3. The file will be validated and uploaded to Supabase automatically

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

A sample file (`sample-submissions.json`) is included in the project root for testing.

## Development Notes

### Trade-offs & Decisions

1. **Inline Styles vs CSS Modules**: Used inline styles for rapid development and to avoid CSS class naming conflicts. Can migrate to CSS modules or styled-components if needed.

2. **Client-side Validation**: Validates JSON structure before uploading to provide immediate feedback. Server-side validation should be added for production.

3. **Test Coverage**: Focused on component behavior and user interactions. Integration tests with actual Supabase can be added later.

4. **Error Handling**: Currently shows user-friendly error messages. Production should add error logging/monitoring (e.g., Sentry).

5. **File Size Limits**: No explicit file size limits currently. Should add limits for production to prevent abuse.

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

## Next Steps

1. **Judge CRUD (3.2)**: Build interface for creating and managing AI judges
2. **Judge Assignment (3.3)**: UI for assigning judges to questions
3. **Evaluation Runner (3.4)**: Implement LLM API integration and evaluation logic
4. **Results View (3.5)**: Display and filter evaluation results

## License

Internal project - All rights reserved

## Contact

For questions or issues, please contact the development team.
