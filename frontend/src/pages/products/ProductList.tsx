import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listProducts } from '../../api/products';
import { getErrorMessage } from '../../api/client';
import { Product } from '../../types';
import { Pagination } from '../../components/Pagination';
import { formatCurrency } from '../../utils/format';
import { useAuth } from '../../context/AuthContext';

export function ProductList() {
  const { user } = useAuth();
  const canManage = user?.role === 'ADMIN' || user?.role === 'WAREHOUSE';

  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => setPage(1), [search, lowStockOnly]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listProducts({ page, pageSize: 10, search: search || undefined, lowStockOnly })
      .then((res) => {
        if (cancelled) return;
        setProducts(res.data);
        setMeta({ total: res.meta.total, totalPages: res.meta.totalPages });
      })
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, search, lowStockOnly]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Products & Inventory</h2>
          <p className="text-sm text-slate-500">{meta.total} products in the catalog</p>
        </div>
        {canManage && (
          <Link to="/products/new" className="btn-primary">
            + Add product
          </Link>
        )}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
          <input
            className="input max-w-xs"
            placeholder="Search name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
            Low stock only
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Product</th>
                <th className="px-4 py-2.5">SKU</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Unit price</th>
                <th className="px-4 py-2.5">Stock</th>
                <th className="px-4 py-2.5">Location</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">Loading...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-400">No products found.</td>
                </tr>
              ) : (
                products.map((p) => {
                  const isLow = p.currentStock <= p.minStockAlertQty;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <Link to={`/products/${p.id}`} className="font-medium text-brand-700 hover:underline">
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{p.sku}</td>
                      <td className="px-4 py-2.5 text-slate-600">{p.category || '-'}</td>
                      <td className="px-4 py-2.5 text-slate-600">{formatCurrency(p.unitPrice)}</td>
                      <td className="px-4 py-2.5">
                        <span className={isLow ? 'badge bg-red-100 text-red-700' : 'text-slate-700'}>
                          {p.currentStock} {isLow && '⚠ Low'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{p.location || '-'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={page} totalPages={meta.totalPages} total={meta.total} onPageChange={setPage} />
      </div>
    </div>
  );
}
