"use client";

import { useState, useRef, useEffect } from "react";
import { Tooltip } from "@/components/ui/Tooltip";
import {
    // General / UI
    Search, X, Smile, Layout, Grid, Layers, Box, Package, Tag, Hash,
    Star, Heart, Bookmark, Flag, Award, Trophy, Crown, Gem, Sparkles,
    // Buildings & Living
    Home, Building, Building2, Hotel, Castle, Warehouse, Store, School,
    Church, Landmark, Factory,
    // People & Accessibility
    User, Users, UserPlus, UserCheck, Baby, Accessibility,
    PersonStanding, HeartHandshake,
    // Medical
    Stethoscope, Thermometer, Pill, Syringe, Activity, HeartPulse,
    Cross, ShieldCheck, ShieldPlus, ClipboardList, ClipboardCheck,
    // Nature & Environment
    Sun, Moon, Cloud, TreePine, Flower2, Leaf, Mountain, Waves,
    Sprout, Palmtree,
    // Food & Drink
    UtensilsCrossed, Coffee, CookingPot, Wine, Apple, Salad,
    // Transport
    Car, Bus, Bike, Plane, Ship, MapPin, Navigation, Route, Compass,
    // Furniture & Home Items
    Bed, BedDouble, Bath, Sofa, Lamp, DoorOpen, DoorClosed,
    ArmchairIcon, Tv, Refrigerator,
    // Activities & Lifestyle
    Music, Gamepad2, BookOpen, Palette, Camera, Dumbbell,
    Drama, PartyPopper,
    // Communication
    Phone, Mail, MessageCircle, Bell, Megaphone,
    // Time & Calendar
    Clock, Calendar, Timer, AlarmClock,
    // Safety & Security
    Shield, Lock, Eye, AlertTriangle,
    // Finance
    DollarSign, CreditCard, Wallet, Receipt, PiggyBank,
    // Technology
    Wifi, Monitor, Smartphone, Printer, Settings, Wrench,
    // Weather
    Umbrella, Snowflake, CloudRain, Wind,
    // Misc
    Scissors, Key, Lightbulb, Zap, Flame, Puzzle,
    CircleDot, SquareStack, Briefcase, GraduationCap
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface IconEntry {
    name: string;
    icon: LucideIcon;
}

// Curated icon list organized by category
const ICON_LIST: IconEntry[] = [
    // General
    { name: "Star", icon: Star }, { name: "Heart", icon: Heart }, { name: "Bookmark", icon: Bookmark },
    { name: "Flag", icon: Flag }, { name: "Award", icon: Award }, { name: "Trophy", icon: Trophy },
    { name: "Crown", icon: Crown }, { name: "Gem", icon: Gem }, { name: "Sparkles", icon: Sparkles },
    { name: "Tag", icon: Tag }, { name: "Hash", icon: Hash },
    // Buildings
    { name: "Home", icon: Home }, { name: "Building", icon: Building }, { name: "Building2", icon: Building2 },
    { name: "Hotel", icon: Hotel }, { name: "Castle", icon: Castle }, { name: "Warehouse", icon: Warehouse },
    { name: "Store", icon: Store }, { name: "School", icon: School }, { name: "Church", icon: Church },
    { name: "Landmark", icon: Landmark }, { name: "Factory", icon: Factory },
    // People
    { name: "User", icon: User }, { name: "Users", icon: Users }, { name: "UserPlus", icon: UserPlus },
    { name: "UserCheck", icon: UserCheck }, { name: "Baby", icon: Baby },
    { name: "Accessibility", icon: Accessibility },
    { name: "PersonStanding", icon: PersonStanding }, { name: "HeartHandshake", icon: HeartHandshake },
    // Medical
    { name: "Stethoscope", icon: Stethoscope }, { name: "Thermometer", icon: Thermometer },
    { name: "Pill", icon: Pill }, { name: "Syringe", icon: Syringe }, { name: "Activity", icon: Activity },
    { name: "HeartPulse", icon: HeartPulse }, { name: "Cross", icon: Cross },
    { name: "ShieldCheck", icon: ShieldCheck }, { name: "ShieldPlus", icon: ShieldPlus },
    { name: "ClipboardList", icon: ClipboardList }, { name: "ClipboardCheck", icon: ClipboardCheck },
    // Nature
    { name: "Sun", icon: Sun }, { name: "Moon", icon: Moon }, { name: "Cloud", icon: Cloud },
    { name: "TreePine", icon: TreePine }, { name: "Flower2", icon: Flower2 }, { name: "Leaf", icon: Leaf },
    { name: "Mountain", icon: Mountain }, { name: "Waves", icon: Waves },
    { name: "Sprout", icon: Sprout }, { name: "Palmtree", icon: Palmtree },
    // Food
    { name: "UtensilsCrossed", icon: UtensilsCrossed }, { name: "Coffee", icon: Coffee },
    { name: "CookingPot", icon: CookingPot }, { name: "Wine", icon: Wine },
    { name: "Apple", icon: Apple }, { name: "Salad", icon: Salad },
    // Transport
    { name: "Car", icon: Car }, { name: "Bus", icon: Bus }, { name: "Bike", icon: Bike },
    { name: "Plane", icon: Plane }, { name: "Ship", icon: Ship }, { name: "MapPin", icon: MapPin },
    { name: "Navigation", icon: Navigation }, { name: "Route", icon: Route }, { name: "Compass", icon: Compass },
    // Furniture
    { name: "Bed", icon: Bed }, { name: "BedDouble", icon: BedDouble }, { name: "Bath", icon: Bath },
    { name: "Sofa", icon: Sofa }, { name: "Lamp", icon: Lamp }, { name: "DoorOpen", icon: DoorOpen },
    { name: "DoorClosed", icon: DoorClosed }, { name: "Tv", icon: Tv }, { name: "Refrigerator", icon: Refrigerator },
    // Activities
    { name: "Music", icon: Music }, { name: "Gamepad2", icon: Gamepad2 }, { name: "BookOpen", icon: BookOpen },
    { name: "Palette", icon: Palette }, { name: "Camera", icon: Camera }, { name: "Dumbbell", icon: Dumbbell },
    { name: "Drama", icon: Drama }, { name: "PartyPopper", icon: PartyPopper },
    // Communication
    { name: "Phone", icon: Phone }, { name: "Mail", icon: Mail },
    { name: "MessageCircle", icon: MessageCircle }, { name: "Bell", icon: Bell },
    { name: "Megaphone", icon: Megaphone },
    // Time
    { name: "Clock", icon: Clock }, { name: "Calendar", icon: Calendar },
    { name: "Timer", icon: Timer }, { name: "AlarmClock", icon: AlarmClock },
    // Safety
    { name: "Shield", icon: Shield }, { name: "Lock", icon: Lock },
    { name: "Eye", icon: Eye }, { name: "AlertTriangle", icon: AlertTriangle },
    // Finance
    { name: "DollarSign", icon: DollarSign }, { name: "CreditCard", icon: CreditCard },
    { name: "Wallet", icon: Wallet }, { name: "Receipt", icon: Receipt },
    { name: "PiggyBank", icon: PiggyBank },
    // Technology
    { name: "Wifi", icon: Wifi }, { name: "Monitor", icon: Monitor },
    { name: "Smartphone", icon: Smartphone }, { name: "Printer", icon: Printer },
    { name: "Settings", icon: Settings }, { name: "Wrench", icon: Wrench },
    // Weather
    { name: "Umbrella", icon: Umbrella }, { name: "Snowflake", icon: Snowflake },
    { name: "CloudRain", icon: CloudRain }, { name: "Wind", icon: Wind },
    // Misc
    { name: "Scissors", icon: Scissors }, { name: "Key", icon: Key },
    { name: "Lightbulb", icon: Lightbulb }, { name: "Zap", icon: Zap },
    { name: "Flame", icon: Flame }, { name: "Puzzle", icon: Puzzle },
    { name: "CircleDot", icon: CircleDot }, { name: "Briefcase", icon: Briefcase },
    { name: "GraduationCap", icon: GraduationCap },
    { name: "Layout", icon: Layout }, { name: "Grid", icon: Grid },
    { name: "Layers", icon: Layers }, { name: "Box", icon: Box },
    { name: "Package", icon: Package }, { name: "Smile", icon: Smile },
];

// Export a lookup map so other components can render icons by name
export const ICON_MAP: Record<string, LucideIcon> = {};
ICON_LIST.forEach(entry => { ICON_MAP[entry.name] = entry.icon; });

interface IconPickerProps {
    value?: string;
    onChange: (iconName: string | undefined) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const popupRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!isOpen) return;
        function handleClick(e: MouseEvent) {
            if (
                popupRef.current && !popupRef.current.contains(e.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen]);

    const filtered = ICON_LIST.filter(entry =>
        entry.name.toLowerCase().includes(search.toLowerCase())
    );

    const SelectedIcon = value ? ICON_MAP[value] : null;

    return (
        <div className="relative">
            <button
                ref={triggerRef}
                type="button"
                onClick={() => { setIsOpen(!isOpen); setSearch(""); }}
                className={`p-1.5 rounded transition-colors ${value
                    ? "text-accent bg-transparent hover:bg-white/5"
                    : "text-zinc-500 hover:text-white bg-black/20 hover:bg-black/40"
                    }`}
                title={value ? `Icon: ${value}` : "Choose icon"}
            >
                {SelectedIcon ? (
                    <SelectedIcon className="h-4 w-4" />
                ) : (
                    <Smile className="h-4 w-4" />
                )}
            </button>

            {isOpen && (
                <div
                    ref={popupRef}
                    className="absolute left-0 top-full mt-2 z-[1000] w-[320px] bg-zinc-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden"
                >
                    {/* Search bar */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10">
                        <Search className="h-4 w-4 text-zinc-500 shrink-0" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search icons..."
                            className="flex-1 bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none"
                            autoFocus
                        />
                        {value && (
                            <button
                                type="button"
                                onClick={() => { onChange(undefined); setIsOpen(false); }}
                                className="text-zinc-500 hover:text-red-400 text-xs shrink-0"
                                title="Remove icon"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Icon grid */}
                    <div className="grid grid-cols-8 gap-0.5 p-2 max-h-[240px] overflow-y-auto">
                        {filtered.map(entry => {
                            const IconComp = entry.icon;
                            const isSelected = value === entry.name;
                            return (
                                <Tooltip key={entry.name} content={entry.name}>
                                    <button
                                        type="button"
                                        onClick={() => { onChange(entry.name); setIsOpen(false); }}
                                        className={`p-2 rounded transition-colors flex items-center justify-center ${isSelected
                                            ? "bg-accent/20 text-accent"
                                            : "text-zinc-400 hover:text-white hover:bg-white/10"
                                            }`}
                                    >
                                        <IconComp className="h-4 w-4" />
                                    </button>
                                </Tooltip>
                            );
                        })}
                        {filtered.length === 0 && (
                            <div className="col-span-8 text-center text-zinc-500 text-xs py-4">
                                No icons match "{search}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
