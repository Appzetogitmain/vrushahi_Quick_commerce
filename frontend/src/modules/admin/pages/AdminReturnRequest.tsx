import { useState, useEffect } from "react";
import {
  getReturnRequests,
  updateReturnRequest,
  rebroadcastReturnRequest,
  reassignRider,
  type MiscReturnRequest as ReturnRequest,
} from "../../../services/api/admin/adminMiscService";
import { getDeliveryBoys } from "../../../services/api/admin/adminDeliveryService";
import { useAuth } from "../../../context/AuthContext";

export default function AdminReturnRequest() {
  const { isAuthenticated, token } = useAuth();
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedSeller, setSelectedSeller] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal State for detailed inspection
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Reassign Modal State
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [availableRiders, setAvailableRiders] = useState<any[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState("");
  const [fetchingRiders, setFetchingRiders] = useState(false);

  // Refund Modal State
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [refundTxId, setRefundTxId] = useState("");
  const [returnToComplete, setReturnToComplete] = useState<string | null>(null);

  // Fetch return requests on component mount
  useEffect(() => {
    if (!isAuthenticated || !token) {
      setLoading(false);
      return;
    }

    const fetchReturnRequests = async () => {
      try {
        setLoading(true);
        setError(null);

        const params: any = {
          page: currentPage,
          limit: entriesPerPage,
        };

        if (selectedStatus !== "all") {
          params.status = selectedStatus;
        }

        if (searchTerm) {
          params.search = searchTerm;
        }

        const response = await getReturnRequests(params);

        if (response.success) {
          setReturnRequests(response.data);
        } else {
          setError("Failed to load return requests");
        }
      } catch (err: any) {
        console.error("Error fetching return requests:", err);
        setError(
          err.response?.data?.message ||
          "Failed to load return requests. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReturnRequests();
  }, [
    isAuthenticated,
    token,
    currentPage,
    entriesPerPage,
    selectedStatus,
    searchTerm,
  ]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Note: Filtering is done server-side, so we just use the returnRequests as is
  const displayedRequests = returnRequests;

  // For pagination display (simplified - in real app, this would come from API)
  const totalPages = Math.ceil(displayedRequests.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;

  const handleApproveReturn = async (requestId: string) => {
    try {
      setUpdating(requestId);
      const response = await updateReturnRequest(requestId, {
        status: "Approved",
      });

      if (response.success) {
        // Update local state
        setReturnRequests((requests) =>
          requests.map((req) =>
            req._id === requestId ? { ...req, status: "Approved" } : req
          )
        );
        alert("Return request approved successfully!");
      } else {
        alert(
          "Failed to approve return request: " +
          (response.message || "Unknown error")
        );
      }
    } catch (err: any) {
      console.error("Error approving return request:", err);
      alert(
        "Failed to approve return request: " +
        (err.response?.data?.message || "Please try again.")
      );
    } finally {
      setUpdating(null);
    }
  };

  const handleRejectReturn = async (requestId: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    try {
      setUpdating(requestId);
      const response = await updateReturnRequest(requestId, {
        status: "Rejected",
        adminNotes: reason,
      });

      if (response.success) {
        // Update local state
        setReturnRequests((requests) =>
          requests.map((req) =>
            req._id === requestId ? { ...req, status: "Rejected" } : req
          )
        );
        alert("Return request rejected successfully!");
      } else {
        alert(
          "Failed to reject return request: " +
          (response.message || "Unknown error")
        );
      }
    } catch (err: any) {
      console.error("Error rejecting return request:", err);
      alert(
        "Failed to reject return request: " +
        (err.response?.data?.message || "Please try again.")
      );
    } finally {
      setUpdating(null);
    }
  };

  const handleCompleteReturn = async () => {
    if (!returnToComplete) return;
    if (!refundTxId) {
      alert("Transaction ID is required to complete the refund.");
      return;
    }

    try {
      setUpdating(returnToComplete);
      const response = await updateReturnRequest(returnToComplete, {
        status: "Completed",
        refundReference: refundTxId,
      });

      if (response.success) {
        setReturnRequests((requests) =>
          requests.map((req) =>
            req._id === returnToComplete ? { ...req, status: "Completed", riderPayoutProcessed: true } : req
          )
        );
        alert("Return request completed successfully! Payout settled.");
        if (selectedRequest && selectedRequest._id === returnToComplete) {
          setSelectedRequest((prev: any) => ({ ...prev, status: "Completed", riderPayoutProcessed: true }));
        }
        setIsRefundModalOpen(false);
        setIsModalOpen(false);
        setSelectedRequest(null);
      } else {
        alert("Failed to complete return: " + (response.message || "Unknown error"));
      }
    } catch (err: any) {
      console.error("Error completing return request:", err);
      alert("Failed to complete return: " + (err.response?.data?.message || "Please try again."));
    } finally {
      setUpdating(null);
      setReturnToComplete(null);
    }
  };

  const handleRebroadcast = async (requestId: string) => {
    if (!confirm("Are you sure you want to re-broadcast this return pickup? This will remove the current rider and broadcast it again.")) return;

    try {
      setUpdating(requestId);
      const response = await rebroadcastReturnRequest(requestId);

      if (response.success) {
        setReturnRequests((requests) =>
          requests.map((req) =>
            req._id === requestId ? { ...req, pickupStatus: "Pending", deliveryBoyName: "Not Assigned" } : req
          )
        );
        alert("Return pickup re-broadcasted successfully!");
        if (selectedRequest && selectedRequest._id === requestId) {
          setSelectedRequest((prev: any) => ({ ...prev, pickupStatus: "Pending", deliveryBoyName: "Not Assigned" }));
        }
      } else {
        alert("Failed to re-broadcast: " + (response.message || "Unknown error"));
      }
    } catch (err: any) {
      console.error("Error re-broadcasting return request:", err);
      alert("Failed to re-broadcast: " + (err.response?.data?.message || "Please try again."));
    } finally {
      setUpdating(null);
    }
  };

  const handleOpenReassignModal = async (requestId: string) => {
    setIsReassignModalOpen(true);
    setFetchingRiders(true);
    setSelectedRiderId("");
    try {
      const response = await getDeliveryBoys({ status: "Active" });
      if (response.success) {
        setAvailableRiders(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch riders:", err);
      alert("Failed to load available riders.");
    } finally {
      setFetchingRiders(false);
    }
  };

  const handleManualReassign = async (requestId: string) => {
    if (!selectedRiderId) {
      alert("Please select a rider first.");
      return;
    }
    
    if (!confirm("Are you sure you want to reassign this return to the selected rider? The previous rider will be removed.")) return;

    try {
      setUpdating(requestId);
      const response = await reassignRider(requestId, selectedRiderId);

      if (response.success) {
        // Refresh the return requests
        setReturnRequests((requests) =>
          requests.map((req) =>
            req._id === requestId ? response.data : req
          )
        );
        alert("Rider reassigned successfully!");
        if (selectedRequest && selectedRequest._id === requestId) {
          setSelectedRequest(response.data);
        }
        setIsReassignModalOpen(false);
      } else {
        alert("Failed to reassign rider: " + (response.message || "Unknown error"));
      }
    } catch (err: any) {
      console.error("Error reassigning rider:", err);
      alert("Failed to reassign rider: " + (err.response?.data?.message || "Please try again."));
    } finally {
      setUpdating(null);
    }
  };

  const handleExport = () => {
    alert("Export functionality will be implemented here");
  };

  const handleClearDate = () => {
    setFromDate("");
    setToDate("");
  };

  const sellers = ["All Seller", "Seller 1", "Seller 2", "Seller 3"];

  const statuses = [
    "All Status",
    "Pending",
    "Approved",
    "Rejected",
    "Completed",
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <h1 className="text-2xl font-semibold text-neutral-800">
          Return Request
        </h1>
        <div className="text-sm text-neutral-600">
          <span className="text-teal-600 hover:text-teal-700 cursor-pointer">
            Home
          </span>
          <span className="mx-2">/</span>
          <span className="text-neutral-800">Return Request</span>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-lg shadow-sm border border-neutral-200 overflow-hidden">
        {/* Green Header Bar */}
        <div className="bg-green-500 px-4 sm:px-6 py-3">
          <h2 className="text-white text-lg font-semibold">
            View Return Request
          </h2>
        </div>

        {/* Filters */}
        <div className="p-4 sm:p-6 border-b border-neutral-200">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Left Side Filters */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1 flex-wrap">
              {/* From - To Date */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700 whitespace-nowrap">
                  From - To Date:
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <input
                      type="text"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      placeholder="MM/DD/YYYY"
                      className="pl-10 pr-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 min-w-[140px]"
                    />
                  </div>
                  <span className="text-neutral-500">-</span>
                  <div className="relative">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400">
                      <rect
                        x="3"
                        y="4"
                        width="18"
                        height="18"
                        rx="2"
                        ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <input
                      type="text"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      placeholder="MM/DD/YYYY"
                      className="pl-10 pr-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 min-w-[140px]"
                    />
                  </div>
                  <button
                    onClick={handleClearDate}
                    className="px-3 py-2 bg-neutral-700 hover:bg-neutral-800 text-white rounded text-sm transition-colors">
                    Clear
                  </button>
                </div>
              </div>

              {/* Filter by Seller */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700 whitespace-nowrap">
                  Filter by Seller:
                </label>
                <select
                  value={selectedSeller}
                  onChange={(e) => {
                    setSelectedSeller(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 min-w-[130px]">
                  {sellers.map((seller) => (
                    <option
                      key={seller}
                      value={seller === "All Seller" ? "all" : seller}>
                      {seller}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Status */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700 whitespace-nowrap">
                  Filter by Status:
                </label>
                <select
                  value={selectedStatus}
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 min-w-[130px]">
                  {statuses.map((status) => (
                    <option
                      key={status}
                      value={status === "All Status" ? "all" : status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right Side Controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {/* Per Page */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-neutral-700">Per Page:</span>
                <select
                  value={entriesPerPage}
                  onChange={(e) => {
                    setEntriesPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 border border-neutral-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500">
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Export Button */}
              <button
                onClick={handleExport}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded text-sm font-medium flex items-center gap-2 transition-colors">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                Export
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {/* Search */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-neutral-700">Search:</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search:"
                  className="px-3 py-2 border border-neutral-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 min-w-[150px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px]">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("orderItemId")}>
                  <div className="flex items-center gap-2">
                    Order Item Id
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("user")}>
                  <div className="flex items-center gap-2">
                    User
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("product")}>
                  <div className="flex items-center gap-2">
                    Product
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("variant")}>
                  <div className="flex items-center gap-2">
                    Variant
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("price")}>
                  <div className="flex items-center gap-2">
                    Price
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("discPrice")}>
                  <div className="flex items-center gap-2">
                    Disc Price
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("quantity")}>
                  <div className="flex items-center gap-2">
                    Quantity
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("total")}>
                  <div className="flex items-center gap-2">
                    Total
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-2">
                    Status
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th
                  className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort("date")}>
                  <div className="flex items-center gap-2">
                    Date
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-neutral-400">
                      <path
                        d="M7 10L12 5L17 10M7 14L12 19L17 14"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                </th>
                <th className="px-4 sm:px-6 py-3 text-left text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-neutral-200">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 sm:px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-teal-600 mr-2"></div>
                      Loading return requests...
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 sm:px-6 py-8 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : displayedRequests.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 sm:px-6 py-8 text-center text-sm text-neutral-500">
                    No return requests found
                  </td>
                </tr>
              ) : (
                displayedRequests.map((request) => (
                  <tr key={request._id} className="hover:bg-neutral-50">
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900">
                      {request.orderItemId}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900 font-medium">
                      {request.userName}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600">
                      {request.productName}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600">
                      {request.variant || "-"}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900">
                      ₹{request.price.toFixed(2)}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900">
                      ₹{(request.discountedPrice || request.price).toFixed(2)}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600">
                      {request.quantity}
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-900 font-medium">
                      ₹{request.total.toFixed(2)}
                    </td>
                    <td className="px-4 sm:px-6 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${request.status === "Approved"
                          ? "bg-green-100 text-green-800"
                          : request.status === "Pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : request.status === "Rejected"
                              ? "bg-red-100 text-red-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                        {request.status}
                      </span>
                    </td>
                    <td className="px-4 sm:px-6 py-3 text-sm text-neutral-600">
                      {new Date(request.requestedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 sm:px-6 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setIsModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border border-green-200/50 rounded-lg transition-colors text-xs font-bold"
                          title="View Details">
                          View Details
                        </button>
                        {request.status === "Pending" ? (
                          <>
                            <button
                              onClick={() => handleApproveReturn(request._id)}
                              disabled={updating === request._id}
                              className="p-1.5 bg-green-100 hover:bg-green-200 disabled:bg-neutral-100 disabled:text-neutral-400 text-green-700 rounded transition-colors"
                              title="Approve">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                            </button>
                            <button
                              onClick={() => handleRejectReturn(request._id)}
                              disabled={updating === request._id}
                              className="p-1.5 bg-red-100 hover:bg-red-200 disabled:bg-neutral-100 disabled:text-neutral-400 text-red-700 rounded transition-colors"
                              title="Reject">
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          </>
                        ) : (
                          <span className="text-sm text-neutral-400">
                            {request.status === "Approved"
                              ? "Approved"
                              : "Rejected"}
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-neutral-200 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <div className="text-xs sm:text-sm text-neutral-700">
            Showing {startIndex + 1} to{" "}
            {Math.min(endIndex, displayedRequests.length)} of{" "}
            {displayedRequests.length} entries
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || totalPages === 0}
              className={`p-2 border border-green-300 rounded bg-white ${currentPage === 1 || totalPages === 0
                ? "text-neutral-400 cursor-not-allowed"
                : "text-neutral-700 hover:bg-green-50"
                }`}
              aria-label="Previous page">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M15 18L9 12L15 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages || totalPages === 0}
              className={`p-2 border border-green-300 rounded bg-white ${currentPage === totalPages || totalPages === 0
                ? "text-neutral-400 cursor-not-allowed"
                : "text-neutral-700 hover:bg-green-50"
                }`}
              aria-label="Next page">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M9 18L15 12L9 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Return Request Detail Modal */}
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="bg-teal-600 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2">
                📂 Return Request Details
              </h3>
              <button 
                onClick={() => { setIsModalOpen(false); setSelectedRequest(null); }}
                className="text-white hover:bg-teal-700/50 p-1.5 rounded-lg transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* Customer and Order summary grids */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-left">
                  <span className="text-xs text-neutral-400 font-bold uppercase block mb-1 tracking-wider">Customer Details</span>
                  <div className="text-sm font-bold text-neutral-800">{selectedRequest.userName || 'N/A'}</div>
                  <div className="text-xs text-neutral-500 mt-1">Customer ID: {selectedRequest.userId || 'N/A'}</div>
                </div>
                <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 text-left">
                  <span className="text-xs text-neutral-400 font-bold uppercase block mb-1 tracking-wider">Order Reference</span>
                  <div className="text-sm font-bold text-neutral-800">Order ID: {selectedRequest.orderId || 'N/A'}</div>
                  <div className="text-xs text-neutral-500 mt-1">Requested: {new Date(selectedRequest.requestedAt).toLocaleString()}</div>
                </div>
              </div>

              {/* Product Info Display Card */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden text-left">
                <div className="bg-neutral-50 px-4 py-2 border-b border-neutral-200 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                  Item to be Returned
                </div>
                <div className="p-4 flex gap-4">
                  {selectedRequest.productImage ? (
                    <img 
                      src={selectedRequest.productImage} 
                      alt={selectedRequest.productName} 
                      className="w-16 h-16 object-cover rounded-xl border border-neutral-200 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-neutral-100 border border-neutral-200 rounded-xl flex items-center justify-center flex-shrink-0 text-neutral-400 font-bold">
                      📦
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-neutral-800 truncate">{selectedRequest.productName}</h4>
                    <p className="text-xs text-neutral-500 font-medium mt-0.5">Variant: {selectedRequest.variant || '-'}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs">
                      <div>Price: <span className="font-semibold text-neutral-700">₹{selectedRequest.price.toFixed(2)}</span></div>
                      <div>Quantity: <span className="font-semibold text-neutral-700">{selectedRequest.quantity}</span></div>
                      <div>Total: <span className="font-bold text-teal-600 text-sm">₹{selectedRequest.total.toFixed(2)}</span></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Return Reason Detail */}
              <div className="bg-amber-50 border border-amber-200/60 p-4 rounded-xl text-left">
                <span className="text-xs text-amber-700 font-bold uppercase block mb-1 tracking-wider">Return Reason</span>
                <div className="text-sm font-bold text-neutral-800">{selectedRequest.reason || 'No reason provided'}</div>
                {selectedRequest.description && (
                  <div className="text-xs text-neutral-600 mt-2 bg-white/70 p-3 rounded-lg border border-amber-100 leading-relaxed italic">
                    "{selectedRequest.description}"
                  </div>
                )}
              </div>

              {/* Rider Custody & Handover Tracking */}
              <div className="border border-purple-200 bg-purple-50/30 p-4 rounded-xl text-left space-y-3">
                <div className="flex justify-between items-center border-b border-purple-100 pb-2">
                  <span className="text-xs font-bold text-purple-800 uppercase tracking-wider">🚚 Return Pickup & Custody Tracking</span>
                  <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">
                    {selectedRequest.pickupStatus}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-neutral-500 block">Assigned Delivery Partner:</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-neutral-800">{selectedRequest.deliveryBoyName || 'Not Assigned'}</span>
                      {selectedRequest.status === 'Approved' && selectedRequest.pickupStatus === 'Assigned' && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleRebroadcast(selectedRequest._id)}
                            className="text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded transition-colors font-semibold"
                          >
                            Re-broadcast
                          </button>
                          <button
                            onClick={() => handleOpenReassignModal(selectedRequest._id)}
                            className="text-[10px] bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-1 rounded transition-colors font-semibold"
                          >
                            Assign Manually
                          </button>
                        </div>
                      )}
                    </div>
                    {selectedRequest.assignedAt && (
                      <span className="text-[10px] text-neutral-400 block mt-0.5">Since: {new Date(selectedRequest.assignedAt).toLocaleString('en-GB')}</span>
                    )}
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Product Custody Status:</span>
                    <span className="font-bold text-neutral-800">{selectedRequest.productCustody || 'With Customer'}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Customer Handover OTP:</span>
                    <span className={`font-bold ${selectedRequest.customerOtpVerified ? 'text-green-600' : 'text-amber-600'}`}>
                      {selectedRequest.customerOtpVerified ? '✅ OTP Verified (Picked up)' : '⏳ Verification Pending'}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Seller Handover OTP:</span>
                    <span className={`font-bold ${selectedRequest.sellerOtpVerified ? 'text-green-600' : 'text-amber-600'}`}>
                      {selectedRequest.sellerOtpVerified ? '✅ OTP Verified (Returned to Seller)' : '⏳ Handover Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rider QC Inspection Report */}
              <div className="border border-blue-200 bg-blue-50/30 p-4 rounded-xl text-left space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">📋 Rider Quality Check (QC) Inspection</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    selectedRequest.qcStatus === 'Passed' ? 'bg-green-100 text-green-800' :
                    selectedRequest.qcStatus === 'Failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedRequest.qcStatus || 'Pending'}
                  </span>
                </div>
                <div className="text-xs text-neutral-700 bg-white p-2.5 rounded-lg border border-blue-100 min-h-[40px]">
                  <span className="font-semibold block text-neutral-400 mb-1">QC Inspection Notes:</span>
                  {selectedRequest.qcNotes || 'No notes provided by rider yet.'}
                </div>
              </div>

              {/* Customer and Rider Uploaded Photos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {selectedRequest.images && selectedRequest.images.length > 0 && (
                  <div className="border border-neutral-200 rounded-xl p-3 space-y-2 text-left bg-white">
                    <span className="text-xs text-neutral-500 font-bold uppercase block tracking-wider">Customer Photos</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedRequest.images.map((img: string, idx: number) => (
                        <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="w-16 h-16 rounded-lg overflow-hidden border border-neutral-200 block hover:opacity-85">
                          <img src={img} alt="Customer upload" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {selectedRequest.riderImages && selectedRequest.riderImages.length > 0 && (
                  <div className="border border-teal-200 bg-teal-50/20 rounded-xl p-3 space-y-2 text-left">
                    <span className="text-xs text-teal-800 font-bold uppercase block tracking-wider">Rider QC Photos</span>
                    <div className="flex flex-wrap gap-2">
                      {selectedRequest.riderImages.map((img: string, idx: number) => (
                        <a key={idx} href={img} target="_blank" rel="noopener noreferrer" className="w-16 h-16 rounded-lg overflow-hidden border border-teal-200 block hover:opacity-85">
                          <img src={img} alt="Rider QC upload" className="w-full h-full object-cover" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Settlement and Payout Detail */}
              <div className="border border-emerald-200 bg-emerald-50/40 p-4 rounded-xl text-left space-y-2">
                <span className="text-xs font-bold text-emerald-800 uppercase block tracking-wider">💰 Return Fee Settlement</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-neutral-500 block">Return Pickup Fee:</span>
                    <span className="font-bold text-neutral-800">₹{selectedRequest.returnPickupFee ?? 20}</span>
                  </div>
                  <div>
                    <span className="text-neutral-500 block">Payout Status:</span>
                    <span className={`font-bold ${selectedRequest.riderPayoutProcessed ? 'text-green-600' : 'text-neutral-500'}`}>
                      {selectedRequest.riderPayoutProcessed ? '✅ Settled (Debited from Seller, Credited to Rider)' : '⏳ Awaiting Final Completion'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Refund Destination Info */}
              {selectedRequest.refundMethod && (
                <div className="bg-blue-50 border border-blue-200/60 p-4 rounded-xl text-left">
                  <span className="text-xs text-blue-700 font-bold uppercase block mb-1 tracking-wider">Refund Method</span>
                  <div className="text-sm font-bold text-neutral-800 flex items-center gap-1.5">
                    {selectedRequest.refundMethod === 'Wallet' ? '⚡ Instant Refund to Wallet' : selectedRequest.refundMethod === 'Bank' ? '🏦 Direct Bank Transfer' : selectedRequest.refundMethod === 'UPI' ? '📱 UPI payout' : '🏦 Original Payment Source'}
                  </div>
                </div>
              )}

              {/* Customer Bank/UPI Details (Only visible to Admin) */}
              {selectedRequest.bankDetails && ['UPI', 'Bank', 'Bank Account'].includes(selectedRequest.refundMethod) && (
                <div className="bg-teal-50/50 border border-teal-200 p-4 rounded-xl text-left space-y-3">
                  <span className="text-xs text-teal-800 font-bold uppercase block tracking-wider">🏦 Refund Payment Instructions</span>
                  <div className="text-xs text-teal-700/80 leading-relaxed">
                    The customer has requested a refund via <strong>{selectedRequest.refundMethod}</strong>. Below are their registered payout details:
                  </div>
                  {selectedRequest.refundMethod === 'UPI' ? (
                    <div className="text-xs font-mono bg-white p-3 rounded-lg border border-teal-100 text-neutral-800">
                      <span className="text-neutral-400 block font-medium mb-1">UPI ID</span>
                      <span className="text-teal-700 font-bold text-sm tracking-wide">{selectedRequest.bankDetails.upiId || 'N/A'}</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-white p-3.5 rounded-lg border border-teal-100">
                      <div>
                        <span className="text-neutral-400 block font-medium">Account Name</span>
                        <span className="text-neutral-800 font-bold">{selectedRequest.bankDetails.accountName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block font-medium">Account Number</span>
                        <span className="text-neutral-800 font-bold tracking-wider font-mono">{selectedRequest.bankDetails.accountNumber || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block font-medium">Bank Name</span>
                        <span className="text-neutral-800 font-bold">{selectedRequest.bankDetails.bankName || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-neutral-400 block font-medium">IFSC Code</span>
                        <span className="text-neutral-800 font-bold uppercase tracking-wider font-mono">{selectedRequest.bankDetails.ifscCode || 'N/A'}</span>
                      </div>
                    </div>
                  )}
                  {selectedRequest.refundReference && (
                    <div className="text-xs font-mono bg-white p-3 rounded-lg border border-teal-100 text-neutral-800 mt-2">
                      <span className="text-neutral-400 block font-medium mb-1">Transaction ID</span>
                      <span className="text-teal-700 font-bold text-sm tracking-wide">{selectedRequest.refundReference}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Status Info */}
              <div className="flex items-center gap-3 bg-neutral-50 p-3.5 rounded-xl border border-neutral-100 text-left">
                <span className="text-sm font-semibold text-neutral-500">Current Status:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${
                  selectedRequest.status === 'Approved' ? 'bg-green-100 text-green-800' :
                  selectedRequest.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                  selectedRequest.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                  selectedRequest.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {selectedRequest.status}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-neutral-200 px-6 py-4 flex justify-between items-center bg-neutral-50">
              <button
                onClick={() => { setIsModalOpen(false); setSelectedRequest(null); }}
                className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 text-sm font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
              
              {selectedRequest.status === 'Pending' && (
                <div className="flex gap-2">
                  <button
                    disabled={updating === selectedRequest._id}
                    onClick={async () => {
                      await handleRejectReturn(selectedRequest._id);
                      setIsModalOpen(false);
                      setSelectedRequest(null);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    disabled={updating === selectedRequest._id}
                    onClick={async () => {
                      await handleApproveReturn(selectedRequest._id);
                      setIsModalOpen(false);
                      setSelectedRequest(null);
                    }}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-colors"
                  >
                    Approve
                  </button>
                </div>
              )}

              {selectedRequest.status === 'Approved' && (
                <div className="flex gap-2">
                  <button
                    disabled={updating === selectedRequest._id}
                    onClick={async () => {
                      await handleRejectReturn(selectedRequest._id);
                      setIsModalOpen(false);
                      setSelectedRequest(null);
                    }}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-colors"
                  >
                    Reject & Close
                  </button>
                  <button
                    disabled={updating === selectedRequest._id}
                    onClick={() => {
                      setReturnToComplete(selectedRequest._id);
                      setRefundTxId("");
                      setIsRefundModalOpen(true);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                  >
                    Mark Completed & Refund
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reassign Rider Modal */}
      {isReassignModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-indigo-50/50">
              <h3 className="text-lg font-bold text-neutral-800">Manually Reassign Rider</h3>
              <button
                onClick={() => setIsReassignModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-neutral-600 mb-4">
                Select a new delivery partner for this return request. The current rider will be removed and will not receive any payout.
              </p>
              
              {fetchingRiders ? (
                <div className="py-8 text-center text-sm text-neutral-500 font-medium animate-pulse">
                  Loading available riders...
                </div>
              ) : (
                <select
                  value={selectedRiderId}
                  onChange={(e) => setSelectedRiderId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-neutral-700"
                >
                  <option value="">-- Select Rider --</option>
                  {availableRiders.map((rider) => (
                    <option key={rider._id} value={rider._id}>
                      {rider.name} ({rider.mobile}) - {rider.status}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="px-6 py-4 border-t border-neutral-100 flex justify-end gap-3 bg-neutral-50">
              <button
                onClick={() => setIsReassignModalOpen(false)}
                className="px-4 py-2 font-bold text-sm text-neutral-600 hover:text-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!selectedRiderId || updating === selectedRequest._id}
                onClick={() => handleManualReassign(selectedRequest._id)}
                className="px-6 py-2 font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm shadow-indigo-200"
              >
                {updating === selectedRequest._id ? "Assigning..." : "Assign Rider"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Transaction Modal */}
      {isRefundModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-emerald-50/50">
              <h3 className="text-lg font-bold text-neutral-800">Process Refund</h3>
              <button
                onClick={() => setIsRefundModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-neutral-600 mb-4">
                Please enter the Refund Transaction ID (Required for customer reference).
              </p>
              
              <input
                type="text"
                placeholder="Transaction ID"
                value={refundTxId}
                onChange={(e) => setRefundTxId(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium text-neutral-700"
                autoFocus
              />
            </div>
            <div className="px-6 py-4 border-t border-neutral-100 flex justify-end gap-3 bg-neutral-50">
              <button
                onClick={() => setIsRefundModalOpen(false)}
                className="px-4 py-2 font-bold text-sm text-neutral-600 hover:text-neutral-800 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={!refundTxId || updating === returnToComplete}
                onClick={handleCompleteReturn}
                className="px-6 py-2 font-bold text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm shadow-emerald-200"
              >
                {updating === returnToComplete ? "Processing..." : "Complete & Refund"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-sm text-neutral-500 py-4">
        Copyright © 2026. Developed By{" "}
        <a href="#" className="text-teal-600 hover:text-teal-700">
          vrushahi e-Commerce
        </a>
      </div>
    </div>
  );
}
