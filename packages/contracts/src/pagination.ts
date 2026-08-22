import { z } from 'zod';

/**
 * One page shape for every list endpoint. `totalPages` is sent rather than left
 * to the client to divide: the gallery paginates over a ranked subset as well as
 * the whole corpus, and only the server knows how big that subset is.
 */
export const paginatedSchema = <TItem extends z.ZodType>(
  item: TItem,
): z.ZodObject<{
  items: z.ZodArray<TItem>;
  page: z.ZodNumber;
  pageSize: z.ZodNumber;
  total: z.ZodNumber;
  totalPages: z.ZodNumber;
}> =>
  z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  });

export interface Paginated<TItem> {
  readonly items: readonly TItem[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly totalPages: number;
}
