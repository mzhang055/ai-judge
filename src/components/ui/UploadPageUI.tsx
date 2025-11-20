/**
 * UploadPageUI Presentation Component
 *
 * Pure presentation component that renders the file upload interface.
 * All state and handlers are passed as props from UploadPage container.
 */
import type { DragEvent, ChangeEvent, RefObject } from 'react';
import { Upload, Paperclip, X } from 'lucide-react';
import { SUPPORTED_EXTENSIONS } from '../../services/fileStorageService';
import type { Submission, UploadStatus } from '../../types';
import { StyledButton } from './StyledButton';

export interface UploadPageUIProps {
  className: string;
  uploadStatus: UploadStatus;
  isDragging: boolean;
  isDraggingAttachments: boolean;
  previewData: Submission[] | null;
  validatedData: Submission[] | null;
  showPreview: boolean;
  attachmentFiles: File[];
  fileInputRef: RefObject<HTMLInputElement | null>;
  attachmentInputRef: RefObject<HTMLInputElement | null>;
  isProcessing: boolean;
  onFileSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onClick: () => void;
  onConfirmUpload: () => void;
  onContinueToPreview: () => void;
  onBack: () => void;
  onAttachmentSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemoveAttachment: (fileIndex: number) => void;
  onAttachmentDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onAttachmentDragLeave: () => void;
  onAttachmentDrop: (event: DragEvent<HTMLDivElement>) => void;
  onAttachmentClick: () => void;
  onSkip?: () => void;
  setUploadStatus: (status: UploadStatus) => void;
}

/**
 * UploadPageUI - Pure presentation component for file upload interface
 */
export function UploadPageUI({
  className,
  uploadStatus,
  isDragging,
  isDraggingAttachments,
  previewData,
  validatedData,
  showPreview,
  attachmentFiles,
  fileInputRef,
  attachmentInputRef,
  isProcessing,
  onFileSelect,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
  onConfirmUpload,
  onContinueToPreview,
  onBack,
  onAttachmentSelect,
  onRemoveAttachment,
  onAttachmentDragOver,
  onAttachmentDragLeave,
  onAttachmentDrop,
  onAttachmentClick,
  onSkip,
  setUploadStatus,
}: UploadPageUIProps) {
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
                    {new Date(submission.createdAt).toLocaleString('en-US', {
                      timeZone:
                        Intl.DateTimeFormat().resolvedOptions().timeZone,
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })}
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
                      onClick={() => onRemoveAttachment(index)}
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
          <StyledButton
            onClick={onBack}
            variant="secondary"
            size="large"
            style={{ flex: 1 }}
          >
            Back
          </StyledButton>
          <StyledButton
            onClick={onConfirmUpload}
            variant="black"
            size="large"
            style={{ flex: 1 }}
          >
            Confirm Upload
          </StyledButton>
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
            onChange={onFileSelect}
            style={{ display: 'none' }}
            disabled={isProcessing}
          />

          <div
            className="upload-zone"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={onClick}
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
            {uploadStatus.status === 'idle' && !validatedData && (
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

            {uploadStatus.status === 'idle' && validatedData && (
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
                  1 file selected
                </div>
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
                <StyledButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadStatus({ status: 'idle' });
                  }}
                  variant="black"
                  size="medium"
                >
                  Try Again
                </StyledButton>
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
            onChange={onAttachmentSelect}
            style={{ display: 'none' }}
            disabled={isProcessing}
          />

          <div
            className="attachment-upload-zone"
            onDragOver={onAttachmentDragOver}
            onDragLeave={onAttachmentDragLeave}
            onDrop={onAttachmentDrop}
            onClick={onAttachmentClick}
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
          <StyledButton
            onClick={onContinueToPreview}
            disabled={isProcessing}
            variant="black"
            style={{
              padding: '14px 48px',
              borderRadius: '8px',
              fontSize: '15px',
              fontWeight: 600,
            }}
          >
            Continue to Preview →
          </StyledButton>
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

      {/* Skip Button */}
      {onSkip && !validatedData && (
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          <StyledButton
            onClick={onSkip}
            disabled={isProcessing}
            variant="secondary"
            style={{
              padding: '12px 32px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Skip to Queue
          </StyledButton>
        </div>
      )}
    </div>
  );
}
