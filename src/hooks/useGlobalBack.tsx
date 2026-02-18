import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface BackHistoryItem {
  pathname: string;
  search: string;
  hash: string;
}

interface GlobalBackContextType {
  goBack: () => void;
  canGoBack: boolean;
  getBackPath: () => string;
}

const GlobalBackContext = createContext<GlobalBackContextType | undefined>(undefined);

// Define listing pages that reset the back history
const LISTING_PAGES = ['/', '/invoices'];

export const GlobalBackProvider = ({ children }: { children: ReactNode }) => {
  const [backHistory, setBackHistory] = useState<BackHistoryItem[]>([]);
  const location = useLocation();
  const navigate = useNavigate();

  // Check if current path is a listing page
  const isListingPage = useCallback((pathname: string) => {
    return LISTING_PAGES.includes(pathname);
  }, []);

  // Track navigation changes
  useEffect(() => {
    const currentPath = location.pathname + location.search + location.hash;
    
    // If we're on a listing page, reset the back history
    if (isListingPage(location.pathname)) {
      setBackHistory([]);
      return;
    }

    // Add current location to back history if it's not already the last item
    setBackHistory(prev => {
      const lastItem = prev[prev.length - 1];
      const currentItem = {
        pathname: location.pathname,
        search: location.search,
        hash: location.hash
      };
      
      // Don't add duplicate entries
      if (lastItem && 
          lastItem.pathname === currentItem.pathname && 
          lastItem.search === currentItem.search && 
          lastItem.hash === currentItem.hash) {
        return prev;
      }
      
      // Keep only the last 10 entries to prevent memory issues
      const newHistory = [...prev, currentItem];
      return newHistory.slice(-10);
    });
  }, [location, isListingPage]);

  const goBack = useCallback(() => {
    // Check if current page has a 'from' parameter to respect
    const searchParams = new URLSearchParams(location.search);
    const fromPage = searchParams.get('from');
    
    if (fromPage === 'invoices') {
      navigate('/invoices');
      return;
    }
    
    if (backHistory.length > 1) {
      // Remove current page and go to previous
      const previousPage = backHistory[backHistory.length - 2];
      setBackHistory(prev => prev.slice(0, -1));
      navigate(previousPage.pathname + previousPage.search + previousPage.hash);
    } else {
      // Fallback to listing page
      navigate('/');
    }
  }, [backHistory, navigate, location.search]);

  const canGoBack = backHistory.length > 1;

  const getBackPath = useCallback(() => {
    // Check if current page has a 'from' parameter to respect
    const searchParams = new URLSearchParams(location.search);
    const fromPage = searchParams.get('from');
    
    if (fromPage === 'invoices') {
      return '/invoices';
    }
    
    if (backHistory.length > 1) {
      const previousPage = backHistory[backHistory.length - 2];
      return previousPage.pathname + previousPage.search + previousPage.hash;
    }
    return '/';
  }, [backHistory, location.search]);

  return (
    <GlobalBackContext.Provider value={{ goBack, canGoBack, getBackPath }}>
      {children}
    </GlobalBackContext.Provider>
  );
};

export const useGlobalBack = () => {
  const context = useContext(GlobalBackContext);
  if (context === undefined) {
    throw new Error('useGlobalBack must be used within a GlobalBackProvider');
  }
  return context;
};
