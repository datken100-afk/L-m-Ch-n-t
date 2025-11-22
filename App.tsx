
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LoginScreen } from './components/LoginScreen';
import { MCQMode } from './components/MCQMode';
import { StationMode } from './components/StationMode';
import { FlashcardMode } from './components/FlashcardMode';
import { HistoryMode } from './components/HistoryMode';
import { InstallPWA } from './components/InstallPWA';
import { AppMode, UserProfile } from './types';
import { BookOpen, Activity, ChevronRight, StickyNote, Crown, Ticket, Star, Sparkles, Music, History } from 'lucide-react';

export type ThemeType = 'default' | 'xmas' | 'swift' | 'blackpink' | 'aespa' | 'rosie' | 'pkl' | 'showgirl';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [darkMode, setDarkMode] = useState(false);
  
  // Logic: Default theme is 'xmas' until the end of Dec 26, 2025
  const [theme, setTheme] = useState<ThemeType>(() => {
    const today = new Date();
    const xmasLimit = new Date('2025-12-26T23:59:59'); // End of day 26/12/2025
    if (today <= xmasLimit) {
      return 'xmas';
    }
    return 'default';
  });
  
  const [isLoginExiting, setIsLoginExiting] = useState(false);
  const [showSwiftGift, setShowSwiftGift] = useState(false);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogin = (loggedInUser: UserProfile) => {
    setIsLoginExiting(true);
    setTimeout(() => {
        setUser(loggedInUser);
        setIsLoginExiting(false);
        
        // CHECK FOR SWIFT GIFT (One-time per browser/device)
        const hasReceivedGift = localStorage.getItem('hasReceivedSwiftVIP');
        if (!hasReceivedGift) {
            setTheme('swift');
            setShowSwiftGift(true);
            localStorage.setItem('hasReceivedSwiftVIP', 'true');
        }
    }, 800);
  };

  const handleLogout = () => {
    setUser(null);
    setMode(AppMode.HOME);
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
    setUser(updatedUser);
  };

  const currentYear = new Date().getFullYear();

  const getCardColors = (type: 'mcq' | 'station' | 'flashcard' | 'history') => {
    if (theme === 'xmas') {
        if (type === 'flashcard') return { bg: 'bg-orange-50 dark:bg-orange-900/20', iconBg: 'bg-orange-100 dark:bg-orange-900/50', iconText: 'text-orange-600 dark:text-orange-400', glow: 'rgba(249, 115, 22, 0.8)' };
        if (type === 'history') return { bg: 'bg-purple-50 dark:bg-purple-900/20', iconBg: 'bg-purple-100 dark:bg-purple-900/50', iconText: 'text-purple-600 dark:text-purple-400', glow: 'rgba(147, 51, 234, 0.8)' };
        return type === 'mcq' 
            ? { bg: 'bg-red-50 dark:bg-red-900/20', iconBg: 'bg-red-100 dark:bg-red-900/50', iconText: 'text-red-600 dark:text-red-400', glow: 'rgba(220, 38, 38, 0.8)' }
            : { bg: 'bg-emerald-50 dark:bg-emerald-900/20', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', iconText: 'text-emerald-600 dark:text-emerald-400', glow: 'rgba(16, 185, 129, 0.8)' };
    } else if (theme === 'swift') {
        // VIP ERAS STYLE: Holographic Gradients & Deep Midnight
        if (type === 'flashcard') return { 
            bg: 'bg-indigo-50/80 dark:bg-[#1e1e3f]/80 border-indigo-200 dark:border-indigo-500/30', 
            iconBg: 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500', 
            iconText: 'text-white', 
            glow: 'rgba(99, 102, 241, 0.8)' 
        };
        if (type === 'history') return {
            bg: 'bg-cyan-50/80 dark:bg-[#1e293b]/80 border-cyan-200 dark:border-cyan-500/30',
            iconBg: 'bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500',
            iconText: 'text-white',
            glow: 'rgba(6, 182, 212, 0.8)'
        };
        return type === 'mcq'
            ? { 
                bg: 'bg-fuchsia-50/80 dark:bg-[#2d1b36]/80 border-fuchsia-200 dark:border-fuchsia-500/30', 
                iconBg: 'bg-gradient-to-br from-pink-500 via-fuchsia-500 to-purple-600', 
                iconText: 'text-white', 
                glow: 'rgba(232, 121, 249, 0.8)' 
              }
            : { 
                bg: 'bg-violet-50/80 dark:bg-[#241b36]/80 border-violet-200 dark:border-violet-500/30', 
                iconBg: 'bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600', 
                iconText: 'text-white', 
                glow: 'rgba(139, 92, 246, 0.8)' 
              };
    } else if (theme === 'blackpink') {
        if (type === 'flashcard') return { bg: 'bg-slate-800', iconBg: 'bg-gradient-to-br from-gray-500 to-slate-600', iconText: 'text-white', glow: 'rgba(255, 255, 255, 0.5)' };
        if (type === 'history') return { bg: 'bg-slate-800', iconBg: 'bg-gradient-to-br from-pink-400 to-rose-500', iconText: 'text-white', glow: 'rgba(251, 113, 133, 0.5)' };
        return type === 'mcq'
            ? { bg: 'bg-slate-900', iconBg: 'bg-pink-500', iconText: 'text-white', glow: 'rgba(236, 72, 153, 0.8)' }
            : { bg: 'bg-pink-50 dark:bg-pink-900/20', iconBg: 'bg-slate-900', iconText: 'text-pink-500', glow: 'rgba(15, 23, 42, 0.8)' };
    } else if (theme === 'aespa') {
        if (type === 'flashcard') return { bg: 'bg-slate-900', iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500', iconText: 'text-white', glow: 'rgba(192, 132, 252, 0.8)' };
        if (type === 'history') return { bg: 'bg-slate-900', iconBg: 'bg-gradient-to-br from-blue-500 to-indigo-500', iconText: 'text-white', glow: 'rgba(99, 102, 241, 0.8)' };
        return type === 'mcq'
            ? { bg: 'bg-slate-900', iconBg: 'bg-gradient-to-br from-slate-200 to-slate-400', iconText: 'text-slate-900', glow: 'rgba(148, 163, 184, 0.8)' }
            : { bg: 'bg-indigo-950', iconBg: 'bg-gradient-to-br from-indigo-400 to-purple-400', iconText: 'text-white', glow: 'rgba(129, 140, 248, 0.8)' };
    } else if (theme === 'rosie') {
        if (type === 'flashcard') return { bg: 'bg-rose-5 dark:bg-rose-950/30', iconBg: 'bg-rose-200 dark:bg-rose-900/40', iconText: 'text-rose-800 dark:text-rose-300', glow: 'rgba(251, 113, 133, 0.8)' };
        if (type === 'history') return { bg: 'bg-red-50 dark:bg-red-900/20', iconBg: 'bg-red-200 dark:bg-red-900/40', iconText: 'text-red-800 dark:text-red-300', glow: 'rgba(248, 113, 113, 0.8)' };
        return type === 'mcq'
            ? { bg: 'bg-rose-50 dark:bg-rose-900/20', iconBg: 'bg-rose-100 dark:bg-rose-900/50', iconText: 'text-rose-600 dark:text-rose-400', glow: 'rgba(225, 29, 72, 0.8)' }
            : { bg: 'bg-red-50 dark:bg-red-900/10', iconBg: 'bg-red-100 dark:bg-red-900/50', iconText: 'text-red-700 dark:text-red-400', glow: 'rgba(185, 28, 28, 0.8)' };
    } else if (theme === 'pkl') {
        if (type === 'flashcard') return { bg: 'bg-slate-200 dark:bg-slate-800', iconBg: 'bg-gradient-to-br from-slate-400 to-slate-600', iconText: 'text-white', glow: 'rgba(148, 163, 184, 0.8)' };
        if (type === 'history') return { bg: 'bg-cyan-50 dark:bg-cyan-900/20', iconBg: 'bg-gradient-to-br from-cyan-400 to-blue-600', iconText: 'text-white', glow: 'rgba(34, 211, 238, 0.8)' };
        return type === 'mcq'
            ? { bg: 'bg-slate-100 dark:bg-slate-900', iconBg: 'bg-gradient-to-br from-slate-500 to-cyan-600', iconText: 'text-white', glow: 'rgba(6, 182, 212, 0.8)' }
            : { bg: 'bg-slate-50 dark:bg-slate-900/30', iconBg: 'bg-gradient-to-br from-cyan-900 to-slate-800', iconText: 'text-cyan-400', glow: 'rgba(6, 182, 212, 0.8)' };
    } else if (theme === 'showgirl') {
        // VIP Gold Style
        const goldBase = { bg: 'bg-slate-900/90 border border-yellow-500/40 backdrop-blur-sm', iconBg: 'bg-gradient-to-br from-yellow-400 to-amber-600', iconText: 'text-white', glow: 'rgba(234, 179, 8, 0.6)' };
        if (type === 'flashcard') return goldBase;
        if (type === 'history') return { bg: 'bg-slate-900/90 border border-teal-500/40 backdrop-blur-sm', iconBg: 'bg-gradient-to-br from-teal-400 to-emerald-600', iconText: 'text-white', glow: 'rgba(20, 184, 166, 0.6)' };
        return type === 'mcq' ? goldBase : goldBase;
    } else {
        if (type === 'flashcard') return { bg: 'bg-purple-50 dark:bg-purple-900/20', iconBg: 'bg-purple-100 dark:bg-purple-900/50', iconText: 'text-purple-600 dark:text-purple-400', glow: 'rgba(168, 85, 247, 0.8)' };
        if (type === 'history') return { bg: 'bg-emerald-50 dark:bg-emerald-900/20', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', iconText: 'text-emerald-600 dark:text-emerald-400', glow: 'rgba(16, 185, 129, 0.8)' };
        return type === 'mcq'
            ? { bg: 'bg-amber-50 dark:bg-amber-900/20', iconBg: 'bg-amber-100 dark:bg-amber-900/50', iconText: 'text-amber-600 dark:text-amber-400', glow: 'rgba(245, 158, 11, 0.8)' }
            : { bg: 'bg-sky-50 dark:bg-sky-900/20', iconBg: 'bg-sky-100 dark:bg-sky-900/50', iconText: 'text-sky-600 dark:text-sky-400', glow: 'rgba(14, 165, 233, 0.8)' };
    }
  };

  const mcqColors = getCardColors('mcq');
  const stationColors = getCardColors('station');
  const flashcardColors = getCardColors('flashcard');
  const historyColors = getCardColors('history');

  const renderContent = () => {
    switch (mode) {
      case AppMode.MCQ:
        return (
          <MCQMode onBack={() => setMode(AppMode.HOME)} theme={theme} user={user!} />
        );
      case AppMode.STATION:
        return (
          <StationMode onBack={() => setMode(AppMode.HOME)} theme={theme} />
        );
      case AppMode.FLASHCARD:
        return (
          <FlashcardMode onBack={() => setMode(AppMode.HOME)} theme={theme} user={user!} />
        );
      case AppMode.HISTORY:
        return (
          <HistoryMode onBack={() => setMode(AppMode.HOME)} theme={theme} user={user!} />
        );
      default:
        return (
          <div className="max-w-5xl mx-auto pt-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-16 space-y-4 relative">
              {/* SWIFT THEME HEADER DECORATION */}
              {theme === 'swift' && (
                  <>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-32 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 blur-3xl -z-10 rounded-full animate-pulse"></div>
                    <div className="absolute -top-10 left-1/4 text-4xl animate-bounce">✨</div>
                    <div className="absolute top-0 right-1/4 text-3xl animate-pulse">🧣</div>
                  </>
              )}

              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {theme === 'showgirl' ? "LIGHTS, CAMERA," : theme === 'swift' ? "IT'S BEEN A LONG TIME COMING," : "Xin chào,"} <span className={
                    theme === 'xmas' ? "text-red-600 dark:text-red-500" : 
                    theme === 'swift' ? "text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]" :
                    theme === 'blackpink' ? "text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]" :
                    theme === 'aespa' ? "text-transparent bg-clip-text bg-gradient-to-r from-slate-400 via-indigo-400 to-purple-400 drop-shadow-[0_0_10px_rgba(167,139,250,0.5)]" :
                    theme === 'rosie' ? "text-rose-600 dark:text-rose-400 drop-shadow-[0_0_15px_rgba(225,29,72,0.4)]" :
                    theme === 'pkl' ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-slate-400 to-cyan-600 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]" :
                    theme === 'showgirl' ? "text-gradient-gold text-glow-gold" :
                    "text-amber-500 dark:text-amber-400"
                }>{theme === 'showgirl' ? " SMILE!" : user?.fullName}</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                {theme === 'xmas' 
                  ? "Chọn chế độ để bắt đầu ôn luyện kiến thức Giải phẫu học (Mùa Giáng Sinh 🎄)." 
                  : theme === 'swift'
                  ? "Chào mừng đến với The Eras Tour (VIP Package). Cầm chắc micro và ôn tập nào! 🎤✨"
                  : theme === 'blackpink'
                  ? "Blackpink in your area! Cùng ôn tập thật slay nhé! 🖤💗"
                  : theme === 'aespa'
                  ? "I'm the aespa! Bước vào Kwangya giải phẫu học đầy Drama! 👽🦾"
                  : theme === 'rosie'
                  ? "APT. APT.! Ôn tập giải phẫu cùng Rosie nhé! 🌹🍷"
                  : theme === 'pkl'
                  ? "Giữa một vạn người, chỉ có kiến thức ở lại... 🗡️🦢"
                  : theme === 'showgirl'
                  ? "The Life of a Showgirl! Màn trình diễn kiến thức bắt đầu. Hãy bước ra ánh đèn sân khấu! 💃💎"
                  : "Hệ thống ôn tập Giải phẫu học thông minh với sự hỗ trợ của AI."}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <button
                onClick={() => setMode(AppMode.MCQ)}
                className={`group p-6 rounded-3xl shadow-md hover:shadow-2xl transition-all duration-300 text-left relative overflow-hidden hover:-translate-y-2 hover:scale-[1.02] 
                ${theme === 'showgirl' ? 'border border-yellow-500/30 bg-slate-900/60 hover:shadow-glow-gold hover:border-yellow-500/60' 
                : theme === 'swift' ? 'bg-white/90 dark:bg-[#2d1b36]/90 border border-fuchsia-300 dark:border-fuchsia-600 hover:shadow-[0_0_30px_rgba(232,121,249,0.5)] backdrop-blur-md'
                : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700'}`}
              >
                {/* Showgirl Effects */}
                {theme === 'showgirl' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-50 transition-opacity duration-500 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-pulse"></div>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                            <Sparkles className="absolute top-4 right-1/4 w-4 h-4 text-yellow-200 animate-ping" style={{animationDuration: '2s'}} />
                            <Sparkles className="absolute bottom-1/4 left-10 w-3 h-3 text-white animate-pulse" />
                            <div className="absolute top-1/2 right-4 w-1 h-1 bg-white rounded-full animate-ping"></div>
                        </div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/20 rounded-full blur-3xl group-hover:bg-yellow-400/30 transition-all"></div>
                    </>
                )}
                
                {/* SWIFT EFFECTS */}
                {theme === 'swift' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/10 via-purple-500/5 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-fuchsia-500/30 rounded-full blur-3xl group-hover:bg-fuchsia-400/50 transition-all"></div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>
                    </>
                )}

                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500 ${mcqColors.bg} ${theme === 'showgirl' ? 'opacity-20' : ''}`}></div>
                <div className="relative z-10">
                  <div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 liquid-icon ${mcqColors.iconBg} ${mcqColors.iconText}`}
                    style={{ '--glow-color': mcqColors.glow } as React.CSSProperties}
                  >
                    {theme === 'showgirl' ? <Ticket className="w-7 h-7 text-white" /> : <BookOpen className="w-7 h-7" />}
                  </div>
                  <h3 className={`text-xl font-bold mb-2 transition-colors ${theme === 'showgirl' ? 'text-white group-hover:text-yellow-400' : theme === 'swift' ? 'text-slate-900 dark:text-white group-hover:text-fuchsia-400' : `text-slate-900 dark:text-white group-hover:${mcqColors.iconText.split(' ')[0]}`}`}>
                      {theme === 'showgirl' ? "Rehearsal (Lý thuyết)" : theme === 'swift' ? "The Setlist (MCQ)" : "Trắc Nghiệm"}
                  </h3>
                  <p className={`text-sm mb-4 leading-relaxed ${theme === 'showgirl' ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                    {theme === 'showgirl' ? "Ôn luyện kịch bản kiến thức. Giải thích chi tiết cho từng bước nhảy." : theme === 'swift' ? "Chọn kỷ nguyên kiến thức và trả lời các câu hỏi hit." : "Tạo đề thi trắc nghiệm nhanh chóng theo chủ đề. AI chấm điểm và giải thích."}
                  </p>
                  <div className={`flex items-center text-sm font-semibold group-hover:translate-x-2 transition-transform ${theme === 'showgirl' ? 'text-yellow-500' : theme === 'swift' ? 'text-fuchsia-600 dark:text-fuchsia-300' : mcqColors.iconText}`}>
                    {theme === 'showgirl' ? "Step into spotlight" : "Bắt đầu ngay"} <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode(AppMode.STATION)}
                className={`group p-6 rounded-3xl shadow-md hover:shadow-2xl transition-all duration-300 text-left relative overflow-hidden hover:-translate-y-2 hover:scale-[1.02] 
                ${theme === 'showgirl' ? 'border border-yellow-500/30 bg-slate-900/60 hover:shadow-glow-gold hover:border-yellow-500/60' 
                : theme === 'swift' ? 'bg-white/90 dark:bg-[#241b36]/90 border border-violet-300 dark:border-violet-600 hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] backdrop-blur-md'
                : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700'}`}
              >
                 {theme === 'showgirl' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-50 transition-opacity duration-500 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-pulse"></div>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                            <Sparkles className="absolute top-10 left-10 w-5 h-5 text-orange-200 animate-ping" style={{animationDuration: '1.5s'}} />
                            <Sparkles className="absolute bottom-1/4 right-4 w-3 h-3 text-white animate-pulse" />
                        </div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/20 rounded-full blur-3xl group-hover:bg-orange-400/30 transition-all"></div>
                    </>
                )}

                {/* SWIFT EFFECTS */}
                {theme === 'swift' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-violet-500/30 rounded-full blur-3xl group-hover:bg-violet-400/50 transition-all"></div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                    </>
                )}

                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500 ${stationColors.bg} ${theme === 'showgirl' ? 'opacity-20' : ''}`}></div>
                <div className="relative z-10">
                  <div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 liquid-icon ${stationColors.iconBg} ${stationColors.iconText}`}
                    style={{ '--glow-color': stationColors.glow } as React.CSSProperties}
                  >
                    {theme === 'showgirl' ? <Star className="w-7 h-7 text-white" /> : <Activity className="w-7 h-7" />}
                  </div>
                  <h3 className={`text-xl font-bold mb-2 transition-colors ${theme === 'showgirl' ? 'text-white group-hover:text-orange-400' : theme === 'swift' ? 'text-slate-900 dark:text-white group-hover:text-violet-400' : `text-slate-900 dark:text-white group-hover:${stationColors.iconText.split(' ')[0]}`}`}>
                      {theme === 'showgirl' ? "Showtime (Chạy trạm)" : theme === 'swift' ? "Vigilante Shit (Spot)" : "Chạy Trạm (Spot)"}
                  </h3>
                  <p className={`text-sm mb-4 leading-relaxed ${theme === 'showgirl' ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                     {theme === 'showgirl' ? "Mô phỏng sân khấu thực tế. Nhận diện cấu trúc dưới ánh đèn spotlight." : theme === 'swift' ? "Dont get sad, get even. Nhận diện cấu trúc giải phẫu siêu tốc." : "Mô phỏng thi thực hành. AI tạo câu hỏi định danh từ hình ảnh và tính giờ."}
                  </p>
                  <div className={`flex items-center text-sm font-semibold group-hover:translate-x-2 transition-transform ${theme === 'showgirl' ? 'text-orange-500' : theme === 'swift' ? 'text-violet-600 dark:text-violet-300' : stationColors.iconText}`}>
                    {theme === 'showgirl' ? "The show must go on" : "Tạo trạm thi"} <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode(AppMode.FLASHCARD)}
                className={`group p-6 rounded-3xl shadow-md hover:shadow-2xl transition-all duration-300 text-left relative overflow-hidden hover:-translate-y-2 hover:scale-[1.02] 
                ${theme === 'showgirl' ? 'border border-yellow-500/30 bg-slate-900/60 hover:shadow-glow-gold hover:border-yellow-500/60' 
                : theme === 'swift' ? 'bg-white/90 dark:bg-[#1e1e3f]/90 border border-indigo-300 dark:border-indigo-600 hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] backdrop-blur-md'
                : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700'}`}
              >
                 {theme === 'showgirl' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-50 transition-opacity duration-500 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-pulse"></div>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                            <Sparkles className="absolute top-4 right-1/2 w-4 h-4 text-teal-200 animate-ping" style={{animationDuration: '1.8s'}} />
                            <div className="absolute bottom-10 right-10 w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                        </div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-500/20 rounded-full blur-3xl group-hover:bg-teal-400/30 transition-all"></div>
                    </>
                )}

                {/* SWIFT EFFECTS */}
                {theme === 'swift' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/30 rounded-full blur-3xl group-hover:bg-indigo-400/50 transition-all"></div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500"></div>
                    </>
                )}

                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500 ${flashcardColors.bg} ${theme === 'showgirl' ? 'opacity-20' : ''}`}></div>
                <div className="relative z-10">
                  <div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 liquid-icon ${flashcardColors.iconBg} ${flashcardColors.iconText}`}
                    style={{ '--glow-color': flashcardColors.glow } as React.CSSProperties}
                  >
                    {theme === 'showgirl' ? <Crown className="w-7 h-7 text-white" /> : theme === 'swift' ? <Music className="w-7 h-7 text-white" /> : <StickyNote className="w-7 h-7" />}
                  </div>
                  <h3 className={`text-xl font-bold mb-2 transition-colors ${theme === 'showgirl' ? 'text-white group-hover:text-teal-400' : theme === 'swift' ? 'text-slate-900 dark:text-white group-hover:text-indigo-400' : `text-slate-900 dark:text-white group-hover:${flashcardColors.iconText.split(' ')[0]}`}`}>
                      {theme === 'showgirl' ? "Script Cards" : theme === 'swift' ? "Lyrics (Flashcards)" : "Flashcards"}
                  </h3>
                  <p className={`text-sm mb-4 leading-relaxed ${theme === 'showgirl' ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                     {theme === 'showgirl' ? "Kịch bản bỏ túi. Tự tạo thẻ để ôn tập lời thoại kiến thức." : theme === 'swift' ? "Ghi nhớ từng câu hát kiến thức. Dear Reader, get it back." : "Tự tạo bộ thẻ ghi nhớ và ôn tập mọi lúc."}
                  </p>
                  <div className={`flex items-center text-sm font-semibold group-hover:translate-x-2 transition-transform ${theme === 'showgirl' ? 'text-teal-500' : theme === 'swift' ? 'text-indigo-600 dark:text-indigo-300' : flashcardColors.iconText}`}>
                    {theme === 'showgirl' ? "Read the script" : "Tạo bộ thẻ"} <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode(AppMode.HISTORY)}
                className={`group p-6 rounded-3xl shadow-md hover:shadow-2xl transition-all duration-300 text-left relative overflow-hidden hover:-translate-y-2 hover:scale-[1.02] 
                ${theme === 'showgirl' ? 'border border-teal-500/30 bg-slate-900/60 hover:shadow-glow-gold hover:border-teal-500/60' 
                : theme === 'swift' ? 'bg-white/90 dark:bg-[#1a1a2e]/90 border border-cyan-300 dark:border-cyan-600 hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] backdrop-blur-md'
                : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700'}`}
              >
                 {theme === 'showgirl' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-50 transition-opacity duration-500 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] animate-pulse"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-teal-500/20 rounded-full blur-3xl group-hover:bg-teal-400/30 transition-all"></div>
                    </>
                )}

                {/* SWIFT EFFECTS */}
                {theme === 'swift' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/5 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/30 rounded-full blur-3xl group-hover:bg-cyan-400/50 transition-all"></div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500"></div>
                    </>
                )}

                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500 ${historyColors.bg} ${theme === 'showgirl' ? 'opacity-20' : ''}`}></div>
                <div className="relative z-10">
                  <div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 liquid-icon ${historyColors.iconBg} ${historyColors.iconText}`}
                    style={{ '--glow-color': historyColors.glow } as React.CSSProperties}
                  >
                     <History className="w-7 h-7 text-white" />
                  </div>
                  <h3 className={`text-xl font-bold mb-2 transition-colors ${theme === 'showgirl' ? 'text-white group-hover:text-teal-400' : theme === 'swift' ? 'text-slate-900 dark:text-white group-hover:text-cyan-400' : `text-slate-900 dark:text-white group-hover:${historyColors.iconText.split(' ')[0]}`}`}>
                      {theme === 'showgirl' ? "Archives (Lịch sử)" : theme === 'swift' ? "Vault Tracks (History)" : "Lịch sử thi"}
                  </h3>
                  <p className={`text-sm mb-4 leading-relaxed ${theme === 'showgirl' ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400'}`}>
                     {theme === 'showgirl' ? "Xem lại các màn trình diễn cũ trong kho lưu trữ." : theme === 'swift' ? "Unlock the vault. Xem lại kết quả các bài thi trước đó." : "Xem lại kết quả và đáp án các đề đã làm."}
                  </p>
                  <div className={`flex items-center text-sm font-semibold group-hover:translate-x-2 transition-transform ${theme === 'showgirl' ? 'text-teal-500' : theme === 'swift' ? 'text-cyan-600 dark:text-cyan-300' : historyColors.iconText}`}>
                    {theme === 'showgirl' ? "Open Archives" : "Xem lịch sử"} <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </button>
            </div>

            <div className={`mt-20 text-center border-t pt-8 pb-8 ${theme === 'showgirl' ? 'border-yellow-900/30' : 'border-slate-200 dark:border-slate-800'}`}>
                <p className={`text-sm leading-relaxed ${theme === 'showgirl' ? 'text-yellow-600/60 font-mono uppercase tracking-widest' : 'text-slate-400'}`}>
                    © {currentYear} Lam Chan Dat (Y2025B - PNTU). All rights reserved.
                    <br />
                    Designed & Developed by Lam Chan Dat
                </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Layout 
      user={user || { fullName: 'Khách', studentId: 'Guest' }} 
      onLogout={handleLogout} 
      onUpdateUser={handleUpdateUser}
      darkMode={darkMode}
      toggleDarkMode={() => setDarkMode(!darkMode)}
      showFeedback={true}
      theme={theme}
      setTheme={setTheme}
      showSwiftGift={showSwiftGift}
      onCloseSwiftGift={() => setShowSwiftGift(false)}
    >
      <InstallPWA theme={theme} />
      {!user ? (
        <LoginScreen 
          onLogin={handleLogin} 
          darkMode={darkMode} 
          toggleDarkMode={() => setDarkMode(!darkMode)} 
          isExiting={isLoginExiting}
          theme={theme}
        />
      ) : (
        renderContent()
      )}
    </Layout>
  );
};

export default App;
