"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ReactNode } from "react";

export const TooltipContent = TooltipPrimitive.Content;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export function TooltipProvider({ children, ...props }: TooltipPrimitive.TooltipProviderProps) {
    return <TooltipPrimitive.Provider {...props}>{children}</TooltipPrimitive.Provider>;
}

interface TooltipProps {
    children: ReactNode;
    content?: ReactNode;
    side?: "top" | "right" | "bottom" | "left";
    delayDuration?: number;
}

export function Tooltip({ children, content, side = "top", delayDuration = 300 }: TooltipProps) {
    return (
        <TooltipPrimitive.Provider delayDuration={delayDuration}>
            <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                    {children}
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                        className="px-3 py-2 text-xs rounded-lg z-[9999] max-w-sm leading-relaxed"
                        style={{
                            background: 'var(--surface-secondary)',
                            color: 'var(--content-primary)',
                            border: '1px solid rgba(128,128,128,0.25)',
                            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                        }}
                        sideOffset={5}
                        side={side}
                    >
                        {content}
                        <TooltipPrimitive.Arrow style={{ fill: 'var(--surface-secondary)', stroke: 'rgba(128,128,128,0.25)', strokeWidth: 1 }} />
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    );
}
