"use client";

import { SeoTab } from "../SeoTab";
import type { SeoFields } from "@/types";

interface FacilitySeoTabProps {
    seo: SeoFields;
    onChange: (field: keyof SeoFields, value: SeoFields[keyof SeoFields]) => void;
    setIsDirty: (v: boolean) => void;
    defaultTitle?: string;
    defaultDescription?: string;
    defaultImage?: string;
    recordId?: string;
    onSaveSeo?: () => Promise<void>;
}

export function FacilitySeoTab({ seo, onChange, setIsDirty, defaultTitle, defaultDescription, defaultImage, recordId, onSaveSeo }: FacilitySeoTabProps) {
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
            contentType="facility"
            onSaveSeo={onSaveSeo}
        />
    );
}
