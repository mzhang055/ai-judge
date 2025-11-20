/**
 * ReviewModal - Modal for reviewing inconclusive evaluations
 * REFACTORED to use styled UI components
 */

import { useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { completeHumanReview } from '../services/humanReviewService';
import { getErrorMessage } from '../lib/errors';
import { StyledButton } from './ui/StyledButton';
import { StyledInput, StyledTextarea, StyledLabel } from './ui/StyledInput';
import { StyledBadge } from './ui/StyledBadge';
import type { HumanReviewQueueItemWithContext, HumanVerdict } from '../types';

interface ReviewModalProps {
  item: HumanReviewQueueItemWithContext;
  onClose: () => void;
  onComplete: () => void;
}

export function ReviewModal({ item, onClose, onComplete }: ReviewModalProps) {
  const [selectedVerdict, setSelectedVerdict] = useState<HumanVerdict | ''>('');
  const [inconclusiveReason, setInconclusiveReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [reviewerName, setReviewerName] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const question = item.questions.find((q) => q.data.id === item.question_id);
  const answer = item.answers[item.question_id];

  const handleSubmit = async () => {
    if (!selectedVerdict) {
      toast.error('Please select a verdict');
      return;
    }

    if (!reviewerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!notes.trim()) {
      toast.error('Please provide reasoning for your decision');
      return;
    }

    // If verdict is inconclusive category, require a reason
    if (
      ['bad_data', 'ambiguous_question', 'insufficient_context'].includes(
        selectedVerdict
      ) &&
      !inconclusiveReason &&
      !customReason
    ) {
      toast.error(
        'Please select or provide a reason for marking as inconclusive'
      );
      return;
    }

    try {
      setSubmitting(true);

      // Build reasoning with inconclusive reason if applicable
      let fullReasoning = notes.trim();
      if (
        ['bad_data', 'ambiguous_question', 'insufficient_context'].includes(
          selectedVerdict
        )
      ) {
        const reason = customReason || inconclusiveReason;
        fullReasoning = `Reason: ${reason}\n\n${fullReasoning}`;
      }

      await completeHumanReview(
        item.evaluation_id,
        selectedVerdict,
        fullReasoning,
        reviewerName.trim()
      );

      onComplete();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to submit review'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const getBadgeVariant = (verdict: string) => {
    switch (verdict) {
      case 'pass':
        return 'pass';
      case 'fail':
        return 'fail';
      case 'bad_data':
        return 'bad_data';
      case 'ambiguous_question':
        return 'ambiguous_question';
      case 'insufficient_context':
        return 'insufficient_context';
      default:
        return 'inconclusive';
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>Review Evaluation</h2>
          <button onClick={onClose} style={styles.closeButton}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {/* Question */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>📝 QUESTION</h3>
            <div style={styles.sectionContent}>
              <p style={styles.questionText}>
                {question?.data.questionText || item.question_id}
              </p>
              {question && (
                <div style={styles.metadata}>
                  <span>Type: {question.data.questionType}</span>
                  <span>ID: {item.question_id}</span>
                </div>
              )}
            </div>
          </section>

          {/* Answer */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>💬 HUMAN ANSWER</h3>
            <div style={styles.sectionContent}>
              <pre style={styles.answerText}>
                {JSON.stringify(answer, null, 2)}
              </pre>
            </div>
          </section>

          {/* AI Verdict */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>🤖 AI JUDGE VERDICT</h3>
            <div style={styles.sectionContent}>
              <div style={styles.aiVerdictRow}>
                <span style={styles.aiJudgeName}>Judge: {item.judge_name}</span>
                <div style={styles.verdictBadgeContainer}>
                  {item.ai_verdict === 'pass' && (
                    <CheckCircle size={16} style={{ color: '#10b981' }} />
                  )}
                  {item.ai_verdict === 'fail' && (
                    <XCircle size={16} style={{ color: '#ef4444' }} />
                  )}
                  {item.ai_verdict === 'inconclusive' && (
                    <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                  )}
                  <StyledBadge variant={getBadgeVariant(item.ai_verdict)}>
                    {item.ai_verdict.toUpperCase()}
                  </StyledBadge>
                </div>
              </div>
              <p style={styles.reasoning}>{item.ai_reasoning}</p>
            </div>
          </section>

          <div style={styles.divider} />

          {/* Your Decision */}
          <section style={styles.section}>
            <h3 style={styles.sectionTitle}>👤 YOUR DECISION</h3>
            <div style={styles.decisionContent}>
              {/* Verdict Selection */}
              <div style={styles.verdictOptions}>
                <button
                  onClick={() => setSelectedVerdict('pass')}
                  style={{
                    ...styles.verdictButton,
                    ...(selectedVerdict === 'pass'
                      ? styles.verdictButtonSelected
                      : {}),
                    borderColor: '#10b981',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedVerdict !== 'pass') {
                      e.currentTarget.style.backgroundColor = '#f0fdf4';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedVerdict !== 'pass') {
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                  }}
                >
                  <CheckCircle size={20} style={{ color: '#10b981' }} />
                  Pass
                </button>

                <button
                  onClick={() => setSelectedVerdict('fail')}
                  style={{
                    ...styles.verdictButton,
                    ...(selectedVerdict === 'fail'
                      ? styles.verdictButtonSelected
                      : {}),
                    borderColor: '#ef4444',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedVerdict !== 'fail') {
                      e.currentTarget.style.backgroundColor = '#fef2f2';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedVerdict !== 'fail') {
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                  }}
                >
                  <XCircle size={20} style={{ color: '#ef4444' }} />
                  Fail
                </button>

                <button
                  onClick={() => setSelectedVerdict('bad_data')}
                  style={{
                    ...styles.verdictButton,
                    ...(selectedVerdict === 'bad_data'
                      ? styles.verdictButtonSelected
                      : {}),
                    borderColor: '#f59e0b',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedVerdict !== 'bad_data') {
                      e.currentTarget.style.backgroundColor = '#fffbeb';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedVerdict !== 'bad_data') {
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                  }}
                >
                  <AlertTriangle size={20} style={{ color: '#f59e0b' }} />
                  Mark as Bad Data
                </button>
              </div>

              {/* Inconclusive Reason (if bad_data selected) */}
              {[
                'bad_data',
                'ambiguous_question',
                'insufficient_context',
              ].includes(selectedVerdict) && (
                <div style={styles.inconclusiveReasonSection}>
                  <StyledLabel>Reason for Inconclusive:</StyledLabel>
                  <div style={styles.radioGroup}>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="inconclusiveReason"
                        value="ambiguous_question"
                        checked={
                          selectedVerdict === 'ambiguous_question' ||
                          inconclusiveReason === 'ambiguous_question'
                        }
                        onChange={(e) => {
                          if (selectedVerdict === 'bad_data') {
                            setInconclusiveReason(e.target.value);
                          } else {
                            setSelectedVerdict('ambiguous_question');
                          }
                        }}
                      />
                      Ambiguous question
                    </label>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="inconclusiveReason"
                        value="insufficient_context"
                        checked={
                          selectedVerdict === 'insufficient_context' ||
                          inconclusiveReason === 'insufficient_context'
                        }
                        onChange={(e) => {
                          if (selectedVerdict === 'bad_data') {
                            setInconclusiveReason(e.target.value);
                          } else {
                            setSelectedVerdict('insufficient_context');
                          }
                        }}
                      />
                      Insufficient context in answer
                    </label>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="inconclusiveReason"
                        value="judge_rubric_unclear"
                        checked={inconclusiveReason === 'judge_rubric_unclear'}
                        onChange={(e) => setInconclusiveReason(e.target.value)}
                      />
                      Judge rubric unclear
                    </label>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="inconclusiveReason"
                        value="corrupted_data"
                        checked={inconclusiveReason === 'corrupted_data'}
                        onChange={(e) => setInconclusiveReason(e.target.value)}
                      />
                      Bad/corrupted data
                    </label>
                    <label style={styles.radioLabel}>
                      <input
                        type="radio"
                        name="inconclusiveReason"
                        value="other"
                        checked={inconclusiveReason === 'other'}
                        onChange={(e) => setInconclusiveReason(e.target.value)}
                      />
                      Other
                    </label>
                  </div>

                  {inconclusiveReason === 'other' && (
                    <StyledInput
                      type="text"
                      placeholder="Please specify..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                    />
                  )}
                </div>
              )}

              {/* Your Name */}
              <div style={styles.formGroup}>
                <StyledLabel>Your Name:</StyledLabel>
                <StyledInput
                  type="text"
                  placeholder="Enter your name"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div style={styles.formGroup}>
                <StyledLabel>Your Notes:</StyledLabel>
                <StyledTextarea
                  placeholder="Explain your reasoning for this decision..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <StyledButton variant="secondary" onClick={handleSkip}>
            Skip for Now
          </StyledButton>
          <StyledButton
            variant="primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit Review & Next →'}
          </StyledButton>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '12px',
    maxWidth: '800px',
    width: '100%',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow:
      '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: '24px',
    overflowY: 'auto' as const,
    flex: 1,
  },
  section: {
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    marginBottom: '12px',
  },
  sectionContent: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderRadius: '8px',
    border: '1px solid #e5e7eb',
  },
  questionText: {
    fontSize: '16px',
    color: '#111827',
    margin: '0 0 12px 0',
    lineHeight: '1.6',
  },
  metadata: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#6b7280',
  },
  answerText: {
    fontSize: '14px',
    color: '#374151',
    margin: 0,
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
  },
  aiVerdictRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  aiJudgeName: {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
  },
  verdictBadgeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  reasoning: {
    fontSize: '14px',
    color: '#374151',
    margin: 0,
    lineHeight: '1.6',
  },
  divider: {
    height: '1px',
    backgroundColor: '#e5e7eb',
    margin: '24px 0',
  },
  decisionContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  verdictOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  verdictButton: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    backgroundColor: 'white',
    border: '2px solid',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  verdictButtonSelected: {
    backgroundColor: '#f0f9ff',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  },
  inconclusiveReasonSection: {
    padding: '16px',
    backgroundColor: '#fffbeb',
    borderRadius: '8px',
    border: '1px solid #fef3c7',
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    marginTop: '12px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '24px',
    borderTop: '1px solid #e5e7eb',
  },
} as const;
