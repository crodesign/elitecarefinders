"use client";

import { useEffect } from "react";
import { getInjectedScripts } from "@/lib/services/siteSettingsService";

function injectNodes(html: string, target: HTMLElement) {
    const temp = document.createElement("div");
    temp.innerHTML = html;
    Array.from(temp.childNodes).forEach((node) => {
        target.appendChild(node.cloneNode(true));
    });
}

export function HeadInjector() {
    useEffect(() => {
        getInjectedScripts().then((scripts) => {
            const enabled = scripts.filter((s) => s.enabled && s.code?.trim());
            enabled.filter((s) => s.location === "header").forEach((s) => injectNodes(s.code, document.head));
            enabled.filter((s) => s.location === "body" || s.location === "footer").forEach((s) => injectNodes(s.code, document.body));
        });
    }, []);

    return null;
}
