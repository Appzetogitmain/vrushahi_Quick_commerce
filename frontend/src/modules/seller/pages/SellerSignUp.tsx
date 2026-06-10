import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  register,
  sendOTP,
  verifyOTP,
} from "../../../services/api/auth/sellerAuthService";
import OTPInput from "../../../components/OTPInput";
import GoogleMapsAutocomplete from "../../../components/GoogleMapsAutocomplete";
import { useAuth } from "../../../context/AuthContext";
import {
  getHeaderCategoriesPublic,
  HeaderCategory,
} from "../../../services/api/headerCategoryService";
import LocationPickerMap from "../../../components/LocationPickerMap";
import FileUpload from "../../../components/FileUpload";
import PolicyModal from "../../../components/PolicyModal";
import { useToast } from "../../../context/ToastContext";
import { validateEmail } from "../../../utils/validation";
import LogoLatest from "@assets/LogoLatest.png";

type Step = 1 | 2 | 3 | 4 | 5 | 6; // 6 is success step

export default function SellerSignUp() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isOTPVerified, setIsOTPVerified] = useState(false);
  const [showOTPFields, setShowOTPFields] = useState(false);
  const [fssaiError, setFssaiError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    sellerName: "",
    mobile: "",
    email: "",
    storeName: "",
    categories: [] as string[],
    address: "",
    city: "",
    searchLocation: "",
    latitude: "",
    longitude: "",
    serviceRadiusKm: "10",
    idProof: "",
    profile: "",
    storeImage: "",
    businessLicense: "",
    fssaiLicNo: "",
    workingHours: {
      open: "09:00",
      close: "21:00",
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    }
  });

  const [showPolicy, setShowPolicy] = useState(false);
  const [policyType, setPolicyType] = useState<{ type: 'customer' | 'delivery' | 'seller', title?: string }>({ type: 'seller' });

  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<HeaderCategory[]>([]);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await getHeaderCategoriesPublic();
        if (Array.isArray(res)) {
          setCategories(res.filter((cat) => cat.status === "Published"));
        }
      } catch (err) {
        console.error("Error fetching categories:", err);
      }
    };
    fetchCats();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === "sellerName") {
      if (value !== "" && /[^a-zA-Z\s]/.test(value)) {
        showToast("Only alphabetic characters and spaces are allowed in seller name", "error");
        return;
      }
      setFormData((prev) => ({ ...prev, [name]: value }));
    } else if (name === "city") {
      if (value !== "" && /[^a-zA-Z\s]/.test(value)) {
        showToast("Only alphabetic characters and spaces are allowed in city name", "error");
        return;
      }
      setFormData((prev) => ({ ...prev, [name]: value }));
    } else if (name === "mobile") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, "").slice(0, 10),
      }));
    } else if (name === "fssaiLicNo") {
      const numericValue = value.replace(/\D/g, "").slice(0, 14);
      setFormData((prev) => ({ ...prev, [name]: numericValue }));
      if (numericValue.length === 14) {
        setFssaiError(null);
      }
    } else if (name === "serviceRadiusKm") {
      const cleanedValue = value.replace(/[^0-9.]/g, "");
      const parts = cleanedValue.split(".");
      const finalValue = parts.length > 2 ? `${parts[0]}.${parts[1]}` : cleanedValue;
      setFormData((prev) => ({ ...prev, [name]: finalValue }));
    } else if (name === "open" || name === "close") {
      setFormData(prev => ({
        ...prev,
        workingHours: { ...prev.workingHours, [name]: value }
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const toggleCategory = (catName: string) => {
    setFormData((prev) => {
      const exists = prev.categories.includes(catName);
      const nextCategories = exists
        ? prev.categories.filter((c) => c !== catName)
        : [...prev.categories, catName];
      return { ...prev, categories: nextCategories };
    });
  };

  const toggleWorkingDay = (day: string) => {
    setFormData(prev => {
      const exists = prev.workingHours.workingDays.includes(day);
      const nextDays = exists 
        ? prev.workingHours.workingDays.filter(d => d !== day)
        : [...prev.workingHours.workingDays, day];
      return {
        ...prev,
        workingHours: { ...prev.workingHours, workingDays: nextDays }
      };
    });
  };

  const handleSendOTP = async () => {
    if (formData.mobile.length !== 10) {
      showToast("Please enter a valid 10-digit mobile number", "error");
      return;
    }
    try {
      await sendOTP(formData.mobile, "register");
      setShowOTPFields(true);
      showToast("Verification code sent successfully!", "success");
    } catch (err: any) {
      showToast(err.response?.data?.message || "Failed to send OTP", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (otp: string) => {
    setLoading(true);
    try {
      const response = await verifyOTP(formData.mobile, otp, 'register');
      if (response.success) {
        setIsOTPVerified(true);
        setShowOTPFields(false);
        showToast("Mobile number verified!", "success");
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Invalid OTP code", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleFssaiBlur = () => {
    if (formData.fssaiLicNo.length > 0 && formData.fssaiLicNo.length !== 14) {
      setFssaiError("FSSAI License must be exactly 14 digits");
      showToast("Invalid FSSAI License format", "error");
    } else {
      setFssaiError(null);
    }
  };

  const nextStep = () => {
    // Validation for current step
    if (currentStep === 1) {
      if (!formData.sellerName) return showToast("Seller name is required", "error");
      if (!/^[a-zA-Z\s]+$/.test(formData.sellerName)) {
        return showToast("Name should only contain alphabets (a-z)", "error");
      }
      
      const emailValidation = validateEmail(formData.email);
      if (!emailValidation.isValid) {
        return showToast(emailValidation.error || "Invalid email", "error");
      }

      if (!formData.mobile) return showToast("Phone number is required", "error");
      if (formData.mobile.length !== 10) {
        return showToast("Mobile number must be exactly 10 digits", "error");
      }
      if (!isOTPVerified) return showToast("Please verify your mobile number to continue", "error");
    } else if (currentStep === 2) {
      if (!formData.storeName) return showToast("Shop name is required", "error");
      if (formData.categories.length === 0) return showToast("Please select at least one category", "error");
    } else if (currentStep === 3) {
      if (!formData.latitude || !formData.longitude) return showToast("Please select your shop location on the map", "error");
      if (!formData.city) return showToast("City name is required", "error");
      if (!/^[a-zA-Z\s]+$/.test(formData.city)) {
        return showToast("City should only contain alphabetic characters and spaces", "error");
      }
    } else if (currentStep === 4) {
      if (!formData.idProof) return showToast("Please upload ID proof (Aadhar/PAN)", "error");
      if (!formData.profile) return showToast("Please upload owner photo", "error");
      if (!formData.businessLicense) return showToast("Please upload business license", "error");
      if (!formData.storeImage) return showToast("Please upload real store image", "error");
      const isFood = formData.categories.some(c => c.toLowerCase().includes('food') || c.toLowerCase().includes('restaurant'));
      if (isFood) {
        if (!formData.fssaiLicNo) return showToast("FSSAI license number is required for food categories", "error");
        if (formData.fssaiLicNo.length !== 14) {
          setFssaiError("FSSAI License must be exactly 14 digits");
          return showToast("FSSAI License must be exactly 14 digits", "error");
        }
      }
    } else if (currentStep === 5) {
      if (formData.workingHours.workingDays.length === 0) return showToast("Please select at least one working day", "error");
      
      if (formData.workingHours.open && formData.workingHours.close) {
        if (formData.workingHours.open >= formData.workingHours.close) {
          return showToast("Opening time must be earlier than closing time", "error");
        }
      }

      handleFinalSubmit();
      return;
    }

    setCurrentStep((prev) => (prev + 1) as Step);
  };

  const prevStep = () => {
    setCurrentStep((prev) => (prev - 1) as Step);
  };

  const handleFinalSubmit = async () => {
    setLoading(true);
    try {
      const response = await register(formData);
      if (response.success) {
        showToast("Registration successful!", "success");
        
        // Log in automatically
        if (response.data.token && response.data.user) {
          login(response.data.token, {
            ...response.data.user,
            userType: "Seller"
          });
        }
        
        setCurrentStep(6);
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || "Registration failed. Please check all details.", "error");
    } finally {
      setLoading(false);
    }
  };

  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-8 px-4">
      {[1, 2, 3, 4, 5].map((step) => (
        <div key={step} className="flex items-center flex-1 last:flex-none">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
            currentStep === step ? 'bg-green-600 text-white ring-4 ring-green-100' : 
            currentStep > step ? 'bg-green-100 text-green-600' : 'bg-neutral-100 text-neutral-400'
          }`}>
            {currentStep > step ? '✓' : step}
          </div>
          {step < 5 && (
            <div className={`h-1 flex-1 mx-2 rounded-full transition-all duration-300 ${
              currentStep > step ? 'bg-green-600' : 'bg-neutral-100'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  const isFoodCategory = formData.categories.some(c => 
    c.toLowerCase().includes('food') || 
    c.toLowerCase().includes('restaurant') || 
    c.toLowerCase().includes('grocery')
  );

  if (currentStep === 6) {
    return (
      <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] p-10 text-center animate-in fade-in zoom-in duration-500">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-600">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-neutral-800 mb-4">Registration Successful!</h1>
          <p className="text-neutral-500 mb-8">
            Your profile is currently <span className="text-yellow-600 font-bold">Pending Approval</span>. 
            vrushahi will review your details soon.
          </p>
          <div className="bg-green-50 rounded-2xl p-6 mb-8 text-left">
            <p className="text-sm text-green-800 font-medium">
              "Profile incomplete. Complete remaining details to start selling."
            </p>
          </div>
          <button
            onClick={() => navigate("/seller/settings")}
            className="w-full py-4 bg-green-600 text-white rounded-2xl font-bold text-lg hover:bg-green-700 transition-all shadow-lg shadow-green-200"
          >
            Go to Profile Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-green-50 via-white to-teal-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden border border-white/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="px-8 pt-10 pb-6 text-center">
          <img src={LogoLatest} alt="vrushahi" className="h-20 w-auto mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-neutral-800">Explore New Opportunities</h1>
          <p className="text-neutral-500 text-sm mt-1">Hyperlocal Multi-Vendor Onboarding</p>
        </div>

        <StepIndicator />

        {/* Form Body */}
        <div className="px-8 pb-10">
          <div className="space-y-6">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-neutral-800 mb-2">Basic Information</h2>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">Seller Name</label>
                  <input
                    type="text"
                    name="sellerName"
                    value={formData.sellerName}
                    onChange={handleInputChange}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">Phone Number</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex flex-1 items-center bg-neutral-50 border border-neutral-100 rounded-xl focus-within:ring-4 focus-within:ring-green-500/10 focus-within:border-green-500 transition-all overflow-hidden">
                      <span className="px-4 py-3 text-neutral-500 font-bold border-r border-neutral-200 bg-neutral-100/50">+91</span>
                      <input
                        type="tel"
                        name="mobile"
                        value={formData.mobile}
                        onChange={handleInputChange}
                        placeholder="9876543210"
                        disabled={isOTPVerified || showOTPFields}
                        className="flex-1 px-4 py-3 bg-transparent border-none focus:outline-none focus:ring-0 transition-all disabled:text-neutral-400 w-full"
                      />
                    </div>
                    {!isOTPVerified && !showOTPFields && (
                      <button 
                        onClick={handleSendOTP}
                        disabled={loading || formData.mobile.length !== 10}
                        className="w-full sm:w-auto px-6 py-3 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 disabled:bg-neutral-200 transition-all whitespace-nowrap"
                      >
                        {loading ? '...' : 'Verify'}
                      </button>
                    )}
                  </div>
                </div>

                {showOTPFields && (
                  <div className="pt-4 border-t border-neutral-100 animate-in fade-in duration-300">
                    <p className="text-xs text-neutral-500 mb-4 text-center">Enter 4-digit OTP sent to your mobile</p>
                    <OTPInput onComplete={handleVerifyOTP} disabled={loading} />
                    <button 
                      onClick={() => setShowOTPFields(false)}
                      className="w-full mt-4 text-xs font-bold text-neutral-400 uppercase tracking-widest hover:text-green-600 transition-colors"
                    >
                      Change Number
                    </button>
                  </div>
                )}

                {isOTPVerified && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 text-xs font-bold rounded-xl animate-in zoom-in duration-300">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Mobile Number Verified
                  </div>
                )}

                {/* Policy Links */}
                <div className="pt-2 text-center">
                  <p className="text-[11px] text-neutral-400 font-medium px-4 leading-relaxed">
                    By proceeding, you agree to our{" "}
                    <button
                      onClick={() => {
                        setPolicyType({ type: 'seller', title: 'Terms' });
                        setShowPolicy(true);
                      }}
                      className="text-green-600 hover:underline font-bold"
                    >
                      Terms & Conditions
                    </button>{" "}
                    and{" "}
                    <button
                      onClick={() => {
                        setPolicyType({ type: 'seller', title: 'Privacy' });
                        setShowPolicy(true);
                      }}
                      className="text-green-600 hover:underline font-bold"
                    >
                      Privacy Policy
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Store Setup */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-neutral-800 mb-2">Store Setup</h2>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">Shop Name</label>
                  <input
                    type="text"
                    name="storeName"
                    value={formData.storeName}
                    onChange={handleInputChange}
                    placeholder="Enter shop name"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4 ml-1">Categories (Choose multiple)</label>
                  <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto p-2 border border-neutral-50 rounded-2xl bg-neutral-50/30">
                    {categories.map((cat) => (
                      <button
                        key={cat._id}
                        type="button"
                        onClick={() => toggleCategory(cat.name)}
                        className={`px-3 py-4 text-left text-xs font-bold rounded-xl transition-all border-2 ${
                          formData.categories.includes(cat.name) 
                          ? 'border-green-600 bg-green-50 text-green-700' 
                          : 'border-transparent bg-white text-neutral-600 hover:bg-neutral-50'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Location */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-neutral-800 mb-2">Shop Location</h2>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">Search Address</label>
                  <GoogleMapsAutocomplete
                    value={formData.searchLocation}
                    onChange={(address, lat, lng, name, components) => {
                      setFormData(prev => ({
                        ...prev,
                        searchLocation: address,
                        latitude: lat.toString(),
                        longitude: lng.toString(),
                        address: address,
                        city: components?.city || prev.city
                      }));
                    }}
                  />
                </div>

                {formData.latitude && formData.longitude && (
                  <div className="rounded-2xl overflow-hidden border-2 border-neutral-100 shadow-sm animate-in zoom-in duration-300">
                    <LocationPickerMap
                      initialLat={parseFloat(formData.latitude)}
                      initialLng={parseFloat(formData.longitude)}
                      onLocationSelect={(lat, lng) => {
                        setFormData(prev => ({ ...prev, latitude: lat.toString(), longitude: lng.toString() }));
                      }}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">Delivery Radius (KM)</label>
                  <div className="flex items-center gap-4 bg-neutral-50 p-4 rounded-2xl">
                    <input
                      type="range"
                      min="1"
                      max="50"
                      name="serviceRadiusKm"
                      value={formData.serviceRadiusKm}
                      onChange={handleInputChange}
                      className="flex-1 accent-green-600"
                    />
                    <span className="text-lg font-bold text-green-600 min-w-[50px]">{formData.serviceRadiusKm} KM</span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="e.g. Mumbai"
                    className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Step 4: Identity Verification */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-neutral-800 mb-2">Verify Identity</h2>
                <div className="grid grid-cols-2 gap-4">
                  <FileUpload 
                    label="Aadhar/PAN Card"
                    required
                    value={formData.idProof}
                    onUploadSuccess={(url) => setFormData(prev => ({ ...prev, idProof: url }))}
                  />
                  <FileUpload 
                    label="Owner Photo"
                    required
                    value={formData.profile}
                    onUploadSuccess={(url) => setFormData(prev => ({ ...prev, profile: url }))}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <FileUpload 
                    label="Business License"
                    required
                    value={formData.businessLicense}
                    onUploadSuccess={(url) => setFormData(prev => ({ ...prev, businessLicense: url }))}
                  />
                  <FileUpload 
                    label="Real Store Image"
                    required
                    value={formData.storeImage}
                    onUploadSuccess={(url) => setFormData(prev => ({ ...prev, storeImage: url }))}
                  />
                </div>

                <div>
                  <div className="mt-2 p-3 bg-red-50 rounded-xl border border-red-100">
                    <p className="text-[10px] text-red-600 font-bold uppercase tracking-tight flex items-center gap-1.5">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                        <line x1="12" y1="9" x2="12" y2="13" />
                        <line x1="12" y1="17" x2="12.01" y2="17" />
                      </svg>
                      WARNING: Real store image ONLY
                    </p>
                    <p className="text-[11px] text-red-500 mt-1 leading-tight">
                      Please upload a real image of your store. AI-generated or fake images will lead to <span className="font-bold">permanent rejection</span> and you will never be approved.
                    </p>
                  </div>
                </div>
                
                {isFoodCategory && (
                  <div className="pt-2 animate-in slide-in-from-top-2 duration-300">
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">FSSAI License Number <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      name="fssaiLicNo"
                      value={formData.fssaiLicNo}
                      onChange={handleInputChange}
                      onBlur={handleFssaiBlur}
                      placeholder="14-digit FSSAI number"
                      className={`w-full px-4 py-3 bg-neutral-50 border rounded-xl focus:ring-4 transition-all ${
                        fssaiError 
                          ? 'border-red-500 focus:ring-red-500/20' 
                          : 'border-neutral-100 focus:ring-green-500/10 focus:border-green-500'
                      }`}
                    />
                    {fssaiError && (
                      <p className="text-xs text-red-500 mt-1.5 font-medium ml-1">{fssaiError}</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Operations */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-neutral-800 mb-2">Business Operations</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">Opening Time</label>
                    <input
                      type="time"
                      name="open"
                      value={formData.workingHours.open}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">Closing Time</label>
                    <input
                      type="time"
                      name="close"
                      value={formData.workingHours.close}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-neutral-50 border border-neutral-100 rounded-xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3 ml-1">Working Days</label>
                  <div className="flex flex-wrap gap-2">
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleWorkingDay(day)}
                        className={`px-3 py-2 text-xs font-bold rounded-full border-2 transition-all ${
                          formData.workingHours.workingDays.includes(day)
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-white text-neutral-500 border-neutral-100 hover:border-green-200'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="pt-6 flex gap-4">
              {currentStep > 1 && (
                <button
                  onClick={prevStep}
                  className="flex-1 py-4 bg-neutral-100 text-neutral-600 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
                >
                  Back
                </button>
              )}
              <button
                onClick={nextStep}
                disabled={loading}
                className="flex-[2] py-4 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100 disabled:bg-neutral-200"
              >
                {loading ? 'Processing...' : currentStep === 5 ? 'Register Store' : 'Save & Continue'}
              </button>
            </div>

            <div className="text-center pt-4">
               <button
                  type="button"
                  onClick={() => navigate("/seller/login")}
                  className="text-xs font-bold text-neutral-400 uppercase tracking-widest hover:text-green-600 transition-all"
                >
                  Already have an account? Login
               </button>
            </div>
          </div>
        </div>
      </div>

      <PolicyModal 
        isOpen={showPolicy}
        onClose={() => setShowPolicy(false)}
        type={policyType.type}
        titleSearch={policyType.title}
      />
    </div>
  );
}
