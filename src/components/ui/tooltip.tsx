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
                        className="px-3 py-2 text-xs text-white bg-surface-secondary border border-ui-border rounded-md z-[9999] max-w-sm"
                        sideOffset={5}
                        side={side}
                    >
                        {content}
                        <TooltipPrimitive.Arrow className="fill-surface-secondary" />
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    );
}
