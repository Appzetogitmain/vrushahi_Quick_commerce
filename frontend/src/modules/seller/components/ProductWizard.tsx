import React, { useState, useEffect } from "react";
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Upload, 
  X, 
  Zap, 
  Settings, 
  Image as ImageIcon, 
  DollarSign, 
  Package, 
  Layers, 
  TrendingUp,
  RefreshCw,
  Plus,
  Info
} from "lucide-react";
import CategoryFields from "./CategoryFields";
import {
  validateImageFile,
  compressImage,
  createImagePreview,
} from "../../../utils/imageUpload";
import { useToast } from "../../../context/ToastContext";
import { useNavigate } from "react-router-dom";

interface ProductWizardProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent, forcePublishValue?: string) => void;
  categories: any[];
  subcategories: any[];
  subSubCategories: any[];
  brands: any[];
  taxes: any[];
  headerCategories: any[];
  uploading: boolean;
  mainImagePreview: string;
  galleryImagePreviews: string[];
  handleMainImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleGalleryImagesChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeGalleryImage: (index: number) => void;
  variations: any[];
  setVariations: React.Dispatch<React.SetStateAction<any[]>>;
  variationForm: any;
  setVariationForm: React.Dispatch<React.SetStateAction<any>>;
  addVariation: () => void;
  removeVariation: (index: number) => void;
  handleRemoveMainImage: () => void;
  isEdit?: boolean;
}

