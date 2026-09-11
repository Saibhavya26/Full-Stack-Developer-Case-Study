import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination } from '../../utils/pagination';
import * as productsService from './products.service';
import { ApiError } from '../../utils/ApiError';

export const listProductsHandler = asyncHandler(async (req: Request, res: Response) => {
  const pagination = getPagination(req);
  const { search, category, lowStockOnly } = req.query as Record<string, unknown>;
  const result = await productsService.listProducts(pagination, {
    search: search as string | undefined,
    category: category as string | undefined,
    lowStockOnly: Boolean(lowStockOnly),
  });
  res.status(200).json(result);
});

export const getProductHandler = asyncHandler(async (req: Request, res: Response) => {
  const product = await productsService.getProductById(req.params.id);
  res.status(200).json({ product });
});

export const createProductHandler = asyncHandler(async (req: Request, res: Response) => {
  const product = await productsService.createProduct(req.body);
  res.status(201).json({ product });
});

export const updateProductHandler = asyncHandler(async (req: Request, res: Response) => {
  const product = await productsService.updateProduct(req.params.id, req.body);
  res.status(200).json({ product });
});

export const adjustStockHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const result = await productsService.adjustStock(req.params.id, req.user.id, req.body);
  res.status(201).json(result);
});
