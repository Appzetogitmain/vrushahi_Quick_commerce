import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllSubcategories, SubCategory } from '../../../services/api/categoryService';

export default function SellerSubCategory() {
    const navigate = useNavigate();
    const [subcategories, setSubcategories] = useState<SubCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string>('');
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [isApiPaginated, setIsApiPaginated] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

    // Fetch subcategories from API
    useEffect(() => {
        const fetchSubcategories = async () => {
            setLoading(true);
            setError('');
            try {
                const params: any = {
                    page: currentPage,
                    limit: rowsPerPage,
                    sortBy: sortColumn || 'subcategoryName',
                    sortOrder: sortDirection,
                };
                if (searchTerm) params.search = searchTerm;

                const response = await getAllSubcategories(params);
                if (response.success && response.data) {
                    setSubcategories(response.data);
                    // Extract pagination info if available
                    if ((response as any).pagination) {
                        setTotalPages((response as any).pagination.pages);
                        setTotalItems((response as any).pagination.total);
                        setIsApiPaginated(true);
                    } else {
                        setIsApiPaginated(false);
                        setTotalItems(response.data.length);
                    }
                } else {
                    setError(response.message || 'Failed to fetch subcategories');
                }
            } catch (err: any) {
                setError(err.response?.data?.message || err.message || 'Failed to fetch subcategories');
            } finally {
                setLoading(false);
            }
        };

        fetchSubcategories();
    }, [currentPage, rowsPerPage, sortColumn, sortDirection, searchTerm]);

    // Client-side sorting (if API doesn't handle it)
    let sortedSubcategories = [...subcategories];
    if (sortColumn && !sortColumn.includes('.')) {
        sortedSubcategories.sort((a, b) => {
            let aVal: any = a[sortColumn as keyof typeof a];
            let bVal: any = b[sortColumn as keyof typeof b];
            if (typeof aVal === 'string') {
                aVal = aVal.toLowerCase();
                bVal = bVal.toLowerCase();
            }
            if (sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
    }

    // Pagination (client-side if API doesn't handle it)
    const displayTotalPages = isApiPaginated ? totalPages : Math.ceil(sortedSubcategories.length / rowsPerPage);
    const startIndex = isApiPaginated ? 0 : (currentPage - 1) * rowsPerPage;
    const endIndex = isApiPaginated ? sortedSubcategories.length : startIndex + rowsPerPage;
    const displayedSubcategories = isApiPaginated ? sortedSubcategories : sortedSubcategories.slice(startIndex, endIndex);

    const displayTotalItems = isApiPaginated ? totalItems : sortedSubcategories.length;
    const displayStartIndex = (currentPage - 1) * rowsPerPage;
    const displayEndIndex = Math.min(displayStartIndex + rowsPerPage, displayTotalItems);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    const handleExport = () => {
        const headers = ['ID', 'Category Name', 'Subcategory Name', 'Total Product'];
        const csvContent = [
            headers.join(','),
            ...displayedSubcategories.map(sub => [
                sub._id || sub.id,
                `"${sub.categoryName}"`,
                `"${sub.subcategoryName}"`,
                sub.totalProduct || 0
            ].join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `subcategories_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsExportDropdownOpen(false);
    };

    const SortIcon = ({ column }: { column: string }) => (
        <span className="text-neutral-300 text-[10px]">
            {sortColumn === column ? (sortDirection === 'asc' ? '↑' : '↓') : '⇅'}
        </span>
    );

    return (
        <div className="flex flex-col h-full">
            {/* Page Header */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-full transition-colors"
                        title="Go Back"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 className="text-2xl font-semibold text-neutral-800">View SubCategory</h1>
                </div>
                <div className="text-sm text-blue-500">
                    <Link to="/seller" className="cursor-pointer hover:underline">Home</Link> <span className="text-neutral-400">/</span> <Link to="/seller" className="text-neutral-600 hover:underline cursor-pointer">Dashboard</Link>
                </div>
            </div>

            {/* Content Card */}
            <div className="bg-white rounded-lg shadow-sm border border-neutral-200 flex-1 flex flex-col">
                <div className="p-4 border-b border-neutral-100 font-medium text-neutral-700">
                    View SubCategory
                </div>

                {/* Controls */}
                <div className="p-4 flex justify-between items-center border-b border-neutral-100 flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-neutral-600">Show</span>
                        <select
                            value={rowsPerPage}
                            onChange={(e) => {
                                setRowsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="bg-white border border-neutral-300 rounded py-1.5 px-3 text-sm focus:ring-1 focus:ring-teal-500 focus:outline-none cursor-pointer"
                        >
                            <option value={10}>10 entries</option>
                            <option value={20}>20 entries</option>
                            <option value={50}>50 entries</option>
                            <option value={100}>100 entries</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <button
                                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                                className="bg-teal-700 hover:bg-teal-800 text-white px-3 py-1.5 rounded text-sm font-medium flex items-center gap-1 transition-colors"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Export
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1"><polyline points="6 9 12 15 18 9"></polyline></svg>
                            </button>
                            
                            {isExportDropdownOpen && (
                                <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-neutral-200 z-10">
                                    <button 
                                        onClick={handleExport}
                                        className="w-full text-left px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 first:rounded-t-md last:rounded-b-md"
                                    >
                                        CSV
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="relative">
                            <input
                                type="text"
                                className="px-3 py-1.5 bg-neutral-100 border-none rounded text-sm focus:ring-1 focus:ring-teal-500 w-48 placeholder-neutral-400"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder="Search:"
                            />
                        </div>
                    </div>
                </div>

                {/* Pagination Footer */}
                {displayTotalPages > 1 && (
                    <div className="p-4 border-t border-neutral-100 flex flex-col sm:flex-row justify-between items-center gap-3">
                        <div className="text-sm text-neutral-600">
                            Showing {displayStartIndex + 1} to {displayEndIndex} of {displayTotalItems} entries
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className={`p-2 border border-teal-600 rounded ${
                                    currentPage === 1
                                        ? 'text-neutral-400 cursor-not-allowed bg-neutral-50'
                                        : 'text-teal-600 hover:bg-teal-50'
                                }`}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                            {Array.from({ length: displayTotalPages }, (_, i) => i + 1).map(page => (
                                <button
                                    key={page}
                                    onClick={() => setCurrentPage(page)}
                                    className={`px-3 py-1.5 border border-teal-600 rounded font-medium text-sm ${
                                        currentPage === page
                                            ? 'bg-teal-600 text-white'
                                            : 'text-teal-600 hover:bg-teal-50'
                                    }`}
                                >
                                    {page}
                                </button>
                            ))}
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(displayTotalPages, prev + 1))}
                                disabled={currentPage === displayTotalPages}
                                className={`p-2 border border-teal-600 rounded ${
                                    currentPage === displayTotalPages
                                        ? 'text-neutral-400 cursor-not-allowed bg-neutral-50'
                                        : 'text-teal-600 hover:bg-teal-50'
                                }`}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}

                {/* Loading and Error States */}
                {loading && (
                    <div className="flex items-center justify-center p-8">
                        <div className="text-neutral-500">Loading subcategories...</div>
                    </div>
                )}
                {error && !loading && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg m-4">
                        {error}
                    </div>
                )}

                {/* Table */}
                {!loading && !error && (
                <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left border-collapse border border-neutral-200">
                        <thead>
                            <tr className="bg-neutral-50 text-xs font-bold text-neutral-800">
                                <th 
                                    className="p-4 w-16 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                    onClick={() => handleSort('id')}
                                >
                                    <div className="flex items-center justify-between">
                                        ID <SortIcon column="id" />
                                    </div>
                                </th>
                                <th 
                                    className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                    onClick={() => handleSort('categoryName')}
                                >
                                    <div className="flex items-center justify-between">
                                        Category Name <SortIcon column="categoryName" />
                                    </div>
                                </th>
                                <th 
                                    className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                    onClick={() => handleSort('subcategoryName')}
                                >
                                    <div className="flex items-center justify-between">
                                        Subcategory Name <SortIcon column="subcategoryName" />
                                    </div>
                                </th>
                                <th 
                                    className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                    onClick={() => handleSort('subcategoryImage')}
                                >
                                    <div className="flex items-center justify-between">
                                        Subcategory Image <SortIcon column="subcategoryImage" />
                                    </div>
                                </th>
                                <th 
                                    className="p-4 border border-neutral-200 cursor-pointer hover:bg-neutral-100 transition-colors"
                                    onClick={() => handleSort('totalProduct')}
                                >
                                    <div className="flex items-center justify-between">
                                        Total Product <SortIcon column="totalProduct" />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayedSubcategories.map((subcategory) => (
                                <tr key={subcategory._id || subcategory.id} className="hover:bg-neutral-50 transition-colors text-sm text-neutral-700">
                                    <td className="p-4 align-middle border border-neutral-200">{subcategory._id || subcategory.id}</td>
                                    <td className="p-4 align-middle border border-neutral-200">{subcategory.categoryName}</td>
                                    <td className="p-4 align-middle border border-neutral-200">{subcategory.subcategoryName}</td>
                                    <td className="p-4 border border-neutral-200">
                                        <div className="w-16 h-12 bg-white border border-neutral-200 rounded p-1 flex items-center justify-center mx-auto">
                                            <img
                                                src={subcategory.subcategoryImage || '/assets/category-placeholder.png'}
                                                alt={subcategory.subcategoryName}
                                                className="max-w-full max-h-full object-contain"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://placehold.co/60x40?text=Img';
                                                }}
                                            />
                                        </div>
                                    </td>
                                    <td className="p-4 align-middle border border-neutral-200">{subcategory.totalProduct || 0}</td>
                                </tr>
                            ))}
                            {displayedSubcategories.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-neutral-400 border border-neutral-200">
                                        No subcategories found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                )}
            </div>
        </div>
    );
}

