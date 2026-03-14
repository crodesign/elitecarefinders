'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faXmark, faPaperPlane, faRotateLeft } from '@fortawesome/free-solid-svg-icons';
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
    hidden?: boolean; // included in API history but not rendered
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

function parseTextParts(content: string): { intro: string; outro: string } {
    const firstMarker = content.search(/\[\[(home|facility|post):[^\]]+\]\]/);
    if (firstMarker === -1) return { intro: content, outro: '' };
    let lastEnd = 0;
    let m;
    const re = /\[\[(home|facility|post):[^\]]+\]\]/g;
    while ((m = re.exec(content)) !== null) lastEnd = m.index + m[0].length;
    return { intro: content.slice(0, firstMarker).trim(), outro: content.slice(lastEnd).trim() };
}

function chatCacheKey(userId: string) {
    return `ecf_chat_history_${userId}`;
}

function loadChatCache(userId: string): Message[] {
    try {
        const raw = localStorage.getItem(chatCacheKey(userId));
        if (!raw) return [];
        return JSON.parse(raw) as Message[];
    } catch { return []; }
}

function saveChatCache(userId: string, messages: Message[]) {
    try {
        localStorage.setItem(chatCacheKey(userId), JSON.stringify(messages.slice(-40)));
    } catch { /* ignore quota errors */ }
}

async function fetchChatHistory(): Promise<Message[]> {
    try {
        const res = await fetch('/api/chat/history');
        if (!res.ok) return [];
        const { messages } = await res.json();
        return Array.isArray(messages) ? messages : [];
    } catch { return []; }
}

function persistChatHistory(messages: Message[]) {
    fetch('/api/chat/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
    }).catch(() => { /* best-effort */ });
}

