import { Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CustomerList } from './pages/customers/CustomerList';
import { CustomerForm } from './pages/customers/CustomerForm';
import { CustomerDetail } from './pages/customers/CustomerDetail';
import { ProductList } from './pages/products/ProductList';
import { ProductForm } from './pages/products/ProductForm';
import { ProductDetail } from './pages/products/ProductDetail';
import { ChallanList } from './pages/challans/ChallanList';
import { ChallanForm } from './pages/challans/ChallanForm';
import { ChallanDetail } from './pages/challans/ChallanDetail';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />

          <Route path="/customers" element={<CustomerList />} />
          <Route path="/customers/new" element={<CustomerForm />} />
          <Route path="/customers/:id" element={<CustomerDetail />} />
          <Route path="/customers/:id/edit" element={<CustomerForm />} />

          <Route path="/products" element={<ProductList />} />
          <Route path="/products/new" element={<ProductForm />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/products/:id/edit" element={<ProductForm />} />

          <Route path="/challans" element={<ChallanList />} />
          <Route path="/challans/new" element={<ChallanForm />} />
          <Route path="/challans/:id" element={<ChallanDetail />} />
        </Route>
      </Route>

      <Route path="*" element={<div className="p-10 text-center text-slate-500">Page not found.</div>} />
    </Routes>
  );
}
