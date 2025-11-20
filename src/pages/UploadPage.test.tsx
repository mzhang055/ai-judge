/**
 * Tests for FileUpload component
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { FileUpload } from './UploadPage';
import * as submissionService from '../services/submissionService';

// Mock the submission service
vi.mock('../services/submissionService', () => ({
  parseJSONFile: vi.fn(),
  validateSubmissions: vi.fn(),
  saveSubmissions: vi.fn(),
}));

// Mock the file storage service
vi.mock('../services/fileStorageService', () => ({
  uploadFiles: vi.fn(),
  validateFile: vi.fn(),
  SUPPORTED_EXTENSIONS: ['.png', '.jpg', '.jpeg', '.gif', '.pdf'],
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Helper to render with router
const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('FileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders upload zone with initial state', () => {
    renderWithRouter(<FileUpload />);

    expect(screen.getByText(/Upload JSON File/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Drag and drop or click to browse/i)
    ).toBeInTheDocument();
  });

  it('shows error when non-JSON file is selected', async () => {
    const onError = vi.fn();
    renderWithRouter(<FileUpload onError={onError} />);

    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    // Simulate file upload with a change event
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    fireEvent.change(input);

    await waitFor(
      () => {
        expect(screen.getByText('Upload Failed')).toBeInTheDocument();
        expect(onError).toHaveBeenCalledWith('Please upload a JSON file');
      },
      { timeout: 3000 }
    );
  });

  it('validates and uploads valid JSON file', async () => {
    const mockSubmissions = [
      {
        id: 'sub_1',
        queueId: 'queue_1',
        labelingTaskId: 'task_1',
        createdAt: 1690000000000,
        questions: [],
        answers: {},
      },
    ];

    vi.mocked(submissionService.parseJSONFile).mockResolvedValue(
      mockSubmissions
    );
    vi.mocked(submissionService.validateSubmissions).mockReturnValue({
      valid: true,
      errors: [],
    });
    vi.mocked(submissionService.saveSubmissions).mockResolvedValue(['sub_1']);

    const onUploadComplete = vi.fn();
    renderWithRouter(<FileUpload onUploadComplete={onUploadComplete} />);

    const file = new File(
      [JSON.stringify(mockSubmissions)],
      'submissions.json',
      {
        type: 'application/json',
      }
    );
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    // Simulate file upload
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    fireEvent.change(input);

    // Wait for validation success message
    await waitFor(
      () => {
        expect(screen.getByText(/Continue to Preview/)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Click continue to preview button
    const continueButton = screen.getByText(/Continue to Preview/);
    fireEvent.click(continueButton);

    // Wait for preview to show
    await waitFor(
      () => {
        expect(screen.getByText(/Preview:/)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Click confirm button
    const confirmButton = screen.getByText('Confirm Upload');
    fireEvent.click(confirmButton);

    // Should eventually show success state
    await waitFor(
      () => {
        expect(screen.getByText('Upload Successful')).toBeInTheDocument();
        expect(onUploadComplete).toHaveBeenCalledWith(1);
      },
      { timeout: 3000 }
    );
  });

  it('shows validation errors', async () => {
    const mockData = [{ invalid: 'data' }];

    vi.mocked(submissionService.parseJSONFile).mockResolvedValue(mockData);
    vi.mocked(submissionService.validateSubmissions).mockReturnValue({
      valid: false,
      errors: ['Submission 1: Missing or invalid "id" field'],
    });

    const onError = vi.fn();
    renderWithRouter(<FileUpload onError={onError} />);

    const file = new File([JSON.stringify(mockData)], 'invalid.json', {
      type: 'application/json',
    });
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('Upload Failed')).toBeInTheDocument();
      expect(onError).toHaveBeenCalled();
    });
  });

  it('handles JSON parse errors', async () => {
    vi.mocked(submissionService.parseJSONFile).mockRejectedValue(
      new Error('Invalid JSON format: Unexpected token')
    );

    const onError = vi.fn();
    renderWithRouter(<FileUpload onError={onError} />);

    const file = new File(['invalid json'], 'invalid.json', {
      type: 'application/json',
    });
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('Upload Failed')).toBeInTheDocument();
      expect(onError).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JSON format')
      );
    });
  });

  it('handles upload errors', async () => {
    const mockSubmissions = [
      {
        id: 'sub_1',
        queueId: 'queue_1',
        labelingTaskId: 'task_1',
        createdAt: 1690000000000,
        questions: [],
        answers: {},
      },
    ];

    vi.mocked(submissionService.parseJSONFile).mockResolvedValue(
      mockSubmissions
    );
    vi.mocked(submissionService.validateSubmissions).mockReturnValue({
      valid: true,
      errors: [],
    });
    vi.mocked(submissionService.saveSubmissions).mockRejectedValue(
      new Error('Failed to save submissions: Database error')
    );

    const onError = vi.fn();
    renderWithRouter(<FileUpload onError={onError} />);

    const file = new File(
      [JSON.stringify(mockSubmissions)],
      'submissions.json',
      {
        type: 'application/json',
      }
    );
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    fireEvent.change(input);

    // Wait for validation and click continue
    await waitFor(
      () => {
        expect(screen.getByText(/Continue to Preview/)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    const continueButton = screen.getByText(/Continue to Preview/);
    fireEvent.click(continueButton);

    // Wait for preview to show
    await waitFor(
      () => {
        expect(screen.getByText(/Preview:/)).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    // Click confirm button
    const confirmButton = screen.getByText('Confirm Upload');
    fireEvent.click(confirmButton);

    // Should show error
    await waitFor(
      () => {
        expect(screen.getByText('Upload Failed')).toBeInTheDocument();
        expect(onError).toHaveBeenCalledWith(
          expect.stringContaining('Failed to save submissions')
        );
      },
      { timeout: 3000 }
    );
  });

  it('allows retry after error', async () => {
    const onError = vi.fn();
    renderWithRouter(<FileUpload onError={onError} />);

    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    // Simulate file upload
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('Upload Failed')).toBeInTheDocument();
    });

    const tryAgainButton = screen.getByText('Try Again');
    fireEvent.click(tryAgainButton);

    expect(screen.getByText(/Upload JSON File/i)).toBeInTheDocument();
  });

  it('disables interaction during processing', async () => {
    vi.mocked(submissionService.parseJSONFile).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000))
    );

    renderWithRouter(<FileUpload />);

    const file = new File(['{}'], 'test.json', { type: 'application/json' });
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    Object.defineProperty(input, 'files', {
      value: [file],
      writable: false,
    });
    fireEvent.change(input);

    await waitFor(() => {
      expect(screen.getByText('Validating...')).toBeInTheDocument();
    });

    const fileInput = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(fileInput).toBeDisabled();
  });

  it('applies custom className', () => {
    const { container } = renderWithRouter(
      <FileUpload className="custom-class" />
    );
    expect(container.querySelector('.custom-class')).toBeInTheDocument();
  });
});
