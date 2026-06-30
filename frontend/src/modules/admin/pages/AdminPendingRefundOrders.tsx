import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  getAllOrders,
  processAdminRefund,
  type Order,
} from "../../../services/api/admin/adminOrderService";
import { useAuth } from "../../../context/AuthContext";

type SortField =
  | "orderId"
  | "customerDetails"
  | "orderDate"
  | "refundAmount";
type SortDirection = "asc" | "desc";

export default function AdminPendingRefundOrders() {
  const { isAuthenticated, token } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [dateRange, setDateRange] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState("10");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paginationData, setPaginationData] = useState({ total: 0, pages: 1 });

  // Quick Refund Modal State
  const [refundModalOpen, setRefundModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [refundReference, setRefundReference] = useState("");
  const [refundNotes, setRefundNotes] = useState("");
  const [processingRefund, setProcessingRefund] = useState(false);

  const fetchOrders = async () => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page: currentPage,
        limit: parseInt(entriesPerPage),
        adminRefundStatus: "Pending",
      };

      if (searchQuery && searchQuery.trim().length >= 1) {
        params.search = searchQuery.trim().toLowerCase();
      }

      if (dateRange && dateRange.includes(" - ")) {
        const [dateFrom, dateTo] = dateRange.split(" - ").map((d) => {
          const parts = d.trim().split("/");
          if (parts.length === 3) {
            return `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(2, "0")}`;
          }
          return d.trim();
        });
        params.dateFrom = dateFrom;
        params.dateTo = dateTo;
      }

      const response = await getAllOrders(params);
      if (response.success) {
        setOrders(response.data);

        if ((response as any).pagination) {
          setPaginationData((response as any).pagination);
        } else {
          setPaginationData({ total: response.data.length, pages: 1 });
        }
      }
    } catch (err: any) {
      console.error("Error fetching pending refund orders:", err);
      setError(err.response?.data?.message || "Failed to load pending refund orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [isAuthenticated, token, currentPage, entriesPerPage, searchQuery, dateRange]);

  const handleClearDate = () => {
    setDateRange("");
    setCurrentPage(1);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const filteredAndSortedOrders = useMemo(() => {
    let filtered = [...orders];

    if (sortField) {
      filtered.sort((a, b) => {
        let aValue: string | number;
        let bValue: string | number;

        switch (sortField) {
          case "orderId":
            aValue = a.orderNumber || "";
            bValue = b.orderNumber || "";
            break;
          case "customerDetails":
            aValue = a.customerName || "";
            bValue = b.customerName || "";
            break;
          case "orderDate":
            aValue = a.orderDate || "";
            bValue = b.orderDate || "";
            break;
          case "refundAmount":
            aValue = a.total || 0;
            bValue = b.total || 0;
            break;
          default:
            return 0;
        }

        if (typeof aValue === "string") {
          aValue = aValue.toLowerCase();
        }
        if (typeof bValue === "string") {
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
        if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [orders, sortField, sortDirection]);

  const totalPages = paginationData.pages || 1;
  const startIndex = (currentPage - 1) * parseInt(entriesPerPage);
  const endIndex = Math.min(startIndex + parseInt(entriesPerPage), paginationData.total);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const handleOpenRefundModal = (order: Order) => {
    setSelectedOrder(order);
    setRefundReference("");
    setRefundNotes("");
    setRefundModalOpen(true);
  };

  const handleProcessRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !refundReference.trim()) return;

    setProcessingRefund(true);
    try {
      const response = await processAdminRefund(selectedOrder._id, {
        refundReference: refundReference.trim(),
        refundNotes: refundNotes.trim(),
      });

      if (response.success) {
        alert("Refund processed successfully!");
        setRefundModalOpen(false);
        fetchOrders();
      } else {
        alert(response.message || "Failed to process refund.");
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Error processing refund.");
    } finally {
      setProcessingRefund(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 -mx-3 sm:-mx-4 md:-mx-6 -mt-3 sm:-mt-4 md:-mt-6">
      {/* Header Section */}
      <div className="bg-white border-b border-neutral-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900">
            Pending Refunds
          </h1>

          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <Link to="/admin" className="text-blue-600 hover:text-blue-700">
              Dashboard
            </Link>
            <span className="text-neutral-500">/</span>
            <span className="text-neutral-700">Pending Refunds</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 sm:px-4 md:px-6">
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
          <div className="bg-red-600 text-white px-4 sm:px-6 py-2 sm:py-3">
            <h2 className="text-base sm:text-lg font-semibold">
              Pending Customer Refunds (Online Payments Only)
            </h2>
          </div>

          {/* Filter Bar */}
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-neutral-200 bg-neutral-50">
            <div className="flex flex-col lg:flex-row flex-wrap items-start lg:items-center gap-3 sm:gap-4">
              {/* Date Filter */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
                <label className="text-xs sm:text-sm font-medium text-neutral-700 whitespace-nowrap">
                  Order Date Range
                </label>
                <div className="flex items-center gap-2 bg-white border border-neutral-300 rounded px-2 sm:px-3 py-1.5 sm:py-2 w-full sm:w-auto">
                  <input
                    type="date"
                    onChange={(e) => {
                      const d = e.target.value;
                      if (!d) return;
                      const [y, m, day] = d.split("-");
                      setDateRange(m + "/" + day + "/" + y + " - " + (dateRange.split(" - ")[1] || ""));
                      setCurrentPage(1);
                    }}
                    className="flex-1 text-xs sm:text-sm text-neutral-600 bg-transparent focus:outline-none cursor-pointer"
                  />
                  <span className="text-neutral-400">-</span>
                  <input
                    type="date"
                    onChange={(e) => {
                      const d = e.target.value;
                      if (!d) return;
                      const [y, m, day] = d.split("-");
                      setDateRange((dateRange.split(" - ")[0] || "") + " - " + m + "/" + day + "/" + y);
                      setCurrentPage(1);
                    }}
                    className="flex-1 text-xs sm:text-sm text-neutral-600 bg-transparent focus:outline-none cursor-pointer"
                  />
                  {dateRange && (
                    <button
                      onClick={handleClearDate}
                      className="ml-2 px-2 py-1 text-xs font-medium text-neutral-700 bg-neutral-200 hover:bg-neutral-300 rounded transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Entries Limit */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto">
                <select
                  value={entriesPerPage}
                  onChange={(e) => {
                    setEntriesPerPage(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full sm:w-auto px-3 py-2 border border-neutral-300 rounded text-xs sm:text-sm text-neutral-900 bg-white focus:outline-none"
                >
                  <option>10</option>
                  <option>25</option>
                  <option>50</option>
                  <option>100</option>
                </select>
              </div>

              {/* Search */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full lg:w-auto lg:flex-1">
                <label className="text-xs sm:text-sm font-medium text-neutral-700 whitespace-nowrap">
                  Search:
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="flex-1 w-full sm:w-auto px-3 py-2 border border-neutral-300 rounded text-xs sm:text-sm text-neutral-900 bg-white focus:outline-none"
                  placeholder="Search by Order ID or Customer"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th
                    onClick={() => handleSort("orderId")}
                    className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  >
                    Order ID
                  </th>
                  <th
                    onClick={() => handleSort("customerDetails")}
                    className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  >
                    Customer
                  </th>
                  <th
                    onClick={() => handleSort("refundAmount")}
                    className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  >
                    Refund Amount
                  </th>
                  <th
                    onClick={() => handleSort("orderDate")}
                    className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  >
                    Order Date
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-neutral-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-neutral-200">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 sm:px-6 py-8 text-center text-sm text-neutral-500">
                      Loading pending refunds...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={6} className="px-4 sm:px-6 py-8 text-center text-sm text-red-600">
                      {error}
                    </td>
                  </tr>
                ) : filteredAndSortedOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 sm:px-6 py-8 text-center text-sm text-neutral-500">
                      No pending refunds found
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedOrders.map((order) => (
                    <tr key={order._id} className="hover:bg-neutral-50">
                      <td className="px-4 sm:px-6 py-3 text-sm font-semibold text-neutral-900">
                        {order.orderNumber}
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600">
                        <div>
                          <div className="font-medium text-neutral-800">
                            {order.customerName ||
                              (typeof order.customer === "object" ? order.customer.name : "N/A")}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {order.customerPhone ||
                              (typeof order.customer === "object" ? order.customer.phone : "")}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-sm font-bold text-red-600">
                        ₹{order.total?.toFixed(2) || "0.00"}
                      </td>
                      <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600">
                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 sm:px-6 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenRefundModal(order)}
                            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold py-1.5 px-3 rounded shadow transition-colors"
                          >
                            Quick Refund
                          </button>
                          <Link to={`/admin/orders/${order._id}`}>
                            <button
                              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold py-1.5 px-3 rounded border border-neutral-300 transition-colors"
                              title="View Details"
                            >
                              Details
                            </button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-4 sm:px-6 py-3 bg-neutral-50 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="text-xs sm:text-sm text-neutral-700">
              Showing {filteredAndSortedOrders.length === 0 ? 0 : startIndex + 1} to{" "}
              {Math.min(endIndex, filteredAndSortedOrders.length)} of {filteredAndSortedOrders.length} entries
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="px-2 py-1 border border-neutral-300 rounded text-xs sm:text-sm text-neutral-700 bg-white disabled:opacity-50 transition-colors"
              >
                Prev
              </button>
              <button
                onClick={handleNextPage}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-2 py-1 border border-neutral-300 rounded text-xs sm:text-sm text-neutral-700 bg-white disabled:opacity-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Manual Refund Processing Modal */}
      {refundModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg border border-neutral-200 overflow-hidden">
            <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-semibold text-lg">
                Process Refund - #{selectedOrder.orderNumber}
              </h3>
              <button
                onClick={() => setRefundModalOpen(false)}
                className="text-white hover:text-red-100 focus:outline-none"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form onSubmit={handleProcessRefund} className="p-6 space-y-6">
              {/* Customer Bank/UPI details */}
              <div className="bg-neutral-50 rounded p-4 border border-neutral-200 space-y-3">
                <h4 className="font-bold text-sm text-neutral-800 uppercase tracking-wider">
                  Customer Settlement Details
                </h4>

                {(() => {
                  const customerObj = typeof selectedOrder.customer === "object" ? selectedOrder.customer : null;
                  const bankDetails = (customerObj as any)?.bankDetails;

                  if (!bankDetails || (!bankDetails.accountNumber && !bankDetails.upiId)) {
                    return (
                      <p className="text-xs text-amber-600 italic font-medium">
                        No bank or UPI details are registered for this customer. Contact customer for manual details.
                      </p>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {bankDetails.upiId && (
                        <div className="md:col-span-2 bg-blue-50 border border-blue-200 p-2 rounded">
                          <span className="font-semibold text-neutral-600">UPI ID:</span>
                          <span className="ml-2 font-bold text-blue-700 text-sm select-all">{bankDetails.upiId}</span>
                        </div>
                      )}
                      {bankDetails.accountNumber && (
                        <>
                          <div>
                            <span className="font-semibold text-neutral-600">Account Holder Name:</span>
                            <span className="block font-medium text-neutral-800">{bankDetails.accountName || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-neutral-600">Bank Name:</span>
                            <span className="block font-medium text-neutral-800">{bankDetails.bankName || "N/A"}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-neutral-600">Account Number:</span>
                            <span className="block font-bold text-neutral-800 select-all">{bankDetails.accountNumber}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-neutral-600">IFSC Code:</span>
                            <span className="block font-bold text-neutral-800 select-all">{bankDetails.ifscCode}</span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Amount Info */}
              <div className="flex justify-between items-center text-sm font-semibold border-b pb-3">
                <span className="text-neutral-600">Amount to Refund:</span>
                <span className="text-lg text-red-600 font-bold">₹{selectedOrder.total?.toFixed(2) || "0.00"}</span>
              </div>

              {/* Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                    Refund Transaction Reference ID <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={refundReference}
                    onChange={(e) => setRefundReference(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    placeholder="Enter Bank TXN ID, UPI Ref ID, etc."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase mb-1">
                    Refund Notes
                  </label>
                  <textarea
                    value={refundNotes}
                    onChange={(e) => setRefundNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-neutral-300 rounded focus:ring-1 focus:ring-red-500 focus:border-red-500"
                    placeholder="Optional details, e.g. Sent via GPay UPI"
                    rows={2}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={() => setRefundModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded text-sm text-neutral-700 bg-white hover:bg-neutral-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingRefund}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {processingRefund ? "Processing..." : "Confirm & Mark Refunded"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center py-4 text-xs sm:text-sm text-neutral-600">
        Copyright © 2026. Developed By{" "}
        <Link to="/" className="text-blue-600 hover:text-blue-700">
          vrushahi e-Commerce
        </Link>
      </div>
    </div>
  );
}
