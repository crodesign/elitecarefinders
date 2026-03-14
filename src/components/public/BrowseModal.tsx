'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faPhone, faEnvelope, faHouse, faBuilding, faBrain, faLocationDot } from '@fortawesome/free-solid-svg-icons';
import { faFacebookF, faInstagram, faXTwitter, faLinkedinIn, faPinterestP, faYoutube, faTiktok, faThreads } from '@fortawesome/free-brands-svg-icons';
import { createClientComponentClient } from '@/lib/supabase';
import { getSocialAccounts, type SocialAccount, type SocialPlatform } from '@/lib/services/siteSettingsService';

const HOME_TYPE_TAX_ID = '286967ff-a897-4529-9c25-6f452f77f0d7';
const FACILITY_TYPE_TAX_ID = 'aaff7539-60ec-448d-ae56-5ee8763917f6';

const SOCIAL_ICON_MAP: Record<SocialPlatform, typeof faFacebookF> = {
    facebook:  faFacebookF,
    instagram: faInstagram,
    x:         faXTwitter,
    linkedin:  faLinkedinIn,
    pinterest: faPinterestP,
    youtube:   faYoutube,
    tiktok:    faTiktok,
    threads:   faThreads,
};

interface TaxEntry { id: string; name: string; slug: string; }

interface BrowseModalProps {
    onClose: () => void;
}

