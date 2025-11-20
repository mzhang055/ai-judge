/**
 * Judge Performance Dashboard UI (Presentation)
 *
 * Pure UI layer for judge performance analytics - receives all data
 * and callbacks as props, handles only rendering and user interactions.
 */

import { AlertCircle, TrendingUp, CheckCircle2, ArrowLeft } from 'lucide-react';
import type { JudgeStats } from '../../services/judgeAnalyticsService';

interface JudgePerformanceDashboardUIProps {
  stats: JudgeStats[];
  loading: boolean;
  error: string | null;
  totalEvaluations: number;
  totalHumanReviews: number;
  avgDisagreementRate: number;
  onNavigateToQueues: () => void;
  onNavigateToJudge: (judgeId: string) => void;
}

export function JudgePerformanceDashboardUI({
  stats,
  loading,
  error,
  totalEvaluations,
  totalHumanReviews,
  avgDisagreementRate,
  onNavigateToQueues,
  onNavigateToJudge,
}: JudgePerformanceDashboardUIProps) {
  return (
    <div
      style={{
        padding: '40px 32px',
        maxWidth: '1200px',
        margin: '0 auto',
        minHeight: '100vh',
      }}
    >
      {/* Back Button */}
      <button
        onClick={onNavigateToQueues}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          marginBottom: '32px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: '#EDA436',
          fontSize: '15px',
          fontWeight: '500',
          borderRadius: '12px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateX(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateX(0)';
        }}
      >
        <ArrowLeft size={18} strokeWidth={2.5} /> Back to Queues
      </button>

      {/* Header */}
      <div style={{ marginBottom: '40px' }}>
        <h1
          style={{
            fontSize: '34px',
            fontWeight: '700',
            marginBottom: '8px',
            color: '#1a1a1a',
            letterSpacing: '-0.02em',
          }}
        >
          Judge Performance
        </h1>
        <p
          style={{
            color: '#6b7280',
            fontSize: '16px',
            fontWeight: '400',
            lineHeight: '1.5',
          }}
        >
          Analyze judge performance and get AI-generated suggestions to improve
          rubrics
        </p>
      </div>

      {/* Overall Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '20px',
          marginBottom: '40px',
        }}
      >
        <StatCard
          label="Total Evaluations"
          value={totalEvaluations}
          icon={<TrendingUp size={22} strokeWidth={2.5} />}
          color="#EDA436"
        />
        <StatCard
          label="Human Reviews"
          value={totalHumanReviews}
          icon={<CheckCircle2 size={22} strokeWidth={2.5} />}
          color="#10b981"
        />
        <StatCard
          label="Avg Disagreement"
          value={`${(avgDisagreementRate * 100).toFixed(1)}%`}
          icon={<AlertCircle size={22} strokeWidth={2.5} />}
          color="#f59e0b"
        />
      </div>

      {/* Error State */}
      {error && (
        <div
          style={{
            padding: '20px 24px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <AlertCircle size={20} color="#dc2626" />
          <p style={{ color: '#991b1b', fontSize: '15px', fontWeight: '500' }}>
            {error}
          </p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 24px',
            backgroundColor: 'rgba(249, 250, 251, 0.5)',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              margin: '0 auto 16px',
              border: '3px solid rgba(237, 164, 54, 0.2)',
              borderTopColor: '#EDA436',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ color: '#6b7280', fontSize: '15px', fontWeight: '500' }}>
            Loading judge statistics...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!loading && stats.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 24px',
            backgroundColor: 'rgba(249, 250, 251, 0.5)',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              margin: '0 auto 20px',
              backgroundColor: 'rgba(237, 164, 54, 0.1)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
            }}
          >
            📊
          </div>
          <p
            style={{
              color: '#374151',
              marginBottom: '8px',
              fontSize: '17px',
              fontWeight: '600',
            }}
          >
            No judge statistics available yet
          </p>
          <p style={{ color: '#9ca3af', fontSize: '15px' }}>
            Run some evaluations and human reviews to see analytics
          </p>
        </div>
      )}

      {/* Judges List */}
      {!loading && stats.length > 0 && (
        <div>
          <h2
            style={{
              fontSize: '22px',
              fontWeight: '700',
              marginBottom: '20px',
              color: '#1a1a1a',
              letterSpacing: '-0.01em',
            }}
          >
            Judges
          </h2>

          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow:
                '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02)',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: 'rgba(249, 250, 251, 0.8)',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                  }}
                >
                  <th
                    style={{
                      padding: '16px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      width: '30%',
                    }}
                  >
                    Judge Name
                  </th>
                  <th
                    style={{
                      padding: '16px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      width: '15%',
                    }}
                  >
                    Disagreement Rate
                  </th>
                  <th
                    style={{
                      padding: '16px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      width: '35%',
                    }}
                  >
                    Statistics
                  </th>
                  <th
                    style={{
                      padding: '16px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      width: '10%',
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: '16px 20px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      width: '10%',
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.map((judge) => (
                  <JudgeTableRow
                    key={judge.judge_id}
                    judge={judge}
                    onNavigate={() => onNavigateToJudge(judge.judge_id)}
                  />
                ))}
              </tbody>
            </table>
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
        padding: '24px',
        backgroundColor: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        borderRadius: '16px',
        boxShadow:
          '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow =
          '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: '13px',
              color: '#9ca3af',
              marginBottom: '6px',
              fontWeight: '500',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            {label}
          </p>
          <p
            style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#1a1a1a',
              lineHeight: '1',
              letterSpacing: '-0.02em',
            }}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Judge Table Row Component
 */
