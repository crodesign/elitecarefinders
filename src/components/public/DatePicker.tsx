'use client';

import { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faCalendarDays } from '@fortawesome/free-solid-svg-icons';

interface DatePickerProps {
    value: string;       // YYYY-MM-DD
    onChange: (value: string) => void;
    min?: string;        // YYYY-MM-DD
}

function toDate(str: string) {
    return str ? new Date(str + 'T00:00:00') : undefined;
}

function toStr(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function DatePicker({ value, onChange, min }: DatePickerProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const selected = toDate(value);
    const disabled = min ? { before: toDate(min)! } : { before: new Date() };

    const displayValue = selected
        ? selected.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '';

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    return (
        <div ref={ref} className="relative flex-1">
            {/* Trigger */}
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                className={`w-full flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-[9px] text-sm text-left transition-all focus:outline-none ${open ? 'ring-2 ring-[#239ddb]' : ''} ${!value ? 'text-gray-400' : 'text-gray-900'}`}
            >
                <span className="flex-1 truncate">{displayValue || 'Select date'}</span>
                <FontAwesomeIcon icon={faCalendarDays} className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            </button>

            {/* Calendar popup */}
            {open && (
                <div className="absolute top-full left-0 mt-1.5 bg-white border-2 border-gray-200 rounded-2xl shadow-xl z-[300] overflow-hidden">
                    <DayPicker
                        mode="single"
                        selected={selected}
                        onSelect={(d) => { if (d) { onChange(toStr(d)); setOpen(false); } }}
                        disabled={disabled}
                        classNames={{
                            root: 'p-3',
                            months: 'flex flex-col',
                            month: 'space-y-3',
                            caption: 'flex items-center pt-0.5',
                            caption_label: 'flex-1 text-sm font-semibold text-gray-800',
                            nav: 'flex items-center gap-0.5',
                            nav_button_previous: '',
                            nav_button_next: '',
                            table: 'w-full border-collapse',
                            head_row: 'flex',
                            head_cell: 'text-gray-300 rounded-md w-9 font-bold text-[10px] text-center uppercase',
                            row: 'flex w-full mt-1',
                            cell: 'h-9 w-9 text-center text-sm p-0 relative',
                            day: 'h-9 w-9 p-0 font-normal rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors',
                            day_selected: 'bg-[#239ddb] text-white font-semibold hover:bg-[#1a7fb3] rounded-lg',
                            day_today: 'ring-2 ring-[#239ddb] text-[#239ddb] font-semibold rounded-lg',
                            day_outside: 'text-gray-300',
                            day_disabled: 'text-gray-200 cursor-not-allowed hover:bg-transparent',
                            day_hidden: 'invisible',
                        }}
                        components={{
                            Chevron: ({ orientation }: { orientation?: string }) => orientation === 'right'
                                ? <button type="button" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"><FontAwesomeIcon icon={faChevronRight} className="h-3 w-3" /></button>
                                : <button type="button" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"><FontAwesomeIcon icon={faChevronLeft} className="h-3 w-3" /></button>,
                        }}
                    />
                </div>
            )}
        </div>
    );
}
