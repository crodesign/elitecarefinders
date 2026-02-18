import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const { isInvoiceOnly, loading: roleLoading } = useUserRole();
  const location = useLocation();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // If user is invoice manager (invoice-only), restrict access to invoice routes only
  if (isInvoiceOnly) {
    const allowedPaths = ['/invoices'];
    // Allow contact view/edit only when coming from invoices (has from=invoices param)
    const isFromInvoices = location.search.includes('from=invoices');
    const isContactRoute = location.pathname.includes('/contact/') && 
                          (location.pathname.includes('/view') || location.pathname.includes('/edit'));
    
    if (!allowedPaths.some(path => location.pathname.startsWith(path)) && 
        !(isContactRoute && isFromInvoices)) {
      return <Navigate to="/invoices" replace />;
    }
  }

  return <>{children}</>;
}