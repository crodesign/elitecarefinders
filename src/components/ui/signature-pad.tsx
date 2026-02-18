import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from './button';
import { RefreshCw } from 'lucide-react';

interface SignaturePadProps {
  value?: string;
  onChange?: (signature: string) => void;
  disabled?: boolean;
  width?: number;
  height?: number;
}

export interface SignaturePadRef {
  clear: () => void;
  isEmpty: () => boolean;
  getSignatureData: () => string;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ value, onChange, disabled = false, width = 400, height = 120 }, ref) => {
    const sigPadRef = useRef<SignatureCanvas>(null);

    useImperativeHandle(ref, () => ({
      clear: () => {
        sigPadRef.current?.clear();
        onChange?.('');
      },
      isEmpty: () => {
        return sigPadRef.current?.isEmpty() ?? true;
      },
      getSignatureData: () => {
        return sigPadRef.current?.toDataURL() ?? '';
      }
    }));

    useEffect(() => {
      if (value && sigPadRef.current) {
        try {
          // Clear the canvas first to prevent duplication
          sigPadRef.current.clear();
          sigPadRef.current.fromDataURL(value);
        } catch (error) {
          console.error('Error loading signature:', error);
        }
      }
    }, [value]);

    const handleEnd = () => {
      if (!disabled && sigPadRef.current && onChange) {
        const signatureData = sigPadRef.current.toDataURL();
        onChange(signatureData);
      }
    };

    const handleClear = () => {
      sigPadRef.current?.clear();
      onChange?.('');
    };

    return (
      <div className="space-y-2">
        <div className="border border-input rounded-md bg-background relative">
          {disabled && (
            <div className="absolute inset-0 bg-muted/50 z-10 rounded-md" />
          )}
          <SignatureCanvas
            ref={sigPadRef}
            canvasProps={{
              width: width,
              height: height,
              className: 'signature-canvas w-full',
              style: { 
                width: '100%', 
                height: `${height}px`,
                pointerEvents: disabled ? 'none' : 'auto'
              }
            }}
            backgroundColor="transparent"
            penColor="#000000"
            minWidth={1}
            maxWidth={2}
            onEnd={handleEnd}
          />
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute top-2 right-2 h-6 w-6 p-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          )}
        </div>
        {!disabled && (
          <p className="text-xs text-muted-foreground">
            Sign above using your mouse, finger, or stylus. Click the refresh icon to clear.
          </p>
        )}
      </div>
    );
  }
);

SignaturePad.displayName = 'SignaturePad';

export { SignaturePad };