'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHeart, faHouse, faBuilding, faFileAlt, faTrash, faUser, faKey, faCheck, faEye, faEyeSlash, faPencil, faArrowUpRightFromSquare } from '@fortawesome/free-solid-svg-icons';
import { Upload } from 'lucide-react';
import { ImageCropModal } from '@/components/admin/ImageCropModal';
import { useFavorites } from '@/contexts/FavoritesContext';
import type { Favorite } from '@/types';

type UserEntity = { id: string; entityId: string; entityType: 'home' | 'facility'; title: string; slug: string };
const ADMIN_ROLES: string[] = ['super_admin', 'system_admin', 'regional_manager', 'location_manager'];

type Tab = 'all' | 'home' | 'facility' | 'post';

const ENTITY_PATHS: Record<Favorite['type'], string> = {
    home: '/homes',
    facility: '/facilities',
    post: '/blog',
};

const TAB_ICONS = {
    all: faHeart,
    home: faHouse,
    facility: faBuilding,
    post: faFileAlt,
};

function FavoriteCard({ item, onRemove }: { item: Favorite; onRemove: () => void }) {
    const path = `${ENTITY_PATHS[item.type]}/${item.entitySlug}`;
    return (
        <div className="group relative bg-gray-100 rounded-xl overflow-hidden border border-gray-100 hover:border-[#239ddb]/30 transition-colors">
            <Link href={path} className="block aspect-square bg-gray-200 overflow-hidden">
                {item.entityImage ? (
                    <img
                        src={item.entityImage}
                        alt={item.entityTitle ?? ''}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <FontAwesomeIcon icon={TAB_ICONS[item.type]} className="h-8 w-8 text-gray-300" />
                    </div>
                )}
            </Link>
            <div className="p-3">
                <Link href={path} className="block text-sm text-gray-800 hover:text-[#239ddb] transition-colors line-clamp-2 leading-tight">
                    {item.entityTitle ?? item.entitySlug}
                </Link>
            </div>
            <button
                type="button"
                onClick={onRemove}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 text-gray-400 hover:text-red-500 hover:bg-white flex items-center justify-center shadow-sm transition-colors"
                aria-label="Remove from saved"
            >
                <FontAwesomeIcon icon={faTrash} className="h-3 w-3" />
            </button>
        </div>
    );
}

