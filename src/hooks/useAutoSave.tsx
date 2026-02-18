import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface AutoSaveOptions {
  debounceMs?: number;
  onSave: (data: any) => Promise<any>;
  onError?: (error: Error) => void;
}

interface QueuedSave {
  id: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

export function useAutoSave(options: AutoSaveOptions) {
  const { debounceMs = 800, onSave, onError } = options;
  const { toast } = useToast();
  
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const queueRef = useRef<QueuedSave[]>([]);
  const currentDataRef = useRef<any>(null);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processOfflineQueue();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Process queued saves when back online
  const processOfflineQueue = useCallback(async () => {
    const queue = [...queueRef.current];
    queueRef.current = [];

    for (const queuedSave of queue) {
      try {
        await onSave(queuedSave.data);
        setLastSaved(new Date());
        
        // Show success toast for queued saves
        toast({
          title: "Offline changes saved",
          description: "Your data has been synchronized.",
        });
      } catch (error) {
        // Re-queue failed saves with retry limit
        if (queuedSave.retryCount < 3) {
          queueRef.current.push({
            ...queuedSave,
            retryCount: queuedSave.retryCount + 1,
          });
        } else {
          console.error('Failed to save queued data after retries:', error);
          onError?.(error as Error);
        }
      }
    }
  }, [onSave, onError, toast]);

  // Queue save for offline
  const queueSave = useCallback((data: any) => {
    const queuedSave: QueuedSave = {
      id: Date.now().toString(),
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };
    
    queueRef.current.push(queuedSave);
    setStatus('offline');
    
    // Store in localStorage as backup
    try {
      localStorage.setItem('autoSaveQueue', JSON.stringify(queueRef.current));
    } catch (e) {
      console.warn('Failed to store offline queue:', e);
    }
  }, []);

  // Perform the actual save
  const performSave = useCallback(async (data: any) => {
    if (!isOnline) {
      queueSave(data);
      return;
    }

    try {
      setStatus('saving');
      await onSave(data);
      setStatus('saved');
      setLastSaved(new Date());
      
      // Auto-hide success status after 2 seconds
      setTimeout(() => {
        setStatus('idle');
      }, 2000);
      
    } catch (error) {
      console.error('Auto-save failed:', error);
      setStatus('error');
      onError?.(error as Error);
      
      // Don't queue database validation errors - they need to be fixed, not retried
      const errorMessage = (error as any)?.message || '';
      if (!errorMessage.includes('invalid input syntax') && !errorMessage.includes('22007')) {
        queueSave(data);
      }
    }
  }, [isOnline, onSave, onError, queueSave]);

  // Debounced save function
  const save = useCallback((data: any) => {
    console.log('Auto-save triggered, debouncing for', debounceMs, 'ms');
    currentDataRef.current = data;
    
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      console.log('Executing auto-save after debounce');
      performSave(data);
    }, debounceMs);
  }, [debounceMs, performSave]);

  // Force immediate save
  const saveNow = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    if (currentDataRef.current) {
      await performSave(currentDataRef.current);
    }
  }, [performSave]);

  // Restore offline queue on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('autoSaveQueue');
      if (stored) {
        queueRef.current = JSON.parse(stored);
        localStorage.removeItem('autoSaveQueue');
        
        if (isOnline && queueRef.current.length > 0) {
          processOfflineQueue();
        }
      }
    } catch (e) {
      console.warn('Failed to restore offline queue:', e);
    }
  }, [isOnline, processOfflineQueue]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    save,
    saveNow,
    status,
    isOnline,
    lastSaved,
    queuedCount: queueRef.current.length,
  };
}