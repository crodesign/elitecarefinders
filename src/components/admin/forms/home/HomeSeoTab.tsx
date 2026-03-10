"use client";

import { SeoTab } from "../SeoTab";
import type { SeoFields } from "@/types";

interface HomeSeoTabProps {
    seo: SeoFields;
    onChange: (field: keyof SeoFields, value: SeoFields[keyof SeoFields]) => void;
    setIsDirty: (v: boolean) => void;
    defaultTitle?: string;
    defaultDescription?: string;
    defaultImage?: string;
    recordId?: string;
    onSaveSeo?: () => Promise<void>;
}

export function HomeSeoTab({ seo, onChange, setIsDirty, defaultTitle, defaultDescription, defaultImage, recordId, onSaveSeo }: HomeSeoTabProps) {
    return (
        <SeoTab
            seo={seo}
            onChange={onChange}
            setIsDirty={setIsDirty}
            defaults={{
                title: defaultTitle,
                description: defaultDescription,
                ogImage: defaultImage,
            }}
            recordId={recordId}
            contentType="home"
            onSaveSeo={onSaveSeo}
        />
    );
}
