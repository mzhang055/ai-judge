/**
 * ResultsTable - Displays evaluation results in a table
 */

import { useState } from 'react';
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
import { EditVerdictModal } from './EditVerdictModal';
import type { Evaluation, EvaluationRun } from '../../types';

interface ResultsTableProps {
  evaluations: Evaluation[];
  hasNoEvaluations: boolean;
  currentRun: EvaluationRun | null;
  allRuns: EvaluationRun[];
  onEvaluationUpdated?: () => void;
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

  return (
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
            <th style={styles.th}>
              <div style={styles.thContent}>
                <Edit3 size={14} />
                <span>Actions</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {evaluations.map((evaluation) => {
            return (
              <tr key={evaluation.id} style={styles.tr}>
                <td style={styles.td}>
                  <code style={styles.code}>{evaluation.submission_id}</code>
                </td>
                <td style={styles.td}>
                  <code style={styles.code}>{evaluation.question_id}</code>
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
                    {new Date(evaluation.created_at).toLocaleDateString()}
                    <br />
                    {new Date(evaluation.created_at).toLocaleTimeString()}
                  </div>
                </td>
                <td style={styles.td}>
                  <button
                    onClick={() => handleEditClick(evaluation)}
                    style={styles.editButton}
                    title="Edit verdict"
                  >
                    <Edit3 size={14} />
                    <span>Edit</span>
                  </button>
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
        color: '#9ca3af',
        backgroundColor: '#f3f4f6',
        icon: iconMap[verdict as keyof typeof iconMap] || (
          <HelpCircle size={14} />
        ),
      };
    }

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

function HumanVerdictBadge({ verdict }: { verdict: string }) {
  const getVerdictStyle = () => {
    switch (verdict) {
      case 'pass':
        return {
          color: '#059669',
          backgroundColor: '#d1fae5',
          icon: <CheckCircle size={14} />,
          label: 'Pass',
        };
      case 'fail':
        return {
          color: '#dc2626',
          backgroundColor: '#fee2e2',
          icon: <XCircle size={14} />,
          label: 'Fail',
        };
      case 'bad_data':
        return {
          color: '#7c3aed',
          backgroundColor: '#ede9fe',
          icon: <AlertCircle size={14} />,
          label: 'Bad Data',
        };
      default:
        return {
          color: '#6b7280',
          backgroundColor: '#f3f4f6',
          icon: <HelpCircle size={14} />,
          label: verdict,
        };
    }
  };

  const { color, backgroundColor, icon, label } = getVerdictStyle();

  return (
    <div
      style={{
        ...styles.badge,
        color,
        backgroundColor,
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
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
    color: '#666',
    fontSize: '13px',
  },
  timestamp: {
    fontSize: '13px',
    color: '#999',
    whiteSpace: 'nowrap',
  },
  editButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    fontSize: '13px',
    fontWeight: 500,
    color: '#4f46e5',
    backgroundColor: '#eef2ff',
    border: '1px solid #c7d2fe',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
};
