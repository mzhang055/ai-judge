/**
 * ResultsPage - Display and filter evaluation results
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  Filter,
  CheckCircle,
  XCircle,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { getEvaluationsForQueue } from '../services/evaluationService';
import { getQueueQuestions } from '../services/queueService';
import { listJudges } from '../services/judgeService';
import { getErrorMessage } from '../lib/errors';
import type { Evaluation, Judge } from '../types';
import type { QuestionInfo } from '../services/queueService';

export function ResultsPage() {
  const { queueId } = useParams<{ queueId: string }>();
  const navigate = useNavigate();

  // Data states
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [questions, setQuestions] = useState<QuestionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedJudges, setSelectedJudges] = useState<Set<string>>(new Set());
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [selectedVerdict, setSelectedVerdict] = useState<
    'all' | 'pass' | 'fail' | 'inconclusive'
  >('all');

  // UI states
  const [showJudgeFilter, setShowJudgeFilter] = useState(false);
  const [showQuestionFilter, setShowQuestionFilter] = useState(false);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!queueId) return;

      try {
        setLoading(true);
        setError(null);

        const [evaluationsData, judgesData, questionsData] = await Promise.all([
          getEvaluationsForQueue(queueId),
          listJudges(),
          getQueueQuestions(queueId),
        ]);

        setEvaluations(evaluationsData);
        setJudges(judgesData);
        setQuestions(questionsData);
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load evaluation results'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [queueId]);

  // Filter evaluations
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((evaluation) => {
      // Filter by judge
      if (selectedJudges.size > 0 && !selectedJudges.has(evaluation.judge_id)) {
        return false;
      }

      // Filter by question
      if (
        selectedQuestions.size > 0 &&
        !selectedQuestions.has(evaluation.question_id)
      ) {
        return false;
      }

      // Filter by verdict
      if (selectedVerdict !== 'all' && evaluation.verdict !== selectedVerdict) {
        return false;
      }

      return true;
    });
  }, [evaluations, selectedJudges, selectedQuestions, selectedVerdict]);

  // Calculate pass rate
  const passRate = useMemo(() => {
    if (filteredEvaluations.length === 0) return 0;
    const passCount = filteredEvaluations.filter(
      (e) => e.verdict === 'pass'
    ).length;
    return Math.round((passCount / filteredEvaluations.length) * 100);
  }, [filteredEvaluations]);

  // Toggle filter selections
  const toggleJudgeFilter = (judgeId: string) => {
    setSelectedJudges((prev) => {
      const next = new Set(prev);
      if (next.has(judgeId)) {
        next.delete(judgeId);
      } else {
        next.add(judgeId);
      }
      return next;
    });
  };

  const toggleQuestionFilter = (questionId: string) => {
    setSelectedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const clearAllFilters = () => {
    setSelectedJudges(new Set());
    setSelectedQuestions(new Set());
    setSelectedVerdict('all');
  };

  const hasActiveFilters =
    selectedJudges.size > 0 ||
    selectedQuestions.size > 0 ||
    selectedVerdict !== 'all';

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading evaluation results...</p>
      </div>
    );
  }

  if (!queueId) {
    return (
      <div style={styles.container}>
        <p>Queue not found</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Error Banner */}
      {error && (
        <div style={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <button
          style={styles.backButton}
          onClick={() => navigate(`/queues/${queueId}`)}
        >
          <ArrowLeft size={16} />
          <span>Back to Queue</span>
        </button>

        <div style={styles.titleSection}>
          <h1 style={styles.title}>Evaluation Results</h1>
          <p style={styles.subtitle}>Queue: {queueId}</p>
        </div>

        {/* Pass Rate Display */}
        <div style={styles.passRateCard}>
          <div style={styles.passRateValue}>{passRate}%</div>
          <div style={styles.passRateLabel}>
            Pass Rate ({filteredEvaluations.length} evaluation
            {filteredEvaluations.length !== 1 ? 's' : ''})
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filtersSection}>
        <div style={styles.filtersHeader}>
          <div style={styles.filtersTitle}>
            <Filter size={16} />
            <span>Filters</span>
          </div>
          {hasActiveFilters && (
            <button style={styles.clearButton} onClick={clearAllFilters}>
              Clear all
            </button>
          )}
        </div>

        <div style={styles.filtersRow}>
          {/* Judge Filter */}
          <div style={styles.filterGroup}>
            <button
              style={styles.filterButton}
              onClick={() => setShowJudgeFilter(!showJudgeFilter)}
            >
              <span>
                Judge
                {selectedJudges.size > 0 && ` (${selectedJudges.size})`}
              </span>
              <ChevronDown
                size={16}
                style={{
                  transform: showJudgeFilter ? 'rotate(180deg)' : 'rotate(0)',
                  transition: 'transform 0.2s',
                }}
              />
            </button>
            {showJudgeFilter && (
              <div style={styles.filterDropdown}>
                {judges.map((judge) => (
                  <label key={judge.id} style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={selectedJudges.has(judge.id)}
                      onChange={() => toggleJudgeFilter(judge.id)}
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
              style={styles.filterButton}
              onClick={() => setShowQuestionFilter(!showQuestionFilter)}
            >
              <span>
                Question
                {selectedQuestions.size > 0 && ` (${selectedQuestions.size})`}
              </span>
              <ChevronDown
                size={16}
                style={{
                  transform: showQuestionFilter
                    ? 'rotate(180deg)'
                    : 'rotate(0)',
                  transition: 'transform 0.2s',
                }}
              />
            </button>
            {showQuestionFilter && (
              <div style={styles.filterDropdown}>
                {questions.map((question) => (
                  <label key={question.id} style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={selectedQuestions.has(question.id)}
                      onChange={() => toggleQuestionFilter(question.id)}
                      style={styles.checkbox}
                    />
                    <span style={styles.questionLabel}>
                      {question.text.length > 50
                        ? question.text.slice(0, 50) + '...'
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
              style={styles.verdictSelect}
              value={selectedVerdict}
              onChange={(e) =>
                setSelectedVerdict(
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
        </div>
      </div>

      {/* Results Table */}
      {filteredEvaluations.length === 0 ? (
        <div style={styles.emptyState}>
          {evaluations.length === 0 ? (
            <p>No evaluations found. Run AI judges to generate results.</p>
          ) : (
            <p>No evaluations match the selected filters.</p>
          )}
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Submission</th>
                <th style={styles.th}>Question</th>
                <th style={styles.th}>Judge</th>
                <th style={styles.th}>Verdict</th>
                <th style={styles.th}>Reasoning</th>
                <th style={styles.th}>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvaluations.map((evaluation) => (
                <tr key={evaluation.id} style={styles.tr}>
                  <td style={styles.td}>
                    <code style={styles.code}>{evaluation.submission_id}</code>
                  </td>
                  <td style={styles.td}>
                    <code style={styles.code}>{evaluation.question_id}</code>
                  </td>
                  <td style={styles.td}>{evaluation.judge_name}</td>
                  <td style={styles.td}>
                    <VerdictBadge verdict={evaluation.verdict} />
                  </td>
                  <td style={styles.td}>
                    <div style={styles.reasoning}>{evaluation.reasoning}</div>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.timestamp}>
                      {new Date(evaluation.created_at).toLocaleDateString()}
                      <br />
                      {new Date(evaluation.created_at).toLocaleTimeString()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Verdict Badge Component
function VerdictBadge({ verdict }: { verdict: string }) {
  const getVerdictStyle = () => {
    switch (verdict) {
      case 'pass':
        return {
          color: '#10b981',
          backgroundColor: '#d1fae5',
          icon: <CheckCircle size={14} />,
        };
      case 'fail':
        return {
          color: '#ef4444',
          backgroundColor: '#fee2e2',
          icon: <XCircle size={14} />,
        };
      case 'inconclusive':
        return {
          color: '#f59e0b',
          backgroundColor: '#fef3c7',
          icon: <HelpCircle size={14} />,
        };
      default:
        return {
          color: '#6b7280',
          backgroundColor: '#f3f4f6',
          icon: <HelpCircle size={14} />,
        };
    }
  };

  const { color, backgroundColor, icon } = getVerdictStyle();

  return (
    <div
      style={{
        ...styles.badge,
        color,
        backgroundColor,
      }}
    >
      {icon}
      <span style={{ textTransform: 'capitalize' }}>{verdict}</span>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px 40px',
  },
  loadingContainer: {
    padding: '48px',
    textAlign: 'center',
    color: '#6b7280',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '8px',
    marginBottom: '24px',
    fontSize: '14px',
  },
  header: {
    marginBottom: '32px',
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    marginBottom: '16px',
    transition: 'background-color 0.15s',
  },
  titleSection: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  passRateCard: {
    backgroundColor: '#fff',
    border: '2px solid #10b981',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  passRateValue: {
    fontSize: '48px',
    fontWeight: 700,
    color: '#10b981',
    marginBottom: '8px',
  },
  passRateLabel: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: 500,
  },
  filtersSection: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
    marginBottom: '24px',
  },
  filtersHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  filtersTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
  },
  clearButton: {
    padding: '4px 12px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#4f46e5',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  filtersRow: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  filterGroup: {
    position: 'relative',
  },
  filterButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  filterDropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    marginTop: '4px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
    padding: '8px',
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
    color: '#374151',
    cursor: 'pointer',
    borderRadius: '4px',
    transition: 'background-color 0.15s',
  },
  checkbox: {
    cursor: 'pointer',
  },
  questionLabel: {
    flex: 1,
  },
  verdictSelect: {
    padding: '8px 12px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    outline: 'none',
  },
  emptyState: {
    padding: '48px',
    textAlign: 'center',
    color: '#9ca3af',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  tableContainer: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '14px',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    backgroundColor: '#f9fafb',
    color: '#6b7280',
    fontWeight: 600,
    fontSize: '13px',
    textTransform: 'uppercase',
    borderBottom: '1px solid #e5e7eb',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
  },
  td: {
    padding: '16px',
    color: '#374151',
    verticalAlign: 'top',
  },
  code: {
    fontFamily: 'monospace',
    fontSize: '13px',
    backgroundColor: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 600,
  },
  reasoning: {
    maxWidth: '400px',
    lineHeight: '1.5',
  },
  timestamp: {
    fontSize: '13px',
    color: '#6b7280',
    whiteSpace: 'nowrap',
  },
};