const ProductWizard: React.FC<ProductWizardProps> = ({
  formData,
  setFormData,
  handleChange,
  onSubmit,
  categories,
  subcategories,
  subSubCategories,
  brands,
  taxes,
  headerCategories,
  uploading,
  mainImagePreview,
  galleryImagePreviews,
  handleMainImageChange,
  handleGalleryImagesChange,
  removeGalleryImage,
  variations,
  setVariations,
  variationForm,
  setVariationForm,
  addVariation,
  removeVariation,
  handleRemoveMainImage,
  isEdit
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [mode, setMode] = useState<"wizard" | "single">("wizard");
  const totalSteps = 5;

  const sanitizeNumberValue = (value: string): string => {
    if (/^0+$/.test(value)) {
      return "0";
    } else if (/^0\d/.test(value)) {
      return value.replace(/^0+/, "");
    }
    return value;
  };

  const steps = [
    { id: 1, name: "Identity", icon: Package },
    { id: 2, name: "Pricing", icon: DollarSign },
    { id: 3, name: "Media & Variants", icon: Layers },
    { id: 4, name: "Specifics", icon: Settings },
    { id: 5, name: "Discovery", icon: TrendingUp },
  ];

  const { showToast } = useToast();
  const navigate = useNavigate();

  const nextStep = () => {
    if (currentStep === 1) {
      if (!formData.productName.trim() || !formData.headerCategory || !formData.category) {
        showToast("Please fill in all required fields (Product Name, Header Category, Category)", "error");
        return;
      }
      if (!/[a-zA-Z0-9]/.test(formData.productName)) {
        showToast("Product Name must contain at least one letter or number", "error");
        return;
      }
      if (formData.netQuantity && !/[a-zA-Z0-9]/.test(formData.netQuantity)) {
        showToast("Net Quantity must contain at least one letter or number", "error");
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.price || !formData.compareAtPrice) {
        showToast("Please fill in Pricing details (MRP, Selling Price)", "error");
        return;
      }
    } else if (currentStep === 3) {
      const hasCoverImage = !!mainImagePreview;
      const hasVariationImage = variations.some((v) => !!v.imageFile || !!v.imagePreview || !!v.image);
      if (!hasCoverImage && !hasVariationImage) {
        showToast("At least one product image is required (Cover Image or on Variation)", "error");
        return;
      }
      if (variations.length === 0) {
        showToast("Add at least one variation", "error");
        return;
      }
    } else if (currentStep === 4) {
      if (formData.isReturnable === "Yes" && !formData.maxReturnDays) {
        showToast("Please provide the return period in days", "error");
        return;
      }
      if (formData.manufacturer && !/[a-zA-Z0-9]/.test(formData.manufacturer)) {
        showToast("Manufacturer name must contain at least one letter or number", "error");
        return;
      }
      if (formData.madeIn && !/^[a-zA-Z\s]+$/.test(formData.madeIn)) {
        showToast("Country of Origin should only contain alphabetic characters", "error");
        return;
      }
    }

    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const generateSKU = () => {
    const brand = brands.find(b => b._id === formData.brand)?.name || 'GEN';
    const cat = categories.find(c => c._id === formData.category)?.name || 'PROD';
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    const sku = `${brand.substring(0, 3)}-${cat.substring(0, 3)}-${random}`;
    setFormData((prev: any) => ({ ...prev, sku }));
  };

  const onAttributesChange = (name: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
      attributes: {
        ...prev.attributes,
        [name]: value
      }
    }));
  };

  const currentCategoryName = categories.find(c => c._id === formData.category)?.name || "";

  const renderStepContent = (step: number) => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-neutral-700 mb-2">Product Name <span className="text-rose-500">*</span></label>
                <input
                  type="text"
                  name="productName"
                  value={formData.productName}
                  onChange={handleChange}
                  placeholder="Enter product name (e.g. Organic Brown Rice - 5kg)"
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all outline-none text-lg font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Header Category <span className="text-rose-500">*</span></label>
                <select
                  name="headerCategory"
                  value={formData.headerCategory}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white font-medium"
                >
                  <option value="">Select Header Category</option>
                  {headerCategories.map((hc) => (
                    <option key={hc._id} value={hc._id}>{hc.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Category <span className="text-rose-500">*</span></label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  disabled={!formData.headerCategory}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white disabled:bg-neutral-50 disabled:text-neutral-400"
                >
                  <option value="">Select Category</option>
                  {categories
                    .filter(cat => (cat.headerCategoryId?._id || cat.headerCategoryId) === formData.headerCategory)
                    .map((cat) => (
                      <option key={cat._id} value={cat._id}>{cat.name}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Sub-Category</label>
                <select
                  name="subcategory"
                  value={formData.subcategory}
                  onChange={handleChange}
                  disabled={!formData.category}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white disabled:bg-neutral-50 disabled:text-neutral-400"
                >
                  <option value="">Select Sub-Category</option>
                  {subcategories.map((sub) => (
                    <option key={sub._id} value={sub._id}>{sub.subcategoryName || sub.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Brand (Optional)</label>
                <select
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white"
                >
                  <option value="">Select Brand</option>
                  {brands.map((brand) => (
                    <option key={brand._id} value={brand._id}>{brand.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Net Quantity (e.g. 500ml, 1kg, 1 Unit)</label>
                <input
                  type="text"
                  name="netQuantity"
                  value={formData.netQuantity}
                  onChange={handleChange}
                  placeholder="Selling item quantity"
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-medium"
                />
              </div>

              <div className="flex items-center space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">SKU Code</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku || ''}
                      onChange={handleChange}
                      placeholder="Auto or manual"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none pr-12"
                    />
                    <button
                      type="button"
                      onClick={generateSKU}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-teal-600 transition-colors"
                      title="Generate SKU"
                    >
                      <RefreshCw size={20} />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">MRP <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-medium">₹</span>
                  <input
                    type="number"
                    name="compareAtPrice"
                    value={formData.compareAtPrice || ''}
                    onChange={handleChange}
                    min="0"
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e' || e.key === '+') {
                        e.preventDefault();
                      }
                    }}
                    className="w-full pl-8 pr-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Selling Price <span className="text-rose-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-medium">₹</span>
                  <input
                    type="number"
                    name="price"
                    value={formData.price || ''}
                    onChange={handleChange}
                    min="0"
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e' || e.key === '+') {
                        e.preventDefault();
                      }
                    }}
                    className="w-full pl-8 pr-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none font-bold text-teal-700"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2 text-neutral-400">Cost Price (Pvt)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-medium">₹</span>
                  <input
                    type="number"
                    name="costPrice"
                    value={formData.costPrice || ''}
                    onChange={handleChange}
                    min="0"
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e' || e.key === '+') {
                        e.preventDefault();
                      }
                    }}
                    className="w-full pl-8 pr-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-neutral-50"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Current Stock</label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock || ''}
                  onChange={handleChange}
                  min="0"
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === '+') {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">MOQ (Minimum Order Quantity)</label>
                <input
                  type="number"
                  name="minOrderQuantity"
                  value={formData.minOrderQuantity || '1'}
                  onChange={handleChange}
                  min="1"
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === '+') {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Max Order Limit</label>
                <input
                  type="number"
                  name="maxOrderLimit"
                  value={formData.maxOrderLimit || '0'}
                  onChange={handleChange}
                  min="0"
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === '+') {
                      e.preventDefault();
                    }
                  }}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="0 for unlimited"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Tax Class</label>
                <select
                  name="tax"
                  value={formData.tax}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white font-medium"
                >
                  <option value="">Select Tax</option>
                  {taxes.map((tax) => (
                    <option key={tax._id} value={tax._id}>{tax.name} ({tax.rate}%)</option>
                  ))}
                </select>
              </div>
              
              <div className="md:col-span-2">
                <div className="bg-teal-50 p-4 rounded-xl border border-teal-100 flex items-center justify-between">
                  <div>
                    <span className="text-sm text-teal-800 font-medium">Profit Calculator:</span>
                    <span className="ml-2 text-lg font-bold text-teal-900">
                      ₹{Math.max(0, (Number(formData.price) || 0) - (Number(formData.costPrice) || 0))}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-teal-600 bg-white px-3 py-1 rounded-lg">
                    {Number(formData.compareAtPrice) > Number(formData.price) ? `${Math.round(((Number(formData.compareAtPrice) - Number(formData.price))/Number(formData.compareAtPrice))*100)}% DISCOUNT` : "NO DISCOUNT"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            {/* Image Upload Area */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center text-neutral-800">
                <ImageIcon className="mr-2 text-teal-600" size={20} />
                Product Media
              </h3>
              <div className="bg-purple-100 text-purple-700 px-3 py-2 rounded-lg text-xs font-semibold mt-1 mb-3 inline-flex items-center w-max border border-purple-200">
                <Info size={14} className="mr-1.5 flex-shrink-0" />
                Recommended: 800x800px (1:1 ratio) with white background. Max 1MB.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Main Image */}
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Cover Image</label>
                  <div className="relative group aspect-square rounded-2xl border-2 border-dashed border-neutral-200 hover:border-teal-500 hover:bg-neutral-50 transition-all flex flex-col items-center justify-center cursor-pointer overflow-hidden p-2">
                    {mainImagePreview ? (
                      <>
                        <img src={mainImagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <Upload className="text-white" />
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleRemoveMainImage();
                          }}
                          className="absolute top-2 right-2 bg-rose-500 text-white rounded-full p-1.5 shadow hover:bg-rose-600 z-10 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Upload className="text-neutral-400 mb-2" size={32} />
                        <span className="text-xs text-neutral-500 font-medium">Click to upload</span>
                      </div>
                    )}
                    <input
                      type="file"
                      onChange={handleMainImageChange}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      accept="image/*"
                    />
                  </div>
                </div>

                {/* Gallery */}
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-neutral-700 mb-2">Gallery Images</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {galleryImagePreviews.map((preview, idx) => (
                      <div key={idx} className="relative aspect-square rounded-xl border border-neutral-200 overflow-hidden group">
                        <img src={preview} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeGalleryImage(idx)}
                          className="absolute top-1 right-1 bg-rose-500/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {galleryImagePreviews.length < 5 && (
                      <div className="relative aspect-square rounded-xl border-2 border-dashed border-neutral-200 hover:border-teal-500 hover:bg-neutral-50 flex items-center justify-center transition-all cursor-pointer">
                        <Plus className="text-neutral-400" />
                        <input
                          type="file"
                          multiple
                          onChange={handleGalleryImagesChange}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          accept="image/*"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Variations */}
            <div className="space-y-4 pt-6 border-t border-neutral-100">
               <h3 className="text-lg font-semibold flex items-center text-neutral-800">
                <Layers className="mr-2 text-teal-600" size={20} />
                Variants & Inventory
              </h3>
              
              <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wider">Variation Name (e.g. 1kg, 500g, XL, Red)</label>
                    <input
                      type="text"
                      value={variationForm.title}
                      onChange={(e) => setVariationForm({...variationForm, title: e.target.value})}
                      placeholder="e.g. 1kg / Small / Red"
                      className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-xs font-semibold text-neutral-500 mb-2 uppercase tracking-wider">Variation Image (Optional)</label>
                    <div className="flex items-center space-x-4">
                      <div className="relative w-20 h-20 rounded-xl border-2 border-dashed border-neutral-300 hover:border-teal-500 flex flex-col items-center justify-center cursor-pointer bg-white overflow-hidden transition-colors">
                        {variationForm.imagePreview ? (
                          <>
                            <img src={variationForm.imagePreview} alt="Var Preview" className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                setVariationForm({ ...variationForm, imageFile: null, imagePreview: "" });
                              }}
                              className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 shadow hover:bg-rose-600 transition-colors"
                            >
                              <X size={10} />
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center">
                            <Upload className="text-neutral-400" size={20} />
                            <span className="text-[9px] text-neutral-500 mt-1 font-semibold">Upload</span>
                          </div>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const validation = validateImageFile(file);
                              if (!validation.valid) {
                                alert(validation.error || "Invalid image");
                                return;
                              }
                              try {
                                const compressed = await compressImage(file);
                                const preview = await createImagePreview(compressed);
                                setVariationForm({ ...variationForm, imageFile: compressed, imagePreview: preview });
                              } catch (err) {
                                alert("Failed to process variation image");
                              }
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                      <div className="text-xs text-neutral-500">
                        <p className="font-bold text-neutral-700">Add a specific image for this variation</p>
                        <p>Will be displayed to users when they select this variant option.</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wider">Price (₹)</label>
                    <input
                      type="number"
                      value={variationForm.price}
                      onChange={(e) => setVariationForm({...variationForm, price: sanitizeNumberValue(e.target.value)})}
                      min="0"
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'e' || e.key === '+') {
                          e.preventDefault();
                        }
                      }}
                      className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wider">Disc Price (₹)</label>
                    <input
                      type="number"
                      value={variationForm.discPrice}
                      onChange={(e) => setVariationForm({...variationForm, discPrice: sanitizeNumberValue(e.target.value)})}
                      min="0"
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'e' || e.key === '+') {
                          e.preventDefault();
                        }
                      }}
                      className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wider">Stock</label>
                    <input
                      type="number"
                      value={variationForm.stock}
                      onChange={(e) => setVariationForm({...variationForm, stock: sanitizeNumberValue(e.target.value)})}
                      min="0"
                      onKeyDown={(e) => {
                        if (e.key === '-' || e.key === 'e' || e.key === '+') {
                          e.preventDefault();
                        }
                      }}
                      className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="md:col-span-4 mt-2">
                    <button
                      type="button"
                      onClick={addVariation}
                      className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-teal-100 flex items-center justify-center space-x-2"
                    >
                      <Plus size={20} />
                      <span>Add Variation</span>
                    </button>
                  </div>
                </div>

                {/* Variation Table */}
                {variations.length > 0 && (
                  <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
                    <table className="w-full text-left">
                      <thead className="bg-neutral-50 border-b border-neutral-200">
                        <tr>
                          <th className="px-4 py-3 text-xs font-bold text-neutral-500 uppercase">Variation</th>
                          <th className="px-4 py-3 text-xs font-bold text-neutral-500 uppercase">Price</th>
                          <th className="px-4 py-3 text-xs font-bold text-neutral-500 uppercase">Stock</th>
                          <th className="px-4 py-3 text-xs font-bold text-neutral-500 uppercase text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variations.map((v, i) => (
                          <tr key={i} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors">
                             <td className="px-4 py-3 font-semibold text-neutral-800 flex items-center gap-3">
                                {v.imagePreview || v.image ? (
                                  <img src={v.imagePreview || v.image} alt={v.title} className="w-10 h-10 object-cover rounded-lg border border-neutral-200" />
                                ) : (
                                  <div className="w-10 h-10 bg-neutral-100 rounded-lg flex items-center justify-center border border-neutral-200 text-neutral-400">
                                    <ImageIcon size={16} />
                                  </div>
                                )}
                                <span>{v.title || v.value}</span>
                             </td>
                            <td className="px-4 py-3">
                              <span className="font-bold text-teal-700">₹{v.discPrice || v.price}</span>
                              {v.discPrice > 0 && v.discPrice < v.price && (
                                <span className="ml-2 text-xs text-neutral-400 line-through">₹{v.price}</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-bold ${v.stock > 10 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                {v.stock} UNITS
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => removeVariation(i)}
                                className="text-rose-500 hover:text-rose-700 p-1 rounded-lg hover:bg-rose-50 transition-all"
                              >
                                <X size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
             <h3 className="text-lg font-semibold flex items-center text-neutral-800">
                <Settings className="mr-2 text-teal-600" size={20} />
                {currentCategoryName || "General"} Specifics
              </h3>
              <div className="bg-white p-6 rounded-2xl border border-neutral-200">
                <div className="mb-6">
                  <div className="flex justify-between items-end mb-2">
                    <label className="block text-sm font-medium text-neutral-700 whitespace-normal break-words pr-2">One-line Description (Tagline)</label>
                    <span className="text-xs text-neutral-400 font-medium">{formData.smallDescription?.length || 0}/60</span>
                  </div>
                  <input
                    type="text"
                    name="smallDescription"
                    value={formData.smallDescription || ''}
                    onChange={handleChange}
                    maxLength={60}
                    placeholder="Brief summary e.g. Fresh organic apples from Shimla"
                    className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 transition-all outline-none"
                  />
                  <p className="mt-1 text-xs text-neutral-400">This appears right below the product name on the user side.</p>
                </div>
                <CategoryFields
                  categoryName={currentCategoryName}
                  formData={formData}
                  onChange={handleChange}
                  onAttributesChange={onAttributesChange}
                />

                {/* Return Policy Section */}
                <div className="border-t border-neutral-100 pt-6 mt-6">
                  <h4 className="text-sm font-bold text-neutral-800 mb-4 uppercase tracking-wider">Return Policy</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">Is this product Returnable?</label>
                      <div className="flex bg-neutral-100 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, isReturnable: "Yes" })}
                          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${formData.isReturnable === "Yes" ? "bg-white text-teal-700 shadow-sm" : "text-neutral-500"}`}
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, isReturnable: "No" })}
                          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${formData.isReturnable === "No" ? "bg-white text-rose-700 shadow-sm" : "text-neutral-500"}`}
                        >
                          No
                        </button>
                      </div>
                    </div>

                    {formData.isReturnable === "Yes" && (
                      <div className="animate-in fade-in slide-in-from-left-2 duration-200">
                        <label className="block text-sm font-medium text-neutral-700 mb-2">Return Period (in Days) <span className="text-rose-500">*</span></label>
                        <input
                          type="number"
                          name="maxReturnDays"
                          value={formData.maxReturnDays || ''}
                          onChange={handleChange}
                          min="1"
                          onKeyDown={(e) => {
                            if (e.key === '-' || e.key === 'e' || e.key === '+' || e.key === '.') {
                              e.preventDefault();
                            }
                          }}
                          placeholder="e.g. 7"
                          className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                          required
                        />
                        <p className="mt-1 text-xs text-neutral-400">Specify the number of days a customer can return this item after delivery.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

               <div className="mt-8">
                <label className="block text-sm font-medium text-neutral-700 mb-2">Detailed Product Description</label>
                <textarea
                  name="description"
                  value={formData.description || ''}
                  onChange={handleChange}
                  placeholder="Tell your customers more about this awesome product..."
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none h-48"
                />
              </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
            <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-200 space-y-6">
               <h3 className="text-lg font-semibold flex items-center text-neutral-800">
                <TrendingUp className="mr-2 text-teal-600" size={20} />
                SEO & Tagging
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">Search Tags (Comma separated)</label>
                    <input
                      type="text"
                      name="tags"
                      value={formData.tags}
                      onChange={handleChange}
                      placeholder="e.g. fresh, organic, high protein"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                    <p className="mt-1 text-xs text-neutral-400 italic">Adds to searchability of your product</p>
                 </div>
                 
                 <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">SEO Title (Optional)</label>
                    <input
                      type="text"
                      name="seoTitle"
                      value={formData.seoTitle}
                      onChange={handleChange}
                      placeholder="Premium browser tab title"
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                 </div>

                 <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-neutral-700 mb-2">SEO Description / Meta Tags</label>
                    <textarea
                      name="seoDescription"
                      value={formData.seoDescription}
                      onChange={handleChange}
                      placeholder="Highly optimized description for search engines..."
                      className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none h-24"
                    />
                 </div>
              </div>
            </div>

            <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 flex items-start space-x-4">
               <div className="p-2 bg-rose-100 rounded-lg text-rose-600">
                  <Package size={24} />
               </div>
               <div>
                  <h4 className="font-bold text-rose-900">Final Review Required</h4>
                  <p className="text-sm text-rose-700 mt-1">Please ensure all prices and variants are double-checked. Once published, this product will be immediately visible to customers across the platform.</p>
               </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const renderSinglePageContent = () => {
    return (
      <div className="space-y-12 pb-24 animate-in fade-in duration-500">
        <section>
          <div className="flex items-center space-x-2 mb-6 border-b border-neutral-100 pb-2">
            <Package className="text-teal-600" />
            <h2 className="text-xl font-bold text-neutral-800">1. Identity & Categorization</h2>
          </div>
          {renderStepContent(1)}
        </section>

        <section>
          <div className="flex items-center space-x-2 mb-6 border-b border-neutral-100 pb-2">
            <DollarSign className="text-teal-600" />
            <h2 className="text-xl font-bold text-neutral-800">2. Pricing & Financials</h2>
          </div>
          {renderStepContent(2)}
        </section>

        <section>
          <div className="flex items-center space-x-2 mb-6 border-b border-neutral-100 pb-2">
            <Layers className="text-teal-600" />
            <h2 className="text-xl font-bold text-neutral-800">3. Media & Variants</h2>
          </div>
          {renderStepContent(3)}
        </section>

        <section>
          <div className="flex items-center space-x-2 mb-6 border-b border-neutral-100 pb-2">
            <Settings className="text-teal-600" />
            <h2 className="text-xl font-bold text-neutral-800">4. Category Specifics</h2>
          </div>
          {renderStepContent(4)}
        </section>

        <section>
          <div className="flex items-center space-x-2 mb-6 border-b border-neutral-100 pb-2">
            <TrendingUp className="text-teal-600" />
            <h2 className="text-xl font-bold text-neutral-800">5. Marketing & SEO</h2>
          </div>
          {renderStepContent(5)}
        </section>

        <div className="sticky bottom-0 bg-white border-t border-neutral-200 p-4 shadow-2xl flex justify-center z-40 -mx-3 sm:-mx-4 md:-mx-6 -mb-3 sm:-mb-4 md:-mb-6 mt-8">
            <div className="max-w-4xl w-full flex flex-col sm:flex-row gap-3 sm:gap-4 sm:space-x-0">
               <button
                 type="button"
                 onClick={() => setMode("wizard")}
                 className="w-full sm:flex-1 py-2 sm:py-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-xl font-bold transition-all text-sm"
               >
                 Switch to Wizard
               </button>
               <button
                 type="submit"
                 disabled={uploading}
                 onClick={(e) => onSubmit(e, "No")}
                 className="w-full sm:flex-1 py-2 sm:py-3 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-xl font-bold transition-all text-sm flex items-center justify-center"
               >
                 Save as Draft
               </button>
               <button
                 type="submit"
                 disabled={uploading}
                 onClick={(e) => onSubmit(e, "Yes")}
                 className="w-full sm:flex-1 py-2 sm:py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all shadow-md shadow-teal-100 flex items-center justify-center space-x-2 text-sm"
               >
                 {uploading ? <RefreshCw className="animate-spin" /> : <Zap size={18} fill="currentColor" />}
                 <span>{isEdit ? "Update & Publish" : "Publish Now"}</span>
               </button>
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto py-4 px-4 sm:px-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-neutral-900 leading-tight">
            {isEdit ? "Update Your Listing" : "Create New Product"}
          </h1>
          <p className="text-neutral-500 font-medium">Get your items ready for the hyperlocal market.</p>
        </div>
        
        <div className="flex items-center bg-neutral-100 p-1 rounded-2xl">
          <button
            onClick={() => setMode("wizard")}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === "wizard" ? "bg-white text-teal-700 shadow-md" : "text-neutral-500"}`}
          >
            <Zap size={16} />
            <span>Wizard Mode</span>
          </button>
          <button
            onClick={() => setMode("single")}
            className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${mode === "single" ? "bg-white text-teal-700 shadow-md" : "text-neutral-500"}`}
          >
            <TrendingUp size={16} />
            <span>Fast Entry</span>
          </button>
        </div>
      </div>

      {mode === "wizard" ? (
        <div className="bg-white rounded-3xl shadow-xl shadow-neutral-100 border border-neutral-100 overflow-hidden mb-24">
          <div className="hidden md:flex border-b border-neutral-100">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              return (
                <div 
                  key={step.id} 
                  className={`flex-1 flex items-center justify-center py-5 border-r border-neutral-50 last:border-r-0 relative transition-all ${isActive ? 'bg-teal-50/50' : ''}`}
                >
                   <div className={`flex items-center space-x-3 ${isActive ? "text-teal-700" : isCompleted ? "text-teal-500" : "text-neutral-400"}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive ? "bg-teal-600 text-white shadow-lg shadow-teal-100" : isCompleted ? "bg-teal-100 text-teal-600" : "bg-neutral-100"}`}>
                        {isCompleted ? <Check size={20} strokeWidth={3} /> : <Icon size={20} />}
                      </div>
                      <span className="text-sm font-bold hidden lg:inline">{step.name}</span>
                   </div>
                   {isActive && <div className="absolute bottom-0 left-0 right-0 h-1 bg-teal-600 rounded-t-full" />}
                </div>
              );
            })}
          </div>

          <div className="p-8 md:p-10">
            {renderStepContent(currentStep)}
          </div>

          <div className="p-4 sm:p-8 bg-neutral-50 flex justify-between items-center border-t border-neutral-100 gap-2 sm:gap-0">
             <div className="flex space-x-2">
               <button
                 type="button"
                 onClick={() => navigate('/seller/product/list')}
                 className="flex items-center space-x-1 sm:space-x-2 py-2 sm:py-3 px-3 sm:px-6 rounded-xl font-bold transition-all text-rose-500 hover:bg-rose-50"
                 title="Discard changes and go back"
               >
                 <X size={20} />
                 <span className="hidden min-[380px]:inline">Cancel</span>
               </button>
               <button
                 type="button"
                 onClick={prevStep}
                 disabled={currentStep === 1}
                 className={`flex items-center space-x-1 sm:space-x-2 py-2 sm:py-3 px-3 sm:px-6 rounded-xl font-bold transition-all ${currentStep === 1 ? 'text-neutral-300 pointer-events-none' : 'text-neutral-600 hover:bg-neutral-200'}`}
               >
                 <ChevronLeft size={20} />
                 <span className="hidden min-[380px]:inline">Back</span>
               </button>
             </div>
             
             <div className="flex space-x-2 sm:space-x-4 flex-shrink-0">
               {currentStep < totalSteps && (
                 <button
                   type="button"
                   onClick={nextStep}
                   title="Next Step"
                   className="flex items-center justify-center py-2 sm:py-3 px-4 sm:px-6 bg-neutral-800 hover:bg-neutral-900 text-white rounded-xl font-bold transition-all shadow-lg"
                 >
                   <ChevronRight size={20} />
                 </button>
               )}
               <button
                 type="submit"
                 disabled={uploading}
                 onClick={(e) => onSubmit(e, "No")}
                 className="flex items-center justify-center py-2 sm:py-3 px-3 sm:px-6 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-xl font-bold transition-all shadow-lg text-sm whitespace-nowrap"
               >
                 Draft
               </button>
               <button
                 type="submit"
                 disabled={uploading}
                 onClick={(e) => onSubmit(e, "Yes")}
                 className="flex items-center justify-center space-x-1 sm:space-x-2 py-2 sm:py-3 px-4 sm:px-8 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-teal-100 group text-sm whitespace-nowrap"
               >
                 {uploading ? <RefreshCw className="animate-spin w-4 h-4 sm:w-5 sm:h-5" /> : <Zap className="group-hover:scale-110 transition-transform w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" />}
                 <span className="hidden sm:inline">{isEdit ? "Update & Publish" : "Publish"}</span>
                 <span className="sm:hidden">{isEdit ? "Publish" : "Publish"}</span>
               </button>
             </div>
          </div>
        </div>
      ) : (
        renderSinglePageContent()
      )}
    </div>
  );
};

export default ProductWizard;
