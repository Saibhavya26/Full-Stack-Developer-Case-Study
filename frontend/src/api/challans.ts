import { apiClient } from './client';
import { Challan, PaginatedResult } from '../types';

export interface ChallanListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  customerId?: string;
  search?: string;
}

export async function listChallans(params: ChallanListParams) {
  const { data } = await apiClient.get<PaginatedResult<Challan>>('/challans', { params });
  return data;
}

export async function getChallan(id: string) {
  const { data } = await apiClient.get<{ challan: Challan }>(`/challans/${id}`);
  return data.challan;
}

export interface CreateChallanInput {
  customerId: string;
  items: { productId: string; quantity: number }[];
  status: 'DRAFT' | 'CONFIRMED';
}

export async function createChallan(input: CreateChallanInput) {
  const { data } = await apiClient.post<{ challan: Challan }>('/challans', input);
  return data.challan;
}

export async function confirmChallan(id: string) {
  const { data } = await apiClient.post<{ challan: Challan }>(`/challans/${id}/confirm`);
  return data.challan;
}

export async function cancelChallan(id: string) {
  const { data } = await apiClient.post<{ challan: Challan }>(`/challans/${id}/cancel`);
  return data.challan;
}
