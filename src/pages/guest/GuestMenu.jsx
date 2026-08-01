import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingCart, Plus, Minus, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import CartDrawer from '../../components/guest/CartDrawer';
import { getCategories, getMenuItems, getSettings } from '../../services/firebaseDb';

export default function GuestMenu() {
  const { roomId } = useParams();
  const [activeCategory, setActiveCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [categories, setCategories] = useState(['All']);
  const [menuItems, setMenuItems] = useState([]);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [dbCategories, dbMenuItems, dbSettings] = await Promise.all([
        getCategories(),
        getMenuItems(),
        getSettings()
      ]);
      setCategories(['All', ...dbCategories.map(c => c.name)]);
      setMenuItems(dbMenuItems);
      setWhatsappNumber(dbSettings.whatsappNumber || import.meta.env.VITE_WHATSAPP_NUMBER || '1234567890');
    } catch (error) {
      toast.error('Failed to load menu');
      console.error(error);
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-gray-100 px-4 py-3 sm:py-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Room {roomId}</h1>
            <p className="text-xs text-muted-foreground">Digital Menu</p>
          </div>
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <ShoppingCart className="w-6 h-6" />
            {totalCartItems > 0 && (
              <span className="absolute top-0 right-0 bg-emerald-500 text-white text-[10px] font-bold h-4 w-4 rounded-full flex items-center justify-center">
                {totalCartItems}
              </span>
            )}
          </button>
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
                      ${item.price.toFixed(2)}
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

      {/* Cart Drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        setIsOpen={setIsCartOpen}
        cart={cart}
        addToCart={addToCart}
        removeFromCart={removeFromCart}
        roomId={roomId}
        whatsappNumber={whatsappNumber}
      />
    </div>
  );
}
