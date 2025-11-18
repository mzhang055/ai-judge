/**
 * ResultsPage - Display and filter evaluation results
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import {
  getLatestEvaluationRun,
  getEvaluationsByRun,
  getEvaluationRuns,
} from '../services/evaluationService';
import { getQueueQuestions } from '../services/queueService';
import { listJudges } from '../services/judgeService';
import { getErrorMessage } from '../lib/errors';
import { RunHistorySidebar } from '../components/results/RunHistorySidebar';
import { PassRateCard } from '../components/results/PassRateCard';
import { PassRateChart } from '../components/results/PassRateChart';
import { FiltersBar } from '../components/results/FiltersBar';
import { ResultsTable } from '../components/results/ResultsTable';
import { styles } from './ResultsPage.styles';
import type { Evaluation, EvaluationRun, Judge } from '../types';
import type { QuestionInfo } from '../services/queueService';

export function ResultsPage() {
  const { queueId } = useParams<{ queueId: string }>();
  const navigate = useNavigate();

  // Data states
  const [currentRun, setCurrentRun] = useState<EvaluationRun | null>(null);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [allRuns, setAllRuns] = useState<EvaluationRun[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [questions, setQuestions] = useState<QuestionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedJudges, setSelectedJudges] = useState<Set<string>>(new Set());
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [selectedVerdict, setSelectedVerdict] = useState<
    'all' | 'pass' | 'fail' | 'inconclusive'
  >('all');
  const [selectedReviewStatus, setSelectedReviewStatus] = useState<
    'all' | 'ai_only' | 'human_reviewed'
  >('all');
  const [selectedHumanVerdict, setSelectedHumanVerdict] = useState<
    | 'all'
    | 'pass'
    | 'fail'
    | 'bad_data'
    | 'ambiguous_question'
    | 'insufficient_context'
  >('all');

  // Load data
  useEffect(() => {
    const loadData = async () => {
      if (!queueId) return;

      try {
        setLoading(true);
        setError(null);

        // Load latest run, all runs, judges, and questions
        const [latestRun, runs, judgesData, questionsData] = await Promise.all([
          getLatestEvaluationRun(queueId),
          getEvaluationRuns(queueId),
          listJudges(),
          getQueueQuestions(queueId),
        ]);

        setCurrentRun(latestRun);
        setAllRuns(runs);
        setJudges(judgesData);
        setQuestions(questionsData);

        // Load evaluations for latest run
        if (latestRun) {
          const evaluationsData = await getEvaluationsByRun(latestRun.id);
          setEvaluations(evaluationsData);
        } else {
          setEvaluations([]);
        }
      } catch (err) {
        setError(getErrorMessage(err, 'Failed to load evaluation results'));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [queueId]);

  // Load evaluations when switching runs
  const switchToRun = async (run: EvaluationRun) => {
    if (run.id === currentRun?.id) return; // Already viewing this run

    try {
      setLoading(true);
      setError(null);
      console.log('[ResultsPage] Switching to run:', run.id);
      const evaluationsData = await getEvaluationsByRun(run.id);
      console.log(
        '[ResultsPage] Loaded evaluations:',
        evaluationsData.length,
        evaluationsData
      );
      setEvaluations(evaluationsData);
      setCurrentRun(run);
      // Keep history panel open for easy navigation
      // Clear filters when switching runs
      clearAllFilters();
    } catch (err) {
      console.error('[ResultsPage] Error switching to run:', err);
      setError(getErrorMessage(err, 'Failed to load evaluations for this run'));
    } finally {
      setLoading(false);
    }
  };

  // Filter evaluations
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((evaluation) => {
      // Filter by judge
      if (selectedJudges.size > 0 && !selectedJudges.has(evaluation.judge_id)) {
        return false;
      }

      // Filter by question
      if (
        selectedQuestions.size > 0 &&
        !selectedQuestions.has(evaluation.question_id)
      ) {
        return false;
      }

      // Filter by AI verdict
      if (selectedVerdict !== 'all' && evaluation.verdict !== selectedVerdict) {
        return false;
      }

      // Filter by review status
      const hasHumanReview =
        evaluation.review_status === 'completed' && evaluation.human_verdict;
      if (selectedReviewStatus === 'ai_only' && hasHumanReview) {
        return false;
      }
      if (selectedReviewStatus === 'human_reviewed' && !hasHumanReview) {
        return false;
      }

      // Filter by human verdict (only applies if human reviewed)
      if (selectedHumanVerdict !== 'all' && hasHumanReview) {
        if (evaluation.human_verdict !== selectedHumanVerdict) {
          return false;
        }
      }

      return true;
    });
  }, [
    evaluations,
    selectedJudges,
    selectedQuestions,
    selectedVerdict,
    selectedReviewStatus,
    selectedHumanVerdict,
  ]);

  // Calculate pass rate and stats
  // Use human verdict when available, fall back to AI verdict
  // Exclude bad_data from pass/fail calculations
  const { passRate, badDataCount, humanReviewedCount } = useMemo(() => {
    // Count bad data items
    const badData = filteredEvaluations.filter((e) => {
      const hasHumanReview = e.review_status === 'completed' && e.human_verdict;
      return hasHumanReview && e.human_verdict === 'bad_data';
    }).length;

    // Count human reviewed items
    const humanReviewed = filteredEvaluations.filter((e) => {
      return e.review_status === 'completed' && e.human_verdict;
    }).length;

    // Filter out items marked as bad_data by human review
    const validEvaluations = filteredEvaluations.filter((e) => {
      const hasHumanReview = e.review_status === 'completed' && e.human_verdict;
      if (hasHumanReview && e.human_verdict === 'bad_data') {
        return false; // Exclude bad_data from stats
      }
      return true;
    });

    if (validEvaluations.length === 0) {
      return {
        passRate: 0,
        badDataCount: badData,
        humanReviewedCount: humanReviewed,
      };
    }

    // Count passes - use human verdict if available, otherwise AI verdict
    const passCount = validEvaluations.filter((e) => {
      const hasHumanReview = e.review_status === 'completed' && e.human_verdict;
      if (hasHumanReview) {
        return e.human_verdict === 'pass';
      }
      return e.verdict === 'pass';
    }).length;

    const rate = Math.round((passCount / validEvaluations.length) * 100);
    return {
      passRate: rate,
      badDataCount: badData,
      humanReviewedCount: humanReviewed,
    };
  }, [filteredEvaluations]);

  // Toggle filter selections
  const toggleJudgeFilter = (judgeId: string) => {
    setSelectedJudges((prev) => {
      const next = new Set(prev);
      if (next.has(judgeId)) {
        next.delete(judgeId);
      } else {
        next.add(judgeId);
      }
      return next;
    });
  };

  const toggleQuestionFilter = (questionId: string) => {
    setSelectedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const clearAllFilters = () => {
    setSelectedJudges(new Set());
    setSelectedQuestions(new Set());
    setSelectedVerdict('all');
    setSelectedReviewStatus('all');
    setSelectedHumanVerdict('all');
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading evaluation results...</p>
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
    <div style={styles.pageWrapper}>
      {/* Page Header - Full Width */}
      <div style={styles.pageHeader}>
        <div style={styles.pageHeaderContent}>
          <button
            style={styles.backButton}
            onClick={() => navigate(`/queues/${queueId}`)}
          >
            <ArrowLeft size={18} />
            <span>Back to Queue</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Content Wrapper */}
      <div style={styles.contentWrapper}>
        {/* Left Sidebar - Run History */}
        <RunHistorySidebar
          runs={allRuns}
          currentRunId={currentRun?.id || null}
          onRunSelect={switchToRun}
          currentRunEvaluations={evaluations}
          currentRunPassRate={passRate}
        />

        {/* Main Content */}
        <div style={styles.mainContentContainer}>
          <div style={styles.mainContent}>
            {/* Page Title */}
            <h1 style={styles.mainTitle}>Evaluation Results</h1>

            {/* Pass Rate Display */}
            <PassRateCard
              passRate={passRate}
              totalEvaluations={filteredEvaluations.length}
              badDataCount={badDataCount}
              humanReviewedCount={humanReviewedCount}
              currentRun={currentRun}
              allRuns={allRuns}
            />

            {/* Charts */}
            {evaluations.length > 0 && (
              <PassRateChart
                evaluations={filteredEvaluations}
                judges={judges}
              />
            )}

            {/* Filters */}
            <FiltersBar
              judges={judges}
              questions={questions}
              selectedJudges={selectedJudges}
              selectedQuestions={selectedQuestions}
              selectedVerdict={selectedVerdict}
              selectedReviewStatus={selectedReviewStatus}
              selectedHumanVerdict={selectedHumanVerdict}
              onToggleJudge={toggleJudgeFilter}
              onToggleQuestion={toggleQuestionFilter}
              onVerdictChange={setSelectedVerdict}
              onReviewStatusChange={setSelectedReviewStatus}
              onHumanVerdictChange={setSelectedHumanVerdict}
              onClearFilters={clearAllFilters}
            />

            {/* Results Table */}
            <ResultsTable
              evaluations={filteredEvaluations}
              hasNoEvaluations={evaluations.length === 0}
              currentRun={currentRun}
              allRuns={allRuns}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
