import { apiClient } from './client';
import { Customer, FollowUp, PaginatedResult } from '../types';

export interface CustomerListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  customerType?: string;
}

export async function listCustomers(params: CustomerListParams) {
  const { data } = await apiClient.get<PaginatedResult<Customer>>('/customers', { params });
  return data;
}

export async function getCustomer(id: string) {
  const { data } = await apiClient.get<{ customer: Customer }>(`/customers/${id}`);
  return data.customer;
}

export type CustomerInput = Partial<
  Omit<Customer, 'id' | 'createdAt' | 'updatedAt' | 'followUps' | 'challans'>
>;

export async function createCustomer(input: CustomerInput) {
  const { data } = await apiClient.post<{ customer: Customer }>('/customers', input);
  return data.customer;
}

export async function updateCustomer(id: string, input: CustomerInput) {
  const { data } = await apiClient.patch<{ customer: Customer }>(`/customers/${id}`, input);
  return data.customer;
}

export async function addFollowUp(customerId: string, note: string, nextDate?: string) {
  const { data } = await apiClient.post<{ followUp: FollowUp }>(`/customers/${customerId}/follow-ups`, {
    note,
    nextDate: nextDate || undefined,
  });
  return data.followUp;
}
