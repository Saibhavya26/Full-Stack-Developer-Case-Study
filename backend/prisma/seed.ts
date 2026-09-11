import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Password@123';

async function upsertUser(name: string, email: string, role: 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS') {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  return prisma.user.upsert({
    where: { email },
    update: {},
    create: { name, email, passwordHash, role },
  });
}

async function main() {
  console.log('Seeding database...');

  const admin = await upsertUser('Asha Admin', 'admin@erpcrm.test', 'ADMIN');
  const sales = await upsertUser('Rahul Sales', 'sales@erpcrm.test', 'SALES');
  const warehouse = await upsertUser('Vikram Warehouse', 'warehouse@erpcrm.test', 'WAREHOUSE');
  const accounts = await upsertUser('Priya Accounts', 'accounts@erpcrm.test', 'ACCOUNTS');

  console.log('Users ready:', { admin: admin.email, sales: sales.email, warehouse: warehouse.email, accounts: accounts.email });

  const products = await Promise.all(
    [
      { name: 'Steel Pipe 2 inch', sku: 'SKU-STL-001', category: 'Pipes', unitPrice: 450.0, currentStock: 500, minStockAlertQty: 50, location: 'Warehouse A - Rack 1' },
      { name: 'Steel Pipe 4 inch', sku: 'SKU-STL-002', category: 'Pipes', unitPrice: 890.0, currentStock: 300, minStockAlertQty: 40, location: 'Warehouse A - Rack 2' },
      { name: 'PVC Fitting Elbow 1 inch', sku: 'SKU-PVC-010', category: 'Fittings', unitPrice: 35.5, currentStock: 20, minStockAlertQty: 25, location: 'Warehouse B - Bin 5' },
      { name: 'Cement Bag 50kg', sku: 'SKU-CEM-100', category: 'Cement', unitPrice: 380.0, currentStock: 1000, minStockAlertQty: 100, location: 'Warehouse C - Yard' },
      { name: 'Copper Wire 1.5mm (100m coil)', sku: 'SKU-WIR-050', category: 'Electrical', unitPrice: 2450.0, currentStock: 15, minStockAlertQty: 20, location: 'Warehouse A - Rack 8' },
    ].map((p) =>
      prisma.product.upsert({
        where: { sku: p.sku },
        update: {},
        create: p,
      })
    )
  );
  console.log(`Products ready: ${products.length}`);

  const customers = await Promise.all(
    [
      {
        name: 'Anil Traders',
        mobile: '9876543210',
        email: 'anil.traders@example.com',
        businessName: 'Anil Traders Pvt Ltd',
        gstNumber: '27ABCDE1234F1Z5',
        customerType: 'WHOLESALE' as const,
        address: 'Shop 12, APMC Market, Mumbai',
        status: 'ACTIVE' as const,
      },
      {
        name: 'Meena Enterprises',
        mobile: '9823456789',
        email: 'meena.ent@example.com',
        businessName: 'Meena Enterprises',
        customerType: 'DISTRIBUTOR' as const,
        address: 'Plot 4, Industrial Estate, Pune',
        status: 'ACTIVE' as const,
      },
      {
        name: 'Ramesh Kumar',
        mobile: '9812345678',
        email: 'ramesh.k@example.com',
        customerType: 'RETAIL' as const,
        address: '12/B, MG Road, Bengaluru',
        status: 'LEAD' as const,
        followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        notes: 'Interested in bulk cement order, follow up next week',
      },
    ].map(async (c) => {
      // mobile is intentionally not a unique column (a household/business
      // can share a line), so we de-dupe seed runs manually instead of
      // using Prisma's upsert (which requires a unique selector).
      const existing = await prisma.customer.findFirst({ where: { mobile: c.mobile } });
      if (existing) return existing;
      return prisma.customer.create({ data: c });
    })
  );
  console.log(`Customers ready: ${customers.length}`);

  console.log('\nSeed complete. Demo login credentials (same password for all):');
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log(`  Admin:     ${admin.email}`);
  console.log(`  Sales:     ${sales.email}`);
  console.log(`  Warehouse: ${warehouse.email}`);
  console.log(`  Accounts:  ${accounts.email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
