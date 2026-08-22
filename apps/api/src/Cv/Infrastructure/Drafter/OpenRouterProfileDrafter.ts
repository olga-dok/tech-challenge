import { z } from 'zod';
import type { CandidateProfile } from '@repo/contracts';
import type { Logger } from '../../../Shared/Domain';
import type { LlmConfig } from '../../../Shared/Infrastructure/Config';
import type { HttpTransport } from '../../../Shared/Infrastructure/Http';
import type { Persona } from '../../Domain/Persona';
import type { ProfileDrafter } from '../../Domain/ProfileDrafter';
import { ProfileDraftingError } from '../../Domain/ProfileDraftingError';
import type { ProfilePrompt } from './buildProfilePrompt';
import { draftWithOneRetry } from './draftWithOneRetry';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const TEMPERATURE = 1.0;

const responseSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({ content: z.string().nullable() }).partial(),
        finish_reason: z.string().nullable().optional(),
      }),
    )
    .optional(),
  error: z.object({ message: z.string() }).partial().optional(),
});

/**
 * The same contract as the Gemini adapter, against OpenRouter's
 * OpenAI-compatible endpoint, so a rate-limited key is a one-line config change
 * rather than a rewrite.
 *
 * `response_format` is sent but not trusted: the free models here frequently
 * ignore it and answer with a fenced block or a preamble. The shared
 * validate-and-repair path handles that, which is why both adapters go through
 * `draftWithOneRetry` rather than parsing their own output.
 */
export class OpenRouterProfileDrafter implements ProfileDrafter {
  private readonly logger?: Logger;

  constructor(
    private readonly config: LlmConfig,
    private readonly transport: HttpTransport,
    logger?: Logger,
  ) {
    this.logger = logger?.forContext('OpenRouterProfileDrafter');
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
        url: OPENROUTER_URL,
        method: 'POST',
        headers: {
          authorization: `Bearer ${this.config.apiKey}`,
          // OpenRouter attributes free-tier usage by these; without them a key
          // gets throttled harder.
          'http-referer': 'https://github.com/local/cv-screener',
          'x-title': 'CV Screener',
        },
        body: {
          model: this.config.textModel,
          temperature: TEMPERATURE,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: prompt.system },
            { role: 'user', content: prompt.user },
          ],
        },
        timeoutMs: 90_000,
        label: 'openrouter:chat.completions',
      });
    } catch (error: unknown) {
      throw ProfileDraftingError.forTransportFailure(persona.fullName, error);
    }

    const parsed = responseSchema.safeParse(payload);

    if (!parsed.success) {
      throw ProfileDraftingError.forUnusableResponse(
        persona.fullName,
        'the response did not look like a chat completion',
      );
    }

    const content = parsed.data.choices?.[0]?.message?.content ?? '';

    if (content.trim().length === 0) {
      throw ProfileDraftingError.forUnusableResponse(
        persona.fullName,
        parsed.data.error?.message ??
          `empty completion (finish_reason=${parsed.data.choices?.[0]?.finish_reason ?? 'unknown'})`,
      );
    }

    return content;
  }
}
