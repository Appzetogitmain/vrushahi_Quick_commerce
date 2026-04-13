import React from 'react';

interface CategoryFieldsProps {
  categoryName: string;
  formData: any;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onAttributesChange: (name: string, value: any) => void;
}

const CategoryFields: React.FC<CategoryFieldsProps> = ({ 
  categoryName, 
  formData, 
  onChange,
  onAttributesChange 
}) => {
  const normCategory = categoryName?.toLowerCase() || '';

  // Grocery, Fruits & Vegetables, Dairy
  const isGroceryRelated = normCategory.includes('grocery') || normCategory.includes('fruit') || normCategory.includes('dairy');
  
  // Meat
  const isMeat = normCategory.includes('meat');

  // Pharmacy
  const isPharmacy = normCategory.includes('pharmacy') || normCategory.includes('medicine');

  // Electronics
  const isElectronics = normCategory.includes('electronics') || normCategory.includes('gadget');

  // Fashion
  const isFashion = normCategory.includes('fashion') || normCategory.includes('clothing') || normCategory.includes('apparel');

  if (!categoryName) return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Grocery Related Fields */}
        {isGroceryRelated && (
          <>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Shelf Life (e.g. 7 days)</label>
              <input
                type="text"
                name="shelfLife"
                value={formData.shelfLife || ''}
                onChange={onChange}
                placeholder="Enter shelf life"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 transition-all outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Storage Instructions</label>
              <input
                type="text"
                name="storageInstructions"
                value={formData.storageInstructions || ''}
                onChange={onChange}
                placeholder="e.g. Keep refrigerated"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 transition-all outline-none"
              />
            </div>
          </>
        )}

        {/* Meat Specific Fields */}
        {isMeat && (
          <>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Cut Type</label>
              <select
                name="cutType"
                value={formData.cutType || ''}
                onChange={onChange}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white"
              >
                <option value="">Select Cut Type</option>
                <option value="Boneless">Boneless</option>
                <option value="With Bone">With Bone</option>
                <option value="Curry Cut">Curry Cut</option>
                <option value="Fillet">Fillet</option>
                <option value="Minced">Minced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Freshness Level</label>
              <input
                type="text"
                name="freshnessLevel"
                value={formData.freshnessLevel || ''}
                onChange={onChange}
                placeholder="e.g. Freshly slaughtered"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </>
        )}

        {/* Pharmacy Specific Fields */}
        {isPharmacy && (
          <>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Prescription Required?</label>
              <select
                name="prescriptionRequired"
                value={formData.prescriptionRequired ? "Yes" : "No"}
                onChange={(e) => onAttributesChange('prescriptionRequired', e.target.value === 'Yes')}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none bg-white"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Drug License Number</label>
              <input
                type="text"
                name="drugLicNo"
                value={formData.drugLicNo || ''}
                onChange={onChange}
                placeholder="Enter license number"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Composition / Salt Name</label>
              <textarea
                name="composition"
                value={formData.attributes?.composition || ''}
                onChange={(e) => onAttributesChange('composition', e.target.value)}
                placeholder="Enter salt composition"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none h-24"
              />
            </div>
          </>
        )}

        {/* Electronics Specific Fields */}
        {isElectronics && (
          <>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Warranty Policy</label>
              <input
                type="text"
                name="warranty"
                value={formData.warranty || ''}
                onChange={onChange}
                placeholder="e.g. 1 Year Manufacturer Warranty"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-neutral-700 mb-2">Technical Specifications</label>
              <textarea
                name="specs"
                value={formData.specs || ''}
                onChange={onChange}
                placeholder="Enter specs line by line..."
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none h-32"
              />
            </div>
          </>
        )}

        {/* Fashion Specific Fields */}
        {isFashion && (
          <>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Fabric / Material</label>
              <input
                type="text"
                name="fabric"
                value={formData.attributes?.fabric || ''}
                onChange={(e) => onAttributesChange('fabric', e.target.value)}
                placeholder="e.g. 100% Cotton"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">Size Chart URL (Optional)</label>
              <input
                type="text"
                name="sizeChartUrl"
                value={formData.sizeChartUrl || ''}
                onChange={onChange}
                placeholder="Paste link to size chart"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </>
        )}

        {/* General Fields for all or specific fallback */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-neutral-700 mb-2">Compliance / Additional Info</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Manufacturer Name</label>
              <input
                type="text"
                name="manufacturer"
                value={formData.manufacturer || ''}
                onChange={onChange}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-neutral-500 mb-1">Country of Origin</label>
              <input
                type="text"
                name="madeIn"
                value={formData.madeIn || ''}
                onChange={onChange}
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-teal-500 outline-none"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CategoryFields;
