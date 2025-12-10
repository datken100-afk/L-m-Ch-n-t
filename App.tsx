
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LoginScreen } from './components/LoginScreen';
import { MCQMode } from './components/MCQMode';
import { StationMode } from './components/StationMode';
import { FlashcardMode } from './components/FlashcardMode';
import { HistoryMode } from './components/HistoryMode';
import { InstallPWA } from './components/InstallPWA';
import { AppMode, UserProfile } from './types';
import { BookOpen, Activity, ChevronRight, StickyNote, History, Loader2, FlaskConical, Wrench, Clock } from 'lucide-react';
import { auth, db } from './firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export type ThemeType = 'default' | 'xmas' | 'swift' | 'blackpink' | 'aespa' | 'rosie' | 'pkl' | 'showgirl' | '1989' | 'folklore' | 'ttpd' | 'evermore' | 'tet2026';

// --- MAINTENANCE CONFIGURATION ---
const MAINTENANCE_END_TIME = new Date('2025-12-11T07:00:00');

const MaintenanceScreen: React.FC = () => {
    const [timeLeft, setTimeLeft] = useState<string>("--:--:--");

    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date();
            const diff = MAINTENANCE_END_TIME.getTime() - now.getTime();

            if (diff <= 0) {
                clearInterval(interval);
                window.location.reload(); // Auto reload when time is up
                return;
            }

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            const pad = (n: number) => n < 10 ? `0${n}` : n;
            setTimeLeft(`${pad(hours)} giờ : ${pad(minutes)} phút : ${pad(seconds)} giây`);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] pointer-events-none"></div>
            
            <div className="relative z-10 animate-in fade-in zoom-in duration-500 flex flex-col items-center">
                <div className="w-40 h-40 bg-slate-800 rounded-full flex items-center justify-center mb-8 shadow-[0_0_50px_rgba(56,189,248,0.3)] border-4 border-slate-700 relative">
                    <span className="text-8xl animate-bounce">🦦</span>
                    <div className="absolute -bottom-2 -right-2 bg-blue-600 p-3 rounded-full border-4 border-slate-900 animate-spin-slow">
                        <Wrench className="w-8 h-8 text-white" />
                    </div>
                </div>

                <h1 className="text-3xl md:text-5xl font-black mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
                    Hệ thống đang bảo trì
                </h1>
                
                <p className="text-slate-400 text-lg md:text-xl max-w-xl mb-10 leading-relaxed">
                    Chúng mình đang nâng cấp tính năng mới cho Rái cá. <br/>
                    Xin lỗi vì sự bất tiện này!
                </p>

                <div className="bg-slate-800/80 backdrop-blur-md border border-slate-700 p-6 rounded-2xl shadow-2xl min-w-[300px]">
                    <div className="flex items-center justify-center gap-2 text-blue-400 font-bold uppercase tracking-widest text-xs mb-2">
                        <Clock className="w-4 h-4" /> Thời gian còn lại
                    </div>
                    <div className="font-mono text-2xl md:text-4xl font-black text-white tabular-nums tracking-wide">
                        {timeLeft}
                    </div>
                </div>

                <div className="mt-8 text-slate-500 text-sm font-medium">
                    Tự động tải lại khi hoàn tất.
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
  // --- MAINTENANCE CHECK ---
  const [isMaintenance] = useState(() => new Date() < MAINTENANCE_END_TIME);

  const [user, setUser] = useState<UserProfile | null>(null);
  const [mode, setMode] = useState<AppMode>(AppMode.HOME);
  const [darkMode, setDarkMode] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true); // Loading state for Auth check
  
  // Logic: Check LocalStorage first, then Date logic
  const [theme, setTheme] = useState<ThemeType>(() => {
    const savedTheme = localStorage.getItem('otter_theme');
    if (savedTheme) {
        return savedTheme as ThemeType;
    }

    const today = new Date();
    const xmasLimit = new Date('2025-12-26T23:59:59'); // End of day 26/12/2025
    if (today <= xmasLimit) {
      return 'xmas';
    }
    return 'default';
  });
  
  const [isLoginExiting, setIsLoginExiting] = useState(false);
  const [showSwiftGift, setShowSwiftGift] = useState(false);
  const [showTTPDGift, setShowTTPDGift] = useState(false);
  const [showEvermoreGift, setShowEvermoreGift] = useState(false);
  const [showTetGift, setShowTetGift] = useState(false);

  // Dark Mode Effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Theme Persistence Effect
  useEffect(() => {
      if (theme) {
          localStorage.setItem('otter_theme', theme);
      }
  }, [theme]);

  // Helper to check and show gift (One-time per User ID based on Firestore Data)
  const checkAndShowGift = async (userData: UserProfile) => {
      if (!userData.uid) return;

      // 1. TTPD Gift Logic (Priority)
      const now = new Date();
      const startTTPD = new Date('2025-11-24T00:00:00');
      const endTTPD = new Date('2025-12-31T23:59:59');
      
      if (now >= startTTPD && now <= endTTPD && !userData.isVipTTPD) {
          setShowTTPDGift(true);
          return; // Show one gift at a time
      }

      // 2. Evermore Gift Logic
      if (userData.isVipEvermore && !localStorage.getItem(`seen_evermore_${userData.uid}`)) {
          // If unlocked but not seen popup (optional logic)
          // For now, we skip auto-popup for achievement themes to avoid spam
      }

      // 3. Tet 2026 Gift Logic (Dọn Nhà)
      // Always show if not unlocked yet (Simulated timeframe: active now)
      if (!userData.isVipTet2026) {
          setShowTetGift(true);
          return;
      }
  };

  const handleCloseSwiftGift = async () => {
      if (user && user.uid) {
          try {
              // Grant Swift VIP access
              await updateDoc(doc(db, "users", user.uid), {
                  isVipSwift: true // Add this field if needed in UserProfile
              });
              // Update local state
              setUser(prev => prev ? ({ ...prev }) : null);
          } catch (e) {
              console.error("Error saving gift status", e);
          }
      }
      setShowSwiftGift(false);
      setTheme('swift');
  };

  const handleCloseTTPDGift = async () => {
      if (user && user.uid) {
          try {
              await updateDoc(doc(db, "users", user.uid), {
                  isVipTTPD: true
              });
              setUser(prev => prev ? ({ ...prev, isVipTTPD: true }) : null);
          } catch (e) {
              console.error("Error saving TTPD gift", e);
          }
      }
      setShowTTPDGift(false);
      setTheme('ttpd');
  };

  const handleCloseTetGift = async () => {
      if (user && user.uid) {
          try {
              await updateDoc(doc(db, "users", user.uid), {
                  isVipTet2026: true
              });
              setUser(prev => prev ? ({ ...prev, isVipTet2026: true }) : null);
          } catch (e) {
              console.error("Error saving Tet gift", e);
          }
      }
      setShowTetGift(false);
      setTheme('tet2026');
  };

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            // Fetch additional data from Firestore
            try {
                const userDoc = await getDoc(doc(db, "users", currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const fullProfile: UserProfile = {
                        uid: currentUser.uid,
                        fullName: userData.fullName,
                        studentId: userData.studentId,
                        avatar: userData.avatar,
                        isVipShowgirl: userData.isVipShowgirl,
                        isVip1989: userData.isVip1989,
                        isVipFolklore: userData.isVipFolklore,
                        isVipTTPD: userData.isVipTTPD,
                        isVipEvermore: userData.isVipEvermore,
                        isVipTet2026: userData.isVipTet2026
                    };
                    setUser(fullProfile);
                    checkAndShowGift(fullProfile);
                } else {
                    // Fallback basic info
                    setUser({
                        uid: currentUser.uid,
                        fullName: currentUser.displayName || "Sinh viên",
                        studentId: "N/A"
                    });
                }
            } catch (e) {
                console.error("Error fetching user data", e);
            }
        } else {
            setUser(null);
        }
        setIsSessionLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (loggedInUser: UserProfile) => {
    setUser(loggedInUser);
    checkAndShowGift(loggedInUser);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setMode(AppMode.HOME);
    setTheme('default');
  };

  const handleUpdateUser = async (updatedUser: UserProfile) => {
      setUser(updatedUser);
      if (user?.uid) {
          try {
              await updateDoc(doc(db, "users", user.uid), {
                  fullName: updatedUser.fullName,
                  studentId: updatedUser.studentId,
                  avatar: updatedUser.avatar
              });
          } catch (e) {
              console.error("Error updating user", e);
          }
      }
  };

  // --- DYNAMIC CARD STYLING LOGIC ---
  const getCardStyles = (theme: ThemeType, index: number) => {
      // Default Palettes (MCQ, Station, Flashcard, History)
      const defaultPalette = [
          { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', deco: 'bg-blue-500/10' },
          { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', deco: 'bg-emerald-500/10' },
          { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', deco: 'bg-amber-500/10' },
          { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', deco: 'bg-purple-500/10' },
      ];

      const palettes: Record<ThemeType, typeof defaultPalette> = {
          default: defaultPalette,
          xmas: [
              { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', deco: 'bg-red-500/10' },
              { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', deco: 'bg-green-500/10' },
              { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', deco: 'bg-yellow-500/10' },
              { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400', deco: 'bg-sky-500/10' },
          ],
          showgirl: [
              { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', deco: 'bg-teal-500/10' },
              { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', deco: 'bg-orange-500/10' },
              { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', deco: 'bg-yellow-500/10' },
              { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', deco: 'bg-rose-500/10' },
          ],
          swift: [
              { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', deco: 'bg-purple-500/10' },
              { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400', deco: 'bg-pink-500/10' },
              { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', deco: 'bg-indigo-500/10' },
              { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', deco: 'bg-blue-500/10' },
          ],
          blackpink: [
              { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400', deco: 'bg-pink-500/10' },
              { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-600 dark:text-zinc-400', deco: 'bg-zinc-500/10' },
              { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', deco: 'bg-rose-500/10' },
              { bg: 'bg-slate-200 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', deco: 'bg-slate-500/10' },
          ],
          aespa: [
              { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', deco: 'bg-indigo-500/10' },
              { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400', deco: 'bg-violet-500/10' },
              { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400', deco: 'bg-sky-500/10' },
              { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', deco: 'bg-slate-500/10' },
          ],
          rosie: [
              { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', deco: 'bg-rose-500/10' },
              { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', deco: 'bg-red-500/10' },
              { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400', deco: 'bg-pink-500/10' },
              { bg: 'bg-stone-100 dark:bg-stone-800', text: 'text-stone-600 dark:text-stone-400', deco: 'bg-stone-500/10' },
          ],
          pkl: [
              { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', deco: 'bg-cyan-500/10' },
              { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400', deco: 'bg-sky-500/10' },
              { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', deco: 'bg-blue-500/10' },
              { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', deco: 'bg-slate-500/10' },
          ],
          '1989': [
              { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400', deco: 'bg-sky-500/10' },
              { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', deco: 'bg-blue-500/10' },
              { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', deco: 'bg-indigo-500/10' },
              { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', deco: 'bg-slate-500/10' },
          ],
          folklore: [
              { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-600 dark:text-zinc-400', deco: 'bg-zinc-500/10' },
              { bg: 'bg-stone-100 dark:bg-stone-800', text: 'text-stone-600 dark:text-stone-400', deco: 'bg-stone-500/10' },
              { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', deco: 'bg-slate-500/10' },
              { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', deco: 'bg-gray-500/10' },
          ],
          ttpd: [
              { bg: 'bg-stone-200 dark:bg-stone-800', text: 'text-stone-700 dark:text-stone-300', deco: 'bg-stone-500/10' },
              { bg: 'bg-neutral-200 dark:bg-neutral-800', text: 'text-neutral-700 dark:text-neutral-300', deco: 'bg-neutral-500/10' },
              { bg: 'bg-zinc-200 dark:bg-zinc-800', text: 'text-zinc-700 dark:text-zinc-300', deco: 'bg-zinc-500/10' },
              { bg: 'bg-slate-200 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', deco: 'bg-slate-500/10' },
          ],
          evermore: [
              { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', deco: 'bg-amber-500/10' },
              { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', deco: 'bg-orange-500/10' },
              { bg: 'bg-stone-100 dark:bg-stone-800', text: 'text-stone-700 dark:text-stone-400', deco: 'bg-stone-500/10' },
              { bg: 'bg-yellow-900/10 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-500', deco: 'bg-yellow-500/10' },
          ],
          tet2026: [
              { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', deco: 'bg-red-500/10' },
              { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', deco: 'bg-yellow-500/10' },
              { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', deco: 'bg-orange-500/10' },
              { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', deco: 'bg-emerald-500/10' },
          ]
      };

      return (palettes[theme] || defaultPalette)[index];
  };

  const renderContent = () => {
    switch (mode) {
      case AppMode.MCQ:
        return <MCQMode onBack={() => setMode(AppMode.HOME)} theme={theme} user={user!} onExamComplete={() => {}} />;
      case AppMode.STATION:
        return <StationMode onBack={() => setMode(AppMode.HOME)} theme={theme} onExamComplete={() => {}} />;
      case AppMode.FLASHCARD:
        return <FlashcardMode onBack={() => setMode(AppMode.HOME)} theme={theme} user={user!} />;
      case AppMode.HISTORY:
        return <HistoryMode onBack={() => setMode(AppMode.HOME)} theme={theme} user={user!} />;
      default:
        // Config for the 4 Main Cards
        const cardConfig = [
            { 
                title: "Thi Trắc Nghiệm", 
                desc: "Tạo đề thi từ tài liệu bất kỳ. AI phân tích và chấm điểm chi tiết.",
                icon: <BookOpen className="w-8 h-8" />,
                action: () => setMode(AppMode.MCQ),
                btnText: "Bắt đầu ngay"
            },
            { 
                title: "Thi Chạy Trạm", 
                desc: "Mô phỏng thi thực hành trên hình ảnh Atlas. Chấm điểm tự động.",
                icon: <Activity className="w-8 h-8" />,
                action: () => setMode(AppMode.STATION),
                btnText: "Bắt đầu ngay"
            },
            { 
                title: "Flashcards", 
                desc: "Ôn tập nhanh với thẻ ghi nhớ. Tự tạo bộ thẻ hoặc học từ thư viện.",
                icon: <StickyNote className="w-8 h-8" />,
                action: () => setMode(AppMode.FLASHCARD),
                btnText: "Bắt đầu ngay"
            },
            { 
                title: "Lịch Sử Thi", 
                desc: "Xem lại kết quả các bài thi cũ để rút kinh nghiệm và cải thiện.",
                icon: <History className="w-8 h-8" />,
                action: () => setMode(AppMode.HISTORY),
                btnText: "Xem chi tiết"
            }
        ];

        return (
          <div className="max-w-5xl mx-auto px-4 py-8">
            <InstallPWA theme={theme} />
            
            <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-6 animate-fade-up">
              {cardConfig.map((card, idx) => {
                  const style = getCardStyles(theme, idx);
                  
                  return (
                    <div 
                        key={idx}
                        onClick={card.action}
                        className={`bg-white dark:bg-slate-900 p-8 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-800 cursor-pointer group hover:-translate-y-2 transition-all duration-300 relative overflow-hidden`}
                    >
                        {/* Decorative Background Blob */}
                        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500 ${style.deco}`}></div>
                        
                        <div className="relative z-10">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300 ${style.bg} ${style.text}`}>
                                {card.icon}
                            </div>
                            <h3 className={`text-2xl font-bold text-slate-800 dark:text-white mb-2 group-hover:opacity-80 transition-opacity`}>{card.title}</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 line-clamp-2">{card.desc}</p>
                            <div className={`flex items-center font-bold text-sm ${style.text}`}>
                                {card.btnText} <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </div>
                  );
              })}
            </div>

            {/* QUICK ACTIONS FOOTER */}
            <div className="mt-12 text-center">
                <p className="text-slate-400 text-sm font-medium">
                    Hệ thống đang chạy trên <span className="text-slate-600 dark:text-slate-300 font-bold">Gemini 2.5 Flash</span> - Tốc độ phản hồi cực nhanh ⚡
                </p>
            </div>
          </div>
        );
    }
  };

  // --- RETURN MAINTENANCE MODE IF ACTIVE ---
  if (isMaintenance) {
      return <MaintenanceScreen />;
  }

  if (isSessionLoading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="text-slate-500 font-medium animate-pulse">Đang tải dữ liệu...</p>
          </div>
      );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} darkMode={darkMode} toggleDarkMode={() => setDarkMode(!darkMode)} theme={theme} />;
  }

  return (
    <Layout 
        user={user} 
        onLogout={handleLogout} 
        onUpdateUser={handleUpdateUser}
        darkMode={darkMode}
        toggleDarkMode={() => setDarkMode(!darkMode)}
        theme={theme}
        setTheme={setTheme}
        showSwiftGift={showSwiftGift}
        onCloseSwiftGift={handleCloseSwiftGift}
        showTTPDGift={showTTPDGift}
        onCloseTTPDGift={handleCloseTTPDGift}
        showTetGift={showTetGift}
        onCloseTetGift={handleCloseTetGift}
    >
      {renderContent()}
    </Layout>
  );
};

export default App;
