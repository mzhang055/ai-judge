/**
 * File Storage Service
 *
 * Handles uploading and managing file attachments in Supabase Storage.
 * Supports images (PNG, JPG, GIF, WEBP) and PDFs for multimodal LLM evaluation.
 */
import { supabase } from '../lib/supabase';

/**
 * Metadata for an uploaded file attachment
 */
export interface FileAttachment {
  file_name: string;
  file_path: string; // Path in Supabase Storage
  mime_type: string;
  size_bytes: number;
  uploaded_at: string; // ISO timestamp
}

/**
 * Supported file types for attachments
 */
export const SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
  'application/pdf',
] as const;

export const SUPPORTED_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.pdf',
] as const;

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const BUCKET_NAME = 'submission-attachments';

/**
 * Validates if a file is an allowed type and size
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File "${file.name}" exceeds maximum size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // Check MIME type
  if (!SUPPORTED_MIME_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: `File "${file.name}" has unsupported type "${file.type}". Supported types: images (PNG, JPG, GIF, WEBP) and PDF`,
    };
  }

  // Check file extension as additional validation
  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0];
  if (!extension || !SUPPORTED_EXTENSIONS.includes(extension as any)) {
    return {
      valid: false,
      error: `File "${file.name}" has unsupported extension. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * Uploads a file to Supabase Storage
 *
 * @param file - File to upload
 * @param submissionId - ID of the submission this file belongs to
 * @returns FileAttachment metadata
 * @throws Error if upload fails
 */
export async function uploadFile(
  file: File,
  submissionId: string
): Promise<FileAttachment> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Generate unique file path: submissions/{submissionId}/{timestamp}_{filename}
  const timestamp = Date.now();
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const filePath = `submissions/${submissionId}/${timestamp}_${sanitizedFileName}`;

  try {
    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(`Failed to upload file "${file.name}": ${error.message}`);
    }

    // Return metadata
    const attachment: FileAttachment = {
      file_name: file.name,
      file_path: data.path,
      mime_type: file.type,
      size_bytes: file.size,
      uploaded_at: new Date().toISOString(),
    };

    return attachment;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Unknown error uploading file "${file.name}"`);
  }
}

/**
 * Uploads multiple files in parallel
 *
 * @param files - Array of files to upload
 * @param submissionId - ID of the submission these files belong to
 * @returns Array of FileAttachment metadata
 * @throws Error if any upload fails (includes partial upload info)
 */
export async function uploadFiles(
  files: File[],
  submissionId: string
): Promise<FileAttachment[]> {
  if (files.length === 0) {
    return [];
  }

  // Validate all files first
  const validationErrors: string[] = [];
  for (const file of files) {
    const validation = validateFile(file);
    if (!validation.valid) {
      validationErrors.push(validation.error!);
    }
  }

  if (validationErrors.length > 0) {
    throw new Error(`File validation failed:\n${validationErrors.join('\n')}`);
  }

  // Upload all files in parallel
  try {
    const uploadPromises = files.map((file) => uploadFile(file, submissionId));
    const attachments = await Promise.all(uploadPromises);
    return attachments;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Batch upload failed: ${error.message}`);
    }
    throw new Error('Unknown error during batch upload');
  }
}

/**
 * Gets a public URL for a file attachment
 * Note: Requires the storage bucket to be public or proper RLS policies
 *
 * @param filePath - Path to file in Supabase Storage
 * @returns Public URL or signed URL
 */
export function getFileUrl(filePath: string): string {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Gets a signed URL for a private file attachment (expires in 1 hour)
 *
 * @param filePath - Path to file in Supabase Storage
 * @returns Signed URL that expires
 * @throws Error if URL generation fails
 */
export async function getSignedFileUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 3600); // 1 hour expiration

  if (error) {
    throw new Error(`Failed to generate signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Downloads file data as base64 (for sending to LLM APIs)
 *
 * @param filePath - Path to file in Supabase Storage
 * @returns Base64-encoded file data
 * @throws Error if download fails
 */
export async function downloadFileAsBase64(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(filePath);

  if (error || !data) {
    throw new Error(
      `Failed to download file: ${error?.message || 'Unknown error'}`
    );
  }

  // Convert blob to base64
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64Data = base64.split(',')[1] || base64;
      resolve(base64Data);
    };
    reader.onerror = () => reject(new Error('Failed to read file as base64'));
    reader.readAsDataURL(data);
  });
}

/**
 * Deletes a file from Supabase Storage
 *
 * @param filePath - Path to file in Supabase Storage
 * @throws Error if deletion fails
 */
export async function deleteFile(filePath: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}

/**
 * Deletes multiple files in parallel
 *
 * @param filePaths - Array of file paths in Supabase Storage
 * @throws Error if any deletion fails
 */
export async function deleteFiles(filePaths: string[]): Promise<void> {
  if (filePaths.length === 0) {
    return;
  }

  const { error } = await supabase.storage.from(BUCKET_NAME).remove(filePaths);

  if (error) {
    throw new Error(`Failed to delete files: ${error.message}`);
  }
}
