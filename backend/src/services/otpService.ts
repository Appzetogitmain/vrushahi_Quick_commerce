import Otp from '../models/Otp';
import PRPSMSService from './prpSmsService';

/**
 * Interface for OTP Response
 */
interface OtpResponse {
  success: boolean;
  sessionId?: string;
  message: string;
}

type UserType = 'Customer' | 'Delivery' | 'Seller' | 'Admin';

/**
 * Generate numeric OTP
 */
export function generateOTP(length: number = 4): string {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
}

/**
 * Save OTP to database
 */
async function saveOtpToDb(mobile: string, otp: string, userType: UserType): Promise<void> {
  // Normalize mobile number (remove any non-digits, ensure consistent format)
  const normalizedMobile = mobile.replace(/\D/g, '');

  await Otp.deleteMany({ mobile: normalizedMobile, userType });
  await Otp.create({
    mobile: normalizedMobile,
    otp: otp.trim(),
    userType,
    expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes expiry
  });
}

/**
 * Verify OTP from database
 */
async function verifyOtpFromDb(mobile: string, otp: string, userType: UserType): Promise<boolean> {
  // Normalize mobile number (remove any non-digits, ensure consistent format)
  const normalizedMobile = mobile.replace(/\D/g, '');

  const record = await Otp.findOne({
    mobile: normalizedMobile,
    userType,
    otp: otp.trim()
  });

  // Check for DEFAULT_OTP from environment variable
  const defaultOtp = process.env.DEFAULT_OTP;
  if (defaultOtp && otp.trim() === defaultOtp) {
    console.log(`[OTP] Using default OTP bypass for ${mobile}`);
    return true;
  }

  if (!record) {
    console.error('OTP verification failed - record not found:', {
      mobile: normalizedMobile,
      userType,
      otp: otp.trim(),
      availableRecords: await Otp.find({ mobile: normalizedMobile, userType }).select('otp expiresAt')
    });
    return false;
  }

  if (record.expiresAt < new Date()) {
    await Otp.deleteOne({ _id: record._id });
    console.error('OTP verification failed - expired:', {
      mobile: normalizedMobile,
      expiresAt: record.expiresAt,
      now: new Date()
    });
    return false;
  }

  await Otp.deleteOne({ _id: record._id });
  return true;
}

/**
 * Check if special bypass should be used
 */
function isSpecialBypass(mobile: string): boolean {
  return mobile === '9111966732';
}

/**
 * Check if mock mode should be used
 */
function isMockMode(): boolean {
  return process.env.USE_MOCK_OTP === 'true';
}

/**
 * Check if developer bypass OTP
 */
function isDeveloperBypass(otp: string): boolean {
  return (process.env.NODE_ENV !== 'production' || process.env.USE_MOCK_OTP === 'true') && otp === '9999';
}

// ==========================================
// SMS OTP (Customer / Delivery)
// ==========================================

