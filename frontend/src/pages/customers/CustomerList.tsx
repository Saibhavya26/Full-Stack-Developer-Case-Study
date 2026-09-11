import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listCustomers } from '../../api/customers';
import { getErrorMessage } from '../../api/client';
import { Customer } from '../../types';
import { StatusBadge } from '../../components/StatusBadge';
import { Pagination } from '../../components/Pagination';
import { formatDate } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

export function CustomerList() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'SALES';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 0);
    return () => clearTimeout(timer);
  }, [search, status]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listCustomers({ page, pageSize: 10, search: search || undefined, status: status || undefined })
      .then((res) => {
        if (cancelled) return;
        setCustomers(res.data);
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
          <h2 className="text-xl font-semibold text-slate-900">Customers</h2>
          <p className="text-sm text-slate-500">{meta.total} customers in the CRM</p>
        </div>
        {canManage && (
          <Link to="/customers/new" className="btn-primary">
            + Add customer
          </Link>
        )}
      </div>

      <div className="card">
        <div className="flex flex-wrap gap-3 border-b border-slate-200 p-4">
          <input
            className="input max-w-xs"
            placeholder="Search name, mobile, business, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="input max-w-[160px]" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="LEAD">Lead</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Business</th>
                <th className="px-4 py-2.5">Mobile</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Follow-up</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5">
                      <Link to={`/customers/${c.id}`} className="font-medium text-brand-700 hover:underline">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{c.businessName || '-'}</td>
                    <td className="px-4 py-2.5 text-slate-600">{c.mobile}</td>
                    <td className="px-4 py-2.5 text-slate-600">{c.customerType}</td>
                    <td className="px-4 py-2.5">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{formatDate(c.followUpDate)}</td>
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
