/**
 * HumanReviewQueue - Page for reviewing evaluations flagged as inconclusive
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import toast from 'react-hot-toast';
import logo from '../assets/besimple-logo.png';
import { getErrorMessage } from '../lib/errors';
import {
  getReviewQueue,
  getReviewQueueStats,
  getReviewQueueIds,
  type ReviewQueueStats,
} from '../services/humanReviewService';
import { ReviewModal } from '../components/ReviewModal';
import type { HumanReviewQueueItemWithContext, QueueStatus } from '../types';

export function HumanReviewQueue() {
  const navigate = useNavigate();
  const [reviewItems, setReviewItems] = useState<
    HumanReviewQueueItemWithContext[]
  >([]);
  const [stats, setStats] = useState<ReviewQueueStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] =
    useState<HumanReviewQueueItemWithContext | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<QueueStatus | ''>(
    'pending'
  );
  const [availableQueueIds, setAvailableQueueIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const loadReviewQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: {
        queueId?: string;
        status?: QueueStatus;
      } = {};

      if (selectedQueueId) {
        filters.queueId = selectedQueueId;
      }

      if (selectedStatus) {
        filters.status = selectedStatus as QueueStatus;
      }

      const [items, queueStats, queueIds] = await Promise.all([
        getReviewQueue(filters),
        getReviewQueueStats(selectedQueueId || undefined),
        getReviewQueueIds(),
      ]);

      setReviewItems(items);
      setStats(queueStats);
      setAvailableQueueIds(queueIds);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load review queue'));
      toast.error(getErrorMessage(err, 'Failed to load review queue'));
    } finally {
      setLoading(false);
    }
  }, [selectedQueueId, selectedStatus]);

  useEffect(() => {
    loadReviewQueue();
  }, [loadReviewQueue]);

  const handleReviewClick = (item: HumanReviewQueueItemWithContext) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleReviewComplete = () => {
    setShowModal(false);
    setSelectedItem(null);
    loadReviewQueue(); // Reload to update stats and list
    toast.success('Review submitted successfully!');
  };

  const handleModalClose = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

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
      {/* Header */}
      <header style={pageStyles.header}>
        <div style={pageStyles.headerLeft}>
          <img src={logo} alt="BeSimple" style={pageStyles.logo} />
          <h1 style={pageStyles.title}>Human Review Queue</h1>
        </div>
        <button
          onClick={() => navigate('/')}
          style={pageStyles.backButton}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </button>
      </header>

      {/* Error display */}
      {error && (
        <div style={pageStyles.errorBanner}>
          <AlertCircle size={20} />
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
              <div style={pageStyles.statLabel}>Pending</div>
            </div>
          </div>

          <div style={pageStyles.statCard}>
            <div style={{ ...pageStyles.statIcon, backgroundColor: '#dbeafe' }}>
              <ClipboardList size={24} style={{ color: '#1e40af' }} />
            </div>
            <div>
              <div style={pageStyles.statValue}>{stats.in_progress}</div>
              <div style={pageStyles.statLabel}>In Progress</div>
            </div>
          </div>

          <div style={pageStyles.statCard}>
            <div style={{ ...pageStyles.statIcon, backgroundColor: '#d1fae5' }}>
              <CheckCircle size={24} style={{ color: '#065f46' }} />
            </div>
            <div>
              <div style={pageStyles.statValue}>{stats.completed}</div>
              <div style={pageStyles.statLabel}>Completed</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={pageStyles.filtersSection}>
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={pageStyles.filterToggle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'white';
          }}
        >
          <Filter size={16} />
          <span>Filters</span>
          {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showFilters && (
          <div style={pageStyles.filtersContainer}>
            <div style={pageStyles.filterGroup}>
              <label style={pageStyles.filterLabel}>Queue ID:</label>
              <select
                value={selectedQueueId}
                onChange={(e) => setSelectedQueueId(e.target.value)}
                style={pageStyles.filterSelect}
              >
                <option value="">All Queues</option>
                {availableQueueIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </div>

            <div style={pageStyles.filterGroup}>
              <label style={pageStyles.filterLabel}>Status:</label>
              <select
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(e.target.value as QueueStatus | '')
                }
                style={pageStyles.filterSelect}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        )}
      </div>

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
                      onClick={() => handleReviewClick(item)}
                      style={pageStyles.reviewButton}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#2563eb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#3b82f6';
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
          onClose={handleModalClose}
          onComplete={handleReviewComplete}
        />
      )}
    </div>
  );
}

// Import from lucide-react for stats icons
import { ClipboardList } from 'lucide-react';

// Styles
const pageStyles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    padding: '20px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '18px',
    color: '#6b7280',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  logo: {
    width: '40px',
    height: '40px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#991b1b',
    marginBottom: '20px',
  },
  statsContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#111827',
  },
  statLabel: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '4px',
  },
  filtersSection: {
    marginBottom: '20px',
  },
  filterToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    backgroundColor: 'white',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  filtersContainer: {
    display: 'flex',
    gap: '16px',
    padding: '16px',
    backgroundColor: 'white',
    borderRadius: '8px',
    marginTop: '12px',
    border: '1px solid #e5e7eb',
  },
  filterGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  filterLabel: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#374151',
  },
  filterSelect: {
    padding: '8px 12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#374151',
    backgroundColor: 'white',
    cursor: 'pointer',
  },
  listContainer: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center' as const,
  },
  emptyTitle: {
    fontSize: '20px',
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
    gap: '16px',
  },
  reviewItem: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '20px',
    backgroundColor: '#fafafa',
    transition: 'box-shadow 0.2s',
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
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
} as const;
