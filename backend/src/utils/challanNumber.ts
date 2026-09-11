import { Prisma, PrismaClient } from '@prisma/client';

type Client = PrismaClient | Prisma.TransactionClient;

/**
 * Generates a human-readable, sequential challan number scoped to the
 * current year, e.g. CH-2026-000001. Uses a count of existing challans for
 * the year to determine the next sequence number.
 *
 * Pass the active transaction client (tx) when calling this from inside a
 * prisma.$transaction so the count and the eventual insert are consistent.
 *
 * Note: for very high concurrency this could still race between the count
 * and the insert; in that (unlikely, for this scale of app) case the
 * unique constraint on challanNumber will reject a duplicate and the
 * caller can retry. This tradeoff is documented in the README's "known
 * limitations".
 */
export async function generateChallanNumber(client: Client): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CH-${year}-`;

  const count = await client.challan.count({
    where: { challanNumber: { startsWith: prefix } },
  });

  const sequence = String(count + 1).padStart(6, '0');
  return `${prefix}${sequence}`;
}
