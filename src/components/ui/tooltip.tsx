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
                        className="px-3 py-2 text-xs rounded-md z-[9999] max-w-sm"
                        style={{ backgroundColor: 'var(--nav-active-bg)', color: 'var(--tooltip-text)' }}
                        sideOffset={5}
                        side={side}
                    >
                        {content}
                        <TooltipPrimitive.Arrow style={{ fill: 'var(--nav-active-bg)' }} />
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    );
}
