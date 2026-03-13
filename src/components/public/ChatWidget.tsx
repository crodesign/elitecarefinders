'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faComments, faXmark, faPaperPlane, faRobot } from '@fortawesome/free-solid-svg-icons';
import { useFavorites } from '@/contexts/FavoritesContext';
import { ConsultationModal } from './ConsultationModal';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    quickReplies?: string[];
    showConsultationCta?: boolean;
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

export function ChatWidget() {
    const { user } = useFavorites();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isStreaming, setIsStreaming] = useState(false);
    const [showConsultation, setShowConsultation] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<AbortController | null>(null);

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

        // Add empty assistant message to stream into
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
                setMessages(prev => {
                    const updated = [...prev];
                    updated[updated.length - 1] = { role: 'assistant', content: fullText };
                    return updated;
                });
            }

            // Add quick replies / CTA after response
            const showCta = shouldSuggestConsultation(fullText) || shouldSuggestConsultation(text);
            setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                    role: 'assistant',
                    content: fullText,
                    showConsultationCta: showCta,
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
    }, [messages, isStreaming, user]);

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
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
                                <FontAwesomeIcon icon={faRobot} className="h-4 w-4 text-white" />
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
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
                        {messages.map((msg, i) => (
                            <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div
                                    className={`max-w-[82%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                                        msg.role === 'user'
                                            ? 'bg-[#239ddb] text-white rounded-br-sm'
                                            : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-bl-sm'
                                    }`}
                                >
                                    {msg.content || (
                                        <span className="inline-flex gap-1 items-center py-0.5">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </span>
                                    )}
                                </div>

                                {/* Quick replies */}
                                {msg.quickReplies && msg.quickReplies.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5 max-w-[90%]">
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
                                        className="mt-2 text-xs px-3.5 py-2 rounded-full bg-[#239ddb] text-white font-medium hover:bg-[#1a7fb3] transition-colors"
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
