"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getInjectedScripts } from "@/lib/services/siteSettingsService";

function injectNodes(html: string, target: HTMLElement, tracker: Node[]) {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    Array.from(temp.childNodes).forEach((node) => {
        if (node.nodeName === "SCRIPT") {
            const orig = node as HTMLScriptElement;
            const src = orig.getAttribute("src");
            if (src && document.querySelector(`script[src="${src}"]`)) return;
            const script = document.createElement("script");
            Array.from(orig.attributes).forEach((attr) => script.setAttribute(attr.name, attr.value));
            script.textContent = orig.textContent;
            target.appendChild(script);
            tracker.push(script);
        } else {
            const cloned = node.cloneNode(true);
            target.appendChild(cloned);
            tracker.push(cloned);
        }
    });
}

export function HeadInjector() {
    const pathname = usePathname();
    const injectedNodes = useRef<Node[]>([]);
    const isAdmin = pathname?.startsWith("/admin");

    useEffect(() => {
        if (isAdmin) {
            injectedNodes.current.forEach((n) => {
                try { n.parentNode?.removeChild(n); } catch {}
            });
            injectedNodes.current = [];
            return;
        }
        if (injectedNodes.current.length > 0) return;

        let cancelled = false;
        const tracker: Node[] = [];
        getInjectedScripts().then((scripts) => {
            if (cancelled) return;
            const enabled = scripts.filter((s) => s.enabled && s.code?.trim());
            enabled.filter((s) => s.location === "header").forEach((s) => injectNodes(s.code, document.head, tracker));
            enabled.filter((s) => s.location === "body" || s.location === "footer").forEach((s) => injectNodes(s.code, document.body, tracker));
            injectedNodes.current = tracker;
        });

        return () => {
            cancelled = true;
            tracker.forEach((n) => {
                try { n.parentNode?.removeChild(n); } catch {}
            });
            injectedNodes.current = [];
        };
    }, [isAdmin]);

    return null;
}
