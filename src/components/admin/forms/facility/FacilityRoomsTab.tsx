"use client";

import { Dispatch, SetStateAction } from "react";
import { Bed, Check, ChevronUp, ChevronDown, X } from "lucide-react";
import type { RoomDetails, RoomFieldCategory, RoomFieldDefinition, RoomFixedFieldOption } from "@/types";
import { SimpleSelect } from "../../SimpleSelect";
import { FacilityFieldCategory } from "./FacilityFieldCategory";

interface FacilityRoomsTabProps {
    roomDetails: RoomDetails;
    setRoomDetails: Dispatch<SetStateAction<RoomDetails>>;
    setIsDirty: (value: boolean) => void;
    roomCategories: RoomFieldCategory[];
    roomDefinitions: RoomFieldDefinition[];
    fixedFieldOptions: RoomFixedFieldOption[];
    invalidEmailFields: Set<string>;
    setInvalidEmailFields: Dispatch<SetStateAction<Set<string>>>;
}

export function FacilityRoomsTab({
    roomDetails,
    setRoomDetails,
    setIsDirty,
    roomCategories,
    roomDefinitions,
    fixedFieldOptions,
    invalidEmailFields,
    setInvalidEmailFields,
}: FacilityRoomsTabProps) {
    const hasFacilityFields = roomDefinitions.some(f =>
        f.isActive && (f.targetType === 'facility' || f.targetType === 'both')
    );

    if (!hasFacilityFields) {
        return (
            <div className="p-8 text-center text-content-muted">
                No facility-specific detail fields have been configured yet.
                <br />
                <span className="text-sm">Add fields in Setup → Room Fields with target type &quot;Facility&quot; or &quot;Both&quot;.</span>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {/* Column 1: General Info & Col 1 Categories */}
            <div className="space-y-[10px]">
                {/* Fixed Fields Section (General Room Info) */}
                <div className="bg-surface-input rounded-lg p-[5px]">
                    <div className="flex items-center gap-2 pl-[5px]">
                        <Bed className="h-4 w-4 text-accent" />
                        <h3 className="text-sm font-medium text-content-primary flex items-center gap-2 pt-[5px] pb-[5px]">General Info</h3>
                    </div>
                    <div className="space-y-2">
                    {/* Room Price */}
                    <div className="min-h-[40px] flex items-center justify-between gap-2 p-[3px] rounded-lg transition-all bg-surface-hover">
                        <label className="text-sm font-medium text-content-secondary pl-[5px]">Room Price</label>
                        <div className="relative w-32">
                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${roomDetails.roomPrice ? "text-content-secondary" : "text-content-muted"}`}>$</span>
                            <input
                                type="number"
                                value={roomDetails.roomPrice || ""}
                                onChange={(e) => {
                                    setRoomDetails((prev: RoomDetails) => ({ ...prev, roomPrice: parseFloat(e.target.value) || undefined }));
                                    setIsDirty(true);
                                }}
                                className="w-full rounded-md px-2 pl-6 pr-8 py-1 text-sm text-left form-input [&::-webkit-inner-spin-button]:appearance-none"
                                placeholder="0.00"
                            />
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRoomDetails((prev: RoomDetails) => ({ ...prev, roomPrice: (prev.roomPrice || 0) + 1 }));
                                        setIsDirty(true);
                                    }}
                                    className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"
                                >
                                    <ChevronUp className="h-2 w-2" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRoomDetails((prev: RoomDetails) => ({ ...prev, roomPrice: Math.max(0, (prev.roomPrice || 0) - 1) }));
                                        setIsDirty(true);
                                    }}
                                    className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"
                                >
                                    <ChevronDown className="h-2 w-2" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bedroom Type - multi-select */}
                    <div className="bg-surface-input rounded-lg p-[3px] space-y-2" style={{ border: '2px solid var(--form-border-subtle)' }}>
                        <label className="text-sm font-medium text-content-secondary block pl-[5px] pt-[2px] pb-0">Bedroom Type</label>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                            {fixedFieldOptions.filter(o => o.fieldType === 'bedroom').map((opt) => {
                                const selected = (roomDetails.bedroomTypes || []).includes(opt.value);
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => {
                                            const current = roomDetails.bedroomTypes || [];
                                            const updated = selected
                                                ? current.filter(v => v !== opt.value)
                                                : [...current, opt.value];
                                            setRoomDetails((prev: RoomDetails) => ({ ...prev, bedroomTypes: updated }));
                                            setIsDirty(true);
                                        }}
                                        className={`w-full flex items-center justify-between p-[3px] rounded-lg text-left transition-all ${selected ? "bg-surface-hover text-content-primary" : "bg-surface-hover hover:bg-surface-input text-content-secondary"}`}
                                    >
                                        <span className="text-sm font-medium pl-[5px]">{opt.value}</span>
                                        <div
                                            className={`w-4 h-4 rounded flex items-center justify-center ${selected ? "border border-emerald-500 bg-emerald-500 text-white" : ""}`}
                                            style={!selected ? { backgroundColor: 'var(--radio-indicator)' } : undefined}
                                        >
                                            {selected ? <Check className="h-3 w-3 text-white" /> : <X className="h-3 w-3 text-content-muted" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bathroom Type */}
                    <div className="flex items-center justify-between gap-2 p-[3px] rounded-lg transition-all bg-surface-hover">
                        <label className="text-sm font-medium text-content-secondary pl-[5px]">Bathroom Type</label>
                        <SimpleSelect
                            value={roomDetails.bathroomType || ""}
                            onChange={(val) => {
                                setRoomDetails((prev: RoomDetails) => ({ ...prev, bathroomType: val }));
                                setIsDirty(true);
                            }}
                            options={fixedFieldOptions.filter(o => o.fieldType === 'bathroom').map(o => o.value)}
                            placeholder="Select..."
                            className="w-32 text-sm"
                        />
                    </div>

                    {/* Shower Type */}
                    <div className="flex items-center justify-between gap-2 p-[3px] rounded-lg transition-all bg-surface-hover">
                        <label className="text-sm font-medium text-content-secondary pl-[5px]">Shower Type</label>
                        <SimpleSelect
                            value={roomDetails.showerType || ""}
                            onChange={(val) => {
                                setRoomDetails((prev: RoomDetails) => ({ ...prev, showerType: val }));
                                setIsDirty(true);
                            }}
                            options={fixedFieldOptions.filter(o => o.fieldType === 'shower').map(o => o.value)}
                            placeholder="Select..."
                            className="w-32 text-sm"
                        />
                    </div>

                    {/* Room Types - multi-select */}
                    <div className="bg-surface-input rounded-lg p-[3px] space-y-2">
                        <label className="text-sm font-medium text-content-secondary block pl-[5px]">Room Types</label>
                        <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                            {fixedFieldOptions.filter(o => o.fieldType === 'roomType').map((opt) => {
                                const selected = (roomDetails.roomTypes || []).includes(opt.value);
                                return (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => {
                                            const current = roomDetails.roomTypes || [];
                                            const updated = selected
                                                ? current.filter(v => v !== opt.value)
                                                : [...current, opt.value];
                                            setRoomDetails((prev: RoomDetails) => ({ ...prev, roomTypes: updated }));
                                            setIsDirty(true);
                                        }}
                                        className={`w-full flex items-center justify-between p-[3px] rounded-lg text-left transition-all ${selected ? "bg-surface-hover text-content-primary" : "bg-surface-hover hover:bg-surface-input text-content-secondary"}`}
                                    >
                                        <span className="text-sm font-medium">{opt.value}</span>
                                        <div
                                            className={`w-4 h-4 rounded flex items-center justify-center ${selected ? "border border-emerald-500 bg-emerald-500 text-white" : ""}`}
                                            style={!selected ? { backgroundColor: 'var(--radio-indicator)' } : undefined}
                                        >
                                            {selected ? <Check className="h-3 w-3 text-white" /> : <X className="h-3 w-3 text-content-muted" />}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    </div>
                </div>

                {/* Custom Categories: Column 1 */}
                {roomCategories
                    .filter(c => (c.columnNumber === 1 || (!c.columnNumber)) && c.section === 'room_details')
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
                    .filter(c => c.columnNumber === 2 && c.section === 'room_details')
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
                    .filter(c => (c.columnNumber === 3 || c.columnNumber === 4) && c.section === 'room_details')
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





