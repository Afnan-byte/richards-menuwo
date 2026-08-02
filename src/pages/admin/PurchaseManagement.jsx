import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPurchases, getOrders, updateOrderStatus } from '../../services/firebaseDb';
import { TrendingUp, TrendingDown, DollarSign, Receipt, ShoppingCart, Download, Filter, ArrowUpDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { isToday, isThisWeek, isThisMonth } from 'date-fns';

const parseDate = (createdAt) => {
  if (!createdAt) return new Date();
  if (createdAt.toDate) return createdAt.toDate();
  return new Date(createdAt);
};

export default function PurchaseManagement() {
  const [purchases, setPurchases] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [timeFilter, setTimeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [fetchedPurchases, fetchedOrders] = await Promise.all([
        getPurchases(),
        getOrders()
      ]);
      setPurchases(fetchedPurchases);
      setOrders(fetchedOrders);
    } catch (error) {
      toast.error('Failed to load financial data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId, customerPhone, status, roomId) => {
    try {
      await updateOrderStatus(orderId, status);
      toast.success(`Order marked as ${status}`);
      if (customerPhone) {
        const cleanNumber = customerPhone.replace(/[^0-9]/g, '');
        let msg = '';
        if (status === 'delivered') msg = `Hello! Your order for Room ${roomId} has been delivered. Enjoy your meal!`;
        if (status === 'cancelled') msg = `Hello. Unfortunately, your order for Room ${roomId} has been cancelled. Please contact staff for details.`;
        const encoded = encodeURIComponent(msg);
        window.open(`https://wa.me/${cleanNumber}?text=${encoded}`, '_blank');
      }
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
      console.error(error);
    }
  };

  // Filter logic
  const filterByTime = (item) => {
    if (timeFilter === 'all') return true;
    const date = parseDate(item.createdAt);
    if (timeFilter === 'today') return isToday(date);
    if (timeFilter === 'week') return isThisWeek(date);
    if (timeFilter === 'month') return isThisMonth(date);
    return true;
  };

  const filteredPurchases = useMemo(() => purchases.filter(filterByTime), [purchases, timeFilter]);
  const filteredOrders = useMemo(() => orders.filter(filterByTime), [orders, timeFilter]);

  // Sorting logic
  const sortData = (a, b, isOrder = false) => {
    const valA = isOrder ? Number(a.totalAmount || 0) : Number(a.amount || 0);
    const valB = isOrder ? Number(b.totalAmount || 0) : Number(b.amount || 0);
    const dateA = parseDate(a.createdAt).getTime();
    const dateB = parseDate(b.createdAt).getTime();

    switch (sortBy) {
      case 'date_desc': return dateB - dateA;
      case 'date_asc': return dateA - dateB;
      case 'amount_desc': return valB - valA;
      case 'amount_asc': return valA - valB;
      default: return 0;
    }
  };

  const sortedPurchases = useMemo(() => [...filteredPurchases].sort((a, b) => sortData(a, b, false)), [filteredPurchases, sortBy]);
  const sortedOrders = useMemo(() => [...filteredOrders].sort((a, b) => sortData(a, b, true)), [filteredOrders, sortBy]);

  // Financials Calculation
  const financials = useMemo(() => {
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
    const totalExpenses = filteredPurchases.reduce((sum, purchase) => sum + Number(purchase.amount || 0), 0);
    return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses
    };
  }, [filteredOrders, filteredPurchases]);

  const exportCSV = () => {
    // Combine transactions for the detailed list
    const allTransactions = [
      ...filteredPurchases.map(p => ({
        type: 'Expense',
        description: p.item,
        category: p.category,
        amount: -Number(p.amount),
        date: p.createdAt,
        staff: p.staffId || '-'
      })),
      ...filteredOrders.map(o => ({
        type: 'Revenue',
        description: `Room ${o.roomId}`,
        category: 'Order',
        amount: Number(o.totalAmount),
        date: o.createdAt,
        staff: '-'
      }))
    ].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());

    let csv = "Financial Summary\n";
    csv += "Total Revenue,Total Expenses,Net Profit\n";
    csv += `${financials.totalRevenue.toFixed(2)},${financials.totalExpenses.toFixed(2)},${financials.netProfit.toFixed(2)}\n\n`;
    
    csv += "Transactions\n";
    csv += "Date,Type,Description,Category,Staff,Amount\n";
    
    allTransactions.forEach(t => {
      const row = [
        parseDate(t.date).toLocaleDateString(),
        t.type,
        `"${String(t.description || '').replace(/"/g, '""')}"`,
        `"${String(t.category || '').replace(/"/g, '""')}"`,
        `"${String(t.staff || '').replace(/"/g, '""')}"`,
        t.amount.toFixed(2)
      ];
      csv += row.join(",") + "\n";
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Financial_Report_${timeFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV Export downloaded!');
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading analytics...</div>;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Purchase Analytics</h1>
          <p className="text-muted-foreground mt-1">Review staff expenses, compare with food orders, and calculate profit.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 w-full xl:w-auto">
          {/* Filter Dropdown */}
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-gray-400" />
            </div>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="w-full sm:w-auto pl-10 pr-8 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none appearance-none cursor-pointer shadow-sm"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="relative w-full sm:w-auto">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <ArrowUpDown className="h-4 w-4 text-gray-400" />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full sm:w-auto pl-10 pr-8 py-2.5 bg-white border border-gray-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary focus:outline-none appearance-none cursor-pointer shadow-sm"
            >
              <option value="date_desc">Newest First</option>
              <option value="date_asc">Oldest First</option>
              <option value="amount_desc">Highest Amount</option>
              <option value="amount_asc">Lowest Amount</option>
            </select>
          </div>

          {/* Export Button */}
          <button 
            onClick={exportCSV}
            className="w-full sm:w-auto flex justify-center items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 flex items-center gap-4 border-t-4 border-emerald-500">
          <div className="p-4 bg-emerald-500/10 text-emerald-600 rounded-2xl"><TrendingUp className="w-8 h-8" /></div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Revenue (Orders)</p>
            <h3 className="text-3xl font-bold text-foreground mt-1">₹{financials.totalRevenue.toFixed(2)}</h3>
          </div>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 flex items-center gap-4 border-t-4 border-red-500">
          <div className="p-4 bg-red-500/10 text-red-600 rounded-2xl"><TrendingDown className="w-8 h-8" /></div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Total Expenses (Purchases)</p>
            <h3 className="text-3xl font-bold text-foreground mt-1">₹{financials.totalExpenses.toFixed(2)}</h3>
          </div>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className={`glass-card p-6 flex items-center gap-4 border-t-4 ${financials.netProfit >= 0 ? 'border-primary' : 'border-red-500'}`}>
          <div className={`p-4 rounded-2xl ${financials.netProfit >= 0 ? 'bg-primary/10 text-primary' : 'bg-red-500/10 text-red-600'}`}>
            <DollarSign className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Net Profit</p>
            <h3 className={`text-3xl font-bold mt-1 ${financials.netProfit >= 0 ? 'text-primary' : 'text-red-500'}`}>
              {financials.netProfit >= 0 ? '' : '-'}₹{Math.abs(financials.netProfit).toFixed(2)}
            </h3>
          </div>
        </motion.div>
      </div>

      {/* Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Left: Expenses */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><Receipt className="w-5 h-5 text-red-500"/> Staff Purchases</h2>
          </div>
          <div className="glass-card p-4 overflow-y-auto max-h-[500px] custom-scrollbar">
            {sortedPurchases.length === 0 ? (
               <p className="text-center text-muted-foreground p-8">No purchases in this period.</p>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {sortedPurchases.map(p => (
                    <motion.div layout initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} key={p.id} className="flex justify-between items-center p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                      <div>
                        <h4 className="font-semibold text-foreground">{p.item}</h4>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{p.category}</span>
                          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">By: {p.staffId || 'Unknown'}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-500">-₹{Number(p.amount).toFixed(2)}</p>
                        <p className="text-xs text-gray-400">{parseDate(p.createdAt).toLocaleDateString()}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Right: Revenue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-emerald-500"/> Guest Orders</h2>
          </div>
          <div className="glass-card p-4 overflow-y-auto max-h-[500px] custom-scrollbar">
            {sortedOrders.length === 0 ? (
               <p className="text-center text-muted-foreground p-8">No orders in this period.</p>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {sortedOrders.map(o => (
                    <motion.div layout initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} key={o.id} className="p-4 border border-gray-100 rounded-xl bg-gray-50/50">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-foreground">Room {o.roomId}</h4>
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${
                              o.status === 'delivered' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              o.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100' :
                              'bg-yellow-50 text-yellow-600 border-yellow-100'
                            }`}>
                              {o.status || 'pending'}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{o.items?.length || 0} items</span>
                          {o.customerPhone && <span className="ml-2 text-[10px] text-gray-400 font-mono">📞 {o.customerPhone}</span>}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-600">+₹{Number(o.totalAmount).toFixed(2)}</p>
                          <p className="text-xs text-gray-400">{parseDate(o.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      
                      {(!o.status || o.status === 'pending') && (
                        <div className="flex gap-2 pt-3 border-t border-gray-100">
                          <button 
                            onClick={() => handleStatusUpdate(o.id, o.customerPhone, 'delivered', o.roomId)}
                            className="flex-1 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-xs font-bold transition-colors"
                          >
                            Mark Delivered
                          </button>
                          <button 
                            onClick={() => handleStatusUpdate(o.id, o.customerPhone, 'cancelled', o.roomId)}
                            className="flex-1 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs font-bold transition-colors"
                          >
                            Cancel Order
                          </button>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
