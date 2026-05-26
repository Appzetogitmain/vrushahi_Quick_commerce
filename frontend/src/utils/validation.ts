import validator from 'validator';

export const validateEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email) {
    return { isValid: false, error: "Email address is required" };
  }
  if (email.length > 254) {
    return { isValid: false, error: "Email cannot exceed 254 characters" };
  }
  if (email.includes(' ')) {
    return { isValid: false, error: "Email cannot contain spaces" };
  }
  if (email.includes('..')) {
    return { isValid: false, error: "Email cannot contain consecutive dots" };
  }
  if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(email)) {
    return { isValid: false, error: "Please enter a valid email format (e.g. user@gmail.com)" };
  }
  if (!validator.isEmail(email)) {
    return { isValid: false, error: "Please enter a valid email address" };
  }
  
  return { isValid: true };
};
