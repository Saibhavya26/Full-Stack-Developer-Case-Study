import { Prisma } from '@prisma/client';
import { prisma } from '../../prismaClient';
import { ApiError } from '../../utils/ApiError';
import { buildPaginatedResult, PaginationParams } from '../../utils/pagination';
import { CreateCustomerInput, CreateFollowUpInput, UpdateCustomerInput } from './customers.schema';

interface ListFilters {
  search?: string;
  status?: string;
  customerType?: string;
}

export async function listCustomers(pagination: PaginationParams, filters: ListFilters) {
  const where: Prisma.CustomerWhereInput = {};

  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { mobile: { contains: filters.search, mode: 'insensitive' } },
      { businessName: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  if (filters.status) where.status = filters.status as never;
  if (filters.customerType) where.customerType = filters.customerType as never;

  const [data, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      skip: pagination.skip,
      take: pagination.take,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.customer.count({ where }),
  ]);

  return buildPaginatedResult(data, total, pagination);
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      followUps: {
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true } } },
      },
      challans: {
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          challanNumber: true,
          status: true,
          totalAmount: true,
          totalQuantity: true,
          createdAt: true,
        },
      },
    },
  });

  if (!customer) throw ApiError.notFound('Customer not found');
  return customer;
}

export async function createCustomer(input: CreateCustomerInput) {
  return prisma.customer.create({
    data: {
      ...input,
      email: input.email || null,
    },
  });
}

export async function updateCustomer(id: string, input: UpdateCustomerInput) {
  await ensureExists(id);
  return prisma.customer.update({
    where: { id },
    data: {
      ...input,
      email: input.email === '' ? null : input.email,
    },
  });
}

export async function addFollowUp(customerId: string, userId: string, input: CreateFollowUpInput) {
  await ensureExists(customerId);

  const [followUp] = await prisma.$transaction([
    prisma.followUp.create({
      data: {
        customerId,
        note: input.note,
        nextDate: input.nextDate,
        createdById: userId,
      },
      include: { createdBy: { select: { id: true, name: true } } },
    }),
    // Keep the customer's headline follow-up date in sync with the latest note.
    ...(input.nextDate
      ? [
          prisma.customer.update({
            where: { id: customerId },
            data: { followUpDate: input.nextDate },
          }),
        ]
      : []),
  ]);

  return followUp;
}

async function ensureExists(id: string) {
  const exists = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
  if (!exists) throw ApiError.notFound('Customer not found');
}
