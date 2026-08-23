import { z } from 'zod';
import { Observable, type Subscriber } from 'rxjs';
import type { Logger } from '../../../Shared/Domain';
import type { LlmConfig } from '../../../Shared/Infrastructure/Config';
import {
  readSseLines,
  type HttpTransport,
} from '../../../Shared/Infrastructure/Http';
import { GroundedAnsweringError } from '../../Domain/GroundedAnsweringError';
import type {
  GroundedAnswerer,
  RetrievedContext,
} from '../../Domain/GroundedAnswerer';
import type { Question } from '../../Domain/Question';
import { buildAnswerPrompt, type AnswerPrompt } from './buildAnswerPrompt';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TEMPERATURE = 0.3;

// OpenAI-compatible streaming ends with a literal "[DONE]" data line rather
// than closing the connection cleanly on its own.
const DONE_SENTINEL = '[DONE]';

const chunkSchema = z.object({
  choices: z
    .array(
      z.object({
        delta: z.object({ content: z.string().nullable() }).partial(),
      }),
    )
    .optional(),
});

/** Same contract as `GeminiGroundedAnswerer`, over OpenRouter's OpenAI-compatible streaming endpoint. */
export class OpenRouterGroundedAnswerer implements GroundedAnswerer {
  private readonly logger?: Logger;

  constructor(
    private readonly config: LlmConfig,
    private readonly transport: HttpTransport,
    logger?: Logger,
  ) {
    this.logger = logger?.forContext('OpenRouterGroundedAnswerer');
  }

  answer(
    question: Question,
    context: readonly RetrievedContext[],
  ): Observable<string> {
    const prompt = buildAnswerPrompt(question, context);

    return new Observable<string>((subscriber) => {
      this.stream(prompt, subscriber).catch((error: unknown) => {
        subscriber.error(GroundedAnsweringError.forTransportFailure(error));
      });
    });
  }

  private async stream(
    prompt: AnswerPrompt,
    subscriber: Subscriber<string>,
  ): Promise<void> {
    const body = await this.transport.stream({
      url: OPENROUTER_URL,
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        'http-referer': 'https://github.com/local/cv-screener',
        'x-title': 'CV Screener',
      },
      body: {
        model: this.config.textModel,
        temperature: TEMPERATURE,
        stream: true,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
      },
      timeoutMs: 60_000,
      label: 'openrouter:chat.completions.stream',
    });

    for await (const payload of readSseLines(body)) {
      if (payload === DONE_SENTINEL) {
        break;
      }

      let raw: unknown;
      try {
        raw = JSON.parse(payload);
      } catch {
        this.logger?.warn('Ignoring an unparseable stream chunk', { payload });
        continue;
      }

      const parsed = chunkSchema.safeParse(raw);
      const text = parsed.success
        ? (parsed.data.choices?.[0]?.delta.content ?? '')
        : '';

      if (text.length > 0) {
        subscriber.next(text);
      }
    }

    subscriber.complete();
  }
}
