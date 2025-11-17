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
  onToggleJudge: (judgeId: string) => void;
  onToggleQuestion: (questionId: string) => void;
  onVerdictChange: (verdict: 'all' | 'pass' | 'fail' | 'inconclusive') => void;
  onClearFilters: () => void;
}

export function FiltersBar({
  judges,
  questions,
  selectedJudges,
  selectedQuestions,
  selectedVerdict,
  onToggleJudge,
  onToggleQuestion,
  onVerdictChange,
  onClearFilters,
}: FiltersBarProps) {
  const [showJudgeFilter, setShowJudgeFilter] = useState(false);
  const [showQuestionFilter, setShowQuestionFilter] = useState(false);

  const hasActiveFilters =
    selectedJudges.size > 0 ||
    selectedQuestions.size > 0 ||
    selectedVerdict !== 'all';

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

      {/* Verdict Filter */}
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
          <option value="all">All Verdicts</option>
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
          <option value="inconclusive">Inconclusive</option>
        </select>
      </div>

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
