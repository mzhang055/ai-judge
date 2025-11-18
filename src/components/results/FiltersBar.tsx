/**
 * FiltersBar - Filter controls for evaluation results
 */

import { useState } from 'react';
import { Filter, ChevronDown } from 'lucide-react';
import type { Judge } from '../../types';
import type { QuestionInfo } from '../../services/queueService';

interface FiltersBarProps {
  judges: Judge[];
  questions: QuestionInfo[];
  selectedJudges: Set<string>;
  selectedQuestions: Set<string>;
  selectedVerdict: 'all' | 'pass' | 'fail' | 'inconclusive';
  selectedReviewStatus: 'all' | 'ai_only' | 'human_reviewed';
  selectedHumanVerdict:
    | 'all'
    | 'pass'
    | 'fail'
    | 'bad_data'
    | 'ambiguous_question'
    | 'insufficient_context';
  onToggleJudge: (judgeId: string) => void;
  onToggleQuestion: (questionId: string) => void;
  onVerdictChange: (verdict: 'all' | 'pass' | 'fail' | 'inconclusive') => void;
  onReviewStatusChange: (status: 'all' | 'ai_only' | 'human_reviewed') => void;
  onHumanVerdictChange: (
    verdict:
      | 'all'
      | 'pass'
      | 'fail'
      | 'bad_data'
      | 'ambiguous_question'
      | 'insufficient_context'
  ) => void;
  onClearFilters: () => void;
}

export function FiltersBar({
  judges,
  questions,
  selectedJudges,
  selectedQuestions,
  selectedVerdict,
  selectedReviewStatus,
  selectedHumanVerdict,
  onToggleJudge,
  onToggleQuestion,
  onVerdictChange,
  onReviewStatusChange,
  onHumanVerdictChange,
  onClearFilters,
}: FiltersBarProps) {
  const [showJudgeFilter, setShowJudgeFilter] = useState(false);
  const [showQuestionFilter, setShowQuestionFilter] = useState(false);

  const hasActiveFilters =
    selectedJudges.size > 0 ||
    selectedQuestions.size > 0 ||
    selectedVerdict !== 'all' ||
    selectedReviewStatus !== 'all' ||
    selectedHumanVerdict !== 'all';

  return (
    <div style={styles.filtersBar}>
      {/* Judge Filter */}
      <div style={styles.filterGroup}>
        <button
          style={styles.filterDropdownButton}
          onClick={() => setShowJudgeFilter(!showJudgeFilter)}
        >
          <Filter size={14} />
          <span>
            Judge{selectedJudges.size > 0 && `: ${selectedJudges.size}`}
          </span>
          <ChevronDown size={14} />
        </button>
        {showJudgeFilter && (
          <div style={styles.filterDropdown}>
            {judges.map((judge) => (
              <label key={judge.id} style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedJudges.has(judge.id)}
                  onChange={() => onToggleJudge(judge.id)}
                  style={styles.checkbox}
                />
                <span>{judge.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Question Filter */}
      <div style={styles.filterGroup}>
        <button
          style={styles.filterDropdownButton}
          onClick={() => setShowQuestionFilter(!showQuestionFilter)}
        >
          <Filter size={14} />
          <span>
            Question
            {selectedQuestions.size > 0 && `: ${selectedQuestions.size}`}
          </span>
          <ChevronDown size={14} />
        </button>
        {showQuestionFilter && (
          <div style={styles.filterDropdown}>
            {questions.map((question) => (
              <label key={question.id} style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedQuestions.has(question.id)}
                  onChange={() => onToggleQuestion(question.id)}
                  style={styles.checkbox}
                />
                <span style={styles.questionLabel}>
                  {question.text.length > 40
                    ? question.text.slice(0, 40) + '...'
                    : question.text}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* AI Verdict Filter */}
      <div style={styles.filterGroup}>
        <select
          style={styles.filterDropdownButton}
          value={selectedVerdict}
          onChange={(e) =>
            onVerdictChange(
              e.target.value as 'all' | 'pass' | 'fail' | 'inconclusive'
            )
          }
        >
          <option value="all">All AI Verdicts</option>
          <option value="pass">AI: Pass</option>
          <option value="fail">AI: Fail</option>
          <option value="inconclusive">AI: Inconclusive</option>
        </select>
      </div>

      {/* Review Status Filter */}
      <div style={styles.filterGroup}>
        <select
          style={styles.filterDropdownButton}
          value={selectedReviewStatus}
          onChange={(e) =>
            onReviewStatusChange(
              e.target.value as 'all' | 'ai_only' | 'human_reviewed'
            )
          }
        >
          <option value="all">All Items</option>
          <option value="ai_only">AI Only</option>
          <option value="human_reviewed">Human Reviewed</option>
        </select>
      </div>

      {/* Human Verdict Filter (only show if human_reviewed is selected) */}
      {selectedReviewStatus === 'human_reviewed' && (
        <div style={styles.filterGroup}>
          <select
            style={styles.filterDropdownButton}
            value={selectedHumanVerdict}
            onChange={(e) =>
              onHumanVerdictChange(
                e.target.value as
                  | 'all'
                  | 'pass'
                  | 'fail'
                  | 'bad_data'
                  | 'ambiguous_question'
                  | 'insufficient_context'
              )
            }
          >
            <option value="all">All Human Verdicts</option>
            <option value="pass">Human: Pass</option>
            <option value="fail">Human: Fail</option>
            <option value="bad_data">Human: Bad Data</option>
            <option value="ambiguous_question">
              Human: Ambiguous Question
            </option>
            <option value="insufficient_context">
              Human: Insufficient Context
            </option>
          </select>
        </div>
      )}

      {hasActiveFilters && (
        <button style={styles.clearFiltersButton} onClick={onClearFilters}>
          Clear filters
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  filtersBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    flexWrap: 'wrap' as const,
  },
  filterGroup: {
    position: 'relative',
  },
  filterDropdownButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 12px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#000',
    backgroundColor: '#fff',
    border: '1px solid #eaeaea',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
  },
  filterDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '4px',
    backgroundColor: '#fff',
    border: '1px solid #eaeaea',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
    padding: '6px',
    minWidth: '200px',
    maxHeight: '300px',
    overflowY: 'auto',
    zIndex: 10,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px',
    fontSize: '14px',
    color: '#000',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'background-color 0.12s ease',
  },
  checkbox: {
    cursor: 'pointer',
  },
  questionLabel: {
    flex: 1,
  },
  clearFiltersButton: {
    padding: '7px 12px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#666',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
  },
};
