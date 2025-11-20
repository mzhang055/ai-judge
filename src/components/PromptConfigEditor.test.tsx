/**
 * Tests for PromptConfigEditor component
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PromptConfigEditor } from './PromptConfigEditor';
import type { PromptConfiguration } from '../types';

describe('PromptConfigEditor', () => {
  const defaultConfig: PromptConfiguration = {
    include_question_text: true,
    include_question_type: true,
    include_answer: true,
    include_submission_metadata: true,
    include_queue_id: true,
    include_labeling_task_id: true,
    include_created_at: true,
  };

  it('renders all configuration options', () => {
    const onChange = vi.fn();
    render(<PromptConfigEditor config={defaultConfig} onChange={onChange} />);

    expect(screen.getByText('Prompt Fields Configuration')).toBeInTheDocument();
    expect(screen.getByText('Question Fields')).toBeInTheDocument();
    expect(screen.getByText('Answer Fields')).toBeInTheDocument();
    expect(screen.getByText('Submission Metadata')).toBeInTheDocument();
  });

  it('shows all options checked when config has all true', () => {
    const onChange = vi.fn();
    render(<PromptConfigEditor config={defaultConfig} onChange={onChange} />);

    const checkboxes = screen.getAllByRole('checkbox');
    // All checkboxes should be checked (including category toggles)
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeChecked();
    });
  });

  it('calls onChange when toggling an option', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<PromptConfigEditor config={defaultConfig} onChange={onChange} />);

    // Find and click the "Question Text" checkbox
    const questionTextCheckbox = screen.getByRole('checkbox', {
      name: /Question Text/i,
    });

    await user.click(questionTextCheckbox);

    expect(onChange).toHaveBeenCalledWith({
      ...defaultConfig,
      include_question_text: false,
    });
  });

  it('toggles entire category when clicking category toggle', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<PromptConfigEditor config={defaultConfig} onChange={onChange} />);

    // Find the "Answer Fields" category toggle button
    const answerCategoryToggle = screen.getByRole('button', {
      name: /Toggle all Answer Fields/i,
    });

    await user.click(answerCategoryToggle);

    expect(onChange).toHaveBeenCalledWith({
      ...defaultConfig,
      include_answer: false,
    });
  });

  it('disables all controls when disabled prop is true', () => {
    const onChange = vi.fn();
    render(
      <PromptConfigEditor config={defaultConfig} onChange={onChange} disabled />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeDisabled();
    });

    const buttons = screen.getAllByRole('button');
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it('shows correct state when some options are disabled', () => {
    const partialConfig: PromptConfiguration = {
      include_question_text: true,
      include_question_type: false,
      include_answer: true,
      include_submission_metadata: false,
      include_queue_id: false,
      include_labeling_task_id: false,
      include_created_at: false,
    };

    const onChange = vi.fn();
    render(<PromptConfigEditor config={partialConfig} onChange={onChange} />);

    const questionTextCheckbox = screen.getByRole('checkbox', {
      name: /Question Text/i,
    });
    const questionTypeCheckbox = screen.getByRole('checkbox', {
      name: /Question Type/i,
    });

    expect(questionTextCheckbox).toBeChecked();
    expect(questionTypeCheckbox).not.toBeChecked();
  });

  it('displays helpful descriptions for each option', () => {
    const onChange = vi.fn();
    render(<PromptConfigEditor config={defaultConfig} onChange={onChange} />);

    expect(
      screen.getByText('The actual question being asked')
    ).toBeInTheDocument();
    expect(
      screen.getByText('e.g., single_choice, multiple_choice, free_form')
    ).toBeInTheDocument();
    expect(screen.getByText("The user's submitted answer")).toBeInTheDocument();
  });

  it('shows note about minimum field requirement', () => {
    const onChange = vi.fn();
    render(<PromptConfigEditor config={defaultConfig} onChange={onChange} />);

    expect(
      screen.getByText(/At least one field must be selected/i)
    ).toBeInTheDocument();
  });

  it('handles metadata category toggle correctly', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<PromptConfigEditor config={defaultConfig} onChange={onChange} />);

    const metadataCategoryToggle = screen.getByRole('button', {
      name: /Toggle all Submission Metadata/i,
    });

    await user.click(metadataCategoryToggle);

    expect(onChange).toHaveBeenCalledWith({
      ...defaultConfig,
      include_submission_metadata: false,
      include_queue_id: false,
      include_labeling_task_id: false,
      include_created_at: false,
    });
  });

  it('re-enables category when clicking toggle on disabled category', async () => {
    const allDisabledConfig: PromptConfiguration = {
      include_question_text: false,
      include_question_type: false,
      include_answer: true,
      include_submission_metadata: true,
      include_queue_id: true,
      include_labeling_task_id: true,
      include_created_at: true,
    };

    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <PromptConfigEditor config={allDisabledConfig} onChange={onChange} />
    );

    const questionCategoryToggle = screen.getByRole('button', {
      name: /Toggle all Question Fields/i,
    });

    await user.click(questionCategoryToggle);

    expect(onChange).toHaveBeenCalledWith({
      ...allDisabledConfig,
      include_question_text: true,
      include_question_type: true,
    });
  });
});
