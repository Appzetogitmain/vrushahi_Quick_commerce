import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCustomerCategories, Category } from "../../services/api/categoryService";
import Button from "../../components/ui/button";
import categoryHeroImgV3 from "../../assets/category_hero_v3.png";
import { motion } from "framer-motion";

const ArrowLeftIcon = ({ className }: { className?: string }) => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);


export default function Categories() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getCustomerCategories();
        if (response.success && response.data) {
          setCategories(response.data);
        } else {
          setError("Failed to load categories. Please try again.");
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        setError("Network error. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading && !categories.length) {
    return null; // Let global IconLoader handle it
  }

  if (error && !categories.length) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 text-center bg-white border-t border-black/5">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Oops! Something went wrong</h3>
        <p className="text-gray-600 mb-6 max-w-xs">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 bg-purple-600 text-white rounded-full font-medium hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200"
        >
          Try Refreshing
        </button>
      </div>
    );
  }


  return (
    <div className="pb-20 bg-white min-h-screen font-sans transition-all duration-500 overflow-x-hidden">
      {/* Hero Header Section - Ultra Compact & Efficient */}
      <div className="relative bg-white shadow-sm border-b border-gray-100 min-h-[90px] flex items-center">
        {/* Background layer with curve */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[55%] h-full bg-[#f3e8ff] rounded-l-[5rem]" />
          <div className="absolute top-[-50%] left-[-10%] w-32 h-32 bg-purple-50/50 rounded-full blur-2xl" />
        </div>

        {/* Content Row */}
        <div className="relative z-10 w-full flex items-center px-2 py-2">
          {/* Back Button */}
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="text-gray-900 hover:bg-black/5 rounded-full"
            >
              <ArrowLeftIcon className="w-6 h-6" />
            </Button>
          </motion.div>

          {/* Text Branding */}
          <div className="flex flex-col ml-1 flex-1">
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              General Store
            </h1>
            <p className="text-gray-500 font-semibold text-[11px]">
              Select product to add
            </p>
          </div>

          {/* Hero Illustration - Smaller and Centered to avoid cutting */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-24 h-24 flex items-center justify-center mr-2 drop-shadow-xl"
          >
            <img 
              src={categoryHeroImgV3} 
              alt="Groceries" 
              className="max-w-full max-h-full object-contain"
            />
          </motion.div>
        </div>
      </div>

      {/* Categories Grid - 4 Columns */}
      <div className="mt-8 px-4">
        {categories && categories.length > 0 ? (
          <div className="grid grid-cols-4 gap-y-8 gap-x-3">
            {categories.map((category) => (
              <motion.div
                key={category._id}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate(`/category/${category.slug || category._id}`)}
                className="flex flex-col items-center gap-2 cursor-pointer group"
              >
                {/* Squared light pink background for image */}
                <div className="w-full aspect-square bg-[#fff1f2] rounded-2xl flex items-center justify-center p-2.5 shadow-none transition-all duration-300">
                  <img
                    src={category.image || category.icon}
                    alt={category.name}
                    className="w-full h-full object-contain drop-shadow-xs transition-transform duration-500"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png';
                    }}
                  />
                </div>

                {/* Category Name - Clean Centered Text */}
                <span className="text-[10px] md:text-xs font-semibold text-gray-800 text-center leading-tight tracking-tight px-0.5 line-clamp-2">
                  {category.name}
                </span>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-neutral-400">
            <svg className="w-10 h-10 mx-auto mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <p className="text-base font-medium">No categories found</p>
          </div>
        )}
      </div>
    </div>
  );
}

