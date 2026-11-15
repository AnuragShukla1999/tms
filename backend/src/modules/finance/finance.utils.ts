import { BadRequestException } from '@nestjs/common';

/** Round to 2 decimals (money). */
export const round2 = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

/** Safe Number() for Prisma Decimal / null values. */
export const num = (value: unknown): number => Number(value ?? 0);

/**
 * Reads the authenticated user context from the JWT payload.
 * The auth service signs the token with `sub` (user id), `role`,
 * `companyId` and `branchId`.
 */
export function getContext(req: any): { companyId: string; userId: string } {
  const companyId: string | undefined = req.user?.companyId;
  const userId: string | undefined = req.user?.sub ?? req.user?.id;

  if (!companyId || !userId) {
    throw new BadRequestException('Company context not found in login token');
  }

  return { companyId, userId };
}

export function pageParams(query: { page?: number; limit?: number }) {
  const page = Math.max(Number(query.page ?? 1), 1);
  const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * Builds a Prisma date filter. A date-only `to` value (YYYY-MM-DD) is
 * treated as inclusive of the whole day.
 */
export function dateRange(
  from?: string,
  to?: string,
): { gte?: Date; lte?: Date } | undefined {
  if (!from && !to) return undefined;

  const range: { gte?: Date; lte?: Date } = {};

  if (from) {
    const start = new Date(from);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Invalid from date');
    }
    range.gte = start;
  }

  if (to) {
    const end = new Date(to);
    if (Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid to date');
    }
    if (to.length <= 10) end.setUTCHours(23, 59, 59, 999);
    range.lte = end;
  }

  return range;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
