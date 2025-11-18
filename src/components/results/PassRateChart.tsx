import { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Evaluation, Judge } from '../../types';

interface PassRateChartProps {
  evaluations: Evaluation[];
  judges: Judge[];
}

export function PassRateChart({ evaluations, judges }: PassRateChartProps) {
  // Calculate pass rate by judge
  const { chartData, averagePassRate } = useMemo(() => {
    const statsMap = new Map<
      string,
      {
        name: string;
        passRate: number;
        total: number;
        pass: number;
      }
    >();

    // Initialize stats for all judges
    judges.forEach((judge) => {
      statsMap.set(judge.id, {
        name: judge.name,
        passRate: 0,
        total: 0,
        pass: 0,
      });
    });

    // Count evaluations by judge
    evaluations.forEach((evaluation) => {
      const stats = statsMap.get(evaluation.judge_id);
      if (!stats) return;

      stats.total++;
      if (evaluation.verdict === 'pass') stats.pass++;
    });

    // Calculate pass rates and build chart data
    const chartData: Array<{ judge: string; passRate: number }> = [];
    let totalPass = 0;
    let totalCount = 0;

    statsMap.forEach((stats) => {
      if (stats.total > 0) {
        const passRate = Math.round((stats.pass / stats.total) * 100);
        chartData.push({
          judge: stats.name,
          passRate,
        });
        totalPass += stats.pass;
        totalCount += stats.total;
      }
    });

    // Sort by pass rate descending
    chartData.sort((a, b) => b.passRate - a.passRate);

    const averagePassRate =
      totalCount > 0 ? Math.round((totalPass / totalCount) * 100) : 0;

    return { chartData, averagePassRate };
  }, [evaluations, judges]);

  if (chartData.length === 0) {
    return (
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3 style={styles.cardTitle}>Pass Rate by Judge</h3>
          <p style={styles.cardDescription}>No evaluation data available</p>
        </div>
        <div style={styles.emptyState}>
          Run evaluations to see pass rate statistics by judge.
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.cardHeader}>
        <h3 style={styles.cardTitle}>Pass Rate by Judge</h3>
        <p style={styles.cardDescription}>
          Performance comparison across {chartData.length} judge
          {chartData.length !== 1 ? 's' : ''}
        </p>
      </div>
      <div style={styles.cardContent}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 10, right: 30, left: 100, bottom: 10 }}
          >
            <XAxis type="number" domain={[0, 100]} />
            <YAxis type="category" dataKey="judge" width={90} />
            <Tooltip
              formatter={(value: number) => [`${value}%`, 'Pass Rate']}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '8px',
              }}
            />
            <Bar dataKey="passRate" fill="#6366f1" radius={[0, 5, 5, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={styles.cardFooter}>
        <div style={styles.footerContent}>
          <div style={styles.footerMain}>
            Average pass rate: {averagePassRate}% <TrendingUp size={16} />
          </div>
          <div style={styles.footerSubtext}>
            Showing pass rates across all judges
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  card: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  },
  cardHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
    marginBottom: '4px',
  },
  cardDescription: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  cardContent: {
    padding: '24px',
  },
  cardFooter: {
    padding: '20px 24px',
    borderTop: '1px solid #e5e7eb',
  },
  footerContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  footerMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#111827',
  },
  footerSubtext: {
    fontSize: '14px',
    color: '#6b7280',
  },
  emptyState: {
    padding: '40px 24px',
    textAlign: 'center' as const,
    color: '#6b7280',
  },
};
