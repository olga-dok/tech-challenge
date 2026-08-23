import { Controller, Get, Query } from '@nestjs/common';
import {
  ListCandidatesRequestSchema,
  type CandidatePageDto,
  type ListCandidatesRequestDto,
} from '@repo/contracts';
import { ZodValidationPipe } from '../../../Shared/Infrastructure/Validation';
import { ListCandidatesUseCase } from '../../Application/ListCandidatesUseCase';
import { toCandidateSummary } from '../../Application/toCandidateSummary';
import { Slug } from '../../Domain/Slug';

@Controller('cvs')
export class ListCandidatesAction {
  constructor(private readonly useCase: ListCandidatesUseCase) {}

  @Get()
  async handle(
    @Query(new ZodValidationPipe(ListCandidatesRequestSchema))
    query: ListCandidatesRequestDto,
  ): Promise<CandidatePageDto> {
    const result = await this.useCase.execute({
      page: query.page,
      pageSize: query.pageSize,
      roleFamily: query.roleFamily,
      seniority: query.seniority,
      skill: query.skill,
      slugs: query.slugs?.map((slug) => Slug.from(slug)),
    });

    return {
      items: result.items.map(toCandidateSummary),
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
      totalPages: result.totalPages,
    };
  }
}
