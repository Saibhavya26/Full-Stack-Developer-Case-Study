import { Request } from 'express';
import { buildPaginatedResult, getPagination } from '../../src/utils/pagination';

function mockReq(query: Record<string, string>): Request {
  return { query } as unknown as Request;
}

describe('getPagination', () => {
  it('defaults to page 1 with the default page size when no query params are given', () => {
    const pagination = getPagination(mockReq({}));
    expect(pagination).toEqual({ page: 1, pageSize: 20, skip: 0, take: 20 });
  });

  it('honours valid page and pageSize query params', () => {
    const pagination = getPagination(mockReq({ page: '3', pageSize: '10' }));
    expect(pagination).toEqual({ page: 3, pageSize: 10, skip: 20, take: 10 });
  });

  it('clamps pageSize to the maximum of 100', () => {
    const pagination = getPagination(mockReq({ pageSize: '500' }));
    expect(pagination.pageSize).toBe(100);
  });

  it('falls back to page 1 for invalid/negative page values', () => {
    const pagination = getPagination(mockReq({ page: '-5' }));
    expect(pagination.page).toBe(1);
  });
});

describe('buildPaginatedResult', () => {
  it('computes totalPages correctly', () => {
    const result = buildPaginatedResult(['a', 'b'], 45, { page: 2, pageSize: 20, skip: 20, take: 20 });
    expect(result.meta).toEqual({ page: 2, pageSize: 20, total: 45, totalPages: 3 });
  });
});
