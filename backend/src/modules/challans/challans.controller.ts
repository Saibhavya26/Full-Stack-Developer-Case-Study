import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination } from '../../utils/pagination';
import * as challansService from './challans.service';
import { ApiError } from '../../utils/ApiError';

export const listChallansHandler = asyncHandler(async (req: Request, res: Response) => {
  const pagination = getPagination(req);
  const { status, customerId, search } = req.query as Record<string, string | undefined>;
  const result = await challansService.listChallans(pagination, { status, customerId, search });
  res.status(200).json(result);
});

export const getChallanHandler = asyncHandler(async (req: Request, res: Response) => {
  const challan = await challansService.getChallanById(req.params.id);
  res.status(200).json({ challan });
});

export const createChallanHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const challan = await challansService.createChallan(req.user.id, req.body);
  res.status(201).json({ challan });
});

export const confirmChallanHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const challan = await challansService.confirmChallan(req.params.id, req.user.id);
  res.status(200).json({ challan });
});

export const cancelChallanHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const challan = await challansService.cancelChallan(req.params.id, req.user.id);
  res.status(200).json({ challan });
});
