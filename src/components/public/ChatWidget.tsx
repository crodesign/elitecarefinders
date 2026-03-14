'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faXmark, faPaperPlane } from '@fortawesome/free-solid-svg-icons';
import { useFavorites } from '@/contexts/FavoritesContext';
import { ConsultationModal } from './ConsultationModal';
import type { EntityCard } from '@/app/api/chat/route';

const ASSISTANT_AVATAR = 'https://pub-b05d31f393244be884cdeb6e00ba36b7.r2.dev/media/site-1.svg';
const CARDS_DELIMITER = '\n__CARDS__\n';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    quickReplies?: string[];
    showConsultationCta?: boolean;
    entityCards?: EntityCard[];
}

const WELCOME_NEW = "Hi! I'm the Elite CareFinders assistant. I'm here to help you find the right senior living community. What can I help you with today?";
const WELCOME_RETURNING = "Welcome back! How can I help you today?";

const INITIAL_QUICK_REPLIES = [
    "What types of homes do you offer?",
    "How much does senior care cost?",
    "What's an Adult Foster Home?",
    "I need help finding care for a loved one",
];

const CONSULTATION_TRIGGERS = ['consultation', 'schedule', 'advisor', 'talk to someone', 'call me', 'contact', 'ready to', 'next step'];

function shouldSuggestConsultation(text: string): boolean {
    const lower = text.toLowerCase();
    return CONSULTATION_TRIGGERS.some(t => lower.includes(t));
}

function stripMarkers(content: string, entityCards?: EntityCard[]): string {
    return content.replace(/\[\[(home|facility):([^\]]+)\]\]/g, (_, type, slug) => {
        const card = entityCards?.find(c => c.slug === slug && c.type === type);
        return card ? card.name : slug.replace(/-/g, ' ');
    });
}

