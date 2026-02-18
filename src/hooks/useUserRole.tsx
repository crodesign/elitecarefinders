import { useAuth } from '@/contexts/AuthContext';

export function useUserRole() {
  const { user, isAdmin, isInvoiceManager, loading } = useAuth();

  return {
    isAdmin,
    isInvoiceManager,
    loading,
    // Helper to check if user has admin-level access (admin OR invoice manager for invoice features)
    hasInvoiceAccess: isAdmin || isInvoiceManager,
    // Helper to determine if user should be restricted to invoices only
    // If isAdmin is true, they have full access, so they are not invoice-only.
    // If isInvoiceManager is true AND not Admin, they are invoice-only.
    isInvoiceOnly: isInvoiceManager && !isAdmin
  };
}