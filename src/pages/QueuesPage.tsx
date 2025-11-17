/**
 * QueuesPage - List all queues with submission counts
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Folder,
  AlertCircle,
  ChevronRight,
  Settings,
  ArrowLeft,
} from 'lucide-react';
import { listQueues, type QueueSummary } from '../services/queueService';

export function QueuesPage() {
  const navigate = useNavigate();
  const [queues, setQueues] = useState<QueueSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQueues();
  }, []);

  const loadQueues = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listQueues();
      setQueues(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queues');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p style={styles.loadingText}>Loading queues...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Back button */}
      <button style={styles.backButton} onClick={() => navigate('/')}>
        <ArrowLeft size={16} />
        <span>Back to Data Ingestion</span>
      </button>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Queues</h1>
          <p style={styles.subtitle}>
            View and manage submission queues for evaluation
          </p>
        </div>
        <button style={styles.manageButton} onClick={() => navigate('/judges')}>
          <Settings size={16} />
          <span>Manage Judges</span>
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Queue list */}
      {queues.length === 0 ? (
        <div style={styles.emptyContainer}>
          <Folder size={48} strokeWidth={1.5} style={styles.emptyIcon} />
          <h3 style={styles.emptyTitle}>No queues yet</h3>
          <p style={styles.emptyText}>
            Upload submissions to create your first queue
          </p>
          <button style={styles.uploadButton} onClick={() => navigate('/')}>
            Go to Data Ingestion
          </button>
        </div>
      ) : (
        <div style={styles.queueList}>
          {queues.map((queue) => (
            <button
              key={queue.queue_id}
              style={styles.queueCard}
              onClick={() => navigate(`/queues/${queue.queue_id}`)}
            >
              <div style={styles.queueIcon}>
                <Folder size={24} />
              </div>
              <div style={styles.queueInfo}>
                <h3 style={styles.queueName}>{queue.queue_id}</h3>
                <div style={styles.queueMeta}>
                  <span style={styles.submissionCount}>
                    {queue.submission_count} submission
                    {queue.submission_count !== 1 ? 's' : ''}
                  </span>
                  <span style={styles.dot}>•</span>
                  <span style={styles.uploadDate}>
                    Latest: {formatDate(queue.latest_upload)}
                  </span>
                </div>
              </div>
              <ChevronRight size={20} style={styles.chevron} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 24px 40px',
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
  loadingContainer: {
    padding: '48px',
    textAlign: 'center',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '14px',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '24px',
    marginBottom: '32px',
  },
  manageButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#4f46e5',
    backgroundColor: '#fff',
    border: '1px solid #e0e7ff',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    flexShrink: 0,
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
  emptyContainer: {
    padding: '64px 32px',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  emptyIcon: {
    color: '#d1d5db',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '24px',
  },
  uploadButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#4f46e5',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  queueList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  queueCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'left' as const,
    width: '100%',
  },
  queueIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    backgroundColor: '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#6b7280',
  },
  queueInfo: {
    flex: 1,
  },
  queueName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '6px',
  },
  queueMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#6b7280',
  },
  submissionCount: {
    fontWeight: 500,
  },
  dot: {
    color: '#d1d5db',
  },
  uploadDate: {},
  chevron: {
    color: '#9ca3af',
  },
};
