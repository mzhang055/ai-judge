/**
 * LLM Provider Abstraction
 * Always uses OpenAI GPT-5-mini
 */

// Fixed model - always use GPT-5-mini
export const DEFAULT_MODEL = 'gpt-5-mini';

// Error types for better error handling
export const LLMErrorType = {
  TIMEOUT: 'TIMEOUT',
  RATE_LIMIT: 'RATE_LIMIT',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INVALID_REQUEST: 'INVALID_REQUEST',
  SERVER_ERROR: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN',
} as const;

export type LLMErrorType = (typeof LLMErrorType)[keyof typeof LLMErrorType];

export class LLMError extends Error {
  type: LLMErrorType;
  statusCode?: number;
  retryAfter?: number;
  originalError?: unknown;

  constructor(
    message: string,
    type: LLMErrorType,
    statusCode?: number,
    retryAfter?: number,
    originalError?: unknown
  ) {
    super(message);
    this.name = 'LLMError';
    this.type = type;
    this.statusCode = statusCode;
    this.retryAfter = retryAfter;
    this.originalError = originalError;
  }

  get isRetryable(): boolean {
    const retryableTypes: LLMErrorType[] = [
      LLMErrorType.TIMEOUT,
      LLMErrorType.RATE_LIMIT,
      LLMErrorType.NETWORK_ERROR,
      LLMErrorType.SERVER_ERROR,
    ];
    return retryableTypes.includes(this.type);
  }
}

/**
 * Content part for multimodal messages (text or image)
 */
export interface LLMContentPart {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string; // Can be URL or base64 data URL
  };
}

/**
 * LLM message - can be simple string or multimodal array
 */
export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | LLMContentPart[];
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMCallOptions {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  timeout?: number; // timeout in milliseconds
  retries?: number; // number of retries for transient failures
  retryDelay?: number; // base delay between retries in milliseconds
}

/**
 * OpenAI API error response structure
 */
interface OpenAIErrorResponse {
  error?: {
    message?: string;
    type?: string;
  };
  retryAfter?: string;
}

/**
 * Parse error from OpenAI API response
 */
function parseOpenAIError(
  status: number,
  errorData: OpenAIErrorResponse,
  statusText: string
): LLMError {
  const errorMessage = errorData?.error?.message || statusText;
  const errorType = errorData?.error?.type;

  // Parse retry-after header if present
  let retryAfter: number | undefined;
  if (errorData?.retryAfter) {
    retryAfter = parseInt(errorData.retryAfter, 10);
  }

  // Classify error type
  let type: LLMErrorType;

  switch (status) {
    case 401:
      type = LLMErrorType.INVALID_API_KEY;
      break;
    case 429:
      // Could be rate limit or quota exceeded
      if (
        errorType === 'insufficient_quota' ||
        errorMessage.toLowerCase().includes('quota')
      ) {
        type = LLMErrorType.QUOTA_EXCEEDED;
      } else {
        type = LLMErrorType.RATE_LIMIT;
      }
      break;
    case 400:
      type = LLMErrorType.INVALID_REQUEST;
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      type = LLMErrorType.SERVER_ERROR;
      break;
    default:
      type = LLMErrorType.UNKNOWN;
  }

  return new LLMError(
    `OpenAI API error (${status}): ${errorMessage}`,
    type,
    status,
    retryAfter,
    errorData
  );
}

/**
 * Call OpenAI API with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    // Check if error is due to abort
    if (error instanceof Error && error.name === 'AbortError') {
      throw new LLMError(
        `Request timed out after ${timeout}ms`,
        LLMErrorType.TIMEOUT,
        undefined,
        undefined,
        error
      );
    }

    // Network error
    throw new LLMError(
      `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      LLMErrorType.NETWORK_ERROR,
      undefined,
      undefined,
      error
    );
  }
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call OpenAI API with GPT-5-mini (with retries and timeout)
 */
