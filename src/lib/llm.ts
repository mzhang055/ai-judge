/**
 * LLM Provider Abstraction
 * Always uses OpenAI GPT-5-mini
 */

// Fixed model - always use GPT-5-mini
export const DEFAULT_MODEL = 'gpt-5-mini';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
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
}

/**
 * Call OpenAI API with GPT-5-mini
 */
async function callOpenAI(options: LLMCallOptions): Promise<LLMResponse> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      'OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.'
    );
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `OpenAI API error (${response.status}): ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  if (!choice) {
    throw new Error('No response from OpenAI API');
  }

  return {
    content: choice.message.content,
    model: data.model,
    usage: {
      promptTokens: data.usage?.prompt_tokens || 0,
      completionTokens: data.usage?.completion_tokens || 0,
      totalTokens: data.usage?.total_tokens || 0,
    },
  };
}

/**
 * Main function to call LLM (always uses OpenAI GPT-5-mini)
 */
export async function callLLM(options: LLMCallOptions): Promise<LLMResponse> {
  return callOpenAI(options);
}
