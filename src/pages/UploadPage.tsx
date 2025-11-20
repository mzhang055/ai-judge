/**
 * UploadPage Container Component
 *
 * Handles all state management, business logic, and event handlers for file upload.
 * Renders UploadPageUI with all necessary props.
 */
import { useState, useRef, useEffect } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import toast from 'react-hot-toast';
import {
  parseJSONFile,
  validateSubmissions,
  saveSubmissions,
} from '../services/submissionService';
import { uploadFiles, validateFile } from '../services/fileStorageService';
import type { Submission, UploadStatus } from '../types';
import { UploadPageUI } from '../components/ui/UploadPageUI';

export interface FileUploadProps {
  /** Callback fired when upload completes successfully */
  onUploadComplete?: ((submissionCount: number) => void) | (() => void);
  /** Callback fired when an error occurs */
  onError?: ((error: string) => void) | (() => void);
  /** Optional CSS class name */
  className?: string;
  /** Callback fired when user clicks Skip button */
  onSkip?: () => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * FileUpload container component - manages state and logic
 */
export function FileUpload({
  onUploadComplete,
  onError,
  className = '',
  onSkip,
}: FileUploadProps) {
  // State
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isDraggingAttachments, setIsDraggingAttachments] = useState(false);
  const [previewData, setPreviewData] = useState<Submission[] | null>(null);
  const [validatedData, setValidatedData] = useState<Submission[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Cleanup timeout and track mounted state
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handlers
  const handleFile = async (file: File) => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const error = `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`;
      setUploadStatus({ status: 'error', message: error });
      onError?.(error);
      toast.error(error);
      return;
    }

    // Check file type
    if (!file.name.endsWith('.json')) {
      const error = 'Please upload a JSON file';
      setUploadStatus({ status: 'error', message: error });
      onError?.(error);
      toast.error(error);
      return;
    }

    try {
      // Parse JSON
      setUploadStatus({
        status: 'validating',
        message: 'Parsing JSON file...',
      });
      const data = await parseJSONFile(file);

      // Validate
      setUploadStatus({
        status: 'validating',
        message: 'Validating submissions...',
      });
      const validationResult = validateSubmissions(data);

      if (!validationResult.valid) {
        const error = `Validation failed:\n${validationResult.errors.join('\n')}`;
        setUploadStatus({ status: 'error', message: error });
        onError?.(error);
        toast.error(error);
        return;
      }

      // Store validated data but don't show preview yet
      const submissions = data as Submission[];
      setValidatedData(submissions);
      setUploadStatus({ status: 'idle' });
      toast.success(
        `JSON validated: ${submissions.length} submission${submissions.length !== 1 ? 's' : ''}`
      );
    } catch (error) {
      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;

        // Check for network errors
        if (error.message.includes('Failed to fetch')) {
          errorMessage =
            'Network error: Unable to connect. Please check your internet connection and try again.';
        }
      }

