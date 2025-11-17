/**
 * RunHistorySidebar - Displays evaluation run history
 */

import { useState } from 'react';
import type { EvaluationRun } from '../../types';

interface RunHistorySidebarProps {
  runs: EvaluationRun[];
  currentRunId: string | null;
  onRunSelect: (run: EvaluationRun) => void;
}

export function RunHistorySidebar({
  runs,
  currentRunId,
  onRunSelect,
}: RunHistorySidebarProps) {
  const runsWithEvals = runs.filter((r) => r.total_evaluations > 0);

  if (runsWithEvals.length === 0) {
    return null;
  }

  return (
    <div style={styles.sidebarContainer}>
      <div style={styles.sidebar}>
        <h3 style={styles.sidebarTitle}>Evaluation Runs</h3>
        <div style={styles.runsList}>
          {runsWithEvals.map((run) => {
            const originalIndex = runs.findIndex((r) => r.id === run.id);
            return (
              <RunItem
                key={run.id}
                run={run}
                isActive={currentRunId === run.id}
                label={
                  originalIndex === 0
                    ? 'Latest'
                    : `#${runs.length - originalIndex}`
                }
                onClick={() => onRunSelect(run)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

interface RunItemProps {
  run: EvaluationRun;
  isActive: boolean;
  label: string;
  onClick: () => void;
}

function RunItem({ run, isActive, label, onClick }: RunItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      style={{
        ...styles.runItem,
        ...(isActive
          ? styles.runItemActive
          : isHovered
            ? styles.runItemHover
            : {}),
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div style={styles.runItemBadge}>{label}</div>
      <div style={styles.runItemContent}>
        {/* Score first */}
        <div style={styles.runItemStats}>
          <div style={styles.runItemPassRate}>
            {run.pass_rate?.toFixed(1) || 0}%
          </div>
          <div style={styles.runItemCount}>
            {run.total_evaluations} eval{run.total_evaluations !== 1 ? 's' : ''}
          </div>
        </div>
        {/* Judges list second */}
        <div style={styles.runItemJudges}>
          {run.judges_summary.map((j) => (
            <span key={j.id} style={styles.judgePill}>
              {j.name}
            </span>
          ))}
        </div>
        {/* Date & time last */}
        <div style={styles.runItemDate}>
          {new Date(run.created_at).toLocaleDateString()}
          <br />
          <span style={{ fontSize: '11px', opacity: 0.7 }}>
            {new Date(run.created_at).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  sidebarContainer: {
    width: '240px',
    minWidth: '240px',
  },
  sidebar: {
    backgroundColor: '#f5f5f5',
    borderRadius: '12px',
    padding: '16px',
    border: '1px solid #eaeaea',
  },
  sidebarTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#000',
    margin: '0 0 16px 0',
    letterSpacing: '-0.01em',
  },
  runsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  runItem: {
    padding: '10px 12px',
    borderRadius: '8px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    transition: 'all 0.12s ease',
    border: '1px solid transparent',
  },
  runItemActive: {
    backgroundColor: '#f3f4ff',
    borderColor: '#4f46e5',
    boxShadow: '0 1px 2px rgba(79, 70, 229, 0.1)',
  },
  runItemHover: {
    backgroundColor: '#faf5ff',
    borderColor: '#e9d5ff',
  },
  runItemBadge: {
    display: 'inline-block',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    color: '#666',
    marginBottom: '6px',
  },
  runItemContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  runItemDate: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#000',
    lineHeight: '1.4',
  },
  runItemStats: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
  },
  runItemPassRate: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#000',
    letterSpacing: '-0.02em',
  },
  runItemCount: {
    fontSize: '12px',
    color: '#666',
  },
  runItemJudges: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '4px',
    marginTop: '2px',
  },
  judgePill: {
    display: 'inline-block',
    fontSize: '10px',
    fontWeight: 500,
    color: '#6366f1',
    backgroundColor: '#eef2ff',
    padding: '2px 8px',
    borderRadius: '12px',
    border: '1px solid #c7d2fe',
  },
};
