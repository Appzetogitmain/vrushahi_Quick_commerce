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
  Plus
} from "lucide-react";
import CategoryFields from "./CategoryFields";

interface ProductWizardProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
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
  isEdit
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [mode, setMode] = useState<"wizard" | "single">("wizard");
  const totalSteps = 5;

  const steps = [
    { id: 1, name: "Identity", icon: Package },
    { id: 2, name: "Pricing", icon: DollarSign },
    { id: 3, name: "Media & Variants", icon: Layers },
    { id: 4, name: "Specifics", icon: Settings },
    { id: 5, name: "Discovery", icon: TrendingUp },
  ];

  const nextStep = () => {
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

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Category <span className="text-rose-500">*</span></label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  disabled={!formData.headerCategory}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white disabled:bg-neutral-50"
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
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white disabled:bg-neutral-50"
                >
                  <option value="">Select Sub-Category</option>
                  {subcategories.map((sub) => (
                    <option key={sub._id} value={sub._id}>{sub.subcategoryName}</option>
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

              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-2">Publish Status</label>
                <div className="flex bg-neutral-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormData((p: any) => ({ ...p, publish: "Yes" }))}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${formData.publish === "Yes" ? "bg-white text-teal-700 shadow-sm" : "text-neutral-500"}`}
                  >
                    Publish
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData((p: any) => ({ ...p, publish: "No" }))}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${formData.publish === "No" ? "bg-white text-rose-700 shadow-sm" : "text-neutral-500"}`}
                  >
                    Draft
                  </button>
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
                      ₹{Math.max(0, (formData.price || 0) - (formData.costPrice || 0))}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-teal-600 bg-white px-3 py-1 rounded-lg">
                    {formData.compareAtPrice > formData.price ? `${Math.round(((formData.compareAtPrice - formData.price)/formData.compareAtPrice)*100)}% DISCOUNT` : "NO DISCOUNT"}
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
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wider">Color</label>
                    <input
                      type="text"
                      value={variationForm.color || ''}
                      onChange={(e) => setVariationForm({...variationForm, color: e.target.value})}
                      placeholder="e.g. Lavender"
                      className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wider">Size</label>
                    <input
                      type="text"
                      value={variationForm.size || ''}
                      onChange={(e) => setVariationForm({...variationForm, size: e.target.value})}
                      placeholder="e.g. M, XL"
                      className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wider">Variation Title (Internal)</label>
                    <input
                      type="text"
                      value={variationForm.title}
                      onChange={(e) => setVariationForm({...variationForm, title: e.target.value})}
                      placeholder="e.g. 1kg / Small / Red"
                      className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wider">Price (₹)</label>
                    <input
                      type="number"
                      value={variationForm.price}
                      onChange={(e) => setVariationForm({...variationForm, price: e.target.value})}
                      className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wider">Disc Price (₹)</label>
                    <input
                      type="number"
                      value={variationForm.discPrice}
                      onChange={(e) => setVariationForm({...variationForm, discPrice: e.target.value})}
                      className="w-full px-4 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-500 mb-1 uppercase tracking-wider">Stock</label>
                    <input
                      type="number"
                      value={variationForm.stock}
                      onChange={(e) => setVariationForm({...variationForm, stock: e.target.value})}
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
                          <th className="px-4 py-3 text-xs font-bold text-neutral-500 uppercase">Color</th>
                          <th className="px-4 py-3 text-xs font-bold text-neutral-500 uppercase">Size</th>
                          <th className="px-4 py-3 text-xs font-bold text-neutral-500 uppercase">Price</th>
                          <th className="px-4 py-3 text-xs font-bold text-neutral-500 uppercase">Stock</th>
                          <th className="px-4 py-3 text-xs font-bold text-neutral-500 uppercase text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {variations.map((v, i) => (
                          <tr key={i} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50 transition-colors">
                             <td className="px-4 py-3 font-semibold text-neutral-800">
                                {v.color || "—"}
                             </td>
                             <td className="px-4 py-3 font-semibold text-neutral-800">
                                {v.size || "—"}
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
                <CategoryFields
                  categoryName={currentCategoryName}
                  formData={formData}
                  onChange={handleChange}
                  onAttributesChange={onAttributesChange}
                />
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

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 p-4 shadow-2xl flex justify-center z-50">
            <div className="max-w-4xl w-full flex space-x-4">
               <button
                 type="button"
                 onClick={() => setMode("wizard")}
                 className="flex-1 py-4 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-2xl font-bold transition-all"
               >
                 Switch to Wizard
               </button>
               <button
                 type="submit"
                 disabled={uploading}
                 onClick={onSubmit}
                 className="flex-[2] py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl font-bold transition-all shadow-xl shadow-teal-100 flex items-center justify-center space-x-2"
               >
                 {uploading ? <RefreshCw className="animate-spin" /> : <Zap size={20} fill="currentColor" />}
                 <span>{isEdit ? "Update Product" : "Publish Product Now"}</span>
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

          <div className="p-8 bg-neutral-50 flex justify-between border-t border-neutral-100">
             <button
               type="button"
               onClick={prevStep}
               disabled={currentStep === 1}
               className={`flex items-center space-x-2 py-3 px-6 rounded-xl font-bold transition-all ${currentStep === 1 ? 'text-neutral-300 pointer-events-none' : 'text-neutral-600 hover:bg-neutral-200'}`}
             >
               <ChevronLeft size={20} />
               <span>Back</span>
             </button>
             
             {currentStep < totalSteps ? (
               <button
                 type="button"
                 onClick={nextStep}
                 className="flex items-center space-x-2 py-3 px-10 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-teal-100"
               >
                 <span>Save & Continue</span>
                 <ChevronRight size={20} />
               </button>
             ) : (
               <button
                 type="submit"
                 disabled={uploading}
                 onClick={onSubmit}
                 className="flex items-center space-x-2 py-3 px-12 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-teal-100 group"
               >
                 {uploading ? <RefreshCw className="animate-spin" /> : <Zap size={20} className="group-hover:scale-110 transition-transform" fill="currentColor" />}
                 <span>{isEdit ? "Update Listing" : "Publish Product"}</span>
               </button>
             )}
          </div>
        </div>
      ) : (
        renderSinglePageContent()
      )}
    </div>
  );
};

export default ProductWizard;
