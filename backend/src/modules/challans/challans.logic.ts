import { Prisma, Product } from '@prisma/client';
import { ApiError } from '../../utils/ApiError';

export interface ChallanLine {
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: Prisma.Decimal;
  quantity: number;
  lineTotal: Prisma.Decimal;
}

/**
 * Pure business logic: turns raw {productId, quantity} input plus the
 * actual Product rows into priced, named "snapshot" line items — the data
 * the spec requires a challan to store instead of a bare product ID.
 * Deliberately has no database access so it can be unit tested directly.
 */
export function computeChallanLines(
  items: { productId: string; quantity: number }[],
  productsById: Map<string, Product>
): { lines: ChallanLine[]; totalQuantity: number; totalAmount: Prisma.Decimal } {
  const lines: ChallanLine[] = items.map((item) => {
    const product = productsById.get(item.productId);
    if (!product || !product.isActive) {
      throw ApiError.badRequest(`Product ${item.productId} does not exist or is inactive`);
    }
    const lineTotal = product.unitPrice.mul(item.quantity);
    return {
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      unitPrice: product.unitPrice,
      quantity: item.quantity,
      lineTotal,
    };
  });

  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAmount = lines.reduce((sum, l) => sum.add(l.lineTotal), new Prisma.Decimal(0));

  return { lines, totalQuantity, totalAmount };
}

export interface StockShortage {
  productId: string;
  product: string;
  requested: number;
  available: number;
}

/**
 * Pure business logic: given the lines being deducted and the current
 * stock levels, returns every line that would push stock negative. An
 * empty array means it's safe to proceed. Kept separate from the Prisma
 * update loop so the "never go negative" rule can be unit tested without
 * a database.
 */
export function findStockShortages(
  lines: { productId: string; quantity: number; productName: string }[],
  currentStockById: Map<string, number>
): StockShortage[] {
  return lines
    .filter((l) => (currentStockById.get(l.productId) ?? 0) < l.quantity)
    .map((l) => ({
      productId: l.productId,
      product: l.productName,
      requested: l.quantity,
      available: currentStockById.get(l.productId) ?? 0,
    }));
}
