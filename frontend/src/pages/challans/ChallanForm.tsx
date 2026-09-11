import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listCustomers } from '../../api/customers';
import { listProducts } from '../../api/products';
import { createChallan } from '../../api/challans';
import { getErrorMessage } from '../../api/client';
import { Customer, Product } from '../../types';
import { formatCurrency } from '../../utils/format';

interface DraftLine {
  productId: string;
  quantity: number;
}

export function ChallanForm() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [customerId, setCustomerId] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([]);
  const [pendingProductId, setPendingProductId] = useState('');
  const [pendingQty, setPendingQty] = useState('1');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      listCustomers({ page: 1, pageSize: 100, status: 'ACTIVE' }),
      listProducts({ page: 1, pageSize: 200 }),
    ])
      .then(([customersRes, productsRes]) => {
        setCustomers(customersRes.data);
        setProducts(productsRes.data);
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoadingOptions(false));
  }, []);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const lineDetails = lines.map((line) => {
    const product = productById.get(line.productId);
    const unitPrice = product ? parseFloat(product.unitPrice) : 0;
    return {
      ...line,
      name: product?.name ?? 'Unknown product',
      sku: product?.sku ?? '',
      unitPrice,
      lineTotal: unitPrice * line.quantity,
      availableStock: product?.currentStock ?? 0,
    };
  });

  const totalQuantity = lineDetails.reduce((sum, l) => sum + l.quantity, 0);
  const totalAmount = lineDetails.reduce((sum, l) => sum + l.lineTotal, 0);

  function addLine() {
    if (!pendingProductId) {
      toast.error('Select a product first');
      return;
    }
    const qty = parseInt(pendingQty, 10);
    if (!qty || qty <= 0) {
      toast.error('Enter a quantity greater than 0');
      return;
    }
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === pendingProductId);
      if (existing) {
        return prev.map((l) =>
          l.productId === pendingProductId ? { ...l, quantity: l.quantity + qty } : l
        );
      }
      return [...prev, { productId: pendingProductId, quantity: qty }];
    });
    setPendingProductId('');
    setPendingQty('1');
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  async function handleSubmit(status: 'DRAFT' | 'CONFIRMED') {
    if (!customerId) {
      toast.error('Select a customer');
      return;
    }
    if (lines.length === 0) {
      toast.error('Add at least one product line');
      return;
    }
    setSubmitting(true);
    try {
      const challan = await createChallan({
        customerId,
        items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
        status,
      });
      toast.success(status === 'CONFIRMED' ? 'Challan confirmed and stock reduced' : 'Draft challan saved');
      navigate(`/challans/${challan.id}`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingOptions) return <p className="text-sm text-slate-400">Loading...</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-5 text-xl font-semibold text-slate-900">New sales challan</h2>

      <div className="card space-y-5 p-6">
        <div>
          <label className="label">Customer *</label>
          <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Select a customer...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.businessName ? `(${c.businessName})` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Add products</label>
          <div className="flex flex-wrap gap-2">
            <select className="input flex-1" value={pendingProductId} onChange={(e) => setPendingProductId(e.target.value)}>
              <option value="">Select a product...</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku}) — {formatCurrency(p.unitPrice)} — stock: {p.currentStock}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              className="input w-24"
              value={pendingQty}
              onChange={(e) => setPendingQty(e.target.value)}
            />
            <button type="button" className="btn-secondary" onClick={addLine}>
              Add
            </button>
          </div>
        </div>

        {lineDetails.length > 0 && (
          <div className="overflow-hidden rounded-md border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2">Unit price</th>
                  <th className="px-3 py-2">Line total</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lineDetails.map((l) => (
                  <tr key={l.productId} className={l.quantity > l.availableStock ? 'bg-red-50' : ''}>
                    <td className="px-3 py-2">
                      {l.name}
                      {l.quantity > l.availableStock && (
                        <span className="ml-2 text-xs font-medium text-red-600">
                          Only {l.availableStock} in stock
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2">{l.quantity}</td>
                    <td className="px-3 py-2">{formatCurrency(l.unitPrice)}</td>
                    <td className="px-3 py-2">{formatCurrency(l.lineTotal)}</td>
                    <td className="px-3 py-2 text-right">
                      <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => removeLine(l.productId)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 font-medium">
                  <td className="px-3 py-2">Total</td>
                  <td className="px-3 py-2">{totalQuantity}</td>
                  <td></td>
                  <td className="px-3 py-2">{formatCurrency(totalAmount)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            className="btn-primary"
            disabled={submitting}
            onClick={() => handleSubmit('CONFIRMED')}
          >
            {submitting ? 'Saving...' : 'Save & Confirm (reduces stock)'}
          </button>
          <button
            type="button"
            className="btn-secondary"
            disabled={submitting}
            onClick={() => handleSubmit('DRAFT')}
          >
            Save as Draft
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
