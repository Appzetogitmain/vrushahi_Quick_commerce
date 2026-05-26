import { useState, useEffect, useMemo } from "react";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryStatus,
  bulkDeleteCategories,
  type Category,
  type CreateCategoryData,
  type UpdateCategoryData,
} from "../../../services/api/admin/adminProductService";
import { useAuth } from "../../../context/AuthContext";
import CategoryFormModal from "../components/CategoryFormModal";
import CategoryTreeView from "../components/CategoryTreeView";
import CategoryListView from "../components/CategoryListView";
import {
  buildCategoryTree,
  searchCategories,
  filterCategoriesByStatus,
} from "../../../utils/categoryUtils";

// Flatten tree structure for filtering (works for both tree and list view)
const flattenTree = (cats: Category[]): Category[] => {
  const result: Category[] = [];
  cats.forEach((cat) => {
    // Create a copy without children to avoid circular references, but preserve all other properties
    const { children, ...catWithoutChildren } = cat;

    // Normalize parentId - convert object to string if needed
    let normalizedParentId: string | null = null;
    if (catWithoutChildren.parentId) {
      if (typeof catWithoutChildren.parentId === "string") {
        normalizedParentId = catWithoutChildren.parentId;
      } else if (
        typeof catWithoutChildren.parentId === "object" &&
        catWithoutChildren.parentId !== null
      ) {
        // It's populated, extract the _id
        normalizedParentId =
          (catWithoutChildren.parentId as { _id?: string })._id || null;
      }
    }

    // Preserve childrenCount and other metadata
    result.push({
      ...catWithoutChildren,
      parentId: normalizedParentId,
      // Explicitly preserve childrenCount if it exists
      childrenCount:
        cat.childrenCount ||
        (children && children.length > 0 ? children.length : 0),
    } as Category);
    if (children && children.length > 0) {
      result.push(...flattenTree(children));
    }
  });
  return result;
};

