
import React from 'react';
import { X, Check, Lock, Sparkles, ShoppingBag, Star } from 'lucide-react';
import { ThemeType } from '../App';
import { UserProfile } from '../types';

interface ThemeStoreProps {
    isOpen: boolean;
    onClose: () => void;
    currentTheme: ThemeType;
    setTheme: (theme: ThemeType) => void;
    user: UserProfile;
    onOpenPayment: (type: 'showgirl' | '1989' | 'folklore') => void;
}

export const ThemeStore: React.FC<ThemeStoreProps> = ({ 
    isOpen, 
    onClose, 
    currentTheme, 
    setTheme, 
    user,
    onOpenPayment 
}) => {
    if (!isOpen) return null;

    // TTPD Time Check
    const now = new Date();
    const startTTPD = new Date('2025-11-24T00:00:00');
    const endTTPD = new Date('2025-12-31T23:59:59');
    const isTTPDEvent = now >= startTTPD && now <= endTTPD;

    const themes: {
        id: ThemeType;
        name: string;
        desc: string;
        icon: string;
        gradient: string;
        textColor: string;
        isVip?: boolean;
        vipKey?: keyof UserProfile; // matches isVipShowgirl, etc.
        price?: string;
        isEventFree?: boolean;
    }[] = [
        {
            id: 'default',
            name: 'Otter Classic',
            desc: 'Giao diện mặc định',
            icon: '🦦',
            gradient: 'from-amber-400 to-orange-600',
            textColor: 'text-amber-600'
        },
        {
            id: 'xmas',
            name: 'Jingle Bells',
            desc: 'Giáng sinh an lành',
            icon: '🎅',
            gradient: 'from-red-600 to-green-700',
            textColor: 'text-red-600'
        },
        {
            id: 'swift',
            name: 'Eras VIP',
            desc: 'Taylor Swift Inspired',
            icon: '🐍',
            gradient: 'from-indigo-500 via-purple-500 to-pink-500',
            textColor: 'text-purple-600'
        },
        {
            id: 'blackpink',
            name: 'Born Pink',
            desc: 'Blackpink in your area',
            icon: '🖤',
            gradient: 'from-pink-500 to-black',
            textColor: 'text-pink-500'
        },
        {
            id: 'aespa',
            name: 'MY World',
            desc: 'Synk Dive into Kwangya',
            icon: '👽',
            gradient: 'from-indigo-900 via-purple-900 to-slate-900',
            textColor: 'text-indigo-400'
        },
        {
            id: 'rosie',
            name: 'Number One Girl',
            desc: 'Rosé Solo Edition',
            icon: '🌹',
            gradient: 'from-rose-500 via-red-500 to-rose-600',
            textColor: 'text-rose-600'
        },
        {
            id: 'pkl',
            name: 'G1VN Edition',
            desc: 'Phong Khang Love',
            icon: '🗡️',
            gradient: 'from-slate-700 via-cyan-700 to-slate-800',
            textColor: 'text-cyan-500'
        },
        {
            id: 'ttpd',
            name: 'The Tortured Poets Dept.',
            desc: 'All\'s fair in love and poetry',
            icon: '🖋️',
            gradient: 'from-stone-400 to-neutral-600',
            textColor: 'text-stone-600',
            isVip: true,
            vipKey: 'isVipTTPD',
            price: isTTPDEvent ? 'Miễn phí (Sự kiện)' : '50.000đ',
            isEventFree: isTTPDEvent
        },
        {
            id: 'evermore',
            name: 'evermore',
            desc: 'long story short, i survived',
            icon: '🍂',
            gradient: 'from-amber-700 via-orange-800 to-yellow-900',
            textColor: 'text-orange-800',
            isVip: true,
            vipKey: 'isVipEvermore',
            price: 'Hoàn thành 1 bài thi',
        },
        {
            id: 'showgirl',
            name: 'Showgirl VIP',
            desc: 'The Spotlight is Yours',
            icon: '💃',
            gradient: 'from-teal-600 to-orange-500',
            textColor: 'text-orange-500',
            isVip: true,
            vipKey: 'isVipShowgirl',
            price: '50.000đ'
        },
        {
            id: '1989',
            name: '1989 (TV)',
            desc: 'Welcome to New York',
            icon: '🕊️',
            gradient: 'from-sky-400 via-blue-300 to-sky-400',
            textColor: 'text-sky-500',
            isVip: true,
            vipKey: 'isVip1989',
            price: '50.000đ'
        },
        {
            id: 'folklore',
            name: 'folklore',
            desc: 'passed down like folk songs',
            icon: '🌲',
            gradient: 'from-zinc-400 via-slate-400 to-gray-500',
            textColor: 'text-slate-500',
            isVip: true,
            vipKey: 'isVipFolklore',
            price: '50.000đ'
        },
    ];

    const handleSelect = (themeId: ThemeType, isLocked: boolean) => {
        if (isLocked) {
            if (themeId === 'showgirl') onOpenPayment('showgirl');
            if (themeId === '1989') onOpenPayment('1989');
            if (themeId === 'folklore') onOpenPayment('folklore');
            if (themeId === 'ttpd') alert("Sự kiện nhận miễn phí đã kết thúc hoặc chưa bắt đầu."); 
            if (themeId === 'evermore') alert("Bạn cần hoàn thành ít nhất 1 bài thi (Trắc nghiệm hoặc Chạy trạm) để mở khóa giao diện này.");
        } else {
            setTheme(themeId);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-950 w-full max-w-5xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 relative animate-in zoom-in-95 duration-300">
                
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl sticky top-0 z-20">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg text-white">
                            <ShoppingBag className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Cửa hàng Theme</h2>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Tùy chỉnh không gian học tập của bạn</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-3 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                    </button>
                </div>

                {/* Content Grid */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50/50 dark:bg-black/20">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {themes.map((t) => {
                            const isActive = currentTheme === t.id;
                            // Check if locked: It is VIP AND User does NOT have the key AND it is NOT currently free by event
                            const isLocked = t.isVip && t.vipKey && !user[t.vipKey] && !t.isEventFree;
                            
                            return (
                                <div 
                                    key={t.id}
                                    onClick={() => handleSelect(t.id, !!isLocked)}
                                    className={`group relative rounded-3xl overflow-hidden border-2 transition-all duration-300 cursor-pointer hover:shadow-xl hover:-translate-y-1
                                        ${isActive 
                                            ? 'border-amber-500 ring-4 ring-amber-500/20' 
                                            : 'border-white dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600'
                                        }
                                        bg-white dark:bg-slate-900
                                    `}
                                >
                                    {/* Banner Preview */}
                                    <div className={`h-32 bg-gradient-to-br ${t.gradient} relative overflow-hidden`}>
                                        <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
                                        <div className="absolute bottom-0 left-0 w-full h-16 bg-gradient-to-t from-white dark:from-slate-900 to-transparent"></div>
                                        
                                        {/* Icon Float */}
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300">
                                            {t.icon}
                                        </div>

                                        {/* Active Badge */}
                                        {isActive && (
                                            <div className="absolute top-4 right-4 bg-white text-amber-600 px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1">
                                                <Check className="w-3 h-3" /> Đang dùng
                                            </div>
                                        )}

                                        {/* Locked Badge */}
                                        {isLocked && (
                                            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-10">
                                                <div className="bg-slate-900/80 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold border border-white/20 shadow-2xl">
                                                    <Lock className="w-4 h-4" /> {t.price?.includes('Hoàn thành') ? 'ACHIEVEMENT' : 'VIP ACCESS'}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Info Body */}
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className={`text-lg font-bold ${t.textColor} dark:text-white`}>{t.name}</h3>
                                                <p className="text-sm text-slate-500 dark:text-slate-400">{t.desc}</p>
                                            </div>
                                            {t.isVip && !isLocked && (
                                                <span className="bg-yellow-100 text-yellow-700 text-[10px] font-bold px-2 py-1 rounded uppercase">Đã sở hữu</span>
                                            )}
                                        </div>

                                        <div className="mt-4">
                                            {isLocked ? (
                                                <button className="w-full py-3 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
                                                    <Sparkles className="w-4 h-4" /> {t.price?.includes('Hoàn thành') ? t.price : `Mở khóa • ${t.price}`}
                                                </button>
                                            ) : isActive ? (
                                                <button disabled className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 font-bold cursor-default flex items-center justify-center gap-2">
                                                    <Check className="w-4 h-4" /> Đang sử dụng
                                                </button>
                                            ) : (
                                                <button className="w-full py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                                    {t.isEventFree ? `Nhận miễn phí` : `Áp dụng`}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                {/* Footer */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 text-center">
                    <p className="text-xs text-slate-400">
                        Các giao diện VIP giúp duy trì server cho AnatomyOtter. Cảm ơn bạn đã ủng hộ! ❤️
                    </p>
                </div>
            </div>
        </div>
    );
};