function AccountSection({ nickname, onUpdate }: { nickname: string; onUpdate: (name: string) => void }) {
    const [name, setName] = useState(nickname);
    const [nameStatus, setNameStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [pwStatus, setPwStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [pwError, setPwError] = useState('');

    const fieldBase = 'w-full bg-gray-100 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#239ddb]';

    const saveName = async () => {
        if (!name.trim() || name === nickname) return;
        setNameStatus('saving');
        try {
            const res = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname: name.trim() }),
            });
            if (!res.ok) throw new Error();
            onUpdate(name.trim());
            setNameStatus('saved');
            setTimeout(() => setNameStatus('idle'), 2000);
        } catch {
            setNameStatus('error');
        }
    };

    const savePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwError('');
        if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
        if (newPw.length < 6) { setPwError('Password must be at least 6 characters.'); return; }
        setPwStatus('saving');
        try {
            const res = await fetch('/api/profile/password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
            });
            if (!res.ok) {
                const d = await res.json();
                throw new Error(d.error ?? 'Failed');
            }
            setCurrentPw(''); setNewPw(''); setConfirmPw('');
            setPwStatus('saved');
            setTimeout(() => setPwStatus('idle'), 2000);
        } catch (err: any) {
            setPwError(err.message);
            setPwStatus('error');
        }
    };

    return (
        <div className="space-y-5">
            {/* Nickname */}
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Nickname</p>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={name}
                        onChange={e => { setName(e.target.value); setNameStatus('idle'); }}
                        className={fieldBase}
                        placeholder="Your nickname"
                    />
                    <button
                        type="button"
                        onClick={saveName}
                        disabled={nameStatus === 'saving' || !name.trim() || name === nickname}
                        className="shrink-0 px-3 py-2 bg-[#239ddb] text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#1a7fb3] transition-colors disabled:opacity-50"
                    >
                        {nameStatus === 'saving' ? '…' : nameStatus === 'saved' ? <FontAwesomeIcon icon={faCheck} className="h-3.5 w-3.5" /> : 'Save'}
                    </button>
                </div>
                {nameStatus === 'error' && <p className="text-xs text-red-500 mt-1">Failed to save.</p>}
                <p className="text-[11px] text-gray-400 mt-1.5">Used as your display name. You can also sign in with it instead of your email.</p>
            </div>

            {/* Change password */}
            <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Change Password</p>
                <form onSubmit={savePassword} className="space-y-2">
                    <div className="relative">
                        <input
                            type={showPw ? 'text' : 'password'}
                            value={currentPw}
                            onChange={e => setCurrentPw(e.target.value)}
                            className={`${fieldBase} pr-9`}
                            placeholder="Current password"
                            required
                        />
                        <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" tabIndex={-1}>
                            <FontAwesomeIcon icon={showPw ? faEyeSlash : faEye} className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <input type={showPw ? 'text' : 'password'} value={newPw} onChange={e => setNewPw(e.target.value)} className={fieldBase} placeholder="New password" required />
                    <input type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className={fieldBase} placeholder="Confirm new password" required />
                    {pwError && <p className="text-xs text-red-500">{pwError}</p>}
                    <button
                        type="submit"
                        disabled={pwStatus === 'saving'}
                        className="w-full bg-[#239ddb] text-white text-xs font-bold uppercase tracking-wider py-2.5 rounded-lg hover:bg-[#1a7fb3] transition-colors disabled:opacity-50"
                    >
                        {pwStatus === 'saving' ? 'Saving…' : pwStatus === 'saved' ? 'Password Updated' : (
                            <span className="flex items-center justify-center gap-2">
                                <FontAwesomeIcon icon={faKey} className="h-3 w-3" />
                                Update Password
                            </span>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const { favorites, toggleFavorite, user, isLoading, openAuthModal } = useFavorites();
    const [tab, setTab] = useState<Tab>('all');
    const [nickname, setNickname] = useState('');
    const [photoUrl, setPhotoUrl] = useState('');
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [cropImageUrl, setCropImageUrl] = useState('');
    const [cropOpen, setCropOpen] = useState(false);
    const [userRole, setUserRole] = useState<string>('');
    const [entities, setEntities] = useState<UserEntity[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            fetch('/api/profile').then(r => r.json()).then(d => {
                if (d.nickname) setNickname(d.nickname);
                if (d.photo_url) setPhotoUrl(d.photo_url);
                if (d.role) setUserRole(d.role);
                if (d.entities) setEntities(d.entities);
            });
        }
    }, [user]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => {
            setCropImageUrl(ev.target?.result as string);
            setCropOpen(true);
        };
        reader.readAsDataURL(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleCropSave = async (dataUrl: string) => {
        setCropOpen(false);
        setAvatarUploading(true);
        try {
            const res = await fetch(dataUrl);
            const blob = await res.blob();
            const form = new FormData();
            form.append('file', blob, 'avatar.jpg');
            const uploadRes = await fetch('/api/profile/avatar', { method: 'POST', body: form });
            const data = await uploadRes.json();
            if (uploadRes.ok) setPhotoUrl(data.photo_url);
        } finally {
            setAvatarUploading(false);
        }
    };

    const filtered = tab === 'all' ? favorites : favorites.filter(f => f.type === tab);
    const counts = {
        all: favorites.length,
        home: favorites.filter(f => f.type === 'home').length,
        facility: favorites.filter(f => f.type === 'facility').length,
        post: favorites.filter(f => f.type === 'post').length,
    };

    if (isLoading) {
        return (
            <div className="max-w-6xl mx-auto px-[15px] py-16 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#239ddb] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto px-[15px] py-10 sm:py-14">
            <div className="flex flex-col md:flex-row gap-8">

                {/* Left sidebar — 1/4 */}
                <aside className="md:w-1/4 shrink-0">
                    {/* Avatar + user info */}
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className="relative mb-3">
                            <button
                                type="button"
                                onClick={() => user && fileInputRef.current?.click()}
                                disabled={avatarUploading}
                                className="w-20 h-20 rounded-full overflow-hidden bg-[#239ddb] flex items-center justify-center shrink-0 disabled:cursor-wait"
                                aria-label="Change profile photo"
                            >
                                {avatarUploading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : photoUrl ? (
                                    <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <FontAwesomeIcon icon={faUser} className="h-8 w-8 text-white" />
                                )}
                            </button>
                            {user && !avatarUploading && (
                                <div
                                    className="absolute bottom-0 right-0 w-6 h-6 bg-[#239ddb] border-2 border-white rounded-full flex items-center justify-center cursor-pointer hover:bg-[#1a7fb3] transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <Upload className="h-2.5 w-2.5 text-white" />
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                        <p className="text-sm font-semibold text-gray-900 truncate max-w-full">
                            {user ? (nickname || user.email?.split('@')[0] || 'Account') : 'Guest'}
                        </p>
                        <p className="text-xs text-gray-400 truncate max-w-full">{user ? user.email : 'Not signed in'}</p>
                    </div>

                    {user ? (
                        <AccountSection nickname={nickname} onUpdate={setNickname} />
                    ) : (
                        <div className="bg-[#f0f8fc] rounded-xl p-5 space-y-3">
                            <p className="text-sm font-semibold text-gray-800">Sign in to sync</p>
                            <p className="text-xs text-gray-500">Keep your saved items safe and accessible across all your devices.</p>
                            <button
                                type="button"
                                onClick={openAuthModal}
                                className="w-full px-4 py-2 bg-[#239ddb] text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#1a7fb3] transition-colors"
                            >
                                Sign In / Create Account
                            </button>
                        </div>
                    )}
                </aside>

                {/* Right column — 3/4 */}
                <div className="flex-1 min-w-0">

                    {/* My Listings — admin roles always see admin link; local users see assigned entities */}
                    {(ADMIN_ROLES.includes(userRole) || entities.length > 0) && (
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-900">My Listings</h2>
                            <p className="text-sm text-gray-500 mt-1 mb-4">
                                {ADMIN_ROLES.includes(userRole) ? 'Manage listings in the admin panel.' : 'Update your listing information.'}
                            </p>
                            {ADMIN_ROLES.includes(userRole) ? (
                                <div className="flex items-center justify-between gap-4 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 hover:border-[#239ddb]/30 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-8 h-8 rounded-lg bg-[#239ddb]/10 flex items-center justify-center shrink-0">
                                            <FontAwesomeIcon icon={faBuilding} className="h-3.5 w-3.5 text-[#239ddb]" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900">Homes &amp; Facilities</p>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Admin Panel</p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/admin"
                                        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#239ddb] text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#1a7fb3] transition-colors"
                                    >
                                        <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="h-3 w-3" />
                                        Open Admin
                                    </Link>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    {entities.map(entity => {
                                        return (
                                            <div key={entity.id} className="flex items-center justify-between gap-4 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 hover:border-[#239ddb]/30 transition-colors">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-8 h-8 rounded-lg bg-[#239ddb]/10 flex items-center justify-center shrink-0">
                                                        <FontAwesomeIcon
                                                            icon={entity.entityType === 'home' ? faHouse : faBuilding}
                                                            className="h-3.5 w-3.5 text-[#239ddb]"
                                                        />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-semibold text-gray-900 truncate">{entity.title}</p>
                                                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                                            {entity.entityType === 'home' ? 'Care Home' : 'Facility'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <Link
                                                    href={`/admin/my-listings?edit=${entity.slug}&type=${entity.entityType}`}
                                                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#239ddb] text-white text-xs font-bold uppercase tracking-wider rounded-lg hover:bg-[#1a7fb3] transition-colors"
                                                >
                                                    <FontAwesomeIcon icon={faPencil} className="h-3 w-3" />
                                                    Edit Listing
                                                </Link>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-gray-900">My Saved</h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {user ? 'Your saved homes, facilities, and resources.' : 'Browsing as guest — saves are stored locally.'}
                        </p>
                    </div>

                    {/* Tabs */}
                    <div className="border-b-[6px] border-[#f3f4f6] mb-6">
                        <div className="flex justify-center items-start overflow-visible gap-1 pt-2 px-2">
                            {(['all', 'home', 'facility', 'post'] as Tab[]).map(t => {
                                const isActive = tab === t;
                                const tabColor = '#f3f4f6';
                                return (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setTab(t)}
                                        className={`relative flex items-center gap-2 px-4 text-sm font-medium whitespace-nowrap transition-colors duration-150 ${
                                            isActive
                                                ? 'pt-[10px] pb-[11px] text-gray-900 z-10 rounded-tl-lg rounded-tr-lg'
                                                : 'pt-2 pb-2 bg-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg border-2 border-gray-100'
                                        }`}
                                        style={isActive ? { backgroundColor: tabColor } : undefined}
                                    >
                                        {isActive && (
                                            <span className="absolute bottom-0 left-[-8px] w-2 h-2 pointer-events-none">
                                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M8 0 L8 8 L0 8 A 8 8 0 0 0 8 0 Z" fill={tabColor} />
                                                </svg>
                                            </span>
                                        )}
                                        <FontAwesomeIcon icon={TAB_ICONS[t]} className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-[#239ddb]' : ''}`} />
                                        <span className="hidden sm:inline">{t === 'all' ? 'All' : t === 'home' ? 'Homes' : t === 'facility' ? 'Facilities' : 'Posts'}</span>
                                        <span className={`text-[10px] px-1.5 py-px rounded font-bold ${isActive ? 'bg-[#239ddb] text-white' : 'bg-gray-200 text-gray-500'} `}>
                                            {counts[t]}
                                        </span>
                                        {isActive && (
                                            <span className="absolute bottom-0 right-[-8px] w-2 h-2 pointer-events-none">
                                                <svg width="8" height="8" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M0 0 L0 8 L8 8 A 8 8 0 0 1 0 0 Z" fill={tabColor} />
                                                </svg>
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Grid — 4 columns */}
                    {filtered.length === 0 ? (
                        <div className="py-20 text-center">
                            <FontAwesomeIcon icon={faHeart} className="h-10 w-10 text-gray-200 mb-4" />
                            <p className="text-gray-400 text-sm">No saved {tab === 'all' ? 'items' : tab + 's'} yet.</p>
                            <p className="text-gray-400 text-xs mt-1">Browse and click the heart icon to save something.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {filtered.map(item => (
                                <FavoriteCard
                                    key={`${item.type}-${item.entityId}`}
                                    item={item}
                                    onRemove={() => toggleFavorite({ type: item.type, entityId: item.entityId, entitySlug: item.entitySlug, entityTitle: item.entityTitle, entityImage: item.entityImage })}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {cropOpen && cropImageUrl && (
                <ImageCropModal
                    isOpen={cropOpen}
                    imageUrl={cropImageUrl}
                    onClose={() => setCropOpen(false)}
                    onSave={handleCropSave}
                />
            )}

        </div>
    );
}
