"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getInjectedScripts } from "@/lib/services/siteSettingsService";

function injectNodes(html: string, target: HTMLElement) {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    Array.from(temp.childNodes).forEach((node) => {
        if (node.nodeName === "SCRIPT") {
            const orig = node as HTMLScriptElement;
            const script = document.createElement("script");
            Array.from(orig.attributes).forEach((attr) => script.setAttribute(attr.name, attr.value));
            script.textContent = orig.textContent;
            target.appendChild(script);
        } else {
            target.appendChild(node.cloneNode(true));
        }
    });
}

export function HeadInjector() {
    const pathname = usePathname();

    useEffect(() => {
        if (pathname?.startsWith("/admin")) return;
        getInjectedScripts().then((scripts) => {
            const enabled = scripts.filter((s) => s.enabled && s.code?.trim());
            enabled.filter((s) => s.location === "header").forEach((s) => injectNodes(s.code, document.head));
            enabled.filter((s) => s.location === "body" || s.location === "footer").forEach((s) => injectNodes(s.code, document.body));
        });
    }, []);

    return null;
}