export function ChatWidget() {
    const { user } = useFavorites();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [showConsultation, setShowConsultation] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    const pageContext = useMemo(() => {
        const homeMatch = pathname?.match(/^\/homes\/([^/]+)$/);
        const facilityMatch = pathname?.match(/^\/facilities\/([^/]+)$/);
        return {
            path: pathname || '/',
            entityType: homeMatch ? 'home' : facilityMatch ? 'facility' : undefined,
            entitySlug: homeMatch?.[1] || facilityMatch?.[1],
        };
    }, [pathname]);

    // Initialize on first open
    useEffect(() => {
        if (!isOpen || initialized) return;
        setInitialized(true);

        const isReturning = typeof window !== 'undefined' && !!localStorage.getItem('ecf_chat_visitor');
        const welcomeText = isReturning ? WELCOME_RETURNING : WELCOME_NEW;

        const welcome: Message = {
            role: 'assistant',
            content: user?.user_metadata?.full_name
                ? welcomeText.replace('Hi!', `Hi ${user.user_metadata.full_name.split(' ')[0]}!`)
                : welcomeText,
            quickReplies: isReturning ? undefined : INITIAL_QUICK_REPLIES,
        };

        setMessages([welcome]);

        if (typeof window !== 'undefined') {
            localStorage.setItem('ecf_chat_visitor', '1');
        }
    }, [isOpen, initialized, user]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
    }, [isOpen]);

    const sendMessage = useCallback(async (text: string) => {
        if (!text.trim() || isStreaming) return;

        const userMessage: Message = { role: 'user', content: text.trim() };
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInput('');
        setIsStreaming(true);

        const assistantMessage: Message = { role: 'assistant', content: '' };
        setMessages(prev => [...prev, assistantMessage]);

        abortRef.current = new AbortController();

        try {
            const userContext = user ? {
                name: user.user_metadata?.full_name || user.email?.split('@')[0],
                email: user.email,
            } : undefined;

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages.map(m => ({ role: m.role, content: m.content })),
                    userContext,
                    pageContext,
                }),
                signal: abortRef.current.signal,
            });

            if (!res.ok || !res.body) throw new Error('Failed');

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                fullText += chunk;
                // Show only text portion during streaming (strip __CARDS__ if already received)
                const displayText = fullText.split(CARDS_DELIMITER)[0];
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: displayText };
                    return updated;
                });
            }

            // Parse entity cards
            const [textPart, cardsJson] = fullText.split(CARDS_DELIMITER);
            let entityCards: EntityCard[] | undefined;
            if (cardsJson) {
                try { entityCards = JSON.parse(cardsJson); } catch { /* ignore */ }
            }

            const showCta = shouldSuggestConsultation(textPart) || shouldSuggestConsultation(text);
            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    role: 'assistant',
                    content: textPart,
                    showConsultationCta: showCta,
                    entityCards,
                };
                return updated;
            });
        } catch (err: any) {
            if (err.name === 'AbortError') return;
            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    role: 'assistant',
                    content: "Sorry, I'm having trouble connecting. Please try again or request a consultation directly.",
                    showConsultationCta: true,
                };
                return updated;
            });
        } finally {
            setIsStreaming(false);
        }
    }, [messages, isStreaming, user, pageContext]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const handleClose = () => {
        abortRef.current?.abort();
        setIsOpen(false);
    };

    return (
        <>
            {/* Floating button */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-[#239ddb] text-white rounded-full shadow-lg hover:bg-[#1a7fb3] transition-all ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                aria-label="Open chat"
            >
                <span className="pl-4 py-3 text-sm font-semibold leading-none">Chat with us</span>
                <span className="flex items-center justify-center w-11 h-11 rounded-full bg-[#1a7fb3]">
                    <FontAwesomeIcon icon={faComments} className="h-5 w-5" />
                </span>
            </button>

            {/* Chat panel */}
            {isOpen && (
                <div className="fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-24px)] flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-white border border-gray-100" style={{ height: '520px' }}>
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#239ddb]">
                        <div className="flex items-center gap-2.5">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white overflow-hidden p-1.5">
                                <img src={ASSISTANT_AVATAR} alt="Elite CareFinders" className="w-full h-full object-contain" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-white leading-none">Elite CareFinders</div>
                                <div className="text-[11px] text-white/80 mt-0.5">Virtual Assistant</div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex items-center justify-center w-7 h-7 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
                            aria-label="Close chat"
                        >
                            <FontAwesomeIcon icon={faXmark} className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-100">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                {/* Avatar + bubble */}
                                <div className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                    {msg.role === 'assistant' && (
                                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden p-1 mb-0.5">
                                            <img src={ASSISTANT_AVATAR} alt="" className="w-full h-full object-contain" />
                                        </div>
                                    )}
                                    <div
                                        className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                                            msg.role === 'user'
                                                ? 'bg-[#239ddb] text-white rounded-br-sm'
                                                : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-sm'
                                        }`}
                                    >
                                        {msg.content
                                            ? stripMarkers(msg.content, msg.entityCards)
                                            : (
                                                <span className="inline-flex gap-1 items-center py-0.5">
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                </span>
                                            )}
                                    </div>
                                </div>

                                {/* Entity cards */}
                                {msg.entityCards && msg.entityCards.length > 0 && (
                                    <div className="mt-2 ml-8 flex gap-2 overflow-x-auto pb-1" style={{ maxWidth: '312px' }}>
                                        {msg.entityCards.map(card => (
                                            <a
                                                key={`${card.type}-${card.slug}`}
                                                href={card.url}
                                                className="flex-shrink-0 w-[144px] rounded-xl overflow-hidden border border-gray-100 shadow-sm bg-white hover:shadow-md transition-shadow"
                                            >
                                                {/* Image: full-width if 1, 2x2 grid if 2+ */}
                                                {card.images.length === 1 ? (
                                                    <img src={card.images[0]} alt={card.name} className="w-full h-[116px] object-cover" />
                                                ) : card.images.length === 0 ? (
                                                    <div className="w-full h-[116px] bg-[#239ddb]/10" />
                                                ) : (
                                                    <div className="grid grid-cols-2 gap-px bg-gray-200">
                                                        <img src={card.images[0]} alt={card.name} className="w-full h-[58px] object-cover" />
                                                        {[1, 2, 3].map(idx => (
                                                            card.images[idx] ? (
                                                                <img key={idx} src={card.images[idx]} alt="" className="w-full h-[58px] object-cover" />
                                                            ) : (
                                                                <div key={idx} className="w-full h-[58px] bg-[#239ddb]/10" />
                                                            )
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="p-2">
                                                    <div className="text-[11px] font-semibold text-gray-800 leading-tight line-clamp-2">{card.name}</div>
                                                    {card.city && <div className="text-[10px] text-gray-500 mt-0.5">{card.city}</div>}
                                                    <div className="text-[11px] text-[#239ddb] mt-1 font-medium">View →</div>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                )}

                                {/* Quick replies */}
                                {msg.quickReplies && msg.quickReplies.length > 0 && (
                                    <div className="mt-2 ml-8 flex flex-wrap gap-1.5" style={{ maxWidth: '280px' }}>
                                        {msg.quickReplies.map(qr => (
                                            <button
                                                key={qr}
                                                type="button"
                                                onClick={() => sendMessage(qr)}
                                                disabled={isStreaming}
                                                className="text-xs px-3 py-1.5 rounded-full border border-[#239ddb] text-[#239ddb] hover:bg-[#239ddb] hover:text-white transition-colors disabled:opacity-50"
                                            >
                                                {qr}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Consultation CTA */}
                                {msg.showConsultationCta && (
                                    <button
                                        type="button"
                                        onClick={() => setShowConsultation(true)}
                                        className="mt-2 ml-8 text-xs px-3.5 py-2 rounded-full bg-[#239ddb] text-white font-medium hover:bg-[#1a7fb3] transition-colors"
                                    >
                                        Schedule a free consultation →
                                    </button>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-3 py-3 bg-white border-t border-gray-100">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            placeholder="Ask a question…"
                            disabled={isStreaming}
                            className="flex-1 text-sm px-3.5 py-2 rounded-full bg-gray-100 border border-transparent focus:outline-none focus:border-[#239ddb] focus:bg-white transition-colors disabled:opacity-60 text-gray-800 placeholder-gray-400"
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isStreaming}
                            className="flex items-center justify-center w-9 h-9 rounded-full bg-[#239ddb] text-white hover:bg-[#1a7fb3] disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                            aria-label="Send"
                        >
                            <FontAwesomeIcon icon={faPaperPlane} className="h-3.5 w-3.5" />
                        </button>
                    </form>
                </div>
            )}

            {showConsultation && <ConsultationModal onClose={() => setShowConsultation(false)} />}
        </>
    );
}
