import { useState } from 'react';
import { Outlet, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Menu, FolderTree, DoorOpen, Receipt, LogOut, Settings, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import toast from 'react-hot-toast';

const NAV_ITEMS = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { name: 'Menu', path: '/admin/menu', icon: Menu },
  { name: 'Categories', path: '/admin/categories', icon: FolderTree },
  { name: 'Rooms (QR)', path: '/admin/rooms', icon: DoorOpen },
  { name: 'Purchases', path: '/admin/purchases', icon: Receipt },
  { name: 'Settings', path: '/admin/settings', icon: Settings },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      navigate('/admin/login');
    } catch (error) {
      toast.error('Failed to log out');
      console.error(error);
    }
  };

  if (!currentUser) {
    return <Navigate to="/admin/login" replace />;
  }
  
  if (userProfile && userProfile.role !== 'admin') {
    return <Navigate to="/staff" replace />;
  }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed md:relative w-64 h-full bg-white border-r border-gray-100 flex flex-col z-50 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="py-6 flex flex-col items-center justify-center px-6 border-b border-gray-100 gap-3">
          <img src="/logo.svg" alt="Menuwo Logo" className="h-8 w-auto object-contain" />
          <span className="font-bold text-xl tracking-tight text-primary">Admin Panel</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1">
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-300 relative group ${
                  isActive 
                    ? 'text-white font-medium scale-[1.02] shadow-xl' 
                    : 'text-gray-500 hover:text-primary hover:bg-gray-50'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 bg-primary rounded-xl"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className={`w-5 h-5 relative z-10 ${isActive ? 'text-white' : ''}`} />
                <span className="relative z-10">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-gray-100">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white/70 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-4 sm:px-8 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 md:hidden hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>
            <h2 className="text-lg font-semibold text-muted-foreground capitalize">
              {location.pathname.split('/').pop() || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              A
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
