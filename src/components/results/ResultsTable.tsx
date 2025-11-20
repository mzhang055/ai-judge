/**
 * ResultsTable - Displays evaluation results in a table
 */

import { useState, useEffect } from 'react';
import {
  AlertCircle,
  CheckCircle,
  XCircle,
  HelpCircle,
  FileText,
  MessageSquare,
  User,
  Award,
  Calendar,
  Edit3,
} from 'lucide-react';
import { StyledButton } from '../ui/StyledButton';
import { StyledBadge } from '../ui/StyledBadge';
import { EditVerdictModal } from './EditVerdictModal';
import { supabase } from '../../lib/supabase';
import type { Evaluation, EvaluationRun, StoredSubmission } from '../../types';

interface ResultsTableProps {
  evaluations: Evaluation[];
  hasNoEvaluations: boolean;
  currentRun: EvaluationRun | null;
  allRuns: EvaluationRun[];
  onEvaluationUpdated?: () => void;
}

interface EnrichedEvaluation extends Evaluation {
  questionText?: string;
  answerData?: any;
}

export function ResultsTable({
  evaluations,
  hasNoEvaluations,
  currentRun,
  allRuns,
  onEvaluationUpdated,
}: ResultsTableProps) {
  const [editingEvaluation, setEditingEvaluation] = useState<Evaluation | null>(
    null
  );
  const [enrichedEvaluations, setEnrichedEvaluations] = useState<
    EnrichedEvaluation[]
  >([]);
  const [loading, setLoading] = useState(false);

  // Fetch submission data to enrich evaluations
  useEffect(() => {
    const enrichEvaluations = async () => {
      if (evaluations.length === 0) {
        setEnrichedEvaluations([]);
        return;
      }

      setLoading(true);
      try {
        // Get unique submission IDs
        const submissionIds = [
          ...new Set(evaluations.map((e) => e.submission_id)),
        ];

        // Fetch all submissions
        const { data: submissions, error } = await supabase
          .from('submissions')
          .select('*')
          .in('id', submissionIds);

        if (error) throw error;

        // Create a map for quick lookup
        const submissionMap = new Map<string, StoredSubmission>(
          submissions?.map((s) => [s.id, s]) || []
        );

        // Enrich evaluations with question text and answer
        const enriched: EnrichedEvaluation[] = evaluations.map((evaluation) => {
          const submission = submissionMap.get(evaluation.submission_id);
          if (!submission) return evaluation;

          const question = submission.questions.find(
            (q) => q.data.id === evaluation.question_id
          );
          const answer = submission.answers[evaluation.question_id];

          return {
            ...evaluation,
            questionText: question?.data?.questionText,
            answerData: answer,
          };
        });

        setEnrichedEvaluations(enriched);
      } catch (err) {
        console.error('Failed to enrich evaluations:', err);
        // Fall back to original evaluations
        setEnrichedEvaluations(evaluations);
      } finally {
        setLoading(false);
      }
    };

    enrichEvaluations();
  }, [evaluations]);

  const handleEditClick = (evaluation: Evaluation) => {
    setEditingEvaluation(evaluation);
  };

  const handleModalClose = () => {
    setEditingEvaluation(null);
  };

  const handleModalComplete = () => {
    setEditingEvaluation(null);
    onEvaluationUpdated?.();
  };

  if (evaluations.length === 0) {
    return (
      <div style={styles.emptyState}>
        {hasNoEvaluations ? (
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
    );
  }

  const displayEvaluations = loading ? evaluations : enrichedEvaluations;

  return (
    <div style={styles.tableContainer}>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>
              <div style={styles.thContent}>
                <MessageSquare size={14} />
                <span>Question</span>
              </div>
            </th>
            <th style={styles.th}>
              <div style={styles.thContent}>
                <FileText size={14} />
                <span>Answer</span>
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
            <th style={styles.th}>
              <div style={styles.thContent}>
                <Edit3 size={14} />
                <span>Actions</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {displayEvaluations.map((evaluation) => {
            const enriched = evaluation as EnrichedEvaluation;
            return (
              <tr key={evaluation.id} style={styles.tr}>
                <td style={styles.td}>
                  <div style={styles.questionCell}>
                    {enriched.questionText || (
                      <code style={styles.code}>{evaluation.question_id}</code>
                    )}
                  </div>
                </td>
                <td style={styles.td}>
                  <AnswerCell answerData={enriched.answerData} />
                </td>
                <td style={styles.td}>{evaluation.judge_name}</td>
                <td style={styles.td}>
                  <VerdictCell evaluation={evaluation} />
                </td>
                <td style={styles.td}>
                  <ReasoningCell evaluation={evaluation} />
                </td>
                <td style={styles.td}>
                  <div style={styles.timestamp}>
                    {formatTimestamp(evaluation.created_at)}
                  </div>
                </td>
                <td style={styles.td}>
                  <StyledButton
                    variant="primary"
                    size="small"
                    onClick={() => handleEditClick(evaluation)}
                    title="Edit verdict"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <Edit3 size={14} />
                    <span>Edit</span>
                  </StyledButton>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Edit Verdict Modal */}
      {editingEvaluation && (
        <EditVerdictModal
          evaluation={editingEvaluation}
          onClose={handleModalClose}
          onComplete={handleModalComplete}
        />
      )}
    </div>
  );
}

function formatTimestamp(isoString: string): string {
  // Supabase returns timestamps without 'Z', so append it to treat as UTC
  const utcString = isoString.endsWith('Z') ? isoString : `${isoString}Z`;
  const date = new Date(utcString);

  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return `${dateStr}\n${timeStr}`;
}

function AnswerCell({ answerData }: { answerData: any }) {
  if (!answerData) {
    return <span style={{ color: '#9ca3af', fontSize: '13px' }}>N/A</span>;
  }

  // Format answer based on type
  let displayText = '';
  if (typeof answerData === 'string') {
    displayText = answerData;
  } else if (answerData.text) {
    displayText = answerData.text;
  } else if (answerData.choice) {
    const choice = Array.isArray(answerData.choice)
      ? answerData.choice.join(', ')
      : answerData.choice;
    displayText = `Choice: ${choice}`;
    if (answerData.reasoning) {
      displayText += `\nReasoning: ${answerData.reasoning}`;
    }
  } else if (answerData.reasoning) {
    displayText = answerData.reasoning;
  } else {
    displayText = JSON.stringify(answerData);
  }

  return (
    <div
      style={{
        maxWidth: '300px',
        fontSize: '13px',
        color: '#374151',
        lineHeight: '1.5',
        whiteSpace: 'pre-wrap',
      }}
    >
      {displayText}
    </div>
  );
}

function VerdictCell({ evaluation }: { evaluation: Evaluation }) {
  const hasHumanReview =
    evaluation.review_status === 'completed' && !!evaluation.human_verdict;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {/* AI Verdict */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>
          AI Judge:
        </span>
        <VerdictBadge
          verdict={evaluation.verdict}
          isGreyedOut={hasHumanReview}
        />
      </div>

      {/* Human Review Verdict (if exists) */}
      {hasHumanReview && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>
            Human Review:
          </span>
          <HumanVerdictBadge verdict={evaluation.human_verdict!} />
          {evaluation.reviewed_by && (
            <span
              style={{
                fontSize: '11px',
                color: '#9ca3af',
                fontStyle: 'italic',
              }}
            >
              by {evaluation.reviewed_by}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ReasoningCell({ evaluation }: { evaluation: Evaluation }) {
  const hasHumanReview =
    evaluation.review_status === 'completed' && evaluation.human_reasoning;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* AI Reasoning */}
      <div>
        <div
          style={{
            fontSize: '11px',
            color: '#6b7280',
            fontWeight: 500,
            marginBottom: '4px',
          }}
        >
          AI Reasoning:
        </div>
        <div style={styles.reasoning}>{evaluation.reasoning}</div>
      </div>

      {/* Human Reasoning (if exists) */}
      {hasHumanReview && (
        <div>
          <div
            style={{
              fontSize: '11px',
              color: '#6b7280',
              fontWeight: 500,
              marginBottom: '4px',
            }}
          >
            Human Review Notes:
          </div>
          <div style={styles.reasoning}>{evaluation.human_reasoning}</div>
        </div>
      )}
    </div>
  );
}

function VerdictBadge({
  verdict,
  isGreyedOut = false,
}: {
  verdict: string;
  isGreyedOut?: boolean;
}) {
  const getVerdictStyle = () => {
    // If greyed out, use grey colors regardless of verdict
    if (isGreyedOut) {
      const iconMap = {
        pass: <CheckCircle size={14} />,
        fail: <XCircle size={14} />,
        inconclusive: <HelpCircle size={14} />,
      };
      return {
        icon: iconMap[verdict as keyof typeof iconMap] || (
          <HelpCircle size={14} />
        ),
        variant: 'pending' as const,
      };
    }

    switch (verdict) {
      case 'pass':
        return {
          icon: <CheckCircle size={14} />,
          variant: 'pass' as const,
        };
      case 'fail':
        return {
          icon: <XCircle size={14} />,
          variant: 'fail' as const,
        };
      case 'inconclusive':
        return {
          icon: <HelpCircle size={14} />,
          variant: 'inconclusive' as const,
        };
      default:
        return {
          icon: <HelpCircle size={14} />,
          variant: 'pending' as const,
        };
    }
  };

  const { icon, variant } = getVerdictStyle();

  return (
    <StyledBadge variant={variant} style={{ gap: '6px' }}>
      {icon}
      <span style={{ textTransform: 'capitalize' }}>{verdict}</span>
    </StyledBadge>
  );
}

function HumanVerdictBadge({ verdict }: { verdict: string }) {
  const getVerdictStyle = () => {
    switch (verdict) {
      case 'pass':
        return {
          icon: <CheckCircle size={14} />,
          label: 'Pass',
          variant: 'pass' as const,
        };
      case 'fail':
        return {
          icon: <XCircle size={14} />,
          label: 'Fail',
          variant: 'fail' as const,
        };
      case 'bad_data':
        return {
          icon: <AlertCircle size={14} />,
          label: 'Bad Data',
          variant: 'bad_data' as const,
        };
      default:
        return {
          icon: <HelpCircle size={14} />,
          label: verdict,
          variant: 'pending' as const,
        };
    }
  };

  const { icon, label, variant } = getVerdictStyle();

  return (
    <StyledBadge variant={variant} style={{ gap: '6px' }}>
      {icon}
      <span>{label}</span>
    </StyledBadge>
  );
}

const styles: Record<string, React.CSSProperties> = {
  emptyState: {
    padding: '48px',
    textAlign: 'center',
    color: '#999',
    backgroundColor: '#fafafa',
    borderRadius: '12px',
    border: '1px solid #eaeaea',
  },
  tableContainer: {
    backgroundColor: '#fafafa',
    border: '1px solid #eaeaea',
    borderRadius: '12px',
    overflow: 'hidden',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '12px 16px',
    textAlign: 'left',
    backgroundColor: '#fafafa',
    color: '#666',
    fontWeight: 500,
    fontSize: '12px',
    borderBottom: '1px solid #eaeaea',
  },
  thContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  tr: {
    borderBottom: '1px solid #f5f5f5',
    transition: 'background-color 0.12s ease',
    backgroundColor: '#fff',
  },
  td: {
    padding: '16px',
    color: '#000',
    fontSize: '14px',
    verticalAlign: 'top',
    backgroundColor: '#fff',
  },
  code: {
    fontFamily: 'ui-monospace, monospace',
    fontSize: '13px',
    backgroundColor: '#fafafa',
    padding: '3px 6px',
    borderRadius: '4px',
    color: '#000',
    border: '1px solid #eaeaea',
  },
  reasoning: {
    maxWidth: '400px',
    lineHeight: '1.5',
    color: '#666',
    fontSize: '13px',
  },
  timestamp: {
    fontSize: '13px',
    color: '#999',
    whiteSpace: 'pre-line',
  },
  questionCell: {
    maxWidth: '300px',
    fontSize: '14px',
    color: '#111827',
    lineHeight: '1.5',
    fontWeight: 500,
  },
};
