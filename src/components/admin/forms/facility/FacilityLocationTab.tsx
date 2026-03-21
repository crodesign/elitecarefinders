"use client";

import { Dispatch, SetStateAction } from "react";
import { Check } from "lucide-react";
import { ICON_MAP } from "@/components/ui/IconPicker";
import type { RoomDetails, RoomFieldCategory, RoomFieldDefinition, RoomFixedFieldOption } from "@/types";
import { FacilityFieldCategory } from "./FacilityFieldCategory";

interface FacilityLocationTabProps {
    roomDetails: RoomDetails;
    setRoomDetails: Dispatch<SetStateAction<RoomDetails>>;
    setIsDirty: (value: boolean) => void;
    roomCategories: RoomFieldCategory[];
    roomDefinitions: RoomFieldDefinition[];
    fixedFieldOptions: RoomFixedFieldOption[];
    fixedFieldIcons: Record<string, string>;
    invalidEmailFields: Set<string>;
    setInvalidEmailFields: Dispatch<SetStateAction<Set<string>>>;
}

export function FacilityLocationTab({
    roomDetails,
    setRoomDetails,
    setIsDirty,
    roomCategories,
    roomDefinitions,
    fixedFieldOptions,
    fixedFieldIcons,
    invalidEmailFields,
    setInvalidEmailFields,
}: FacilityLocationTabProps) {
    const hasLocationFields = roomDefinitions.some(f =>
        f.isActive && (f.targetType === 'facility' || f.targetType === 'both') &&
        roomCategories.find(c => c.id === f.categoryId)?.section === 'location_details'
    );

    if (!hasLocationFields) {
        return (
            <div className="p-8 text-center text-content-muted">
                No location-specific detail fields have been configured yet.
                <br />
                <span className="text-sm">Add fields in Setup → Room Fields with section &quot;Location Details&quot;.</span>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Column 1: Levels of Care (Fixed) */}
            <div className="space-y-[10px]">
                <div className="bg-surface-input rounded-lg p-[5px]">
                    {(() => {
                        const Icon = fixedFieldIcons["levelOfCare"] ? ICON_MAP[fixedFieldIcons["levelOfCare"]] : null;
                        return (
                            <h3 className="text-sm font-medium text-content-secondary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
                                {Icon && <Icon className="h-4 w-4 text-accent" />}
                                Levels of Care
                            </h3>
                        );
                    })()}
                    <div className="bg-surface-input rounded-lg p-[3px]">
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                            {fixedFieldOptions
                                .filter(o => o.fieldType === 'levelOfCare')
                                .map((opt) => {
                                    const currentValues = roomDetails.levelOfCare || [];
                                    const isSelected = currentValues.includes(opt.value);
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => {
                                                const updated = isSelected
                                                    ? currentValues.filter(v => v !== opt.value)
                                                    : [...currentValues, opt.value];
                                                setRoomDetails((prev: RoomDetails) => ({
                                                    ...prev,
                                                    levelOfCare: updated
                                                }));
                                                setIsDirty(true);
                                            }}
                                            className={`w-full flex items-center justify-between p-[3px] rounded-lg text-left transition-all ${isSelected
                                                ? "text-content-primary"
                                                : "text-content-secondary hover:text-content-primary hover:bg-surface-hover"
                                                }`}
                                            style={isSelected ? { backgroundColor: 'var(--nav-active-bg)' } : undefined}
                                        >
                                            <span className="text-sm font-medium pl-[5px]">{opt.value}</span>
                                            {isSelected && (
                                                <span className="flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center">
                                                    <Check className="h-2.5 w-2.5 text-white" />
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                    </div>
                    </div>
                </div>

                {/* Languages Spoken (Fixed) */}
                <div className="bg-surface-input rounded-lg p-[5px]">
                    {(() => {
                        const Icon = fixedFieldIcons["language"] ? ICON_MAP[fixedFieldIcons["language"]] : null;
                        return (
                            <h3 className="text-sm font-medium text-content-secondary flex items-center gap-2 pt-[5px] pl-[5px] pb-[5px]">
                                {Icon && <Icon className="h-4 w-4 text-accent" />}
                                Languages Spoken
                            </h3>
                        );
                    })()}
                    <div className="bg-surface-input rounded-lg p-[3px]">
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                            {fixedFieldOptions
                                .filter(o => o.fieldType === 'language')
                                .map((opt) => {
                                    const currentValues = roomDetails.languages || [];
                                    const isSelected = currentValues.includes(opt.value);
                                    return (
                                        <button
                                            key={opt.id}
                                            type="button"
                                            onClick={() => {
                                                const updated = isSelected
                                                    ? currentValues.filter(v => v !== opt.value)
                                                    : [...currentValues, opt.value];
                                                setRoomDetails((prev: RoomDetails) => ({
                                                    ...prev,
                                                    languages: updated
                                                }));
                                                setIsDirty(true);
                                            }}
                                            className={`w-full flex items-center justify-between p-[3px] rounded-lg text-left transition-all ${isSelected
                                                ? "text-content-primary"
                                                : "text-content-secondary hover:text-content-primary hover:bg-surface-hover"
                                                }`}
                                            style={isSelected ? { backgroundColor: 'var(--nav-active-bg)' } : undefined}
                                        >
                                            <span className="text-sm font-medium pl-[5px]">{opt.value}</span>
                                            {isSelected && (
                                                <span className="flex-shrink-0 h-4 w-4 rounded bg-accent flex items-center justify-center">
                                                    <Check className="h-2.5 w-2.5 text-white" />
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                    </div>
                    </div>
                </div>

                {roomCategories
                    .filter(c => c.section === 'location_details' && c.columnNumber === 1)
                    .map(category => (
                        <FacilityFieldCategory
                            key={category.id}
                            category={category}
                            roomDetails={roomDetails}
                            setRoomDetails={setRoomDetails}
                            setIsDirty={setIsDirty}
                            roomDefinitions={roomDefinitions}
                            invalidEmailFields={invalidEmailFields}
                            setInvalidEmailFields={setInvalidEmailFields}
                        />
                    ))}
            </div>

            {/* Column 2 */}
            <div className="space-y-[10px]">
                {roomCategories
                    .filter(c => c.section === 'location_details' && c.columnNumber === 2)
                    .map(category => (
                        <FacilityFieldCategory
                            key={category.id}
                            category={category}
                            roomDetails={roomDetails}
                            setRoomDetails={setRoomDetails}
                            setIsDirty={setIsDirty}
                            roomDefinitions={roomDefinitions}
                            invalidEmailFields={invalidEmailFields}
                            setInvalidEmailFields={setInvalidEmailFields}
                        />
                    ))}
            </div>

            {/* Column 3 */}
            <div className="space-y-[10px]">
                {roomCategories
                    .filter(c => c.section === 'location_details' && (c.columnNumber === 3 || c.columnNumber === 4))
                    .map(category => (
                        <FacilityFieldCategory
                            key={category.id}
                            category={category}
                            roomDetails={roomDetails}
                            setRoomDetails={setRoomDetails}
                            setIsDirty={setIsDirty}
                            roomDefinitions={roomDefinitions}
                            invalidEmailFields={invalidEmailFields}
                            setInvalidEmailFields={setInvalidEmailFields}
                        />
                    ))}
            </div>
        </div>
    );
}




