import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { getSellerProfile, updateSellerProfile, sendDeleteOtp, deleteSellerAccount } from '../../../services/api/auth/sellerAuthService';
import { useAuth } from '../../../context/AuthContext';
import { getCategories, Category } from '../../../services/api/categoryService';
import { uploadImage } from '../../../services/api/uploadService';
import GoogleMapsAutocomplete from '../../../components/GoogleMapsAutocomplete';
import LocationPickerMap from '../../../components/LocationPickerMap';
import { calculateProfileCompletion } from '../utils/profileCompletion';
import { useToast } from '../../../context/ToastContext';
import { validateEmail } from '../../../utils/validation';

const SellerAccountSettings = () => {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);

  // Delete Account States & Flow
  const [deleteStep, setDeleteStep] = useState(0); // 0 = Closed, 1 = Warning, 2 = OTP Re-Auth, 3 = Confirmation Text
  const [deleteOtp, setDeleteOtp] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [otpSending, setOtpSending] = useState(false);

  const startDeleteFlow = () => {
    setDeleteStep(1);
    setDeleteOtp('');
    setDeleteConfirmText('');
  };

  const handleSendDeleteOtp = async () => {
    try {
      setOtpSending(true);
      const res = await sendDeleteOtp();
      if (res.success) {
        showToast(res.message || 'OTP sent successfully to registered number', 'success');
        setDeleteStep(2);
      } else {
        showToast(res.message || 'Failed to send OTP', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to send OTP', 'error');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtpAndNext = () => {
    if (!deleteOtp || !/^[0-9]{4}$/.test(deleteOtp)) {
      showToast('Please enter a valid 4-digit verification OTP', 'error');
      return;
    }
    setDeleteStep(3);
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText !== 'DELETE') {
      showToast('Please type DELETE to confirm', 'error');
      return;
    }

    try {
      setDeleting(true);
      const res = await deleteSellerAccount({ otp: deleteOtp, confirmText: 'DELETE' });
      if (res.success) {
        showToast('Your seller account has been deleted successfully', 'success');
        setDeleteStep(0);
        logout();
        navigate('/login');
      } else {
        showToast(res.message || 'Deletion failed', 'error');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Deletion failed';
      showToast(errMsg, 'error');
      if (errMsg.toLowerCase().includes('otp')) {
        setDeleteStep(2); // Send back to OTP step if OTP is invalid
      }
    } finally {
      setDeleting(false);
    }
  };

  // Lock background scroll when Delete Modal is active
  useEffect(() => {
    if (deleteStep > 0) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [deleteStep]);

  // Initial state with empty values
  const [sellerData, setSellerData] = useState({
    sellerName: '',
    email: '',
    mobile: '',
    storeName: '',
    category: '',
    address: '',
    city: '',
    searchLocation: '',
    latitude: '',
    longitude: '',
    serviceRadiusKm: '10',
    panCard: '',
    idProof: '',
    businessLicense: '',
    fssaiLicNo: '',
    taxName: '',
    taxNumber: '',
    accountName: '',
    bankName: '',
    branch: '',
    accountNumber: '',
    ifsc: '',
    upiId: '',
    profile: '',
    storeImage: '',
    logo: '',
    storeBanner: '',
    storeDescription: '',
    commission: 0,
    status: '',
    workingHours: {
      open: '09:00',
      close: '21:00',
      workingDays: [] as string[]
    }
  });

  useEffect(() => {
    fetchProfile();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await getCategories();
      if (res.success) setCategories(res.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await getSellerProfile();
      if (response.success) {
        const data = response.data;
        // Map location data to state
        const locationCoords = data.location?.coordinates || [];
        setSellerData({
          ...data,
          latitude: data.latitude || (locationCoords[1]?.toString() || ''),
          longitude: data.longitude || (locationCoords[0]?.toString() || ''),
          searchLocation: data.searchLocation || data.address || '',
          serviceRadiusKm: (data.serviceRadiusKm || 10).toString(),
          workingHours: data.workingHours || { open: '09:00', close: '21:00', workingDays: [] }
        });
      } else {
        showToast(response.message || 'Failed to fetch profile', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error loading profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === 'sellerName' && /[0-9]/.test(value)) {
      showToast('Numbers are not allowed in seller name', 'error');
      return;
    }

    // Handle nested workingHours
    if (name === 'open' || name === 'close') {
      setSellerData(prev => ({
        ...prev,
        workingHours: {
          ...prev.workingHours,
          [name]: value
        }
      }));
      return;
    }

    setSellerData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const toggleWorkingDay = (day: string) => {
    if (!isEditing) return;
    setSellerData(prev => {
      const days = prev.workingHours?.workingDays || [];
      const isSelected = days.includes(day);
      const newDays = isSelected 
        ? days.filter(d => d !== day) 
        : [...days, day];
      
      return {
        ...prev,
        workingHours: {
          ...prev.workingHours,
          workingDays: newDays
        }
      };
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'storeBanner' | 'profile' | 'storeImage' | 'idProof' | 'businessLicense') => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaveLoading(true);
      
      const result = await uploadImage(file, 'vrushahi/sellers');
      
      setSellerData(prev => ({
        ...prev,
        [type]: result.secureUrl
      }));
      
    } catch (err: any) {
      console.error('Upload error:', err);
      const message = err.response?.data?.message || err.message || 'Failed to upload image';
      showToast(message, 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaveLoading(true);

      // Validate Basic Info
      if (sellerData.sellerName && !/^[a-zA-Z\s]+$/.test(sellerData.sellerName)) {
        showToast('Name should only contain alphabets (a-z)', 'error');
        setSaveLoading(false);
        return;
      }

      if (sellerData.email) {
        const emailValidation = validateEmail(sellerData.email);
        if (!emailValidation.isValid) {
          showToast(emailValidation.error || 'Invalid email', 'error');
          setSaveLoading(false);
          return;
        }
      }

      if (sellerData.mobile && sellerData.mobile.length !== 10) {
        showToast('Mobile number must be exactly 10 digits', 'error');
        setSaveLoading(false);
        return;
      }

      // Validate Bank Details
      if (sellerData.accountName && !/^[a-zA-Z\s]+$/.test(sellerData.accountName)) {
        showToast('Account holder name should only contain alphabets', 'error');
        setSaveLoading(false);
        return;
      }

      if (sellerData.bankName && !/^[a-zA-Z\s]+$/.test(sellerData.bankName)) {
        showToast('Bank name should only contain alphabets', 'error');
        setSaveLoading(false);
        return;
      }

      if (sellerData.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(sellerData.ifsc)) {
        showToast('Please enter a valid IFSC code (e.g. SBIN0012345)', 'error');
        setSaveLoading(false);
        return;
      }

      if (sellerData.accountNumber && (sellerData.accountNumber.length < 9 || sellerData.accountNumber.length > 18)) {
        showToast('Please enter a valid Bank Account Number (9-18 digits)', 'error');
        setSaveLoading(false);
        return;
      }

      // Validate location if address is being updated
      if (sellerData.searchLocation && (!sellerData.latitude || !sellerData.longitude)) {
        showToast('Please select a valid location using the map picker', 'error');
        setSaveLoading(false);
        return;
      }

      // Validate service radius
      const radius = parseFloat(sellerData.serviceRadiusKm);
      if (isNaN(radius) || radius < 0.1 || radius > 100) {
        showToast('Service radius must be between 0.1 and 100 kilometers', 'error');
        setSaveLoading(false);
        return;
      }

      const updateData = {
        ...sellerData,
        serviceRadiusKm: radius,
      };

      const response = await updateSellerProfile(updateData);
      if (response.success) {
        setIsEditing(false);
        showToast('Profile updated successfully!', 'success');
        const data = response.data;
        const locationCoords = data.location?.coordinates || [];
        setSellerData({
          ...data,
          latitude: data.latitude || (locationCoords[1]?.toString() || ''),
          longitude: data.longitude || (locationCoords[0]?.toString() || ''),
          searchLocation: data.searchLocation || data.address || '',
          serviceRadiusKm: (data.serviceRadiusKm || 10).toString(),
        });
        if (updateUser) {
          updateUser({
            ...user,
            ...data,
            id: data._id || user?.id
          });
        }
        showToast('Profile updated successfully!', 'success');
      } else {
        showToast(response.message || 'Failed to update profile', 'error');
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Error updating profile', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading && !sellerData.sellerName) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const tabs = [
    {
      id: 'profile',
      label: 'Profile Info',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'store',
      label: 'Store Details',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      )
    },
    {
      id: 'branding',
      label: 'Store Branding',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'bank',
      label: 'Bank & Tax',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      )
    },
    {
      id: 'hours',
      label: 'Business Hours',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
  ];

  const { percentage } = calculateProfileCompletion(sellerData);

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Settings</h1>
              <p className="mt-1 text-sm text-gray-500">Manage your store preferences and profile details</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsEditing(!isEditing)}
              className={`px-5 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm flex items-center gap-2 ${isEditing
                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                : 'bg-teal-600 text-white hover:bg-teal-700 hover:shadow-md'
                }`}
            >
              {isEditing ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                  Cancel Editing
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  Edit Profile
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <nav className="w-full lg:w-64 flex-shrink-0 space-y-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${activeTab === tab.id
                    ? 'bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                >
                  <span className={`${activeTab === tab.id ? 'text-teal-600' : 'text-gray-400'}`}>
                    {tab.icon}
                  </span>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Status Card */}
            <div className="mt-6 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-5 text-white shadow-lg overflow-hidden relative">
              <div className="absolute -right-4 -top-4 w-16 h-16 bg-white/10 rounded-full blur-xl" />
              <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-indigo-400/20 rounded-full blur-xl" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full border border-white/10">
                    Profile Setup
                  </span>
                  <span className="text-sm font-bold">{percentage}%</span>
                </div>
                
                {/* Progress Bar */}
                <div className="h-2 w-full bg-white/20 rounded-full mb-4 overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold border border-white/20">
                    {sellerData.sellerName?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold truncate text-sm">{sellerData.sellerName}</p>
                    <p className="text-[10px] text-indigo-100 uppercase font-medium tracking-tight">Status: {sellerData.status || 'Active'}</p>
                  </div>
                </div>
              </div>
            </div>
          </nav>

          {/* Main Content Area */}
          <div className="flex-1">

            <form onSubmit={handleSubmit}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="p-6 md:p-8">
                    {activeTab === 'profile' && (
                      <div className="space-y-8">
                        <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-gray-100">
                          <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-tr from-teal-500 to-emerald-500 rounded-full blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                            <img
                              src={sellerData.profile || 'https://placehold.co/150'}
                              alt="Profile"
                              className="relative w-32 h-32 rounded-full object-cover border-4 border-white shadow-md bg-white"
                            />
                            {isEditing && (
                              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm z-10">
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(e, 'profile')}
                                />
                                <span className="text-white text-xs font-bold uppercase tracking-wider flex flex-col items-center gap-1">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                  Change
                                </span>
                              </label>
                            )}
                          </div>
                          <div className="text-center sm:text-left">
                            <h3 className="text-2xl font-bold text-gray-900">{sellerData.sellerName || 'Seller Name'}</h3>
                            <p className="text-gray-500 font-medium">{sellerData.email}</p>
                            <p className="text-xs text-gray-400 mt-1">Member since {new Date().getFullYear()}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <InputGroup label="Full Name" name="sellerName" value={sellerData.sellerName} onChange={handleInputChange} disabled={!isEditing} autoComplete="name" />
                          <InputGroup label="Email Address" name="email" value={sellerData.email} onChange={handleInputChange} disabled={!isEditing} type="email" autoComplete="email" />
                          <InputGroup label="Mobile Number" name="mobile" value={sellerData.mobile} onChange={handleInputChange} disabled={!isEditing} type="tel" autoComplete="tel" />

                          <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Password</label>
                            <div className="relative">
                              <input
                                type="password"
                                autoComplete="new-password"
                                placeholder="••••••••"
                                disabled={!isEditing}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none disabled:bg-gray-50/50 disabled:text-gray-500 transition-all placeholder:text-gray-300"
                              />
                            </div>
                            {isEditing && <p className="text-xs text-gray-400 ml-1">Leave blank to keep current password</p>}
                          </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="mt-12 pt-8 border-t border-red-100">
                          <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
                            Deleting your account is a permanent action. All your product listings, store branding, balance history, and profile data will be permanently cleared.
                          </p>
                          <button
                            type="button"
                            onClick={startDeleteFlow}
                            className="px-5 py-2.5 rounded-lg font-bold text-xs bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors shadow-sm uppercase tracking-wider cursor-pointer"
                          >
                            Delete Account
                          </button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'store' && (
                      <div className="space-y-8">
                        <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-gray-100">
                          <div className="relative group flex-shrink-0">
                            <div className="w-24 h-24 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden">
                              <img
                                src={sellerData.logo || 'https://placehold.co/100'}
                                alt="Store Logo"
                                className="w-full h-full object-contain"
                              />
                            </div>
                            {isEditing && (
                              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm">
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(e, 'logo')}
                                />
                                <span className="text-white text-xs font-bold">UPLOAD</span>
                              </label>
                            )}
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-gray-900">{sellerData.storeName || 'Store Name'}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-700 uppercase tracking-wide">
                                {sellerData.category || 'Category'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <InputGroup label="Store Name" name="storeName" value={sellerData.storeName} onChange={handleInputChange} disabled={!isEditing} />

                          <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Store Category</label>
                            <div className="relative">
                              <select
                                name="category"
                                value={sellerData.category}
                                onChange={handleInputChange}
                                disabled={!isEditing}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none disabled:bg-gray-50/50 disabled:text-gray-500 transition-all appearance-none bg-white"
                              >
                                <option value="">Select Category</option>
                                {categories.map(cat => (
                                  <option key={cat._id} value={cat.name}>{cat.name}</option>
                                ))}
                              </select>
                              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                              </div>
                            </div>
                          </div>

                          <div className="md:col-span-2 space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">
                              Store Location <span className="text-red-500">*</span>
                            </label>
                            {isEditing ? (
                              <>
                                <GoogleMapsAutocomplete
                                  value={sellerData.searchLocation || sellerData.address || ''}
                                  onChange={(address: string, lat: number, lng: number, placeName: string, components?: { city?: string; state?: string }) => {
                                    setSellerData(prev => ({
                                      ...prev,
                                      searchLocation: address,
                                      latitude: lat.toString(),
                                      longitude: lng.toString(),
                                      address: address,
                                      city: components?.city || prev.city,
                                    }));
                                  }}
                                  placeholder="Search and select your store location..."
                                  disabled={!isEditing}
                                  required
                                />
                                  <div className="mt-4 animate-fadeIn">
                                    <p className="text-sm font-medium text-neutral-700 mb-2">
                                      Exact Location <span className="text-teal-600 text-xs font-normal">(Move the map to place the pin on your store's entrance)</span>
                                    </p>
                                    <LocationPickerMap
                                      initialLat={parseFloat(sellerData.latitude) || 26.9124}
                                      initialLng={parseFloat(sellerData.longitude) || 75.7873}
                                      onLocationSelect={(lat, lng) => {
                                        setSellerData(prev => ({
                                          ...prev,
                                          latitude: lat.toString(),
                                          longitude: lng.toString()
                                        }));
                                      }}
                                    />
                                    <p className="mt-1 text-xs text-neutral-500 text-center">
                                      Selected Coordinates: {sellerData.latitude || 'Not selected'}, {sellerData.longitude || 'Not selected'}
                                    </p>
                                  </div>
                              </>
                            ) : (
                              <textarea
                                name="address"
                                value={sellerData.address || sellerData.searchLocation || ''}
                                disabled={true}
                                rows={3}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50/50 text-gray-500 resize-none"
                              />
                            )}
                          </div>

                          <InputGroup label="City" name="city" value={sellerData.city} onChange={handleInputChange} disabled={!isEditing} />

                          <div className="space-y-1.5">
                            <label className="text-sm font-semibold text-gray-700 ml-1">
                              Service Radius (KM) <span className="text-red-500">*</span>
                            </label>
                            <select
                              name="serviceRadiusKm"
                              value={sellerData.serviceRadiusKm}
                              onChange={handleInputChange}
                              disabled={!isEditing}
                              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none disabled:bg-gray-50/50 disabled:text-gray-500 transition-all appearance-none bg-white"
                            >
                              <option value="1">1 km</option>
                              <option value="2">2 km</option>
                              <option value="5">5 km</option>
                              <option value="10">10 km</option>
                              <option value="20">20 km</option>
                              <option value="50">50 km</option>
                            </select>
                            {isEditing && (
                              <p className="mt-1 text-xs text-gray-500">
                                Products will be shown to users within this radius from your store location
                              </p>
                            )}
                          </div>

                        </div>
                      </div>
                    )}

                    {activeTab === 'branding' && (
                      <div className="space-y-8">
                        <div className="space-y-3">
                          <label className="text-sm font-semibold text-gray-700 ml-1">Store Banner</label>
                          <div className="relative group rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 aspect-[21/9] transition-all hover:border-teal-300">
                            <img
                              src={sellerData.storeBanner || 'https://placehold.co/1200x400?text=Store+Banner'}
                              alt="Store Banner"
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            {isEditing && (
                              <label className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(e, 'storeBanner')}
                                />
                                <div className="bg-white/20 p-4 rounded-full border border-white/30 backdrop-blur-md">
                                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                </div>
                              </label>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 ml-1">Recommended size: 1200x400px. Supports JPG, PNG.</p>
                        </div>

                        <div className="space-y-3">
                          <label className="text-sm font-semibold text-gray-700 ml-1">Real Store Image</label>
                          <div className="relative group rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 aspect-video transition-all hover:border-teal-300">
                            <img
                              src={sellerData.storeImage || 'https://placehold.co/800x450?text=Store+Image'}
                              alt="Real Store Image"
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            {isEditing && (
                              <label className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleImageUpload(e, 'storeImage')}
                                />
                                <div className="bg-white/20 p-4 rounded-full border border-white/30 backdrop-blur-md">
                                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                </div>
                              </label>
                            )}
                          </div>
                          <div className="mt-2 p-3 bg-red-50 rounded-xl border border-red-100">
                            <p className="text-[10px] text-red-600 font-bold uppercase tracking-tight flex items-center gap-1.5">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                                <line x1="12" y1="9" x2="12" y2="13" />
                                <line x1="12" y1="17" x2="12.01" y2="17" />
                              </svg>
                              WARNING: Real store image ONLY
                            </p>
                            <p className="text-[11px] text-red-500 mt-1">
                              Fake or AI images will result in permanent rejection.
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="flex justify-between items-end">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Store Description</label>
                            <span className="text-xs text-gray-400">Displayed on your store page</span>
                          </div>
                          <textarea
                            name="storeDescription"
                            value={sellerData.storeDescription || ''}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            rows={6}
                            placeholder="Tell customers about your store, specialty, and heritage..."
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none disabled:bg-gray-50/50 disabled:text-gray-500 transition-all resize-none leading-relaxed"
                          />
                        </div>
                      </div>
                    )}

                    {activeTab === 'bank' && (
                      <div className="space-y-10">
                        <section>
                          <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Bank Details</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                            <InputGroup label="Account Holder Name" name="accountName" value={sellerData.accountName} onChange={handleInputChange} disabled={!isEditing} />
                            <InputGroup label="Bank Name" name="bankName" value={sellerData.bankName} onChange={handleInputChange} disabled={!isEditing} />
                            <InputGroup label="Account Number" name="accountNumber" value={sellerData.accountNumber} onChange={handleInputChange} disabled={!isEditing} />
                            <InputGroup label="IFSC Code" name="ifsc" value={sellerData.ifsc} onChange={handleInputChange} disabled={!isEditing} />
                            <div className="md:col-span-2">
                              <InputGroup label="UPI ID" name="upiId" value={sellerData.upiId} onChange={handleInputChange} disabled={!isEditing} placeholder="e.g. yourname@okaxis" />
                            </div>
                          </div>
                        </section>

                        <section>
                          <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Tax Information</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-gray-50/50 p-6 rounded-xl border border-gray-100">
                            <InputGroup label="PAN Card Number" name="panCard" value={sellerData.panCard} onChange={handleInputChange} disabled={!isEditing} />
                            <InputGroup label="Tax Number (GST)" name="taxNumber" value={sellerData.taxNumber} onChange={handleInputChange} disabled={!isEditing} />
                            <InputGroup label="FSSAI License No." name="fssaiLicNo" value={sellerData.fssaiLicNo} onChange={handleInputChange} disabled={!isEditing} placeholder="For food categories" />
                          </div>
                        </section>

                        <section>
                          <div className="flex items-center gap-3 mb-6 mt-8">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Legal Documents</h4>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                              <label className="text-sm font-semibold text-gray-700 ml-1">ID Proof (Aadhar/PAN)</label>
                              <div className="relative group rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 aspect-[4/3] transition-all hover:border-teal-300">
                                <img
                                  src={sellerData.idProof || 'https://placehold.co/400x300?text=ID+Proof'}
                                  alt="ID Proof"
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                {isEditing && (
                                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept="image/*"
                                      onChange={(e) => handleImageUpload(e, 'idProof')}
                                    />
                                    <div className="bg-white/20 p-4 rounded-full border border-white/30 backdrop-blur-md">
                                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    </div>
                                  </label>
                                )}
                              </div>
                            </div>

                            <div className="space-y-3">
                              <label className="text-sm font-semibold text-gray-700 ml-1">Business License</label>
                              <div className="relative group rounded-xl overflow-hidden bg-gray-100 border-2 border-dashed border-gray-300 aspect-[4/3] transition-all hover:border-teal-300">
                                <img
                                  src={sellerData.businessLicense || 'https://placehold.co/400x300?text=Business+License'}
                                  alt="Business License"
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                {isEditing && (
                                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm">
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept="image/*"
                                      onChange={(e) => handleImageUpload(e, 'businessLicense')}
                                    />
                                    <div className="bg-white/20 p-4 rounded-full border border-white/30 backdrop-blur-md">
                                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    </div>
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                        </section>
                      </div>
                    )}

                    {activeTab === 'hours' && (
                      <div className="space-y-10">
                        <section>
                          <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <h4 className="text-lg font-bold text-gray-900">Operating Hours</h4>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-neutral-50/50 p-6 rounded-xl border border-neutral-100 mb-8">
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-gray-700 ml-1">Opening Time</label>
                              <input
                                type="time"
                                name="open"
                                value={sellerData.workingHours?.open || '09:00'}
                                onChange={handleInputChange}
                                disabled={!isEditing}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none disabled:bg-white/50 transition-all"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-sm font-semibold text-gray-700 ml-1">Closing Time</label>
                              <input
                                type="time"
                                name="close"
                                value={sellerData.workingHours?.close || '21:00'}
                                onChange={handleInputChange}
                                disabled={!isEditing}
                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none disabled:bg-white/50 transition-all"
                              />
                            </div>
                          </div>

                          <div className="space-y-4">
                            <label className="text-sm font-semibold text-gray-700 ml-1">Working Days</label>
                            <div className="flex flex-wrap gap-2">
                              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                                const isSelected = sellerData.workingHours?.workingDays?.includes(day);
                                return (
                                  <button
                                    key={day}
                                    type="button"
                                    onClick={() => toggleWorkingDay(day)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all border-2 ${
                                      isSelected
                                        ? 'bg-teal-600 text-white border-teal-600 shadow-md transform scale-105'
                                        : 'bg-white text-neutral-500 border-neutral-200 hover:border-teal-200'
                                    } ${!isEditing ? 'opacity-80 cursor-default' : 'cursor-pointer active:scale-95'}`}
                                  >
                                    {day}
                                  </button>
                                );
                              })}
                            </div>
                            {isEditing && (
                              <p className="text-xs text-neutral-400 ml-1">Click to toggle the days your store is operational.</p>
                            )}
                          </div>
                        </section>
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-8 py-5 bg-gray-50 border-t border-gray-200 flex justify-end gap-4"
                    >
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saveLoading}
                        className={`px-6 py-2.5 rounded-lg text-sm font-bold text-white bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 ${saveLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        {saveLoading ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Saving...
                          </span>
                        ) : 'Save Changes'}
                      </button>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            </form>
          </div>
        </div>
      </div>

      {deleteStep > 0 && (
        <>
          <div
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={() => { if (!deleting) setDeleteStep(0); }}
          />
          <div className="fixed inset-0 z-[70] flex items-start sm:items-center justify-center p-4 pt-10 sm:pt-4">
            <div className="bg-white rounded-[24px] shadow-2xl max-w-[290px] sm:max-w-sm w-full p-4 pt-6 pb-4 sm:p-5 sm:pt-8 sm:pb-5 relative overflow-y-auto max-h-[85vh]">
              {!deleting && (
                <button
                  onClick={() => setDeleteStep(0)}
                  className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 transition-colors border-none cursor-pointer">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M18 6L6 18M6 6L18 18"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}

              {/* Step 1: Warning Details */}
              {deleteStep === 1 && (
                <div className="text-center animate-fadeIn">
                  <div className="mx-auto mb-3.5 w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center text-red-500">
                    <svg viewBox="0 0 24 24" className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/>
                      <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-1.5">
                    Delete Seller Account?
                  </h3>
                  <p className="text-[12px] text-neutral-500 mb-4 px-2 leading-relaxed">
                    Are you sure you want to delete your seller account? This action is permanent and cannot be undone. All your product listings, store details, and wallet balance history will be cleared.
                  </p>

                  <div className="flex gap-3 mt-5">
                    <button
                      type="button"
                      onClick={() => setDeleteStep(0)}
                      className="flex-1 py-3 rounded-xl border border-neutral-200 text-neutral-600 font-bold text-xs hover:bg-neutral-50 transition-all uppercase tracking-wider cursor-pointer">
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSendDeleteOtp}
                      disabled={otpSending}
                      className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-all shadow-md shadow-red-100 uppercase tracking-wider border-none cursor-pointer">
                      {otpSending ? "Sending..." : "Continue"}
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: OTP Verification */}
              {deleteStep === 2 && (
                <div className="text-center animate-fadeIn">
                  <div className="mx-auto mb-3.5 w-12 h-12 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="5" y="11" width="14" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-1.5">
                    Security Verification
                  </h3>
                  <p className="text-[12px] text-neutral-500 mb-4 px-2 leading-relaxed">
                    We've generated a secure verification code to confirm store ownership. Please enter the 4-digit code sent to your registered number.
                  </p>

                  <div className="max-w-xs mx-auto mb-4">
                    <input
                      type="text"
                      maxLength={4}
                      value={deleteOtp}
                      onChange={(e) => setDeleteOtp(e.target.value.replace(/\D/g, ""))}
                      placeholder="• • • •"
                      className="w-full text-center tracking-[1.2em] font-mono text-lg rounded-xl border border-neutral-200 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-teal-600 transition-all placeholder-neutral-300"
                    />
                    <p className="text-[10px] font-bold text-neutral-400 mt-2">
                      (Local Dev Mode Code: <span className="text-teal-600 font-extrabold">1234</span>)
                    </p>
                  </div>

                  <div className="flex gap-3 mt-5">
                    <button
                      type="button"
                      onClick={() => setDeleteStep(1)}
                      className="flex-1 py-3 rounded-xl border border-neutral-200 text-neutral-600 font-bold text-xs hover:bg-neutral-50 transition-all uppercase tracking-wider cursor-pointer">
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={handleVerifyOtpAndNext}
                      className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 transition-all shadow-md shadow-teal-100 uppercase tracking-wider border-none cursor-pointer">
                      Verify OTP
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Explicit Text Confirmation */}
              {deleteStep === 3 && (
                <form onSubmit={handleConfirmDelete} className="text-center animate-fadeIn">
                  <div className="mx-auto mb-3.5 w-12 h-12 rounded-2xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600">
                    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                  </div>
                  <h3 className="text-lg font-bold text-neutral-900 mb-1.5">
                    Final Confirmation
                  </h3>
                  <p className="text-[12px] text-neutral-500 mb-4 px-2 leading-relaxed">
                    To completely finalize the soft-deletion process, please type <strong className="text-red-600 uppercase font-extrabold">DELETE</strong> below.
                  </p>

                  <div className="max-w-xs mx-auto mb-4">
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type DELETE here"
                      className="w-full text-center uppercase font-bold text-xs rounded-xl border border-neutral-200 px-3 py-3 focus:outline-none focus:ring-2 focus:ring-red-600/10 focus:border-red-600 transition-all placeholder-neutral-300"
                    />
                  </div>

                  <div className="flex gap-3 mt-5">
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={() => setDeleteStep(2)}
                      className="flex-1 py-3 rounded-xl border border-neutral-200 text-neutral-600 font-bold text-xs hover:bg-neutral-50 transition-all uppercase tracking-wider cursor-pointer">
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={deleting || deleteConfirmText !== "DELETE"}
                      className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md shadow-red-100 uppercase tracking-wider border-none cursor-pointer">
                      {deleting ? "Deleting..." : "Delete Account"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const InputGroup = ({ label, name, value, onChange, disabled, type = "text", placeholder = "", autoComplete }: any) => (

  <div className="space-y-1.5">
    <label className="text-sm font-semibold text-gray-700 ml-1">{label}</label>
    <input
      type={type}
      name={name}
      value={value || ''}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete={autoComplete}
      className={`w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all ${disabled ? 'bg-gray-50/50 text-gray-500 cursor-default' : 'bg-white'

        }`}
    />
  </div>
);

export default SellerAccountSettings;
