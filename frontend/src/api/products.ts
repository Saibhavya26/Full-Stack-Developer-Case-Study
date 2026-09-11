import { apiClient } from './client';
import { PaginatedResult, Product, StockMovement } from '../types';

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  category?: string;
  lowStockOnly?: boolean;
}

export async function listProducts(params: ProductListParams) {
  const { data } = await apiClient.get<PaginatedResult<Product>>('/products', { params });
  return data;
}

export async function getProduct(id: string) {
  const { data } = await apiClient.get<{ product: Product }>(`/products/${id}`);
  return data.product;
}

export type ProductInput = {
  name: string;
  sku: string;
  category?: string;
  unitPrice: number;
  currentStock?: number;
  minStockAlertQty?: number;
  location?: string;
};

export async function createProduct(input: ProductInput) {
  const { data } = await apiClient.post<{ product: Product }>('/products', input);
  return data.product;
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  const { data } = await apiClient.patch<{ product: Product }>(`/products/${id}`, input);
  return data.product;
}

export async function adjustStock(
  id: string,
  input: { quantity: number; movementType: 'IN' | 'OUT'; reason: string }
) {
  const { data } = await apiClient.post<{ movement: StockMovement; product: Product }>(
    `/products/${id}/stock-movements`,
    input
  );
  return data;
}
