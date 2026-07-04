import React from 'react';

interface Column {
  header: string;
  accessor: string | ((row: any) => React.ReactNode);
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  isLoading?: boolean;
  actions?: (row: any) => React.ReactNode;
  pagination?: Pagination;
}

export default function DataTable({ columns, data, isLoading, actions, pagination }: DataTableProps) {
  if (isLoading) {
    return <div className="p-4 text-center text-neutral-500">Loading...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="p-4 text-center text-neutral-500">No data available</div>;
  }

  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-left border-collapse min-w-max">
        <thead>
          <tr className="bg-neutral-50 text-xs font-bold text-neutral-600 border-b border-neutral-200">
            {columns.map((col, i) => (
              <th key={i} className="p-4">{col.header}</th>
            ))}
            {actions && <th className="p-4">Actions</th>}
          </tr>
        </thead>
        <tbody className="text-sm">
          {data.map((row, i) => (
            <tr key={i} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
              {columns.map((col, j) => (
                <td key={j} className="p-4 align-middle">
                  {typeof col.accessor === 'function' ? col.accessor(row) : row[col.accessor]}
                </td>
              ))}
              {actions && (
                <td className="p-4 align-middle">
                  {actions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {pagination && pagination.totalPages > 1 && (
        <div className="p-4 flex items-center justify-between border-t border-neutral-200 text-sm">
          <span className="text-neutral-500">
            Page {pagination.currentPage} of {pagination.totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={pagination.currentPage === 1}
              onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
              className="px-3 py-1 border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={pagination.currentPage === pagination.totalPages}
              onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
              className="px-3 py-1 border border-neutral-300 rounded hover:bg-neutral-50 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
