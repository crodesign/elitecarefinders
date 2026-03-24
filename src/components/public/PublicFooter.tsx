import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse, faBuilding, faHeart, faPhone, faEnvelope } from '@fortawesome/free-solid-svg-icons';
import { getBrowseNavTypes } from '@/lib/public-db';

export async function PublicFooter() {
    const { homeTypes, facilityTypes } = await getBrowseNavTypes();

    return (
        <footer className="mt-16">
            <div className="max-w-6xl mx-auto">
            <div className="bg-gray-100 rounded-t-xl px-6 sm:px-8 pt-12 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-[200px_160px_1fr_1fr] gap-8">

                    {/* Logo + tagline */}
                    <div>
                        <Image
                            src="/images/site/ecf-logo-black.svg"
                            alt="Elite CareFinders"
                            width={140}
                            height={36}
                            className="h-7 w-auto mb-3"
                        />
                        <p className="text-sm text-gray-500 max-w-xs">
                            Helping Hawaii families find trusted senior care homes and communities with personalized, no-cost guidance.
                        </p>
                        <div className="flex flex-col gap-2 mt-4 text-xs text-gray-600">
                            <a href="tel:+18084454111" className="flex items-center gap-2 hover:text-[#239ddb] transition-colors">
                                <FontAwesomeIcon icon={faPhone} className="h-3 w-3 text-[#239ddb]" />
                                (808) 445-4111
                            </a>
                            <a href="mailto:info@elitecarefinders.com" className="flex items-center gap-2 hover:text-[#239ddb] transition-colors">
                                <FontAwesomeIcon icon={faEnvelope} className="h-3 w-3 text-[#239ddb]" />
                                info@elitecarefinders.com
                            </a>
                        </div>
                    </div>

                    {/* Company */}
                    <div>
                        <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                            <span className="flex items-center justify-center w-4 h-4 rounded bg-[#239ddb] shrink-0">
                                <FontAwesomeIcon icon={faHeart} className="h-2.5 w-2.5 text-white" />
                            </span>
                            Company
                        </h3>
                        <ul className="space-y-1.5 text-xs text-gray-600">
                            <li><Link href="/about" className="hover:text-[#239ddb] transition-colors">About Us</Link></li>
                            <li><Link href="/contact" className="hover:text-[#239ddb] transition-colors">Contact</Link></li>
                            <li><Link href="/blog" className="hover:text-[#239ddb] transition-colors">Resources</Link></li>
                            <li><Link href="/reviews" className="hover:text-[#239ddb] transition-colors">Testimonials</Link></li>
                            <li><Link href="/terms" className="hover:text-[#239ddb] transition-colors">Terms &amp; Conditions</Link></li>
                            <li><Link href="/privacy" className="hover:text-[#239ddb] transition-colors">Privacy Policy</Link></li>
                        </ul>
                    </div>

                    {/* Care Homes */}
                    <div>
                        <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                            <span className="flex items-center justify-center w-4 h-4 rounded bg-[#239ddb] shrink-0">
                                <FontAwesomeIcon icon={faHouse} className="h-2.5 w-2.5 text-white" />
                            </span>
                            Care Homes
                        </h3>
                        <ul className="space-y-1.5 text-xs text-gray-600">
                            {homeTypes.map(type => (
                                <li key={type.id}>
                                    <Link href={`/homes/type/${type.slug}`} className="hover:text-[#239ddb] transition-colors">{type.name}</Link>
                                </li>
                            ))}
                            <li>
                                <Link href="/homes" className="font-semibold text-gray-500 hover:text-[#239ddb] transition-colors">View all Homes →</Link>
                            </li>
                        </ul>
                    </div>

                    {/* Senior Living Communities */}
                    <div>
                        <h3 className="flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                            <span className="flex items-center justify-center w-4 h-4 rounded bg-[#239ddb] shrink-0">
                                <FontAwesomeIcon icon={faBuilding} className="h-2.5 w-2.5 text-white" />
                            </span>
                            Senior Living Communities
                        </h3>
                        <ul className="space-y-1.5 text-xs text-gray-600">
                            {facilityTypes.map(type => (
                                <li key={type.id}>
                                    <Link href={`/facilities/type/${type.slug}`} className="hover:text-[#239ddb] transition-colors">{type.name}</Link>
                                </li>
                            ))}
                            <li>
                                <Link href="/facilities" className="font-semibold text-gray-500 hover:text-[#239ddb] transition-colors">View all Communities →</Link>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="border-t-2 border-white mt-10 pt-6 text-xs text-gray-400 text-center">
                    &copy; 2020&ndash;{new Date().getFullYear()} Elite CareFinders. All rights reserved.
                </div>
            </div>
            </div>
        </footer>
    );
}
