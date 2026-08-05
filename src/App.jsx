import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';

import AdminLayout from './layouts/AdminLayout';

// Guest Pages
import GuestMenu from './pages/guest/GuestMenu';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminLogin from './pages/admin/Login';
import AdminForgotPassword from './pages/admin/ForgotPassword';
import MenuManagement from './pages/admin/MenuManagement';
import CategoryManagement from './pages/admin/CategoryManagement';
import RoomManagement from './pages/admin/RoomManagement';
import PurchaseManagement from './pages/admin/PurchaseManagement';
import Settings from './pages/admin/Settings';

// Staff Pages
import StaffDashboard from './pages/staff/Dashboard';
import StaffLogin from './pages/staff/Login';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          {/* Root Redirect */}
          <Route path="/" element={<Navigate to="/admin/login" replace />} />

          {/* Guest Routes */}
          <Route path="/menu/:tenantId/:roomId" element={<GuestMenu />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="menu" element={<MenuManagement />} />
            <Route path="categories" element={<CategoryManagement />} />
            <Route path="rooms" element={<RoomManagement />} />
            <Route path="purchases" element={<PurchaseManagement />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Staff Routes */}
          <Route path="/staff/login" element={<StaffLogin />} />
          <Route path="/staff" element={<StaffDashboard />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
