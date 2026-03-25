'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faPhone, faEnvelope, faHouse, faBuilding, faLocationDot, faShareNodes } from '@fortawesome/free-solid-svg-icons';
import { SearchableLocationDropdown } from '@/components/public/SearchableLocationDropdown';
import { faFacebookF, faInstagram, faXTwitter, faLinkedinIn, faPinterestP, faYoutube, faTiktok, faThreads } from '@fortawesome/free-brands-svg-icons';
import { createClientComponentClient } from '@/lib/supabase';
import { getSocialAccounts, getHomepageSeo, type SocialAccount, type SocialPlatform } from '@/lib/services/siteSettingsService';

const NAV_CARE_TYPES = [
    { href: '/facilities/type/independent-living',       name: 'Independent Living',                          desc: 'Active senior community with optional care services',     icon: faBuilding },
    { href: '/facilities/type/assisted-living',          name: 'Assisted Living',                             desc: 'Apartment-style community with on-site support staff',    icon: faBuilding },
    { href: '/facilities/type/memory-care',              name: 'Memory Care',                                 desc: 'Specialized support for dementia and memory conditions',  icon: faBuilding },
    { href: '/homes/type/adult-residential-care-homes',  name: 'Care Homes',                                  desc: 'Home-like setting with full-time caregivers on site',     icon: faHouse },
    { href: '/homes/type/adult-foster-homes',            name: 'Foster Homes',                                desc: 'Community Care Foster Family Homes',                      icon: faHouse },
    { href: '/facilities/type/intermediate-care-facility', name: 'Intermediate Care & Skilled Nursing Facilities', desc: 'Skilled nursing care with 24/7 medical supervision', icon: faBuilding },
];


const SOCIAL_ICON_MAP: Record<SocialPlatform, typeof faFacebookF> = {
    facebook:  faFacebookF,
    instagram: faInstagram,
    x:         faXTwitter,
    linkedin:  faLinkedinIn,
    pinterest: faPinterestP,
    youtube:   faYoutube,
    tiktok:    faTiktok,
    threads:   faThreads,
    phone:     faPhone,
    email:     faEnvelope,
    share:     faShareNodes,
};

function socialHref(platform: SocialPlatform, url: string): string {
    if (platform === 'phone') return `tel:${url.replace(/\s+/g, '')}`;
    if (platform === 'email') return `mailto:${url}`;
    return url;
}

async function handleShare(title: string, text: string) {
    const url = window.location.origin;
    if (navigator.share) {
        try { await navigator.share({ title, text, url }); } catch { /* cancelled */ }
    } else {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    }
}

interface TaxEntry { id: string; name: string; slug: string; }

interface BrowseModalProps {
    onClose: () => void;
}

