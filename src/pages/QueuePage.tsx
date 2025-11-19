/**
 * QueuePage - Display queue details and assign judges to questions
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  AlertCircle,
  Play,
  CheckCircle,
  XCircle,
  ClipboardList,
  BarChart3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { JudgeAssignment } from '../components/JudgeAssignment';
import { getErrorMessage } from '../lib/errors';
import logo from '../assets/besimple-logo.png';
import {
  getQueueSubmissions,
  getQueueQuestions,
  type QuestionInfo,
} from '../services/queueService';
import {
  runEvaluations,
  type EvaluationProgress,
} from '../services/evaluationService';
import type { StoredSubmission } from '../types';

export function QueuePage() {
  const { queueId } = useParams<{ queueId: string }>();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<StoredSubmission[]>([]);
  const [questions, setQuestions] = useState<QuestionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<EvaluationProgress | null>(null);
  const [showResults, setShowResults] = useState(false);

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

  const handleRunEvaluations = async () => {
    if (!queueId) return;

    setIsRunning(true);
    setProgress({ total: 0, completed: 0, failed: 0 }); // Initialize immediately
    setShowResults(false);
    setError(null);

    try {
      const result = await runEvaluations(queueId, (prog) => {
        setProgress(prog);
      });

      // Keep running state true briefly to show final progress
      await new Promise((resolve) => setTimeout(resolve, 500));
      setIsRunning(false);
      setShowResults(true);

      toast.success(
        `Evaluations complete! ${result.completed} succeeded, ${result.failed} failed.`
      );
    } catch (err) {
      const errorMessage = getErrorMessage(err, 'Failed to run evaluations');
      setError(errorMessage);
      toast.error(errorMessage);
      setIsRunning(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading queue...</p>
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
      {/* Error Banner */}
      {error && (
        <div style={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={styles.backButton} onClick={() => navigate('/queues')}>
            <ArrowLeft size={16} />
            <span>Back to Queues</span>
          </button>
        </div>
        <div style={styles.titleRow}>
          <div style={styles.titleSection}>
            <h1 style={styles.title}>Queue: {queueId}</h1>
            <p style={styles.subtitle}>
              {submissions.length} submission
              {submissions.length !== 1 ? 's' : ''} • {questions.length}{' '}
              question{questions.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div style={styles.actionButtons}>
            <button
              style={styles.resultsButton}
              onClick={() => navigate(`/queues/${queueId}/results`)}
            >
              <BarChart3 size={16} />
              <span>View Results</span>
            </button>
          </div>
        </div>
      </div>

      {/* Questions and Judge Assignments */}
      <div style={styles.content}>
        <div style={styles.sectionHeader}>
          <div>
            <h2 style={styles.sectionTitle}>Assign Judges to Questions</h2>
            <p style={styles.sectionSubtitle}>
              Select which AI judges should evaluate each question in this queue
            </p>
          </div>
          <button
            style={styles.runButton}
            onClick={handleRunEvaluations}
            disabled={isRunning || questions.length === 0}
          >
            <Play size={16} />
            <span>{isRunning ? 'Running...' : 'Run AI Judges'}</span>
          </button>
        </div>

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

      {/* Progress Modal */}
      {isRunning && progress && (
        <>
          <div style={styles.backdrop} />
          <div style={styles.progressModal}>
            <div style={styles.logoContainer}>
              <img src={logo} alt="BeSimple Logo" style={styles.spinningLogo} />
            </div>
            <h3 style={styles.progressTitle}>Evaluations in Progress</h3>
            <div style={styles.progressBar}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${progress.total > 0 ? ((progress.completed + progress.failed) / progress.total) * 100 : 0}%`,
                }}
              />
            </div>
            <p style={styles.progressText}>
              {progress.completed + progress.failed} of {progress.total}{' '}
              evaluations complete
            </p>
          </div>
        </>
      )}

      {/* Results Summary Modal */}
      {showResults && !isRunning && (
        <>
          <div style={styles.backdrop} onClick={() => setShowResults(false)} />
          <div style={styles.resultsModal}>
            <h3 style={styles.resultsTitle}>Evaluation Complete</h3>
            <div style={styles.resultsStats}>
              <div style={styles.resultsStat}>
                <ClipboardList size={24} color="#6b7280" />
                <div>
                  <span style={styles.resultsValue}>
                    {progress?.total || 0}
                  </span>
                  <span style={styles.resultsLabel}>Planned</span>
                </div>
              </div>
              <div style={styles.resultsStat}>
                <CheckCircle size={24} color="#10b981" />
                <div>
                  <span style={styles.resultsValue}>
                    {progress?.completed || 0}
                  </span>
                  <span style={styles.resultsLabel}>Completed</span>
                </div>
              </div>
              <div style={styles.resultsStat}>
                <XCircle size={24} color="#ef4444" />
                <div>
                  <span style={styles.resultsValue}>
                    {progress?.failed || 0}
                  </span>
                  <span style={styles.resultsLabel}>Failed</span>
                </div>
              </div>
            </div>
            <div style={styles.modalButtons}>
              <button
                style={styles.viewResultsButton}
                onClick={() => navigate(`/queues/${queueId}/results`)}
              >
                View Results
              </button>
              <button
                style={styles.closeButton}
                onClick={() => setShowResults(false)}
              >
                Close
              </button>
            </div>
          </div>
        </>
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
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '24px',
  },
  titleSection: {
    flex: 1,
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
  },
  resultsButton: {
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
  sectionHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '24px',
    gap: '24px',
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
    marginBottom: 0,
  },
  runButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#4f46e5',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
    flexShrink: 0,
  },
  backdrop: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  progressModal: {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    padding: '48px 32px 32px',
    width: '90%',
    maxWidth: '400px',
    zIndex: 1000,
    textAlign: 'center' as const,
  },
  logoContainer: {
    marginBottom: '24px',
    display: 'flex',
    justifyContent: 'center',
  },
  spinningLogo: {
    width: '80px',
    height: '80px',
    animation: 'spin 2s linear infinite',
  },
  progressTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '24px',
  },
  progressBar: {
    width: '100%',
    height: '8px',
    backgroundColor: '#e5e7eb',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '16px',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10b981',
    transition: 'width 0.3s ease',
  },
  progressStats: {
    display: 'flex',
    justifyContent: 'center',
    gap: '32px',
    marginBottom: '24px',
  },
  progressStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  progressLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
  },
  progressValue: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#111827',
  },
  progressDetails: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '8px',
    textAlign: 'center' as const,
  },
  progressText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  resultsModal: {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    padding: '32px',
    width: '90%',
    maxWidth: '400px',
    zIndex: 1000,
  },
  resultsTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '24px',
    textAlign: 'center' as const,
  },
  resultsStats: {
    display: 'flex',
    justifyContent: 'space-around',
    marginBottom: '32px',
  },
  resultsStat: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '12px',
  },
  resultsValue: {
    display: 'block',
    fontSize: '32px',
    fontWeight: 700,
    color: '#111827',
  },
  resultsLabel: {
    display: 'block',
    fontSize: '14px',
    color: '#6b7280',
  },
  modalButtons: {
    display: 'flex',
    gap: '12px',
  },
  viewResultsButton: {
    flex: 1,
    padding: '12px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#10b981',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  closeButton: {
    flex: 1,
    padding: '12px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
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
