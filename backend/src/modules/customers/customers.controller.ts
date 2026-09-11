import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { getPagination } from '../../utils/pagination';
import * as customersService from './customers.service';
import { ApiError } from '../../utils/ApiError';

export const listCustomersHandler = asyncHandler(async (req: Request, res: Response) => {
  const pagination = getPagination(req);
  const { search, status, customerType } = req.query as Record<string, string | undefined>;
  const result = await customersService.listCustomers(pagination, { search, status, customerType });
  res.status(200).json(result);
});

export const getCustomerHandler = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customersService.getCustomerById(req.params.id);
  res.status(200).json({ customer });
});

export const createCustomerHandler = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customersService.createCustomer(req.body);
  res.status(201).json({ customer });
});

export const updateCustomerHandler = asyncHandler(async (req: Request, res: Response) => {
  const customer = await customersService.updateCustomer(req.params.id, req.body);
  res.status(200).json({ customer });
});

export const addFollowUpHandler = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const followUp = await customersService.addFollowUp(req.params.id, req.user.id, req.body);
  res.status(201).json({ followUp });
});