export function BrowseModal({ onClose }: BrowseModalProps) {
    const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
    const [homepageTitle, setHomepageTitle] = useState('EliteCareFinders');
    const [homepageText, setHomepageText] = useState('');
    const [locationStates, setLocationStates] = useState<TaxEntry[]>([]);
    const [hawaiiIslands, setHawaiiIslands] = useState<TaxEntry[]>([]);

    useEffect(() => {
        getSocialAccounts().then(accounts => setSocialAccounts(accounts));
        getHomepageSeo().then(seo => {
            if (seo.metaTitle) setHomepageTitle(seo.metaTitle);
            if (seo.metaDescription) setHomepageText(seo.metaDescription);
        });

        (async () => {
            const supabase = createClientComponentClient();
            const { data: tax } = await supabase.from('taxonomies').select('id').eq('slug', 'location').maybeSingle();
            if (!tax) return;
            const { data: states } = await supabase.from('taxonomy_entries').select('id, name, slug').eq('taxonomy_id', tax.id).is('parent_id', null).order('name');
            const mapped = (states || []).map((r: any) => ({ id: r.id, name: r.name, slug: r.slug }));
            setLocationStates(mapped);
            const hawaii = mapped.find(s => s.slug === 'hawaii');
            if (hawaii) {
                const { data: islands } = await supabase.from('taxonomy_entries').select('id, name, slug').eq('parent_id', hawaii.id);
                const HIDDEN = new Set(['lanai', 'molokai']);
                const ISLAND_ORDER = ['oahu', 'maui', 'big-island', 'kauai'];
                setHawaiiIslands((islands || []).filter((r: any) => !HIDDEN.has(r.slug)).sort((a: any, b: any) => {
                    const ai = ISLAND_ORDER.indexOf(a.slug); const bi = ISLAND_ORDER.indexOf(b.slug);
                    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
                }).map((r: any) => ({ id: r.id, name: r.name, slug: r.slug })));
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

                    {/* Care type cards */}
                    <div className="flex flex-col gap-2 mb-6">
                        {NAV_CARE_TYPES.map(t => (
                            <Link
                                key={t.href}
                                href={t.href}
                                onClick={onClose}
                                className="group w-full text-left rounded-xl p-3 bg-white shadow-sm hover:shadow-md transition-shadow flex items-start gap-3"
                            >
                                <div className="flex-none w-9 h-9 rounded-lg flex items-center justify-center bg-gray-100 group-hover:bg-[#239ddb] transition-colors">
                                    <FontAwesomeIcon icon={t.icon} className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
                                </div>
                                <div>
                                    <span className="block font-semibold text-sm leading-snug mb-0.5 text-gray-800 group-hover:text-[#239ddb] transition-colors">{t.name}</span>
                                    <span className="block text-xs text-gray-400 leading-snug">{t.desc}</span>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Location section */}
                    {locationStates.length > 0 && (
                        <div className="-mx-6 px-6 py-4 bg-gray-100">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
                                <span className="flex items-center justify-center w-5 h-5 rounded bg-[#239ddb] shrink-0">
                                    <FontAwesomeIcon icon={faLocationDot} className="h-3 w-3 text-white" />
                                </span>
                                Find Care by Location
                            </div>
                            <div className="pl-7 flex flex-wrap gap-2">
                                {hawaiiIslands.length > 0 && (
                                    <SearchableLocationDropdown
                                        label="Hawaii Islands"
                                        placeholder="Search islands..."
                                        items={hawaiiIslands}
                                        basePath="/location/hawaii"
                                        onNavigate={onClose}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Footer: social + contact */}
                    <div className="pt-5 -mx-6 px-6 flex gap-6">
                        {socialAccounts.length > 0 && (
                            <div className="flex flex-wrap gap-2 content-start">
                                {socialAccounts.map(account => (
                                    account.platform === 'share' ? (
                                        <button
                                            key={account.id}
                                            type="button"
                                            onClick={() => handleShare(homepageTitle, homepageText)}
                                            className="flex items-center justify-center w-8 h-8 rounded-md border-2 border-gray-300 text-gray-400 hover:border-[#239ddb] hover:text-[#239ddb] transition-colors"
                                            aria-label="Share"
                                        >
                                            <FontAwesomeIcon icon={SOCIAL_ICON_MAP.share} className="h-3.5 w-3.5" />
                                        </button>
                                    ) : (
                                    <a
                                        key={account.id}
                                        href={socialHref(account.platform, account.url)}
                                        target={account.platform === 'phone' || account.platform === 'email' ? undefined : '_blank'}
                                        rel={account.platform === 'phone' || account.platform === 'email' ? undefined : 'noopener noreferrer'}
                                        className="flex items-center justify-center w-8 h-8 rounded-md border-2 border-gray-300 text-gray-400 hover:border-[#239ddb] hover:text-[#239ddb] transition-colors"
                                        aria-label={account.platform}
                                    >
                                        <FontAwesomeIcon icon={SOCIAL_ICON_MAP[account.platform]} className="h-3.5 w-3.5" />
                                    </a>
                                    )
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
