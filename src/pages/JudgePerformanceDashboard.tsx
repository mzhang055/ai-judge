/**
 * Judge Performance Dashboard
 *
 * Shows analytics on judge performance and auto-generated suggestions
 * for improving judge rubrics based on human review patterns.
 */

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Lightbulb,
  ArrowLeft,
} from 'lucide-react';
import {
  getAllJudgesStats,
  type JudgeStats,
} from '../services/judgeAnalyticsService';
import { useNavigate } from 'react-router-dom';

export default function JudgePerformanceDashboard() {
  const [stats, setStats] = useState<JudgeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllJudgesStats();
      setStats(data);
    } catch (err) {
      console.error('Error loading judge stats:', err);
      setError('Failed to load judge statistics');
    } finally {
      setLoading(false);
    }
  }

  // Calculate overall stats
  const totalEvaluations = stats.reduce(
    (sum, s) => sum + s.total_evaluations,
    0
  );
  const totalHumanReviews = stats.reduce(
    (sum, s) => sum + s.human_reviewed_count,
    0
  );
  const avgDisagreementRate =
    stats.length > 0
      ? stats.reduce((sum, s) => sum + s.disagreement_rate, 0) / stats.length
      : 0;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Back Button */}
      <button
        onClick={() => navigate('/queues')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          marginBottom: '24px',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: '#6366f1',
          fontSize: '14px',
        }}
      >
        <ArrowLeft size={16} /> Back to Queues
      </button>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1
          style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}
        >
          Judge Performance & Auto-Tuning
        </h1>
        <p style={{ color: '#666', fontSize: '14px' }}>
          Analyze judge performance and get AI-generated suggestions to improve
          rubrics
        </p>
      </div>

      {/* Overall Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <StatCard
          label="Total Evaluations"
          value={totalEvaluations}
          icon={<TrendingUp size={20} />}
          color="#6366f1"
        />
        <StatCard
          label="Human Reviews"
          value={totalHumanReviews}
          icon={<CheckCircle2 size={20} />}
          color="#10b981"
        />
        <StatCard
          label="Avg Disagreement"
          value={`${(avgDisagreementRate * 100).toFixed(1)}%`}
          icon={<AlertCircle size={20} />}
          color="#f59e0b"
        />
      </div>

      {/* Error State */}
      {error && (
        <div
          style={{
            padding: '16px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          <p style={{ color: '#991b1b' }}>{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <p style={{ color: '#666' }}>Loading judge statistics...</p>
        </div>
      )}

      {/* Judges List */}
      {!loading && stats.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            border: '1px solid #e5e7eb',
          }}
        >
          <p style={{ color: '#666', marginBottom: '8px' }}>
            No judge statistics available yet
          </p>
          <p style={{ color: '#999', fontSize: '14px' }}>
            Run some evaluations and human reviews to see analytics
          </p>
        </div>
      )}

      {!loading && stats.length > 0 && (
        <div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '16px',
            }}
          >
            Judges (sorted by disagreement rate)
          </h2>

          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {stats.map((judge) => (
              <JudgeCard
                key={judge.judge_id}
                judge={judge}
                onClick={() => navigate(`/judge-performance/${judge.judge_id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Stat Card Component
 */
function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
          }}
        >
          {icon}
        </div>
        <div>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            {label}
          </p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111' }}>
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Judge Card Component
 */
function JudgeCard({
  judge,
  onClick,
}: {
  judge: JudgeStats;
  onClick: () => void;
}) {
  const disagreementPct = (judge.disagreement_rate * 100).toFixed(1);
  const isHighDisagreement = judge.disagreement_rate > 0.25;
  const isLowDisagreement = judge.disagreement_rate < 0.1;

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#6366f1';
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(99,102,241,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        {/* Status Icon */}
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '8px',
            backgroundColor: isHighDisagreement
              ? '#fef3c7'
              : isLowDisagreement
                ? '#d1fae5'
                : '#e0e7ff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            flexShrink: 0,
          }}
        >
          {isHighDisagreement ? '⚠️' : isLowDisagreement ? '✅' : '📊'}
        </div>

        {/* Content */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '8px',
            }}
          >
            <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111' }}>
              {judge.judge_name}
            </h3>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: isHighDisagreement
                  ? '#f59e0b'
                  : isLowDisagreement
                    ? '#10b981'
                    : '#6366f1',
              }}
            >
              {disagreementPct}%
            </div>
          </div>

          {/* Stats Row */}
          <div
            style={{
              display: 'flex',
              gap: '24px',
              fontSize: '14px',
              color: '#666',
              marginBottom: '12px',
            }}
          >
            <span>
              {judge.total_evaluations} eval
              {judge.total_evaluations !== 1 ? 's' : ''}
            </span>
            <span>|</span>
            <span>
              {judge.human_reviewed_count} human review
              {judge.human_reviewed_count !== 1 ? 's' : ''}
            </span>
            <span>|</span>
            <span>
              {judge.disagreement_count} disagree
              {judge.disagreement_count !== 1 ? 'd' : 's'}
            </span>
          </div>

          {/* Status Message */}
          <div style={{ fontSize: '14px' }}>
            {isHighDisagreement ? (
              <div
                style={{
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertCircle size={16} />
                <span>
                  High disagreement rate - {judge.suggestion_count} improvement{' '}
                  {judge.suggestion_count !== 1 ? 'suggestions' : 'suggestion'}{' '}
                  available
                </span>
              </div>
            ) : isLowDisagreement ? (
              <div
                style={{
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle2 size={16} />
                <span>Performing well</span>
              </div>
            ) : (
              <div
                style={{
                  color: '#6366f1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {judge.suggestion_count > 0 && <Lightbulb size={16} />}
                <span>
                  {judge.suggestion_count > 0
                    ? `${judge.suggestion_count} improvement ${
                        judge.suggestion_count !== 1
                          ? 'suggestions'
                          : 'suggestion'
                      } available`
                    : 'Review performance details'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Arrow */}
        <div
          style={{ color: '#9ca3af', fontSize: '20px', alignSelf: 'center' }}
        >
          →
        </div>
      </div>
    </div>
  );
}
