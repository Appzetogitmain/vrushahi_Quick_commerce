import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DeliveryHeader from '../components/DeliveryHeader';
import DeliveryBottomNav from '../components/DeliveryBottomNav';
import { useDeliveryUser } from '../context/DeliveryUserContext';
import { getDeliveryProfile, updateProfile, resubmitProfile } from '../../../services/api/delivery/deliveryService';
import { useToast } from '../../../context/ToastContext';

export default function DeliveryProfile() {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const { userName, setUserName } = useDeliveryUser();
  const { showToast } = useToast();
  const [isUploadingPv, setIsUploadingPv] = useState(false);

  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    vehicleNumber: '',
    vehicleType: 'Bike',
    joinDate: '',
    totalDeliveries: 0,
    rating: 0,
    accountName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    upiId: '',
    policeVerificationForm: '',
    policeVerificationDeadline: '',
    status: '',
    rejectionReason: '',
  });

  // Fetch profile data on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getDeliveryProfile();
        setProfileData({
          name: data.name,
          phone: data.mobile,
          email: data.email,
          address: data.address,
          vehicleNumber: data.vehicleNumber || '',
          vehicleType: data.vehicleType || 'Bike',
          joinDate: new Date(data.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          totalDeliveries: data.totalDeliveredCount || 0, // Assuming backend sends this or we need to fetch dashboard stats
          rating: 4.8, // Mock for now
          accountName: data.accountName || '',
          bankName: data.bankName || '',
          accountNumber: data.accountNumber || '',
          ifscCode: data.ifscCode || '',
          upiId: data.upiId || '',
          policeVerificationForm: data.policeVerificationForm || '',
          policeVerificationDeadline: data.policeVerificationDeadline || '',
          status: data.status || '',
          rejectionReason: data.rejectionReason || '',
        });
        setUserName(data.name);
      } catch (error) {
        console.error("Failed to fetch profile", error);
      }
    };
    fetchProfile();
  }, [setUserName]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Re-fetch or reset to previous state
  };

  const handleSave = async () => {
    // Validation
    if (!profileData.name.trim()) {
      showToast("Name is required", "error");
      return;
    }
    if (/\d/.test(profileData.name)) {
      showToast("Name should not contain numbers", "error");
      return;
    }
    if (profileData.name.length < 3) {
      showToast("Name should be at least 3 characters", "error");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (profileData.email && !emailRegex.test(profileData.email)) {
      showToast("Please enter a valid email address", "error");
      return;
    }

    if (profileData.phone.length !== 10) {
      showToast("Phone number must be 10 digits", "error");
      return;
    }

    if (!profileData.vehicleNumber.trim()) {
      showToast("Vehicle number is required", "error");
      return;
    }

    if (profileData.accountName && /\d/.test(profileData.accountName)) {
      showToast("Account holder name should not contain numbers", "error");
      return;
    }

    if (profileData.bankName && /\d/.test(profileData.bankName)) {
      showToast("Bank name should not contain numbers", "error");
      return;
    }

    if (profileData.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(profileData.ifscCode)) {
      showToast("Please enter a valid IFSC code (e.g. SBIN0001234)", "error");
      return;
    }

    if (profileData.accountNumber && !/^\d{9,18}$/.test(profileData.accountNumber)) {
      showToast("Account number should be between 9 and 18 digits", "error");
      return;
    }

    const upiRegex = /^[\w.-]+@[\w.-]+$/;
    if (profileData.upiId && !upiRegex.test(profileData.upiId)) {
      showToast("Please enter a valid UPI ID (e.g. name@okaxis)", "error");
      return;
    }

    try {
      await updateProfile({
        name: profileData.name,
        email: profileData.email,
        address: profileData.address,
        vehicleNumber: profileData.vehicleNumber,
        vehicleType: profileData.vehicleType,
        accountName: profileData.accountName,
        bankName: profileData.bankName,
        accountNumber: profileData.accountNumber,
        ifscCode: profileData.ifscCode,
        upiId: profileData.upiId,
        policeVerificationForm: profileData.policeVerificationForm
      });
      setUserName(profileData.name);
      setIsEditing(false);
      showToast("Profile updated successfully", "success");
    } catch (error: any) {
      console.error("Failed to update profile", error);
      showToast(error.response?.data?.message || "Failed to update profile", "error");
    }
  };

  const handlePvUpload = async (file: File) => {
    try {
      setIsUploadingPv(true);
      const { uploadDocumentPublic } = await import('../../../services/api/uploadService');
      const result = await uploadDocumentPublic(file, 'vrushahi/delivery/documents');
      
      // Update local state
      setProfileData(prev => ({ ...prev, policeVerificationForm: result.secureUrl }));

      // Immediately save to database to avoid data loss on refresh
      await updateProfile({
        policeVerificationForm: result.secureUrl
      });

      showToast("Police Verification form uploaded and saved successfully!", "success");
    } catch (err: any) {
      console.error("PV upload failed:", err);
      showToast(err.response?.data?.message || "Upload failed. Please try again.", "error");
    } finally {
      setIsUploadingPv(false);
    }
  };

  const handleResubmit = async () => {
    try {
      await resubmitProfile();
      setProfileData(prev => ({ ...prev, status: 'Inactive', rejectionReason: '' }));
      showToast("Profile resubmitted for approval successfully!", "success");
    } catch (err: any) {
      console.error("Resubmit failed:", err);
      showToast(err.message || "Failed to resubmit. Please try again.", "error");
    }
  };


  const handleInputChange = (field: string, value: string) => {
    let finalValue = value;

    // Prevent numbers in Name, Account Holder Name, and Bank Name
    if (['name', 'accountName', 'bankName'].includes(field)) {
      if (/\d/.test(value)) {
        showToast("Numbers are not allowed in this field", "error");
        finalValue = value.replace(/[0-9]/g, '');
      }
    }

    // Phone should be only numbers, max 10
    if (field === 'phone') {
      if (/[^\d]/.test(value)) {
        showToast("Only numbers allowed in phone", "error");
        finalValue = value.replace(/\D/g, '').slice(0, 10);
      } else {
        finalValue = value.slice(0, 10);
      }
    }

    // Account Number should be only numbers, max 18
    if (field === 'accountNumber') {
      if (/[^\d]/.test(value)) {
        showToast("Only numbers allowed in account number", "error");
        finalValue = value.replace(/\D/g, '').slice(0, 18);
      } else {
        finalValue = value.slice(0, 18);
      }
    }

    // IFSC should be uppercase alphanumeric, max 11
    if (field === 'ifscCode') {
      finalValue = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    }

    setProfileData((prev) => ({
      ...prev,
      [field]: finalValue,
    }));
  };

  return (
    <div className="min-h-screen bg-neutral-100 pb-20">
      <div className="px-4 py-4">
        <div className="flex items-center mb-4">
          <button
            onClick={() => navigate(-1)}
            className="mr-3 p-2 hover:bg-neutral-200 rounded-full transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <h2 className="text-neutral-900 text-xl font-semibold">Profile</h2>
        </div>

        {/* Rejected Status Alert */}
        {profileData.status === 'Rejected' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <div className="bg-red-100 p-2 rounded-full mt-0.5">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div>
                <h3 className="text-red-800 font-bold text-sm mb-1">Account Rejected</h3>
                <p className="text-red-700 text-xs mb-3">{profileData.rejectionReason || 'Please review your documents and try again.'}</p>
                <button
                  onClick={handleResubmit}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                  Resubmit for Approval
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-neutral-200 mb-4">
          <div className="flex flex-col items-center mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center mb-4">
              <span className="text-white text-3xl font-bold">
                {profileData.name.split(' ').map(n => n[0]).join('')}
              </span>
            </div>
            {isEditing ? (
              <div className="w-full max-w-xs">
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="w-full text-center text-neutral-900 text-xl font-semibold mb-2 px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  className="w-full text-center text-neutral-600 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            ) : (
              <>
                <h3 className="text-neutral-900 text-xl font-semibold mb-1">{profileData.name}</h3>
                <p className="text-neutral-600 text-sm">{profileData.phone}</p>
              </>
            )}
            <div className="flex items-center gap-1 mt-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                  fill="#22c55e"
                />
              </svg>
              <span className="text-neutral-900 font-semibold">{profileData.rating}</span>
            </div>
          </div>
        </div>

        {/* Profile Details */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="text-neutral-900 font-semibold">Personal Information</h3>
          </div>
          <div className="divide-y divide-neutral-200">
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Email</p>
              {isEditing ? (
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.email}</p>
              )}
            </div>
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Address</p>
              {isEditing ? (
                <textarea
                  value={profileData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={2}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                />
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.address}</p>
              )}
            </div>
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Vehicle Number</p>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.vehicleNumber}
                  onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.vehicleNumber}</p>
              )}
            </div>
            <div className="p-4">
              <p className="text-neutral-500 text-xs mb-1">Vehicle Type</p>
              {isEditing ? (
                <select
                  value={profileData.vehicleType}
                  onChange={(e) => handleInputChange('vehicleType', e.target.value)}
                  className="w-full text-neutral-900 text-sm px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="Bike">Bike</option>
                  <option value="Scooter">Scooter</option>
                  <option value="Car">Car</option>
                  <option value="Cycle">Cycle</option>
                </select>
              ) : (
                <p className="text-neutral-900 text-sm">{profileData.vehicleType}</p>
              )}
            </div>
          </div>
        </div>

        {/* Payout Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden mt-6">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50/50 flex items-center justify-between">
            <h3 className="text-neutral-900 font-bold flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/></svg>
              </div>
              Payout Details
            </h3>
            {profileData.accountNumber && (
              <span className="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase tracking-widest rounded-md border border-green-100">
                Linked
              </span>
            )}
          </div>
          <div className="divide-y divide-neutral-200">
            <div className="p-4">
              <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Account Holder Name</p>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.accountName}
                  onChange={(e) => handleInputChange('accountName', e.target.value)}
                  placeholder="Enter as per bank record"
                  className="w-full text-neutral-900 text-sm font-semibold px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                />
              ) : (
                <p className="text-neutral-900 text-sm font-bold">{profileData.accountName || 'Not added'}</p>
              )}
            </div>
            <div className="grid grid-cols-2 divide-x divide-neutral-200">
              <div className="p-4">
                <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Bank Name</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.bankName}
                    onChange={(e) => handleInputChange('bankName', e.target.value)}
                    placeholder="e.g. HDFC"
                    className="w-full text-neutral-900 text-sm font-semibold px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                  />
                ) : (
                  <p className="text-neutral-900 text-sm font-bold">{profileData.bankName || 'N/A'}</p>
                )}
              </div>
              <div className="p-4">
                <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-1.5">IFSC Code</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={profileData.ifscCode}
                    onChange={(e) => handleInputChange('ifscCode', e.target.value)}
                    placeholder="HDFC0001234"
                    className="w-full text-neutral-900 text-sm font-semibold px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                  />
                ) : (
                  <p className="text-neutral-900 text-sm font-bold uppercase">{profileData.ifscCode || 'N/A'}</p>
                )}
              </div>
            </div>
            <div className="p-4">
              <p className="text-neutral-400 text-[10px] font-black uppercase tracking-widest mb-1.5">Account Number</p>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.accountNumber}
                  onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                  placeholder="00000000000000"
                  className="w-full text-neutral-900 text-sm font-semibold px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
                />
              ) : (
                <p className="text-neutral-900 text-sm font-bold tracking-widest">{profileData.accountNumber || 'N/A'}</p>
              )}
            </div>
            <div className="p-4 bg-orange-50/50">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-orange-600 text-[10px] font-black uppercase tracking-widest">UPI ID (Instant Payout)</p>
                <div className="w-4 h-4 bg-orange-200 rounded-full flex items-center justify-center">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="3"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                </div>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={profileData.upiId}
                  onChange={(e) => handleInputChange('upiId', e.target.value)}
                  placeholder="username@bank"
                  className="w-full text-neutral-900 text-sm font-bold px-4 py-3 bg-white border border-orange-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                />
              ) : (
                <p className="text-neutral-900 text-sm font-black text-orange-700">{profileData.upiId || 'Not added'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Police Verification Section */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden mt-4">
          <div className="p-4 border-b border-neutral-200 bg-neutral-50/50">
            <h3 className="text-neutral-900 font-semibold flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Police Verification
            </h3>
          </div>
          <div className="p-4">
            {profileData.policeVerificationForm ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#22c55e"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                    <span className="text-green-700 text-sm font-bold uppercase tracking-tight">Verified / Uploaded</span>
                  </div>
                  <a 
                    href={profileData.policeVerificationForm} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-teal-600 text-xs font-bold underline"
                  >
                    View File
                  </a>
                </div>
                {isEditing && (
                  <div>
                    <label className="block text-neutral-500 text-[10px] font-bold uppercase mb-2">Replace Document</label>
                    <input 
                      type="file" 
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePvUpload(file);
                      }}
                      className="w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                  <div className="flex items-center gap-2 mb-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#eab308"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                    <span className="text-yellow-700 text-sm font-bold uppercase tracking-tight">Missing Verification</span>
                  </div>
                  {profileData.policeVerificationDeadline && (
                    <p className="text-[10px] text-yellow-600 font-medium">
                      Deadline: {new Date(profileData.policeVerificationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {new Date(profileData.policeVerificationDeadline) < new Date() && (
                        <span className="text-red-600 ml-2 font-black">EXPIRED</span>
                      )}
                    </p>
                  )}
                </div>
                <div>
                  <input 
                    type="file" 
                    accept="image/*,.pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handlePvUpload(file);
                    }}
                    className="w-full text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                  />
                  {isUploadingPv && <p className="text-[10px] text-orange-500 mt-1 animate-pulse">Uploading...</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-xl shadow-sm border border-neutral-200 mt-4 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-neutral-500 text-xs mb-1">Total Deliveries</p>
              <p className="text-neutral-900 text-2xl font-bold">{profileData.totalDeliveries}</p>
            </div>
            <div className="text-center">
              <p className="text-neutral-500 text-xs mb-1">Joined On</p>
              <p className="text-neutral-900 text-sm font-semibold">{profileData.joinDate}</p>
            </div>
          </div>
        </div>

        {/* Edit/Save/Cancel Buttons */}
        {isEditing ? (
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCancel}
              className="flex-1 bg-neutral-200 text-neutral-900 rounded-xl py-3 font-semibold hover:bg-neutral-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 bg-orange-500 text-white rounded-xl py-3 font-semibold hover:bg-orange-600 transition-colors"
            >
              Save Changes
            </button>
          </div>
        ) : (
          <button
            onClick={handleEdit}
            className="w-full mt-4 bg-orange-500 text-white rounded-xl py-3 font-semibold hover:bg-orange-600 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>
      <DeliveryBottomNav />
    </div>
  );
}

