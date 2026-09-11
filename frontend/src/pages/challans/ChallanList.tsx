import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listChallans } from '../../api/challans';
import { getErrorMessage } from '../../api/client';
import { Challan } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Pagination } from '../../components/Pagination';
import { formatCurrency, formatDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

export function ChallanList() {
  const { user } = useAuth();
  const canCreate = user?.role === 'ADMIN' || user?.role === 'SALES';

  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';

  const [challans, setChallans] = useState<Challan[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => setPage(1), [search, status]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listChallans({ page, pageSize: 10, search: search || undefined, status: status || undefined })
      .then((res) => {
        if (cancelled) return;
        setChallans(res.data);
        setMeta({ total: res.meta.total, totalPages: res.meta.totalPages });
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, search, status]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Sales Challans</h2>
          <p className="text-sm text-slate-500">{meta.total} challans on record</p>
        </div>
        {canCreate && (
          <Link to="/challans/new" className="btn-primary">
            + New challan
          </Link>
        )}
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
          <input
            className="input max-w-xs"
            placeholder="Search challan # or customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input max-w-[160px]"
            value={status}
            onChange={(e) => setSearchParams(e.target.value ? { status: e.target.value } : {})}
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Challan #</th>
                <th className="px-4 py-2.5">Customer</th>
                <th className="px-4 py-2.5">Items</th>
                <th className="px-4 py-2.5">Qty</th>
                <th className="px-4 py-2.5">Amount</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Loading...</td></tr>
              ) : challans.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">No challans found.</td></tr>
              ) : (
                challans.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <Link to={`/challans/${c.id}`} className="font-medium text-brand-700 hover:underline">
                        {c.challanNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{c.customer?.name}</td>
                    <td className="px-4 py-2.5 text-slate-600">{c._count?.items ?? '-'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{c.totalQuantity}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatCurrency(c.totalAmount)}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-2.5 text-slate-500">{formatDate(c.createdAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
      </div>
    </div>
  );
}
