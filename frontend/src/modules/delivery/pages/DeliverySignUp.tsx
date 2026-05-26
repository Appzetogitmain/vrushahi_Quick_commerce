import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  register,
  sendOTP,
  verifyOTP,
} from "../../../services/api/auth/deliveryAuthService";
import { getPolicies } from "../../../services/api/delivery/deliveryService";
import { uploadDocumentPublic } from "../../../services/api/uploadService";
import { validateDocumentFile, compressImage } from "../../../utils/imageUpload";
import OTPInput from "../../../components/OTPInput";
import PolicyModal from "../../../components/PolicyModal";
import { useAuth } from "../../../context/AuthContext";
import { useToast } from "../../../context/ToastContext";
import { validateEmail } from "../../../utils/validation";
import LogoLatest from "@assets/LogoLatest.png";

export default function DeliverySignUp() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    mobile: "",
    email: "",
    dateOfBirth: "",
    address: "",
    city: "",
    pincode: "",
    drivingLicenseUrl: "",
    nationalIdentityCardUrl: "",
    accountName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    vehicleNumber: "",
    vehicleType: "",
    policeVerificationForm: "",
  });


  // File state for UI
  const [drivingLicenseFile, setDrivingLicenseFile] = useState<File | null>(
    null
  );
  const [nationalIdentityCardFile, setNationalIdentityCardFile] =
    useState<File | null>(null);
  const [policeVerificationFile, setPoliceVerificationFile] =
    useState<File | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [isCityLoading, setIsCityLoading] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [policyType, setPolicyType] = useState<{ type: 'customer' | 'delivery' | 'seller', title?: string }>({ type: 'delivery' });



  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "mobile") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, "").slice(0, 10),
      }));
    } else if (name === "ifscCode") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.toUpperCase().slice(0, 11),
      }));
    } else if (name === "accountNumber" || name === "pincode") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, ""),
      }));
    } else if (name === "accountName" || name === "bankName") {
      // Capitalize first letter of each word
      const formattedValue = value.replace(/\b\w/g, (char) => char.toUpperCase());
      setFormData((prev) => ({
        ...prev,
        [name]: formattedValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const calculateAge = (dob: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const fetchCityFromLocation = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation is not supported by your browser", "error");
      return;
    }

    setIsCityLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY
            }`
          );
          const data = await response.json();
          if (data.status === "OK") {
            const addressComponents = data.results[0].address_components;
            const cityComponent = addressComponents.find(
              (c: any) =>
                c.types.includes("locality") ||
                c.types.includes("administrative_area_level_2")
            );
            if (cityComponent) {
              setFormData((prev) => ({
                ...prev,
                city: cityComponent.long_name,
              }));
            }
          } else {
            showToast("Could not fetch city from your location", "error");
          }
        } catch (err) {
          showToast("Failed to fetch city details", "error");
        } finally {
          setIsCityLoading(false);
        }
      },
      (err) => {
        showToast("Location access denied. Please type your city manually.", "error");
        setIsCityLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (!files || !files[0]) return;

    let file = files[0];

    // Compress image if it's an image file
    if (file.type.startsWith('image/')) {
      try {
        file = await compressImage(file);
      } catch (err) {
        console.error("Failed to compress image:", err);
      }
    }

    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      showToast(validation.error || "Invalid document file", "error");
      return;
    }

    if (name === "drivingLicense") {
      setDrivingLicenseFile(file);
    } else if (name === "nationalIdentityCard") {
      setNationalIdentityCardFile(file);
    } else if (name === "policeVerification") {
      setPoliceVerificationFile(file);
    }
  };

  const handleShowPolicy = (title: string) => {
    setPolicyType({ type: 'delivery', title });
    setShowPolicy(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (
      !formData.name ||
      !formData.mobile ||
      !formData.email ||
      !formData.address ||
      !formData.city
    ) {
      showToast("Please fill all required fields", "error");
      return;
    }

    if (!/^[a-zA-Z\s]+$/.test(formData.name)) {
      showToast("Name should only contain alphabets (a-z)", "error");
      return;
    }

    if (!drivingLicenseFile || !nationalIdentityCardFile) {
      showToast("Please upload all required documents (Driving License and ID Card)", "error");
      return;
    }

    if (formData.mobile.length !== 10) {
      showToast("Please enter a valid 10-digit mobile number", "error");
      return;
    }

    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      showToast(emailValidation.error || "Invalid email", "error");
      return;
    }

    if (formData.pincode && formData.pincode.length !== 6) {
      showToast("Pincode must be 6 digits", "error");
      return;
    }

    if (formData.accountName && !/^[a-zA-Z\s]+$/.test(formData.accountName)) {
      showToast("Account holder name should only contain alphabets", "error");
      return;
    }

    if (formData.bankName && !/^[a-zA-Z\s]+$/.test(formData.bankName)) {
      showToast("Bank name should only contain alphabets", "error");
      return;
    }

    if (formData.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode)) {
      showToast("Please enter a valid IFSC code (e.g. SBIN0012345)", "error");
      return;
    }

    if (formData.accountNumber && (formData.accountNumber.length < 9 || formData.accountNumber.length > 18)) {
      showToast("Please enter a valid Bank Account Number (9-18 digits)", "error");
      return;
    }


    setLoading(true);

    try {
      // Upload documents if provided
      let drivingLicenseUrl = formData.drivingLicenseUrl;
      let nationalIdentityCardUrl = formData.nationalIdentityCardUrl;
      let policeVerificationUrl = formData.policeVerificationForm;

      if (drivingLicenseFile || nationalIdentityCardFile || policeVerificationFile) {
        setUploadingDocs(true);

        if (drivingLicenseFile) {
          const drivingLicenseResult = await uploadDocumentPublic(
            drivingLicenseFile,
            "vrushahi/delivery/documents"
          );
          drivingLicenseUrl = drivingLicenseResult.secureUrl;
        }

        if (nationalIdentityCardFile) {
          const nationalIdResult = await uploadDocumentPublic(
            nationalIdentityCardFile,
            "vrushahi/delivery/documents"
          );
          nationalIdentityCardUrl = nationalIdResult.secureUrl;
        }

        if (policeVerificationFile) {
          const policeResult = await uploadDocumentPublic(
            policeVerificationFile,
            "vrushahi/delivery/documents"
          );
          policeVerificationUrl = policeResult.secureUrl;
        }

        // Keep it true until the entire registration process finishes to prevent user interactions
      }

      const response = await register({
        name: formData.name,
        mobile: formData.mobile,
        email: formData.email,
        dateOfBirth: formData.dateOfBirth || undefined,
        address: formData.address,
        city: formData.city,
        pincode: formData.pincode || undefined,
        drivingLicense: drivingLicenseUrl || undefined,
        nationalIdentityCard: nationalIdentityCardUrl || undefined,
        accountName: formData.accountName || undefined,
        bankName: formData.bankName || undefined,
        accountNumber: formData.accountNumber || undefined,
        ifscCode: formData.ifscCode || undefined,
        vehicleNumber: formData.vehicleNumber || undefined,
        vehicleType: formData.vehicleType || undefined,
        policeVerificationForm: policeVerificationUrl || undefined,
      });

      if (response.success) {
        // Clear token from registration (we'll get it after OTP verification)
        localStorage.removeItem("authToken");
        localStorage.removeItem("userData");
        // Registration successful, now send SMS OTP for verification
        try {
          const otpRes = await sendOTP(formData.mobile);
          if (otpRes.sessionId) setSessionId(otpRes.sessionId);
          setShowOTP(true);
        } catch (otpErr: any) {
          showToast(otpErr.message || "Registration successful but failed to send OTP.", "error");
        }
      }
    } catch (err: any) {
      showToast(err.message || "Registration failed. Please try again.", "error");
    } finally {
      setLoading(false);
      setUploadingDocs(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setLoading(true);

    try {
      const response = await verifyOTP(formData.mobile, otp, sessionId);
      if (response.success && response.data) {
        // Update auth context
        login(response.data.token, {
          ...response.data.user,
          userType: "Delivery",
        });

        // FCM token registration is handled globally by App.tsx when auth state changes
        // No need to call registerFCMToken here - it would cause duplicate notifications

        navigate("/delivery");
      }
    } catch (err: any) {
      showToast(err.message || "Invalid OTP. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-green-100 via-slate-50 to-teal-50 flex flex-col items-center justify-center px-4 py-8 relative">

      {/* Sign Up Card */}
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] overflow-hidden border border-white/50 animate-in fade-in zoom-in duration-500">
        {/* Header Section */}
        <div className="px-8 pt-10 pb-6 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-green-500/10 blur-3xl rounded-full" />
            <img
              src={LogoLatest}
              alt="vrushahi"
              className="relative h-28 w-auto mx-auto object-contain"
            />
          </div>
          <h1 className="text-3xl font-bold text-green-600 mb-2 tracking-tight">
            Delivery Sign Up
          </h1>
          <p className="text-neutral-500 text-sm font-medium">
            Create your delivery partner account
          </p>
        </div>


        {/* Sign Up Form */}
        <div
          className="px-8 pb-8 space-y-6 delivery-signup-form"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}>

          <style>{`
            .delivery-signup-form::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          {!showOTP ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-green-600 uppercase tracking-widest border-b border-green-100 pb-3 mb-2">
                  Personal Information
                </h3>


                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    required
                    className="w-full px-4 py-3 text-sm bg-neutral-50/50 border border-green-600/20 rounded-xl focus:outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all duration-300"
                    disabled={loading}
                  />

                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">
                    Mobile Number <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center bg-neutral-50/50 border border-green-600/20 rounded-xl overflow-hidden focus-within:bg-white focus-within:border-green-500 focus-within:ring-4 focus-within:ring-green-500/10 transition-all duration-300">
                    <div className="px-4 py-3 text-sm font-bold text-neutral-400 border-r border-green-600/20 bg-neutral-50/50">
                      +91
                    </div>
                    <input
                      type="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleInputChange}
                      placeholder="700 000 0000"
                      required
                      maxLength={10}
                      className="flex-1 px-4 py-3 text-sm placeholder:text-neutral-300 focus:outline-none"
                      disabled={loading}
                    />
                  </div>

                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Enter email address"
                    required
                    className="w-full px-4 py-3 text-sm bg-neutral-50/50 border border-green-600/20 rounded-xl focus:outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all duration-300"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 text-sm bg-neutral-50/50 border border-green-600/20 rounded-xl focus:outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all duration-300"
                    disabled={loading}
                  />
                  {formData.dateOfBirth && calculateAge(formData.dateOfBirth) !== null && (
                    <p className={`text-[10px] mt-1 ml-1 font-bold ${calculateAge(formData.dateOfBirth)! < 18 ? "text-amber-500" : "text-green-600"}`}>
                      {calculateAge(formData.dateOfBirth)! < 18 
                        ? `Note: You are ${calculateAge(formData.dateOfBirth)} years old. Drivers are usually required to be 18+.` 
                        : `Age: ${calculateAge(formData.dateOfBirth)} years`}
                    </p>
                  )}
                </div>


                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Enter your address"
                    required
                    className="w-full px-4 py-3 text-sm bg-neutral-50/50 border border-green-600/20 rounded-xl focus:outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all duration-300"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      placeholder="Enter your city"
                      required
                      className="w-full px-4 py-3 text-sm bg-neutral-50/50 border border-green-600/20 rounded-xl focus:outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all duration-300"
                      disabled={loading || isCityLoading}
                    />
                    <button
                      type="button"
                      onClick={fetchCityFromLocation}
                      disabled={isCityLoading || loading}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:text-neutral-400"
                      title="Fetch current location">
                      {isCityLoading ? (
                        <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <svg
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5">
                          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleInputChange}
                    placeholder="Enter pincode"
                    className="w-full px-4 py-3 text-sm bg-neutral-50/50 border border-green-600/20 rounded-xl focus:outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all duration-300"
                    disabled={loading}
                  />
                </div>

              </div>
              
              {/* Vehicle Information */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-xs font-bold text-green-600 uppercase tracking-widest border-b border-green-100 pb-3 mb-2">
                  Vehicle Information
                </h3>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Vehicle Type
                  </label>
                  <select
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 text-sm bg-neutral-50/50 border border-green-600/20 rounded-xl focus:outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all duration-300"
                    disabled={loading}>
                    <option value="">Select Vehicle Type</option>
                    <option value="Bicycle">Bicycle</option>
                    <option value="Bike">Bike (Motorcycle)</option>
                    <option value="Scooter">Scooter</option>
                    <option value="Car">Car</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Vehicle Number
                  </label>
                  <input
                    type="text"
                    name="vehicleNumber"
                    value={formData.vehicleNumber}
                    onChange={handleInputChange}
                    placeholder="Enter vehicle number (e.g. MP04 AB 1234)"
                    className="w-full px-4 py-3 text-sm bg-neutral-50/50 border border-green-600/20 rounded-xl focus:outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all duration-300"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Bank Information */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-xs font-bold text-green-600 uppercase tracking-widest border-b border-green-100 pb-3 mb-2">
                  Bank Account Information (Optional)
                </h3>


                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">
                    Account holder name
                  </label>
                  <input
                    type="text"
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleInputChange}
                    placeholder="ENTER ACCOUNT HOLDER NAME"
                    className="w-full px-4 py-3 text-sm bg-neutral-50/50 border border-green-600/20 rounded-xl focus:outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all duration-300"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    placeholder="ENTER BANK NAME"
                    className="w-full px-4 py-3 text-sm bg-neutral-50/50 border border-green-600/20 rounded-xl focus:outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all duration-300"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    placeholder="ENTER ACCOUNT NUMBER"
                    className="w-full px-4 py-3 text-sm bg-neutral-50/50 border border-green-600/20 rounded-xl focus:outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all duration-300"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 ml-1">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    placeholder="ENTER IFSC CODE (E.G. SBIN0012345)"
                    className="w-full px-4 py-3 text-sm bg-neutral-50/50 border border-green-600/20 rounded-xl focus:outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all duration-300"
                    disabled={loading}
                  />
                </div>


              </div>

              {/* Documents Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-xs font-bold text-green-600 uppercase tracking-widest border-b border-green-100 pb-3 mb-2">
                  Documents (Required)
                </h3>


                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Driving License <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      name="drivingLicense"
                      onChange={handleFileChange}
                      accept="image/*,.pdf"
                      className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                      disabled={loading || uploadingDocs}
                    />
                    {drivingLicenseFile && (
                      <p className="text-xs text-neutral-600">
                        {drivingLicenseFile.name}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    National Identity Card <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      name="nationalIdentityCard"
                      onChange={handleFileChange}
                      accept="image/*,.pdf"
                      className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                      disabled={loading || uploadingDocs}
                    />
                    {nationalIdentityCardFile && (
                      <p className="text-xs text-neutral-600">
                        {nationalIdentityCardFile.name}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Police Verification Form (Optional)
                  </label>
                  <div className="space-y-2">
                    <input
                      type="file"
                      name="policeVerification"
                      onChange={handleFileChange}
                      accept="image/*,.pdf"
                      className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                      disabled={loading || uploadingDocs}
                    />
                    <p className="text-[10px] text-neutral-500 font-medium">
                      Note: If not uploaded now, you must upload it within 30 days of registration to continue receiving new orders.
                    </p>
                    {policeVerificationFile && (
                      <p className="text-xs text-neutral-600 font-bold">
                        {policeVerificationFile.name}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Terms and Conditions Text */}
              <div className="text-center px-4 py-2">
                <p className="text-[11px] text-neutral-400 font-medium leading-relaxed">
                  By clicking Sign Up, you agree to our{" "}
                  <button 
                    type="button" 
                    onClick={() => handleShowPolicy('Terms & Conditions')}
                    className="text-green-600 hover:underline font-bold"
                  >
                    Terms & Conditions
                  </button>{" "}
                  and{" "}
                  <button 
                    type="button" 
                    onClick={() => handleShowPolicy('Privacy Policy')}
                    className="text-green-600 hover:underline font-bold"
                  >
                    Privacy Policy
                  </button>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || uploadingDocs}
                className={`w-fit min-w-[14rem] mx-auto block py-5 rounded-[1.25rem] font-bold text-lg transition-all duration-300 relative overflow-hidden group ${!loading && !uploadingDocs
                  ? "bg-green-600 text-white hover:bg-green-700 shadow-[0_10px_20px_rgba(22,163,74,0.3)] translate-y-0 active:translate-y-0.5"
                  : "bg-green-50/50 text-green-300 border border-green-100 cursor-not-allowed"
                  }`}>
                <span className="relative z-10">
                  {uploadingDocs
                    ? "Uploading..."
                    : loading
                      ? "Creating Account..."
                      : "Sign Up"}
                </span>
                {!loading && !uploadingDocs && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                )}
              </button>


              <div className="text-center pt-6 border-t border-neutral-100">
                <p className="text-sm text-neutral-500 font-medium">
                  Already have a delivery partner account?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/delivery/login")}
                    className="text-green-600 hover:text-green-700 font-bold transition-colors ml-1">
                    Login
                  </button>
                </p>
              </div>

            </form>
          ) : (
            /* OTP Verification Form */
            <div className="space-y-6 animate-in slide-in-from-right duration-500">
              <div className="text-center">
                <p className="text-sm text-neutral-500 mb-2">
                  Enter the 4-digit OTP sent via SMS to
                </p>
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <p className="text-sm font-bold text-green-700">
                    +91 {formData.mobile}
                  </p>
                </div>
              </div>

              <div className="flex justify-center py-2">
                <OTPInput onComplete={handleOTPComplete} disabled={loading} />
              </div>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setShowOTP(false);
                  }}
                  disabled={loading}
                  className="flex-1 max-w-[8rem] py-6 rounded-[1.25rem] font-bold text-sm bg-green-50 text-green-600 hover:bg-green-100 transition-all border border-green-100">
                  Back
                </button>
                <button
                  onClick={async () => {
                    setLoading(true);
                    try {
                      const res = await sendOTP(formData.mobile);
                      if (res.sessionId) setSessionId(res.sessionId);
                    } catch (err: any) {
                      showToast(err.message || "Failed to resend OTP.", "error");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="flex-1 max-w-[10rem] py-6 rounded-[1.25rem] font-bold text-sm bg-green-600 text-white hover:bg-green-700 transition-all shadow-[0_10px_20px_rgba(22,163,74,0.2)]">
                  {loading ? "Resending..." : "Resend"}
                </button>
              </div>
            </div>

          )}
        </div>
      </div>

      <PolicyModal 
        isOpen={showPolicy}
        onClose={() => setShowPolicy(false)}
        type={policyType.type}
        titleSearch={policyType.title}
      />


      {/* Policy Modal */}
    </div>
  );
}
