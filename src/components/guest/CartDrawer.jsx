import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Minus, MessageCircle } from 'lucide-react';
import { saveOrder } from '../../services/firebaseDb';
import toast from 'react-hot-toast';

export default function CartDrawer({ isOpen, setIsOpen, cart, addToCart, removeFromCart, roomId, whatsappNumber }) {

  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleWhatsAppOrder = async () => {
    // Generate message
    let message = `*New Order - Room ${roomId}*\n\n`;

    cart.forEach(item => {
      message += `${item.quantity}x ${item.name} - $${(item.price * item.quantity).toFixed(2)}\n`;
    });

    message += `\n*Total: $${totalAmount.toFixed(2)}*`;

    // Encode for URL
    const encodedMessage = encodeURIComponent(message);

    // Ensure the number has no spaces/pluses and is just raw digits if possible (WhatsApp URL requirement)
    const cleanNumber = whatsappNumber ? whatsappNumber.replace(/[^0-9]/g, '') : '1234567890';

    try {
      // Save to firebase database for admin reporting
      await saveOrder({
        roomId,
        items: cart,
        totalAmount
      });

      const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
    } catch (error) {
      toast.error('Failed to log order internally. Proceeding to WhatsApp anyway.');
      const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
      console.error(error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 glass-morphism z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 h-[85vh] bg-white z-50 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden max-w-md mx-auto"
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold">Your Order</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                  <div className="w-16 h-16 mb-4 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center">
                    <ShoppingCart className="w-8 h-8 opacity-50" />
                  </div>
                  <p>Your cart is empty.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="flex gap-4 p-3 rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="w-16 h-16 rounded-xl object-cover" />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold">{item.name}</h4>
                      <p className="font-bold text-primary">${item.price.toFixed(2)}</p>

                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-3 bg-primary/10 rounded-full px-1 py-1">
                          <button onClick={() => removeFromCart(item.id)} className="p-1 rounded-full bg-white text-primary hover:scale-105 shadow-sm">
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                          <button onClick={() => addToCart(item)} className="p-1 rounded-full bg-primary text-white hover:scale-105 shadow-sm">
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-muted-foreground ml-auto">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t bg-background">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-medium text-muted-foreground">Total</span>
                  <span className="text-2xl font-bold">${totalAmount.toFixed(2)}</span>
                </div>

                <button
                  onClick={handleWhatsAppOrder}
                  className="w-full py-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-[#25D366]/20"
                >
                  <MessageCircle className="w-5 h-5" />
                  Order via WhatsApp
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Dummy icon since it's not imported at top for empty state
function ShoppingCart(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="8" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
    </svg>
  )
}
