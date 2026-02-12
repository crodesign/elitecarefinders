"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { ReactNode } from "react";


interface TooltipProps {
    children: ReactNode;
    content: ReactNode;
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
                        className="px-3 py-2 text-xs text-white bg-zinc-800 border border-zinc-600 rounded-md z-[9999] max-w-sm"
                        sideOffset={5}
                        side={side}
                    >
                        {content}
                        <TooltipPrimitive.Arrow className="fill-zinc-800" />
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    );
}
