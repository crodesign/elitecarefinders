'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight, faMapLocationDot } from '@fortawesome/free-solid-svg-icons';
import { JoinNetworkModal } from './JoinNetworkModal';

const LOCATIONS = ['Oahu', 'Maui', 'Kauai', 'Big Island', 'Molokai', 'Lanai', 'Mainland US'];

export function JoinNetworkCTA() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <section className="max-w-6xl mx-auto px-5 py-5">
                <div className="rounded-2xl px-5 py-5 flex flex-col lg:flex-row items-center gap-10" style={{ backgroundColor: '#191b21' }}>

                    {/* Left: text */}
                    <div className="flex-1 min-w-0 text-center lg:text-left">
                        <p
                            className="text-[11px] font-bold uppercase tracking-widest mb-3"
                            style={{ color: '#239ddb', fontFamily: 'var(--font-montserrat)' }}
                        >
                            We&rsquo;re Growing
                        </p>
                        <h2
                            className="text-white mb-4"
                            style={{ fontFamily: 'var(--font-montserrat)', fontSize: 'clamp(26px, 3.5vw, 46px)', fontWeight: 200, lineHeight: 1.1, letterSpacing: '-1px' }}
                        >
                            Join the Elite CareFinders<br />
                            <span style={{ color: '#239ddb', fontWeight: 600 }}>Provider Network</span>
                        </h2>
                        <p
                            className="text-white/60 mb-6"
                            style={{ fontFamily: 'var(--font-montserrat)', fontSize: 'clamp(14px, 1.5vw, 17px)', lineHeight: 1.6 }}
                        >
                            We are expanding our directory across the Hawaiian islands and opening our listings to the mainland United States. List your care home or senior living facility and connect with families who need you.
                        </p>

                        {/* Location pills */}
                        <div className="flex flex-wrap gap-2 justify-center lg:justify-start mb-8">
                            {LOCATIONS.map(loc => (
                                <span
                                    key={loc}
                                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold text-white/70"
                                    style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                                >
                                    <FontAwesomeIcon icon={faMapLocationDot} className="h-3 w-3 text-[#239ddb]" />
                                    {loc}
                                </span>
                            ))}
                        </div>

                        <button
                            onClick={() => setOpen(true)}
                            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider text-white transition-colors"
                            style={{ backgroundColor: '#239ddb' }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1a7fb3')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#239ddb')}
                        >
                            Apply to Join
                            <FontAwesomeIcon icon={faArrowRight} className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    {/* Right: feature list */}
                    <div
                        className="w-full lg:w-[360px] flex-shrink-0 rounded-2xl p-6 space-y-4"
                        style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                        <p
                            className="text-white font-semibold mb-4"
                            style={{ fontFamily: 'var(--font-montserrat)', fontSize: '15px' }}
                        >
                            Why join our network?
                        </p>
                        {[
                            { title: 'Free directory listing', desc: 'Get your home or facility listed in our growing directory at no cost.' },
                            { title: 'Reach families statewide', desc: 'Connect with families across all islands and the US mainland searching for quality care.' },
                            { title: 'Trusted brand association', desc: 'Align your listing with an award-winning senior placement brand.' },
                            { title: 'Simple application', desc: 'Apply in minutes — our team handles onboarding from there.' },
                        ].map(item => (
                            <div key={item.title} className="flex gap-3 items-start">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#239ddb] flex-shrink-0 mt-2" />
                                <div>
                                    <p
                                        className="text-white font-semibold m-0"
                                        style={{ fontFamily: 'var(--font-montserrat)', fontSize: '13px', lineHeight: 1.3 }}
                                    >
                                        {item.title}
                                    </p>
                                    <p
                                        className="m-0"
                                        style={{ fontFamily: 'var(--font-montserrat)', fontSize: '12px', lineHeight: 1.5, color: 'rgba(255,255,255,0.45)' }}
                                    >
                                        {item.desc}
                                    </p>
                                </div>
                            </div>
                        ))}

                        <div
                            className="mt-2 pt-4 text-xs text-center"
                            style={{ borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-montserrat)' }}
                        >
                            Directory listing only &mdash; concierge services available for Hawaii providers
                        </div>
                    </div>

                </div>
            </section>

            {open && <JoinNetworkModal onClose={() => setOpen(false)} />}
        </>
    );
}
