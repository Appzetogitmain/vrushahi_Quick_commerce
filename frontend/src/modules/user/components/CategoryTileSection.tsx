import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";

interface CategoryTile {
  id: string;
  name: string;
  productImages?: (string | undefined)[];
  image?: string; // Support single image property
  productCount?: number;
  categoryId?: string;
  subcategoryId?: string;
  productId?: string;
  sellerId?: string;
  bgColor?: string;
  slug?: string;
  type?: "subcategory" | "product" | "category";
}

interface CategoryTileSectionProps {
  title: string;
  tiles: CategoryTile[];
  columns?: 2 | 3 | 4 | 6 | 8;
  showProductCount?: boolean;
  variant?: 'default' | 'featured';
  size?: 'small' | 'medium' | 'large';
}

export default function CategoryTileSection({
  title,
  tiles,
  columns = 4,
  showProductCount = false,
  variant = 'default',
  size = 'medium',
}: CategoryTileSectionProps) {
  const navigate = useNavigate();

  const handleTileClick = (tile: CategoryTile) => {
    const targetUrl = tile.subcategoryId || tile.type === "subcategory"
      ? tile.categoryId
        ? `/category/${tile.categoryId}?subcategory=${tile.subcategoryId || tile.id}`
        : tile.slug
          ? `/category/${tile.slug}`
          : `/category/subcategory/${tile.subcategoryId || tile.id}`
      : tile.productId
        ? `/product/${tile.productId}`
        : tile.type === "category"
          ? tile.slug
            ? `/category/${tile.slug}`
            : tile.categoryId
              ? `/category/${tile.categoryId}`
              : "#"
          : tile.categoryId
            ? `/category/${tile.categoryId}`
            : (tile as any).sellerId
              ? `/seller/${(tile as any).sellerId}`
              : "#";
    
    if (targetUrl !== "#") {
      navigate(targetUrl);
    }
  };

  const getGridCols = () => {
    switch (columns) {
      case 2: return "grid-cols-2";
      case 3: return "grid-cols-3";
      case 4: return "grid-cols-4";
      case 6: return "grid-cols-6";
      case 8: return "grid-cols-8";
      default: return "grid-cols-4";
    }
  };

  const gridCols = getGridCols();
  const gapClass = columns >= 6 ? "gap-1.5 md:gap-2.5" : "gap-2.5 md:gap-4";

  if (variant === 'featured') {
    const isSmall = size === 'small';
    return (
      <div className={`mb-6 md:mb-8 mt-4 relative ${isSmall ? 'pt-6 pb-2' : 'pt-10 pb-6'} rounded-[3rem]`} style={{ background: '#FFFFFF' }}>
        <h2 className={`${isSmall ? 'text-lg md:text-xl font-bold mb-4' : 'text-xl md:text-2xl font-black mb-6'} text-neutral-900 px-4 md:px-6 lg:px-8 tracking-tight`}>
          {title}
        </h2>
        <div className={`flex ${isSmall ? 'gap-3' : 'gap-5'} overflow-x-auto scrollbar-hide px-4 md:px-6 lg:px-8 pb-4`}>
          {tiles.map((tile) => {
            const image = tile.image || (tile.productImages?.[0]);
            
            return (
              <motion.div
                key={tile.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTileClick(tile)}
                className={`flex-shrink-0 ${isSmall ? 'w-36' : 'w-52'} flex flex-col items-center group cursor-pointer`}
              >
                {/* Category Image Card */}
                <div className={`w-full ${isSmall ? 'h-36 rounded-[2rem]' : 'h-44 rounded-[2.5rem]'} bg-white flex items-center justify-center overflow-hidden mb-3 shadow-md border border-white group-hover:shadow-lg transition-all`}>
                  {image ? (
                    <img
                      src={image}
                      alt={tile.name}
                      className={`w-full h-full ${isSmall ? 'object-cover' : 'object-cover'} transition-transform duration-500 group-hover:scale-105`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="text-xl text-neutral-300 font-bold">{tile.name.charAt(0)}</div>
                  )}
                </div>

                {/* Info Area */}
                <div className="flex flex-col items-center text-center px-1">
                  <span className={`font-semibold text-neutral-900 line-clamp-1 leading-tight ${isSmall ? 'text-xs mb-1' : 'text-sm mb-1'}`}>
                    {tile.name}
                  </span>
                  {!isSmall && (
                    <span className="text-sm font-black text-black">
                      View Store
                    </span>
                  )}
                  {isSmall && (
                    <span className="text-[10px] font-black text-black">
                      View Store
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 md:mb-8 mt-0 overflow-visible">
      <h2 className="text-lg md:text-2xl font-semibold text-neutral-900 mb-3 md:mb-6 px-4 md:px-6 lg:px-8 tracking-tight">
        {title}
      </h2>
      <div className="px-4 md:px-6 lg:px-8 overflow-visible">
        <div className={`grid ${gridCols} ${gapClass} overflow-visible auto-rows-fr`}>
          {tiles.map((tile) => {
            const images =
              tile.productImages || (tile.image ? [tile.image] : []);
            const hasImages = images.filter(Boolean).length > 0;

            return (
              <motion.div
                key={tile.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex flex-col">
                <Link
                  to={
                    tile.subcategoryId || tile.type === "subcategory"
                      ? tile.categoryId
                        ? `/category/${tile.categoryId}?subcategory=${tile.subcategoryId || tile.id
                        }`
                        : tile.slug
                          ? `/category/${tile.slug}`
                          : `/category/subcategory/${tile.subcategoryId || tile.id
                          }`
                      : tile.productId
                        ? `/product/${tile.productId}`
                        : tile.type === "category"
                          ? tile.slug
                            ? `/category/${tile.slug}`
                            : tile.categoryId
                              ? `/category/${tile.categoryId}`
                              : "#"
                          : tile.categoryId
                            ? `/category/${tile.categoryId}`
                            : (tile as any).sellerId
                              ? `/seller/${(tile as any).sellerId}`
                              : "#"
                  }
                  onClick={(e) => {
                    if (
                      !tile.categoryId &&
                      !tile.productId &&
                      !tile.subcategoryId &&
                      !(tile as any).sellerId
                    ) {
                      e.preventDefault();
                      handleTileClick(tile);
                    }
                  }}
                  className={`block bg-white rounded-xl shadow-sm border border-neutral-200 hover:shadow-md transition-shadow h-full ${showProductCount ? "px-2.5" : "px-1.5"
                    }`}>
                  {/* Image - Single image for non-bestsellers, 2x2 grid for bestsellers */}
                  <div
                    className={`w-full rounded-lg overflow-hidden ${showProductCount ? "h-32 md:h-36 mb-2" : "aspect-square"
                      } ${tile.bgColor || "bg-cyan-50"}`}>
                    {hasImages ? (
                      showProductCount ? (
                        // Bestsellers: 2x2 grid
                        <div className="w-full h-full grid grid-cols-2 gap-0.5 p-0.5">
                          {images.slice(0, 4).map((img, idx) =>
                            img ? (
                              <img
                                key={idx}
                                src={img}
                                alt=""
                                className="w-full h-full object-contain bg-white rounded-sm"
                                onError={(e) => {
                                  // Hide broken image
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div
                                key={idx}
                                className="w-full h-full bg-neutral-200 rounded-sm flex items-center justify-center text-xs text-neutral-400">
                                {idx + 1}
                              </div>
                            )
                          )}
                        </div>
                      ) : (
                        // Other sections: Single image - use contain to show full image without cropping
                        <img
                          src={images[0]}
                          alt={tile.name}
                          className="w-full h-full object-contain rounded-lg"
                          onError={(e) => {
                            // Hide broken image and show fallback
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-3xl text-neutral-300">${tile.name.charAt(0)}</div>`;
                            }
                          }}
                        />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl text-neutral-300">
                        {tile.name.charAt(0)}
                      </div>
                    )}
                  </div>

                  {/* Product count - shown first (only for bestsellers) */}
                  {showProductCount && tile.productCount && (
                    <div className="mb-1.5 flex justify-center">
                      <span className="inline-block bg-neutral-100 text-neutral-600 text-[10px] font-medium px-2 py-0.5 rounded-full leading-tight">
                        +{tile.productCount} more
                      </span>
                    </div>
                  )}

                  {/* Tile name - inside card only for bestsellers */}
                  {showProductCount && (
                    <div className="text-[11px] font-semibold text-neutral-900 line-clamp-2 leading-tight text-center w-full block">
                      {tile.name}
                    </div>
                  )}
                </Link>

                {/* Category name - outside card for non-bestsellers */}
                {!showProductCount && (
                  <div className="mt-1.5 text-center">
                    <span className="text-xs font-semibold text-neutral-900 line-clamp-2 leading-tight">
                      {tile.name}
                    </span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