function JudgeTableRow({
  judge,
  onNavigate,
}: {
  judge: JudgeStats;
  onNavigate: () => void;
}) {
  const disagreementPct = (judge.disagreement_rate * 100).toFixed(1);
  const isHighDisagreement = judge.disagreement_rate > 0.25;
  const isLowDisagreement = judge.disagreement_rate < 0.1;

  return (
    <tr
      style={{
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(249, 250, 251, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      {/* Judge Name with Avatar */}
      <td style={{ padding: '18px 20px', verticalAlign: 'middle' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: '#e0e7ff',
              color: '#4f46e5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: '700',
              flexShrink: 0,
            }}
          >
            {judge.judge_name.charAt(0).toUpperCase()}
          </div>
          <span
            style={{
              fontSize: '15px',
              fontWeight: '600',
              color: '#1a1a1a',
            }}
          >
            {judge.judge_name}
          </span>
        </div>
      </td>

      {/* Disagreement Rate */}
      <td style={{ padding: '18px 20px', verticalAlign: 'middle' }}>
        <div
          style={{
            fontSize: '20px',
            fontWeight: '700',
            color: isHighDisagreement
              ? '#f59e0b'
              : isLowDisagreement
                ? '#10b981'
                : '#EDA436',
            letterSpacing: '-0.02em',
          }}
        >
          {disagreementPct}%
        </div>
      </td>

      {/* Statistics */}
      <td style={{ padding: '18px 20px', verticalAlign: 'middle' }}>
        <div
          style={{
            display: 'flex',
            gap: '16px',
            fontSize: '13px',
            color: '#6b7280',
            fontWeight: '500',
            flexWrap: 'wrap',
          }}
        >
          <span>
            <strong style={{ color: '#374151' }}>
              {judge.total_evaluations}
            </strong>{' '}
            eval{judge.total_evaluations !== 1 ? 's' : ''}
          </span>
          <span style={{ color: '#d1d5db' }}>•</span>
          <span>
            <strong style={{ color: '#374151' }}>
              {judge.human_reviewed_count}
            </strong>{' '}
            review{judge.human_reviewed_count !== 1 ? 's' : ''}
          </span>
          <span style={{ color: '#d1d5db' }}>•</span>
          <span>
            <strong style={{ color: '#374151' }}>
              {judge.disagreement_count}
            </strong>{' '}
            disagree{judge.disagreement_count !== 1 ? 'd' : 's'}
          </span>
        </div>
      </td>

      {/* Status */}
      <td style={{ padding: '18px 20px', verticalAlign: 'middle' }}>
        <div style={{ fontSize: '13px', fontWeight: '500' }}>
          {isHighDisagreement ? (
            <div
              style={{
                color: '#f59e0b',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertCircle size={16} strokeWidth={2.5} />
              <span>High</span>
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
              <CheckCircle2 size={16} strokeWidth={2.5} />
              <span>Good</span>
            </div>
          ) : (
            <div
              style={{
                color: '#EDA436',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <TrendingUp size={16} strokeWidth={2.5} />
              <span>Medium</span>
            </div>
          )}
        </div>
      </td>

      {/* Actions */}
      <td
        style={{
          padding: '18px 20px',
          verticalAlign: 'middle',
          textAlign: 'center',
        }}
      >
        <button
          onClick={onNavigate}
          style={{
            padding: '8px 16px',
            fontSize: '13px',
            fontWeight: '500',
            border: '1px solid rgba(237, 164, 54, 0.3)',
            borderRadius: '8px',
            background: '#fff',
            cursor: 'pointer',
            color: '#EDA436',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(237, 164, 54, 0.5)';
            e.currentTarget.style.background = 'rgba(237, 164, 54, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(237, 164, 54, 0.3)';
            e.currentTarget.style.background = '#fff';
          }}
        >
          View Details
        </button>
      </td>
    </tr>
  );
}
