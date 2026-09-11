import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listCustomers } from '../api/customers';
import { listProducts } from '../api/products';
import { listChallans } from '../api/challans';
import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';
import { formatCurrency } from '../utils/format';
import toast from 'react-hot-toast';

interface Stats {
  totalCustomers: number;
  leadCustomers: number;
  totalProducts: number;
  lowStockProducts: number;
  draftChallans: number;
  confirmedChallans: number;
  monthRevenue: number;
}

export function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const [customersAll, customersLead, productsAll, productsLow, draftC, confirmedC] =
          await Promise.all([
            listCustomers({ page: 1, pageSize: 1 }),
            listCustomers({ page: 1, pageSize: 1, status: 'LEAD' }),
            listProducts({ page: 1, pageSize: 1 }),
            listProducts({ page: 1, pageSize: 100, lowStockOnly: true }),
            listChallans({ page: 1, pageSize: 1, status: 'DRAFT' }),
            listChallans({ page: 1, pageSize: 50, status: 'CONFIRMED' }),
          ]);

        const now = new Date();
        const monthRevenue = confirmedC.data
          .filter((c) => {
            const d = new Date(c.createdAt);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
          })
          .reduce((sum, c) => sum + parseFloat(c.totalAmount), 0);

        setStats({
          totalCustomers: customersAll.meta.total,
          leadCustomers: customersLead.meta.total,
          totalProducts: productsAll.meta.total,
          lowStockProducts: productsLow.meta.total,
          draftChallans: draftC.meta.total,
          confirmedChallans: confirmedC.meta.total,
          monthRevenue,
        });
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-slate-900">Welcome back, {user?.name?.split(' ')[0]}</h2>
        <p className="text-sm text-slate-500">Here's what's happening across the business today.</p>
      </div>

      {loading || !stats ? (
        <p className="text-sm text-slate-400">Loading dashboard...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total customers" value={stats.totalCustomers} sub={`${stats.leadCustomers} leads to follow up`} to="/customers" />
            <StatCard label="Active products" value={stats.totalProducts} sub={`${stats.lowStockProducts} low on stock`} to="/products" warn={stats.lowStockProducts > 0} />
            <StatCard label="Draft challans" value={stats.draftChallans} sub="Awaiting confirmation" to="/challans?status=DRAFT" />
            <StatCard label="This month's sales" value={formatCurrency(stats.monthRevenue)} sub={`${stats.confirmedChallans} confirmed challans`} to="/challans?status=CONFIRMED" />
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card p-5">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Quick actions</h3>
              <div className="flex flex-wrap gap-2">
                <Link to="/customers/new" className="btn-secondary">+ New customer</Link>
                <Link to="/products/new" className="btn-secondary">+ New product</Link>
                <Link to="/challans/new" className="btn-primary">+ New sales challan</Link>
              </div>
            </div>
            <div className="card p-5">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Your role</h3>
              <p className="text-sm text-slate-500">
                You're signed in as <span className="font-medium text-slate-700">{user?.role}</span>.
                {user?.role === 'ADMIN' && ' You have full access to every module.'}
                {user?.role === 'SALES' && ' You can manage customers and create/confirm sales challans.'}
                {user?.role === 'WAREHOUSE' && ' You can manage the product catalog and stock movements.'}
                {user?.role === 'ACCOUNTS' && ' You have read access across the portal and can cancel challans.'}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  to,
  warn,
}: {
  label: string;
  value: string | number;
  sub: string;
  to: string;
  warn?: boolean;
}) {
  return (
    <Link to={to} className="card block p-5 transition-shadow hover:shadow-md">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      <p className={`mt-1 text-xs ${warn ? 'font-medium text-amber-600' : 'text-slate-400'}`}>{sub}</p>
    </Link>
  );
}
