import { Prisma, Product } from '@prisma/client';
import { computeChallanLines, findStockShortages } from '../../src/modules/challans/challans.logic';
import { ApiError } from '../../src/utils/ApiError';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    name: 'Test Product',
    sku: 'SKU-1',
    category: null,
    unitPrice: new Prisma.Decimal(100),
    currentStock: 50,
    minStockAlertQty: 5,
    location: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('computeChallanLines', () => {
  it('builds priced snapshot lines and totals from raw items', () => {
    const product = makeProduct({ id: 'p1', name: 'Steel Pipe', sku: 'SKU-STL-001', unitPrice: new Prisma.Decimal(450) });
    const productsById = new Map([[product.id, product]]);

    const { lines, totalQuantity, totalAmount } = computeChallanLines(
      [{ productId: 'p1', quantity: 3 }],
      productsById
    );

    expect(lines).toHaveLength(1);
    expect(lines[0].productName).toBe('Steel Pipe');
    expect(lines[0].productSku).toBe('SKU-STL-001');
    expect(lines[0].lineTotal.toNumber()).toBe(1350);
    expect(totalQuantity).toBe(3);
    expect(totalAmount.toNumber()).toBe(1350);
  });

  it('sums totals correctly across multiple line items', () => {
    const p1 = makeProduct({ id: 'p1', unitPrice: new Prisma.Decimal(100) });
    const p2 = makeProduct({ id: 'p2', unitPrice: new Prisma.Decimal(50) });
    const productsById = new Map([
      [p1.id, p1],
      [p2.id, p2],
    ]);

    const { totalQuantity, totalAmount } = computeChallanLines(
      [
        { productId: 'p1', quantity: 2 }, // 200
        { productId: 'p2', quantity: 4 }, // 200
      ],
      productsById
    );

    expect(totalQuantity).toBe(6);
    expect(totalAmount.toNumber()).toBe(400);
  });

  it('throws ApiError when a product does not exist', () => {
    expect(() => computeChallanLines([{ productId: 'missing', quantity: 1 }], new Map())).toThrow(
      ApiError
    );
  });

  it('throws ApiError when a product is inactive', () => {
    const inactive = makeProduct({ id: 'p1', isActive: false });
    expect(() =>
      computeChallanLines([{ productId: 'p1', quantity: 1 }], new Map([[inactive.id, inactive]]))
    ).toThrow(/inactive/);
  });
});

describe('findStockShortages', () => {
  it('returns an empty array when stock is sufficient for every line', () => {
    const stock = new Map([['p1', 10]]);
    const shortages = findStockShortages([{ productId: 'p1', quantity: 5, productName: 'Widget' }], stock);
    expect(shortages).toHaveLength(0);
  });

  it('flags a line whose requested quantity exceeds available stock', () => {
    const stock = new Map([['p1', 3]]);
    const shortages = findStockShortages([{ productId: 'p1', quantity: 5, productName: 'Widget' }], stock);
    expect(shortages).toEqual([
      { productId: 'p1', product: 'Widget', requested: 5, available: 3 },
    ]);
  });

  it('never allows stock to be computed as negative (multiple shortages reported together)', () => {
    const stock = new Map([
      ['p1', 0],
      ['p2', 100],
    ]);
    const shortages = findStockShortages(
      [
        { productId: 'p1', quantity: 1, productName: 'Out of stock item' },
        { productId: 'p2', quantity: 10, productName: 'Well stocked item' },
      ],
      stock
    );
    expect(shortages).toHaveLength(1);
    expect(shortages[0].productId).toBe('p1');
  });

  it('treats a product missing from the stock map as zero stock', () => {
    const shortages = findStockShortages(
      [{ productId: 'unknown', quantity: 1, productName: 'Ghost item' }],
      new Map()
    );
    expect(shortages).toHaveLength(1);
    expect(shortages[0].available).toBe(0);
  });
});
