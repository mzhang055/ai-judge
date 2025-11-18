/**
 * PromptConfigEditor - Component for configuring which fields to include in judge prompts
 */

import type { PromptConfiguration } from '../types';

interface PromptConfigEditorProps {
  config: PromptConfiguration;
  onChange: (config: PromptConfiguration) => void;
  disabled?: boolean;
}

interface ConfigOption {
  key: keyof PromptConfiguration;
  label: string;
  description: string;
  category: 'question' | 'answer' | 'metadata';
}

const CONFIG_OPTIONS: ConfigOption[] = [
  {
    key: 'include_question_text',
    label: 'Question Text',
    description: 'The actual question being asked',
    category: 'question',
  },
  {
    key: 'include_question_type',
    label: 'Question Type',
    description: 'e.g., single_choice, multiple_choice, free_form',
    category: 'question',
  },
  {
    key: 'include_answer',
    label: 'Answer',
    description: "The user's submitted answer",
    category: 'answer',
  },
  {
    key: 'include_queue_id',
    label: 'Queue ID',
    description: 'Identifier for the submission queue',
    category: 'metadata',
  },
  {
    key: 'include_labeling_task_id',
    label: 'Labeling Task ID',
    description: 'Identifier for the labeling task',
    category: 'metadata',
  },
  {
    key: 'include_created_at',
    label: 'Created At',
    description: 'Timestamp when the submission was created',
    category: 'metadata',
  },
];

export function PromptConfigEditor({
  config,
  onChange,
  disabled = false,
}: PromptConfigEditorProps) {
  const handleToggle = (key: keyof PromptConfiguration) => {
    onChange({
      ...config,
      [key]: !config[key],
    });
  };

  const handleCategoryToggle = (
    category: 'question' | 'answer' | 'metadata'
  ) => {
    const categoryOptions = CONFIG_OPTIONS.filter(
      (opt) => opt.category === category
    );
    const allEnabled = categoryOptions.every((opt) => config[opt.key]);
    const newValue = !allEnabled;

    const newConfig = { ...config };
    categoryOptions.forEach((opt) => {
      newConfig[opt.key] = newValue;
    });
    onChange(newConfig);
  };

  const questionOptions = CONFIG_OPTIONS.filter(
    (opt) => opt.category === 'question'
  );
  const answerOptions = CONFIG_OPTIONS.filter(
    (opt) => opt.category === 'answer'
  );
  const metadataOptions = CONFIG_OPTIONS.filter(
    (opt) => opt.category === 'metadata'
  );

  const renderCategory = (
    title: string,
    options: ConfigOption[],
    category: 'question' | 'answer' | 'metadata'
  ) => {
    const allEnabled = options.every((opt) => config[opt.key]);
    const someEnabled = options.some((opt) => config[opt.key]);

    return (
      <div style={styles.categorySection}>
        <div style={styles.categoryHeader}>
          <button
            type="button"
            style={styles.categoryToggle}
            onClick={() => handleCategoryToggle(category)}
            disabled={disabled}
            aria-label={`Toggle all ${title}`}
          >
            <input
              type="checkbox"
              checked={allEnabled}
              onChange={() => {}}
              ref={(el) => {
                if (el) el.indeterminate = someEnabled && !allEnabled;
              }}
              style={styles.checkbox}
              disabled={disabled}
            />
            <span style={styles.categoryTitle}>{title}</span>
          </button>
        </div>
        <div style={styles.optionsList}>
          {options.map((option) => (
            <label
              key={option.key}
              style={{
                ...styles.optionLabel,
                ...(disabled ? styles.optionLabelDisabled : {}),
              }}
            >
              <input
                type="checkbox"
                checked={config[option.key]}
                onChange={() => handleToggle(option.key)}
                style={styles.checkbox}
                disabled={disabled}
              />
              <div style={styles.optionText}>
                <div style={styles.optionName}>{option.label}</div>
                <div style={styles.optionDescription}>{option.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.headerTitle}>Prompt Fields Configuration</h3>
        <p style={styles.headerDescription}>
          Choose which fields to include when sending submissions to the AI
          judge. This allows you to control what information the judge sees.
        </p>
      </div>

      <div style={styles.categories}>
        {renderCategory('Question Fields', questionOptions, 'question')}
        {renderCategory('Answer Fields', answerOptions, 'answer')}
        {renderCategory('Submission Metadata', metadataOptions, 'metadata')}
      </div>

      <div style={styles.footer}>
        <p style={styles.footerNote}>
          <strong>Note:</strong> At least one field must be selected. The system
          prompt and verdict instructions are always included.
        </p>
      </div>
    </div>
  );
}

// Styles
const styles: Record<string, React.CSSProperties> = {
  container: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  header: {
    padding: '16px',
    backgroundColor: '#f9fafb',
    borderBottom: '1px solid #e5e7eb',
  },
  headerTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 4px 0',
  },
  headerDescription: {
    fontSize: '12px',
    color: '#6b7280',
    margin: 0,
    lineHeight: '1.5',
  },
  categories: {
    padding: '12px',
  },
  categorySection: {
    marginBottom: '16px',
  },
  categoryHeader: {
    marginBottom: '8px',
  },
  categoryToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 0',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
    width: '100%',
  },
  categoryTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    marginLeft: '24px',
  },
  optionLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '8px',
    backgroundColor: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  optionLabelDisabled: {
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    marginTop: '2px',
    flexShrink: 0,
  },
  optionText: {
    flex: 1,
  },
  optionName: {
    fontSize: '13px',
    fontWeight: 500,
    color: '#111827',
    marginBottom: '2px',
  },
  optionDescription: {
    fontSize: '11px',
    color: '#6b7280',
    lineHeight: '1.4',
  },
  footer: {
    padding: '12px 16px',
    backgroundColor: '#fffbeb',
    borderTop: '1px solid #fde68a',
  },
  footerNote: {
    fontSize: '11px',
    color: '#92400e',
    margin: 0,
    lineHeight: '1.5',
  },
};
