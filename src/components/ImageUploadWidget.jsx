import { useState } from "react";
import { ImageIcon, X, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function ImageUploadWidget({ imageUrl, onUpload }) {
  const [isUploading, setIsUploading] = useState(false);

  // 1. The Upload Function
  const uploadToCloudinary = async (file) => {
    if (!file.type.startsWith("image/")) throw new Error("Please upload an image file");
    
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "od1sjbbu");      // Replace if needed
    formData.append("api_key", "955253717999674");     // Replace if needed
    formData.append("cloud_name", "da1edgeae1");       // Replace if needed
    
    const response = await fetch(`https://api.cloudinary.com/v1_1/da1edgeae1/image/upload`, {
      method: "POST",
      body: formData
    });
    
    if (!response.ok) throw new Error("Upload failed");
    
    const data = await response.json();
    return data.secure_url;
  };

  // 2. The Event Handler
  const handleImageUpload = async (file) => {
    if (!file) return;
    
    setIsUploading(true);
    const toastId = toast.loading("Uploading image...");
    
    try {
      const url = await uploadToCloudinary(file);
      onUpload(url); // Call the callback with the new URL
      toast.success("Image uploaded successfully!", { id: toastId });
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`, { id: toastId });
    } finally {
      setIsUploading(false);
    }
  };

  // 3. The UI
  return (
    <div className="w-full">
      <label className="text-[10px] font-medium text-gray-400 uppercase tracking-widest ml-1 mb-2 block">
        Upload Image
      </label>
      
      <div className="flex items-center gap-4">
        {/* Preview Box */}
        {imageUrl ? (
          <div className="relative h-16 w-16 rounded-2xl overflow-hidden border-2 border-gray-100 shrink-0 group">
            <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onUpload("")}
              className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="h-16 w-16 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center shrink-0">
            {isUploading ? (
              <Loader2 className="h-6 w-6 text-gray-300 animate-spin" />
            ) : (
              <ImageIcon className="h-6 w-6 text-gray-300" />
            )}
          </div>
        )}
        
        {/* Upload Button */}
        <label className="flex-1 cursor-pointer">
          <div className="px-6 py-5 bg-gray-50 hover:bg-gray-100 transition-colors rounded-[1.5rem] border border-transparent text-sm font-medium text-center text-gray-800">
            {isUploading ? "Uploading..." : "Click to Upload"}
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={isUploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleImageUpload(file);
              // Reset target value so the same file can be selected again if needed
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </div>
  );
}
