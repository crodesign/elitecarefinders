import { Dispatch, SetStateAction } from "react";
import { RoomDetails, RoomFieldCategory, RoomFieldDefinition } from "@/types";
import { HomeFieldCategory } from "./HomeFieldCategory";

interface HomeLocationTabProps {
    roomCategories: RoomFieldCategory[];
    roomDefinitions: RoomFieldDefinition[];
    roomDetails: RoomDetails;
    setRoomDetails: Dispatch<SetStateAction<RoomDetails>>;
    setIsDirty: (value: boolean) => void;
    invalidEmailFields: Set<string>;
    setInvalidEmailFields: Dispatch<SetStateAction<Set<string>>>;
}

export function HomeLocationTab({
    roomCategories,
    roomDefinitions,
    roomDetails,
    setRoomDetails,
    setIsDirty,
    invalidEmailFields,
    setInvalidEmailFields
}: HomeLocationTabProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
            {/* Column 1 */}
            <div className="space-y-[10px]">
                {roomCategories
                    .filter(c => c.section === 'location_details' && (c.columnNumber === 1 || !c.columnNumber))
                    .map(category => (
                        <HomeFieldCategory
                            key={category.id}
                            category={category}
                            roomDefinitions={roomDefinitions}
                            roomDetails={roomDetails}
                            setRoomDetails={setRoomDetails}
                            setIsDirty={setIsDirty}
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
                        <HomeFieldCategory
                            key={category.id}
                            category={category}
                            roomDefinitions={roomDefinitions}
                            roomDetails={roomDetails}
                            setRoomDetails={setRoomDetails}
                            setIsDirty={setIsDirty}
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
                        <HomeFieldCategory
                            key={category.id}
                            category={category}
                            roomDefinitions={roomDefinitions}
                            roomDetails={roomDetails}
                            setRoomDetails={setRoomDetails}
                            setIsDirty={setIsDirty}
                            invalidEmailFields={invalidEmailFields}
                            setInvalidEmailFields={setInvalidEmailFields}
                        />
                    ))}
            </div>
        </div>
    );
}
