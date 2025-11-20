/**
 * QueuePage - Container component (logic only)
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { QueuePageUI } from '../components/ui/QueuePageUI';
import { getErrorMessage } from '../lib/errors';
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
    setProgress({ total: 0, completed: 0, failed: 0 });
    setShowResults(false);
    setError(null);

    try {
      const result = await runEvaluations(queueId, (prog) => {
        setProgress(prog);
      });

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

  const handleBackToQueues = () => {
    navigate('/queues');
  };

  const handleViewResults = () => {
    navigate(`/queues/${queueId}/results`);
  };

  const handleCloseResults = () => {
    setShowResults(false);
  };

  return (
    <QueuePageUI
      queueId={queueId}
      submissions={submissions}
      questions={questions}
      loading={loading}
      error={error}
      isRunning={isRunning}
      progress={progress}
      showResults={showResults}
      onBackToQueues={handleBackToQueues}
      onRunEvaluations={handleRunEvaluations}
      onViewResults={handleViewResults}
      onCloseResults={handleCloseResults}
    />
  );
}
