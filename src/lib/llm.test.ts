/**
 * Tests for LLM service error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callLLM, LLMError, LLMErrorType } from './llm';

// Mock fetch globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as any;

describe('LLM Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set API key for tests
    vi.stubEnv('VITE_OPENAI_API_KEY', 'test-api-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Successful requests', () => {
    it('should successfully call OpenAI API', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: 'Verdict: pass\nReasoning: Looks good',
                },
              },
            ],
            model: 'gpt-5-mini',
            usage: {
              prompt_tokens: 100,
              completion_tokens: 50,
              total_tokens: 150,
            },
          }),
          { status: 200 }
        )
      );

      const result = await callLLM({
        messages: [
          { role: 'system', content: 'You are a judge' },
          { role: 'user', content: 'Evaluate this' },
        ],
      });

      expect(result.content).toBe('Verdict: pass\nReasoning: Looks good');
      expect(result.model).toBe('gpt-5-mini');
      expect(result.usage?.totalTokens).toBe(150);
    });
  });

  describe('Error handling', () => {
    it('should throw LLMError for missing API key', async () => {
      vi.stubEnv('VITE_OPENAI_API_KEY', '');

      await expect(
        callLLM({
          messages: [{ role: 'user', content: 'test' }],
        })
      ).rejects.toThrow(LLMError);

      await expect(
        callLLM({
          messages: [{ role: 'user', content: 'test' }],
        })
      ).rejects.toMatchObject({
        type: LLMErrorType.INVALID_API_KEY,
      });
    });

    it('should handle 401 Unauthorized errors', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              message: 'Invalid API key',
              type: 'invalid_request_error',
            },
          }),
          { status: 401 }
        )
      );

      await expect(
        callLLM({
          messages: [{ role: 'user', content: 'test' }],
        })
      ).rejects.toMatchObject({
        type: LLMErrorType.INVALID_API_KEY,
        statusCode: 401,
        isRetryable: false,
      });
    });

    it('should handle 429 rate limit errors', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              message: 'Rate limit exceeded',
              type: 'rate_limit_error',
            },
          }),
          {
            status: 429,
            headers: { 'retry-after': '5' },
          }
        )
      );

      await expect(
        callLLM({
          messages: [{ role: 'user', content: 'test' }],
          retries: 0, // Disable retries for this test
        })
      ).rejects.toMatchObject({
        type: LLMErrorType.RATE_LIMIT,
        statusCode: 429,
        isRetryable: true,
      });
    });

    it('should handle 429 quota exceeded errors', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              message: 'You have exceeded your quota',
              type: 'insufficient_quota',
            },
          }),
          { status: 429 }
        )
      );

      await expect(
        callLLM({
          messages: [{ role: 'user', content: 'test' }],
          retries: 0,
        })
      ).rejects.toMatchObject({
        type: LLMErrorType.QUOTA_EXCEEDED,
        statusCode: 429,
        isRetryable: false,
      });
    });

    it('should handle 500 server errors', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              message: 'Internal server error',
            },
          }),
          { status: 500 }
        )
      );

      await expect(
        callLLM({
          messages: [{ role: 'user', content: 'test' }],
          retries: 0,
        })
      ).rejects.toMatchObject({
        type: LLMErrorType.SERVER_ERROR,
        statusCode: 500,
        isRetryable: true,
      });
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(
        callLLM({
          messages: [{ role: 'user', content: 'test' }],
          retries: 0,
        })
      ).rejects.toMatchObject({
        type: LLMErrorType.NETWORK_ERROR,
        isRetryable: true,
      });
    });

    it('should handle timeout errors', async () => {
      // Mock a slow response that responds to abort signal
      mockFetch.mockImplementationOnce(
        (options: RequestInit) =>
          new Promise((resolve, reject) => {
            const timeout = setTimeout(
              () =>
                resolve(
                  new Response(JSON.stringify({ choices: [] }), { status: 200 })
                ),
              200
            );

            // Listen for abort signal
            if (options.signal) {
              options.signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                const error = new Error('The operation was aborted');
                error.name = 'AbortError';
                reject(error);
              });
            }
          })
      );

      await expect(
        callLLM({
          messages: [{ role: 'user', content: 'test' }],
          timeout: 100, // 100ms timeout
          retries: 0,
        })
      ).rejects.toMatchObject({
        type: LLMErrorType.TIMEOUT,
        isRetryable: true,
      });
    }, 10000); // Increase test timeout
  });

  describe('Retry logic', () => {
    it('should retry on rate limit errors with exponential backoff', async () => {
      // First two calls fail with rate limit, third succeeds
      mockFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              error: { message: 'Rate limit', type: 'rate_limit_error' },
            }),
            { status: 429 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              error: { message: 'Rate limit', type: 'rate_limit_error' },
            }),
            { status: 429 }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              choices: [{ message: { content: 'Success' } }],
              model: 'gpt-5-mini',
            }),
            { status: 200 }
          )
        );

      const result = await callLLM({
        messages: [{ role: 'user', content: 'test' }],
        retries: 2,
        retryDelay: 10, // Short delay for testing
      });

      expect(result.content).toBe('Success');
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 10000);

    it('should not retry on non-retryable errors', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            error: {
              message: 'Invalid API key',
              type: 'invalid_request_error',
            },
          }),
          { status: 401 }
        )
      );

      await expect(
        callLLM({
          messages: [{ role: 'user', content: 'test' }],
          retries: 3,
        })
      ).rejects.toThrow();

      // Should only be called once (no retries)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should respect retry-after header', async () => {
      const startTime = Date.now();

      mockFetch
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              error: { message: 'Rate limit', type: 'rate_limit_error' },
            }),
            {
              status: 429,
              headers: { 'retry-after': '1' }, // 1 second
            }
          )
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              choices: [{ message: { content: 'Success' } }],
              model: 'gpt-5-mini',
            }),
            { status: 200 }
          )
        );

      await callLLM({
        messages: [{ role: 'user', content: 'test' }],
        retries: 1,
      });

      const elapsed = Date.now() - startTime;
      // Should have waited at least ~1 second
      expect(elapsed).toBeGreaterThanOrEqual(900);
    }, 10000);

    it('should throw after max retries exceeded', async () => {
      mockFetch.mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { message: 'Server error' },
          }),
          { status: 500 }
        )
      );

      await expect(
        callLLM({
          messages: [{ role: 'user', content: 'test' }],
          retries: 2,
          retryDelay: 10,
        })
      ).rejects.toMatchObject({
        type: LLMErrorType.SERVER_ERROR,
      });

      // Should be called 3 times (initial + 2 retries)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    }, 10000);
  });

  describe('Edge cases', () => {
    it('should handle missing choices in response', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            model: 'gpt-5-mini',
            // No choices array
          }),
          { status: 200 }
        )
      );

      await expect(
        callLLM({
          messages: [{ role: 'user', content: 'test' }],
        })
      ).rejects.toMatchObject({
        type: LLMErrorType.UNKNOWN,
      });
    });

    it('should handle malformed error responses', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response('Not JSON', { status: 500 })
      );

      await expect(
        callLLM({
          messages: [{ role: 'user', content: 'test' }],
          retries: 0,
        })
      ).rejects.toMatchObject({
        type: LLMErrorType.SERVER_ERROR,
        statusCode: 500,
      });
    });
  });
});
