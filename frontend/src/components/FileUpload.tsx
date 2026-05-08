import React, { useState, useRef } from 'react';
import axios from 'axios';

interface FileUploadProps {
  label: string;
  onUploadSuccess: (url: string) => void;
  onUploadError?: (error: string) => void;
  accept?: string;
  required?: boolean;
  value?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  label,
  onUploadSuccess,
  onUploadError,
  accept = "image/*,.pdf",
  required = false,
  value
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (e.g., 5MB limit)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      const err = "File size exceeds 5MB limit";
      setError(err);
      if (onUploadError) onUploadError(err);
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('document', file);

    try {
      const token = localStorage.getItem('authToken');
      const uploadUrl = token 
        ? `${import.meta.env.VITE_API_URL}/upload/document`
        : `${import.meta.env.VITE_API_URL}/upload/document-public`;

      const response = await axios.post(uploadUrl, formData, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (response.data.success && response.data.data.url) {
        const url = response.data.data.url;
        setPreview(url);
        onUploadSuccess(url);
      } else {
        throw new Error("Upload failed");
      }
    } catch (err: any) {
      console.error("File upload error:", err);
      const msg = err.response?.data?.message || "Failed to upload file";
      setError(msg);
      if (onUploadError) onUploadError(msg);
    } finally {
      setLoading(false);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div 
        onClick={triggerFileInput}
        className={`relative cursor-pointer group border-2 border-dashed rounded-2xl p-4 transition-all duration-300 flex flex-col items-center justify-center min-h-[120px] ${
          error ? 'border-red-300 bg-red-50' : 
          preview ? 'border-green-300 bg-green-50' : 
          'border-green-600/20 bg-neutral-50/50 hover:border-green-500 hover:bg-white'
        }`}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          accept={accept}
          className="hidden"
        />

        {loading ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-green-600 font-medium font-bold">Uploading...</p>
          </div>
        ) : preview ? (
          <div className="flex flex-col items-center space-y-2 w-full">
            {preview.endsWith('.pdf') ? (
              <div className="flex items-center gap-2 p-2 bg-white rounded-lg shadow-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                <span className="text-xs font-medium text-neutral-600 truncate max-w-[150px]">PDF Document</span>
              </div>
            ) : (
              <img src={preview} alt="Preview" className="h-20 w-auto object-contain rounded-lg shadow-sm" />
            )}
            <p className="text-[10px] text-green-600 font-bold uppercase tracking-tighter">Click to change</p>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-600">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <p className="text-sm font-medium text-neutral-500">Tap to upload</p>
            <p className="text-[10px] text-neutral-400 mt-1 uppercase font-bold tracking-widest">{accept.replace(/\./g, '').toUpperCase()}</p>
          </>
        )}
      </div>
      
      {error && <p className="text-xs text-red-500 mt-1 ml-1">{error}</p>}
    </div>
  );
};

export default FileUpload;
