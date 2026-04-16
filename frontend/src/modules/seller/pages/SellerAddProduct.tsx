import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { uploadImage, uploadImages } from "../../../services/api/uploadService";
import {
  validateImageFile,
  createImagePreview,
  compressImage,
} from "../../../utils/imageUpload";
import {
  createProduct,
  updateProduct,
  getProductById,
  ProductVariation,
} from "../../../services/api/productService";
import {
  getCategories,
  getSubcategories,
  getSubSubCategories,
  Category,
  SubCategory,
  SubSubCategory,
} from "../../../services/api/categoryService";
import { getActiveTaxes, Tax } from "../../../services/api/taxService";
import { getBrands, Brand } from "../../../services/api/brandService";
import {
  getHeaderCategoriesPublic,
  HeaderCategory,
} from "../../../services/api/headerCategoryService";
import { useToast } from "../../../context/ToastContext";
import ProductWizard from "../components/ProductWizard";

export default function SellerAddProduct() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { showToast } = useToast();
  
  const [formData, setFormData] = useState({
    productName: "",
    headerCategory: "",
    category: "",
    subcategory: "",
    subSubCategory: "",
    publish: "Yes",
    popular: "No",
    dealOfDay: "No",
    brand: "",
    tags: "",
    smallDescription: "",
    description: "",
    seoTitle: "",
    seoKeywords: "",
    seoImageAlt: "",
    seoDescription: "",
    variationType: "",
    manufacturer: "",
    madeIn: "",
    tax: "",
    isReturnable: "No",
    maxReturnDays: "",
    fssaiLicNo: "",
    totalAllowedQuantity: "10",
    mainImageUrl: "",
    galleryImageUrls: [] as string[],
    // New Fields
    costPrice: "",
    minOrderQuantity: "1",
    maxOrderLimit: "0",
    sku: "",
    drugLicNo: "",
    storageInstructions: "",
    cutType: "",
    freshnessLevel: "",
    prescriptionRequired: false,
    warranty: "",
    specs: "",
    sizeChartUrl: "",
    shelfLife: "",
    attributes: {} as any,
  });

  const [variations, setVariations] = useState<ProductVariation[]>([]);
  const [variationForm, setVariationForm] = useState({
    title: "",
    price: "",
    discPrice: "0",
    stock: "0",
    status: "Available" as "Available" | "Sold out",
  });

  const [mainImageFile, setMainImageFile] = useState<File | null>(null);
  const [mainImagePreview, setMainImagePreview] = useState<string>("");
  const [galleryImageFiles, setGalleryImageFiles] = useState<File[]>([]);
  const [galleryImagePreviews, setGalleryImagePreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
  const [subSubCategories, setSubSubCategories] = useState<SubSubCategory[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [headerCategories, setHeaderCategories] = useState<HeaderCategory[]>([]);
  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [catRes, taxRes, brandRes, headerRes] = await Promise.all([
          getCategories(),
          getActiveTaxes(),
          getBrands(),
          getHeaderCategoriesPublic(),
        ]);

        if (catRes.success) setCategories(catRes.data);
        if (taxRes.success) setTaxes(taxRes.data);
        if (brandRes.success) setBrands(brandRes.data);
        if (Array.isArray(headerRes)) {
            setHeaderCategories(headerRes.filter(hc => hc.status === "Published"));
        }
      } catch (err) {
        console.error("Error fetching form data:", err);
      }
    };
    fetchData();
  }, []);

  // Fetch product for edit
  useEffect(() => {
    if (id) {
      const fetchProduct = async () => {
        try {
          const response = await getProductById(id);
          if (response.success && response.data) {
            const product = response.data;
            setFormData({
              ...formData,
              productName: product.productName,
              headerCategory: (product.headerCategoryId as any)?._id || product.headerCategoryId || "",
              category: (product.category as any)?._id || product.categoryId || "",
              subcategory: (product.subcategory as any)?._id || product.subcategory || "",
              subSubCategory: (product.subSubCategory as any)?._id || (product as any).subSubCategory || "",
              publish: product.publish ? "Yes" : "No",
              popular: product.popular ? "Yes" : "No",
              dealOfDay: product.dealOfDay ? "Yes" : "No",
              brand: (product.brand as any)?._id || product.brandId || "",
              tags: product.tags?.join(", ") || "",
              smallDescription: product.smallDescription || "",
              description: product.description || "",
              seoTitle: product.seoTitle || "",
              seoKeywords: product.seoKeywords || "",
              seoImageAlt: product.seoImageAlt || "",
              seoDescription: product.seoDescription || "",
              variationType: product.variationType || "",
              manufacturer: product.manufacturer || "",
              madeIn: product.madeIn || "",
              tax: (product.tax as any)?._id || (product as any).taxId || "",
              isReturnable: product.isReturnable ? "Yes" : "No",
              maxReturnDays: product.maxReturnDays?.toString() || "",
              fssaiLicNo: product.fssaiLicNo || "",
              totalAllowedQuantity: product.totalAllowedQuantity?.toString() || "10",
              mainImageUrl: product.mainImageUrl || product.mainImage || "",
              galleryImageUrls: product.galleryImages || product.galleryImageUrls || [],
              // New fields
              costPrice: (product as any).costPrice?.toString() || "",
              minOrderQuantity: (product as any).minOrderQuantity?.toString() || "1",
              maxOrderLimit: (product as any).maxOrderLimit?.toString() || "0",
              sku: product.sku || "",
              drugLicNo: (product as any).drugLicNo || "",
              storageInstructions: (product as any).storageInstructions || "",
              cutType: (product as any).cutType || "",
              freshnessLevel: (product as any).freshnessLevel || "",
              prescriptionRequired: (product as any).prescriptionRequired || false,
              warranty: (product as any).warranty || "",
              specs: (product as any).specs || "",
              sizeChartUrl: (product as any).sizeChartUrl || "",
              shelfLife: (product as any).shelfLife || "",
              attributes: (product as any).attributes || {},
            });
            setVariations(product.variations || []);
            setMainImagePreview(product.mainImageUrl || product.mainImage || "");
            setGalleryImagePreviews(product.galleryImages || product.galleryImageUrls || []);
          }
        } catch (err) {
          showToast("Failed to fetch product details", "error");
        }
      };
      fetchProduct();
    }
  }, [id]);

  // Dependent dropdowns
  useEffect(() => {
    const fetchSubs = async () => {
      if (formData.category) {
        const res = await getSubcategories(formData.category);
        if (res.success) setSubcategories(res.data);
      } else {
        setSubcategories([]);
      }
    };
    fetchSubs();
  }, [formData.category]);

  useEffect(() => {
    const fetchSubSubs = async () => {
      if (formData.subcategory) {
        const res = await getSubSubCategories(formData.subcategory);
        if (res.success) setSubSubCategories(res.data);
      } else {
        setSubSubCategories([]);
      }
    };
    fetchSubSubs();
  }, [formData.subcategory]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMainImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      showToast(validation.error || "Invalid image", "error");
      return;
    }

    try {
      const compressed = await compressImage(file);
      setMainImageFile(compressed);
      const preview = await createImagePreview(compressed);
      setMainImagePreview(preview);
    } catch (error) {
      showToast("Failed to process main image", "error");
    }
  };

  const handleGalleryImagesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    try {
      const compressedFiles = await Promise.all(
        files.map(file => {
          if (validateImageFile(file).valid) return compressImage(file);
          return null;
        })
      );
      
      const validFiles = compressedFiles.filter(f => f !== null) as File[];
      setGalleryImageFiles(prev => [...prev, ...validFiles]);
      
      const previews = await Promise.all(validFiles.map(f => createImagePreview(f)));
      setGalleryImagePreviews(prev => [...prev, ...previews]);
    } catch (error) {
      showToast("Failed to process gallery images", "error");
    }
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImageFiles(prev => prev.filter((_, i) => i !== index));
    setGalleryImagePreviews(prev => prev.filter((_, i) => i !== index));
    setFormData(prev => ({
        ...prev,
        galleryImageUrls: prev.galleryImageUrls.filter((_, i) => i !== index)
    }));
  };

  const addVariation = () => {
    if (!variationForm.title || !variationForm.price) {
      showToast("Title and Price are required", "error");
      return;
    }
    const newVar: ProductVariation = {
      title: variationForm.title,
      price: parseFloat(variationForm.price),
      discPrice: parseFloat(variationForm.discPrice || "0"),
      stock: parseInt(variationForm.stock || "0"),
      status: variationForm.status,
    };
    setVariations([...variations, newVar]);
    setVariationForm({ title: "", price: "", discPrice: "0", stock: "0", status: "Available" });
  };

  const removeVariation = (index: number) => {
    setVariations(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.productName.trim()) {
      showToast("Product name is required", "error");
      return;
    }
    if (variations.length === 0) {
      showToast("Add at least one variation", "error");
      return;
    }

    setUploading(true);
    try {
      let mainImageUrl = formData.mainImageUrl;
      let galleryImageUrls = [...formData.galleryImageUrls];

      if (mainImageFile) {
        const res = await uploadImage(mainImageFile, "products");
        mainImageUrl = res.secureUrl;
      }

      if (galleryImageFiles.length > 0) {
        const res = await uploadImages(galleryImageFiles, "products/gallery");
        galleryImageUrls = [...galleryImageUrls, ...res.map(r => r.secureUrl)];
      }

      const productData = {
        productName: formData.productName,
        tags: formData.tags.split(",").map(t => t.trim()).filter(Boolean),
        publish: formData.publish === "Yes",
        popular: formData.popular === "Yes",
        dealOfDay: formData.dealOfDay === "Yes",
        price: variations[0].price,
        discPrice: variations[0].discPrice,
        stock: variations.reduce((acc, curr) => acc + (curr.stock || 0), 0),
        taxId: formData.tax || undefined,
        headerCategoryId: formData.headerCategory || undefined,
        categoryId: formData.category || undefined,
        subcategoryId: formData.subcategory || undefined,
        subSubCategory: formData.subSubCategory || undefined, // Note: Backend expects subSubCategory
        brandId: formData.brand || undefined,
        isReturnable: formData.isReturnable === "Yes",
        maxReturnDays: formData.maxReturnDays ? parseInt(formData.maxReturnDays) : undefined,
        totalAllowedQuantity: parseInt(formData.totalAllowedQuantity || "10"),
        mainImageUrl,
        galleryImageUrls,
        variations,
        // Description and extra fields
        smallDescription: formData.smallDescription || undefined,
        description: formData.description || undefined,
        manufacturer: formData.manufacturer || undefined,
        madeIn: formData.madeIn || undefined,
        fssaiLicNo: formData.fssaiLicNo || undefined,
        // Modern Dashboard fields
        costPrice: formData.costPrice ? parseFloat(formData.costPrice) : undefined,
        minOrderQuantity: parseInt(formData.minOrderQuantity || "1"),
        maxOrderLimit: parseInt(formData.maxOrderLimit || "0"),
        sku: formData.sku || undefined,
        drugLicNo: formData.drugLicNo || undefined,
        storageInstructions: formData.storageInstructions || undefined,
        cutType: formData.cutType || undefined,
        freshnessLevel: formData.freshnessLevel || undefined,
        prescriptionRequired: formData.prescriptionRequired,
        warranty: formData.warranty || undefined,
        specs: formData.specs || undefined,
        sizeChartUrl: formData.sizeChartUrl || undefined,
        shelfLife: formData.shelfLife || undefined,
        attributes: formData.attributes,
      };

      const res = id ? await updateProduct(id, productData) : await createProduct(productData);
      if (res.success) {
        showToast(id ? "Product updated!" : "Product published!", "success");
        navigate("/seller/product/list");
      } else {
        showToast(res.message, "error");
      }
    } catch (err: any) {
      showToast(err.message || "An error occurred", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50/50 pb-12">
      <ProductWizard
        formData={formData}
        setFormData={setFormData}
        handleChange={handleChange}
        onSubmit={handleSubmit}
        categories={categories}
        subcategories={subcategories}
        subSubCategories={subSubCategories}
        brands={brands}
        taxes={taxes}
        headerCategories={headerCategories}
        uploading={uploading}
        mainImagePreview={mainImagePreview}
        galleryImagePreviews={galleryImagePreviews}
        handleMainImageChange={handleMainImageChange}
        handleGalleryImagesChange={handleGalleryImagesChange}
        removeGalleryImage={removeGalleryImage}
        variations={variations}
        setVariations={setVariations}
        variationForm={variationForm}
        setVariationForm={setVariationForm}
        addVariation={addVariation}
        removeVariation={removeVariation}
        isEdit={!!id}
      />
    </div>
  );
}
