import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Info, MessageCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCategories, getMenuItems, getSettings, saveOrder, resolveTenantId, formatWhatsAppNumber } from '../../services/firebaseDb';
import { auth } from '../../firebase/config';
import { signInAnonymously } from 'firebase/auth';

export default function GuestMenu() {
  const { tenantId, roomId } = useParams();
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [menuItems, setMenuItems] = useState([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [resolvedTenant, setResolvedTenant] = useState(tenantId || '');
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    fetchData();
  }, [tenantId, roomId]);

  const fetchData = async () => {
    setLoading(true);
    setHasError(false);

    try {
      // Ensure guest has an active anonymous session before querying Firestore
      if (!auth.currentUser) {
        try {
          await signInAnonymously(auth);
        } catch (anonAuthErr) {
          console.warn("Anonymous auth pre-fetch notice:", anonAuthErr);
        }
      }

      // Resolve tenantId variations (case mismatch, UID vs shortCode, or empty tenantId)
      const effectiveId = await resolveTenantId(tenantId || '');
      if (!effectiveId && !tenantId) {
        setLoading(false);
        setHasError(true);
        return;
      }

      setResolvedTenant(effectiveId || tenantId);

      const loadTenantData = async (targetId) => {
        const [catsRes, itemsRes, settingsRes] = await Promise.allSettled([
          getCategories(targetId),
          getMenuItems(targetId),
          getSettings(targetId)
        ]);

        let cats = catsRes.status === 'fulfilled' ? catsRes.value : [];
        let items = itemsRes.status === 'fulfilled' ? itemsRes.value : [];
        let settings = settingsRes.status === 'fulfilled' ? settingsRes.value : {};

        return { cats, items, settings };
      };

      const { cats, items, settings } = await loadTenantData(effectiveId || tenantId);

      if (cats.length > 0) {
        setCategories(['All', ...cats.map(c => c.name)]);
      } else {
        const itemCats = Array.from(new Set(items.map(i => i.category).filter(Boolean)));
        setCategories(['All', ...itemCats]);
      }

      setMenuItems(items);
      const rawNumber = settings.whatsappNumber || import.meta.env.VITE_WHATSAPP_NUMBER || '';
      setWhatsappNumber(formatWhatsAppNumber(rawNumber));
    } catch (error) {
      console.error('Failed to load menu:', error);
      setHasError(true);
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  // Filter items
  const filteredItems = activeCategory === 'All'
    ? menuItems
    : menuItems.filter(item => item.category === activeCategory);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      toast.success(`${item.name} added to cart`);
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === itemId);
      if (existing.quantity === 1) {
        return prev.filter(i => i.id !== itemId);
      }
      return prev.map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i);
    });
  };

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const triggerOrderFlow = () => {
    setShowPhoneModal(true);
  };

  const handleWhatsAppOrder = async (e) => {
    e.preventDefault();
    const cleanCustomerDigits = customerPhone.replace(/[^0-9]/g, '');

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });

    let message = `🍽️ NEW ORDER\n\n`;
    message += `Table : ${roomId || 'N/A'}\n\n`;
    message += `Customer Order\n\n`;
    cart.forEach(item => {
      message += `${item.quantity} x ${item.name}\n`;
    });
    message += `\nSpecial Instructions\n\n`;
    message += `${specialInstructions.trim() ? specialInstructions.trim() : 'None'}\n\n`;
    message += `Total : ₹${totalAmount.toFixed(0)}\n\n`;
    message += `Time : ${timeString}`;

    const encodedMessage = encodeURIComponent(message);
    let targetNumber = formatWhatsAppNumber(whatsappNumber);

    // If targetNumber was not loaded yet, attempt on-the-fly fetch
    if (!targetNumber) {
      try {
        const freshSettings = await getSettings(resolvedTenant || tenantId);
        targetNumber = formatWhatsAppNumber(freshSettings.whatsappNumber || import.meta.env.VITE_WHATSAPP_NUMBER || '');
      } catch (err) {
        console.warn("On-the-fly settings fetch notice:", err);
      }
    }

    // Log order in Firestore regardless of WhatsApp setup
    try {
      await saveOrder(resolvedTenant || tenantId, {
        roomId,
        items: cart,
        specialInstructions: specialInstructions.trim(),
        totalAmount,
        customerPhone: cleanCustomerDigits ? `+91${cleanCustomerDigits}` : 'N/A'
      });
    } catch (error) {
      console.warn("Order save notice:", error);
    }

    setCart([]);
    setShowPhoneModal(false);
    setCustomerPhone('');
    setSpecialInstructions('');

    if (targetNumber) {
      toast.success('Redirecting to WhatsApp...');
      const waUrl = `https://wa.me/${targetNumber}?text=${encodedMessage}`;
      window.location.href = waUrl;
    } else {
      toast.success('Order placed successfully! Staff will fulfill your table order.');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  if (hasError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground text-center">
        <div className="glass-card p-8 max-w-md w-full space-y-4">
          <Info className="w-12 h-12 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold">Unable to Load Menu</h2>
          <p className="text-sm text-muted-foreground">
            We could not fetch the menu for Table {roomId}. Please check your connection and try again.
          </p>
          <button
            onClick={fetchData}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
          >
            <RefreshCw className="w-4 h-4" /> Retry Loading
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-gray-100 px-4 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Table : {roomId}</h1>
            <p className="text-xs text-muted-foreground">Digital Menu & Quick Ordering</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-8">

        {/* Categories */}
        <section>
          <div className="flex overflow-x-auto pb-4 gap-2 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-5 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all duration-300 ${activeCategory === cat
                    ? 'bg-primary text-white shadow-md shadow-primary/20 scale-[1.02]'
                    : 'bg-white border border-gray-100 hover:border-primary/50 text-gray-600'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        {/* Menu Grid */}
        <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className="animate-fade-up glass-card overflow-hidden flex flex-col h-full group"
            >
              {item.imageUrl && (
                <div className="w-full aspect-square shrink-0 overflow-hidden relative">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {!item.available && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                      <span className="text-white micro-caps text-[10px]">Sold Out</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md rounded-lg px-2 py-1 flex items-center shadow-sm">
                    <span className="text-[9px] sm:text-[10px] font-bold text-gray-700 uppercase tracking-widest">
                      {item.category === 'Food' ? 'Non-Veg' : 'Veg'}
                    </span>
                  </div>
                </div>
              )}
              <div className="p-3 flex flex-col justify-between flex-1 gap-2">
                <div>
                  <div className="flex justify-between items-start mb-1 gap-1">
                    <h3 className="font-semibold text-sm sm:text-base leading-tight text-foreground line-clamp-2">{item.name}</h3>
                    <span className="font-bold text-primary text-sm sm:text-base shrink-0">
                      ₹{item.price.toFixed(2)}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>
                  )}
                </div>

                {item.available && (
                  <div className="flex items-center justify-between mt-auto pt-2">
                    {cart.find(i => i.id === item.id) ? (
                      <div className="flex items-center gap-2 bg-primary/10 rounded-full px-1 py-1 w-full justify-between sm:w-auto sm:justify-start">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1.5 sm:p-1 rounded-full bg-white text-primary shadow-sm hover:scale-105 transition-transform"
                        >
                          <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                        <span className="font-bold w-4 text-center text-sm">
                          {cart.find(i => i.id === item.id).quantity}
                        </span>
                        <button
                          onClick={() => addToCart(item)}
                          className="p-1.5 sm:p-1 rounded-full bg-primary text-white shadow-sm hover:scale-105 transition-transform"
                        >
                          <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(item)}
                        className="flex items-center justify-center gap-1 w-full bg-primary text-white px-3 py-2 rounded-xl micro-caps shadow-sm shadow-primary/20 hover:scale-[1.02] transition-transform text-xs"
                      >
                        Add <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredItems.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground flex flex-col items-center">
              <Info className="w-12 h-12 mb-4 opacity-20" />
              <p>No items found in this category.</p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-8 py-8 px-4 w-full">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">
          <img src="/logo.svg" alt="Menuwo" className="h-8 w-auto object-contain" />
          
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-gray-600">
            <a href="#" className="hover:text-primary transition-colors" target="_blank" rel="noopener noreferrer">Follow Instagram</a>
            <a href="#" className="hover:text-primary transition-colors" target="_blank" rel="noopener noreferrer">Visit Website</a>
          </div>
          
          <p className="text-xs text-gray-400">&copy; {new Date().getFullYear()} Menuwo. All rights reserved.</p>
        </div>
      </footer>

      {/* Floating Bottom Bar */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6 sm:pb-4 bg-white border-t border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
          >
            <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{totalCartItems} {totalCartItems === 1 ? 'item' : 'items'}</p>
                <p className="text-xl font-bold text-foreground">₹{totalAmount.toFixed(2)}</p>
              </div>
              <button
                onClick={triggerOrderFlow}
                className="flex-1 max-w-[200px] sm:max-w-xs py-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#25D366]/20"
              >
                <MessageCircle className="w-5 h-5" />
                <span className="truncate">Place Order via WhatsApp</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Checkout Modal */}
      <AnimatePresence>
        {showPhoneModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowPhoneModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            >
              <h2 className="text-xl font-bold mb-1 text-foreground">Complete Your Order</h2>
              <p className="text-xs text-gray-500 mb-4">Table: <strong className="text-gray-800">{roomId}</strong> • Total: <strong className="text-primary">₹{totalAmount.toFixed(0)}</strong></p>
              
              <form onSubmit={handleWhatsAppOrder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Special Instructions (Optional)</label>
                  <textarea
                    rows={2}
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g., Burger without onion, Less spicy"
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">WhatsApp Number (Optional)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                      <span className="text-gray-500 font-medium sm:text-sm">+91</span>
                    </div>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="9876543210"
                      className="w-full h-12 rounded-xl border border-gray-200 bg-gray-50 pl-12 pr-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowPhoneModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">Cancel</button>
                  <button type="submit" className="flex-1 py-3 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold flex items-center justify-center gap-2">
                    <MessageCircle className="w-4 h-4" /> Place Order
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
