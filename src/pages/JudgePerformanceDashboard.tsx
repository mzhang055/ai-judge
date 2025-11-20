/**
 * Judge Performance Dashboard (Container)
 *
 * Logic layer for judge performance analytics - handles data fetching
 * and state management, delegates rendering to UI component.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllJudgesStats,
  type JudgeStats,
} from '../services/judgeAnalyticsService';
import { JudgePerformanceDashboardUI } from '../components/ui/JudgePerformanceDashboardUI';

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

  const handleNavigateToQueues = () => navigate('/queues');
  const handleNavigateToJudge = (judgeId: string) =>
    navigate(`/judge-performance/${judgeId}`);

  return (
    <JudgePerformanceDashboardUI
      stats={stats}
      loading={loading}
      error={error}
      totalEvaluations={totalEvaluations}
      totalHumanReviews={totalHumanReviews}
      avgDisagreementRate={avgDisagreementRate}
      onNavigateToQueues={handleNavigateToQueues}
      onNavigateToJudge={handleNavigateToJudge}
    />
  );
}