export default function AdminCategory() {
  const { isAuthenticated, token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [viewMode, setViewMode] = useState<"tree" | "list">("tree");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "All" | "Active" | "Inactive"
  >("All");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isModalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<
    "create" | "edit" | "create-subcategory"
  >("create");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [parentCategory, setParentCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Fetch categories
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }

    fetchCategories();
  }, [isAuthenticated, token]);

  const fetchCategories = async (preserveExpandedIds?: Set<string>) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getCategories({
        includeChildren: true,
      });
      if (response.success) {
        setCategories(response.data);
        // Preserve existing expanded IDs if provided, otherwise auto-expand all
        if (preserveExpandedIds && preserveExpandedIds.size > 0) {
          setExpandedIds(preserveExpandedIds);
        } else {
          // Auto-expand all categories by default
          const allIds = new Set<string>();
          const collectIds = (cats: Category[]) => {
            cats.forEach((cat) => {
              allIds.add(cat._id);
              if (cat.children && cat.children.length > 0) {
                collectIds(cat.children);
              }
            });
          };
          collectIds(response.data);
          setExpandedIds(allIds);
        }
      }
    } catch (err: unknown) {
      console.error("Error fetching categories:", err);
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : "Failed to load categories. Please try again.";
      setError(errorMessage || "Failed to load categories. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filter and search categories
  const filteredCategories = useMemo(() => {
    // Always flatten first to get a flat array for filtering
    const flatCategories = flattenTree(categories);
    let filtered = [...flatCategories];

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = searchCategories(filtered, searchQuery);
      // If searching, also include children of matching parents (even if children don't match)
      const matchingParentIds = new Set(filtered.map((cat) => cat._id));
      const childrenOfMatches = flatCategories.filter(
        (cat) => cat.parentId && matchingParentIds.has(cat.parentId)
      );
      // Merge and deduplicate
      const allFiltered = [...filtered, ...childrenOfMatches];
      const uniqueFiltered = Array.from(
        new Map(allFiltered.map((cat) => [cat._id, cat])).values()
      );
      filtered = uniqueFiltered;
    }

    // Apply status filter
    filtered = filterCategoriesByStatus(filtered, statusFilter);

    return filtered;
  }, [categories, searchQuery, statusFilter]);

  // Build tree for tree view
  const categoryTree = useMemo(() => {
    if (viewMode === "tree") {
      return buildCategoryTree(filteredCategories);
    }
    return [];
  }, [filteredCategories, viewMode]);

  // Handle create category
  const handleCreateCategory = () => {
    setModalMode("create");
    setEditingCategory(null);
    setParentCategory(null);
    setModalOpen(true);
  };

  // Handle create subcategory
  const handleCreateSubcategory = (parent: Category) => {
    setModalMode("create-subcategory");
    setEditingCategory(null);
    setParentCategory(parent);
    setModalOpen(true);
  };

  // Handle edit category
  const handleEdit = (category: Category) => {
    setModalMode("edit");
    setEditingCategory(category);
    setParentCategory(null);
    setModalOpen(true);
  };

  // Handle delete category
  const handleDelete = async (category: Category) => {
    if (
      !window.confirm(
        `Are you sure you want to delete "${category.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await deleteCategory(category._id);
      if (response.success) {
        alert("Category deleted successfully!");
        fetchCategories();
      }
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : "Failed to delete category. Please try again.";
      alert(errorMessage || "Failed to delete category. Please try again.");
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      alert("Please select at least one category to delete.");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedIds.size} selected category(ies)? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const response = await bulkDeleteCategories(Array.from(selectedIds));
      if (response.success) {
        const deletedCount = response.data.deleted.length;
        const failedCount = response.data.failed.length;
        if (failedCount > 0) {
          alert(
            `Deleted ${deletedCount} category(ies). ${failedCount} failed. Check console for details.`
          );
          console.log("Failed deletions:", response.data.failed);
        } else {
          alert(`Successfully deleted ${deletedCount} category(ies).`);
        }
        setSelectedIds(new Set());
        fetchCategories();
      }
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : "Failed to delete categories. Please try again.";
      alert(errorMessage || "Failed to delete categories. Please try again.");
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (category: Category) => {
    const newStatus = category.status === "Active" ? "Inactive" : "Active";
    const cascade =
      category.childrenCount && category.childrenCount > 0
        ? window.confirm(
            `This category has subcategories. Do you want to ${
              newStatus === "Inactive" ? "deactivate" : "activate"
            } all subcategories as well?`
          )
        : false;

    try {
      const response = await toggleCategoryStatus(
        category._id,
        newStatus,
        cascade
      );
      if (response.success) {
        alert(`Category status updated to ${newStatus}`);
        fetchCategories();
      }
    } catch (error: unknown) {
      const errorMessage =
        error && typeof error === "object" && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : "Failed to update category status. Please try again.";
      alert(
        errorMessage || "Failed to update category status. Please try again."
      );
    }
  };

  // Handle form submit
  const handleFormSubmit = async (
    data: CreateCategoryData | UpdateCategoryData
  ) => {
    if (modalMode === "edit" && editingCategory) {
      const response = await updateCategory(editingCategory._id, data);
      if (response.success) {
        alert("Category updated successfully!");
        fetchCategories();
      }
    } else {
      const response = await createCategory(data as CreateCategoryData);
      if (response.success) {
        alert("Category created successfully!");

        // If creating a subcategory, expand the parent category after refresh
        if (modalMode === "create-subcategory" && parentCategory) {
          // Preserve current expanded IDs and add parent ID
          const newExpandedIds = new Set(expandedIds);
          newExpandedIds.add(parentCategory._id);
          fetchCategories(newExpandedIds);
        } else {
          fetchCategories();
        }
      }
    }
  };

  // Handle export
  const handleExport = () => {
    const headers = [
      "ID",
      "Name",
      "Parent",
      "Status",
      "Order",
      "Image",
      "Created At",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredCategories.map((category) =>
        [
          category._id,
          `"${category.name}"`,
          category.parent
            ? typeof category.parent === "string"
              ? category.parent
              : category.parent.name
            : category.parentId || "Root",
          category.status,
          category.order || 0,
          category.image || "",
          category.createdAt || "",
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `categories_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle select/deselect
  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredCategories.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCategories.map((cat) => cat._id)));
    }
  };

  // Handle expand/collapse
  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleExpandAll = () => {
    const allIds = new Set<string>();
    const collectIds = (cats: Category[]) => {
      cats.forEach((cat) => {
        allIds.add(cat._id);
        if (cat.children && cat.children.length > 0) {
          collectIds(cat.children);
        }
      });
    };
    collectIds(categoryTree);
    setExpandedIds(allIds);
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  return (
    <div className="space-y-4 sm:space-y-6 -mx-3 sm:-mx-4 md:-mx-6 -mt-3 sm:-mt-4 md:-mt-6">
      {/* Header Section */}
      <div className="bg-white border-b border-neutral-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">
            Manage Categories
          </h1>
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="text-neutral-500">Dashboard</span>
            <span className="text-neutral-400">/</span>
            <span className="text-neutral-700">Categories</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 sm:px-4 md:px-6">
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
          {/* Green Banner */}
          <div className="bg-green-600 text-white px-4 sm:px-6 py-2 sm:py-3">
            <h2 className="text-base sm:text-lg font-semibold">
              Category Management
            </h2>
          </div>

          {/* Filter and Action Bar */}
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-neutral-200 bg-neutral-50">
            <div className="flex flex-col lg:flex-row flex-wrap items-start lg:items-center gap-3 sm:gap-4">
              {/* Add Category Button */}
              <button
                onClick={handleCreateCategory}
                className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors w-full sm:w-auto">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Category
              </button>

              {/* View Mode Toggle */}
              <div className="flex items-center gap-2 bg-white border border-neutral-300 rounded p-1">
                <button
                  onClick={() => setViewMode("tree")}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    viewMode === "tree"
                      ? "bg-teal-600 text-white"
                      : "text-neutral-700 hover:bg-neutral-100"
                  }`}>
                  Tree View
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                    viewMode === "list"
                      ? "bg-teal-600 text-white"
                      : "text-neutral-700 hover:bg-neutral-100"
                  }`}>
                  List View
                </button>
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-neutral-700">
                  Status:
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value as "All" | "Active" | "Inactive"
                    )
                  }
                  className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500">
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value.trimStart());
                    setListPage(1);
                  }}
                  placeholder="Search by name..."
                  className="w-full pl-10 pr-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Export Button */}
              <div className="relative">
                <button
                      onClick={() => setIsExportOpen(!isExportOpen)}
                      className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded text-xs sm:text-sm font-medium transition-colors w-full sm:w-auto">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0"><path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15M7 10L12 15M12 15L17 10M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Export
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </button>
                    {isExportOpen && (
                      <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-md shadow-2xl z-50 border border-neutral-200 overflow-hidden">
                          <button
                            onClick={() => { setIsExportOpen(false); handleExport(); }}
                            className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-green-50 hover:text-green-700"
                          >
                            CSV
                          </button>
                          <button
                            onClick={() => { setIsExportOpen(false); handleExport(); }}
                            className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-green-50 hover:text-green-700 border-t border-neutral-100"
                          >
                            Excel
                          </button>
                          <button
                            onClick={() => { setIsExportOpen(false); window.print(); }}
                            className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-green-50 hover:text-green-700 border-t border-neutral-100"
                          >
                            PDF / Print
                          </button>
                        </div>
                    )}
              </div>

              {/* Bulk Delete Button (List View) */}
              {viewMode === "list" && selectedIds.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                  Delete Selected ({selectedIds.size})
                </button>
              )}
            </div>

            {/* Tree View Controls */}
            {viewMode === "tree" && (
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={handleExpandAll}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors">
                  Expand All
                </button>
                <button
                  onClick={handleCollapseAll}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-300 rounded hover:bg-neutral-50 transition-colors">
                  Collapse All
                </button>
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="p-4 sm:p-6">
            {loading ? (
              <div className="text-center py-8 text-neutral-500">
                Loading categories...
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">{error}</div>
            ) : viewMode === "tree" ? (
              <CategoryTreeView
                categories={categoryTree}
                onAddSubcategory={handleCreateSubcategory}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleStatus={handleToggleStatus}
                expandedIds={expandedIds}
                onToggleExpand={handleToggleExpand}
              />
            ) : (
              <CategoryListView
                categories={filteredCategories}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
                onEdit={handleEdit}
                onDelete={handleDelete}
                currentPage={listPage}
                itemsPerPage={itemsPerPage}
                onPageChange={setListPage}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-4 text-xs sm:text-sm text-neutral-600">
        Copyright © 2026. Developed By{" "}
        <a href="#" className="text-blue-600 hover:text-blue-700">
          vrushahi e-Commerce
        </a>
      </div>

      {/* Category Form Modal */}
      {isModalOpen && (
        <CategoryFormModal
          isOpen={isModalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingCategory(null);
            setParentCategory(null);
          }}
          onSubmit={handleFormSubmit}
          category={editingCategory || undefined}
          parentCategory={parentCategory || undefined}
          mode={modalMode}
          allCategories={categories}
        />
      )}
    </div>
  );
}
