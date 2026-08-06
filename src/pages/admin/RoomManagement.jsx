import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeCanvas } from 'qrcode.react';
import { Download, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getRooms, saveRoom, deleteRoom } from '../../services/firebaseDb';
import { useAuth } from '../../contexts/AuthContext';

export default function RoomManagement() {
  const [rooms, setRooms] = useState([]);
  const [newRoomId, setNewRoomId] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { userProfile } = useAuth();
  const tenantId = userProfile?.restaurantId;

  useEffect(() => {
    if (tenantId) fetchRooms();
  }, [tenantId]);

  const fetchRooms = async () => {
    if (!tenantId) return;
    try {
      const data = await getRooms(tenantId);
      setRooms(data);
    } catch (error) {
      toast.error('Failed to load rooms');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!newRoomId.trim() || !newRoomName.trim()) {
      toast.error('Please enter both ID and Name');
      return;
    }
    
    // We compare room.roomId instead of room.id because Firebase generates the doc id, but we save roomId as a field
    if (rooms.find(r => r.roomId === newRoomId)) {
      toast.error('A room with this ID already exists');
      return;
    }

    try {
      const newRoom = await saveRoom(tenantId, { roomId: newRoomId, name: newRoomName });
      setRooms([newRoom, ...rooms]);
      setNewRoomId('');
      setNewRoomName('');
      setIsAdding(false);
      toast.success('Room added successfully');
    } catch (error) {
      toast.error('Failed to add room');
      console.error(error);
    }
  };

  const removeRoom = async (id) => {
    if (!window.confirm("Warning: Deleting this room will permanently invalidate its QR code. Any physical QR stands or printouts you have for this room will no longer work and you will need to replace them. Are you sure you want to proceed?")) return;
    try {
      await deleteRoom(tenantId, id);
      setRooms(rooms.filter(r => r.id !== id));
      toast.success('Room removed');
    } catch (error) {
      toast.error('Failed to delete room');
      console.error(error);
    }
  };

  const downloadQR = (id, name) => {
    const canvas = document.getElementById(`qr-${id}`);
    if (canvas) {
      // Create a high-res canvas for downloading (1024x1024)
      const size = 1024;
      const margin = 64; // Standard quiet zone for scanning
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = size;
      tempCanvas.height = size;
      const ctx = tempCanvas.getContext('2d');
      
      // Fill with solid white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      
      // Disable smoothing to ensure perfectly crisp pixel edges when upscaling
      ctx.imageSmoothingEnabled = false;
      
      // Draw the original QR code scaled up in the center
      const qrSize = size - (margin * 2);
      ctx.drawImage(canvas, margin, margin, qrSize, qrSize);
      
      const pngUrl = tempCanvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_${name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  // Generate the full URL for the QR code based on current window location
  const getMenuUrl = (roomId) => {
    const baseUrl = window.location.origin;
    const currentTenant = tenantId || userProfile?.restaurantId || '';
    return `${baseUrl}/menu/${currentTenant}/${roomId}`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tables & QR Codes</h1>
          <p className="text-muted-foreground mt-1">Manage dining tables or apartment rooms and generate unique menu QR codes.</p>
        </div>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
        >
          {isAdding ? 'Cancel' : <><Plus className="w-5 h-5" /> Add Table / Room</>}
        </button>
      </div>

      {/* Add Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass-card p-6 mb-2">
              <h2 className="text-lg font-semibold mb-4 text-foreground">Create New Table/Room</h2>
              <form onSubmit={handleAddRoom} className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="w-full sm:w-auto flex-1">
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Unique ID (used in URL)</label>
                  <input
                    type="text"
                    value={newRoomId}
                    onChange={(e) => setNewRoomId(e.target.value.replace(/\s+/g, '-').toLowerCase())}
                    placeholder="e.g. table-5"
                    className="w-full h-12 rounded-xl border border-gray-100 bg-white px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                  />
                </div>
                <div className="w-full sm:w-auto flex-1">
                  <label className="block text-sm font-medium mb-1.5 text-gray-700">Display Name</label>
                  <input
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="e.g. Table 5"
                    className="w-full h-12 rounded-xl border border-gray-100 bg-white px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full sm:w-auto h-12 bg-foreground text-white px-6 rounded-xl font-medium hover:bg-black/90 transition-colors"
                >
                  Save
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {rooms.map(room => (
            <motion.div
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              key={room.id}
              className="glass-card p-6 flex flex-col items-center group relative overflow-hidden"
            >
              <button 
                onClick={() => removeRoom(room.id)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                title="Remove"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-bold text-foreground mb-1">{room.name}</h3>
              <div className="flex items-center gap-2 mb-6">
                <p className="text-xs text-muted-foreground font-mono bg-gray-50 px-2 py-1 rounded">/menu/{tenantId}/{room.roomId || room.id}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(getMenuUrl(room.roomId || room.id));
                    toast.success('Menu link copied!');
                  }}
                  className="text-xs font-bold text-primary hover:underline"
                >
                  Copy Link
                </button>
              </div>
              
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <QRCodeCanvas 
                  id={`qr-${room.id}`}
                  value={getMenuUrl(room.roomId || room.id)} 
                  size={180} 
                  bgColor={"#ffffff"}
                  fgColor={"#000000"}
                  level={"H"}
                  includeMargin={false}
                />
              </div>

              <button 
                onClick={() => downloadQR(room.id, room.name)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 text-foreground font-medium hover:bg-gray-50 hover:border-primary/30 hover:text-primary transition-all"
              >
                <Download className="w-4 h-4" />
                Download PNG
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {rooms.length === 0 && (
        <div className="py-20 text-center text-muted-foreground">
          <p>No tables or rooms found. Add one to generate a QR code.</p>
        </div>
      )}
    </div>
  );
}
