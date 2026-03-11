import { Fragment } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { FA_ICON_MAP } from '@/components/ui/fa-icon-map';
import type { RoomDetails, RoomFieldCategory, RoomFieldDefinition } from '@/types';

interface Props {
    roomDetails: RoomDetails;
    categories: RoomFieldCategory[];
    definitions: RoomFieldDefinition[];
    targetType: 'home' | 'facility';
    sectionFilter?: 'room_details' | 'location_details' | 'care_provider_details';
    sectionTitle?: string;
    sectionIcon?: IconDefinition;
    hideFixedFields?: boolean;
    showLanguages?: boolean;
    languagesLabel?: string;
    languagesAfterIndex?: number;
    fieldDisplay?: 'list' | 'label-above';
    columns?: 2 | 3;
    labelAboveFieldSlugs?: string[];
    className?: string;
}

function formatValue(value: boolean | string | string[], _type: RoomFieldDefinition['type']): string {
    if (typeof value === 'boolean') return '';
    if (Array.isArray(value)) return value.join(', ');
    return value;
}

type FieldRow = { def: RoomFieldDefinition; label: string; display: string | 'yes' | 'no' };

function FieldItem({ label, display, def, fieldDisplay, forceAbove }: FieldRow & { fieldDisplay: 'list' | 'label-above'; forceAbove?: boolean }) {
    const isBool = display === 'yes' || display === 'no';

    if ((fieldDisplay === 'label-above' || forceAbove) && !isBool) {
        const items = forceAbove && def.type === 'multi' ? display.split(', ') : null;
        return (
            <li className="py-0.5 pl-6">
                <p className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-0.5">{label}</p>
                {items ? (
                    <ul className="space-y-0.5">
                        {items.map(item => (
                            <li key={item} className="flex items-center gap-1 text-sm text-gray-900">
                                <span className="text-[#239ddb] leading-none">•</span>
                                {item}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-900">{display}</p>
                )}
            </li>
        );
    }

    return (
        <li className="flex items-start gap-2 text-sm">
            {display === 'yes' ? (
                <FontAwesomeIcon icon={faCheck} className="h-4 w-4 text-[#239ddb] mt-0.5 shrink-0" />
            ) : display === 'no' ? (
                <FontAwesomeIcon icon={faXmark} className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            ) : (
                <span className="w-4 shrink-0" />
            )}
            <span className={display === 'no' ? 'text-gray-400' : 'text-gray-700'}>
                {label}
                {!isBool && display !== '' && (
                    <span className="text-gray-500">: {display}</span>
                )}
            </span>
        </li>
    );
}

function CategoryBlock({ cat, rows, fieldDisplay, singleItemCol, labelAboveSlugs }: { cat: RoomFieldCategory; rows: FieldRow[]; fieldDisplay: 'list' | 'label-above'; singleItemCol?: boolean; labelAboveSlugs?: string[] }) {
    const faIcon = cat.icon ? FA_ICON_MAP[cat.icon] : null;
    const ulClass = fieldDisplay === 'label-above'
        ? 'grid grid-cols-1 gap-y-3'
        : singleItemCol
            ? 'grid grid-cols-1 gap-y-1.5'
            : 'grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5';
    return (
        <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                {faIcon && <FontAwesomeIcon icon={faIcon} className="h-4 w-4 shrink-0" />}
                {cat.name}
            </h3>
            <ul className={ulClass}>
                {rows.map(row => (
                    <FieldItem key={row.def.id} {...row} fieldDisplay={fieldDisplay} forceAbove={labelAboveSlugs?.includes(row.def.slug)} />
                ))}
            </ul>
        </div>
    );
}

export function RoomDetailsSection({
    roomDetails,
    categories,
    definitions,
    targetType,
    sectionFilter,
    sectionTitle,
    sectionIcon,
    hideFixedFields,
    showLanguages,
    languagesLabel = 'Languages Spoken',
    languagesAfterIndex,
    fieldDisplay = 'list',
    columns,
    labelAboveFieldSlugs,
    className,
}: Props) {
    const numColumns = columns ?? 1;
    const cf = roomDetails.customFields || {};
    const languages = showLanguages ? (roomDetails.languages || []) : [];
    const hasLanguages = languages.length > 0;

    const eligibleDefs = definitions.filter(d =>
        d.targetType === 'both' || d.targetType === targetType
    );

    const sectionCats = categories
        .filter(c => !sectionFilter || c.section === sectionFilter)
        .sort((a, b) => a.displayOrder - b.displayOrder);

    const catRows = sectionCats.map(cat => {
        const catDefs = eligibleDefs
            .filter(d => d.categoryId === cat.id)
            .sort((a, b) => a.displayOrder - b.displayOrder);

        const rows = catDefs.flatMap(def => {
            const raw = cf[def.id];
            if (raw === undefined || raw === null) return [];

            if (def.type === 'boolean') {
                if (raw === true || raw === 'true') return [{ def, label: def.name, display: 'yes' as const }];
                if (raw === false || raw === 'false') return [{ def, label: def.name, display: 'no' as const }];
                return [];
            }

            const str = formatValue(raw as string | string[], def.type);
            if (!str) return [];
            return [{ def, label: def.name, display: str }];
        });

        return { cat, rows };
    }).filter(c => c.rows.length > 0);

    const fixedRows: { label: string; value: string }[] = [];
    if (!hideFixedFields) {
        if (roomDetails.roomTypes?.length) fixedRows.push({ label: 'Room Type', value: roomDetails.roomTypes.join(', ') });
        if (roomDetails.bedroomTypes?.length) fixedRows.push({ label: 'Bedroom', value: roomDetails.bedroomTypes.join(', ') });
        if (roomDetails.bathroomType) fixedRows.push({ label: 'Bathroom', value: roomDetails.bathroomType });
        if (roomDetails.showerType) fixedRows.push({ label: 'Shower', value: roomDetails.showerType });
        if (roomDetails.levelOfCare?.length) fixedRows.push({ label: 'Level of Care', value: roomDetails.levelOfCare.join(', ') });
        if (roomDetails.languages?.length) fixedRows.push({ label: 'Languages', value: roomDetails.languages.join(', ') });
    }

    if (catRows.length === 0 && fixedRows.length === 0 && !hasLanguages) return null;

    const languagesSubsection = (
        <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {languagesLabel}
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                {languages.map(lang => (
                    <li key={lang} className="flex items-start gap-2 text-sm">
                        <FontAwesomeIcon icon={faCheck} className="h-4 w-4 text-[#239ddb] mt-0.5 shrink-0" />
                        <span className="text-gray-700">{lang}</span>
                    </li>
                ))}
            </ul>
        </div>
    );

    const catRowsWithIdx = catRows.map((item, idx) => ({ ...item, idx }));

    // When columns prop is explicitly set, always auto-split (ignore column numbers in DB).
    // Otherwise use publicColumnNumber (public-page layout), falling back to columnNumber.
    const useAutoSplit = columns !== undefined && columns > 1 && catRowsWithIdx.length > 1;
    const getPublicCol = (cat: RoomFieldCategory) => cat.publicColumnNumber ?? cat.columnNumber;
    const naturalCol2 = catRowsWithIdx.filter(({ cat }) => getPublicCol(cat) === 2);
    const naturalCol3 = catRowsWithIdx.filter(({ cat }) => getPublicCol(cat) === 3);
    const hasNaturalMultiColumn = !useAutoSplit && (naturalCol2.length > 0 || naturalCol3.length > 0);
    const hasMultiColumn = useAutoSplit || hasNaturalMultiColumn;

    let cols: (typeof catRowsWithIdx)[];
    let gridClass: string;

    if (useAutoSplit) {
        const n = catRowsWithIdx.length;
        if (numColumns === 3) {
            const s1 = Math.ceil(n / 3);
            const s2 = Math.ceil((2 * n) / 3);
            cols = [catRowsWithIdx.slice(0, s1), catRowsWithIdx.slice(s1, s2), catRowsWithIdx.slice(s2)].filter(c => c.length > 0);
            gridClass = 'grid grid-cols-1 md:grid-cols-3 gap-6 items-start';
        } else {
            const mid = Math.ceil(n / 2);
            cols = [catRowsWithIdx.slice(0, mid), catRowsWithIdx.slice(mid)];
            gridClass = 'grid grid-cols-1 md:grid-cols-2 gap-8 items-start';
        }
    } else if (hasNaturalMultiColumn) {
        const c1 = catRowsWithIdx.filter(({ cat }) => getPublicCol(cat) === 1);
        if (naturalCol3.length > 0) {
            cols = [c1, naturalCol2, naturalCol3].filter(c => c.length > 0);
            gridClass = 'grid grid-cols-1 md:grid-cols-3 gap-6 items-start';
        } else {
            cols = [c1, naturalCol2];
            gridClass = 'grid grid-cols-1 md:grid-cols-2 gap-8 items-start';
        }
    } else {
        cols = [];
        gridClass = '';
    }

    const renderColumn = (items: typeof catRowsWithIdx, isCol1 = false) => (
        <div className="space-y-6">
            {items.map(({ cat, rows, idx }) => (
                <Fragment key={cat.id}>
                    <CategoryBlock cat={cat} rows={rows} fieldDisplay={fieldDisplay} singleItemCol={hasMultiColumn} labelAboveSlugs={labelAboveFieldSlugs} />
                    {hasLanguages && languagesAfterIndex === idx && languagesSubsection}
                </Fragment>
            ))}
            {isCol1 && hasLanguages && languagesAfterIndex === undefined && languagesSubsection}
            {isCol1 && hasLanguages && languagesAfterIndex !== undefined && languagesAfterIndex >= catRows.length && languagesSubsection}
        </div>
    );

    return (
        <section aria-labelledby={sectionFilter ? `section-${sectionFilter}` : 'section-details'} className={className}>
            {sectionTitle && (
                <h2
                    id={sectionFilter ? `section-${sectionFilter}` : 'section-details'}
                    className="flex items-center gap-2 text-sm font-bold text-[#239ddb] uppercase tracking-wider mb-5"
                >
                    {sectionIcon && (
                        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-[#239ddb] shrink-0">
                            <FontAwesomeIcon icon={sectionIcon} className="h-4 w-4 text-white" />
                        </span>
                    )}
                    {sectionTitle}
                </h2>
            )}

            {fixedRows.length > 0 && (
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 mb-6">
                    {fixedRows.map(row => (
                        <div key={row.label}>
                            <dt className="text-xs text-gray-500 uppercase tracking-wide font-medium">{row.label}</dt>
                            <dd className="mt-0.5 text-sm font-semibold text-gray-900">{row.value}</dd>
                        </div>
                    ))}
                </dl>
            )}

            {hasMultiColumn ? (
                <div className={gridClass}>
                    {cols.map((colItems, i) => (
                        <Fragment key={i}>
                            {renderColumn(colItems, i === 0)}
                        </Fragment>
                    ))}
                </div>
            ) : (
                <div className="space-y-6">
                    {catRowsWithIdx.map(({ cat, rows, idx }) => (
                        <Fragment key={cat.id}>
                            <CategoryBlock cat={cat} rows={rows} fieldDisplay={fieldDisplay} singleItemCol={false} labelAboveSlugs={labelAboveFieldSlugs} />
                            {hasLanguages && languagesAfterIndex === idx && languagesSubsection}
                        </Fragment>
                    ))}
                    {hasLanguages && (languagesAfterIndex === undefined || languagesAfterIndex >= catRows.length) && languagesSubsection}
                </div>
            )}
        </section>
    );
}
