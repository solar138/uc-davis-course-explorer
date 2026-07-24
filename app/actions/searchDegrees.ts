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
      type: true,
      shortName: true
    }
  });

  const hasMore = results.length > TAKE;
  const data = (hasMore ? results.slice(0, -1) : results).sort((a, b) => priority.indexOf(a.type) - priority.indexOf(b.type));

  return { data, hasMore };
}

const priority = [
  "bachelor-sci",
  "bachelor-art",
  "bachelor-edu",
  "bachelor-bus",
  "bachelor-law",
  "bachelor-med",
  "bachelor-pharm",
  "bachelor-eng",
  "bachelor-other",
  "minor",
  "master-sci",
  "master-art",
  "master-edu",
  "master-eng",
  "master-ba",
  "master-other",
  "designated-emphasis",
  "phd"
]