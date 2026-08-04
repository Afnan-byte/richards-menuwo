import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { LayoutDashboard, DoorOpen, Utensils, Receipt, TrendingUp, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getRooms, getMenuItems, getOrders, getPurchases } from '../../services/firebaseDb';
import { useAuth } from '../../contexts/AuthContext';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    rooms: 0,
    menuItems: 0,
    orders: 0,
    purchases: 0
  });
  const { userProfile } = useAuth();
  const tenantId = userProfile?.restaurantId;
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [tenantId]);

  const fetchDashboardData = async () => {
    if (!tenantId) return;
    try {
      const [rooms, menuItems, orders, purchases] = await Promise.all([
        getRooms(tenantId),
        getMenuItems(tenantId),
        getOrders(tenantId),
        getPurchases(tenantId)
      ]);

      // Calculate total purchases
      const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.amount || 0), 0);

      setStats({
        rooms: rooms.length,
        menuItems: menuItems.length,
        orders: orders.length,
        purchases: totalPurchases
      });
    } catch (error) {
      console.error(error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const OVERVIEW_CARDS = [
    { title: 'Total Rooms', value: stats.rooms, icon: DoorOpen, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { title: 'Menu Items', value: stats.menuItems, icon: Utensils, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { title: "Total Orders", value: stats.orders, icon: Receipt, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { title: "Total Purchases", value: `₹${stats.purchases.toFixed(2)}`, icon: TrendingUp, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground mt-1">Welcome back, Admin. Here's what's happening today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {OVERVIEW_CARDS.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              key={card.title}
              className="glass-card p-6 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-2xl ${card.bg}`}>
                  <Icon className={`w-6 h-6 ${card.color}`} />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                <h3 className="text-3xl font-bold mt-1">{card.value}</h3>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions & Recent Activity Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full text-left px-4 py-3 rounded-xl border border-gray-100 hover:bg-gray-50 text-foreground transition-colors font-medium">
              + Add New Menu Item
            </button>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(tenantId || '');
                toast.success('Restaurant ID copied!');
              }}
              className="w-full flex justify-between items-center px-4 py-3 rounded-xl border border-gray-100 hover:bg-gray-50 text-primary transition-colors font-medium"
            >
              <span>Copy Restaurant ID</span>
              <span className="text-xs bg-primary/10 px-2 py-1 rounded font-bold">Invite Staff</span>
            </button>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(`${window.location.origin}/staff/register`);
                toast.success('Staff Registration link copied!');
              }}
              className="w-full flex justify-between items-center px-4 py-3 rounded-xl border border-gray-100 hover:bg-gray-50 text-emerald-600 transition-colors font-medium"
            >
              <span>Copy Staff Portal Link</span>
              <span className="text-xs bg-emerald-50 px-2 py-1 rounded font-bold border border-emerald-100">Portal Link</span>
            </button>
          </div>
        </div>
        
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
          <div className="flex items-center justify-center h-32 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
            Activity stream will appear here.
          </div>
        </div>
      </div>
    </div>
  );
}
