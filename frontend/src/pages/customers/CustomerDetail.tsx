import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { addFollowUp, getCustomer } from '../../api/customers';
import { getErrorMessage } from '../../api/client';
import { Customer } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

export function CustomerDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES';

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function reload() {
    if (!id) return;
    const c = await getCustomer(id);
    setCustomer(c);
  }

  useEffect(() => {
    setLoading(true);
    reload()
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!id || !note.trim()) return;
    setSubmitting(true);
    try {
      await addFollowUp(id, note.trim(), nextDate || undefined);
      setNote('');
      setNextDate('');
      toast.success('Follow-up added');
      await reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading...</p>;
  if (!customer) return <p className="text-sm text-slate-400">Customer not found.</p>;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">{customer.name}</h2>
            <StatusBadge status={customer.status} />
          </div>
          <p className="text-sm text-slate-500">{customer.businessName || 'No business name on file'}</p>
        </div>
        {canManage && (
          <Link to={`/customers/${customer.id}/edit`} className="btn-secondary">
            Edit customer
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="card space-y-3 p-5 lg:col-span-1">
          <h3 className="text-sm font-semibold text-slate-800">Details</h3>
          <dl className="space-y-2 text-sm">
            <Detail label="Mobile" value={customer.mobile} />
            <Detail label="Email" value={customer.email || '-'} />
            <Detail label="Customer type" value={customer.customerType} />
            <Detail label="GST number" value={customer.gstNumber || '-'} />
            <Detail label="Address" value={customer.address || '-'} />
            <Detail label="Next follow-up" value={formatDate(customer.followUpDate)} />
            <Detail label="Notes" value={customer.notes || '-'} />
          </dl>
        </div>

        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Recent sales challans</h3>
          {!customer.challans || customer.challans.length === 0 ? (
            <p className="text-sm text-slate-400">No challans yet for this customer.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-1.5">Challan #</th>
                  <th className="py-1.5">Status</th>
                  <th className="py-1.5">Qty</th>
                  <th className="py-1.5">Amount</th>
                  <th className="py-1.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customer.challans.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2">
                      <Link to={`/challans/${c.id}`} className="font-medium text-brand-700 hover:underline">
                        {c.challanNumber}
                      </Link>
                    </td>
                    <td className="py-2">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="py-2">{c.totalQuantity}</td>
                    <td className="py-2">{formatCurrency(c.totalAmount)}</td>
                    <td className="py-2 text-slate-500">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card p-5 lg:col-span-3">
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Follow-up timeline</h3>

          {canManage && (
            <form onSubmit={handleAddNote} className="mb-5 flex flex-wrap items-end gap-3 border-b border-slate-100 pb-5">
              <div className="min-w-[240px] flex-1">
                <label className="label">Add a follow-up note</label>
                <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Called customer, quoted price for..." />
              </div>
              <div>
                <label className="label">Next follow-up date</label>
                <input type="date" className="input" value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary" disabled={submitting || !note.trim()}>
                Add note
              </button>
            </form>
          )}

          {!customer.followUps || customer.followUps.length === 0 ? (
            <p className="text-sm text-slate-400">No follow-ups recorded yet.</p>
          ) : (
            <ul className="space-y-4">
              {customer.followUps.map((f) => (
                <li key={f.id} className="border-l-2 border-brand-200 pl-4">
                  <p className="text-sm text-slate-800">{f.note}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {f.createdBy.name} · {formatDateTime(f.createdAt)}
                    {f.nextDate && ` · Next follow-up: ${formatDate(f.nextDate)}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
