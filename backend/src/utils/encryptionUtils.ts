import crypto from "crypto";

// Ensure we have a 32-byte key. Fallback if not set in environmental variables.
const ENCRYPTION_KEY_RAW = process.env.BANK_DETAILS_ENCRYPTION_KEY || "vru_qcommerce_secret_enc_key_32b";
// Must be exactly 32 bytes for AES-256
const ENCRYPTION_KEY = Buffer.alloc(32);
Buffer.from(ENCRYPTION_KEY_RAW.padEnd(32, "x")).copy(ENCRYPTION_KEY);

const IV_LENGTH = 16; // AES block size is 16 bytes

/**
 * Encrypt clear text using AES-256-CBC
 */
export function encrypt(text: string): string {
  if (!text) return "";
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  } catch (error) {
    console.error("[Encryption Error] Failed to encrypt text:", error);
    return text;
  }
}

/**
 * Decrypt cipher text. Fallback to raw text if decryption fails or format is invalid.
 */
export function decrypt(text: string): string {
  if (!text) return "";
  if (!text.includes(":")) {
    // If not in standard iv:ciphertext format, it is likely unencrypted/legacy data
    return text;
  }
  try {
    const parts = text.split(":");
    const iv = Buffer.from(parts.shift()!, "hex");
    const encryptedText = Buffer.from(parts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("utf8");
  } catch (error) {
    // Fallback gracefully to raw text to avoid breaking any existing database values
    return text;
  }
}
