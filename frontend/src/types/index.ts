export type Role = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';

export interface FollowUp {
  id: string;
  customerId: string;
  note: string;
  nextDate: string | null;
  createdAt: string;
  createdBy: { id: string; name: string };
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  businessName: string | null;
  gstNumber: string | null;
  customerType: CustomerType;
  address: string | null;
  status: CustomerStatus;
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  followUps?: FollowUp[];
  challans?: ChallanSummary[];
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  unitPrice: string;
  currentStock: number;
  minStockAlertQty: number;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  stockMovements?: StockMovement[];
}

export type MovementType = 'IN' | 'OUT';

export interface StockMovement {
  id: string;
  productId: string;
  quantity: number;
  movementType: MovementType;
  reason: string;
  createdAt: string;
  createdBy: { id: string; name: string };
}

export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface ChallanItem {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  unitPrice: string;
  quantity: number;
  lineTotal: string;
}

export interface ChallanSummary {
  id: string;
  challanNumber: string;
  status: ChallanStatus;
  totalAmount: string;
  totalQuantity: number;
  createdAt: string;
}

export interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  status: ChallanStatus;
  totalQuantity: number;
  totalAmount: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt: string | null;
  cancelledAt: string | null;
  customer: Customer;
  createdBy: { id: string; name: string };
  items: ChallanItem[];
  _count?: { items: number };
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiErrorShape {
  error: {
    message: string;
    details?: unknown;
  };
}
