import { Dispatch, SetStateAction } from "react";
import { RoomDetails, RoomFieldCategory, RoomFieldDefinition } from "@/types";
import { HomeFieldCategory } from "./HomeFieldCategory";

interface HomeProviderTabProps {
    roomCategories: RoomFieldCategory[];
    roomDefinitions: RoomFieldDefinition[];
    roomDetails: RoomDetails;
    setRoomDetails: Dispatch<SetStateAction<RoomDetails>>;
    setIsDirty: (value: boolean) => void;
    invalidEmailFields: Set<string>;
    setInvalidEmailFields: Dispatch<SetStateAction<Set<string>>>;
}

export function HomeProviderTab({
    roomCategories,
    roomDefinitions,
    roomDetails,
    setRoomDetails,
    setIsDirty,
    invalidEmailFields,
    setInvalidEmailFields
}: HomeProviderTabProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {/* Column 1 */}
            <div className="space-y-[10px]">
                {roomCategories
                    .filter(c => c.section === 'care_provider_details' && (c.columnNumber === 1 || !c.columnNumber))
                    .map(category => (
                        <HomeFieldCategory
                            key={category.id}
                            category={category}
                            roomDefinitions={roomDefinitions}
                            roomDetails={roomDetails}
                            setRoomDetails={setRoomDetails}
                            setIsDirty={setIsDirty}
                            invalidEmailFields={invalidEmailFields}
                            lighterCheckboxes={/food|skill|specialt/i.test(category.name)}
                            setInvalidEmailFields={setInvalidEmailFields}
                        />
                    ))}
            </div>

            {/* Column 2 */}
            <div className="space-y-[10px]">
                {roomCategories
                    .filter(c => c.section === 'care_provider_details' && c.columnNumber === 2)
                    .map(category => (
                        <HomeFieldCategory
                            key={category.id}
                            category={category}
                            roomDefinitions={roomDefinitions}
                            roomDetails={roomDetails}
                            setRoomDetails={setRoomDetails}
                            setIsDirty={setIsDirty}
                            invalidEmailFields={invalidEmailFields}
                            lighterCheckboxes={/food|skill|specialt/i.test(category.name)}
                            setInvalidEmailFields={setInvalidEmailFields}
                        />
                    ))}
            </div>

            {/* Column 3 */}
            <div className="space-y-[10px]">
                {roomCategories
                    .filter(c => c.section === 'care_provider_details' && c.columnNumber === 3)
                    .map(category => (
                        <HomeFieldCategory
                            key={category.id}
                            category={category}
                            roomDefinitions={roomDefinitions}
                            roomDetails={roomDetails}
                            setRoomDetails={setRoomDetails}
                            setIsDirty={setIsDirty}
                            invalidEmailFields={invalidEmailFields}
                            lighterCheckboxes={/food|skill|specialt/i.test(category.name)}
                            setInvalidEmailFields={setInvalidEmailFields}
                        />
                    ))}
            </div>

            {/* Column 4 */}
            <div className="space-y-[10px]">
                {roomCategories
                    .filter(c => c.section === 'care_provider_details' && c.columnNumber === 4)
                    .map(category => (
                        <HomeFieldCategory
                            key={category.id}
                            category={category}
                            roomDefinitions={roomDefinitions}
                            roomDetails={roomDetails}
                            setRoomDetails={setRoomDetails}
                            setIsDirty={setIsDirty}
                            invalidEmailFields={invalidEmailFields}
                            lighterCheckboxes={/food|skill|specialt/i.test(category.name)}
                            setInvalidEmailFields={setInvalidEmailFields}
                        />
                    ))}
            </div>
        </div>
    );
}
