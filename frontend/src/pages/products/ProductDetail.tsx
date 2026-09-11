import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adjustStock, getProduct } from '../../api/products';
import { getErrorMessage } from '../../api/client';
import { MovementType, Product } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Modal } from '../../components/Modal';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

export function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<MovementType>('IN');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function reload() {
    if (!id) return;
    const p = await getProduct(id);
    setProduct(p);
  }

  useEffect(() => {
    setLoading(true);
    reload()
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function openModal(type: MovementType) {
    setMovementType(type);
    setQuantity('');
    setReason('');
    setModalOpen(true);
  }

  async function handleAdjust(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      toast.error('Enter a quantity greater than 0');
      return;
    }
    setSubmitting(true);
    try {
      await adjustStock(id, { quantity: qty, movementType, reason: reason || 'Manual adjustment' });
      toast.success('Stock updated');
      setModalOpen(false);
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading...</p>;
  if (!product) return <p className="text-sm text-slate-400">Product not found.</p>;

  const isLow = product.currentStock <= product.minStockAlertQty;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{product.name}</h2>
          <p className="text-sm text-slate-500">SKU: {product.sku} {product.category && `· ${product.category}`}</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Link to={`/products/${product.id}/edit`} className="btn-secondary">Edit</Link>
            <button className="btn-secondary" onClick={() => openModal('IN')}>+ Stock in</button>
            <button className="btn-secondary" onClick={() => openModal('OUT')}>− Stock out</button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card space-y-3 p-5">
          <h3 className="text-sm font-semibold text-slate-800">Details</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Unit price</dt>
              <dd className="font-medium text-slate-800">{formatCurrency(product.unitPrice)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Current stock</dt>
              <dd className={`font-medium ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
                {product.currentStock} {isLow && '⚠ Low stock'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Min alert qty</dt>
              <dd className="font-medium text-slate-800">{product.minStockAlertQty}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Location</dt>
              <dd className="font-medium text-slate-800">{product.location || '-'}</dd>
            </div>
          </dl>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Stock movement log</h3>
          {!product.stockMovements || product.stockMovements.length === 0 ? (
            <p className="text-sm text-slate-400">No stock movements recorded yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-1.5">Type</th>
                  <th className="py-1.5">Qty</th>
                  <th className="py-1.5">Reason</th>
                  <th className="py-1.5">By</th>
                  <th className="py-1.5">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {product.stockMovements.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2">
                      <StatusBadge status={m.movementType} />
                    </td>
                    <td className="py-2 font-medium text-slate-800">{m.quantity}</td>
                    <td className="py-2 text-slate-600">{m.reason}</td>
                    <td className="py-2 text-slate-500">{m.createdBy.name}</td>
                    <td className="py-2 text-slate-500">{formatDateTime(m.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal title={movementType === 'IN' ? 'Record stock in' : 'Record stock out'} isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleAdjust} className="space-y-4">
          <div>
            <label className="label">Quantity</label>
            <input type="number" min="1" required className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div>
            <label className="label">Reason</label>
            <input
              className="input"
              required
              placeholder={movementType === 'IN' ? 'e.g. Purchase order received' : 'e.g. Damaged goods write-off'}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-400">
            Current stock: {product.currentStock}. {movementType === 'OUT' && 'Stock cannot go below 0.'}
          </p>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Confirm'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