async function callOpenAI(options: LLMCallOptions): Promise<LLMResponse> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new LLMError(
      'OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.',
      LLMErrorType.INVALID_API_KEY
    );
  }

  const timeout = options.timeout ?? 30000; // Default 30s timeout
  const maxRetries = options.retries ?? 3; // Default 3 retries
  const baseRetryDelay = options.retryDelay ?? 1000; // Default 1s base delay

  let lastError: LLMError | undefined;

  // Retry loop
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: DEFAULT_MODEL,
            messages: options.messages,
            // GPT-5 only supports temperature: 1 (default), so we omit it
            max_completion_tokens: options.maxTokens ?? 1000,
          }),
        },
        timeout
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          retryAfter: response.headers.get('retry-after'),
        }));

        const error = parseOpenAIError(
          response.status,
          errorData,
          response.statusText
        );

        // Don't retry non-retryable errors
        if (!error.isRetryable) {
          throw error;
        }

        lastError = error;

        // Calculate retry delay (exponential backoff)
        const retryDelay = error.retryAfter
          ? error.retryAfter * 1000 // retry-after is in seconds
          : baseRetryDelay * Math.pow(2, attempt);

        console.warn(
          `[LLM] Attempt ${attempt + 1}/${maxRetries + 1} failed: ${error.message}. Retrying in ${retryDelay}ms...`
        );

        if (attempt < maxRetries) {
          await sleep(retryDelay);
          continue; // Retry
        }

        throw error; // Max retries exceeded
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      if (!choice) {
        throw new LLMError(
          'No response from OpenAI API',
          LLMErrorType.UNKNOWN,
          undefined,
          undefined,
          data
        );
      }

      // Handle null or undefined content
      const content = choice.message.content || '';

      console.log('[LLM] Response content length:', content.length);
      console.log('[LLM] Full choice object:', JSON.stringify(choice, null, 2));

      return {
        content,
        model: data.model,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
      };
    } catch (error) {
      // If it's already an LLMError, propagate it
      if (error instanceof LLMError) {
        if (!error.isRetryable || attempt >= maxRetries) {
          throw error;
        }
        lastError = error;

        const retryDelay = baseRetryDelay * Math.pow(2, attempt);
        console.warn(
          `[LLM] Attempt ${attempt + 1}/${maxRetries + 1} failed: ${error.message}. Retrying in ${retryDelay}ms...`
        );

        if (attempt < maxRetries) {
          await sleep(retryDelay);
          continue;
        }

        throw error;
      }

      // Unexpected error
      throw new LLMError(
        `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        LLMErrorType.UNKNOWN,
        undefined,
        undefined,
        error
      );
    }
  }

  // Should never reach here, but just in case
  throw lastError || new LLMError('Max retries exceeded', LLMErrorType.UNKNOWN);
}

/**
 * Main function to call LLM (always uses OpenAI GPT-5-mini)
 */
export async function callLLM(options: LLMCallOptions): Promise<LLMResponse> {
  return callOpenAI(options);
}

/**
 * Helper: Build a multimodal user message with text and image attachments
 *
 * @param text - The text content
 * @param imageUrls - Array of image URLs (can be https:// URLs or data: URLs with base64)
 * @returns LLMMessage with multimodal content
 *
 * @example
 * ```ts
 * const message = buildMultimodalMessage(
 *   "Does this image show a blue sky?",
 *   ["https://example.com/sky.jpg"]
 * );
 * ```
 */
export function buildMultimodalMessage(
  text: string,
  imageUrls: string[]
): LLMMessage {
  const contentParts: LLMContentPart[] = [
    { type: 'text', text },
    ...imageUrls.map((url) => ({
      type: 'image_url' as const,
      image_url: { url },
    })),
  ];

  return {
    role: 'user',
    content: contentParts,
  };
}

/**
 * Helper: Check if a file attachment is an image (supported by vision models)
 *
 * @param mimeType - MIME type of the attachment
 * @returns true if the file is a supported image type
 */
export function isImageAttachment(mimeType: string): boolean {
  const supportedImageTypes = [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/gif',
    'image/webp',
  ];
  return supportedImageTypes.includes(mimeType.toLowerCase());
}

/**
 * Helper: Check if a file attachment is a PDF
 *
 * @param mimeType - MIME type of the attachment
 * @returns true if the file is a PDF
 */
export function isPdfAttachment(mimeType: string): boolean {
  return mimeType.toLowerCase() === 'application/pdf';
}