      setUploadStatus({ status: 'error', message: errorMessage });
      onError?.(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleConfirmUpload = async () => {
    if (!previewData) return;

    try {
      // If there are attachment files, assign them to the first submission
      let submissionsWithAttachments = [...previewData];

      if (attachmentFiles.length > 0) {
        setUploadStatus({
          status: 'uploading',
          message: 'Uploading attachments...',
          totalSubmissions: previewData.length,
          uploadedSubmissions: 0,
        });

        // Upload all files to storage for the first submission
        const firstSubmissionId = previewData[0].id;
        const attachments = await uploadFiles(
          attachmentFiles,
          firstSubmissionId
        );

        // Attach to first submission
        submissionsWithAttachments[0] = {
          ...previewData[0],
          attachments,
        };
      }

      // Check if still mounted before updating state
      if (!isMountedRef.current) return;

      setUploadStatus({
        status: 'uploading',
        message: 'Saving to database...',
        totalSubmissions: previewData.length,
        uploadedSubmissions: 0,
      });

      const savedIds = await saveSubmissions(submissionsWithAttachments);

      // Check if still mounted before updating state
      if (!isMountedRef.current) return;

      setUploadStatus({
        status: 'success',
        message: `Successfully uploaded ${savedIds.length} submissions`,
        totalSubmissions: previewData.length,
        uploadedSubmissions: savedIds.length,
      });

      // Show success toast
      const message =
        attachmentFiles.length > 0
          ? `Successfully uploaded ${savedIds.length} submission${savedIds.length !== 1 ? 's' : ''} with ${attachmentFiles.length} attachment${attachmentFiles.length !== 1 ? 's' : ''}!`
          : `Successfully uploaded ${savedIds.length} submission${savedIds.length !== 1 ? 's' : ''}!`;
      toast.success(message);

      onUploadComplete?.(savedIds.length);

      // Reset after 3 seconds
      timeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        setUploadStatus({ status: 'idle' });
        setPreviewData(null);
        setAttachmentFiles([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        if (attachmentInputRef.current) {
          attachmentInputRef.current.value = '';
        }
      }, 3000);
    } catch (error) {
      // Check if still mounted before updating state
      if (!isMountedRef.current) return;

      let errorMessage = 'Unknown error occurred';

      if (error instanceof Error) {
        errorMessage = error.message;

        // Check for network errors
        if (error.message.includes('Failed to fetch')) {
          errorMessage =
            'Network error: Unable to connect to database. Please check your internet connection and try again.';
        }
      }

      setUploadStatus({ status: 'error', message: errorMessage });
      onError?.(errorMessage);
    }
  };

  const handleContinueToPreview = () => {
    if (!validatedData) {
      toast.error('Please upload a JSON file first');
      return;
    }
    setPreviewData(validatedData);
    setShowPreview(true);
  };

  const handleBack = () => {
    setPreviewData(null);
    setValidatedData(null);
    setShowPreview(false);
    setAttachmentFiles([]);
    setUploadStatus({ status: 'idle' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (attachmentInputRef.current) {
      attachmentInputRef.current.value = '';
    }
  };

  const handleAttachmentSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    // Validate all files
    const errors: string[] = [];
    files.forEach((file) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        errors.push(validation.error!);
      }
    });

    if (errors.length > 0) {
      toast.error(errors.join('\n'));
      return;
    }

    // Add to attachment files array
    setAttachmentFiles((prev) => [...prev, ...files]);

    // Warn if no JSON file has been uploaded yet
    if (!validatedData && attachmentFiles.length === 0) {
      toast.success(
        `Added ${files.length} attachment${files.length !== 1 ? 's' : ''}`,
        { duration: 3000 }
      );
      toast(
        () => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>Don't forget to upload a JSON file (required)</span>
          </div>
        ),
        {
          duration: 4000,
        }
      );
    } else {
      toast.success(
        `Added ${files.length} attachment${files.length !== 1 ? 's' : ''}`
      );
    }
  };

  const handleRemoveAttachment = (fileIndex: number) => {
    setAttachmentFiles((prev) => prev.filter((_, i) => i !== fileIndex));
  };

  const handleAttachmentDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingAttachments(true);
  };

  const handleAttachmentDragLeave = () => {
    setIsDraggingAttachments(false);
  };

  const handleAttachmentDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingAttachments(false);

    const files = Array.from(event.dataTransfer.files);
    if (files.length === 0) return;

    // Validate all files
    const errors: string[] = [];
    const validFiles: File[] = [];

    files.forEach((file) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        errors.push(validation.error!);
      } else {
        validFiles.push(file);
      }
    });

    if (errors.length > 0) {
      toast.error(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      setAttachmentFiles((prev) => [...prev, ...validFiles]);

      // Warn if no JSON file has been uploaded yet
      if (!validatedData && attachmentFiles.length === 0) {
        toast.success(
          `Added ${validFiles.length} attachment${validFiles.length !== 1 ? 's' : ''}`,
          { duration: 3000 }
        );
        toast(
          () => (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Don't forget to upload a JSON file (required)</span>
            </div>
          ),
          {
            duration: 4000,
          }
        );
      } else {
        toast.success(
          `Added ${validFiles.length} attachment${validFiles.length !== 1 ? 's' : ''}`
        );
      }
    }
  };

  const handleAttachmentClick = () => {
    attachmentInputRef.current?.click();
  };

  const isProcessing =
    uploadStatus.status === 'validating' || uploadStatus.status === 'uploading';

  // Render UI component with all props
  return (
    <UploadPageUI
      className={className}
      uploadStatus={uploadStatus}
      isDragging={isDragging}
      isDraggingAttachments={isDraggingAttachments}
      previewData={previewData}
      validatedData={validatedData}
      showPreview={showPreview}
      attachmentFiles={attachmentFiles}
      fileInputRef={fileInputRef}
      attachmentInputRef={attachmentInputRef}
      isProcessing={isProcessing}
      onFileSelect={handleFileSelect}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onConfirmUpload={handleConfirmUpload}
      onContinueToPreview={handleContinueToPreview}
      onBack={handleBack}
      onAttachmentSelect={handleAttachmentSelect}
      onRemoveAttachment={handleRemoveAttachment}
      onAttachmentDragOver={handleAttachmentDragOver}
      onAttachmentDragLeave={handleAttachmentDragLeave}
      onAttachmentDrop={handleAttachmentDrop}
      onAttachmentClick={handleAttachmentClick}
      onSkip={onSkip}
      setUploadStatus={setUploadStatus}
    />
  );
}
