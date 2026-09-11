import { Prisma } from '@prisma/client';
import { prisma } from '../../prismaClient';
import { ApiError } from '../../utils/ApiError';
import { buildPaginatedResult, PaginationParams } from '../../utils/pagination';
import { generateChallanNumber } from '../../utils/challanNumber';
import { computeChallanLines, findStockShortages } from './challans.logic';
import { CreateChallanInput } from './challans.schema';

interface ListFilters {
  status?: string;
  customerId?: string;
  search?: string;
}

export async function listChallans(pagination: PaginationParams, filters: ListFilters) {
  const where: Prisma.ChallanWhereInput = {};
  if (filters.status) where.status = filters.status as never;
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.search) {
    where.OR = [
      { challanNumber: { contains: filters.search, mode: 'insensitive' } },
      { customer: { name: { contains: filters.search, mode: 'insensitive' } } },
    ];
  }

  const [data, total] = await prisma.$transaction([
    prisma.challan.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, businessName: true } },
        createdBy: { select: { id: true, name: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.challan.count({ where }),
  ]);

  return buildPaginatedResult(data, total, pagination);
}

export async function getChallanById(id: string) {
  const challan = await prisma.challan.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true } },
      items: true,
    },
  });
  if (!challan) throw ApiError.notFound('Challan not found');
  return challan;
}

/**
 * Fetches the products referenced in a challan and delegates to the pure
 * computeChallanLines() to build the validated, priced "product snapshot"
 * line items. Does NOT touch stock — that only happens on confirmation.
 */
async function buildLineItems(
  tx: Prisma.TransactionClient,
  items: { productId: string; quantity: number }[]
) {
  const productIds = items.map((i) => i.productId);
  const products = await tx.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((p) => [p.id, p]));

  return { ...computeChallanLines(items, productMap), productMap };
}

/**
 * Deducts stock for each line item, guaranteeing (inside the caller's
 * transaction) that no product's stock goes negative. Throws a descriptive
 * ApiError naming every product that doesn't have enough stock, rather
 * than failing on the first one, so the sales user sees the full picture.
 */
async function reduceStockForItems(
  tx: Prisma.TransactionClient,
  lines: { productId: string; quantity: number; productName: string }[],
  reason: string,
  userId: string
) {
  const products = await tx.product.findMany({
    where: { id: { in: lines.map((l) => l.productId) } },
  });
  const stockMap = new Map(products.map((p) => [p.id, p.currentStock]));

  const shortages = findStockShortages(lines, stockMap);
  if (shortages.length > 0) {
    throw ApiError.badRequest('Insufficient stock for one or more products', shortages);
  }

  for (const line of lines) {
    await tx.product.update({
      where: { id: line.productId },
      data: { currentStock: { decrement: line.quantity } },
    });
    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        quantity: line.quantity,
        movementType: 'OUT',
        reason,
        createdById: userId,
      },
    });
  }
}

/**
 * Restores stock for each line item (used when reversing a confirmed
 * challan back to Cancelled). Symmetric with reduceStockForItems.
 */
async function restoreStockForItems(
  tx: Prisma.TransactionClient,
  lines: { productId: string; quantity: number }[],
  reason: string,
  userId: string
) {
  for (const line of lines) {
    await tx.product.update({
      where: { id: line.productId },
      data: { currentStock: { increment: line.quantity } },
    });
    await tx.stockMovement.create({
      data: {
        productId: line.productId,
        quantity: line.quantity,
        movementType: 'IN',
        reason,
        createdById: userId,
      },
    });
  }
}

export async function createChallan(userId: string, input: CreateChallanInput) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw ApiError.notFound('Customer not found');

    const { lines, totalQuantity, totalAmount } = await buildLineItems(tx, input.items);
    const challanNumber = await generateChallanNumber(tx);

    const challan = await tx.challan.create({
      data: {
        challanNumber,
        customerId: input.customerId,
        status: 'DRAFT',
        totalQuantity,
        totalAmount,
        createdById: userId,
        items: { create: lines },
      },
      include: { items: true, customer: true },
    });

    if (input.status === 'CONFIRMED') {
      await reduceStockForItems(
        tx,
        lines.map((l) => ({ productId: l.productId, quantity: l.quantity, productName: l.productName })),
        `Sales challan ${challanNumber}`,
        userId
      );
      return tx.challan.update({
        where: { id: challan.id },
        data: { status: 'CONFIRMED', confirmedAt: new Date() },
        include: { items: true, customer: true },
      });
    }

    return challan;
  });
}

/** Confirms a DRAFT challan: re-checks and deducts stock, then flips status. */
export async function confirmChallan(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUnique({ where: { id }, include: { items: true } });
    if (!challan) throw ApiError.notFound('Challan not found');
    if (challan.status !== 'DRAFT') {
      throw ApiError.badRequest(`Only DRAFT challans can be confirmed (current status: ${challan.status})`);
    }

    await reduceStockForItems(
      tx,
      challan.items.map((i) => ({ productId: i.productId, quantity: i.quantity, productName: i.productName })),
      `Sales challan ${challan.challanNumber}`,
      userId
    );

    return tx.challan.update({
      where: { id },
      data: { status: 'CONFIRMED', confirmedAt: new Date() },
      include: { items: true, customer: true },
    });
  });
}

/**
 * Cancels a challan. If it was CONFIRMED, the stock that was deducted is
 * restored (assumption documented in README: cancelling a confirmed
 * challan is treated as a full return-to-stock reversal).
 */
export async function cancelChallan(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const challan = await tx.challan.findUnique({ where: { id }, include: { items: true } });
    if (!challan) throw ApiError.notFound('Challan not found');
    if (challan.status === 'CANCELLED') {
      throw ApiError.badRequest('Challan is already cancelled');
    }

    if (challan.status === 'CONFIRMED') {
      await restoreStockForItems(
        tx,
        challan.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        `Cancelled challan ${challan.challanNumber}`,
        userId
      );
    }

    return tx.challan.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
      include: { items: true, customer: true },
    });
  });
}
