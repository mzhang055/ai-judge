/**
 * FileUpload Component
 *
 * Handles JSON file upload, validation, and persistence to Supabase.
 * Supports drag-and-drop and click-to-browse file selection.
 *
 * @example
 * ```tsx
 * <FileUpload onUploadComplete={(count) => console.log(`Uploaded ${count} submissions`)} />
 * ```
 */
import { useState, useRef } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import {
  parseJSONFile,
  validateSubmissions,
  saveSubmissions,
} from '../services/submissionService';
import type { Submission, UploadStatus } from '../types';

export interface FileUploadProps {
  /** Callback fired when upload completes successfully */
  onUploadComplete?: (submissionCount: number) => void;
  /** Callback fired when an error occurs */
  onError?: (error: string) => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * FileUpload component for uploading and validating submission JSON files
 */
export function FileUpload({
  onUploadComplete,
  onError,
  className = '',
}: FileUploadProps) {
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>({
    status: 'idle',
  });
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    // Check file type
    if (!file.name.endsWith('.json')) {
      const error = 'Please upload a JSON file';
      setUploadStatus({ status: 'error', message: error });
      onError?.(error);
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
        return;
      }

      // Save to Supabase
      const submissions = data as Submission[];
      setUploadStatus({
        status: 'uploading',
        message: 'Uploading to database...',
        totalSubmissions: submissions.length,
        uploadedSubmissions: 0,
      });

      const savedIds = await saveSubmissions(submissions);

      setUploadStatus({
        status: 'success',
        message: `Successfully uploaded ${savedIds.length} submissions`,
        totalSubmissions: submissions.length,
        uploadedSubmissions: savedIds.length,
      });

      onUploadComplete?.(savedIds.length);

      // Reset after 3 seconds
      setTimeout(() => {
        setUploadStatus({ status: 'idle' });
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }, 3000);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      setUploadStatus({ status: 'error', message: errorMessage });
      onError?.(errorMessage);
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

  const isProcessing =
    uploadStatus.status === 'validating' || uploadStatus.status === 'uploading';

  return (
    <div className={`file-upload ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={isProcessing}
      />

      <div
        className="upload-zone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        style={{
          border: isDragging ? '2px dashed #000000' : '2px dashed #d1d1d1',
          borderRadius: '16px',
          padding: '64px 32px',
          textAlign: 'center',
          cursor: isProcessing ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.15s ease',
          background: '#ffffff',
          opacity: isProcessing ? 0.5 : 1,
        }}
      >
        {uploadStatus.status === 'idle' && (
          <>
            <Upload
              size={32}
              strokeWidth={1.5}
              style={{ margin: '0 auto 16px auto', color: '#666666' }}
            />
            <div
              style={{
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '8px',
                color: '#000000',
              }}
            >
              Upload JSON File
            </div>
            <p style={{ margin: 0, color: '#666666', fontSize: '14px' }}>
              Drag and drop or click to browse
            </p>
          </>
        )}

        {uploadStatus.status === 'validating' && (
          <>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '8px',
                color: '#000000',
              }}
            >
              Validating...
            </div>
            <p style={{ margin: 0, color: '#666666', fontSize: '14px' }}>
              {uploadStatus.message}
            </p>
          </>
        )}

        {uploadStatus.status === 'uploading' && (
          <>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '8px',
                color: '#000000',
              }}
            >
              Uploading...
            </div>
            <p style={{ margin: 0, color: '#666666', fontSize: '14px' }}>
              {uploadStatus.uploadedSubmissions} /{' '}
              {uploadStatus.totalSubmissions} submissions
            </p>
          </>
        )}

        {uploadStatus.status === 'success' && (
          <>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '8px',
                color: '#000000',
              }}
            >
              Upload Successful
            </div>
            <p style={{ margin: 0, color: '#666666', fontSize: '14px' }}>
              {uploadStatus.message}
            </p>
          </>
        )}

        {uploadStatus.status === 'error' && (
          <>
            <div
              style={{
                fontSize: '14px',
                fontWeight: 500,
                marginBottom: '8px',
                color: '#000000',
              }}
            >
              Upload Failed
            </div>
            <p
              style={{
                margin: '0 0 16px 0',
                color: '#666666',
                fontSize: '14px',
                whiteSpace: 'pre-wrap',
              }}
            >
              {uploadStatus.message}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setUploadStatus({ status: 'idle' });
              }}
              style={{
                padding: '10px 20px',
                background: '#000000',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Try Again
            </button>
          </>
        )}
      </div>

      <div
        style={{
          marginTop: '16px',
          fontSize: '13px',
          color: '#999999',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: '4px 0' }}>
          Expected: Array of submission objects with id, queueId,
          labelingTaskId, createdAt, questions, answers
        </p>
      </div>
    </div>
  );
}
