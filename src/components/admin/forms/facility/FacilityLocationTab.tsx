"use client";

import { Dispatch, SetStateAction } from "react";
import { Check, X } from "lucide-react";
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
            <div className="p-8 text-center text-zinc-500">
                No location-specific detail fields have been configured yet.
                <br />
                <span className="text-sm">Add fields in Setup → Room Fields with section &quot;Location Details&quot;.</span>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
            {/* Column 1: Levels of Care (Fixed) */}
            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="bg-white/5 rounded-lg p-3 space-y-3">
                        {(() => {
                            const Icon = fixedFieldIcons["levelOfCare"] ? ICON_MAP[fixedFieldIcons["levelOfCare"]] : null;
                            return (
                                <div className="flex items-center gap-2 mb-2">
                                    {Icon && <Icon className="h-5 w-5 text-accent" />}
                                    <label className="text-base font-medium text-white/80 block">Levels of Care</label>
                                </div>
                            );
                        })()}
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
                                            className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all ${isSelected
                                                ? "bg-white/10 text-white"
                                                : "bg-white/10 hover:bg-white/15 text-zinc-400"
                                                }`}
                                        >
                                            <span className="text-sm font-medium">{opt.value}</span>
                                            <div className={`w-4 h-4 rounded flex items-center justify-center ${isSelected
                                                ? "border border-accent bg-accent text-white"
                                                : "bg-black/80"
                                                }`}>
                                                {isSelected ? <Check className="h-3 w-3 text-white" /> : <X className="h-3 w-3 text-zinc-500" />}
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>
                    </div>
                </div>

                {/* Languages Spoken (Fixed) */}
                <div className="space-y-4">
                    <div className="bg-white/5 rounded-lg p-3 space-y-3">
                        {(() => {
                            const Icon = fixedFieldIcons["language"] ? ICON_MAP[fixedFieldIcons["language"]] : null;
                            return (
                                <div className="flex items-center gap-2 mb-2">
                                    {Icon && <Icon className="h-5 w-5 text-accent" />}
                                    <label className="text-base font-medium text-white/80 block">Languages Spoken</label>
                                </div>
                            );
                        })()}
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
                                            className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all ${isSelected
                                                ? "bg-white/10 text-white"
                                                : "bg-white/10 hover:bg-white/15 text-zinc-400"
                                                }`}
                                        >
                                            <span className="text-sm font-medium">{opt.value}</span>
                                            <div className={`w-4 h-4 rounded flex items-center justify-center ${isSelected
                                                ? "border border-accent bg-accent text-white"
                                                : "bg-black/80"
                                                }`}>
                                                {isSelected ? <Check className="h-3 w-3 text-white" /> : <X className="h-3 w-3 text-zinc-500" />}
                                            </div>
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
            <div className="space-y-6">
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
            <div className="space-y-6">
                {roomCategories
                    .filter(c => c.section === 'location_details' && c.columnNumber === 3)
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

            {/* Column 4 */}
            <div className="space-y-6">
                {roomCategories
                    .filter(c => c.section === 'location_details' && c.columnNumber === 4)
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
