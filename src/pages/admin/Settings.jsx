import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { getSettings, saveSettings } from '../../services/firebaseDb';
import { useAuth } from '../../contexts/AuthContext';

export default function Settings() {
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { userProfile } = useAuth();
  const tenantId = userProfile?.restaurantId;

  useEffect(() => {
    if (tenantId) fetchSettings();
  }, [tenantId]);

  const fetchSettings = async () => {
    try {
      const settings = await getSettings(tenantId);
      setWhatsappNumber(settings.whatsappNumber || '');
    } catch (error) {
      toast.error('Failed to load settings');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await saveSettings(tenantId, { whatsappNumber });
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-2xl"
    >
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-1">Configure global preferences for the application.</p>
        </div>
      </div>
      
      <div className="glass-card p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Phone className="w-5 h-5 text-emerald-500" /> WhatsApp Configuration
        </h2>
        
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp Order Number
            </label>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="e.g. +1234567890"
                className="flex-1 w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                required
              />
              <button 
                type="submit" 
                disabled={isSaving}
                className="w-full sm:w-auto flex justify-center items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform disabled:opacity-70 disabled:hover:scale-100"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Include the country code without any spaces or symbols (e.g., 919876543210 for India). Orders will be sent directly to this number.
            </p>
          </div>
        </form>
      </div>
    </motion.div>
  );
}
