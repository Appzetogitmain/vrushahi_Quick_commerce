import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  register,
  sendOTP,
  verifyOTP,
} from "../../../services/api/auth/deliveryAuthService";
import { getPolicies } from "../../../services/api/delivery/deliveryService";
import { uploadDocumentPublic } from "../../../services/api/uploadService";
import { validateDocumentFile } from "../../../utils/imageUpload";
import OTPInput from "../../../components/OTPInput";
import { useAuth } from "../../../context/AuthContext";
import LogoLatest from "@assets/LogoLatest.png";

export default function DeliverySignUp() {
  const navigate = useNavigate();
  const { login } = useAuth();
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
    bonusType: "",
    vehicleNumber: "",
    vehicleType: "",
  });

  const [selectedPolicy, setSelectedPolicy] = useState<{ title: string; content: string } | null>(null);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);

  // File state for UI
  const [drivingLicenseFile, setDrivingLicenseFile] = useState<File | null>(
    null
  );
  const [nationalIdentityCardFile, setNationalIdentityCardFile] =
    useState<File | null>(null);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isCityLoading, setIsCityLoading] = useState(false);

  const bonusTypes = [
    "Select Bonus Type",
    "Fixed",
    "Salaried",
    "Commission Based",
  ];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "mobile") {
      setFormData((prev) => ({
        ...prev,
        [name]: value.replace(/\D/g, "").slice(0, 10),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const fetchCityFromLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
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
            setError("Could not fetch city from your location");
          }
        } catch (err) {
          setError("Failed to fetch city details");
        } finally {
          setIsCityLoading(false);
        }
      },
      (err) => {
        setError("Location access denied. Please type your city manually.");
        setIsCityLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,
      }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (!files || !files[0]) return;

    const file = files[0];
    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      setError(validation.error || "Invalid document file");
      return;
    }

    if (name === "drivingLicense") {
      setDrivingLicenseFile(file);
    } else if (name === "nationalIdentityCard") {
      setNationalIdentityCardFile(file);
    }
    setError("");
  };

  const handleShowPolicy = async (title: string) => {
    setPolicyLoading(true);
    try {
      const policies = await getPolicies('delivery');
      const policy = policies.find((p: any) => p.title.toLowerCase().includes(title.toLowerCase()));
      if (policy) {
        setSelectedPolicy({ title: policy.title, content: policy.content });
        setShowPolicyModal(true);
      } else {
        alert(`${title} not found.`);
      }
    } catch (error) {
      console.error("Failed to fetch policy", error);
      alert("Failed to load policy content.");
    } finally {
      setPolicyLoading(false);
    }
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
      setError("Please fill all required fields");
      return;
    }

    if (!drivingLicenseFile || !nationalIdentityCardFile) {
      setError("Please upload all required documents (Driving License and ID Card)");
      return;
    }

    if (formData.mobile.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }


    setLoading(true);
    setError("");

    try {
      // Upload documents if provided
      let drivingLicenseUrl = formData.drivingLicenseUrl;
      let nationalIdentityCardUrl = formData.nationalIdentityCardUrl;

      if (drivingLicenseFile || nationalIdentityCardFile) {
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

        setUploadingDocs(false);
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
        bonusType: formData.bonusType || undefined,
        vehicleNumber: formData.vehicleNumber || undefined,
        vehicleType: formData.vehicleType || undefined,
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
          setError(
            otpErr.message || "Registration successful but failed to send OTP."
          );
        }
      }
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    setLoading(true);
    setError("");

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
      setError(err.message || "Invalid OTP. Please try again.");
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
                    className="w-full px-4 py-3 text-sm bg-neutral-50/50 border border-green-600/20 rounded-xl focus:outline-none focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all duration-300"
                    disabled={loading}
                  />
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
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Account holder name
                  </label>
                  <input
                    type="text"
                    name="accountName"
                    value={formData.accountName}
                    onChange={handleInputChange}
                    placeholder="Account holder name"
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    placeholder="Bank name"
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    placeholder="Account number"
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    IFSC Code
                  </label>
                  <input
                    type="text"
                    name="ifscCode"
                    value={formData.ifscCode}
                    onChange={handleInputChange}
                    placeholder="IFSC code"
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-2">
                    Bonus Type
                  </label>
                  <select
                    name="bonusType"
                    value={formData.bonusType}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2.5 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-200"
                    disabled={loading}>
                    {bonusTypes.map((type) => (
                      <option
                        key={type}
                        value={type === "Select Bonus Type" ? "" : type}>
                        {type}
                      </option>
                    ))}
                  </select>
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
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded text-center">
                  {error}
                </div>
              )}

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

              {error && (
                <div className="text-sm font-medium text-red-500 bg-red-50 p-4 rounded-[1.25rem] border border-red-100 text-center animate-shake">
                  {error}
                </div>
              )}

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => {
                    setShowOTP(false);
                    setError("");
                  }}
                  disabled={loading}
                  className="flex-1 max-w-[8rem] py-6 rounded-[1.25rem] font-bold text-sm bg-green-50 text-green-600 hover:bg-green-100 transition-all border border-green-100">
                  Back
                </button>
                <button
                  onClick={async () => {
                    setLoading(true);
                    setError("");
                    try {
                      const res = await sendOTP(formData.mobile);
                      if (res.sessionId) setSessionId(res.sessionId);
                    } catch (err: any) {
                      setError(err.message || "Failed to resend OTP.");
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


      {/* Policy Modal */}
      {showPolicyModal && selectedPolicy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-10 duration-500">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-green-600 text-white flex items-center justify-between">
              <h3 className="font-bold text-lg">{selectedPolicy.title}</h3>
              <button 
                onClick={() => setShowPolicyModal(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto text-neutral-600">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-sm">
                {selectedPolicy.content}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-100 flex justify-end bg-neutral-50">
              <button
                onClick={() => setShowPolicyModal(false)}
                className="px-8 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-600/30"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