export function BrowseModal({ onClose }: BrowseModalProps) {
    const [homeTypes, setHomeTypes] = useState<TaxEntry[]>([]);
    const [facilityTypes, setFacilityTypes] = useState<TaxEntry[]>([]);
    const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
    const [locationStates, setLocationStates] = useState<TaxEntry[]>([]);
    const [hawaiiIslands, setHawaiiIslands] = useState<TaxEntry[]>([]);

    useEffect(() => {
        const supabase = createClientComponentClient();
        supabase
            .from('taxonomy_entries')
            .select('id, name, slug, taxonomy_id')
            .in('taxonomy_id', [HOME_TYPE_TAX_ID, FACILITY_TYPE_TAX_ID])
            .order('display_order', { ascending: true, nullsFirst: false })
            .order('name')
            .then(({ data }) => {
                if (!data) return;
                setHomeTypes(data.filter(e => e.taxonomy_id === HOME_TYPE_TAX_ID));
                setFacilityTypes(data.filter(e => e.taxonomy_id === FACILITY_TYPE_TAX_ID));
            });

        getSocialAccounts().then(accounts => setSocialAccounts(accounts));

        (async () => {
            const { data: tax } = await supabase.from('taxonomies').select('id').eq('slug', 'location').maybeSingle();
            if (!tax) return;
            const { data: states } = await supabase.from('taxonomy_entries').select('id, name, slug').eq('taxonomy_id', tax.id).is('parent_id', null).order('name');
            const mapped = (states || []).map((r: any) => ({ id: r.id, name: r.name, slug: r.slug }));
            setLocationStates(mapped);
            const hawaii = mapped.find(s => s.slug === 'hawaii');
            if (hawaii) {
                const { data: islands } = await supabase.from('taxonomy_entries').select('id, name, slug').eq('parent_id', hawaii.id).order('name');
                setHawaiiIslands((islands || []).map((r: any) => ({ id: r.id, name: r.name, slug: r.slug })));
            }
        })();
    }, []);

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
        };
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[200] bg-white/50 backdrop-blur-md flex flex-col pt-14" onClick={onClose}>
            {/* Full-width blue top bar */}
            <div className="absolute top-0 inset-x-0 h-14 bg-[#239ddb] flex items-center justify-center px-4 shadow-md z-10" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-2 text-white font-bold tracking-widest uppercase text-sm">
                    <FontAwesomeIcon icon={faHouse} className="h-5 w-5" />
                    Browse our Homes &amp; Communities
                </div>
                <button
                    onClick={onClose}
                    className="absolute right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    aria-label="Close"
                >
                    <FontAwesomeIcon icon={faXmark} className="h-5 w-5" />
                </button>
            </div>

            {/* Scrolling card */}
            <div className="modal-content-slide-in flex-1 overflow-y-auto w-full pb-6">
                <div className="max-w-[480px] mx-5 sm:mx-auto bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.15)] rounded-b-2xl" onClick={e => e.stopPropagation()}>

                    {/* Homes section */}
                    <div className="mb-6">
                        <Link href="/homes" onClick={onClose} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-[#239ddb] mb-3 transition-colors">
                            <span className="flex items-center justify-center w-5 h-5 rounded bg-[#239ddb] shrink-0">
                                <FontAwesomeIcon icon={faHouse} className="h-3 w-3 text-white" />
                            </span>
                            Care Homes &amp; Adult Foster Homes
                        </Link>
                        <ul className="space-y-0.5 pl-7">
                            {homeTypes.map(type => (
                                <li key={type.id}>
                                    <Link
                                        href={`/homes/type/${type.slug}`}
                                        onClick={onClose}
                                        className="block text-sm text-gray-700 hover:text-[#239ddb] py-0.5 transition-colors"
                                    >
                                        {type.name}
                                    </Link>
                                </li>
                            ))}
                            <li>
                                <Link
                                    href="/homes"
                                    onClick={onClose}
                                    className="block text-sm font-semibold text-gray-500 hover:text-[#239ddb] py-0.5 transition-colors"
                                >
                                    View all Homes →
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Facilities section */}
                    <div className="mb-6">
                        <Link href="/facilities" onClick={onClose} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-[#239ddb] mb-3 transition-colors">
                            <span className="flex items-center justify-center w-5 h-5 rounded bg-[#239ddb] shrink-0">
                                <FontAwesomeIcon icon={faBuilding} className="h-3 w-3 text-white" />
                            </span>
                            Senior Living Communities
                        </Link>
                        <ul className="space-y-0.5 pl-7">
                            {facilityTypes.map(type => (
                                <li key={type.id}>
                                    <Link
                                        href={`/facilities/type/${type.slug}`}
                                        onClick={onClose}
                                        className="block text-sm text-gray-700 hover:text-[#239ddb] py-0.5 transition-colors"
                                    >
                                        {type.name}
                                    </Link>
                                </li>
                            ))}
                            <li>
                                <Link
                                    href="/facilities"
                                    onClick={onClose}
                                    className="block text-sm font-semibold text-gray-500 hover:text-[#239ddb] py-0.5 transition-colors"
                                >
                                    View all Communities →
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Memory Care section */}
                    <div className="mb-6">
                        <Link href="/facilities/type/memory-care" onClick={onClose} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 hover:text-[#239ddb] transition-colors">
                            <span className="flex items-center justify-center w-5 h-5 rounded bg-[#239ddb] shrink-0">
                                <FontAwesomeIcon icon={faBrain} className="h-3 w-3 text-white" />
                            </span>
                            Memory Care
                        </Link>
                    </div>

                    {/* Location section */}
                    {locationStates.length > 0 && (
                        <div className="mb-6 pt-5 border-t-2 border-gray-100 -mx-6 px-6">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                                <span className="flex items-center justify-center w-5 h-5 rounded bg-[#239ddb] shrink-0">
                                    <FontAwesomeIcon icon={faLocationDot} className="h-3 w-3 text-white" />
                                </span>
                                Find Care by Location
                            </div>
                            <div className="pl-7 space-y-3">
                                {(() => {
                                    const hawaii = locationStates.find(s => s.slug === 'hawaii');
                                    const mainland = locationStates.filter(s => s.slug !== 'hawaii');
                                    return (
                                        <>
                                            {hawaii && (
                                                <div>
                                                    <Link href="/location/hawaii" onClick={onClose} className="block text-sm font-semibold text-gray-700 hover:text-[#239ddb] transition-colors mb-1">
                                                        Hawaii
                                                    </Link>
                                                    {hawaiiIslands.length > 0 && (
                                                        <div className="flex flex-wrap gap-1">
                                                            {hawaiiIslands.map(island => (
                                                                <Link key={island.id} href={`/location/hawaii/${island.slug}`} onClick={onClose} className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 hover:bg-[#239ddb]/10 hover:text-[#239ddb] transition-colors">
                                                                    {island.name}
                                                                </Link>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {mainland.length > 0 && (
                                                <div>
                                                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Mainland</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {mainland.map(state => (
                                                            <Link key={state.id} href={`/location/${state.slug}`} onClick={onClose} className="text-xs text-gray-500 bg-gray-100 rounded-full px-2 py-0.5 hover:bg-[#239ddb]/10 hover:text-[#239ddb] transition-colors">
                                                                {state.name}
                                                            </Link>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {/* Footer: social + contact */}
                    <div className="pt-5 border-t-2 border-gray-100 -mx-6 px-6 flex gap-6">
                        {socialAccounts.length > 0 && (
                            <div className="flex flex-wrap gap-2 content-start">
                                {socialAccounts.map(account => (
                                    <a
                                        key={account.id}
                                        href={account.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center w-8 h-8 rounded-md border-2 border-gray-300 text-gray-400 hover:border-[#239ddb] hover:text-[#239ddb] transition-colors"
                                        aria-label={account.platform}
                                    >
                                        <FontAwesomeIcon icon={SOCIAL_ICON_MAP[account.platform]} className="h-3.5 w-3.5" />
                                    </a>
                                ))}
                            </div>
                        )}
                        <div className="flex flex-col gap-2 text-sm text-gray-600">
                            <a href="tel:+18084454111" className="flex items-center gap-2 hover:text-[#239ddb] transition-colors">
                                <FontAwesomeIcon icon={faPhone} className="h-3.5 w-3.5 text-[#239ddb]" />
                                (808) 445-4111
                            </a>
                            <a href="mailto:info@elitecarefinders.com" className="flex items-center gap-2 hover:text-[#239ddb] transition-colors">
                                <FontAwesomeIcon icon={faEnvelope} className="h-3.5 w-3.5 text-[#239ddb]" />
                                info@elitecarefinders.com
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
