import { Dispatch, SetStateAction } from "react";
import { Bed, Languages, ChevronUp, ChevronDown, Check, X } from "lucide-react";
import { RoomDetails, RoomFieldCategory, RoomFieldDefinition, RoomFixedFieldOption } from "@/types";
import { SimpleSelect } from "../../SimpleSelect";
import { HomeFieldCategory } from "./HomeFieldCategory";

interface HomeRoomsTabProps {
    roomDetails: RoomDetails;
    setRoomDetails: Dispatch<SetStateAction<RoomDetails>>;
    setIsDirty: (value: boolean) => void;
    roomCategories: RoomFieldCategory[];
    roomDefinitions: RoomFieldDefinition[];
    fixedFieldOptions: RoomFixedFieldOption[]; // Assuming RoomFixedFieldOption is the correct type for options
    fixedFieldIcons: Record<string, any>;
    invalidEmailFields: Set<string>;
    setInvalidEmailFields: Dispatch<SetStateAction<Set<string>>>;
}

export function HomeRoomsTab({
    roomDetails,
    setRoomDetails,
    setIsDirty,
    roomCategories,
    roomDefinitions,
    fixedFieldOptions,
    fixedFieldIcons,
    invalidEmailFields,
    setInvalidEmailFields
}: HomeRoomsTabProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
            {/* Column 1: General Info & Col 1 Categories */}
            <div className="space-y-6">
                {/* Fixed Fields Section (General Room Info) */}
                <div className="bg-surface-input rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Bed className="h-4 w-4 text-accent" />
                        <h3 className="text-base font-medium text-content-primary">General Info</h3>
                    </div>
                    {/* Room Price */}
                    <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
                        <label className="text-sm font-medium text-content-secondary">Room Price</label>
                        <div className="relative w-32">
                            <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${roomDetails.roomPrice ? "text-content-secondary" : "text-content-muted"}`}>$</span>
                            <input
                                type="number"
                                value={roomDetails.roomPrice ?? ""}
                                onChange={(e) => {
                                    setIsDirty(true);
                                    const val = parseFloat(e.target.value);
                                    setRoomDetails((prev: RoomDetails) => ({
                                        ...prev,
                                        roomPrice: isNaN(val) ? undefined : val
                                    }));
                                }}
                                className="w-full rounded-md px-2 pl-6 pr-8 py-1 text-sm text-left focus:outline-none transition-colors [&::-webkit-inner-spin-button]:appearance-none bg-surface-input text-content-primary hover:bg-surface-hover focus:bg-surface-hover"
                                placeholder="0"
                            />
                            <div className="absolute right-1 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const current = roomDetails.roomPrice || 0;
                                        setIsDirty(true);
                                        setRoomDetails((prev: RoomDetails) => ({
                                            ...prev,
                                            roomPrice: current + 1
                                        }));
                                    }}
                                    className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"
                                >
                                    <ChevronUp className="h-2 w-2" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const current = roomDetails.roomPrice || 0;
                                        setIsDirty(true);
                                        setRoomDetails((prev: RoomDetails) => ({
                                            ...prev,
                                            roomPrice: Math.max(0, current - 1)
                                        }));
                                    }}
                                    className="p-0.5 hover:bg-surface-hover rounded text-content-muted hover:text-content-primary transition-colors"
                                >
                                    <ChevronDown className="h-2 w-2" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Bedroom Type */}
                    <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
                        <label className="text-sm font-medium text-content-secondary flex items-center gap-2">
                            {fixedFieldIcons['bedroomType'] && (() => {
                                const Icon = fixedFieldIcons['bedroomType'];
                                return <Icon className="h-4 w-4 text-content-secondary" />;
                            })()}
                            Bedroom Type
                        </label>
                        <SimpleSelect
                            value={roomDetails.bedroomType || ""}
                            onChange={(val) => {
                                setIsDirty(true);
                                setRoomDetails((prev: RoomDetails) => ({
                                    ...prev,
                                    bedroomType: val
                                }));
                            }}
                            options={fixedFieldOptions.filter(o => o.fieldType === 'bedroom').map(o => o.value)}
                            placeholder="Select..."
                            className="w-36 text-sm text-right"
                        />
                    </div>

                    {/* Bathroom Type */}
                    <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
                        <label className="text-sm font-medium text-content-secondary flex items-center gap-2">
                            {fixedFieldIcons['bathroomType'] && (() => {
                                const Icon = fixedFieldIcons['bathroomType'];
                                return <Icon className="h-4 w-4 text-content-secondary" />;
                            })()}
                            Bathroom Type
                        </label>
                        <SimpleSelect
                            value={roomDetails.bathroomType || ""}
                            onChange={(val) => {
                                setIsDirty(true);
                                setRoomDetails((prev: RoomDetails) => ({
                                    ...prev,
                                    bathroomType: val
                                }));
                            }}
                            options={fixedFieldOptions.filter(o => o.fieldType === 'bathroom').map(o => o.value)}
                            placeholder="Select..."
                            className="w-36 text-sm text-right"
                        />
                    </div>

                    {/* Shower Type */}
                    <div className="flex items-center justify-between gap-2 py-2 pr-2 pl-3.5 bg-surface-hover rounded-lg transition-all">
                        <label className="text-sm font-medium text-content-secondary flex items-center gap-2">
                            {fixedFieldIcons['showerType'] && (() => {
                                const Icon = fixedFieldIcons['showerType'];
                                return <Icon className="h-4 w-4 text-content-secondary" />;
                            })()}
                            Shower Type
                        </label>
                        <SimpleSelect
                            value={roomDetails.showerType || ""}
                            onChange={(val) => {
                                setIsDirty(true);
                                setRoomDetails((prev: RoomDetails) => ({
                                    ...prev,
                                    showerType: val
                                }));
                            }}
                            options={fixedFieldOptions.filter(o => o.fieldType === 'shower').map(o => o.value)}
                            placeholder="Select..."
                            className="w-36 text-sm text-right"
                        />
                    </div>
                </div>

                {/* Languages */}
                <div className="bg-surface-hover rounded-lg p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                        <Languages className="h-4 w-4 text-accent" />
                        <h3 className="text-base font-medium text-content-primary">Languages Spoken</h3>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                        {fixedFieldOptions.filter(o => o.fieldType === 'language').map((opt) => {
                            const lang = opt.value;
                            const currentLangs = roomDetails.languages || [];
                            const isSelected = currentLangs.includes(lang);
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => {
                                        setIsDirty(true);
                                        setRoomDetails((prev: RoomDetails) => {
                                            const prevLangs = prev.languages || [];
                                            const newLangs = isSelected
                                                ? prevLangs.filter(l => l !== lang)
                                                : [...prevLangs, lang];
                                            return { ...prev, languages: newLangs };
                                        });
                                    }}
                                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left transition-all ${isSelected
                                        ? "bg-surface-input text-content-primary"
                                        : "bg-surface-input hover:bg-surface-hover text-content-secondary"
                                        }`}
                                >
                                    <span className="text-sm font-medium">{lang}</span>
                                    <div
                                        className={`w-4 h-4 rounded flex items-center justify-center ${isSelected ? "border border-accent bg-accent text-white" : ""}`}
                                        style={!isSelected ? { backgroundColor: 'var(--radio-indicator)' } : undefined}
                                    >
                                        {isSelected ? <Check className="h-3 w-3 text-white" /> : <X className="h-3 w-3 text-content-muted" />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Col 1 Categories */}
                {roomCategories
                    .filter(c => (c.columnNumber === 1 || !c.columnNumber) && c.section === 'room_details')
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
            <div className="space-y-6">
                {roomCategories
                    .filter(c => c.columnNumber === 2 && c.section === 'room_details')
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
            <div className="space-y-6">
                {roomCategories
                    .filter(c => c.columnNumber === 3 && c.section === 'room_details')
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

            {/* Column 4 */}
            <div className="space-y-6">
                {roomCategories
                    .filter(c => c.columnNumber === 4 && c.section === 'room_details')
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





