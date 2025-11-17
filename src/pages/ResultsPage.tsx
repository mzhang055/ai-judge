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
  FileText,
  MessageSquare,
  User,
  Award,
  Calendar,
  Clock,
} from 'lucide-react';
import {
  getLatestEvaluationRun,
  getEvaluationsByRun,
  getEvaluationRuns,
} from '../services/evaluationService';
import { getQueueQuestions } from '../services/queueService';
import { listJudges } from '../services/judgeService';
import { getErrorMessage } from '../lib/errors';
import type { Evaluation, EvaluationRun, Judge } from '../types';
import type { QuestionInfo } from '../services/queueService';

export function ResultsPage() {
  const { queueId } = useParams<{ queueId: string }>();
  const navigate = useNavigate();

  // Data states
  const [currentRun, setCurrentRun] = useState<EvaluationRun | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [allRuns, setAllRuns] = useState<EvaluationRun[]>([]);
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

        // Load latest run, all runs, judges, and questions
        const [latestRun, runs, judgesData, questionsData] = await Promise.all([
          getLatestEvaluationRun(queueId),
          getEvaluationRuns(queueId),
          listJudges(),
          getQueueQuestions(queueId),
        ]);

        setCurrentRun(latestRun);
        setAllRuns(runs);
        setJudges(judgesData);
        setQuestions(questionsData);

        // Load evaluations for latest run
        if (latestRun) {
          const evaluationsData = await getEvaluationsByRun(latestRun.id);
          setEvaluations(evaluationsData);
        } else {
          setEvaluations([]);
        }
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load evaluation results'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [queueId]);

  // Load evaluations when switching runs
  const switchToRun = async (run: EvaluationRun) => {
    if (run.id === currentRun?.id) return; // Already viewing this run

    try {
      setLoading(true);
      setError(null);
      console.log('[ResultsPage] Switching to run:', run.id);
      const evaluationsData = await getEvaluationsByRun(run.id);
      console.log(
        '[ResultsPage] Loaded evaluations:',
        evaluationsData.length,
        evaluationsData
      );
      setEvaluations(evaluationsData);
      setCurrentRun(run);
      // Keep history panel open for easy navigation
      // Clear filters when switching runs
      clearAllFilters();
    } catch (err) {
      console.error('[ResultsPage] Error switching to run:', err);
      setError(getErrorMessage(err, 'Failed to load evaluations for this run'));
    } finally {
      setLoading(false);
    }
  };

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
    <div style={styles.pageWrapper}>
      {/* Left Sidebar - Run History */}
      {allRuns.filter((r) => r.total_evaluations > 0).length > 0 && (
        <div style={styles.sidebar}>
          <div style={styles.sidebarHeader}>
            <Clock size={18} />
            <h3 style={styles.sidebarTitle}>Evaluation Runs</h3>
          </div>
          <div style={styles.runsList}>
            {allRuns
              .filter((r) => r.total_evaluations > 0)
              .map((run) => {
                const originalIndex = allRuns.findIndex((r) => r.id === run.id);
                return (
                  <div
                    key={run.id}
                    style={{
                      ...styles.runItem,
                      ...(currentRun?.id === run.id
                        ? styles.runItemActive
                        : {}),
                    }}
                    onClick={() => switchToRun(run)}
                  >
                    <div style={styles.runItemBadge}>
                      {originalIndex === 0
                        ? 'Latest'
                        : `#${allRuns.length - originalIndex}`}
                    </div>
                    <div style={styles.runItemContent}>
                      <div style={styles.runItemDate}>
                        {new Date(run.created_at).toLocaleDateString()}
                        <br />
                        <span style={{ fontSize: '11px', opacity: 0.7 }}>
                          {new Date(run.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                      <div style={styles.runItemStats}>
                        <div style={styles.runItemPassRate}>
                          {run.pass_rate?.toFixed(1) || 0}%
                        </div>
                        <div style={styles.runItemCount}>
                          {run.total_evaluations} eval
                          {run.total_evaluations !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div style={styles.runItemJudges}>
                        {run.judges_summary
                          .slice(0, 2)
                          .map((j) => j.name)
                          .join(', ')}
                        {run.judges_summary.length > 2 &&
                          ` +${run.judges_summary.length - 2}`}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div style={styles.mainContent}>
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
            {currentRun && (
              <div style={styles.runInfo}>
                <span style={{ fontWeight: 600, color: '#111827' }}>
                  {allRuns.findIndex((r) => r.id === currentRun.id) === 0
                    ? 'Latest Run'
                    : `Run #${allRuns.length - allRuns.findIndex((r) => r.id === currentRun.id)}`}
                </span>
                <span>•</span>
                <span>
                  {new Date(currentRun.created_at).toLocaleDateString()}{' '}
                  {new Date(currentRun.created_at).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div style={styles.filtersCard}>
          <div style={styles.filtersHeader}>
            <h3 style={styles.filtersTitle}>
              <Filter size={18} />
              <span>Filter Results</span>
            </h3>
            {hasActiveFilters && (
              <button style={styles.clearButton} onClick={clearAllFilters}>
                Clear all
              </button>
            )}
          </div>

          <div style={styles.filtersRow}>
            {/* Judge Filter */}
            <div style={styles.filterGroup}>
              <label style={styles.filterLabel}>Judge</label>
              <button
                style={styles.filterButton}
                onClick={() => setShowJudgeFilter(!showJudgeFilter)}
              >
                <span style={styles.filterButtonText}>
                  {selectedJudges.size > 0
                    ? `${selectedJudges.size} selected`
                    : 'All judges'}
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
              <label style={styles.filterLabel}>Question</label>
              <button
                style={styles.filterButton}
                onClick={() => setShowQuestionFilter(!showQuestionFilter)}
              >
                <span style={styles.filterButtonText}>
                  {selectedQuestions.size > 0
                    ? `${selectedQuestions.size} selected`
                    : 'All questions'}
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
              <label style={styles.filterLabel}>Verdict</label>
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
              <>
                <AlertCircle
                  size={48}
                  style={{ color: '#d1d5db', marginBottom: '16px' }}
                />
                <p
                  style={{
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '8px',
                  }}
                >
                  No evaluations found for this run
                </p>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                  {currentRun &&
                  allRuns.findIndex((r) => r.id === currentRun.id) === 0
                    ? 'Run AI judges to generate results.'
                    : "This run's evaluations may have been cleared. Try viewing the latest run or running new evaluations."}
                </p>
              </>
            ) : (
              <p>No evaluations match the selected filters.</p>
            )}
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>
                    <div style={styles.thContent}>
                      <FileText size={14} />
                      <span>Submission</span>
                    </div>
                  </th>
                  <th style={styles.th}>
                    <div style={styles.thContent}>
                      <MessageSquare size={14} />
                      <span>Question</span>
                    </div>
                  </th>
                  <th style={styles.th}>
                    <div style={styles.thContent}>
                      <User size={14} />
                      <span>Judge</span>
                    </div>
                  </th>
                  <th style={styles.th}>
                    <div style={styles.thContent}>
                      <Award size={14} />
                      <span>Verdict</span>
                    </div>
                  </th>
                  <th style={styles.th}>
                    <div style={styles.thContent}>
                      <MessageSquare size={14} />
                      <span>Reasoning</span>
                    </div>
                  </th>
                  <th style={styles.th}>
                    <div style={styles.thContent}>
                      <Calendar size={14} />
                      <span>Created</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredEvaluations.map((evaluation) => (
                  <tr key={evaluation.id} style={styles.tr}>
                    <td style={styles.td}>
                      <code style={styles.code}>
                        {evaluation.submission_id}
                      </code>
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
  pageWrapper: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
  },
  sidebar: {
    width: '280px',
    minWidth: '280px',
    backgroundColor: '#fff',
    borderRight: '1px solid #e5e7eb',
    padding: '24px 16px',
    overflowY: 'auto',
    position: 'sticky' as const,
    top: 0,
    height: '100vh',
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    paddingBottom: '16px',
    borderBottom: '2px solid #e5e7eb',
  },
  sidebarTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  runsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  runItem: {
    padding: '12px',
    borderRadius: '8px',
    border: '2px solid #e5e7eb',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  runItemActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
  runItemBadge: {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#6b7280',
    marginBottom: '8px',
  },
  runItemContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  runItemDate: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#111827',
    lineHeight: '1.4',
  },
  runItemStats: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  runItemPassRate: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#10b981',
  },
  runItemCount: {
    fontSize: '12px',
    color: '#6b7280',
  },
  runItemJudges: {
    fontSize: '11px',
    color: '#9ca3af',
    fontStyle: 'italic' as const,
    lineHeight: '1.4',
  },
  mainContent: {
    flex: 1,
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 24px 40px',
    width: '100%',
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
  filtersCard: {
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
  },
  filtersHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '20px',
  },
  filtersTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  clearButton: {
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#4f46e5',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  filtersRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  filterGroup: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  filterLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  filterButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '8px',
    padding: '10px 12px',
    fontSize: '14px',
    color: '#111827',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'left',
  },
  filterButtonText: {
    flex: 1,
    fontWeight: 400,
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
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    fontWeight: 400,
    color: '#111827',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    outline: 'none',
    transition: 'border-color 0.15s',
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
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    backgroundColor: '#f9fafb',
    color: '#6b7280',
    fontWeight: 500,
    fontSize: '13px',
    borderBottom: '1px solid #e5e7eb',
  },
  thContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  tr: {
    borderBottom: '1px solid #f3f4f6',
    transition: 'background-color 0.15s',
  },
  td: {
    padding: '16px',
    color: '#111827',
    fontSize: '14px',
    verticalAlign: 'top',
  },
  code: {
    fontFamily: 'monospace',
    fontSize: '13px',
    backgroundColor: '#f3f4f6',
    padding: '2px 6px',
    borderRadius: '4px',
    color: '#4b5563',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '13px',
    fontWeight: 500,
  },
  reasoning: {
    maxWidth: '400px',
    lineHeight: '1.5',
    color: '#6b7280',
    fontSize: '13px',
  },
  timestamp: {
    fontSize: '13px',
    color: '#6b7280',
    whiteSpace: 'nowrap',
  },
  runInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #e5e7eb',
    fontSize: '13px',
    color: '#6b7280',
  },
};
