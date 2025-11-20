/**
 * JudgeForm - Modal form for creating and editing judges
 * Refactored to use styled UI components
 */

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { Judge, PromptConfiguration } from '../types';
import type { CreateJudgeInput } from '../services/judgeService';
import { PromptConfigEditor } from './PromptConfigEditor';
import {
  StyledModal,
  StyledButton,
  StyledInput,
  StyledTextarea,
  StyledLabel,
} from './ui';

interface JudgeFormProps {
  judge?: Judge; // If provided, we're editing; otherwise creating
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateJudgeInput) => Promise<void>;
}

// Default prompt configuration
const DEFAULT_PROMPT_CONFIG: PromptConfiguration = {
  include_question_text: true,
  include_question_type: true,
  include_answer: true,
  include_submission_metadata: true,
  include_queue_id: true,
  include_labeling_task_id: true,
  include_created_at: true,
};

export function JudgeForm({
  judge,
  isOpen,
  onClose,
  onSubmit,
}: JudgeFormProps) {
  const [name, setName] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [promptConfig, setPromptConfig] = useState<PromptConfiguration>(
    DEFAULT_PROMPT_CONFIG
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (judge) {
      setName(judge.name);
      setSystemPrompt(judge.system_prompt);
      setIsActive(judge.is_active);
      setPromptConfig(judge.prompt_config || DEFAULT_PROMPT_CONFIG);
    } else {
      // Reset form for new judge
      setName('');
      setSystemPrompt('');
      setIsActive(true);
      setPromptConfig(DEFAULT_PROMPT_CONFIG);
    }
    setError(null);
  }, [judge, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      const errorMsg = 'Name is required';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }
    if (!systemPrompt.trim()) {
      const errorMsg = 'System prompt is required';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    // Validate that at least one field is selected
    if (!promptConfig || Object.keys(promptConfig).length === 0) {
      const errorMsg = 'Prompt configuration is required';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    const hasAtLeastOneField = Object.values(promptConfig).some(
      (v) => v === true
    );
    if (!hasAtLeastOneField) {
      const errorMsg = 'At least one prompt field must be selected';
      setError(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        system_prompt: systemPrompt.trim(),
        is_active: isActive,
        prompt_config: promptConfig,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save judge');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <>
      <StyledButton variant="secondary" onClick={onClose} disabled={loading}>
        Cancel
      </StyledButton>
      <StyledButton variant="primary" onClick={handleSubmit} disabled={loading}>
        {loading ? 'Saving...' : judge ? 'Update Judge' : 'Create Judge'}
      </StyledButton>
    </>
  );

  return (
    <StyledModal
      isOpen={isOpen}
      onClose={onClose}
      title={judge ? 'Edit Judge' : 'Create New Judge'}
      footer={footer}
    >
      <form onSubmit={handleSubmit}>
        {/* Error message */}
        {error && (
          <div style={styles.errorBanner} role="alert" aria-live="polite">
            <span>{error}</span>
          </div>
        )}

        {/* Name field */}
        <div style={styles.field}>
          <StyledLabel htmlFor="judge-name">
            Name <span style={styles.required}>*</span>
          </StyledLabel>
          <StyledInput
            id="judge-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Strict Grammar Judge"
            disabled={loading}
            required
            aria-required="true"
          />
          <p style={styles.hint}>All judges use GPT-5-mini model</p>
        </div>

        {/* System prompt */}
        <div style={styles.field}>
          <StyledLabel htmlFor="judge-prompt">
            System Prompt / Rubric <span style={styles.required}>*</span>
          </StyledLabel>
          <StyledTextarea
            id="judge-prompt"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="You are an expert judge evaluating annotation quality. Your task is to..."
            rows={8}
            disabled={loading}
            required
            aria-required="true"
            aria-describedby="prompt-hint"
          />
          <p id="prompt-hint" style={styles.hint}>
            This prompt will be sent to the AI model along with the submission
            data.
          </p>
        </div>

        {/* Prompt Configuration */}
        <div style={styles.field}>
          <PromptConfigEditor
            config={promptConfig}
            onChange={setPromptConfig}
            disabled={loading}
          />
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
      </form>
    </StyledModal>
  );
}

// Remaining styles not in components
const styles: Record<string, React.CSSProperties> = {
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
  required: {
    color: '#dc2626',
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
};
