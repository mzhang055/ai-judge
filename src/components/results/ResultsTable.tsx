/**
 * ResultsTable - Displays evaluation results in a table
 */

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
} from 'lucide-react';
import type { Evaluation, EvaluationRun } from '../../types';

interface ResultsTableProps {
  evaluations: Evaluation[];
  hasNoEvaluations: boolean;
  currentRun: EvaluationRun | null;
  allRuns: EvaluationRun[];
}

export function ResultsTable({
  evaluations,
  hasNoEvaluations,
  currentRun,
  allRuns,
}: ResultsTableProps) {
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
          </tr>
        </thead>
        <tbody>
          {evaluations.map((evaluation) => (
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
  );
}

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
  },
  td: {
    padding: '16px',
    color: '#000',
    fontSize: '14px',
    verticalAlign: 'top',
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
};
