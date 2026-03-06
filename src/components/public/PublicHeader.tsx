'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faHeart, faRightFromBracket } from '@fortawesome/free-solid-svg-icons';
import { ConsultationModal } from './ConsultationModal';
import { useFavorites } from '@/contexts/FavoritesContext';

export function PublicHeader() {
    const [showConsultation, setShowConsultation] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { user, openAuthModal, openSavedModal, signOut } = useFavorites();
    const pathname = usePathname();
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
            <header className="border-b border-gray-100 bg-white/95 backdrop-blur-sm sticky top-0 z-40">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <Link href="/" className="flex items-center">
                        <Image
                            src="/images/site/ecf-logo-black.svg"
                            alt="Elite CareFinders"
                            width={160}
                            height={40}
                            className="h-8 w-auto"
                            priority
                        />
                    </Link>
                    <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
                        <Link href="/homes" className="hover:text-[#239ddb] transition-colors">Homes</Link>
                        <Link href="/facilities" className="hover:text-[#239ddb] transition-colors">Facilities</Link>
                        <Link href="/blog" className="hover:text-[#239ddb] transition-colors">Resources</Link>
                        <Link href="/contact" className="hover:text-[#239ddb] transition-colors">Contact</Link>
                        <button
                            onClick={() => setShowConsultation(true)}
                            className="text-[#239ddb] font-semibold hover:text-[#1a7fb3] transition-colors"
                        >
                            Request Consultation
                        </button>
                    </nav>

                    <div className="flex items-center gap-2">
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

                        <a
                            href="tel:+1-800-000-0000"
                            className="hidden sm:inline-flex items-center gap-2 bg-[#239ddb] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#1a7fb3] transition-colors"
                        >
                            Get Help Now
                        </a>
                    </div>
                </div>
            </header>

            {showConsultation && (
                <ConsultationModal onClose={() => setShowConsultation(false)} />
            )}
        </>
    );
}
