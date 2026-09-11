import { Prisma } from '@prisma/client';
import { prisma } from '../../prismaClient';
import { ApiError } from '../../utils/ApiError';
import { buildPaginatedResult, PaginationParams } from '../../utils/pagination';
import { AdjustStockInput, CreateProductInput, UpdateProductInput } from './products.schema';

interface ListFilters {
  search?: string;
  category?: string;
  lowStockOnly?: boolean;
}

export async function listProducts(pagination: PaginationParams, filters: ListFilters) {
  const where: Prisma.ProductWhereInput = { isActive: true };

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { sku: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.category) where.category = filters.category;

  // lowStockOnly needs a raw comparison between two columns, which Prisma's
  // query builder can't express directly, so we filter it in JS after the
  // fact for simplicity at this scale. For a larger catalog this would move
  // to a raw SQL query or a generated/materialized "isLowStock" column.
  const [allMatching, total] = await prisma.$transaction([
    prisma.product.findMany({
      where,
      skip: filters.lowStockOnly ? undefined : pagination.skip,
      take: filters.lowStockOnly ? undefined : pagination.take,
      orderBy: { name: 'asc' },
    }),
    prisma.product.count({ where }),
  ]);

  if (filters.lowStockOnly) {
    const filtered = allMatching.filter((p) => p.currentStock <= p.minStockAlertQty);
    const page = filtered.slice(pagination.skip, pagination.skip + pagination.take);
    return buildPaginatedResult(page, filtered.length, pagination);
  }

  return buildPaginatedResult(allMatching, total, pagination);
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      stockMovements: {
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { createdBy: { select: { id: true, name: true } } },
      },
    },
  });
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

export async function createProduct(input: CreateProductInput) {
  const existing = await prisma.product.findUnique({ where: { sku: input.sku } });
  if (existing) throw ApiError.conflict(`A product with SKU "${input.sku}" already exists`);

  return prisma.product.create({ data: input });
}

export async function updateProduct(id: string, input: UpdateProductInput) {
  await ensureExists(id);

  if (input.sku) {
    const clash = await prisma.product.findFirst({
      where: { sku: input.sku, NOT: { id } },
    });
    if (clash) throw ApiError.conflict(`Another product already uses SKU "${input.sku}"`);
  }

  return prisma.product.update({ where: { id }, data: input });
}

/**
 * Manually record a stock movement (e.g. a warehouse recount, damaged
 * goods write-off, or a new purchase order received) and atomically apply
 * it to the product's currentStock. OUT movements are guarded so stock
 * never goes negative, mirroring the rule enforced on challan confirmation.
 */
export async function adjustStock(productId: string, userId: string, input: AdjustStockInput) {
  return prisma.$transaction(async (tx) => {
    const product = await tx.product.findUnique({ where: { id: productId } });
    if (!product) throw ApiError.notFound('Product not found');

    const delta = input.movementType === 'IN' ? input.quantity : -input.quantity;
    const newStock = product.currentStock + delta;

    if (newStock < 0) {
      throw ApiError.badRequest(
        `Insufficient stock: "${product.name}" only has ${product.currentStock} unit(s) available`
      );
    }

    const [movement, updatedProduct] = await Promise.all([
      tx.stockMovement.create({
        data: {
          productId,
          quantity: input.quantity,
          movementType: input.movementType,
          reason: input.reason,
          createdById: userId,
        },
      }),
      tx.product.update({ where: { id: productId }, data: { currentStock: newStock } }),
    ]);

    return { movement, product: updatedProduct };
  });
}

async function ensureExists(id: string) {
  const exists = await prisma.product.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw ApiError.notFound('Product not found');
}
