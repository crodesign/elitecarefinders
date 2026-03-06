'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faHeart, faRightFromBracket, faComments, faBars, faChevronDown } from '@fortawesome/free-solid-svg-icons';
import { faFacebookF, faInstagram, faXTwitter, faLinkedinIn, faPinterestP, faYoutube, faTiktok, faThreads } from '@fortawesome/free-brands-svg-icons';
import { ConsultationModal } from './ConsultationModal';
import { BrowseModal } from './BrowseModal';
import { useFavorites } from '@/contexts/FavoritesContext';
import { getSocialAccounts, type SocialAccount, type SocialPlatform } from '@/lib/services/siteSettingsService';

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

export function PublicHeader() {
    const [showConsultation, setShowConsultation] = useState(false);
    const [showBrowse, setShowBrowse] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { user, openAuthModal, openSavedModal, signOut } = useFavorites();
    const pathname = usePathname();

    useEffect(() => {
        getSocialAccounts().then(accounts => setSocialAccounts(accounts.filter(a => !a.hidden)));
    }, []);
    const iconClass = (active: boolean) =>
        `h-3.5 w-3.5 transition-colors ${active ? 'text-[#239ddb]' : 'text-gray-400 group-hover:text-[#239ddb]'}`;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setProfileDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <>
            <header className="sticky top-0 z-40">
                <div id="header-inner" className="max-w-6xl mx-auto px-[10px] rounded-b-xl shadow-[0_4px_6px_-1px_rgba(0,0,0,0.075),0_2px_4px_-2px_rgba(0,0,0,0.075)]" style={{ background: 'linear-gradient(to bottom, #ffffff, #f5f5f5)' }}>
                <div className="h-16 flex items-center justify-between relative">
                    {/* Left: hamburger (mobile) | logo (desktop) */}
                    <div className="flex items-center">
                        <button
                            type="button"
                            onClick={() => setShowBrowse(true)}
                            className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg border-2 border-gray-300 text-gray-500 hover:border-[#239ddb] hover:text-[#239ddb] transition-colors"
                            aria-label="Open navigation"
                        >
                            <FontAwesomeIcon icon={faBars} className="h-5 w-5" />
                        </button>
                        <Link href="/" className="hidden md:flex items-center">
                            <Image
                                src="/images/site/ecf-logo-black.svg"
                                alt="Elite CareFinders"
                                width={160}
                                height={40}
                                className="h-[42px] w-auto"
                                priority
                            />
                        </Link>
                    </div>
                    {/* Logo centered on mobile */}
                    <Link href="/" className="md:hidden absolute left-1/2 -translate-x-1/2 flex items-center">
                        <Image
                            src="/images/site/ecf-logo-black.svg"
                            alt="Elite CareFinders"
                            width={160}
                            height={40}
                            className="h-[42px] w-auto"
                            priority
                        />
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
                        <button onClick={() => setShowBrowse(true)} className="flex items-center gap-1.5 hover:text-[#239ddb] transition-colors">
                            Browse our Homes &amp; Communities
                            <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3 opacity-60" />
                        </button>
                        <Link href="/blog" className="hover:text-[#239ddb] transition-colors">Resources</Link>
                    </nav>

                    <div className="flex items-center gap-2">
                        {/* Social Media links */}
                        {socialAccounts.length > 0 && (
                            <div className="hidden sm:flex items-center gap-1 mr-1">
                                {socialAccounts.map(account => (
                                    <a
                                        key={account.id}
                                        href={account.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center w-7 h-7 rounded-md border-2 border-gray-300 text-gray-400 hover:border-[#239ddb] hover:text-[#239ddb] transition-colors"
                                        aria-label={account.platform}
                                    >
                                        <FontAwesomeIcon icon={SOCIAL_ICON_MAP[account.platform]} className="h-3.5 w-3.5" />
                                    </a>
                                ))}
                            </div>
                        )}
                        {/* Profile / Auth icon */}
                        <div className="relative" ref={dropdownRef}>
                            {user ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setProfileDropdownOpen(v => !v)}
                                        className="flex items-center justify-center w-9 h-9 rounded-full bg-[#239ddb] text-white hover:bg-[#1a7fb3] transition-colors"
                                        aria-label="Account menu"
                                    >
                                        <FontAwesomeIcon icon={faUser} className="h-4 w-4" />
                                    </button>
                                    {profileDropdownOpen && (
                                        <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-lg border-2 border-gray-100 p-[5px] z-50">
                                            <button
                                                type="button"
                                                onClick={() => { openSavedModal(); setProfileDropdownOpen(false); }}
                                                className="group flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <FontAwesomeIcon icon={faHeart} className={iconClass(false)} />
                                                My Saved
                                            </button>
                                            <Link
                                                href="/profile"
                                                onClick={() => setProfileDropdownOpen(false)}
                                                className={`group flex items-center gap-2 px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ${pathname === '/profile' ? 'bg-gray-100' : ''}`}
                                            >
                                                <FontAwesomeIcon icon={faUser} className={iconClass(pathname === '/profile')} />
                                                My Profile
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => { signOut(); setProfileDropdownOpen(false); }}
                                                className="group flex items-center gap-2 w-full px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                            >
                                                <FontAwesomeIcon icon={faRightFromBracket} className={iconClass(false)} />
                                                Sign Out
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <button
                                    type="button"
                                    onClick={openAuthModal}
                                    className="flex items-center justify-center w-9 h-9 rounded-full border border-gray-200 text-gray-500 hover:border-[#239ddb] hover:text-[#239ddb] transition-colors"
                                    aria-label="Sign in"
                                >
                                    <FontAwesomeIcon icon={faUser} className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowConsultation(true)}
                            className="hidden sm:inline-flex items-center gap-2.5 bg-[#239ddb] text-white px-4 py-2 rounded-lg hover:bg-[#1a7fb3] transition-colors leading-tight"
                        >
                            <FontAwesomeIcon icon={faComments} className="h-4 w-4 flex-shrink-0" />
                            <span className="flex flex-col text-left">
                                <span className="text-[11px] font-normal opacity-90">Request a free</span>
                                <span className="text-sm font-semibold">Consultation</span>
                            </span>
                        </button>
                    </div>
                </div>
                </div>
            </header>

            {showBrowse && <BrowseModal onClose={() => setShowBrowse(false)} />}
            {showConsultation && (
                <ConsultationModal onClose={() => setShowConsultation(false)} />
            )}
        </>
    );
}
