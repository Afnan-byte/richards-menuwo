import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Plus, Receipt, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { useAuth } from '../../contexts/AuthContext';
import { savePurchase, getPurchases, deletePurchase } from '../../services/firebaseDb';

export default function StaffDashboard() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    item: '',
    category: 'Food Supplies',
    amount: ''
  });

  useEffect(() => {
    if (!currentUser) {
      navigate('/staff/login');
      return;
    }
    fetchData();
  }, [currentUser, navigate]);

  const fetchData = async () => {
    try {
      const data = await getPurchases();
      setPurchases(data);
    } catch (error) {
      toast.error('Failed to load purchases');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
      navigate('/staff/login');
    } catch (error) {
      console.error(error);
      toast.error('Failed to sign out');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.item || !formData.amount) {
      toast.error('Please fill all fields');
      return;
    }

    setIsSaving(true);
    try {
      const newPurchase = await savePurchase({
        item: formData.item,
        category: formData.category,
        amount: parseFloat(formData.amount),
        staffId: currentUser?.email || 'Unknown Staff'
      });

      setPurchases([newPurchase, ...purchases]);
      setFormData({ ...formData, item: '', amount: '' });
      toast.success('Purchase logged');
    } catch (error) {
      toast.error('Failed to log purchase');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!currentUser) return null;

  const handleDelete = async (id) => {
    try {
      await deletePurchase(id);
      setPurchases(purchases.filter(p => p.id !== id));
      toast.success('Purchase removed');
    } catch (error) {
      toast.error('Failed to delete purchase');
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center">
        <h1 className="text-lg sm:text-xl font-bold tracking-tight text-primary">Staff Portal</h1>
        <button 
          onClick={handleSignOut}
          className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-3 sm:px-4 py-2 rounded-xl transition-colors font-medium text-sm sm:text-base"
        >
          <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign Out</span>
        </button>
      </header>

      <main className="max-w-5xl mx-auto p-4 sm:p-6 grid grid-cols-1 md:grid-cols-12 gap-8 mt-2 sm:mt-4">
        
        {/* Left Column: Form */}
        <div className="md:col-span-5 space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Log Purchase</h2>
            <p className="text-muted-foreground text-sm mt-1">Submit new expense receipts below.</p>
          </div>

          <form onSubmit={handleSubmit} className="glass-card p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">Item Name / Description</label>
              <input
                type="text"
                required
                value={formData.item}
                onChange={(e) => setFormData({...formData, item: e.target.value})}
                placeholder="e.g. 5kg Tomatoes"
                className="w-full h-12 rounded-xl border border-gray-100 bg-white px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all shadow-sm"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full h-12 rounded-xl border border-gray-100 bg-white px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all shadow-sm"
              >
                <option>Food Supplies</option>
                <option>Cleaning Supplies</option>
                <option>Maintenance</option>
                <option>Utilities</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-gray-700">Total Amount ($)</label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                placeholder="0.00"
                className="w-full h-12 rounded-xl border border-gray-100 bg-white px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all shadow-sm"
              />
            </div>

            <button 
              type="submit"
              className="w-full flex justify-center items-center gap-2 bg-primary text-white h-12 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform mt-4"
            >
              <Plus className="w-5 h-5" /> Submit Purchase
            </button>
          </form>
        </div>

        {/* Right Column: History */}
        <div className="md:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Recent Purchases</h2>
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <Receipt className="w-3 h-3" />
              {purchases.length} Records
            </div>
          </div>

          <div className="glass-card overflow-hidden">
            <div className="max-h-[600px] overflow-y-auto custom-scrollbar p-2">
              {purchases.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center">
                  <Receipt className="w-12 h-12 mb-4 opacity-20" />
                  <p>No purchases logged yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {purchases.map(purchase => (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        key={purchase.id}
                        className="flex items-start justify-between p-4 rounded-xl border border-gray-100 bg-white hover:border-primary/30 transition-colors group gap-2"
                      >
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground truncate">{purchase.item}</h4>
                          <div className="flex gap-2 items-center mt-1">
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded">
                              {purchase.category}
                            </span>
                            <span className="text-xs text-gray-400">
                              {new Date(purchase.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-red-500">-${Number(purchase.amount).toFixed(2)}</span>
                          <button 
                            onClick={() => handleDelete(purchase.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="mt-12 py-8 px-4 w-full">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
          <img src="/logo.svg" alt="Menuwo" className="h-8 w-auto object-contain" />
          
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-gray-600">
            <a href="#" className="hover:text-primary transition-colors" target="_blank" rel="noopener noreferrer">Follow Instagram</a>
            <a href="#" className="hover:text-primary transition-colors" target="_blank" rel="noopener noreferrer">Visit Website</a>
          </div>
          
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} Menuwo. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