export function ChatWidget() {
    const { user, favorites } = useFavorites();
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [showConsultation, setShowConsultation] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [historyBoundary, setHistoryBoundary] = useState(0); // # of messages from prior session
    const [historyVisible, setHistoryVisible] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const prevUserIdRef = useRef<string | null>(null);
    const hasSavedChat = user?.id ? loadChatCache(user.id).length > 0 : false;

    // Fetch real display name from user_profiles
    useEffect(() => {
        if (!user?.id) { setDisplayName(null); return; }
        fetch('/api/public/auth/profile-name')
            .then(r => r.ok ? r.json() : null)
            .then(d => setDisplayName(d?.name ?? null))
            .catch(() => {});
    }, [user]);

    const pageContext = useMemo(() => {
        const homeMatch = pathname?.match(/^\/homes\/([^/]+)$/);
        const facilityMatch = pathname?.match(/^\/facilities\/([^/]+)$/);
        return {
            path: pathname || '/',
            entityType: homeMatch ? 'home' : facilityMatch ? 'facility' : undefined,
            entitySlug: homeMatch?.[1] || facilityMatch?.[1],
        };
    }, [pathname]);

    // When user changes (sign in/out), reset so history reloads correctly
    useEffect(() => {
        const currentId = user?.id ?? null;
        if (currentId !== prevUserIdRef.current) {
            prevUserIdRef.current = currentId;
            setInitialized(false);
            setMessages([]);
            setHistoryBoundary(0);
            setHistoryVisible(false);
        }
    }, [user]);

    // Initialize on first open — fetch name + history in parallel so name is always ready
    useEffect(() => {
        if (!isOpen || initialized) return;
        setInitialized(true);

        if (user?.id) {
            const cached = loadChatCache(user.id);
            if (cached.length > 0) setMessages(cached);

            const fetchName = fetch('/api/public/auth/profile-name')
                .then(r => r.ok ? r.json() : null)
                .then((d: { name: string | null } | null) => d?.name ?? null)
                .catch(() => null as string | null);

            Promise.all([fetchChatHistory(), fetchName]).then(([history, name]) => {
                if (name) setDisplayName(name);
                const base = history.length > 0 ? history : cached;
                if (base.length > 0) {
                    if (history.length > 0) saveChatCache(user.id!, history);
                    streamWelcome(base, favorites.length, name);
                } else {
                    showStaticWelcome(name);
                }
            });
            return;
        }

        showStaticWelcome(null);
    }, [isOpen, initialized, user]); // eslint-disable-line react-hooks/exhaustive-deps

    function showStaticWelcome(name: string | null) {
        const isReturning = typeof window !== 'undefined' && !!localStorage.getItem('ecf_chat_visitor');
        const welcomeText = isReturning ? WELCOME_RETURNING : WELCOME_NEW;
        const firstName = name?.split(' ')[0] ?? null;
        const welcome: Message = {
            role: 'assistant',
            content: firstName ? welcomeText.replace('Hi!', `Hi ${firstName}!`) : welcomeText,
            quickReplies: isReturning ? undefined : INITIAL_QUICK_REPLIES,
        };
        setMessages([welcome]);
        if (typeof window !== 'undefined') localStorage.setItem('ecf_chat_visitor', '1');
    }

    async function streamWelcome(history: Message[], savedCount: number, name: string | null) {
        const trigger: Message = { role: 'user', content: '[new_session]', hidden: true };
        if (history.length > 0) {
            setHistoryBoundary(history.length);
            setHistoryVisible(false);
        }
        setMessages([...history, trigger, { role: 'assistant', content: '' }]);

        const mentionSaved = savedCount > 0 && Math.random() < 0.4;

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...history.map(m => ({ role: m.role, content: m.content })), { role: 'user', content: '[new_session]' }],
                    userContext: user ? { name: name ?? undefined, email: user.email } : undefined,
                    welcomeMode: true,
                    savedCount,
                    mentionSaved,
                }),
            });
            if (!res.ok || !res.body) { showStaticWelcome(user); return; }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                fullText += decoder.decode(value, { stream: true });
                const displayText = fullText.split(CARDS_DELIMITER)[0];
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: displayText };
                    return updated;
                });
            }

            const welcomeText = fullText.split(CARDS_DELIMITER)[0].trim();
            setMessages([...history, trigger, { role: 'assistant', content: welcomeText }]);
        } catch {
            showStaticWelcome(user);
        }
    }

    // Persist conversation for logged-in users (local cache + server)
    // Debounced so streaming doesn't fire on every chunk
    useEffect(() => {
        if (!user?.id || messages.length === 0) return;
        saveChatCache(user.id, messages);
        const t = setTimeout(() => persistChatHistory(messages), 1500);
        return () => clearTimeout(t);
    }, [user, messages]);

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

    function startNewConversation() {
        abortRef.current?.abort();
        if (user?.id) {
            saveChatCache(user.id, []);
            persistChatHistory([]);
        }
        setHistoryBoundary(0);
        setHistoryVisible(false);
        setInitialized(true); // prevent re-init on next render cycle
        showStaticWelcome(displayName);
    }

    return (
        <>
            {/* Floating button */}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-[#239ddb] text-white rounded-full shadow-lg hover:bg-[#1a7fb3] transition-all ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                aria-label="Open chat"
            >
                <span className="pl-4 py-3 text-sm font-semibold leading-none">{hasSavedChat ? 'View saved chat' : 'Chat with us'}</span>
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
                        <div className="flex items-center gap-1">
                            <div className="relative group">
                                <button
                                    type="button"
                                    onClick={startNewConversation}
                                    className="flex items-center justify-center w-7 h-7 rounded-full text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                                    aria-label="Start new conversation"
                                >
                                    <FontAwesomeIcon icon={faRotateLeft} className="h-3.5 w-3.5" />
                                </button>
                                <div className="pointer-events-none absolute top-1/2 right-full -translate-y-1/2 mr-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                    <div className="bg-white text-gray-800 text-[11px] font-medium px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg border border-gray-100">
                                        New conversation
                                    </div>
                                    <div className="absolute top-1/2 left-full -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-white" />
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
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-100">
                        {historyBoundary > 0 && (
                            <div className="flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => setHistoryVisible(v => !v)}
                                    className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 hover:text-[#239ddb] bg-white border-2 border-gray-200 hover:border-[#239ddb]/50 rounded-full px-3 py-1.5 shadow-sm transition-colors"
                                >
                                    <svg className={`w-3 h-3 transition-transform ${historyVisible ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8">
                                        <path d="M2 4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                    {historyVisible ? 'Hide previous conversation' : 'Previous conversation'}
                                </button>
                            </div>
                        )}
                        {messages.filter((msg, i) => !msg.hidden && (historyBoundary === 0 || historyVisible || i >= historyBoundary)).map((msg, i) => {
                            const hasCards = msg.role === 'assistant' && !!msg.entityCards?.length;
                            const { intro, outro } = (msg.role === 'assistant' && msg.content)
                                ? parseTextParts(msg.content)
                                : { intro: msg.content, outro: '' };
                            return (
                                <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    {/* Avatar + bubble */}
                                    <div className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} ${hasCards ? 'self-stretch' : ''}`}>
                                        {msg.role === 'assistant' && (
                                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden p-1 mb-0.5">
                                                <img src={ASSISTANT_AVATAR} alt="" className="w-full h-full object-contain" />
                                            </div>
                                        )}
                                        <div className={`rounded-2xl text-sm leading-relaxed ${
                                            msg.role === 'user'
                                                ? 'max-w-[82%] px-3.5 py-2.5 bg-[#239ddb] text-white rounded-br-sm whitespace-pre-wrap'
                                                : hasCards
                                                    ? 'flex-1 min-w-0 bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-sm overflow-hidden'
                                                    : 'max-w-[82%] px-3.5 py-2.5 bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-sm whitespace-pre-wrap'
                                        }`}>
                                            {msg.role === 'assistant' ? (
                                                msg.content ? (
                                                    hasCards ? (
                                                        <>
                                                            {intro && <div className="px-3.5 pt-2.5 pb-1 whitespace-pre-wrap">{intro}</div>}
                                                            <div>
                                                                {msg.entityCards!.map(card => (
                                                                    <a
                                                                        key={`${card.type}-${card.slug}`}
                                                                        href={card.url}
                                                                        className="block border-t border-gray-100 hover:bg-gray-50 transition-colors"
                                                                    >
                                                                        {card.images.length === 1 ? (
                                                                            <img src={card.images[0]} alt={card.name} className="w-full h-[160px] object-cover" />
                                                                        ) : card.images.length === 0 ? (
                                                                            <div className="w-full h-[160px] bg-[#239ddb]/10" />
                                                                        ) : (
                                                                            <div className="grid grid-cols-2 gap-px bg-gray-200">
                                                                                <img src={card.images[0]} alt={card.name} className="w-full h-[80px] object-cover" />
                                                                                {[1, 2, 3].map(idx => (
                                                                                    card.images[idx] ? (
                                                                                        <img key={idx} src={card.images[idx]} alt="" className="w-full h-[80px] object-cover" />
                                                                                    ) : (
                                                                                        <div key={idx} className="w-full h-[80px] bg-[#239ddb]/10" />
                                                                                    )
                                                                                ))}
                                                                            </div>
                                                                        )}
                                                                        <div className="px-3 py-2">
                                                                            <div className="text-[12px] font-semibold text-gray-800 leading-tight">{card.name}</div>
                                                                            {card.city && <div className="text-[11px] text-gray-500 mt-0.5">{card.city}</div>}
                                                                            <div className="text-[11px] text-[#239ddb] mt-1 font-medium">View →</div>
                                                                        </div>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                            {outro && <div className="px-3.5 pt-2 pb-2.5 whitespace-pre-wrap">{outro}</div>}
                                                        </>
                                                    ) : (
                                                        <>{intro}</>
                                                    )
                                                ) : (
                                                    <span className="inline-flex gap-1 items-center py-0.5">
                                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                    </span>
                                                )
                                            ) : (
                                                msg.content
                                            )}
                                        </div>
                                    </div>

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
                            );
                        })}
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
