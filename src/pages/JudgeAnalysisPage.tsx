/**
 * Individual Judge Analysis Page
 *
 * Detailed view of a single judge's performance with:
 * - Key metrics and trends
 * - Failure pattern analysis
 * - Auto-generated rubric improvement suggestions
 * - Recent disagreement examples
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lightbulb, Copy, X, Check, TrendingUp } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
  getJudgePerformanceMetrics,
  getDisagreementExamples,
  refreshJudgeMetrics,
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

  async function handleRefreshMetrics() {
    if (!judgeId) return;
    const fresh = await refreshJudgeMetrics(judgeId);
    setMetrics(fresh);
  }

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <p style={{ color: '#666' }}>Loading judge analysis...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div style={{ padding: '24px' }}>
        <button
          onClick={() => navigate('/judge-performance')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            marginBottom: '16px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: '#6366f1',
          }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>
        <p style={{ color: '#666' }}>
          No metrics available for this judge yet.
        </p>
      </div>
    );
  }

  const disagreementPct = (metrics.disagreement_rate * 100).toFixed(1);

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <button
        onClick={() => navigate('/judge-performance')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          marginBottom: '24px',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          color: '#6366f1',
          fontSize: '14px',
        }}
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      <div style={{ marginBottom: '32px' }}>
        <h1
          style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}
        >
          {judgeName} - Performance Analysis
        </h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Detailed metrics and improvement suggestions
          </p>
          <button
            onClick={handleRefreshMetrics}
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              background: '#fff',
              cursor: 'pointer',
              color: '#6366f1',
            }}
          >
            Refresh Metrics
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <StatBadge
          label="Total Evaluations"
          value={metrics.total_evaluations}
        />
        <StatBadge
          label="Human Reviewed"
          value={metrics.human_reviewed_count}
        />
        <StatBadge
          label="Disagreements"
          value={`${metrics.disagreement_count} (${disagreementPct}%)`}
        />
      </div>

      {/* Pass Rate Chart */}
      <PassRateChart data={passRateData} metrics={metrics} />

      {/* Auto-Generated Suggestions */}
      <div style={{ marginBottom: '32px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}
        >
          <h2 style={{ fontSize: '20px', fontWeight: '600' }}>
            Auto-Generated Suggestions ({suggestions.length})
          </h2>
          <button
            onClick={handleGenerateSuggestions}
            disabled={generating}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              border: 'none',
              borderRadius: '6px',
              background: generating ? '#e5e7eb' : '#6366f1',
              color: '#fff',
              cursor: generating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Lightbulb size={16} />
            {generating ? 'Generating...' : 'Generate New Suggestions'}
          </button>
        </div>

        {suggestions.length === 0 ? (
          <div
            style={{
              padding: '32px',
              backgroundColor: '#f9fafb',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              textAlign: 'center',
            }}
          >
            <p style={{ color: '#666' }}>
              No suggestions available. Click "Generate New Suggestions" to
              analyze human reviews.
            </p>
          </div>
        ) : (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
          >
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                suggestion={suggestion}
                judgeId={judgeId!}
                onApply={async () => {
                  await applySuggestion(suggestion.id);
                  loadData();
                }}
                onDismiss={async () => {
                  await dismissSuggestion(suggestion.id);
                  loadData();
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Disagreements */}
      {examples.length > 0 && (
        <div>
          <h2
            style={{
              fontSize: '20px',
              fontWeight: '600',
              marginBottom: '16px',
            }}
          >
            Recent Disagreements (AI vs Human)
          </h2>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {examples.map((example) => (
              <DisagreementCard key={example.evaluation_id} example={example} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatBadge({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div
      style={{
        padding: '12px 16px',
        backgroundColor: '#f9fafb',
        border: '1px solid #e5e7eb',
        borderRadius: '6px',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>
        {label}
      </p>
      <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#111' }}>
        {value}
      </p>
    </div>
  );
}

function PassRateChart({
  data,
  metrics,
}: {
  data: PassRateDataPoint[];
  metrics: JudgePerformanceMetrics;
}) {
  if (data.length === 0) {
    return (
      <div
        style={{
          padding: '32px',
          backgroundColor: '#f9fafb',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          textAlign: 'center',
          marginBottom: '32px',
        }}
      >
        <p style={{ color: '#666' }}>
          No pass rate data available yet. Run some evaluations to see trends.
        </p>
      </div>
    );
  }

  // Transform data for recharts (convert to percentage)
  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    ai_pass_rate: Number((d.ai_pass_rate * 100).toFixed(1)),
    human_pass_rate: Number((d.human_pass_rate * 100).toFixed(1)),
    full_date: d.date,
  }));

  const aiPassPct = (metrics.ai_pass_rate * 100).toFixed(1);
  const humanPassPct = (metrics.human_pass_rate * 100).toFixed(1);
  const passRateGap = Math.abs(metrics.ai_pass_rate - metrics.human_pass_rate);
  const isConverging = passRateGap < 0.1;

  return (
    <div
      style={{
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        padding: '24px',
        marginBottom: '32px',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h3
          style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}
        >
          AI vs Human Pass Rate Over Time
        </h3>
        <p style={{ fontSize: '14px', color: '#666' }}>
          Compare AI and human verdict pass rates to identify disagreement
          patterns
        </p>
      </div>

      {/* Chart */}
      <div style={{ height: '300px', width: '100%', marginBottom: '16px' }}>
        <AreaChart
          data={chartData}
          margin={{
            left: 12,
            right: 12,
            top: 12,
            bottom: 12,
          }}
          width={800}
          height={300}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={32}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(value) => `${value}%`}
          />
          <Area
            dataKey="human_pass_rate"
            type="natural"
            fill="#10b981"
            fillOpacity={0.3}
            stroke="#10b981"
            strokeWidth={2}
            name="Human Pass Rate"
          />
          <Area
            dataKey="ai_pass_rate"
            type="natural"
            fill="#6366f1"
            fillOpacity={0.3}
            stroke="#6366f1"
            strokeWidth={2}
            name="AI Pass Rate"
          />
        </AreaChart>
      </div>

      {/* Footer */}
      <div
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'start',
          gap: '8px',
          fontSize: '14px',
          paddingTop: '16px',
          borderTop: '1px solid #e5e7eb',
        }}
      >
        <div style={{ display: 'grid', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '500',
            }}
          >
            {isConverging ? (
              <>
                AI and human pass rates are aligned{' '}
                <TrendingUp style={{ height: '16px', width: '16px' }} />
              </>
            ) : (
              <>
                {passRateGap > 0.2
                  ? 'Significant'
                  : passRateGap > 0.1
                    ? 'Moderate'
                    : 'Minor'}{' '}
                disagreement: AI {aiPassPct}% vs Human {humanPassPct}%
              </>
            )}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: '#666',
            }}
          >
            {data.length} day{data.length !== 1 ? 's' : ''} of evaluation data
          </div>
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onApply,
  onDismiss,
  judgeId,
}: {
  suggestion: RubricSuggestion;
  onApply: () => void;
  onDismiss: () => void;
  judgeId: string;
}) {
  const [copied, setCopied] = useState(false);
  const [applying, setApplying] = useState(false);

  const confidencePct = (suggestion.confidence_score * 100).toFixed(0);
  const confidenceLabel =
    suggestion.confidence_score > 0.7
      ? 'HIGH'
      : suggestion.confidence_score > 0.4
        ? 'MEDIUM'
        : 'LOW';

  function copyToClipboard() {
    // Extract the suggested text from the suggestion
    const lines = suggestion.suggestion_text.split('\n');
    const suggestedTextIndex = lines.findIndex((line) =>
      line.includes('Consider adding')
    );
    const suggestedText =
      suggestedTextIndex >= 0
        ? lines.slice(suggestedTextIndex + 1).join('\n')
        : '';

    navigator.clipboard.writeText(suggestedText.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function applyChanges() {
    try {
      setApplying(true);

      // Fetch current judge
      const { data: judge, error: fetchError } = await supabase
        .from('judges')
        .select('system_prompt')
        .eq('id', judgeId)
        .single();

      if (fetchError) throw fetchError;

      // Append suggestion to system prompt
      const updatedPrompt = `${judge.system_prompt}\n\n${suggestion.suggestion_text}`;

      // Update judge
      const { error: updateError } = await supabase
        .from('judges')
        .update({
          system_prompt: updatedPrompt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', judgeId);

      if (updateError) throw updateError;

      // Mark suggestion as applied
      await onApply();

      toast.success('Judge prompt updated successfully!');
    } catch (error) {
      console.error('Error applying changes:', error);
      toast.error('Failed to update judge prompt');
    } finally {
      setApplying(false);
    }
  }

  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: '#fff',
        border: `2px solid ${
          suggestion.confidence_score > 0.7 ? '#f59e0b' : '#e5e7eb'
        }`,
        borderRadius: '8px',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          marginBottom: '16px',
        }}
      >
        <div
          style={{
            padding: '8px 12px',
            backgroundColor:
              suggestion.confidence_score > 0.7 ? '#fef3c7' : '#e0e7ff',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '600',
            color: suggestion.confidence_score > 0.7 ? '#f59e0b' : '#6366f1',
          }}
        >
          {confidenceLabel} CONFIDENCE ({confidencePct}%)
        </div>
        <div style={{ flex: 1 }}>
          <h3
            style={{ fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}
          >
            {suggestion.suggestion_type.replace(/_/g, ' ').toUpperCase()}
          </h3>
          <p style={{ fontSize: '12px', color: '#666' }}>
            Based on {suggestion.evidence_count} supporting review
            {suggestion.evidence_count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Suggestion Text */}
      <div
        style={{
          padding: '16px',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
          marginBottom: '16px',
          whiteSpace: 'pre-wrap',
          fontSize: '14px',
          lineHeight: '1.6',
        }}
      >
        {suggestion.suggestion_text}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onDismiss}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            background: '#fff',
            cursor: 'pointer',
            color: '#666',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <X size={16} /> Dismiss
        </button>
        <button
          onClick={copyToClipboard}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            background: '#fff',
            cursor: 'pointer',
            color: '#6366f1',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied!' : 'Copy Suggestion'}
        </button>
        <button
          onClick={applyChanges}
          disabled={applying}
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            border: 'none',
            borderRadius: '6px',
            background: applying ? '#9ca3af' : '#6366f1',
            cursor: applying ? 'not-allowed' : 'pointer',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Check size={16} /> {applying ? 'Applying...' : 'Apply Changes'}
        </button>
      </div>
    </div>
  );
}

function DisagreementCard({ example }: { example: DisagreementExample }) {
  return (
    <div
      style={{
        padding: '16px',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
      }}
    >
      <div style={{ marginBottom: '12px' }}>
        <p style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
          {example.question_text}
        </p>
        <p style={{ fontSize: '12px', color: '#666' }}>
          Answer: {JSON.stringify(example.answer)}
        </p>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}
      >
        {/* AI Verdict */}
        <div>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
              marginBottom: '8px',
              backgroundColor:
                example.ai_verdict === 'pass'
                  ? '#d1fae5'
                  : example.ai_verdict === 'fail'
                    ? '#fee2e2'
                    : '#fef3c7',
              color:
                example.ai_verdict === 'pass'
                  ? '#065f46'
                  : example.ai_verdict === 'fail'
                    ? '#991b1b'
                    : '#92400e',
            }}
          >
            AI: {example.ai_verdict.toUpperCase()}
          </div>
          <p style={{ fontSize: '13px', color: '#666' }}>
            {example.ai_reasoning}
          </p>
        </div>

        {/* Human Verdict */}
        <div>
          <div
            style={{
              display: 'inline-block',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '600',
              marginBottom: '8px',
              backgroundColor:
                example.human_verdict === 'pass'
                  ? '#d1fae5'
                  : example.human_verdict === 'fail'
                    ? '#fee2e2'
                    : '#fef3c7',
              color:
                example.human_verdict === 'pass'
                  ? '#065f46'
                  : example.human_verdict === 'fail'
                    ? '#991b1b'
                    : '#92400e',
            }}
          >
            HUMAN: {example.human_verdict.toUpperCase()}
          </div>
          <p style={{ fontSize: '13px', color: '#666' }}>
            {example.human_reasoning}
          </p>
          <p style={{ fontSize: '11px', color: '#999', marginTop: '8px' }}>
            Reviewed by {example.reviewed_by}
          </p>
        </div>
      </div>
    </div>
  );
}
