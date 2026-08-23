import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { SlugSchema, type CandidateProfile } from '@repo/contracts';
import { ZodValidationPipe } from '../../../Shared/Infrastructure/Validation';
import { GetCandidateUseCase } from '../../Application/GetCandidateUseCase';
import { CandidateNotFoundError } from '../../Domain/CandidateNotFoundError';
import { Slug } from '../../Domain/Slug';

@Controller('cvs')
export class GetCandidateAction {
  constructor(private readonly useCase: GetCandidateUseCase) {}

  /**
   * The full profile, not the gallery summary — portrait/PDF URLs are a
   * deterministic function of the slug the caller already has, so there is
   * nothing else worth adding to the response.
   */
  @Get(':slug')
  async handle(
    @Param('slug', new ZodValidationPipe(SlugSchema)) slugValue: string,
  ): Promise<CandidateProfile> {
    try {
      const candidate = await this.useCase.execute(Slug.from(slugValue));

      return candidate.profile;
    } catch (error: unknown) {
      if (error instanceof CandidateNotFoundError) {
        throw new NotFoundException(error.message);
      }

      throw error;
    }
  }
}
