/**
 * HumanReviewQueueUI - Presentation component with UI only
 */

import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { ReviewModal } from '../../components/ReviewModal';
import { ReviewFiltersBar } from '../../components/ReviewFiltersBar';
import type { HumanReviewQueueItemWithContext, QueueStatus } from '../../types';
import type { ReviewQueueStats } from '../../services/humanReviewService';

interface HumanReviewQueueUIProps {
  loading: boolean;
  error: string | null;
  reviewItems: HumanReviewQueueItemWithContext[];
  stats: ReviewQueueStats | null;
  selectedItem: HumanReviewQueueItemWithContext | null;
  showModal: boolean;
  availableQueueIds: string[];
  selectedQueueId: string;
  selectedStatus: QueueStatus | '';
  onBackClick: () => void;
  onReviewClick: (item: HumanReviewQueueItemWithContext) => void;
  onReviewComplete: () => void;
  onModalClose: () => void;
  onQueueIdChange: (queueId: string) => void;
  onStatusChange: (status: QueueStatus | '') => void;
  onClearFilters: () => void;
}

export function HumanReviewQueueUI({
  loading,
  error,
  reviewItems,
  stats,
  selectedItem,
  showModal,
  availableQueueIds,
  selectedQueueId,
  selectedStatus,
  onBackClick,
  onReviewClick,
  onReviewComplete,
  onModalClose,
  onQueueIdChange,
  onStatusChange,
  onClearFilters,
}: HumanReviewQueueUIProps) {
  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'pass':
        return <CheckCircle size={16} style={{ color: '#10b981' }} />;
      case 'fail':
        return <XCircle size={16} style={{ color: '#ef4444' }} />;
      case 'inconclusive':
        return <AlertTriangle size={16} style={{ color: '#f59e0b' }} />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div style={pageStyles.loadingContainer}>
        <p>Loading review queue...</p>
      </div>
    );
  }

  return (
    <div style={pageStyles.container}>
      {/* Back button */}
      <button style={pageStyles.backButton} onClick={onBackClick}>
        <ArrowLeft size={16} />
        <span>Back to Queues</span>
      </button>

      {/* Header */}
      <div style={pageStyles.header}>
        <div>
          <h1 style={pageStyles.title}>Human Review Queue</h1>
          <p style={pageStyles.subtitle}>
            Review inconclusive AI verdicts and make final decisions
          </p>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={pageStyles.errorBanner}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Bar */}
      {stats && (
        <div style={pageStyles.statsContainer}>
          <div style={pageStyles.statCard}>
            <div style={{ ...pageStyles.statIcon, backgroundColor: '#fef3c7' }}>
              <AlertTriangle size={24} style={{ color: '#92400e' }} />
            </div>
            <div>
              <div style={pageStyles.statValue}>{stats.pending}</div>
              <div style={pageStyles.statLabel}>Pending Review</div>
            </div>
          </div>

          <div style={pageStyles.statCard}>
            <div style={{ ...pageStyles.statIcon, backgroundColor: '#d1fae5' }}>
              <CheckCircle size={24} style={{ color: '#065f46' }} />
            </div>
            <div>
              <div style={pageStyles.statValue}>{stats.completed}</div>
              <div style={pageStyles.statLabel}>Reviewed</div>
            </div>
          </div>

          <div style={pageStyles.statCard}>
            <div style={{ ...pageStyles.statIcon, backgroundColor: '#e0e7ff' }}>
              <AlertCircle size={24} style={{ color: '#4338ca' }} />
            </div>
            <div>
              <div style={pageStyles.statValue}>{stats.total}</div>
              <div style={pageStyles.statLabel}>Total</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <ReviewFiltersBar
        availableQueueIds={availableQueueIds}
        selectedQueueId={selectedQueueId}
        selectedStatus={selectedStatus}
        onQueueIdChange={onQueueIdChange}
        onStatusChange={onStatusChange}
        onClearFilters={onClearFilters}
      />

      {/* Review Items List */}
      <div style={pageStyles.listContainer}>
        {reviewItems.length === 0 ? (
          <div style={pageStyles.emptyState}>
            <CheckCircle
              size={48}
              style={{ color: '#10b981', marginBottom: 16 }}
            />
            <h3 style={pageStyles.emptyTitle}>No items in review queue</h3>
            <p style={pageStyles.emptyText}>
              {selectedStatus === 'pending'
                ? 'All evaluations are clear! No pending reviews at the moment.'
                : 'No items match your current filters.'}
            </p>
          </div>
        ) : (
          <div style={pageStyles.itemsList}>
            {reviewItems.map((item) => {
              // Find the question in the submission
              const question = item.questions.find(
                (q) => q.data.id === item.question_id
              );
              const answer = item.answers[item.question_id];

              return (
                <div key={item.id} style={pageStyles.reviewItem}>
                  <div style={pageStyles.itemHeader}>
                    <div style={pageStyles.itemHeaderLeft}>
                      <span style={pageStyles.queueBadge}>
                        Queue: {item.queue_id}
                      </span>
                    </div>
                    <div style={pageStyles.itemHeaderRight}>
                      <span style={pageStyles.timestamp}>
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div style={pageStyles.itemContent}>
                    <div style={pageStyles.questionSection}>
                      <h4 style={pageStyles.sectionTitle}>Question</h4>
                      <p style={pageStyles.questionText}>
                        {question?.data.questionText || item.question_id}
                      </p>
                      {question && (
                        <span style={pageStyles.questionType}>
                          Type: {question.data.questionType}
                        </span>
                      )}
                    </div>

                    <div style={pageStyles.answerSection}>
                      <h4 style={pageStyles.sectionTitle}>Human Answer</h4>
                      <pre style={pageStyles.answerText}>
                        {JSON.stringify(answer, null, 2)}
                      </pre>
                    </div>

                    <div style={pageStyles.verdictSection}>
                      <h4 style={pageStyles.sectionTitle}>AI Judge Verdict</h4>
                      <div style={pageStyles.verdictRow}>
                        <div style={pageStyles.verdictBadge}>
                          {getVerdictIcon(item.ai_verdict)}
                          <span style={pageStyles.verdictText}>
                            {item.ai_verdict.toUpperCase()}
                          </span>
                        </div>
                        <span style={pageStyles.judgeName}>
                          by {item.judge_name}
                        </span>
                      </div>
                      <p style={pageStyles.reasoning}>{item.ai_reasoning}</p>
                    </div>
                  </div>

                  <div style={pageStyles.itemFooter}>
                    <button
                      onClick={() => onReviewClick(item)}
                      style={pageStyles.reviewButton}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#4338ca';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#4f46e5';
                      }}
                    >
                      Review Now →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showModal && selectedItem && (
        <ReviewModal
          item={selectedItem}
          onClose={onModalClose}
          onComplete={onReviewComplete}
        />
      )}
    </div>
  );
}

// Styles
const pageStyles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '0 24px 40px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '48px',
    color: '#6b7280',
    fontSize: '14px',
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
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '32px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
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
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '12px',
    marginBottom: '24px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    transition: 'box-shadow 0.15s',
  },
  statIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  statValue: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827',
    lineHeight: 1,
  },
  statLabel: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '4px',
  },
  listContainer: {
    marginTop: '24px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 32px',
    textAlign: 'center' as const,
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: '0 0 8px 0',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  reviewItem: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    backgroundColor: '#fff',
    transition: 'all 0.15s',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    paddingBottom: '12px',
    borderBottom: '1px solid #e5e7eb',
  },
  itemHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  itemHeaderRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  queueBadge: {
    padding: '4px 12px',
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: '500',
  },
  timestamp: {
    fontSize: '13px',
    color: '#6b7280',
  },
  itemContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    marginBottom: '16px',
  },
  questionSection: {
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  answerSection: {
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  verdictSection: {
    padding: '12px',
    backgroundColor: 'white',
    borderRadius: '6px',
    border: '1px solid #e5e7eb',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    margin: '0 0 8px 0',
  },
  questionText: {
    fontSize: '15px',
    color: '#111827',
    margin: '0 0 8px 0',
    lineHeight: '1.5',
  },
  questionType: {
    fontSize: '12px',
    color: '#6b7280',
    fontStyle: 'italic' as const,
  },
  answerText: {
    fontSize: '13px',
    color: '#374151',
    margin: 0,
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  verdictRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '8px',
  },
  verdictBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    backgroundColor: '#fef3c7',
    borderRadius: '12px',
  },
  verdictText: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#92400e',
  },
  judgeName: {
    fontSize: '13px',
    color: '#6b7280',
  },
  reasoning: {
    fontSize: '14px',
    color: '#374151',
    margin: 0,
    lineHeight: '1.5',
  },
  itemFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingTop: '12px',
    borderTop: '1px solid #e5e7eb',
  },
  reviewButton: {
    padding: '10px 20px',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
} as const;
