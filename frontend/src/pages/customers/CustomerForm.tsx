import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { createCustomer, getCustomer, updateCustomer } from '../../api/customers';
import { getErrorMessage } from '../../api/client';
import { CustomerStatus, CustomerType } from '../../types';
import { toDateInputValue } from '../../utils/format';

const emptyForm = {
  name: '',
  mobile: '',
  email: '',
  businessName: '',
  gstNumber: '',
  customerType: 'RETAIL' as CustomerType,
  address: '',
  status: 'LEAD' as CustomerStatus,
  followUpDate: '',
  notes: '',
};

export function CustomerForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getCustomer(id)
      .then((c) =>
        setForm({
          name: c.name,
          mobile: c.mobile,
          email: c.email ?? '',
          businessName: c.businessName ?? '',
          gstNumber: c.gstNumber ?? '',
          customerType: c.customerType,
          address: c.address ?? '',
          status: c.status,
          followUpDate: toDateInputValue(c.followUpDate),
          notes: c.notes ?? '',
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
      const payload = {
        ...form,
        followUpDate: form.followUpDate || undefined,
      };
      if (isEdit && id) {
        await updateCustomer(id, payload);
        toast.success('Customer updated');
        navigate(`/customers/${id}`);
      } else {
        const created = await createCustomer(payload);
        toast.success('Customer created');
        navigate(`/customers/${created.id}`);
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
      <h2 className="mb-5 text-xl font-semibold text-slate-900">
        {isEdit ? 'Edit customer' : 'Add customer'}
      </h2>

      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Customer name *</label>
            <input required className="input" value={form.name} onChange={(e) => update('name', e.target.value)} />
          </div>
          <div>
            <label className="label">Mobile number *</label>
            <input required className="input" value={form.mobile} onChange={(e) => update('mobile', e.target.value)} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={(e) => update('email', e.target.value)} />
          </div>
          <div>
            <label className="label">Business name</label>
            <input className="input" value={form.businessName} onChange={(e) => update('businessName', e.target.value)} />
          </div>
          <div>
            <label className="label">GST number</label>
            <input className="input" value={form.gstNumber} onChange={(e) => update('gstNumber', e.target.value)} />
          </div>
          <div>
            <label className="label">Customer type</label>
            <select className="input" value={form.customerType} onChange={(e) => update('customerType', e.target.value as CustomerType)}>
              <option value="RETAIL">Retail</option>
              <option value="WHOLESALE">Wholesale</option>
              <option value="DISTRIBUTOR">Distributor</option>
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={(e) => update('status', e.target.value as CustomerStatus)}>
              <option value="LEAD">Lead</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div>
            <label className="label">Follow-up date</label>
            <input type="date" className="input" value={form.followUpDate} onChange={(e) => update('followUpDate', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Address</label>
          <textarea className="input" rows={2} value={form.address} onChange={(e) => update('address', e.target.value)} />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input" rows={2} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : isEdit ? 'Save changes' : 'Create customer'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
