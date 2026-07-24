"use server"

import { prisma } from '@/lib/prisma';

export async function searchDegrees(query: Object, skip: number = 0) {
  if (!query) return { data: [], hasMore: false };

  const TAKE = 20;

  const results = await prisma.degree.findMany({
    where: query,
    take: TAKE + 1,
    skip: skip,
    select: {
      code: true,
      name: true,
      type: true
    }
  });

  const hasMore = results.length > TAKE;
  const data = hasMore ? results.slice(0, -1) : results;

  return { data, hasMore };
}