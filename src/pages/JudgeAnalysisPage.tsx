/**
 * Individual Judge Analysis Page - Container
 *
 * Logic layer for judge analysis:
 * - Data fetching and state management
 * - Event handlers
 * - API calls
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getJudgePerformanceMetrics,
  getDisagreementExamples,
  getJudgePassRateByDate,
  type DisagreementExample,
  type PassRateDataPoint,
} from '../services/judgeAnalyticsService';
import {
  getSuggestions,
  applySuggestion,
  dismissSuggestion,
  generateSuggestions,
} from '../services/rubricAnalysisService';
import type { JudgePerformanceMetrics, RubricSuggestion } from '../types';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { JudgeAnalysisPageUI } from '../components/ui/JudgeAnalysisPageUI';

export default function JudgeAnalysisPage() {
  const { judgeId } = useParams<{ judgeId: string }>();
  const navigate = useNavigate();

  const [judgeName, setJudgeName] = useState<string>('');
  const [metrics, setMetrics] = useState<JudgePerformanceMetrics | null>(null);
  const [suggestions, setSuggestions] = useState<RubricSuggestion[]>([]);
  const [examples, setExamples] = useState<DisagreementExample[]>([]);
  const [passRateData, setPassRateData] = useState<PassRateDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (judgeId) {
      loadData();
    }
  }, [judgeId]);

  async function loadData() {
    if (!judgeId) return;

    try {
      setLoading(true);

      // Fetch judge name
      const { data: judge } = await supabase
        .from('judges')
        .select('name')
        .eq('id', judgeId)
        .single();

      if (judge) setJudgeName(judge.name);

      // Fetch metrics
      const metricsData = await getJudgePerformanceMetrics(judgeId);
      setMetrics(metricsData);

      // Fetch suggestions
      const suggestionsData = await getSuggestions(judgeId, 'pending');
      setSuggestions(suggestionsData);

      // Fetch examples
      const examplesData = await getDisagreementExamples(judgeId, 5);
      setExamples(examplesData);

      // Fetch pass rate data
      const passRateData = await getJudgePassRateByDate(judgeId);
      setPassRateData(passRateData);
    } catch (error) {
      console.error('Error loading judge analysis:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateSuggestions() {
    if (!judgeId) return;

    try {
      setGenerating(true);
      toast.loading('Analyzing human reviews...');
      const newSuggestions = await generateSuggestions(judgeId);
      toast.dismiss();

      if (newSuggestions.length === 0) {
        toast.error(
          'No suggestions generated. Need at least 1 human review with disagreement.'
        );
      } else {
        toast.success(
          `Generated ${newSuggestions.length} suggestion${newSuggestions.length !== 1 ? 's' : ''}`
        );
      }

      setSuggestions(newSuggestions);
    } catch (error) {
      toast.dismiss();
      console.error('Error generating suggestions:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to generate suggestions'
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleApplySuggestion(suggestionId: string) {
    await applySuggestion(suggestionId);
    loadData();
  }

  async function handleDismissSuggestion(suggestionId: string) {
    await dismissSuggestion(suggestionId);
    loadData();
  }

  return (
    <JudgeAnalysisPageUI
      judgeId={judgeId}
      judgeName={judgeName}
      metrics={metrics}
      suggestions={suggestions}
      examples={examples}
      passRateData={passRateData}
      loading={loading}
      generating={generating}
      onBack={() => navigate('/judge-performance')}
      onGenerateSuggestions={handleGenerateSuggestions}
      onApplySuggestion={handleApplySuggestion}
      onDismissSuggestion={handleDismissSuggestion}
    />
  );
}
