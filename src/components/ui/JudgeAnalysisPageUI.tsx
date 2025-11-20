/**
 * Individual Judge Analysis Page - UI
 *
 * Presentation layer for judge analysis:
 * - JSX rendering
 * - Inline styles
 * - UI components
 */

import { useState } from 'react';
import {
  ArrowLeft,
  Lightbulb,
  Copy,
  X,
  Check,
  MessageSquare,
  Bot,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent } from './card';
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from './chart';
import type { JudgePerformanceMetrics, RubricSuggestion } from '../../types';
import {
  type DisagreementExample,
  type PassRateDataPoint,
} from '../../services/judgeAnalyticsService';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

interface JudgeAnalysisPageUIProps {
  judgeId?: string;
  judgeName: string;
  metrics: JudgePerformanceMetrics | null;
  suggestions: RubricSuggestion[];
  examples: DisagreementExample[];
  passRateData: PassRateDataPoint[];
  loading: boolean;
  generating: boolean;
  onBack: () => void;
  onGenerateSuggestions: () => void;
  onApplySuggestion: (suggestionId: string) => void;
  onDismissSuggestion: (suggestionId: string) => void;
}

export function JudgeAnalysisPageUI({
  judgeId,
  judgeName,
  metrics,
  suggestions,
  examples,
  passRateData,
  loading,
  generating,
  onBack,
  onGenerateSuggestions,
  onApplySuggestion,
  onDismissSuggestion,
}: JudgeAnalysisPageUIProps) {
  if (loading) {
    return (
      <div
        style={{
          padding: '40px 32px',
          maxWidth: '1200px',
          margin: '0 auto',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            padding: '80px 24px',
            backgroundColor: 'rgba(249, 250, 251, 0.5)',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              margin: '0 auto 16px',
              border: '3px solid rgba(237, 164, 54, 0.2)',
              borderTopColor: '#EDA436',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <p style={{ color: '#6b7280', fontSize: '15px', fontWeight: '500' }}>
            Loading judge analysis...
          </p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div
        style={{
          padding: '40px 32px',
          maxWidth: '1200px',
          margin: '0 auto',
          minHeight: '100vh',
        }}
      >
        <button
          onClick={onBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            marginBottom: '32px',
            border: 'none',
            background: 'rgba(237, 164, 54, 0.1)',
            cursor: 'pointer',
            color: '#EDA436',
            fontSize: '15px',
            fontWeight: '500',
            borderRadius: '12px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          <ArrowLeft size={18} strokeWidth={2.5} /> Back to Dashboard
        </button>
        <div
          style={{
            textAlign: 'center',
            padding: '80px 24px',
            backgroundColor: 'rgba(249, 250, 251, 0.5)',
            borderRadius: '20px',
            backdropFilter: 'blur(10px)',
          }}
        >
          <p style={{ color: '#6b7280', fontSize: '15px', fontWeight: '500' }}>
            No metrics available for this judge yet.
          </p>
        </div>
      </div>
    );
  }

  const disagreementPct = (metrics.disagreement_rate * 100).toFixed(1);

  return (
    <div
      style={{
        padding: '40px 32px',
        maxWidth: '1200px',
        margin: '0 auto',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 16px',
          marginBottom: '32px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          color: '#EDA436',
          fontSize: '15px',
          fontWeight: '500',
          borderRadius: '12px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateX(-2px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateX(0)';
        }}
      >
        <ArrowLeft size={18} strokeWidth={2.5} /> Back to Dashboard
      </button>

      <div style={{ marginBottom: '40px' }}>
        <h1
          style={{
            fontSize: '34px',
            fontWeight: '700',
            marginBottom: '8px',
            color: '#1a1a1a',
            letterSpacing: '-0.02em',
          }}
        >
          {judgeName}
        </h1>
        <p
          style={{
            color: '#6b7280',
            fontSize: '16px',
            fontWeight: '400',
            lineHeight: '1.5',
          }}
        >
          Detailed metrics and improvement suggestions
        </p>
      </div>

      {/* Stats and Chart Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '220px 1fr',
          gap: '20px',
          marginBottom: '40px',
        }}
      >
        {/* Summary Stats - Stacked Vertically */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <StatBadge
            label="AI Pass Rate"
            value={`${(metrics.ai_pass_rate * 100).toFixed(1)}%`}
          />
          <StatBadge
            label="Human Pass Rate"
            value={`${(metrics.human_pass_rate * 100).toFixed(1)}%`}
          />
          <StatBadge label="Disagreement Rate" value={`${disagreementPct}%`} />
        </div>

        {/* Pass Rate Chart */}
        <PassRateChart data={passRateData} />
      </div>

      {/* Auto-Generated Suggestions */}
      <div style={{ marginBottom: '40px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h2
            style={{
              fontSize: '22px',
              fontWeight: '700',
              color: '#1a1a1a',
              letterSpacing: '-0.01em',
            }}
          >
            System Prompt Suggestions
          </h2>
          <button
            onClick={onGenerateSuggestions}
            disabled={generating}
            style={{
              padding: '10px 18px',
              fontSize: '15px',
              fontWeight: '500',
              border: 'none',
              borderRadius: '12px',
              background: generating
                ? 'rgba(209, 213, 219, 0.5)'
                : 'rgba(237, 164, 54, 0.1)',
              color: generating ? '#9ca3af' : '#EDA436',
              cursor: generating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseEnter={(e) => {
              if (!generating) {
                e.currentTarget.style.background = 'rgba(237, 164, 54, 0.15)';
              }
            }}
            onMouseLeave={(e) => {
              if (!generating) {
                e.currentTarget.style.background = 'rgba(237, 164, 54, 0.1)';
              }
            }}
          >
            <Lightbulb size={18} strokeWidth={2.5} />
            {generating ? 'Generating...' : 'Generate New Suggestions'}
          </button>
        </div>

        {suggestions.length === 0 ? (
          <div
            style={{
              padding: '48px 32px',
              backgroundColor: 'rgba(249, 250, 251, 0.5)',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: '16px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                margin: '0 auto 16px',
                backgroundColor: 'rgba(237, 164, 54, 0.1)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
              }}
            >
              💡
            </div>
            <p
              style={{
                color: '#6b7280',
                fontSize: '15px',
                fontWeight: '500',
              }}
            >
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
                onApply={() => onApplySuggestion(suggestion.id)}
                onDismiss={() => onDismissSuggestion(suggestion.id)}
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
              fontSize: '22px',
              fontWeight: '700',
              color: '#1a1a1a',
              letterSpacing: '-0.01em',
              marginBottom: '20px',
            }}
          >
            Recent Disagreements
          </h2>
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid rgba(0, 0, 0, 0.06)',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow:
                '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02)',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: 'rgba(249, 250, 251, 0.8)',
                    borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
                  }}
                >
                  <th
                    style={{
                      padding: '16px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      width: '30%',
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <MessageSquare size={14} />
                      <span>Question & Answer</span>
                    </span>
                  </th>
                  <th
                    style={{
                      padding: '16px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      width: '55%',
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Bot size={14} />
                      <span>AI Verdict</span>
                    </span>
                  </th>
                  <th
                    style={{
                      padding: '16px 20px',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#6b7280',
                      width: '15%',
                    }}
                  >
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <User size={14} />
                      <span>Human Verdict</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {examples.map((example) => (
                  <DisagreementRow
                    key={example.evaluation_id}
                    example={example}
                  />
                ))}
              </tbody>
            </table>
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
        padding: '24px 20px',
        backgroundColor: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        borderRadius: '14px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minHeight: '110px',
        boxShadow:
          '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow =
          '0 4px 12px rgba(0, 0, 0, 0.08), 0 2px 4px rgba(0, 0, 0, 0.04)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow =
          '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <p
        style={{
          fontSize: '12px',
          color: '#9ca3af',
          marginBottom: '10px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontSize: '32px',
          fontWeight: '700',
          color: '#1a1a1a',
          lineHeight: '1',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </p>
    </div>
  );
}

const chartConfig = {
  ai_pass_rate: {
    label: 'AI Pass Rate',
    color: '#FFCB7D',
  },
  human_pass_rate: {
    label: 'Human Pass Rate',
    color: '#ED7036',
  },
} satisfies ChartConfig;

function PassRateChart({ data }: { data: PassRateDataPoint[] }) {
  if (data.length === 0) {
    return (
      <div
        style={{
          padding: '48px 32px',
          backgroundColor: 'rgba(249, 250, 251, 0.5)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          borderRadius: '16px',
          textAlign: 'center',
          backdropFilter: 'blur(10px)',
          boxShadow:
            '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            margin: '0 auto 16px',
            backgroundColor: 'rgba(237, 164, 54, 0.1)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
          }}
        >
          📈
        </div>
        <p style={{ color: '#6b7280', fontSize: '15px', fontWeight: '500' }}>
          No pass rate data available yet. Run some evaluations to see trends.
        </p>
      </div>
    );
  }

  // Transform data for recharts (convert to percentage)
  const chartData = data.map((d) => ({
    date: d.date, // Formatted timestamp (e.g., "Jan 15, 3:30 PM")
    queue_id: d.queue_id,
    ai_pass_rate: Math.min(100, Number((d.ai_pass_rate * 100).toFixed(1))),
    human_pass_rate: Math.min(
      100,
      Number((d.human_pass_rate * 100).toFixed(1))
    ),
  }));

  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardContent className="px-6 pt-6">
        <ChartContainer config={chartConfig} className="min-h-[280px] w-full">
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
              top: 82,
              bottom: 18,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickCount={5}
              tickFormatter={(value) => `${value}%`}
              domain={[0, 'dataMax']}
              allowDataOverflow={false}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent className="bg-white border border-gray-200 shadow-lg" />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              dataKey="ai_pass_rate"
              type="monotone"
              fill="var(--color-ai_pass_rate)"
              fillOpacity={0.4}
              stroke="var(--color-ai_pass_rate)"
              strokeWidth={2}
            />
            <Area
              dataKey="human_pass_rate"
              type="monotone"
              fill="var(--color-human_pass_rate)"
              fillOpacity={0.4}
              stroke="var(--color-human_pass_rate)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
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
        padding: '24px',
        backgroundColor: '#ffffff',
        border: '1px solid rgba(0, 0, 0, 0.06)',
        borderRadius: '16px',
        boxShadow:
          '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Header */}
      <div
        style={{
          marginBottom: '16px',
        }}
      >
        <h3
          style={{
            fontSize: '17px',
            fontWeight: '700',
            marginBottom: '6px',
            color: '#1a1a1a',
            letterSpacing: '-0.01em',
          }}
        >
          {suggestion.suggestion_type.replace(/_/g, ' ').toUpperCase()}
        </h3>
        <p style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>
          Based on {suggestion.evidence_count} supporting review
          {suggestion.evidence_count !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Suggestion Text */}
      <div
        style={{
          padding: '18px',
          backgroundColor: 'rgba(249, 250, 251, 0.6)',
          borderRadius: '12px',
          marginBottom: '18px',
          whiteSpace: 'pre-wrap',
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#374151',
          border: '1px solid rgba(0, 0, 0, 0.04)',
        }}
      >
        {suggestion.suggestion_text}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button
          onClick={onDismiss}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: '500',
            border: '1px solid rgba(0, 0, 0, 0.1)',
            borderRadius: '10px',
            background: '#fff',
            cursor: 'pointer',
            color: '#6b7280',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.2)';
            e.currentTarget.style.background = '#f9fafb';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.background = '#fff';
          }}
        >
          <X size={16} strokeWidth={2.5} /> Dismiss
        </button>
        <button
          onClick={copyToClipboard}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: '500',
            border: '1px solid rgba(237, 164, 54, 0.3)',
            borderRadius: '10px',
            background: '#fff',
            cursor: 'pointer',
            color: '#EDA436',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(237, 164, 54, 0.5)';
            e.currentTarget.style.background = 'rgba(237, 164, 54, 0.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(237, 164, 54, 0.3)';
            e.currentTarget.style.background = '#fff';
          }}
        >
          {copied ? (
            <Check size={16} strokeWidth={2.5} />
          ) : (
            <Copy size={16} strokeWidth={2.5} />
          )}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={applyChanges}
          disabled={applying}
          style={{
            padding: '10px 16px',
            fontSize: '14px',
            fontWeight: '500',
            border: 'none',
            borderRadius: '10px',
            background: applying ? '#d1d5db' : '#EDA436',
            cursor: applying ? 'not-allowed' : 'pointer',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: applying
              ? 'none'
              : '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02)',
          }}
          onMouseEnter={(e) => {
            if (!applying) {
              e.currentTarget.style.background = '#d89430';
              e.currentTarget.style.boxShadow =
                '0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.06)';
            }
          }}
          onMouseLeave={(e) => {
            if (!applying) {
              e.currentTarget.style.background = '#EDA436';
              e.currentTarget.style.boxShadow =
                '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.02)';
            }
          }}
        >
          <Check size={16} strokeWidth={2.5} />{' '}
          {applying ? 'Applying...' : 'Apply Changes'}
        </button>
      </div>
    </div>
  );
}

function DisagreementRow({ example }: { example: DisagreementExample }) {
  const getVerdictBadge = (verdict: string, label: string) => {
    const bgColor =
      verdict === 'pass'
        ? 'rgba(16, 185, 129, 0.12)'
        : verdict === 'fail'
          ? 'rgba(239, 68, 68, 0.12)'
          : 'rgba(245, 158, 11, 0.12)';
    const textColor =
      verdict === 'pass'
        ? '#059669'
        : verdict === 'fail'
          ? '#dc2626'
          : '#d97706';

    const Icon =
      verdict === 'pass'
        ? CheckCircle
        : verdict === 'fail'
          ? XCircle
          : AlertTriangle;

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '12px',
          fontSize: '13px',
          fontWeight: 600,
          backgroundColor: bgColor,
          color: textColor,
          textTransform: 'capitalize',
        }}
      >
        <Icon size={14} strokeWidth={2.5} />
        {label}
      </span>
    );
  };

  return (
    <tr
      style={{
        borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
      }}
    >
      {/* Question & Answer */}
      <td
        style={{
          padding: '18px 20px',
          verticalAlign: 'top',
        }}
      >
        <div style={{ marginBottom: '10px' }}>
          <p
            style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#1a1a1a',
              marginBottom: '8px',
              lineHeight: '1.4',
            }}
          >
            {example.question_text}
          </p>
          <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.5' }}>
            Answer:{' '}
            {typeof example.answer === 'string'
              ? example.answer
              : JSON.stringify(example.answer)}
          </p>
        </div>
      </td>

      {/* AI Verdict */}
      <td
        style={{
          padding: '18px 20px',
          verticalAlign: 'top',
        }}
      >
        <div style={{ marginBottom: '10px' }}>
          {getVerdictBadge(example.ai_verdict, example.ai_verdict)}
        </div>
        <p style={{ fontSize: '13px', color: '#6b7280', lineHeight: '1.6' }}>
          {example.ai_reasoning}
        </p>
      </td>

      {/* Human Verdict */}
      <td
        style={{
          padding: '18px 20px',
          verticalAlign: 'top',
        }}
      >
        <div style={{ marginBottom: '10px' }}>
          {getVerdictBadge(example.human_verdict, example.human_verdict)}
        </div>
        <p
          style={{
            fontSize: '13px',
            color: '#6b7280',
            lineHeight: '1.6',
            marginBottom: '8px',
          }}
        >
          {example.human_reasoning}
        </p>
        <p style={{ fontSize: '12px', color: '#9ca3af', fontWeight: '500' }}>
          Reviewed by {example.reviewed_by}
        </p>
      </td>
    </tr>
  );
}
