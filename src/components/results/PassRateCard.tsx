/**
 * PassRateCard - Displays overall pass rate for evaluations
 */

import type { EvaluationRun } from '../../types';

interface PassRateCardProps {
  passRate: number;
  totalEvaluations: number;
  currentRun: EvaluationRun | null;
  allRuns: EvaluationRun[];
}

export function PassRateCard({
  passRate,
  totalEvaluations,
  currentRun,
  allRuns,
}: PassRateCardProps) {
  return (
    <div style={styles.passRateCard}>
      <div style={styles.passRateValue}>{passRate}%</div>
      <div style={styles.passRateLabel}>
        Pass Rate ({totalEvaluations} evaluation
        {totalEvaluations !== 1 ? 's' : ''})
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
  );
}

const styles: Record<string, React.CSSProperties> = {
  passRateCard: {
    backgroundColor: '#fafafa',
    border: '1px solid #eaeaea',
    borderRadius: '12px',
    padding: '24px',
    textAlign: 'center',
    marginBottom: '20px',
  },
  passRateValue: {
    fontSize: '48px',
    fontWeight: 600,
    color: '#000',
    marginBottom: '8px',
    letterSpacing: '-0.03em',
  },
  passRateLabel: {
    fontSize: '14px',
    color: '#666',
    fontWeight: 400,
  },
  runInfo: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #eaeaea',
    fontSize: '13px',
    color: '#666',
  },
};
