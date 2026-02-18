export const isValidEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export const validateEmailField = (email: string | null | undefined): string | null => {
  if (!email || email.trim() === '') {
    return null; // Allow empty emails
  }
  
  if (!isValidEmail(email)) {
    return 'Please enter a valid email address';
  }
  
  return null;
};