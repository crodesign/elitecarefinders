"use client";

import { Dispatch, SetStateAction } from "react";
import type { RoomDetails, RoomFieldCategory, RoomFieldDefinition } from "@/types";
import { FacilityFieldCategory } from "./FacilityFieldCategory";

interface FacilityProviderTabProps {
    roomDetails: RoomDetails;
    setRoomDetails: Dispatch<SetStateAction<RoomDetails>>;
    setIsDirty: (value: boolean) => void;
    roomCategories: RoomFieldCategory[];
    roomDefinitions: RoomFieldDefinition[];
    invalidEmailFields: Set<string>;
    setInvalidEmailFields: Dispatch<SetStateAction<Set<string>>>;
}

export function FacilityProviderTab({
    roomDetails,
    setRoomDetails,
    setIsDirty,
    roomCategories,
    roomDefinitions,
    invalidEmailFields,
    setInvalidEmailFields,
}: FacilityProviderTabProps) {
    const hasProviderFields = roomDefinitions.some(f =>
        f.isActive && (f.targetType === 'facility' || f.targetType === 'both') &&
        roomCategories.find(c => c.id === f.categoryId)?.section === 'care_provider_details'
    );

    if (!hasProviderFields) {
        return (
            <div className="p-8 text-center text-content-muted">
                No provider specific detail fields have been configured yet.
                <br />
                <span className="text-sm">Add fields in Setup → Room Fields with section &quot;Provider Details&quot;.</span>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {/* Column 1 */}
            <div className="space-y-[10px]">
                {roomCategories
                    .filter(c => c.section === 'care_provider_details' && (c.columnNumber === 1 || !c.columnNumber))
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
                            lighterCheckboxes={/food|skill|specialt/i.test(category.name)}
                        />
                    ))}
            </div>

            {/* Column 2 */}
            <div className="space-y-[10px]">
                {roomCategories
                    .filter(c => c.section === 'care_provider_details' && c.columnNumber === 2)
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
                            lighterCheckboxes={/food|skill|specialt/i.test(category.name)}
                        />
                    ))}
            </div>

            {/* Column 3 */}
            <div className="space-y-[10px]">
                {roomCategories
                    .filter(c => c.section === 'care_provider_details' && c.columnNumber === 3)
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
                            lighterCheckboxes={/food|skill|specialt/i.test(category.name)}
                        />
                    ))}
            </div>

            {/* Column 4 */}
            <div className="space-y-[10px]">
                {roomCategories
                    .filter(c => c.section === 'care_provider_details' && c.columnNumber === 4)
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
                            lighterCheckboxes={/food|skill|specialt/i.test(category.name)}
                        />
                    ))}
            </div>
        </div>
    );
}
