/**
 * QueuePage - Display queue details and assign judges to questions
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { JudgeAssignment } from '../components/JudgeAssignment';
import { getErrorMessage } from '../lib/errors';
import {
  getQueueSubmissions,
  getQueueQuestions,
  type QuestionInfo,
} from '../services/queueService';
import type { StoredSubmission } from '../types';

export function QueuePage() {
  const { queueId } = useParams<{ queueId: string }>();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<StoredSubmission[]>([]);
  const [questions, setQuestions] = useState<QuestionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueueData = useCallback(async () => {
    if (!queueId) return;

    try {
      setLoading(true);
      setError(null);
      const [submissionsData, questionsData] = await Promise.all([
        getQueueSubmissions(queueId),
        getQueueQuestions(queueId),
      ]);
      setSubmissions(submissionsData);
      setQuestions(questionsData);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load queue'));
    } finally {
      setLoading(false);
    }
  }, [queueId]);

  useEffect(() => {
    if (queueId) {
      loadQueueData();
    }
  }, [queueId, loadQueueData]);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading queue...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <div style={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
        <button style={styles.backButton} onClick={() => navigate('/queues')}>
          <ArrowLeft size={16} />
          Back to Queues
        </button>
      </div>
    );
  }

  if (!queueId) {
    return (
      <div style={styles.container}>
        <p>Queue not found</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backButton} onClick={() => navigate('/queues')}>
          <ArrowLeft size={16} />
          <span>Back to Queues</span>
        </button>
        <div style={styles.titleSection}>
          <h1 style={styles.title}>Queue: {queueId}</h1>
          <p style={styles.subtitle}>
            {submissions.length} submission{submissions.length !== 1 ? 's' : ''}{' '}
            • {questions.length} question{questions.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Questions and Judge Assignments */}
      <div style={styles.content}>
        <h2 style={styles.sectionTitle}>Assign Judges to Questions</h2>
        <p style={styles.sectionSubtitle}>
          Select which AI judges should evaluate each question in this queue
        </p>

        {questions.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No questions found in this queue</p>
          </div>
        ) : (
          <div style={styles.questionList}>
            {questions.map((question) => (
              <JudgeAssignment
                key={question.id}
                queueId={queueId}
                questionId={question.id}
                questionText={question.text}
              />
            ))}
          </div>
        )}
      </div>
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
  loadingContainer: {
    padding: '48px',
    textAlign: 'center',
    color: '#6b7280',
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
  header: {
    marginBottom: '32px',
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
  titleSection: {
    marginBottom: '8px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 8px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  content: {
    marginTop: '32px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '8px',
  },
  sectionSubtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '24px',
  },
  emptyState: {
    padding: '48px',
    textAlign: 'center',
    color: '#9ca3af',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  questionList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
};
