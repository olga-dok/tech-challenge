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

const GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';

// Low: this is extraction and citation over a fixed context, not the creative
// variety GeminiProfileDrafter needs — a wandering answer here is a bug, not a feature.
const TEMPERATURE = 0.3;

const chunkSchema = z.object({
  candidates: z
    .array(
      z.object({
        content: z
          .object({
            parts: z
              .array(
                z.object({ text: z.string(), thought: z.boolean() }).partial(),
              )
              .optional(),
          })
          .optional(),
      }),
    )
    .optional(),
});

export class GeminiGroundedAnswerer implements GroundedAnswerer {
  private readonly logger?: Logger;

  constructor(
    private readonly config: LlmConfig,
    private readonly transport: HttpTransport,
    logger?: Logger,
  ) {
    this.logger = logger?.forContext('GeminiGroundedAnswerer');
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
      url: `${GEMINI_BASE_URL}/${this.config.textModel}:streamGenerateContent?alt=sse`,
      method: 'POST',
      headers: { 'x-goog-api-key': this.config.apiKey },
      body: {
        systemInstruction: { parts: [{ text: prompt.system }] },
        contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
        generationConfig: { temperature: TEMPERATURE },
      },
      timeoutMs: 60_000,
      label: 'gemini:streamGenerateContent',
    });

    for await (const payload of readSseLines(body)) {
      let raw: unknown;
      try {
        raw = JSON.parse(payload);
      } catch {
        this.logger?.warn('Ignoring an unparseable stream chunk', { payload });
        continue;
      }

      const parsed = chunkSchema.safeParse(raw);
      if (!parsed.success) {
        continue;
      }

      const text =
        parsed.data.candidates?.[0]?.content?.parts
          ?.filter((part) => part.thought !== true)
          .map((part) => part.text ?? '')
          .join('') ?? '';

      if (text.length > 0) {
        subscriber.next(text);
      }
    }

    subscriber.complete();
  }
}
