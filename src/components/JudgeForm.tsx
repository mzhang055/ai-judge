/**
 * JudgeForm - Modal form for creating and editing judges
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Judge } from '../types';
import type { CreateJudgeInput } from '../services/judgeService';

interface JudgeFormProps {
  judge?: Judge; // If provided, we're editing; otherwise creating
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateJudgeInput) => Promise<void>;
}

const MODEL_OPTIONS = [
  { value: 'gpt-4', label: 'GPT-4 (OpenAI)' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (OpenAI)' },
  { value: 'claude-3-opus', label: 'Claude 3 Opus (Anthropic)' },
  { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet (Anthropic)' },
  { value: 'gemini-pro', label: 'Gemini Pro (Google)' },
];

export function JudgeForm({
  judge,
  isOpen,
  onClose,
  onSubmit,
}: JudgeFormProps) {
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [modelName, setModelName] = useState('gpt-4');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (judge) {
      setName(judge.name);
      setSystemPrompt(judge.system_prompt);
      setModelName(judge.model_name);
      setIsActive(judge.is_active);
    } else {
      // Reset form for new judge
      setName('');
      setSystemPrompt('');
      setModelName('gpt-4');
      setIsActive(true);
    }
    setError(null);
  }, [judge, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!systemPrompt.trim()) {
      setError('System prompt is required');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        system_prompt: systemPrompt.trim(),
        model_name: modelName,
        is_active: isActive,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save judge');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />

      {/* Modal */}
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <h2 style={styles.title}>
            {judge ? 'Edit Judge' : 'Create New Judge'}
          </h2>
          <button style={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Error message */}
          {error && (
            <div style={styles.errorBanner}>
              <span>{error}</span>
            </div>
          )}

          {/* Name field */}
          <div style={styles.field}>
            <label style={styles.label}>
              Name <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Strict Grammar Judge"
              style={styles.input}
              disabled={loading}
            />
          </div>

          {/* Model selection */}
          <div style={styles.field}>
            <label style={styles.label}>
              Model <span style={styles.required}>*</span>
            </label>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              style={styles.select}
              disabled={loading}
            >
              {MODEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* System prompt */}
          <div style={styles.field}>
            <label style={styles.label}>
              System Prompt / Rubric <span style={styles.required}>*</span>
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="You are an expert judge evaluating annotation quality. Your task is to..."
              rows={8}
              style={styles.textarea}
              disabled={loading}
            />
            <p style={styles.hint}>
              This prompt will be sent to the AI model along with the submission
              data.
            </p>
          </div>

          {/* Active toggle */}
          <div style={styles.field}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                style={styles.checkbox}
                disabled={loading}
              />
              <span>Active (available for assignment)</span>
            </label>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <button
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={loading}
            >
              {loading ? 'Saving...' : judge ? 'Update Judge' : 'Create Judge'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow:
      '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflow: 'auto',
    zIndex: 1000,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 24px 16px',
    borderBottom: '1px solid #e5e7eb',
  },
  title: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#111827',
    margin: 0,
  },
  closeButton: {
    padding: '4px',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#6b7280',
    borderRadius: '4px',
    transition: 'background-color 0.15s',
  },
  form: {
    padding: '24px',
  },
  errorBanner: {
    padding: '12px 16px',
    backgroundColor: '#fee2e2',
    color: '#991b1b',
    borderRadius: '6px',
    marginBottom: '16px',
    fontSize: '14px',
  },
  field: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    marginBottom: '6px',
  },
  required: {
    color: '#dc2626',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.15s',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    backgroundColor: '#fff',
    cursor: 'pointer',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    fontSize: '14px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    lineHeight: '1.5',
    boxSizing: 'border-box',
  },
  hint: {
    marginTop: '6px',
    fontSize: '12px',
    color: '#6b7280',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#374151',
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: '1px solid #e5e7eb',
  },
  cancelButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
    backgroundColor: '#fff',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  submitButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    backgroundColor: '#4f46e5',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
};
