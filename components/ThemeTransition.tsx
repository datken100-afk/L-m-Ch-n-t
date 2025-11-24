
import React, { useEffect, useState } from 'react';
import { ThemeType } from '../App';
import { Sparkles } from 'lucide-react';

interface ThemeTransitionProps {
    stage: 'idle' | 'entering' | 'exiting';
    targetTheme: ThemeType | null;
}

export const ThemeTransition: React.FC<ThemeTransitionProps> = ({ stage, targetTheme }) => {
    if (stage === 'idle' || !targetTheme) return null;

    const getThemeConfig = (t: ThemeType) => {
        switch (t) {
            case 'xmas': return {
                bg: 'bg-gradient-to-b from-red-700 to-green-800',
                icon: '🎅',
                title: 'Merry Christmas',
                sub: 'Jingle Bells Edition',
                accent: 'text-red-100'
            };
            case 'swift': return {
                bg: 'bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-500',
                icon: '🐍',
                title: 'The Eras Tour',
                sub: 'Are you ready for it?',
                accent: 'text-purple-100'
            };
            case 'blackpink': return {
                bg: 'bg-black',
                icon: '🖤',
                title: 'BLACKPINK',
                sub: 'In Your Area',
                accent: 'text-pink-500'
            };
            case 'aespa': return {
                bg: 'bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900',
                icon: '👽',
                title: 'aespa',
                sub: 'Synk Dive into Kwangya',
                accent: 'text-indigo-200'
            };
            case 'rosie': return {
                bg: 'bg-gradient-to-b from-rose-600 to-red-700',
                icon: '🌹',
                title: 'Rosie',
                sub: 'number one girl',
                accent: 'text-rose-100'
            };
            case 'pkl': return {
                bg: 'bg-gradient-to-br from-slate-800 to-cyan-900',
                icon: '🗡️',
                title: 'G1VN',
                sub: 'ANH LÀ THẰNG TỒIII',
                accent: 'text-cyan-200'
            };
            case 'showgirl': return {
                bg: 'bg-gradient-to-br from-slate-900 via-teal-900 to-slate-900',
                icon: '💃',
                title: 'VIP SHOWGIRL',
                sub: 'WELCOME TO THE STAGE',
                accent: 'text-gradient-gold text-glow-gold font-serif tracking-[0.2em]'
            };
            case '1989': return {
                bg: 'bg-gradient-to-b from-sky-400 via-blue-300 to-orange-50',
                icon: '🕊️',
                title: '1989 (TV)',
                sub: 'WELCOME TO NEW YORK',
                accent: 'text-white font-bold tracking-widest drop-shadow-md'
            };
            case 'folklore': return {
                bg: 'bg-gradient-to-b from-zinc-400 to-slate-600',
                icon: '🌲',
                title: 'folklore',
                sub: 'passed down like folk songs',
                accent: 'text-zinc-100 font-serif italic tracking-wider'
            };
            case 'ttpd': return {
                bg: 'bg-gradient-to-b from-stone-300 to-stone-500',
                icon: '🖋️',
                title: 'THE TORTURED POETS DEPARTMENT',
                sub: 'All\'s fair in love and poetry',
                accent: 'text-stone-800 font-serif tracking-widest'
            };
            case 'evermore': return {
                bg: 'bg-gradient-to-b from-orange-900 via-amber-900 to-stone-900',
                icon: '🍂',
                title: 'evermore',
                sub: 'long story short, i survived',
                accent: 'text-orange-200 font-serif italic tracking-widest'
            };
            default: return {
                bg: 'bg-gradient-to-br from-amber-500 to-orange-600',
                icon: '🦦',
                title: 'Anatomy Otter',
                sub: 'Classic Mode',
                accent: 'text-white'
            };
        }
    };

    const config = getThemeConfig(targetTheme);

    return (
        <div 
            className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-transform duration-[800ms] ease-[cubic-bezier(0.76,0,0.24,1)] 
            ${stage === 'entering' ? 'translate-y-0' : ''}
            ${stage === 'exiting' ? '-translate-y-full' : ''}
            ${config.bg}
            `}
            style={{ transform: stage === 'entering' ? 'translateY(0)' : stage === 'exiting' ? 'translateY(-100%)' : 'translateY(100%)' }}
        >
            {/* Content Container */}
            <div className={`flex flex-col items-center justify-center transform transition-all duration-700 delay-200 ${stage === 'entering' ? 'scale-100 opacity-100' : 'scale-90 opacity-0'}`}>
                
                {/* Icon Circle */}
                <div className="relative mb-8">
                    <div className={`w-32 h-32 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center shadow-2xl relative z-10 ${targetTheme === 'showgirl' ? 'border-4 border-yellow-500 shadow-glow-gold' : targetTheme === '1989' ? 'border-4 border-sky-200 shadow-[0_0_30px_rgba(56,189,248,0.6)]' : targetTheme === 'folklore' ? 'border-4 border-zinc-300 shadow-[0_0_30px_rgba(212,212,216,0.4)]' : targetTheme === 'ttpd' ? 'border-4 border-stone-600 shadow-2xl bg-stone-200' : targetTheme === 'evermore' ? 'border-4 border-orange-800 shadow-[0_0_30px_rgba(194,65,12,0.4)]' : 'border-4 border-white/20'}`}>
                        <span className="text-7xl animate-[bounce_2s_infinite]">{config.icon}</span>
                    </div>
                    {/* Decor */}
                    <div className="absolute -top-4 -right-4 animate-spin-slow text-white/30"><Sparkles size={40} /></div>
                    <div className="absolute bottom-0 -left-4 animate-pulse text-white/30"><Sparkles size={30} /></div>
                </div>

                {/* Text */}
                <h1 className={`text-5xl md:text-7xl font-black text-white tracking-tighter mb-2 text-center drop-shadow-lg ${targetTheme === 'blackpink' ? 'text-pink-500' : targetTheme === 'showgirl' ? 'text-gradient-gold text-glow-gold' : targetTheme === 'folklore' ? 'font-serif italic' : targetTheme === 'ttpd' ? 'text-stone-800 font-serif' : targetTheme === 'evermore' ? 'font-serif italic text-orange-100' : ''}`}>
                    {config.title}
                </h1>
                <p className={`text-xl md:text-2xl font-medium tracking-widest uppercase opacity-90 ${config.accent}`}>
                    {config.sub}
                </p>

                {/* Loading indicator for vibe */}
                <div className="mt-12 flex gap-2">
                    <div className={`w-3 h-3 bg-white rounded-full animate-[bounce_1s_infinite_0ms] ${targetTheme === 'showgirl' ? 'bg-yellow-400' : targetTheme === '1989' ? 'bg-sky-500' : targetTheme === 'folklore' ? 'bg-zinc-300' : targetTheme === 'ttpd' ? 'bg-stone-700' : targetTheme === 'evermore' ? 'bg-orange-500' : ''}`}></div>
                    <div className={`w-3 h-3 bg-white rounded-full animate-[bounce_1s_infinite_200ms] ${targetTheme === 'showgirl' ? 'bg-yellow-400' : targetTheme === '1989' ? 'bg-sky-500' : targetTheme === 'folklore' ? 'bg-zinc-300' : targetTheme === 'ttpd' ? 'bg-stone-700' : targetTheme === 'evermore' ? 'bg-orange-500' : ''}`}></div>
                    <div className={`w-3 h-3 bg-white rounded-full animate-[bounce_1s_infinite_400ms] ${targetTheme === 'showgirl' ? 'bg-yellow-400' : targetTheme === '1989' ? 'bg-sky-500' : targetTheme === 'folklore' ? 'bg-zinc-300' : targetTheme === 'ttpd' ? 'bg-stone-700' : targetTheme === 'evermore' ? 'bg-orange-500' : ''}`}></div>
                </div>
            </div>
        </div>
    );
};
