import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { cancelChallan, confirmChallan, getChallan } from '../../api/challans';
import { getErrorMessage } from '../../api/client';
import { Challan } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency, formatDateTime } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

export function ChallanDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canConfirm = user?.role === 'ADMIN' || user?.role === 'SALES';
  const canCancel = user?.role === 'ADMIN' || user?.role === 'SALES' || user?.role === 'ACCOUNTS';

  const [challan, setChallan] = useState<Challan | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  async function reload() {
    if (!id) return;
    const c = await getChallan(id);
    setChallan(c);
  }

  useEffect(() => {
    setLoading(true);
    reload()
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleConfirm() {
    if (!id) return;
    setActionLoading(true);
    try {
      await confirmChallan(id);
      toast.success('Challan confirmed — stock has been reduced');
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!id) return;
    if (!window.confirm('Cancel this challan? If it was confirmed, stock will be restored.')) return;
    setActionLoading(true);
    try {
      await cancelChallan(id);
      toast.success('Challan cancelled');
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading...</p>;
  if (!challan) return <p className="text-sm text-slate-400">Challan not found.</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">{challan.challanNumber}</h2>
            <StatusBadge status={challan.status} />
          </div>
          <p className="text-sm text-slate-500">
            Created by {challan.createdBy.name} on {formatDateTime(challan.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={() => window.print()}>
            Print
          </button>
          {challan.status === 'DRAFT' && canConfirm && (
            <button className="btn-primary" disabled={actionLoading} onClick={handleConfirm}>
              Confirm (reduce stock)
            </button>
          )}
          {challan.status !== 'CANCELLED' && canCancel && (
            <button className="btn-danger" disabled={actionLoading} onClick={handleCancel}>
              Cancel challan
            </button>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-5 flex flex-wrap justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <p className="text-xs uppercase text-slate-400">Bill to</p>
            <Link to={`/customers/${challan.customer.id}`} className="font-medium text-brand-700 hover:underline">
              {challan.customer.name}
            </Link>
            <p className="text-sm text-slate-500">{challan.customer.businessName}</p>
            <p className="text-sm text-slate-500">{challan.customer.mobile}</p>
            <p className="text-sm text-slate-500">{challan.customer.address}</p>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase text-slate-400">Challan details</p>
            <p className="text-sm text-slate-700">Status: <StatusBadge status={challan.status} /></p>
            <p className="text-sm text-slate-500">Created: {formatDateTime(challan.createdAt)}</p>
            {challan.confirmedAt && <p className="text-sm text-slate-500">Confirmed: {formatDateTime(challan.confirmedAt)}</p>}
            {challan.cancelledAt && <p className="text-sm text-slate-500">Cancelled: {formatDateTime(challan.cancelledAt)}</p>}
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="py-1.5">Product</th>
              <th className="py-1.5">SKU</th>
              <th className="py-1.5">Qty</th>
              <th className="py-1.5">Unit price</th>
              <th className="py-1.5">Line total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {challan.items.map((item) => (
              <tr key={item.id}>
                <td className="py-2">{item.productName}</td>
                <td className="py-2 text-slate-500">{item.productSku}</td>
                <td className="py-2">{item.quantity}</td>
                <td className="py-2">{formatCurrency(item.unitPrice)}</td>
                <td className="py-2">{formatCurrency(item.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 font-semibold">
              <td className="py-2" colSpan={2}>Total</td>
              <td className="py-2">{challan.totalQuantity}</td>
              <td></td>
              <td className="py-2">{formatCurrency(challan.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-4 text-xs text-slate-400">
          Product name, SKU and price shown above are a snapshot captured at the time this challan was
          created — they remain accurate even if the product catalog changes later.
        </p>
      </div>
    </div>
  );
}
