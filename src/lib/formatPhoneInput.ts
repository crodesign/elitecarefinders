export const formatPhoneInput = (input: string): string => {
  // Remove all non-digit characters
  const digits = input.replace(/\D/g, '');
  
  // Apply formatting based on length
  if (digits.length === 0) {
    return '';
  } else if (digits.length <= 3) {
    return `(${digits}`;
  } else if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
};

export const handlePhoneInput = (value: string, updateCallback: (field: string, value: string) => void, fieldName: string) => {
  const formatted = formatPhoneInput(value);
  updateCallback(fieldName, formatted);
};