import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createProduct, getProduct, updateProduct } from '../../api/products';
import { getErrorMessage } from '../../api/client';

const emptyForm = {
  name: '',
  sku: '',
  category: '',
  unitPrice: '',
  currentStock: '0',
  minStockAlertQty: '0',
  location: '',
};

export function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getProduct(id)
      .then((p) =>
        setForm({
          name: p.name,
          sku: p.sku,
          category: p.category ?? '',
          unitPrice: p.unitPrice,
          currentStock: String(p.currentStock),
          minStockAlertQty: String(p.minStockAlertQty),
          location: p.location ?? '',
        })
      )
      .catch((err) => toast.error(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (isEdit && id) {
        // Stock is managed via stock movements once a product exists, not
        // by directly editing currentStock, to keep the movement log accurate.
        await updateProduct(id, {
          name: form.name,
          sku: form.sku,
          category: form.category || undefined,
          unitPrice: parseFloat(form.unitPrice),
          minStockAlertQty: parseInt(form.minStockAlertQty, 10) || 0,
          location: form.location || undefined,
        });
        toast.success('Product updated');
        navigate(`/products/${id}`);
      } else {
        const created = await createProduct({
          name: form.name,
          sku: form.sku,
          category: form.category || undefined,
          unitPrice: parseFloat(form.unitPrice),
          currentStock: parseInt(form.currentStock, 10) || 0,
          minStockAlertQty: parseInt(form.minStockAlertQty, 10) || 0,
          location: form.location || undefined,
        });
        toast.success('Product created');
        navigate(`/products/${created.id}`);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading...</p>;

  return (
    <div className="mx-auto max-w-2xl">
      <h2 className="mb-5 text-xl font-semibold text-slate-900">{isEdit ? 'Edit product' : 'Add product'}</h2>

      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Product name *</label>
            <input required className="input" value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div>
            <label className="label">SKU / code *</label>
            <input required className="input" value={form.sku} onChange={(e) => update('sku', e.target.value)} disabled={isEdit} />
            {isEdit && <p className="mt-1 text-xs text-slate-400">SKU can't be changed after creation.</p>}
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={(e) => update('category', e.target.value)} />
          </div>
          <div>
            <label className="label">Unit price (₹) *</label>
            <input required type="number" min="0" step="0.01" className="input" value={form.unitPrice} onChange={(e) => update('unitPrice', e.target.value)} />
          </div>
          {!isEdit && (
            <div>
              <label className="label">Opening stock</label>
              <input type="number" min="0" className="input" value={form.currentStock} onChange={(e) => update('currentStock', e.target.value)} />
            </div>
          )}
          <div>
            <label className="label">Minimum stock alert qty</label>
            <input type="number" min="0" className="input" value={form.minStockAlertQty} onChange={(e) => update('minStockAlertQty', e.target.value)} />
          </div>
          <div>
            <label className="label">Location / warehouse</label>
            <input className="input" value={form.location} onChange={(e) => update('location', e.target.value)} />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Create product'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
