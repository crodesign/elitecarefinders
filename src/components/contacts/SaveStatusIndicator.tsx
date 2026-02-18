import React from 'react';
import { CheckCircle, Loader, AlertCircle, WifiOff, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SaveStatus } from '@/hooks/useAutoSave';

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  lastSaved?: Date | null;
  queuedCount?: number;
  onRetry?: () => void;
  className?: string;
}

export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({
  status,
  lastSaved,
  queuedCount = 0,
  onRetry,
  className = "",
}) => {
  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    
    if (diffSec < 30) return 'just now';
    if (diffMin < 1) return `${diffSec}s ago`;
    if (diffMin < 60) return `${diffMin}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: <Loader className="h-3 w-3 animate-spin" />,
          text: 'Saving...',
          variant: 'secondary' as const,
          className: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'saved':
        return {
          icon: <CheckCircle className="h-3 w-3" />,
          text: lastSaved ? `Saved ${formatLastSaved(lastSaved)}` : 'Saved',
          variant: 'secondary' as const,
          className: 'bg-green-50 text-green-700 border-green-200',
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          text: 'Save failed',
          variant: 'destructive' as const,
          className: 'bg-red-50 text-red-700 border-red-200',
        };
      case 'offline':
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: queuedCount > 0 ? `${queuedCount} queued` : 'Offline',
          variant: 'secondary' as const,
          className: 'bg-orange-50 text-orange-700 border-orange-200',
        };
      default:
        return {
          icon: <Clock className="h-3 w-3" />,
          text: lastSaved ? `Last saved ${formatLastSaved(lastSaved)}` : 'Auto-save enabled',
          variant: 'outline' as const,
          className: 'bg-white text-muted-foreground border-muted',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Badge 
        variant={config.variant}
        className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium ${config.className}`}
      >
        {config.icon}
        {config.text}
      </Badge>
      
      {status === 'error' && onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="h-6 px-2 text-xs"
        >
          Retry
        </Button>
      )}
      
      {status === 'offline' && queuedCount > 0 && (
        <span className="text-xs text-muted-foreground">
          Changes will sync when online
        </span>
      )}
    </div>
  );
};