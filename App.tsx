
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LoginScreen } from './components/LoginScreen';
import { MCQMode } from './components/MCQMode';
import { StationMode } from './components/StationMode';
import { FlashcardMode } from './components/FlashcardMode';
import { HistoryMode } from './components/HistoryMode';
import { ScheduleMode } from './components/ScheduleMode';
import { InstallPWA } from './components/InstallPWA';
import { AppMode, UserProfile } from './types';
import { BookOpen, Activity, ChevronRight, StickyNote, History, Loader2, FlaskConical, Calendar } from 'lucide-react';
import { auth, db } from './firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export type ThemeType = 'default' | 'xmas' | 'swift' | 'blackpink' | 'aespa' | 'rosie' | 'pkl' | 'showgirl' | '1989' | 'folklore' | 'ttpd' | 'evermore' | 'tet2026';

const App: React.FC = () => {
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
      
      // Check Firestore OR LocalStorage (backup if permissions fail)
      const hasReceivedTTPD = userData.isVipTTPD || localStorage.getItem('gift_ttpd_received');

      if (now >= startTTPD && now <= endTTPD && !hasReceivedTTPD) {
          setShowTTPDGift(true);
          return; // Show one gift at a time
      }

      // 2. Evermore Gift Logic
      if (userData.isVipEvermore && !localStorage.getItem(`seen_evermore_${userData.uid}`)) {
          // If unlocked but not seen popup (optional logic)
          // For now, we skip auto-popup for achievement themes to avoid spam
      }

      // 3. Tet 2026 Gift Logic (Dọn Nhà)
      const hasReceivedTet = userData.isVipTet2026 || localStorage.getItem('gift_tet_received');
      // Always show if not unlocked yet (Simulated timeframe: active now)
      if (!hasReceivedTet) {
          setShowTetGift(true);
          return;
      }
  };

  const handleCloseSwiftGift = async () => {
      // 1. Apply Local Updates Immediately
      setUser(prev => prev ? ({ ...prev, isVipSwift: true } as any) : null);
      localStorage.setItem('gift_swift_received', 'true');
      setShowSwiftGift(false);
      setTheme('swift');

      // 2. Try Persisting to Cloud
      if (user && user.uid) {
          try {
              await updateDoc(doc(db, "users", user.uid), { isVipSwift: true });
          } catch (e) {
              console.warn("Could not save Swift gift to DB (Permission denied or Network)", e);
          }
      }
  };

  const handleCloseTTPDGift = async () => {
      // 1. Apply Local Updates Immediately
      setUser(prev => prev ? ({ ...prev, isVipTTPD: true }) : null);
      localStorage.setItem('gift_ttpd_received', 'true');
      setShowTTPDGift(false);
      setTheme('ttpd');

      // 2. Try Persisting to Cloud
      if (user && user.uid) {
          try {
              await updateDoc(doc(db, "users", user.uid), { isVipTTPD: true });
          } catch (e) {
              console.warn("Could not save TTPD gift to DB (Permission denied or Network)", e);
          }
      }
  };

  const handleCloseTetGift = async () => {
      // 1. Apply Local Updates Immediately
      setUser(prev => prev ? ({ ...prev, isVipTet2026: true }) : null);
      localStorage.setItem('gift_tet_received', 'true');
      setShowTetGift(false);
      setTheme('tet2026');

      // 2. Try Persisting to Cloud
      if (user && user.uid) {
          try {
              await updateDoc(doc(db, "users", user.uid), { isVipTet2026: true });
          } catch (e) {
              console.warn("Could not save Tet gift to DB (Permission denied or Network)", e);
          }
      }
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
                    // Fallback basic info (Doc doesn't exist)
                    const fallbackUser = {
                        uid: currentUser.uid,
                        fullName: currentUser.displayName || "Sinh viên",
                        studentId: "N/A"
                    };
                    setUser(fallbackUser);
                    checkAndShowGift(fallbackUser);
                }
            } catch (e) {
                console.warn("Error fetching user data (likely permission-denied). Using Auth info only.");
                // Fallback for Permission Denied or Network Errors
                const fallbackUser = {
                    uid: currentUser.uid,
                    fullName: currentUser.displayName || "Sinh viên",
                    studentId: "N/A"
                };
                setUser(fallbackUser);
                checkAndShowGift(fallbackUser);
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
      // Optimistic update locally
      setUser(updatedUser);
      
      if (user?.uid) {
          try {
              await updateDoc(doc(db, "users", user.uid), {
                  fullName: updatedUser.fullName,
                  studentId: updatedUser.studentId,
                  avatar: updatedUser.avatar
              });
          } catch (e) {
              console.warn("Error updating user profile in DB", e);
              // We don't revert local state because it's better to keep the UI consistent for the session
          }
      }
  };

  // --- DYNAMIC CARD STYLING LOGIC ---
  const getCardStyles = (theme: ThemeType, index: number) => {
      // Default Palettes (MCQ, Station, Flashcard, History, Schedule)
      const defaultPalette = [
          { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', deco: 'bg-blue-500/10' },
          { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', deco: 'bg-emerald-500/10' },
          { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', deco: 'bg-amber-500/10' },
          { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', deco: 'bg-purple-500/10' },
          { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', deco: 'bg-cyan-500/10' }, // Added for Schedule
      ];

      const palettes: Record<ThemeType, typeof defaultPalette> = {
          default: defaultPalette,
          xmas: [
              { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', deco: 'bg-red-500/10' },
              { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', deco: 'bg-green-500/10' },
              { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', deco: 'bg-yellow-500/10' },
              { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400', deco: 'bg-sky-500/10' },
              { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', deco: 'bg-purple-500/10' },
          ],
          showgirl: [
              { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', deco: 'bg-teal-500/10' },
              { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', deco: 'bg-orange-500/10' },
              { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-600 dark:text-yellow-400', deco: 'bg-yellow-500/10' },
              { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', deco: 'bg-rose-500/10' },
              { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', deco: 'bg-indigo-500/10' },
          ],
          swift: [
              { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', deco: 'bg-purple-500/10' },
              { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400', deco: 'bg-pink-500/10' },
              { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', deco: 'bg-indigo-500/10' },
              { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', deco: 'bg-blue-500/10' },
              { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', deco: 'bg-rose-500/10' },
          ],
          blackpink: [
              { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400', deco: 'bg-pink-500/10' },
              { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-600 dark:text-zinc-400', deco: 'bg-zinc-500/10' },
              { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', deco: 'bg-rose-500/10' },
              { bg: 'bg-slate-200 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', deco: 'bg-slate-500/10' },
              { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', deco: 'bg-gray-500/10' },
          ],
          aespa: [
              { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', deco: 'bg-indigo-500/10' },
              { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-600 dark:text-violet-400', deco: 'bg-violet-500/10' },
              { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400', deco: 'bg-sky-500/10' },
              { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', deco: 'bg-slate-500/10' },
              { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', deco: 'bg-purple-500/10' },
          ],
          rosie: [
              { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', deco: 'bg-rose-500/10' },
              { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', deco: 'bg-red-500/10' },
              { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-600 dark:text-pink-400', deco: 'bg-pink-500/10' },
              { bg: 'bg-stone-100 dark:bg-stone-800', text: 'text-stone-600 dark:text-stone-400', deco: 'bg-stone-500/10' },
              { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', deco: 'bg-slate-500/10' },
          ],
          pkl: [
              { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', deco: 'bg-cyan-500/10' },
              { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400', deco: 'bg-sky-500/10' },
              { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', deco: 'bg-blue-500/10' },
              { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', deco: 'bg-slate-500/10' },
              { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', deco: 'bg-indigo-500/10' },
          ],
          '1989': [
              { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-600 dark:text-sky-400', deco: 'bg-sky-500/10' },
              { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', deco: 'bg-blue-500/10' },
              { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', deco: 'bg-indigo-500/10' },
              { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', deco: 'bg-slate-500/10' },
              { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', deco: 'bg-cyan-500/10' },
          ],
          folklore: [
              { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-600 dark:text-zinc-400', deco: 'bg-zinc-500/10' },
              { bg: 'bg-stone-100 dark:bg-stone-800', text: 'text-stone-600 dark:text-stone-400', deco: 'bg-stone-500/10' },
              { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', deco: 'bg-slate-500/10' },
              { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400', deco: 'bg-gray-500/10' },
              { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', deco: 'bg-emerald-500/10' },
          ],
          ttpd: [
              { bg: 'bg-stone-200 dark:bg-stone-800', text: 'text-stone-700 dark:text-stone-300', deco: 'bg-stone-500/10' },
              { bg: 'bg-neutral-200 dark:bg-neutral-800', text: 'text-neutral-700 dark:text-neutral-300', deco: 'bg-neutral-500/10' },
              { bg: 'bg-zinc-200 dark:bg-zinc-800', text: 'text-zinc-700 dark:text-zinc-300', deco: 'bg-zinc-500/10' },
              { bg: 'bg-slate-200 dark:bg-slate-800', text: 'text-slate-700 dark:text-slate-300', deco: 'bg-slate-500/10' },
              { bg: 'bg-gray-200 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', deco: 'bg-gray-500/10' },
          ],
          evermore: [
              { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', deco: 'bg-amber-500/10' },
              { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', deco: 'bg-orange-500/10' },
              { bg: 'bg-stone-100 dark:bg-stone-800', text: 'text-stone-700 dark:text-stone-400', deco: 'bg-stone-500/10' },
              { bg: 'bg-yellow-900/10 dark:bg-yellow-900/20', text: 'text-yellow-800 dark:text-yellow-500', deco: 'bg-yellow-500/10' },
              { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', deco: 'bg-red-500/10' },
          ],
          tet2026: [
              { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', deco: 'bg-red-500/10' },
              { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', deco: 'bg-yellow-500/10' },
              { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', deco: 'bg-orange-500/10' },
              { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', deco: 'bg-emerald-500/10' },
              { bg: 'bg-sky-100 dark:bg-sky-900/30', text: 'text-sky-700 dark:text-sky-400', deco: 'bg-sky-500/10' },
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
      case AppMode.SCHEDULE:
        return <ScheduleMode onBack={() => setMode(AppMode.HOME)} theme={theme} />;
      default:
        // Config for the Main Cards
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
            },
            { 
                title: "Lịch Thi", 
                desc: "Tra cứu lịch thi học kỳ và đếm ngược ngày thi.",
                icon: <Calendar className="w-8 h-8" />,
                action: () => setMode(AppMode.SCHEDULE),
                btnText: "Xem lịch"
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
