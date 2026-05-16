import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DeliveryHeader from '../components/DeliveryHeader';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import {
  getReturnPickupDetails,
  sendCustomerReturnOtp,
  verifyCustomerReturnOtp,
  sendSellerReturnOtp,
  verifySellerReturnOtp
} from '../../../services/api/delivery/deliveryService';
import { uploadImage } from '../../../services/api/uploadService';
import { useDeliveryOrderNotifications } from '../../../hooks/useDeliveryOrderNotifications';

export default function DeliveryReturnOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [returnReq, setReturnReq] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Dual OTP state
  const [customerOtpInput, setCustomerOtpInput] = useState('');
  const [sellerOtpInput, setSellerOtpInput] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [customerOtpSent, setCustomerOtpSent] = useState(false);
  const [sellerOtpSent, setSellerOtpSent] = useState(false);

  // QC state
  const [qcStatus, setQcStatus] = useState<'Passed' | 'Failed'>('Passed');
  const [qcNotes, setQcNotes] = useState('');
  const [riderImages, setRiderImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  // Socket for live OTP listening
  const { socket } = useDeliveryOrderNotifications();

  const fetchDetails = async () => {
    try {
      setLoading(true);
      if (!id) return;
      const data = await getReturnPickupDetails(id);
      setReturnReq(data);
      if (data.qcStatus) setQcStatus(data.qcStatus);
      if (data.qcNotes) setQcNotes(data.qcNotes);
      if (data.riderImages && data.riderImages.length > 0) {
        setRiderImages(data.riderImages);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch return pickup details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  useEffect(() => {
    if (!socket || !returnReq) return;

    const handleCustOtp = (data: any) => {
      if (data.returnId === id) {
        setSuccessMsg(`Customer OTP sent successfully`);
      }
    };

    const handleSellOtp = (data: any) => {
      if (data.returnId === id) {
        setSuccessMsg(`Seller OTP sent successfully`);
      }
    };

    socket.on('return-otp-sent', handleCustOtp);
    socket.on('return-handover-otp-sent', handleSellOtp);

    return () => {
      socket.off('return-otp-sent', handleCustOtp);
      socket.off('return-handover-otp-sent', handleSellOtp);
    };
  }, [socket, returnReq, id]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setError('');
      const result = await uploadImage(file);
      if (result.secureUrl || result.url) {
        const url = result.secureUrl || result.url;
        setRiderImages([...riderImages, url]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSendCustomerOtp = async () => {
    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');
      const res = await sendCustomerReturnOtp(id!);
      setSuccessMsg(res.message || 'Customer OTP generated successfully');
      setCustomerOtpSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send Customer OTP');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyCustomerOtp = async () => {
    if (!customerOtpInput || customerOtpInput.length !== 4) {
      setError('Please enter a valid 4-digit Customer OTP');
      return;
    }
    if (riderImages.length === 0) {
      setError('Please upload at least 1 image of the item before picking up.');
      return;
    }
    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');
      const res = await verifyCustomerReturnOtp(id!, customerOtpInput, qcStatus, qcNotes, riderImages);
      setSuccessMsg(res.message || 'Customer OTP verified! Item is now With Rider.');
      await fetchDetails();
    } catch (err: any) {
      setError(err.message || 'Invalid Customer OTP or verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendSellerOtp = async () => {
    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');
      const res = await sendSellerReturnOtp(id!);
      setSuccessMsg(res.message || 'Seller Handover OTP generated successfully');
      setSellerOtpSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send Seller OTP');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifySellerOtp = async () => {
    if (!sellerOtpInput || sellerOtpInput.length !== 4) {
      setError('Please enter a valid 4-digit Seller OTP');
      return;
    }
    try {
      setActionLoading(true);
      setError('');
      setSuccessMsg('');
      const res = await verifySellerReturnOtp(id!, sellerOtpInput);
      setSuccessMsg(res.message || 'Seller Handover OTP verified! Return is now complete.');
      await fetchDetails();
    } catch (err: any) {
      setError(err.message || 'Invalid Seller Handover OTP or verification failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-100 flex items-center justify-center pb-20">
        <p className="text-neutral-500">Loading return details...</p>
        <DeliveryBottomNav />
      </div>
    );
  }

  if (!returnReq) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center pb-20 px-4">
        <p className="text-red-500 mb-4">{error || 'Return request not found'}</p>
        <button onClick={() => navigate(-1)} className="px-4 py-2 bg-neutral-200 rounded-lg text-neutral-700">
          Go Back
        </button>
        <DeliveryBottomNav />
      </div>
    );
  }

  const orderItem = returnReq.orderItem || {};
  const order = returnReq.order || {};
  const customer = returnReq.customer || {};
  const isWithRider = returnReq.productCustody === 'With Rider';
  const isWithSeller = returnReq.productCustody === 'With Seller';

  return (
    <div className="min-h-screen bg-neutral-100 pb-20">
      <DeliveryHeader />
      <div className="px-4 py-4 max-w-xl mx-auto space-y-4">
        {/* Top bar */}
        <div className="flex items-center">
          <button onClick={() => navigate(-1)} className="mr-3 p-2 hover:bg-neutral-200 rounded-full transition-colors">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h2 className="text-neutral-900 text-xl font-bold">Return Pickup Detail</h2>
        </div>

        {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}
        {successMsg && <div className="p-3 bg-teal-100 text-teal-800 rounded-lg text-sm font-semibold">{successMsg}</div>}

        {/* Status / Custody Banner */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs text-neutral-500">Custody Status</p>
            <p className="text-base font-bold text-neutral-900">{returnReq.productCustody || 'With Customer'}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            isWithSeller ? 'bg-teal-100 text-teal-800' : isWithRider ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
          }`}>
            {returnReq.pickupStatus || 'Pending Pickup'}
          </span>
        </div>

        {/* Customer & Product Info */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 space-y-3">
          <h3 className="font-bold text-neutral-900 border-b pb-2">Pickup Information</h3>
          <div>
            <p className="text-xs text-neutral-500">Customer</p>
            <p className="font-semibold text-neutral-900">{customer.name || order.customerName}</p>
            <p className="text-xs text-neutral-600">{customer.phone || order.customerPhone}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Pickup Address</p>
            <p className="text-sm text-neutral-800">{order.deliveryAddress?.address}, {order.deliveryAddress?.city} - {order.deliveryAddress?.pincode}</p>
          </div>

          <div className="border-t pt-2">
            <p className="text-xs text-neutral-500">Item to Collect</p>
            <div className="flex items-center gap-3 mt-1">
              {orderItem.productImage && (
                <img src={orderItem.productImage} alt="Product" className="w-12 h-12 rounded object-cover border" />
              )}
              <div>
                <p className="font-semibold text-neutral-900 text-sm">{orderItem.productName}</p>
                <p className="text-xs text-neutral-600">Variation: {orderItem.variation} | Qty: {orderItem.quantity}</p>
              </div>
            </div>
          </div>

          <div className="border-t pt-2">
            <p className="text-xs text-neutral-500">Return Reason</p>
            <p className="text-sm font-semibold text-red-600">{returnReq.reason}</p>
            {returnReq.description && <p className="text-xs text-neutral-600 mt-1 italic">"{returnReq.description}"</p>}
          </div>

          {returnReq.images && returnReq.images.length > 0 && (
            <div>
              <p className="text-xs text-neutral-500 mb-1">Customer Uploaded Images</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {returnReq.images.map((img: string, idx: number) => (
                  <img key={idx} src={img} alt="Return" className="w-16 h-16 rounded object-cover border" />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Seller / Drop-off Info */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-neutral-200 space-y-3">
          <h3 className="font-bold text-neutral-900 border-b pb-2">Drop-off Information</h3>
          <div>
            <p className="text-xs text-neutral-500">Seller / Store</p>
            <p className="font-semibold text-neutral-900">{orderItem.seller?.storeName || 'N/A'}</p>
            <p className="text-xs text-neutral-600">Phone: {orderItem.seller?.mobile || 'N/A'}</p>
            <p className="text-xs text-neutral-600">Contact Person: {orderItem.seller?.sellerName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Drop-off Address</p>
            <p className="text-sm text-neutral-800">{orderItem.seller?.address || 'N/A'}</p>
          </div>
        </div>

        {/* Stage 1: Customer Pickup & QC */}
        <div className={`bg-white p-4 rounded-xl shadow-sm border ${!returnReq.customerOtpVerified ? 'border-amber-500' : 'border-neutral-200'} space-y-4`}>
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="font-bold text-neutral-900">Stage 1: Customer Handover & QC</h3>
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${returnReq.customerOtpVerified ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'}`}>
              {returnReq.customerOtpVerified ? 'Completed' : 'Pending'}
            </span>
          </div>

          {!returnReq.customerOtpVerified ? (
            <div className="space-y-4">
              {/* QC Input */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-neutral-800">1. Quality Inspection Status</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="qcStatus" value="Passed" checked={qcStatus === 'Passed'} onChange={() => setQcStatus('Passed')} className="accent-teal-600" />
                    <span className="text-sm font-medium text-neutral-800">Passed (Good Condition)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="qcStatus" value="Failed" checked={qcStatus === 'Failed'} onChange={() => setQcStatus('Failed')} className="accent-red-600" />
                    <span className="text-sm font-medium text-neutral-800">Failed (Damaged/Mismatch)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">QC Inspection Notes</label>
                <textarea
                  placeholder="Note any defects, scratches, or package condition..."
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm text-neutral-800"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1">Upload Product Photos (Mandatory)</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    id="qc-image-upload"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="qc-image-upload"
                    className={`flex-1 p-3 border-2 border-dashed rounded-lg text-sm text-center cursor-pointer transition-colors ${
                      isUploading ? 'bg-neutral-100 border-neutral-300 text-neutral-500' : 'border-neutral-300 hover:border-neutral-400 text-neutral-600'
                    }`}
                  >
                    {isUploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-neutral-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading...
                      </span>
                    ) : (
                      '📸 Click to Take Photo or Select from Gallery'
                    )}
                  </label>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {riderImages.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img src={img} alt="QC" className="w-16 h-16 rounded object-cover border" />
                      <button
                        type="button"
                        onClick={() => setRiderImages(riderImages.filter((_, i) => i !== idx))}
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {riderImages.length === 0 && <p className="text-xs text-neutral-400 italic">No images added yet.</p>}
                </div>
              </div>

              {/* OTP Section */}
              <div className="border-t pt-3 space-y-3">
                <p className="text-sm font-semibold text-neutral-800">2. Customer Handover OTP</p>
                <button
                  type="button"
                  onClick={handleSendCustomerOtp}
                  disabled={actionLoading}
                  className="w-full py-3 bg-amber-600 text-white rounded-lg text-sm font-bold hover:bg-amber-700 disabled:opacity-50 transition-colors"
                >
                  Send OTP to Customer
                </button>
                
                {customerOtpSent && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="Enter OTP"
                      value={customerOtpInput}
                      onChange={(e) => setCustomerOtpInput(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 min-w-0 p-3 border rounded-lg text-lg font-bold tracking-widest text-center text-neutral-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={handleVerifyCustomerOtp}
                      disabled={actionLoading}
                      className="shrink-0 px-4 py-3 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700 disabled:opacity-50 transition-colors"
                    >
                      Verify
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg space-y-2">
                <p className="text-xs text-teal-800 font-bold">✓ Customer OTP Verified</p>
                <p className="text-xs text-neutral-600">QC Status: <span className={`font-bold ${returnReq.qcStatus === 'Passed' ? 'text-teal-700' : 'text-red-600'}`}>{returnReq.qcStatus}</span></p>
                {returnReq.qcNotes && <p className="text-xs text-neutral-600 italic">Notes: "{returnReq.qcNotes}"</p>}
                {returnReq.riderImages && returnReq.riderImages.length > 0 && (
                  <div className="flex gap-2 mt-1">
                    {returnReq.riderImages.map((img: string, i: number) => (
                      <img key={i} src={img} alt="QC" className="w-12 h-12 rounded object-cover border" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stage 2: Seller Handover */}
        {returnReq.customerOtpVerified && (
          <div className={`bg-white p-4 rounded-xl shadow-sm border ${!returnReq.sellerOtpVerified ? 'border-teal-500' : 'border-neutral-200'} space-y-4`}>
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-bold text-neutral-900">Stage 2: Seller Return Handover</h3>
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${returnReq.sellerOtpVerified ? 'bg-teal-100 text-teal-800' : 'bg-blue-100 text-blue-800'}`}>
                {returnReq.sellerOtpVerified ? 'Completed' : 'Pending'}
              </span>
            </div>

            {!returnReq.sellerOtpVerified ? (
              <div className="space-y-3">
                <p className="text-xs text-neutral-600">Return the physical item to the seller store and collect their handover OTP.</p>
                <button
                  type="button"
                  onClick={handleSendSellerOtp}
                  disabled={actionLoading}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Send OTP to Seller
                </button>
                
                {sellerOtpSent && (
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="Enter OTP"
                      value={sellerOtpInput}
                      onChange={(e) => setSellerOtpInput(e.target.value.replace(/\D/g, ''))}
                      className="flex-1 min-w-0 p-3 border rounded-lg text-lg font-bold tracking-widest text-center text-neutral-900 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                    />
                    <button
                      type="button"
                      onClick={handleVerifySellerOtp}
                      disabled={actionLoading}
                      className="shrink-0 px-4 py-3 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700 disabled:opacity-50 transition-colors"
                    >
                      Verify
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-teal-50 border border-teal-100 rounded-lg">
                <p className="text-xs text-teal-800 font-bold">✓ Seller Handover OTP Verified</p>
                <p className="text-xs text-neutral-600 mt-0.5">Product successfully handed over to seller. Settlement fee processed.</p>
              </div>
            )}
          </div>
        )}
      </div>
      <DeliveryBottomNav />
    </div>
  );
}
