/**
 * FileUpload Component
 *
 * Handles JSON file upload, validation, and persistence to Supabase.
 * Supports drag-and-drop and click-to-browse file selection.
 * Also supports uploading file attachments (images, PDFs) for submissions.
 *
 * @example
 * ```tsx
 * <FileUpload onUploadComplete={(count) => console.log(`Uploaded ${count} submissions`)} />
 * ```
 */
import { useState, useRef, useEffect } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import { Upload, Paperclip, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  parseJSONFile,
  validateSubmissions,
  saveSubmissions,
} from '../services/submissionService';
import {
  uploadFiles,
  validateFile,
  SUPPORTED_EXTENSIONS,
} from '../services/fileStorageService';
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
  const [isDraggingAttachments, setIsDraggingAttachments] = useState(false);
  const [previewData, setPreviewData] = useState<Submission[] | null>(null);
  const [validatedData, setValidatedData] = useState<Submission[] | null>(null); // JSON validated but not previewing yet
  const [showPreview, setShowPreview] = useState(false); // Control when to show preview
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]); // All uploaded attachment files
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
      // (User can see this in preview and we'll improve assignment later)
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
    toast.success(
      `Added ${files.length} attachment${files.length !== 1 ? 's' : ''}`
    );
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
      toast.success(
        `Added ${validFiles.length} attachment${validFiles.length !== 1 ? 's' : ''}`
      );
    }
  };

  const handleAttachmentClick = () => {
    attachmentInputRef.current?.click();
  };

  const isProcessing =
    uploadStatus.status === 'validating' || uploadStatus.status === 'uploading';

  // Show preview if data is loaded and showPreview is true
  if (
    showPreview &&
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

          {/* Show attachments if any */}
          {attachmentFiles.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  margin: '0 0 12px 0',
                  color: '#000000',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Paperclip size={18} />
                Attachments ({attachmentFiles.length})
              </h3>
              <div
                style={{
                  border: '1px solid #e5e5e5',
                  borderRadius: '8px',
                  padding: '16px',
                  background: '#fafafa',
                }}
              >
                {attachmentFiles.map((file, index) => (
                  <div
                    key={index}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e5e5e5',
                      borderRadius: '4px',
                      padding: '12px',
                      marginBottom:
                        index < attachmentFiles.length - 1 ? '8px' : '0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div style={{ fontSize: '13px', color: '#666666' }}>
                      <strong style={{ color: '#000000' }}>{file.name}</strong>
                      <span style={{ marginLeft: '8px' }}>
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveAttachment(index)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        color: '#666666',
                      }}
                      title="Remove attachment"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
                <div
                  style={{
                    fontSize: '12px',
                    color: '#999999',
                    marginTop: '12px',
                  }}
                >
                  These files will be attached to the first submission
                </div>
              </div>
            </div>
          )}
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
      <div style={{ display: 'flex', gap: '24px' }}>
        {/* JSON Upload Box */}
        <div style={{ flex: 1 }}>
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
              minHeight: '200px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
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
                  Upload JSON File (Required)
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
              Expected: Array of submission objects
            </p>
          </div>
        </div>

        {/* Attachment Upload Box */}
        <div style={{ flex: 1 }}>
          <input
            ref={attachmentInputRef}
            type="file"
            accept={SUPPORTED_EXTENSIONS.join(',')}
            multiple
            onChange={handleAttachmentSelect}
            style={{ display: 'none' }}
            disabled={isProcessing}
          />

          <div
            className="attachment-upload-zone"
            onDragOver={handleAttachmentDragOver}
            onDragLeave={handleAttachmentDragLeave}
            onDrop={handleAttachmentDrop}
            onClick={handleAttachmentClick}
            style={{
              border: isDraggingAttachments
                ? '2px dashed #000000'
                : '2px dashed #d1d1d1',
              borderRadius: '16px',
              padding: '64px 32px',
              textAlign: 'center',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              transition: 'border-color 0.15s ease',
              background: '#ffffff',
              opacity: isProcessing ? 0.5 : 1,
              minHeight: '200px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Paperclip
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
              Upload Attachments (Optional)
            </div>
            <p style={{ margin: 0, color: '#666666', fontSize: '14px' }}>
              Drag and drop images/PDFs or click to browse
            </p>
            {attachmentFiles.length > 0 && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  background: '#f0f0f0',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#000000',
                  display: 'inline-block',
                }}
              >
                {attachmentFiles.length} file
                {attachmentFiles.length !== 1 ? 's' : ''} selected
              </div>
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
              Supported: PNG, JPG, GIF, WEBP, PDF (max 50MB)
            </p>
          </div>
        </div>
      </div>

      {/* Continue Button */}
      {validatedData && (
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <button
            onClick={handleContinueToPreview}
            disabled={isProcessing}
            style={{
              padding: '14px 48px',
              background: '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              fontSize: '15px',
              fontWeight: 600,
              opacity: isProcessing ? 0.5 : 1,
            }}
          >
            Continue to Preview →
          </button>
          <div
            style={{
              marginTop: '12px',
              fontSize: '13px',
              color: '#666666',
            }}
          >
            {validatedData.length} submission
            {validatedData.length !== 1 ? 's' : ''} ready
            {attachmentFiles.length > 0 &&
              ` · ${attachmentFiles.length} attachment${attachmentFiles.length !== 1 ? 's' : ''}`}
          </div>
        </div>
      )}
    </div>
  );
}
