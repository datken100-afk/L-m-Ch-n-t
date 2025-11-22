
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LoginScreen } from './components/LoginScreen';
import { MCQMode } from './components/MCQMode';
import { StationMode } from './components/StationMode';
import { FlashcardMode } from './components/FlashcardMode';
import { AppMode, UserProfile } from './types';
import { BookOpen, Activity, ChevronRight, StickyNote } from 'lucide-react';

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

  const getCardColors = (type: 'mcq' | 'station' | 'flashcard') => {
    if (theme === 'xmas') {
        if (type === 'flashcard') return { bg: 'bg-orange-50 dark:bg-orange-900/20', iconBg: 'bg-orange-100 dark:bg-orange-900/50', iconText: 'text-orange-600 dark:text-orange-400', glow: 'rgba(249, 115, 22, 0.8)' };
        return type === 'mcq' 
            ? { bg: 'bg-red-50 dark:bg-red-900/20', iconBg: 'bg-red-100 dark:bg-red-900/50', iconText: 'text-red-600 dark:text-red-400', glow: 'rgba(220, 38, 38, 0.8)' }
            : { bg: 'bg-emerald-50 dark:bg-emerald-900/20', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50', iconText: 'text-emerald-600 dark:text-emerald-400', glow: 'rgba(16, 185, 129, 0.8)' };
    } else if (theme === 'swift') {
        if (type === 'flashcard') return { bg: 'bg-sky-50 dark:bg-sky-900/20', iconBg: 'bg-sky-100 dark:bg-sky-900/50', iconText: 'text-sky-600 dark:text-sky-400', glow: 'rgba(14, 165, 233, 0.8)' };
        return type === 'mcq'
            ? { bg: 'bg-pink-50 dark:bg-pink-900/20', iconBg: 'bg-pink-100 dark:bg-pink-900/50', iconText: 'text-pink-600 dark:text-pink-400', glow: 'rgba(236, 72, 153, 0.8)' }
            : { bg: 'bg-purple-50 dark:bg-purple-900/20', iconBg: 'bg-purple-100 dark:bg-purple-900/50', iconText: 'text-purple-600 dark:text-purple-400', glow: 'rgba(168, 85, 247, 0.8)' };
    } else if (theme === 'blackpink') {
        if (type === 'flashcard') return { bg: 'bg-slate-800', iconBg: 'bg-gradient-to-br from-gray-500 to-slate-600', iconText: 'text-white', glow: 'rgba(255, 255, 255, 0.5)' };
        return type === 'mcq'
            ? { bg: 'bg-slate-900', iconBg: 'bg-pink-500', iconText: 'text-white', glow: 'rgba(236, 72, 153, 0.8)' }
            : { bg: 'bg-pink-50 dark:bg-pink-900/20', iconBg: 'bg-slate-900', iconText: 'text-pink-500', glow: 'rgba(15, 23, 42, 0.8)' };
    } else if (theme === 'aespa') {
        if (type === 'flashcard') return { bg: 'bg-slate-900', iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500', iconText: 'text-white', glow: 'rgba(192, 132, 252, 0.8)' };
        return type === 'mcq'
            ? { bg: 'bg-slate-900', iconBg: 'bg-gradient-to-br from-slate-200 to-slate-400', iconText: 'text-slate-900', glow: 'rgba(148, 163, 184, 0.8)' }
            : { bg: 'bg-indigo-950', iconBg: 'bg-gradient-to-br from-indigo-400 to-purple-400', iconText: 'text-white', glow: 'rgba(129, 140, 248, 0.8)' };
    } else if (theme === 'rosie') {
        if (type === 'flashcard') return { bg: 'bg-rose-50 dark:bg-rose-950/30', iconBg: 'bg-rose-200 dark:bg-rose-900/40', iconText: 'text-rose-800 dark:text-rose-300', glow: 'rgba(251, 113, 133, 0.8)' };
        return type === 'mcq'
            ? { bg: 'bg-rose-50 dark:bg-rose-900/20', iconBg: 'bg-rose-100 dark:bg-rose-900/50', iconText: 'text-rose-600 dark:text-rose-400', glow: 'rgba(225, 29, 72, 0.8)' }
            : { bg: 'bg-red-50 dark:bg-red-900/10', iconBg: 'bg-red-100 dark:bg-red-900/50', iconText: 'text-red-700 dark:text-red-400', glow: 'rgba(185, 28, 28, 0.8)' };
    } else if (theme === 'pkl') {
        if (type === 'flashcard') return { bg: 'bg-slate-200 dark:bg-slate-800', iconBg: 'bg-gradient-to-br from-slate-400 to-slate-600', iconText: 'text-white', glow: 'rgba(148, 163, 184, 0.8)' };
        return type === 'mcq'
            ? { bg: 'bg-slate-100 dark:bg-slate-900', iconBg: 'bg-gradient-to-br from-slate-500 to-cyan-600', iconText: 'text-white', glow: 'rgba(6, 182, 212, 0.8)' }
            : { bg: 'bg-slate-50 dark:bg-slate-900/30', iconBg: 'bg-gradient-to-br from-cyan-900 to-slate-800', iconText: 'text-cyan-400', glow: 'rgba(6, 182, 212, 0.8)' };
    } else if (theme === 'showgirl') {
        if (type === 'flashcard') return { bg: 'bg-amber-50 dark:bg-amber-900/20', iconBg: 'bg-gradient-to-br from-amber-400 to-yellow-500', iconText: 'text-amber-800 dark:text-amber-100', glow: 'rgba(251, 191, 36, 0.8)' };
        return type === 'mcq'
            ? { bg: 'bg-teal-50 dark:bg-teal-900/20', iconBg: 'bg-gradient-to-br from-teal-400 to-teal-600', iconText: 'text-teal-800 dark:text-teal-100', glow: 'rgba(20, 184, 166, 0.8)' }
            : { bg: 'bg-orange-50 dark:bg-orange-900/20', iconBg: 'bg-gradient-to-br from-orange-400 to-amber-500', iconText: 'text-orange-800 dark:text-orange-100', glow: 'rgba(249, 115, 22, 0.8)' };
    } else {
        if (type === 'flashcard') return { bg: 'bg-purple-50 dark:bg-purple-900/20', iconBg: 'bg-purple-100 dark:bg-purple-900/50', iconText: 'text-purple-600 dark:text-purple-400', glow: 'rgba(168, 85, 247, 0.8)' };
        return type === 'mcq'
            ? { bg: 'bg-amber-50 dark:bg-amber-900/20', iconBg: 'bg-amber-100 dark:bg-amber-900/50', iconText: 'text-amber-600 dark:text-amber-400', glow: 'rgba(245, 158, 11, 0.8)' }
            : { bg: 'bg-sky-50 dark:bg-sky-900/20', iconBg: 'bg-sky-100 dark:bg-sky-900/50', iconText: 'text-sky-600 dark:text-sky-400', glow: 'rgba(14, 165, 233, 0.8)' };
    }
  };

  const mcqColors = getCardColors('mcq');
  const stationColors = getCardColors('station');
  const flashcardColors = getCardColors('flashcard');

  const renderContent = () => {
    switch (mode) {
      case AppMode.MCQ:
        return (
          <MCQMode onBack={() => setMode(AppMode.HOME)} theme={theme} />
        );
      case AppMode.STATION:
        return (
          <StationMode onBack={() => setMode(AppMode.HOME)} theme={theme} />
        );
      case AppMode.FLASHCARD:
        return (
          <FlashcardMode onBack={() => setMode(AppMode.HOME)} theme={theme} />
        );
      default:
        return (
          <div className="max-w-5xl mx-auto pt-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-16 space-y-4">
              <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {theme === 'showgirl' ? "LIGHTS, CAMERA," : "Xin chào,"} <span className={
                    theme === 'xmas' ? "text-red-600 dark:text-red-500" : 
                    theme === 'swift' ? "text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600" :
                    theme === 'blackpink' ? "text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]" :
                    theme === 'aespa' ? "text-transparent bg-clip-text bg-gradient-to-r from-slate-400 via-indigo-400 to-purple-400 drop-shadow-[0_0_10px_rgba(167,139,250,0.5)]" :
                    theme === 'rosie' ? "text-rose-600 dark:text-rose-400 drop-shadow-[0_0_15px_rgba(225,29,72,0.4)]" :
                    theme === 'pkl' ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-slate-400 to-cyan-600 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]" :
                    theme === 'showgirl' ? "text-transparent bg-clip-text bg-gradient-to-r from-teal-500 via-orange-400 to-teal-500 drop-shadow-[0_0_15px_rgba(20,184,166,0.4)]" :
                    "text-amber-500 dark:text-amber-400"
                }>{theme === 'showgirl' ? " SMILE!" : user?.fullName}</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                {theme === 'xmas' 
                  ? "Chọn chế độ để bắt đầu ôn luyện kiến thức Giải phẫu học (Mùa Giáng Sinh 🎄)." 
                  : theme === 'swift'
                  ? "Chào mừng đến với The Anatomy Eras Tour! Are you ready for it? 🐍🧣"
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

            <div className="grid md:grid-cols-3 gap-6">
              <button
                onClick={() => setMode(AppMode.MCQ)}
                className="group bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-md hover:shadow-2xl border border-slate-100 dark:border-slate-700 transition-all duration-300 text-left relative overflow-hidden hover:-translate-y-2 hover:scale-[1.02]"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500 ${mcqColors.bg}`}></div>
                <div className="relative z-10">
                  <div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 liquid-icon ${mcqColors.iconBg} ${mcqColors.iconText}`}
                    style={{ '--glow-color': mcqColors.glow } as React.CSSProperties}
                  >
                    <BookOpen className="w-7 h-7" />
                  </div>
                  <h3 className={`text-xl font-bold text-slate-900 dark:text-white mb-2 transition-colors group-hover:${mcqColors.iconText.split(' ')[0]}`}>{theme === 'showgirl' ? "Rehearsal (Lý thuyết)" : "Trắc Nghiệm"}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                    {theme === 'showgirl' ? "Ôn luyện kịch bản kiến thức. Giải thích chi tiết cho từng bước nhảy." : "Tạo đề thi trắc nghiệm nhanh chóng theo chủ đề. AI chấm điểm và giải thích."}
                  </p>
                  <div className={`flex items-center text-sm font-semibold group-hover:translate-x-2 transition-transform ${mcqColors.iconText}`}>
                    {theme === 'showgirl' ? "Step into spotlight" : "Bắt đầu ngay"} <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode(AppMode.STATION)}
                className="group bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-md hover:shadow-2xl border border-slate-100 dark:border-slate-700 transition-all duration-300 text-left relative overflow-hidden hover:-translate-y-2 hover:scale-[1.02]"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500 ${stationColors.bg}`}></div>
                <div className="relative z-10">
                  <div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 liquid-icon ${stationColors.iconBg} ${stationColors.iconText}`}
                    style={{ '--glow-color': stationColors.glow } as React.CSSProperties}
                  >
                    <Activity className="w-7 h-7" />
                  </div>
                  <h3 className={`text-xl font-bold text-slate-900 dark:text-white mb-2 transition-colors group-hover:${stationColors.iconText.split(' ')[0]}`}>{theme === 'showgirl' ? "Showtime (Chạy trạm)" : "Chạy Trạm (Spot)"}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                     {theme === 'showgirl' ? "Mô phỏng sân khấu thực tế. Nhận diện cấu trúc dưới ánh đèn spotlight." : "Mô phỏng thi thực hành. AI tạo câu hỏi định danh từ hình ảnh và tính giờ."}
                  </p>
                  <div className={`flex items-center text-sm font-semibold group-hover:translate-x-2 transition-transform ${stationColors.iconText}`}>
                    {theme === 'showgirl' ? "The show must go on" : "Tạo trạm thi"} <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode(AppMode.FLASHCARD)}
                className="group bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-md hover:shadow-2xl border border-slate-100 dark:border-slate-700 transition-all duration-300 text-left relative overflow-hidden hover:-translate-y-2 hover:scale-[1.02]"
              >
                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500 ${flashcardColors.bg}`}></div>
                <div className="relative z-10">
                  <div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 liquid-icon ${flashcardColors.iconBg} ${flashcardColors.iconText}`}
                    style={{ '--glow-color': flashcardColors.glow } as React.CSSProperties}
                  >
                    <StickyNote className="w-7 h-7" />
                  </div>
                  <h3 className={`text-xl font-bold text-slate-900 dark:text-white mb-2 transition-colors group-hover:${flashcardColors.iconText.split(' ')[0]}`}>{theme === 'showgirl' ? "Script Cards" : "Flashcards"}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                     {theme === 'showgirl' ? "Kịch bản bỏ túi. Tự tạo thẻ để ôn tập lời thoại kiến thức." : "Tự tạo bộ thẻ ghi nhớ. Lưu trữ và ôn tập kiến thức mọi lúc mọi nơi."}
                  </p>
                  <div className={`flex items-center text-sm font-semibold group-hover:translate-x-2 transition-transform ${flashcardColors.iconText}`}>
                    {theme === 'showgirl' ? "Read the script" : "Tạo bộ thẻ"} <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </button>
            </div>

            <div className="mt-20 text-center border-t border-slate-200 dark:border-slate-800 pt-8 pb-8">
                <p className="text-slate-400 text-sm leading-relaxed">
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
    >
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
