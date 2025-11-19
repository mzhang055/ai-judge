/**
 * EditVerdictModal - Modal for humans to override AI judge verdicts
 */

import { useState } from 'react';
import { X, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { overrideEvaluation } from '../../services/evaluationService';
import { getErrorMessage } from '../../lib/errors';
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

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div>
            <h2 style={styles.title}>Edit Verdict</h2>
            <p style={styles.subtitle}>Override the AI judge's decision</p>
          </div>
          <button onClick={onClose} style={styles.closeButton}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* AI Verdict Display */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>AI Judge Verdict</h3>
            <div style={styles.aiVerdictBox}>
              <div style={styles.verdictRow}>
                <span style={styles.label}>Verdict:</span>
                <span style={styles.value}>
                  {evaluation.verdict.toUpperCase()}
                </span>
              </div>
              <div style={styles.verdictRow}>
                <span style={styles.label}>Judge:</span>
                <span style={styles.value}>{evaluation.judge_name}</span>
              </div>
              <div style={{ marginTop: '12px' }}>
                <span style={styles.label}>Reasoning:</span>
                <p style={styles.aiReasoning}>{evaluation.reasoning}</p>
              </div>
            </div>
          </div>

          {/* Human Verdict Selection */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Your Verdict</h3>
            <div style={styles.verdictGrid}>
              {verdictOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setVerdict(option.value)}
                  style={{
                    ...styles.verdictOption,
                    ...(verdict === option.value
                      ? styles.verdictOptionSelected
                      : {}),
                  }}
                >
                  <div style={styles.verdictOptionIcon}>{option.icon}</div>
                  <div style={styles.verdictOptionContent}>
                    <div style={styles.verdictOptionLabel}>{option.label}</div>
                    <div style={styles.verdictOptionDescription}>
                      {option.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Disagreement Warning */}
          {isDisagreement && (
            <div style={styles.disagreementWarning}>
              <AlertCircle size={16} />
              <div>
                <strong>Disagreement Detected:</strong> Your verdict differs
                from the AI judge. This will be used to improve the judge's
                rubric and system prompt.
              </div>
            </div>
          )}

          {/* Reasoning Input */}
          <div style={styles.section}>
            <label htmlFor="reasoning" style={styles.sectionTitle}>
              Your Reasoning *
            </label>
            <textarea
              id="reasoning"
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Explain why you're making this decision. For disagreements, be specific about what the AI judge got wrong."
              style={styles.textarea}
              rows={4}
            />
          </div>

          {/* Reviewer Name Input */}
          <div style={styles.section}>
            <label htmlFor="reviewer" style={styles.sectionTitle}>
              Your Name *
            </label>
            <input
              id="reviewer"
              type="text"
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              placeholder="Enter your name or email"
              style={styles.input}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelButton}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              submitting ||
              !verdict ||
              !reasoning.trim() ||
              !reviewerName.trim()
            }
            style={{
              ...styles.submitButton,
              ...(submitting ||
              !verdict ||
              !reasoning.trim() ||
              !reviewerName.trim()
                ? styles.submitButtonDisabled
                : {}),
            }}
          >
            {submitting ? 'Saving...' : 'Save Verdict'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow:
      '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    maxWidth: '700px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  closeButton: {
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    color: '#6b7280',
    borderRadius: '6px',
    transition: 'background-color 0.15s',
  },
  content: {
    padding: '24px',
    overflowY: 'auto',
    flex: 1,
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
  textarea: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '100px',
    boxSizing: 'border-box',
  },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  submitButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#4f46e5',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  submitButtonDisabled: {
    backgroundColor: '#9ca3af',
    cursor: 'not-allowed',
  },
};
