import { Controller, Get, Param } from '@nestjs/common';
import { SlugSchema, type CandidateProfile } from '@repo/contracts';
import { ZodValidationPipe } from '../../../Shared/Infrastructure/Validation';
import { GetCandidateUseCase } from '../../Application/GetCandidateUseCase';
import { Slug } from '../../Domain/Slug';

@Controller('cvs')
export class GetCandidateAction {
  constructor(private readonly useCase: GetCandidateUseCase) {}

  /**
   * The full profile, not the gallery summary — portrait/PDF URLs are a
   * deterministic function of the slug the caller already has, so there is
   * nothing else worth adding to the response. An unknown slug's
   * `CandidateNotFoundError` is an `HttpError`, reaching the client as a 404
   * via the global `ProblemDetailsFilter`.
   */
  @Get(':slug')
  async handle(
    @Param('slug', new ZodValidationPipe(SlugSchema)) slugValue: string,
  ): Promise<CandidateProfile> {
    const candidate = await this.useCase.execute(Slug.from(slugValue));

    return candidate.profile;
  }
}