export async function sendSmsOtp(
  mobile: string,
  userType: 'Customer' | 'Delivery' | 'Seller' = 'Delivery'
): Promise<OtpResponse> {
  try {
    const otp = generateOTP(4);

    // Special number bypass or development mode
    if (isSpecialBypass(mobile)) {
      const specialOtp = '1234';
      await saveOtpToDb(mobile, specialOtp, userType);
      return {
        success: true,
        sessionId: 'DB_VERIFIED_' + mobile,
        message: 'OTP sent successfully (Dev Mode: 1234)',
      };
    }

    // Mock mode
    if (isMockMode()) {
      await saveOtpToDb(mobile, otp, userType);
      return {
        success: true,
        sessionId: 'MOCK_SESSION_' + mobile,
        message: 'OTP sent successfully',
      };
    }

    // Real mode - Send via PRPSMS
    await saveOtpToDb(mobile, otp, userType);
    const result = await PRPSMSService.sendOTP(mobile, otp);

    if (!result.success) {
      throw new Error(result.error || 'Failed to send OTP via PRPSMS');
    }

    return {
      success: true,
      sessionId: 'DB_VERIFIED_' + mobile,
      message: 'OTP sent successfully',
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to send OTP. Please try again.';
    console.error('SMS OTP Error (sendSmsOtp):', {
      error: errorMessage,
      mobile,
      userType,
    });
    throw new Error(errorMessage);
  }
}

export async function verifySmsOtp(
  sessionId: string,
  otpInput: string,
  mobile?: string,
  userType: 'Customer' | 'Delivery' = 'Delivery'
): Promise<boolean> {
  if (isDeveloperBypass(otpInput)) {
    return true;
  }

  // Normalize OTP input (remove spaces, ensure it's a string)
  const normalizedOtp = String(otpInput).trim().replace(/\s/g, '');

  if (!normalizedOtp || (normalizedOtp.length !== 4 && normalizedOtp !== '9999')) {
    console.error('OTP verification failed - invalid OTP format:', {
      otpInput,
      normalizedOtp,
      length: normalizedOtp.length
    });
    return false;
  }

  let targetMobile = mobile;
  if (!targetMobile && sessionId) {
    if (sessionId.startsWith('DB_VERIFIED_')) {
      targetMobile = sessionId.replace('DB_VERIFIED_', '');
    } else if (sessionId.startsWith('MOCK_SESSION_')) {
      targetMobile = sessionId.replace('MOCK_SESSION_', '');
    }
  }

  if (!targetMobile) {
    console.error('OTP verification failed - no mobile number:', {
      sessionId,
      mobile,
      userType
    });
    return false;
  }

  // Normalize mobile number
  const normalizedMobile = targetMobile.replace(/\D/g, '');

  if (normalizedMobile.length !== 10) {
    console.error('OTP verification failed - invalid mobile format:', {
      original: targetMobile,
      normalized: normalizedMobile,
      length: normalizedMobile.length
    });
    return false;
  }

  return verifyOtpFromDb(normalizedMobile, normalizedOtp, userType);
}

// ==========================================
// SMS OTP (Seller / Admin)
// ==========================================

export async function sendOTP(
  mobile: string,
  userType: 'Seller' | 'Admin' | 'Customer' | 'Delivery',
  _isLogin: boolean = true
): Promise<OtpResponse> {
  try {
    const otp = generateOTP(4);

    // Special number bypass or development mode
    if (isSpecialBypass(mobile)) {
      const specialOtp = '1234';
      await saveOtpToDb(mobile, specialOtp, userType);
      return {
        success: true,
        message: 'OTP sent successfully (Dev Mode: 1234)',
      };
    }

    // Mock mode
    if (isMockMode()) {
      await saveOtpToDb(mobile, otp, userType);
      return {
        success: true,
        message: 'OTP sent successfully',
      };
    }

    // Real mode - Send via PRPSMS
    await saveOtpToDb(mobile, otp, userType);
    const result = await PRPSMSService.sendOTP(mobile, otp);

    if (!result.success) {
      throw new Error(result.error || 'Failed to send OTP via PRPSMS');
    }

    return {
      success: true,
      message: 'OTP sent successfully',
    };
  } catch (error: any) {
    const errorMessage = error.message || 'Failed to send OTP. Please try again.';
    console.error('SMS OTP Error (sendOTP):', {
      error: errorMessage,
      mobile,
      userType,
    });
    throw new Error(errorMessage);
  }
}

export async function verifyOTP(
  mobile: string,
  otpInput: string,
  userType: 'Seller' | 'Admin' | 'Customer' | 'Delivery'
): Promise<boolean> {
  if (isDeveloperBypass(otpInput)) {
    return true;
  }

  // Normalize OTP input (remove spaces, ensure it's a string)
  const normalizedOtp = String(otpInput).trim().replace(/\s/g, '');

  if (!normalizedOtp || (normalizedOtp.length !== 4 && normalizedOtp !== '9999')) {
    console.error('OTP verification failed - invalid OTP format:', {
      otpInput,
      normalizedOtp,
      length: normalizedOtp.length
    });
    return false;
  }

  // Normalize mobile number
  const normalizedMobile = mobile.replace(/\D/g, '');

  if (normalizedMobile.length !== 10) {
    console.error('OTP verification failed - invalid mobile format:', {
      original: mobile,
      normalized: normalizedMobile,
      length: normalizedMobile.length
    });
    return false;
  }

  return verifyOtpFromDb(normalizedMobile, normalizedOtp, userType);
}
