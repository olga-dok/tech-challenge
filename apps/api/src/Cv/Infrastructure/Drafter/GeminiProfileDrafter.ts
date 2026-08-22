import { z } from 'zod';
import { CandidateProfileSchema, type CandidateProfile } from '@repo/contracts';
import type { LlmConfig } from '../../../Shared/Infrastructure/Config';
import type { HttpTransport } from '../../../Shared/Infrastructure/Http';
import type { Logger } from '../../../Shared/Domain';
import type { Persona } from '../../Domain/Persona';
import type { ProfileDrafter } from '../../Domain/ProfileDrafter';
import { ProfileDraftingError } from '../../Domain/ProfileDraftingError';
import { draftWithOneRetry } from './draftWithOneRetry';
import { toGeminiResponseSchema } from './toGeminiResponseSchema';
import type { ProfilePrompt } from './buildProfilePrompt';

const GEMINI_BASE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * High on purpose. Thirty CVs drafted at a low temperature converge on the same
 * career and the same phrasing; the persona supplies the variety of facts, and
 * this supplies the variety of voice.
 */
const TEMPERATURE = 1.0;

const responseSchema = z.object({
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
        finishReason: z.string().optional(),
      }),
    )
    .optional(),
});

export class GeminiProfileDrafter implements ProfileDrafter {
  private readonly logger?: Logger;

  constructor(
    private readonly config: LlmConfig,
    private readonly transport: HttpTransport,
    logger?: Logger,
  ) {
    this.logger = logger?.forContext('GeminiProfileDrafter');
  }

  async draft(persona: Persona): Promise<CandidateProfile> {
    return draftWithOneRetry(
      persona,
      (prompt) => this.generate(persona, prompt),
      this.logger,
    );
  }

  private async generate(
    persona: Persona,
    prompt: ProfilePrompt,
  ): Promise<string> {
    let payload: unknown;

    try {
      payload = await this.transport.json({
        url: `${GEMINI_BASE_URL}/${this.config.textModel}:generateContent`,
        method: 'POST',
        // The key travels in a header rather than the query string, so it cannot
        // end up in an error message built from the URL.
        headers: { 'x-goog-api-key': this.config.apiKey },
        body: {
          systemInstruction: { parts: [{ text: prompt.system }] },
          contents: [{ role: 'user', parts: [{ text: prompt.user }] }],
          generationConfig: {
            temperature: TEMPERATURE,
            responseMimeType: 'application/json',
            responseSchema: toGeminiResponseSchema(
              z.toJSONSchema(CandidateProfileSchema, { io: 'input' }),
            ),
          },
        },
        timeoutMs: 90_000,
        label: 'gemini:generateContent',
      });
    } catch (error: unknown) {
      throw ProfileDraftingError.forTransportFailure(persona.fullName, error);
    }

    const parsed = responseSchema.safeParse(payload);
    const text = parsed.success
      ? (parsed.data.candidates?.[0]?.content?.parts
          // The current Flash models are thinking models: a response can carry
          // reasoning parts next to the answer, and concatenating those into the
          // JSON would make every draft unparseable.
          ?.filter((part) => part.thought !== true)
          .map((part) => part.text ?? '')
          .join('') ?? '')
      : '';

    if (text.trim().length === 0) {
      // Usually a safety block or MAX_TOKENS. Reported rather than retried: the
      // repair path would send the same prompt and get the same refusal.
      throw ProfileDraftingError.forUnusableResponse(
        persona.fullName,
        `empty completion (finishReason=${
          parsed.success
            ? (parsed.data.candidates?.[0]?.finishReason ?? 'unknown')
            : 'unparseable response'
        })`,
      );
    }

    return text;
  }
}
