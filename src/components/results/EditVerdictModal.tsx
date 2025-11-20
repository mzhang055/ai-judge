/**
 * EditVerdictModal - Modal for humans to override AI judge verdicts
 */

import { useState } from 'react';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { overrideEvaluation } from '../../services/evaluationService';
import { getErrorMessage } from '../../lib/errors';
import { StyledModal } from '../ui/StyledModal';
import { StyledButton } from '../ui/StyledButton';
import { StyledInput, StyledTextarea, StyledLabel } from '../ui/StyledInput';
import type { Evaluation, HumanVerdict } from '../../types';

interface EditVerdictModalProps {
  evaluation: Evaluation;
  onClose: () => void;
  onComplete: () => void;
}

export function EditVerdictModal({
  evaluation,
  onClose,
  onComplete,
}: EditVerdictModalProps) {
  const [verdict, setVerdict] = useState<HumanVerdict | ''>(
    evaluation.human_verdict || ''
  );
  const [reasoning, setReasoning] = useState(evaluation.human_reasoning || '');
  const [reviewerName, setReviewerName] = useState(
    evaluation.reviewed_by || ''
  );
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!verdict) {
      toast.error('Please select a verdict');
      return;
    }
    if (!reasoning.trim()) {
      toast.error('Please provide reasoning for your decision');
      return;
    }
    if (!reviewerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      setSubmitting(true);
      await overrideEvaluation(
        evaluation.id,
        verdict as HumanVerdict,
        reasoning,
        reviewerName
      );
      toast.success('Verdict updated successfully!');
      onComplete();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update verdict'));
    } finally {
      setSubmitting(false);
    }
  };

  const verdictOptions: Array<{
    value: HumanVerdict;
    label: string;
    description: string;
    icon: React.ReactNode;
  }> = [
    {
      value: 'pass',
      label: 'Pass',
      description: 'The answer is acceptable',
      icon: <CheckCircle size={16} style={{ color: '#10b981' }} />,
    },
    {
      value: 'fail',
      label: 'Fail',
      description: 'The answer is incorrect or inadequate',
      icon: <XCircle size={16} style={{ color: '#ef4444' }} />,
    },
    {
      value: 'bad_data',
      label: 'Bad Data',
      description:
        'Data quality issue (question unclear, answer missing context, etc.)',
      icon: <AlertCircle size={16} style={{ color: '#7c3aed' }} />,
    },
  ];

  // Check if this would be a disagreement
  // Disagreement = human changes verdict AND it's not a bad_data classification
  const isDisagreement =
    verdict && verdict !== evaluation.verdict && verdict !== 'bad_data';

  // Footer content
  const footer = (
    <div style={footerStyles.container}>
      <StyledButton variant="secondary" size="medium" onClick={onClose}>
        Cancel
      </StyledButton>
      <StyledButton
        variant="primary"
        size="medium"
        onClick={handleSubmit}
        disabled={
          submitting || !verdict || !reasoning.trim() || !reviewerName.trim()
        }
      >
        {submitting ? 'Saving...' : 'Save Verdict'}
      </StyledButton>
    </div>
  );

  return (
    <StyledModal
      isOpen={true}
      onClose={onClose}
      title="Edit Verdict"
      footer={footer}
      maxWidth="700px"
    >
      {/* Subtitle */}
      <div style={contentStyles.subtitle}>Override the AI judge's decision</div>

      {/* AI Verdict Display */}
      <div style={contentStyles.section}>
        <h3 style={contentStyles.sectionTitle}>AI Judge Verdict</h3>
        <div style={contentStyles.aiVerdictBox}>
          <div style={contentStyles.verdictRow}>
            <span style={contentStyles.label}>Verdict:</span>
            <span style={contentStyles.value}>
              {evaluation.verdict.toUpperCase()}
            </span>
          </div>
          <div style={contentStyles.verdictRow}>
            <span style={contentStyles.label}>Judge:</span>
            <span style={contentStyles.value}>{evaluation.judge_name}</span>
          </div>
          <div style={{ marginTop: '12px' }}>
            <span style={contentStyles.label}>Reasoning:</span>
            <p style={contentStyles.aiReasoning}>{evaluation.reasoning}</p>
          </div>
        </div>
      </div>

      {/* Human Verdict Selection */}
      <div style={contentStyles.section}>
        <h3 style={contentStyles.sectionTitle}>Your Verdict</h3>
        <div style={contentStyles.verdictGrid}>
          {verdictOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setVerdict(option.value)}
              style={{
                ...contentStyles.verdictOption,
                ...(verdict === option.value
                  ? contentStyles.verdictOptionSelected
                  : {}),
              }}
            >
              <div style={contentStyles.verdictOptionIcon}>{option.icon}</div>
              <div style={contentStyles.verdictOptionContent}>
                <div style={contentStyles.verdictOptionLabel}>
                  {option.label}
                </div>
                <div style={contentStyles.verdictOptionDescription}>
                  {option.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Disagreement Warning */}
      {isDisagreement && (
        <div style={contentStyles.disagreementWarning}>
          <AlertCircle size={16} />
          <div>
            <strong>Disagreement Detected:</strong> Your verdict differs from
            the AI judge. This will be used to improve the judge's rubric and
            system prompt.
          </div>
        </div>
      )}

      {/* Reasoning Input */}
      <div style={contentStyles.section}>
        <StyledLabel htmlFor="reasoning">Your Reasoning *</StyledLabel>
        <StyledTextarea
          id="reasoning"
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          placeholder="Explain why you're making this decision. For disagreements, be specific about what the AI judge got wrong."
          rows={4}
        />
      </div>

      {/* Reviewer Name Input */}
      <div style={contentStyles.section}>
        <StyledLabel htmlFor="reviewer">Your Name *</StyledLabel>
        <StyledInput
          id="reviewer"
          type="text"
          value={reviewerName}
          onChange={(e) => setReviewerName(e.target.value)}
          placeholder="Enter your name or email"
        />
      </div>
    </StyledModal>
  );
}

// Styles for modal content (kept as inline)
const contentStyles: Record<string, React.CSSProperties> = {
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    marginBottom: '24px',
    margin: '0 0 24px 0',
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '12px',
    display: 'block',
    margin: '0 0 12px 0',
  },
  aiVerdictBox: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '16px',
  },
  verdictRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  label: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#6b7280',
  },
  value: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#111827',
  },
  aiReasoning: {
    fontSize: '13px',
    color: '#374151',
    lineHeight: '1.5',
    margin: '8px 0 0 0',
  },
  verdictGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '8px',
  },
  verdictOption: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#fff',
    border: '2px solid #e5e7eb',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s',
    textAlign: 'left',
  },
  verdictOptionSelected: {
    borderColor: '#4f46e5',
    backgroundColor: '#eef2ff',
  },
  verdictOptionIcon: {
    flexShrink: 0,
  },
  verdictOptionContent: {
    flex: 1,
  },
  verdictOptionLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
    marginBottom: '2px',
  },
  verdictOptionDescription: {
    fontSize: '12px',
    color: '#6b7280',
  },
  disagreementWarning: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#fef3c7',
    border: '1px solid #fbbf24',
    borderRadius: '8px',
    marginBottom: '24px',
    fontSize: '13px',
    color: '#92400e',
  },
};

// Styles for footer (kept as inline)
const footerStyles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
  },
};
