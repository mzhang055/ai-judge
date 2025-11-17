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
import { useState, useRef, useEffect } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  parseJSONFile,
  validateSubmissions,
  saveSubmissions,
} from '../services/submissionService';
import type { Submission, UploadStatus } from '../types';

export interface FileUploadProps {
  /** Callback fired when upload completes successfully */
  onUploadComplete?: ((submissionCount: number) => void) | (() => void);
  /** Callback fired when an error occurs */
  onError?: ((error: string) => void) | (() => void);
  /** Optional CSS class name */
  className?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
  const [previewData, setPreviewData] = useState<Submission[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFile = async (file: File) => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const error = `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`;
      setUploadStatus({ status: 'error', message: error });
      onError?.(error);
      return;
    }

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

      // Show preview instead of immediately uploading
      const submissions = data as Submission[];
      setPreviewData(submissions);
      setUploadStatus({ status: 'idle' });
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
      setUploadStatus({
        status: 'uploading',
        message: 'Uploading to database...',
        totalSubmissions: previewData.length,
        uploadedSubmissions: 0,
      });

      const savedIds = await saveSubmissions(previewData);

      // Check if still mounted before updating state
      if (!isMountedRef.current) return;

      setUploadStatus({
        status: 'success',
        message: `Successfully uploaded ${savedIds.length} submissions`,
        totalSubmissions: previewData.length,
        uploadedSubmissions: savedIds.length,
      });

      // Show success toast
      toast.success(
        `Successfully uploaded ${savedIds.length} submission${savedIds.length !== 1 ? 's' : ''}!`
      );

      onUploadComplete?.(savedIds.length);

      // Reset after 3 seconds
      timeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        setUploadStatus({ status: 'idle' });
        setPreviewData(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
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

  const handleBack = () => {
    setPreviewData(null);
    setUploadStatus({ status: 'idle' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const isProcessing =
    uploadStatus.status === 'validating' || uploadStatus.status === 'uploading';

  // Show preview if data is loaded and not in uploading/success/error state
  if (
    previewData &&
    uploadStatus.status !== 'uploading' &&
    uploadStatus.status !== 'success' &&
    uploadStatus.status !== 'error'
  ) {
    return (
      <div className={`file-upload ${className}`}>
        <div style={{ marginBottom: '24px' }}>
          <h2
            style={{
              fontSize: '18px',
              fontWeight: 600,
              margin: '0 0 16px 0',
              color: '#000000',
            }}
          >
            Preview: {previewData.length} Submission
            {previewData.length !== 1 ? 's' : ''}
          </h2>

          <div
            style={{
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              padding: '16px',
              maxHeight: '500px',
              overflowY: 'auto',
              background: '#fafafa',
            }}
          >
            {previewData.map((submission, index) => (
              <div
                key={submission.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e5e5e5',
                  borderRadius: '6px',
                  padding: '16px',
                  marginBottom: index < previewData.length - 1 ? '16px' : '0',
                }}
              >
                {/* Basic Info */}
                <div
                  style={{
                    marginBottom: '12px',
                    paddingBottom: '12px',
                    borderBottom: '1px solid #f0f0f0',
                  }}
                >
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#666666',
                      marginBottom: '6px',
                    }}
                  >
                    <strong style={{ color: '#000000' }}>ID:</strong>{' '}
                    {submission.id}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#666666',
                      marginBottom: '6px',
                    }}
                  >
                    <strong style={{ color: '#000000' }}>Queue ID:</strong>{' '}
                    {submission.queueId}
                  </div>
                  <div
                    style={{
                      fontSize: '13px',
                      color: '#666666',
                      marginBottom: '6px',
                    }}
                  >
                    <strong style={{ color: '#000000' }}>
                      Labeling Task ID:
                    </strong>{' '}
                    {submission.labelingTaskId}
                  </div>
                  <div style={{ fontSize: '13px', color: '#666666' }}>
                    <strong style={{ color: '#000000' }}>Created At:</strong>{' '}
                    {new Date(submission.createdAt).toLocaleString()}
                  </div>
                </div>

                {/* Questions */}
                <div style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#000000',
                      marginBottom: '8px',
                    }}
                  >
                    Questions ({submission.questions.length}):
                  </div>
                  {submission.questions.map((q, qIndex) => (
                    <div
                      key={q.data.id}
                      style={{
                        background: '#f9f9f9',
                        padding: '10px',
                        borderRadius: '4px',
                        marginBottom:
                          qIndex < submission.questions.length - 1
                            ? '8px'
                            : '0',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#666666',
                          marginBottom: '4px',
                        }}
                      >
                        <strong style={{ color: '#000000' }}>ID:</strong>{' '}
                        {q.data.id}
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#666666',
                          marginBottom: '4px',
                        }}
                      >
                        <strong style={{ color: '#000000' }}>Type:</strong>{' '}
                        {q.data.questionType}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666666' }}>
                        <strong style={{ color: '#000000' }}>Text:</strong>{' '}
                        {q.data.questionText}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Answers */}
                <div>
                  <div
                    style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#000000',
                      marginBottom: '8px',
                    }}
                  >
                    Answers:
                  </div>
                  {Object.entries(submission.answers).map(
                    ([key, answer], aIndex) => (
                      <div
                        key={key}
                        style={{
                          background: '#f9f9f9',
                          padding: '10px',
                          borderRadius: '4px',
                          marginBottom:
                            aIndex < Object.keys(submission.answers).length - 1
                              ? '8px'
                              : '0',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#666666',
                            marginBottom: '4px',
                          }}
                        >
                          <strong style={{ color: '#000000' }}>
                            Question:
                          </strong>{' '}
                          {key}
                        </div>
                        {answer.choice && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#666666',
                              marginBottom: '4px',
                            }}
                          >
                            <strong style={{ color: '#000000' }}>
                              Choice:
                            </strong>{' '}
                            {Array.isArray(answer.choice)
                              ? answer.choice.join(', ')
                              : answer.choice}
                          </div>
                        )}
                        {answer.reasoning && (
                          <div
                            style={{
                              fontSize: '12px',
                              color: '#666666',
                              marginBottom: '4px',
                            }}
                          >
                            <strong style={{ color: '#000000' }}>
                              Reasoning:
                            </strong>{' '}
                            {answer.reasoning}
                          </div>
                        )}
                        {answer.text && (
                          <div style={{ fontSize: '12px', color: '#666666' }}>
                            <strong style={{ color: '#000000' }}>Text:</strong>{' '}
                            {answer.text}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleBack}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: '#ffffff',
              color: '#000000',
              border: '1px solid #e5e5e5',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Back
          </button>
          <button
            onClick={handleConfirmUpload}
            style={{
              flex: 1,
              padding: '12px 24px',
              background: '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Confirm Upload
          </button>
        </div>
      </div>
    );
  }

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
