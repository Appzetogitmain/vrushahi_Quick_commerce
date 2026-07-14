import React, { useState } from 'react';
import { X, Upload, FileText, Download, CheckCircle, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import api from '../../../services/api/config';

interface BulkUploadProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkUploadProductModal: React.FC<BulkUploadProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const downloadTemplate = (type: 'simple' | 'variant') => {
    const ws_data = type === 'simple'
      ? [[
          "Product Name", "Header Category", "Category", "SubCategory", "SubSubCategory",
          "Brand", "MRP", "Selling Price", "Cost Price", "Stock",
          "Min Order Quantity", "Max Order Limit", "Net Quantity", "Barcode", "Drug Lic No",
          "Manufacturer", "Made In", "FSSAI Lic No", "Tax Class", "Small Description",
          "Description", "Is Returnable", "Max Return Days", "Warranty", "Image URL",
          "Gallery Image URLs"
        ]]
      : [[
          "Product Name", "Header Category", "Category", "SubCategory", "SubSubCategory",
          "Brand", "Min Order Quantity", "Max Order Limit", "Net Quantity", "Barcode", "Drug Lic No",
          "Manufacturer", "Made In", "FSSAI Lic No", "Tax Class", "Small Description",
          "Description", "Is Returnable", "Max Return Days", "Warranty", "Image URL",
          "Gallery Image URLs", "Variant Title", "Variant MRP", "Variant Selling Price",
          "Variant Cost Price", "Variant Stock", "Variant SKU", "Variant Image URL"
        ]];

    const ws = XLSX.utils.aoa_to_sheet(ws_data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, `Bulk_Upload_${type === 'simple' ? 'Simple' : 'Variants'}_Template.xlsx`);
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select an Excel file first");
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post('/products/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setResult(response.data);
      if (response.data.success && response.data.summary.uploaded > 0) {
        onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const downloadErrorReport = () => {
    if (!result || !result.errors || result.errors.length === 0) return;
    
    const lines = ["Row,Error"];
    result.errors.forEach((e: any) => {
      lines.push(`${e.row},"${e.error.replace(/"/g, '""')}"`);
    });
    
    const blob = new Blob([lines.join('\n')], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "upload_errors.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative inline-block px-4 pt-5 pb-4 overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
            <button
              onClick={onClose}
              className="text-gray-400 bg-white rounded-md hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <span className="sr-only">Close</span>
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto bg-orange-100 rounded-full sm:mx-0 sm:h-10 sm:w-10">
              <Upload className="w-6 h-6 text-orange-600" />
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
              <h3 className="text-lg font-medium leading-6 text-gray-900">
                Bulk Upload Products
              </h3>
              
              {!result ? (
                <div className="mt-4">
                  <div className="mb-6 space-y-4">
                    <p className="text-sm text-gray-500">
                      1. Download a template and fill it with your product data.
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => downloadTemplate('simple')}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium leading-4 text-orange-700 bg-orange-100 border border-transparent rounded-md hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Simple Template
                      </button>
                      <button
                        onClick={() => downloadTemplate('variant')}
                        className="inline-flex items-center px-3 py-2 text-sm font-medium leading-4 text-orange-700 bg-orange-100 border border-transparent rounded-md hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Variant Template
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm text-gray-500 mb-2">
                      2. Upload the filled Excel file here:
                    </p>
                    <label className="flex justify-center w-full h-32 px-4 transition bg-white border-2 border-gray-300 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none">
                      <span className="flex items-center space-x-2">
                        <Upload className="w-6 h-6 text-gray-600" />
                        <span className="font-medium text-gray-600">
                          {file ? file.name : "Drop Excel file to upload, or browse"}
                        </span>
                      </span>
                      <input 
                        type="file" 
                        name="file_upload" 
                        className="hidden" 
                        accept=".xlsx, .xls"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                      />
                    </label>
                  </div>

                  {error && (
                    <div className="p-3 mt-2 text-sm text-red-700 bg-red-100 rounded-md">
                      {error}
                    </div>
                  )}

                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="button"
                      disabled={!file || uploading}
                      onClick={handleUpload}
                      className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-orange-600 border border-transparent rounded-md shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    >
                      {uploading ? "Uploading..." : "Upload Products"}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={uploading}
                      className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-md font-medium text-gray-900 mb-4">Upload Summary</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Total Rows Processed</span>
                        <span className="font-medium">{result.summary.totalRows}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center text-green-600">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Successfully Imported
                        </span>
                        <span className="font-medium text-green-600">{result.summary.uploaded}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="flex items-center text-red-600">
                          <AlertCircle className="w-4 h-4 mr-2" />
                          Failed
                        </span>
                        <span className="font-medium text-red-600">{result.summary.failed}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse space-x-reverse space-x-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-orange-600 border border-transparent rounded-md shadow-sm hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:w-auto sm:text-sm"
                    >
                      Done
                    </button>
                    {result.summary.failed > 0 && (
                      <button
                        type="button"
                        onClick={downloadErrorReport}
                        className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-red-700 bg-red-100 border border-transparent rounded-md shadow-sm hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:w-auto sm:text-sm"
                      >
                        <FileText className="w-4 h-4 mr-2 mt-0.5" />
                        Download Error Report
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
