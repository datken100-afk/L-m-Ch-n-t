
import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw, Settings, Save, X } from 'lucide-react';
import { ThemeType } from '../App';

interface PomodoroTimerProps {
    theme: ThemeType;
}

type TimerMode = 'FOCUS' | 'LONG_FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';

interface Durations {
    FOCUS: number;
    LONG_FOCUS: number;
    SHORT_BREAK: number;
    LONG_BREAK: number;
}

export const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ theme }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Custom Durations State
    const [customDurations, setCustomDurations] = useState<Durations>({
        FOCUS: 25,
        LONG_FOCUS: 50,
        SHORT_BREAK: 5,
        LONG_BREAK: 15
    });

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [tempDurations, setTempDurations] = useState<Durations>(customDurations);

    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [mode, setMode] = useState<TimerMode>('FOCUS');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Use a ref to store the interval ID to properly clear it
    const intervalRef = useRef<any>(null);
    
    // Audio Context Ref for generating sounds without external files
    const audioContextRef = useRef<AudioContext | null>(null);

    // Initialize Audio Context
    const initAudio = () => {
        try {
            if (!audioContextRef.current) {
                // Use standard AudioContext
                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                if (AudioContextClass) {
                    audioContextRef.current = new AudioContextClass();
                }
            }
            // Always try to resume if suspended (browser policy requirement)
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume().catch(err => console.warn("Audio resume prevented:", err));
            }
        } catch (e) {
            console.error("Audio init failed", e);
        }
    };

    // Generate Alarm Sound based on Theme
    const playAlarm = () => {
        // Ensure context is created/resumed
        initAudio();
        
        const ctx = audioContextRef.current;
        if (!ctx) return;

        const now = ctx.currentTime;
        
        // Helper to play a synthetic tone
        const playTone = (freq: number, type: OscillatorType, startTime: number, duration: number, vol = 0.2) => {
            try {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(freq, startTime);
                
                // Envelope
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + duration);
            } catch (e) {
                console.error("Tone playback failed", e);
            }
        };

        if (theme === 'xmas' || theme === 'swift' || theme === 'aespa' || theme === 'rosie') {
            // Magical Chime (Sparkle Arpeggio)
            playTone(880, 'sine', now, 1.0); // A5
            playTone(1108, 'sine', now + 0.1, 1.0); // C#6
            playTone(1318, 'sine', now + 0.2, 1.0); // E6
            playTone(1760, 'sine', now + 0.3, 1.5); // A6
        } else if (theme === 'showgirl') {
            // Fanfare (Major Chord Stabs)
            const type: OscillatorType = 'triangle';
            playTone(523.25, type, now, 0.4, 0.3); // C5
            playTone(659.25, type, now + 0.05, 0.4, 0.3); // E5
            playTone(783.99, type, now + 0.1, 0.4, 0.3); // G5
            playTone(1046.50, 'square', now + 0.4, 1.2, 0.2); // C6 (High punch)
        } else {
            // Digital Beep (Classic)
            const type: OscillatorType = 'square';
            playTone(1000, type, now, 0.1, 0.1);
            playTone(1000, type, now + 0.2, 0.1, 0.1);
            playTone(1000, type, now + 0.4, 0.3, 0.1);
        }
    };

    useEffect(() => {
        if (isActive && timeLeft > 0) {
            intervalRef.current = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsActive(false);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            // Play sound when timer hits 0
            playAlarm();
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isActive, timeLeft, theme]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setIsEditing(false); // Reset edit mode on close
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
    };

    const handleModeChange = (newMode: TimerMode) => {
        setMode(newMode);
        setIsActive(false);
        setTimeLeft(customDurations[newMode] * 60);
    };

    const toggleTimer = () => {
        if (!isActive) {
            // CRITICAL: Initialize audio context on user gesture to enable playback later
            // This satisfies the "User interaction needed first" browser policy
            initAudio();
        }
        setIsActive(!isActive);
    };
    
    const resetTimer = () => {
        setIsActive(false);
        setTimeLeft(customDurations[mode] * 60);
    };

    // --- EDIT HANDLERS ---
    const startEditing = () => {
        setTempDurations(customDurations);
        setIsEditing(true);
    };

    const cancelEditing = () => {
        setIsEditing(false);
    };

    const saveSettings = () => {
        setCustomDurations(tempDurations);
        setIsEditing(false);
        
        // If not active, update current timer immediately
        if (!isActive) {
            setTimeLeft(tempDurations[mode] * 60);
        }
    };

    const handleDurationChange = (key: keyof Durations, value: string) => {
        const num = parseInt(value);
        if (!isNaN(num) && num > 0 && num <= 180) {
            setTempDurations(prev => ({ ...prev, [key]: num }));
        }
    };

    const getThemeStyles = () => {
        switch (theme) {
            case 'xmas': return {
                iconColor: 'text-red-600 dark:text-red-400',
                triggerBg: 'text-red-500 dark:text-red-400 bg-slate-100 dark:bg-slate-800 hover:text-red-600 dark:hover:text-red-300',
                glow: 'rgba(220, 38, 38, 0.5)',
                panelBg: 'bg-white dark:bg-slate-900',
                border: 'border-red-200 dark:border-red-800',
                activeText: 'text-red-600',
                btnPrimary: 'bg-gradient-to-r from-red-600 to-green-600 text-white shadow-red-500/30',
                progressRing: 'text-red-500',
                inputBorder: 'focus:border-red-500'
            };
            case 'swift': return {
                iconColor: 'text-purple-600 dark:text-purple-400',
                triggerBg: 'text-purple-500 dark:text-purple-400 bg-slate-100 dark:bg-slate-800 hover:text-purple-600 dark:hover:text-purple-300',
                glow: 'rgba(168, 85, 247, 0.5)',
                panelBg: 'bg-white/95 dark:bg-[#1a1a2e]/95 backdrop-blur-xl',
                border: 'border-purple-200 dark:border-purple-800',
                activeText: 'text-purple-600 dark:text-purple-300',
                btnPrimary: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-purple-500/30',
                progressRing: 'text-purple-500',
                inputBorder: 'focus:border-purple-500'
            };
            case 'blackpink': return {
                iconColor: 'text-pink-500',
                triggerBg: 'text-pink-500 dark:text-pink-400 bg-slate-100 dark:bg-slate-800 hover:text-pink-600',
                glow: 'rgba(236, 72, 153, 0.5)',
                panelBg: 'bg-slate-900 border border-pink-500/30',
                border: 'border-pink-500/30',
                activeText: 'text-pink-500',
                btnPrimary: 'bg-gradient-to-r from-pink-600 to-black text-white shadow-pink-500/30',
                progressRing: 'text-pink-500',
                inputBorder: 'focus:border-pink-500'
            };
            case 'showgirl': return {
                iconColor: 'text-yellow-500',
                triggerBg: 'bg-slate-800 text-yellow-500 border-yellow-900/50',
                glow: 'rgba(234, 179, 8, 0.6)',
                panelBg: 'bg-slate-900/95 backdrop-blur-xl border border-yellow-500/30',
                border: 'border-yellow-500/30',
                activeText: 'text-gradient-gold text-glow-gold',
                btnPrimary: 'bg-gradient-to-r from-teal-500 to-orange-500 text-white shadow-orange-500/30',
                progressRing: 'text-yellow-500',
                inputBorder: 'focus:border-yellow-500'
            };
            case 'aespa': return {
                iconColor: 'text-indigo-500',
                triggerBg: 'text-indigo-500 dark:text-indigo-400 bg-slate-100 dark:bg-slate-800 hover:text-indigo-600',
                glow: 'rgba(99, 102, 241, 0.5)',
                panelBg: 'bg-slate-900',
                border: 'border-indigo-500/30',
                activeText: 'text-indigo-400',
                btnPrimary: 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-indigo-500/30',
                progressRing: 'text-indigo-500',
                inputBorder: 'focus:border-indigo-500'
            };
            case 'pkl': return {
                iconColor: 'text-cyan-500',
                triggerBg: 'text-cyan-500 dark:text-cyan-400 bg-slate-100 dark:bg-slate-800 hover:text-cyan-600',
                glow: 'rgba(6, 182, 212, 0.5)',
                panelBg: 'bg-slate-800',
                border: 'border-cyan-500/30',
                activeText: 'text-cyan-400',
                btnPrimary: 'bg-gradient-to-r from-slate-600 to-cyan-600 text-white shadow-cyan-500/30',
                progressRing: 'text-cyan-500',
                inputBorder: 'focus:border-cyan-500'
            };
            case 'rosie': return {
                iconColor: 'text-rose-500',
                triggerBg: 'text-rose-500 dark:text-rose-400 bg-slate-100 dark:bg-slate-800 hover:text-rose-600',
                glow: 'rgba(225, 29, 72, 0.5)',
                panelBg: 'bg-white dark:bg-slate-900',
                border: 'border-rose-200 dark:border-rose-800',
                activeText: 'text-rose-600 dark:text-rose-400',
                btnPrimary: 'bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-rose-500/30',
                progressRing: 'text-rose-500',
                inputBorder: 'focus:border-rose-500'
            };
            default: return {
                iconColor: 'text-slate-500 dark:text-slate-400',
                triggerBg: 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:text-amber-600 dark:hover:text-amber-400',
                glow: 'rgba(245, 158, 11, 0.5)',
                panelBg: 'bg-white dark:bg-slate-900',
                border: 'border-slate-100 dark:border-slate-800',
                activeText: 'text-amber-600 dark:text-amber-400',
                btnPrimary: 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30',
                progressRing: 'text-amber-500',
                inputBorder: 'focus:border-amber-500'
            };
        }
    };

    const styles = getThemeStyles();
    
    // Calculate progress for visual ring
    const totalTime = customDurations[mode] * 60;
    const percent = ((totalTime - timeLeft) / totalTime) * 100;

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`liquid-icon relative rounded-xl w-10 h-10 flex items-center justify-center overflow-hidden focus:outline-none transition-colors ${styles.triggerBg}`}
                style={{ '--glow-color': styles.glow } as React.CSSProperties}
                title="Pomodoro Timer"
            >
                {isActive ? (
                    <span className="text-[10px] font-bold font-mono">{Math.floor(timeLeft / 60)}</span>
                ) : (
                    <Timer className="w-5 h-5" />
                )}
            </button>

            {isOpen && (
                <div className={`absolute top-full right-0 mt-3 w-72 rounded-2xl shadow-2xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50 ${styles.panelBg} ${styles.border}`}>
                    
                    {isEditing ? (
                        <div className="p-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className={`text-sm font-bold ${styles.activeText}`}>Cài đặt thời gian (phút)</h3>
                                <button onClick={cancelEditing} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            
                            <div className="space-y-3 mb-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Focus</label>
                                        <input 
                                            type="number" 
                                            value={tempDurations.FOCUS}
                                            onChange={(e) => handleDurationChange('FOCUS', e.target.value)}
                                            className={`w-full p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-950 ${styles.inputBorder}`}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Long Focus</label>
                                        <input 
                                            type="number" 
                                            value={tempDurations.LONG_FOCUS}
                                            onChange={(e) => handleDurationChange('LONG_FOCUS', e.target.value)}
                                            className={`w-full p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-950 ${styles.inputBorder}`}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Short Break</label>
                                        <input 
                                            type="number" 
                                            value={tempDurations.SHORT_BREAK}
                                            onChange={(e) => handleDurationChange('SHORT_BREAK', e.target.value)}
                                            className={`w-full p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-950 ${styles.inputBorder}`}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Long Break</label>
                                        <input 
                                            type="number" 
                                            value={tempDurations.LONG_BREAK}
                                            onChange={(e) => handleDurationChange('LONG_BREAK', e.target.value)}
                                            className={`w-full p-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:bg-white dark:focus:bg-slate-950 ${styles.inputBorder}`}
                                        />
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={saveSettings}
                                className={`w-full py-2 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 ${styles.btnPrimary}`}
                            >
                                <Save className="w-4 h-4" /> Lưu thay đổi
                            </button>
                        </div>
                    ) : (
                        <div className="p-4 flex flex-col items-center relative">
                            <button 
                                onClick={startEditing}
                                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                                title="Cài đặt thời gian"
                            >
                                <Settings className="w-4 h-4" />
                            </button>

                            <div className="grid grid-cols-4 gap-1 mb-4 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full">
                                <button 
                                    onClick={() => handleModeChange('FOCUS')}
                                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'FOCUS' ? `${styles.panelBg} shadow-sm ${styles.activeText}` : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    {customDurations.FOCUS}m
                                </button>
                                <button 
                                    onClick={() => handleModeChange('LONG_FOCUS')}
                                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'LONG_FOCUS' ? `${styles.panelBg} shadow-sm ${styles.activeText}` : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    {customDurations.LONG_FOCUS}m
                                </button>
                                <button 
                                    onClick={() => handleModeChange('SHORT_BREAK')}
                                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'SHORT_BREAK' ? `${styles.panelBg} shadow-sm ${styles.activeText}` : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    {customDurations.SHORT_BREAK}m
                                </button>
                                <button 
                                    onClick={() => handleModeChange('LONG_BREAK')}
                                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${mode === 'LONG_BREAK' ? `${styles.panelBg} shadow-sm ${styles.activeText}` : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
                                >
                                    {customDurations.LONG_BREAK}m
                                </button>
                            </div>

                            <div className="relative w-40 h-40 flex items-center justify-center mb-6">
                                {/* Simple SVG Ring */}
                                <svg className="w-full h-full transform -rotate-90">
                                    <circle cx="80" cy="80" r="70" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                                    <circle 
                                        cx="80" cy="80" r="70" 
                                        stroke="currentColor" strokeWidth="8" fill="transparent" 
                                        strokeDasharray={440}
                                        strokeDashoffset={440 - (440 * percent) / 100}
                                        strokeLinecap="round"
                                        className={`transition-all duration-1000 ease-linear ${styles.progressRing}`} 
                                    />
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                    <span className={`text-4xl font-black font-mono ${styles.activeText}`}>
                                        {formatTime(timeLeft)}
                                    </span>
                                    <span className="text-xs text-slate-400 font-medium mt-1">
                                        {isActive ? 'RUNNING' : 'PAUSED'}
                                    </span>
                                </div>
                            </div>

                            <div className="flex gap-3 w-full">
                                <button 
                                    onClick={toggleTimer}
                                    className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-transform active:scale-95 ${styles.btnPrimary}`}
                                >
                                    {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                                    {isActive ? 'Pause' : 'Start'}
                                </button>
                                <button 
                                    onClick={resetTimer}
                                    className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                                >
                                    <RotateCcw className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
