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

      // Filter by verdict
      if (selectedVerdict !== 'all' && evaluation.verdict !== selectedVerdict) {
        return false;
      }

      return true;
    });
  }, [evaluations, selectedJudges, selectedQuestions, selectedVerdict]);

  // Calculate pass rate
  const passRate = useMemo(() => {
    if (filteredEvaluations.length === 0) return 0;
    const passCount = filteredEvaluations.filter(
      (e) => e.verdict === 'pass'
    ).length;
    return Math.round((passCount / filteredEvaluations.length) * 100);
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
              onToggleJudge={toggleJudgeFilter}
              onToggleQuestion={toggleQuestionFilter}
              onVerdictChange={setSelectedVerdict}
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
