import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';
import { getMenuItems, saveMenuItem, deleteMenuItem, getCategories } from '../../services/firebaseDb';
import { useAuth } from '../../contexts/AuthContext';
import ImageUploadWidget from '../../components/ImageUploadWidget';

export default function MenuManagement() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const { userProfile } = useAuth();
  const tenantId = userProfile?.restaurantId;
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    description: '',
    imageUrl: '',
    category: '',
    isVeg: true,
    available: true
  });

  useEffect(() => {
    if (tenantId) fetchData();
  }, [tenantId]);

  const fetchData = async () => {
    try {
      const [fetchedItems, fetchedCats] = await Promise.all([
        getMenuItems(tenantId),
        getCategories(tenantId)
      ]);
      setItems(fetchedItems);
      setCategories(fetchedCats);
      if (fetchedCats.length > 0) {
        setFormData(prev => ({ ...prev, category: fetchedCats[0].name }));
      }
    } catch (error) {
      toast.error('Failed to load menu data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price || !formData.category) {
      return toast.error('Name, Price, and Category are required');
    }

    setIsSaving(true);
    try {
      const newItem = await saveMenuItem(tenantId, {
        ...formData,
        price: parseFloat(formData.price)
      });

      setItems([...items, newItem]);
      setIsModalOpen(false);
      setFormData({
        name: '',
        price: '',
        description: '',
        imageUrl: '',
        category: categories.length > 0 ? categories[0].name : '',
        isVeg: true,
        available: true
      });
      toast.success('Menu item added');
    } catch (error) {
      toast.error('Failed to save menu item');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMenuItem(tenantId, id);
      setItems(items.filter(i => i.id !== id));
      toast.success('Item deleted');
    } catch (error) {
      toast.error('Failed to delete item');
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Menu Management</h1>
          <p className="text-muted-foreground mt-1">Manage your food and beverage items.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
        >
          <Plus className="w-5 h-5" /> Add New Item
        </button>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {items.map(item => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={item.id}
                className="glass-card overflow-hidden flex flex-col group relative"
              >
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="absolute top-2 right-2 p-2 bg-white/90 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 z-10 shadow-sm"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
                
                {item.imageUrl ? (
                  <div className="w-full h-48 overflow-hidden relative">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    {!item.available && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white micro-caps">Sold Out</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center relative">
                     <span className="text-gray-400">No Image</span>
                     {!item.available && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-white micro-caps">Sold Out</span>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg text-foreground">{item.name}</h3>
                    <span className="font-bold text-primary">₹{Number(item.price).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded border border-gray-100">{item.category}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${item.isVeg ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                      {item.isVeg ? 'Veg' : 'Non-Veg'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-auto">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="py-20 text-center text-muted-foreground">
          No menu items found. Add one to get started.
        </div>
      )}

      {/* Add Modal Popup */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[95%] max-w-2xl bg-white rounded-3xl shadow-2xl z-50 p-6 overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-2">
                <h2 className="text-2xl font-bold">New Menu Item</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">Item Name</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g. Club Sandwich"
                      className="w-full h-12 rounded-xl border border-gray-100 bg-gray-50/50 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">Price (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({...formData, price: e.target.value})}
                      placeholder="e.g. 12.99"
                      className="w-full h-12 rounded-xl border border-gray-100 bg-gray-50/50 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">Category</label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      className="w-full h-12 rounded-xl border border-gray-100 bg-gray-50/50 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                      {categories.length === 0 && <option value="" disabled>No categories available. Add one first.</option>}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">Dietary</label>
                    <select
                      value={formData.isVeg ? 'veg' : 'non-veg'}
                      onChange={(e) => setFormData({...formData, isVeg: e.target.value === 'veg'})}
                      className="w-full h-12 rounded-xl border border-gray-100 bg-gray-50/50 px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                    >
                      <option value="veg">Vegetarian (Veg)</option>
                      <option value="non-veg">Non-Vegetarian (Non-Veg)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <ImageUploadWidget 
                    imageUrl={formData.imageUrl} 
                    onUpload={(url) => setFormData({...formData, imageUrl: url})} 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    placeholder="Briefly describe the item..."
                    className="w-full h-24 rounded-xl border border-gray-100 bg-gray-50/50 p-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all resize-none"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                  <input
                    type="checkbox"
                    id="available"
                    checked={formData.available}
                    onChange={(e) => setFormData({...formData, available: e.target.checked})}
                    className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label htmlFor="available" className="text-sm font-medium text-foreground cursor-pointer">
                    Item is currently available for ordering
                  </label>
                </div>
                
                <button 
                  type="submit"
                  disabled={categories.length === 0 || isSaving}
                  className="w-full h-14 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform mt-4 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'Save Menu Item'}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
