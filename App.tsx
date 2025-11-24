
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { LoginScreen } from './components/LoginScreen';
import { MCQMode } from './components/MCQMode';
import { StationMode } from './components/StationMode';
import { FlashcardMode } from './components/FlashcardMode';
import { HistoryMode } from './components/HistoryMode';
import { InstallPWA } from './components/InstallPWA';
import { AppMode, UserProfile } from './types';
import { BookOpen, Activity, ChevronRight, StickyNote, Crown, Ticket, Star, Sparkles, Music, History, Loader2, Plane, Trees, Feather, Flame } from 'lucide-react';
import { auth, db } from './firebaseConfig';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export type ThemeType = 'default' | 'xmas' | 'swift' | 'blackpink' | 'aespa' | 'rosie' | 'pkl' | 'showgirl' | '1989' | 'folklore' | 'ttpd' | 'evermore';

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
  const checkAndShowGift = (uid: string, userData: any) => {
      // 2. TTPD Event Logic (Nov 24 2025 - Dec 31 2025)
      const now = new Date();
      const startTTPD = new Date('2025-11-24T00:00:00');
      const endTTPD = new Date('2025-12-31T23:59:59');
      
      if (now >= startTTPD && now <= endTTPD) {
          // Chỉ hiện quà nều người dùng CHƯA sở hữu theme này (isVipTTPD = false/undefined)
          if (!userData?.isVipTTPD) {
              setShowTTPDGift(true);
          }
      }
  };

  const handleCloseTTPDGift = async () => {
      if (user?.uid) {
          try {
              // Cập nhật Firestore ngay lập tức để ghi nhận đã nhận quà
              const userRef = doc(db, "users", user.uid);
              await updateDoc(userRef, { isVipTTPD: true });
              
              // Cập nhật state cục bộ để UI phản hồi ngay
              setUser(prev => prev ? ({ ...prev, isVipTTPD: true }) : null);
          } catch (e) {
              console.error("Failed to save TTPD gift status", e);
          }
      }
      setShowTTPDGift(false);
      // Optional: Switch theme immediately after claiming
      setTheme('ttpd');
  };

  const handleCloseEvermoreGift = () => {
      setShowEvermoreGift(false);
      setTheme('evermore');
  };

  // --- SESSION PERSISTENCE LOGIC ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          // Fetch detailed user profile from Firestore
          const userDocRef = doc(db, "users", currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              uid: currentUser.uid,
              fullName: userData.fullName,
              studentId: userData.studentId,
              avatar: userData.avatar || undefined,
              isVipShowgirl: userData.isVipShowgirl || false,
              isVip1989: userData.isVip1989 || false,
              isVipFolklore: userData.isVipFolklore || false,
              isVipTTPD: userData.isVipTTPD || false,
              isVipEvermore: userData.isVipEvermore || false
            });
            
            // Check for gift on auto-login/refresh using DB data
            checkAndShowGift(currentUser.uid, userData);
          } else {
            // Fallback if Firestore doc doesn't exist
            const fallbackUser = {
              uid: currentUser.uid,
              fullName: currentUser.displayName || "User",
              studentId: "N/A",
              avatar: currentUser.photoURL || undefined,
              isVipShowgirl: false,
              isVip1989: false,
              isVipFolklore: false,
              isVipTTPD: false,
              isVipEvermore: false
            };
            setUser(fallbackUser);
            checkAndShowGift(currentUser.uid, fallbackUser);
          }

        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        // User is signed out
        setUser(null);
      }
      // Finished checking auth
      setIsSessionLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const handleLogin = (loggedInUser: UserProfile) => {
    setIsLoginExiting(true);
    setTimeout(() => {
        setUser(loggedInUser);
        setIsLoginExiting(false);
        
        // Check for gift on manual login
        if (loggedInUser.uid) {
            checkAndShowGift(loggedInUser.uid, loggedInUser);
        }
    }, 800);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth); // Sign out from Firebase
      setUser(null);
      setMode(AppMode.HOME);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
    setUser(updatedUser);
  };

  // Unlock Evermore logic
  const handleExamComplete = async () => {
      if (user && user.uid && !user.isVipEvermore) {
          try {
              // 1. Update Firestore
              const userRef = doc(db, "users", user.uid);
              await updateDoc(userRef, { isVipEvermore: true });
              
              // 2. Update Local State
              const updatedUser = { ...user, isVipEvermore: true };
              setUser(updatedUser);
              
              // 3. Show Celebration Modal
              setShowEvermoreGift(true);
          } catch (e) {
              console.error("Failed to unlock evermore", e);
          }
      }
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
    } else if (theme === '1989') {
        // VIP 1989 Style (Sky Blue & Beige)
        const skyBase = { bg: 'bg-white/90 dark:bg-slate-900/90 border border-sky-200 dark:border-sky-800 backdrop-blur-md', iconBg: 'bg-gradient-to-br from-sky-400 to-blue-500', iconText: 'text-white', glow: 'rgba(56, 189, 248, 0.6)' };
        const beigeBase = { bg: 'bg-orange-50/90 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 backdrop-blur-md', iconBg: 'bg-gradient-to-br from-orange-200 to-amber-300', iconText: 'text-slate-700', glow: 'rgba(251, 146, 60, 0.5)' };
        
        if (type === 'flashcard') return { ...skyBase, iconBg: 'bg-gradient-to-br from-sky-300 to-indigo-300' };
        if (type === 'history') return beigeBase;
        return type === 'mcq' ? skyBase : { ...skyBase, iconBg: 'bg-gradient-to-br from-blue-400 to-sky-500' };
    } else if (theme === 'folklore') {
        // VIP Folklore Style (Grayscale/Silver/Cottagecore)
        const folkBase = { 
            bg: 'bg-white/80 dark:bg-zinc-900/80 border border-zinc-300 dark:border-zinc-700 backdrop-blur-md', 
            iconBg: 'bg-gradient-to-br from-zinc-400 to-slate-600', 
            iconText: 'text-white', 
            glow: 'rgba(161, 161, 170, 0.5)' 
        };
        if (type === 'mcq') return { ...folkBase, iconBg: 'bg-gradient-to-br from-gray-400 to-gray-600' }; // Piano keys vibe
        if (type === 'station') return { ...folkBase, iconBg: 'bg-gradient-to-br from-emerald-700 to-slate-800' }; // Woods vibe
        return folkBase;
    } else if (theme === 'ttpd') {
        // THE TORTURED POETS DEPARTMENT
        const ttpdBase = { 
            bg: 'bg-[#fafaf9]/90 dark:bg-[#1c1917]/90 border border-stone-300 dark:border-stone-700 backdrop-blur-sm', 
            iconBg: 'bg-gradient-to-br from-stone-500 to-stone-700', 
            iconText: 'text-white', 
            glow: 'rgba(120, 113, 108, 0.5)' 
        };
        if (type === 'mcq') return { ...ttpdBase, iconBg: 'bg-gradient-to-br from-stone-600 to-neutral-800' };
        if (type === 'station') return { ...ttpdBase, iconBg: 'bg-gradient-to-br from-stone-500 to-stone-400' };
        return ttpdBase;
    } else if (theme === 'evermore') {
        // VIP EVERMORE (Rust/Green/Beige)
        const evermoreBase = {
            bg: 'bg-[#fffbeb]/90 dark:bg-[#271c19]/90 border border-orange-900/20 dark:border-orange-900/50 backdrop-blur-sm',
            iconBg: 'bg-gradient-to-br from-orange-700 to-amber-800',
            iconText: 'text-white',
            glow: 'rgba(194, 65, 12, 0.6)'
        };
        if (type === 'mcq') return { ...evermoreBase, iconBg: 'bg-gradient-to-br from-orange-800 to-red-900' };
        if (type === 'station') return { ...evermoreBase, iconBg: 'bg-gradient-to-br from-lime-800 to-green-900' };
        return evermoreBase;
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
          <MCQMode onBack={() => setMode(AppMode.HOME)} theme={theme} user={user!} onExamComplete={handleExamComplete} />
        );
      case AppMode.STATION:
        return (
          <StationMode onBack={() => setMode(AppMode.HOME)} theme={theme} onExamComplete={handleExamComplete} />
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

              {theme === '1989' && (
                  <>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-32 bg-gradient-to-r from-sky-300/20 via-blue-200/20 to-orange-100/20 blur-3xl -z-10 rounded-full animate-pulse"></div>
                    <div className="absolute -top-10 left-10 text-4xl animate-[pulse_3s_infinite]">🕊️</div>
                    <div className="absolute top-0 right-10 text-3xl animate-[bounce_4s_infinite]">✈️</div>
                  </>
              )}

              {theme === 'folklore' && (
                  <>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-32 bg-gradient-to-r from-zinc-300/20 via-slate-400/20 to-gray-300/20 blur-3xl -z-10 rounded-full animate-pulse"></div>
                    <div className="absolute -top-10 left-10 text-4xl opacity-50 animate-[wiggle_5s_infinite]">🍃</div>
                    <div className="absolute top-0 right-10 text-3xl opacity-50 animate-[wiggle_6s_infinite]">🌲</div>
                  </>
              )}

              {theme === 'ttpd' && (
                  <>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-32 bg-gradient-to-r from-stone-300/20 via-neutral-400/20 to-stone-300/20 blur-3xl -z-10 rounded-full animate-pulse"></div>
                    <div className="absolute -top-10 left-10 text-4xl opacity-60 animate-[wiggle_8s_infinite]">🖋️</div>
                    <div className="absolute top-0 right-10 text-3xl opacity-60 animate-[wiggle_9s_infinite]">📜</div>
                  </>
              )}

              {theme === 'evermore' && (
                  <>
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-32 bg-gradient-to-r from-orange-900/20 via-amber-700/20 to-lime-900/20 blur-3xl -z-10 rounded-full animate-pulse"></div>
                    <div className="absolute -top-10 left-10 text-4xl opacity-70 animate-[wiggle_7s_infinite]">🍂</div>
                    <div className="absolute top-0 right-10 text-3xl opacity-70 animate-[wiggle_8s_infinite]">🕯️</div>
                  </>
              )}

              <h1 className={`text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight ${theme === 'ttpd' || theme === 'evermore' ? 'font-serif' : ''}`}>
                {theme === 'showgirl' ? "LIGHTS, CAMERA," : theme === 'swift' ? "IT'S BEEN A LONG TIME COMING," : theme === '1989' ? "WELCOME TO NEW YORK," : theme === 'folklore' ? "passed down like folk songs," : theme === 'ttpd' ? "All's fair in love and poetry," : theme === 'evermore' ? "Long story short, I survived," : "Xin chào,"} <span className={
                    theme === 'xmas' ? "text-red-600 dark:text-red-500" : 
                    theme === 'swift' ? "text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]" :
                    theme === 'blackpink' ? "text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.5)]" :
                    theme === 'aespa' ? "text-transparent bg-clip-text bg-gradient-to-r from-slate-400 via-indigo-400 to-purple-400 drop-shadow-[0_0_10px_rgba(167,139,250,0.5)]" :
                    theme === 'rosie' ? "text-rose-600 dark:text-rose-400 drop-shadow-[0_0_15px_rgba(225,29,72,0.4)]" :
                    theme === 'pkl' ? "text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-slate-400 to-cyan-600 drop-shadow-[0_0_10px_rgba(6,182,212,0.4)]" :
                    theme === 'showgirl' ? "text-gradient-gold text-glow-gold" :
                    theme === '1989' ? "text-sky-500 dark:text-sky-300 drop-shadow-sm" :
                    theme === 'folklore' ? "text-slate-500 dark:text-slate-300 font-serif italic" :
                    theme === 'ttpd' ? "text-stone-600 dark:text-stone-400 font-serif italic" :
                    theme === 'evermore' ? "text-orange-700 dark:text-orange-400 font-serif italic" :
                    "text-amber-500 dark:text-amber-400"
                }>{theme === 'showgirl' ? " SMILE!" : user?.fullName}</span>
              </h1>
              <p className={`text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto ${theme === 'ttpd' || theme === 'evermore' ? 'font-serif italic opacity-80' : ''}`}>
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
                  : theme === '1989'
                  ? "It's a new soundtrack. Bay cao cùng những cánh chim hải âu và kiến thức giải phẫu! 🕊️🏙️"
                  : theme === 'folklore'
                  ? "Please picture me in the trees. Cùng Rái cá lạc vào khu rừng giải phẫu đầy bí ẩn. 🌲🧶"
                  : theme === 'ttpd'
                  ? "Chào mừng đến với The Tortured Poets Department. Chúng ta không nói về điểm số, chúng ta nói về sự bất tử. 🖋️📜"
                  : theme === 'evermore'
                  ? "Và Rái cá ở ngay nơi bạn đã bỏ lại. Ôn tập trong không gian yên bình của rừng phong. 🍂🧥"
                  : "Hệ thống ôn tập Giải phẫu học thông minh với sự hỗ trợ của AI."}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <button
                onClick={() => setMode(AppMode.MCQ)}
                className={`group p-6 rounded-3xl shadow-md hover:shadow-2xl transition-all duration-300 text-left relative overflow-hidden hover:-translate-y-2 hover:scale-[1.02] 
                ${theme === 'showgirl' ? 'border border-yellow-500/30 bg-slate-900/60 hover:shadow-glow-gold hover:border-yellow-500/60' 
                : theme === 'swift' ? 'bg-white/90 dark:bg-[#2d1b36]/90 border border-fuchsia-300 dark:border-fuchsia-600 hover:shadow-[0_0_30px_rgba(232,121,249,0.5)] backdrop-blur-md'
                : theme === '1989' ? 'bg-white/90 dark:bg-slate-900/90 border border-sky-200 dark:border-sky-700 hover:shadow-[0_0_30px_rgba(56,189,248,0.4)] backdrop-blur-md'
                : theme === 'folklore' ? 'bg-white/80 dark:bg-zinc-900/80 border border-zinc-300 dark:border-zinc-600 hover:shadow-[0_0_30px_rgba(161,161,170,0.4)] backdrop-blur-md'
                : theme === 'ttpd' ? 'bg-[#fafaf9]/90 dark:bg-[#1c1917]/90 border border-stone-300 dark:border-stone-700 hover:shadow-[0_0_30px_rgba(120,113,108,0.3)] backdrop-blur-sm'
                : theme === 'evermore' ? 'bg-[#fffbeb]/90 dark:bg-[#271c19]/90 border border-orange-900/20 dark:border-orange-900/50 hover:shadow-[0_0_30px_rgba(194,65,12,0.3)] backdrop-blur-sm'
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

                {/* 1989 EFFECTS */}
                {theme === '1989' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-sky-200/20 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-300/20 rounded-full blur-3xl group-hover:bg-sky-400/30 transition-all"></div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-blue-500"></div>
                    </>
                )}

                {/* FOLKLORE EFFECTS */}
                {theme === 'folklore' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-zinc-400/10 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-zinc-400/20 rounded-full blur-3xl group-hover:bg-slate-400/30 transition-all"></div>
                    </>
                )}

                {/* TTPD EFFECTS */}
                {theme === 'ttpd' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-stone-400/10 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-stone-400/10 rounded-full blur-3xl group-hover:bg-stone-500/20 transition-all"></div>
                    </>
                )}

                {/* EVERMORE EFFECTS */}
                {theme === 'evermore' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/10 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-800/20 rounded-full blur-3xl group-hover:bg-amber-700/30 transition-all"></div>
                    </>
                )}

                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500 ${mcqColors.bg} ${theme === 'showgirl' ? 'opacity-20' : ''}`}></div>
                <div className="relative z-10">
                  <div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 liquid-icon ${mcqColors.iconBg} ${mcqColors.iconText}`}
                    style={{ '--glow-color': mcqColors.glow } as React.CSSProperties}
                  >
                    {theme === 'showgirl' ? <Ticket className="w-7 h-7 text-white" /> : theme === 'ttpd' ? <Feather className="w-7 h-7 text-white" /> : theme === 'evermore' ? <Flame className="w-7 h-7 text-white" /> : <BookOpen className="w-7 h-7" />}
                  </div>
                  <h3 className={`text-xl font-bold mb-2 transition-colors ${theme === 'showgirl' ? 'text-white group-hover:text-yellow-400' : theme === 'swift' ? 'text-slate-900 dark:text-white group-hover:text-fuchsia-400' : theme === '1989' ? 'text-slate-900 dark:text-white group-hover:text-sky-500' : theme === 'folklore' ? 'text-slate-800 dark:text-zinc-100 group-hover:text-slate-600' : theme === 'ttpd' ? 'text-stone-800 dark:text-stone-200 font-serif' : theme === 'evermore' ? 'text-orange-900 dark:text-orange-100 font-serif group-hover:text-orange-700' : `text-slate-900 dark:text-white group-hover:${mcqColors.iconText.split(' ')[0]}`}`}>
                      {theme === 'showgirl' ? "Rehearsal (Lý thuyết)" : theme === 'swift' ? "The Setlist (MCQ)" : theme === '1989' ? "Blank Space (MCQ)" : theme === 'folklore' ? "the 1 (MCQ)" : theme === 'ttpd' ? "The Manuscript (MCQ)" : theme === 'evermore' ? "no body, no crime (MCQ)" : "Trắc Nghiệm"}
                  </h3>
                  <p className={`text-sm mb-4 leading-relaxed ${theme === 'showgirl' ? 'text-slate-300' : theme === 'ttpd' || theme === 'evermore' ? 'text-stone-500 dark:text-stone-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {theme === 'showgirl' ? "Ôn luyện kịch bản kiến thức. Giải thích chi tiết cho từng bước nhảy." : theme === 'swift' ? "Chọn kỷ nguyên kiến thức và trả lời các câu hỏi hit." : theme === '1989' ? "Điền vào chỗ trống. Viết tên bạn vào bảng vàng kiến thức." : theme === 'folklore' ? "I'm doing good, I'm on some new shit. Chọn 1 đáp án đúng nhất." : theme === 'ttpd' ? "So I enter into evidence. Tạo đề thi trắc nghiệm và tìm ra sự thật." : theme === 'evermore' ? "Truy tìm manh mối kiến thức. Giải mã bí ẩn giải phẫu học." : "Tạo đề thi trắc nghiệm nhanh chóng theo chủ đề. AI chấm điểm và giải thích."}
                  </p>
                  <div className={`flex items-center text-sm font-semibold group-hover:translate-x-2 transition-transform ${theme === 'showgirl' ? 'text-yellow-500' : theme === 'swift' ? 'text-fuchsia-600 dark:text-fuchsia-300' : theme === '1989' ? 'text-sky-600 dark:text-sky-400' : theme === 'folklore' ? 'text-slate-600 dark:text-zinc-300' : theme === 'ttpd' ? 'text-stone-600 dark:text-stone-300' : theme === 'evermore' ? 'text-orange-700 dark:text-orange-400' : mcqColors.iconText}`}>
                    {theme === 'showgirl' ? "Step into spotlight" : "Bắt đầu ngay"} <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode(AppMode.STATION)}
                className={`group p-6 rounded-3xl shadow-md hover:shadow-2xl transition-all duration-300 text-left relative overflow-hidden hover:-translate-y-2 hover:scale-[1.02] 
                ${theme === 'showgirl' ? 'border border-yellow-500/30 bg-slate-900/60 hover:shadow-glow-gold hover:border-yellow-500/60' 
                : theme === 'swift' ? 'bg-white/90 dark:bg-[#241b36]/90 border border-violet-300 dark:border-violet-600 hover:shadow-[0_0_30px_rgba(139,92,246,0.5)] backdrop-blur-md'
                : theme === '1989' ? 'bg-white/90 dark:bg-slate-900/90 border border-blue-200 dark:border-blue-700 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] backdrop-blur-md'
                : theme === 'folklore' ? 'bg-white/80 dark:bg-zinc-900/80 border border-zinc-300 dark:border-zinc-600 hover:shadow-[0_0_30px_rgba(161,161,170,0.4)] backdrop-blur-md'
                : theme === 'ttpd' ? 'bg-[#fafaf9]/90 dark:bg-[#1c1917]/90 border border-stone-300 dark:border-stone-700 hover:shadow-[0_0_30px_rgba(120,113,108,0.3)] backdrop-blur-sm'
                : theme === 'evermore' ? 'bg-[#fffbeb]/90 dark:bg-[#271c19]/90 border border-orange-900/20 dark:border-orange-900/50 hover:shadow-[0_0_30px_rgba(194,65,12,0.3)] backdrop-blur-sm'
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

                {/* 1989 EFFECTS */}
                {theme === '1989' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-200/20 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-300/20 rounded-full blur-3xl group-hover:bg-blue-400/30 transition-all"></div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-sky-500"></div>
                    </>
                )}

                {/* FOLKLORE EFFECTS */}
                {theme === 'folklore' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/10 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-zinc-500/20 rounded-full blur-3xl group-hover:bg-slate-500/30 transition-all"></div>
                    </>
                )}

                {/* TTPD EFFECTS */}
                {theme === 'ttpd' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-stone-500/10 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-stone-500/10 rounded-full blur-3xl group-hover:bg-stone-600/20 transition-all"></div>
                    </>
                )}

                {/* EVERMORE EFFECTS */}
                {theme === 'evermore' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-green-900/10 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-800/20 rounded-full blur-3xl group-hover:bg-emerald-900/30 transition-all"></div>
                    </>
                )}

                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500 ${stationColors.bg} ${theme === 'showgirl' ? 'opacity-20' : ''}`}></div>
                <div className="relative z-10">
                  <div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 liquid-icon ${stationColors.iconBg} ${stationColors.iconText}`}
                    style={{ '--glow-color': stationColors.glow } as React.CSSProperties}
                  >
                    {theme === 'showgirl' ? <Star className="w-7 h-7 text-white" /> : theme === 'folklore' || theme === 'evermore' ? <Trees className="w-7 h-7 text-white" /> : <Activity className="w-7 h-7" />}
                  </div>
                  <h3 className={`text-xl font-bold mb-2 transition-colors ${theme === 'showgirl' ? 'text-white group-hover:text-orange-400' : theme === 'swift' ? 'text-slate-900 dark:text-white group-hover:text-violet-400' : theme === '1989' ? 'text-slate-900 dark:text-white group-hover:text-blue-500' : theme === 'folklore' ? 'text-slate-800 dark:text-zinc-100 group-hover:text-emerald-700' : theme === 'ttpd' ? 'text-stone-800 dark:text-stone-200 font-serif' : theme === 'evermore' ? 'text-orange-900 dark:text-orange-100 font-serif group-hover:text-orange-700' : `text-slate-900 dark:text-white group-hover:${stationColors.iconText.split(' ')[0]}`}`}>
                      {theme === 'showgirl' ? "Showtime (Chạy trạm)" : theme === 'swift' ? "Vigilante Shit (Spot)" : theme === '1989' ? "Style (Spot)" : theme === 'folklore' ? "exile (Spot)" : theme === 'ttpd' ? "I Can Do It With a Broken Heart (Spot)" : theme === 'evermore' ? "willow (Spot)" : "Chạy Trạm (Spot)"}
                  </h3>
                  <p className={`text-sm mb-4 leading-relaxed ${theme === 'showgirl' ? 'text-slate-300' : theme === 'ttpd' || theme === 'evermore' ? 'text-stone-500 dark:text-stone-400' : 'text-slate-500 dark:text-slate-400'}`}>
                     {theme === 'showgirl' ? "Mô phỏng sân khấu thực tế. Nhận diện cấu trúc dưới ánh đèn spotlight." : theme === 'swift' ? "Dont get sad, get even. Nhận diện cấu trúc giải phẫu siêu tốc." : theme === '1989' ? "We never go out of style. Nhận diện cấu trúc nhanh như chớp." : theme === 'folklore' ? "I think I've seen this film before. Nhận diện cấu trúc trong rừng sâu." : theme === 'ttpd' ? "Lights, camera, bitch smile. Nhận diện cấu trúc ngay cả khi trái tim tan vỡ." : theme === 'evermore' ? "Follow the willow tree. Nhận diện cấu trúc nơi cuối con đường." : "Mô phỏng thi thực hành. AI tạo câu hỏi định danh từ hình ảnh và tính giờ."}
                  </p>
                  <div className={`flex items-center text-sm font-semibold group-hover:translate-x-2 transition-transform ${theme === 'showgirl' ? 'text-orange-500' : theme === 'swift' ? 'text-violet-600 dark:text-violet-300' : theme === '1989' ? 'text-blue-600 dark:text-blue-400' : theme === 'folklore' ? 'text-emerald-700 dark:text-emerald-400' : theme === 'ttpd' ? 'text-stone-600 dark:text-stone-300' : theme === 'evermore' ? 'text-orange-700 dark:text-orange-400' : stationColors.iconText}`}>
                    {theme === 'showgirl' ? "The show must go on" : "Tạo trạm thi"} <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode(AppMode.FLASHCARD)}
                className={`group p-6 rounded-3xl shadow-md hover:shadow-2xl transition-all duration-300 text-left relative overflow-hidden hover:-translate-y-2 hover:scale-[1.02] 
                ${theme === 'showgirl' ? 'border border-yellow-500/30 bg-slate-900/60 hover:shadow-glow-gold hover:border-yellow-500/60' 
                : theme === 'swift' ? 'bg-white/90 dark:bg-[#1e1e3f]/90 border border-indigo-300 dark:border-indigo-600 hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] backdrop-blur-md'
                : theme === '1989' ? 'bg-white/90 dark:bg-slate-900/90 border border-indigo-200 dark:border-indigo-700 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] backdrop-blur-md'
                : theme === 'folklore' ? 'bg-white/80 dark:bg-zinc-900/80 border border-zinc-300 dark:border-zinc-600 hover:shadow-[0_0_30px_rgba(161,161,170,0.4)] backdrop-blur-md'
                : theme === 'ttpd' ? 'bg-[#fafaf9]/90 dark:bg-[#1c1917]/90 border border-stone-300 dark:border-stone-700 hover:shadow-[0_0_30px_rgba(120,113,108,0.3)] backdrop-blur-sm'
                : theme === 'evermore' ? 'bg-[#fffbeb]/90 dark:bg-[#271c19]/90 border border-orange-900/20 dark:border-orange-900/50 hover:shadow-[0_0_30px_rgba(194,65,12,0.3)] backdrop-blur-sm'
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

                {/* 1989 EFFECTS */}
                {theme === '1989' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-200/20 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-300/20 rounded-full blur-3xl group-hover:bg-indigo-400/30 transition-all"></div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-purple-500"></div>
                    </>
                )}

                {/* FOLKLORE EFFECTS */}
                {theme === 'folklore' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-400/10 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-zinc-400/20 rounded-full blur-3xl group-hover:bg-slate-400/30 transition-all"></div>
                    </>
                )}

                {/* TTPD EFFECTS */}
                {theme === 'ttpd' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-neutral-400/10 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-neutral-400/10 rounded-full blur-3xl group-hover:bg-neutral-500/20 transition-all"></div>
                    </>
                )}

                {/* EVERMORE EFFECTS */}
                {theme === 'evermore' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-800/10 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-700/10 rounded-full blur-3xl group-hover:bg-amber-800/20 transition-all"></div>
                    </>
                )}

                <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500 ${flashcardColors.bg} ${theme === 'showgirl' ? 'opacity-20' : ''}`}></div>
                <div className="relative z-10">
                  <div 
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 liquid-icon ${flashcardColors.iconBg} ${flashcardColors.iconText}`}
                    style={{ '--glow-color': flashcardColors.glow } as React.CSSProperties}
                  >
                    {theme === 'showgirl' ? <Crown className="w-7 h-7 text-white" /> : theme === 'swift' ? <Music className="w-7 h-7 text-white" /> : theme === '1989' ? <Plane className="w-7 h-7 text-white" /> : <StickyNote className="w-7 h-7" />}
                  </div>
                  <h3 className={`text-xl font-bold mb-2 transition-colors ${theme === 'showgirl' ? 'text-white group-hover:text-teal-400' : theme === 'swift' ? 'text-slate-900 dark:text-white group-hover:text-indigo-400' : theme === '1989' ? 'text-slate-900 dark:text-white group-hover:text-indigo-500' : theme === 'folklore' ? 'text-slate-800 dark:text-zinc-100 group-hover:text-slate-500' : theme === 'ttpd' ? 'text-stone-800 dark:text-stone-200 font-serif' : theme === 'evermore' ? 'text-orange-900 dark:text-orange-100 font-serif group-hover:text-orange-700' : `text-slate-900 dark:text-white group-hover:${flashcardColors.iconText.split(' ')[0]}`}`}>
                      {theme === 'showgirl' ? "Script Cards" : theme === 'swift' ? "Lyrics (Flashcards)" : theme === '1989' ? "Polaroids (Flashcards)" : theme === 'folklore' ? "cardigan (Flashcards)" : theme === 'ttpd' ? "The Prophecy (Flashcards)" : theme === 'evermore' ? "marjorie (Flashcards)" : "Flashcards"}
                  </h3>
                  <p className={`text-sm mb-4 leading-relaxed ${theme === 'showgirl' ? 'text-slate-300' : theme === 'ttpd' || theme === 'evermore' ? 'text-stone-500 dark:text-stone-400' : 'text-slate-500 dark:text-slate-400'}`}>
                     {theme === 'showgirl' ? "Kịch bản bỏ túi. Tự tạo thẻ để ôn tập lời thoại kiến thức." : theme === 'swift' ? "Ghi nhớ từng câu hát kiến thức. Dear Reader, get it back." : theme === '1989' ? "Lưu giữ khoảnh khắc kiến thức như những tấm ảnh polaroid." : theme === 'folklore' ? "Put on your cardigan. Ôn tập nhẹ nhàng bên lò sưởi." : theme === 'ttpd' ? "Don't want money, just someone who wants my company. Ôn tập cùng Rái cá." : theme === 'evermore' ? "Never be so kind, you forget to be clever. Học thuộc kiến thức ngay." : "Tự tạo bộ thẻ ghi nhớ và ôn tập mọi lúc."}
                  </p>
                  <div className={`flex items-center text-sm font-semibold group-hover:translate-x-2 transition-transform ${theme === 'showgirl' ? 'text-teal-500' : theme === 'swift' ? 'text-indigo-600 dark:text-indigo-300' : theme === '1989' ? 'text-indigo-600 dark:text-indigo-400' : theme === 'folklore' ? 'text-slate-600 dark:text-slate-400' : theme === 'ttpd' ? 'text-stone-600 dark:text-stone-300' : theme === 'evermore' ? 'text-orange-700 dark:text-orange-400' : flashcardColors.iconText}`}>
                    {theme === 'showgirl' ? "Read the script" : "Tạo bộ thẻ"} <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setMode(AppMode.HISTORY)}
                className={`group p-6 rounded-3xl shadow-md hover:shadow-2xl transition-all duration-300 text-left relative overflow-hidden hover:-translate-y-2 hover:scale-[1.02] 
                ${theme === 'showgirl' ? 'border border-teal-500/30 bg-slate-900/60 hover:shadow-glow-gold hover:border-teal-500/60' 
                : theme === 'swift' ? 'bg-white/90 dark:bg-[#1a1a2e]/90 border border-cyan-300 dark:border-cyan-600 hover:shadow-[0_0_30px_rgba(6,182,212,0.5)] backdrop-blur-md'
                : theme === '1989' ? 'bg-white/90 dark:bg-slate-900/90 border border-orange-200 dark:border-orange-700 hover:shadow-[0_0_30px_rgba(251,146,60,0.4)] backdrop-blur-md'
                : theme === 'folklore' ? 'bg-white/80 dark:bg-zinc-900/80 border border-zinc-300 dark:border-zinc-600 hover:shadow-[0_0_30px_rgba(161,161,170,0.4)] backdrop-blur-md'
                : theme === 'ttpd' ? 'bg-[#fafaf9]/90 dark:bg-[#1c1917]/90 border border-stone-300 dark:border-stone-700 hover:shadow-[0_0_30px_rgba(120,113,108,0.3)] backdrop-blur-sm'
                : theme === 'evermore' ? 'bg-[#fffbeb]/90 dark:bg-[#271c19]/90 border border-orange-900/20 dark:border-orange-900/50 hover:shadow-[0_0_30px_rgba(194,65,12,0.3)] backdrop-blur-sm'
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

                {/* 1989 EFFECTS */}
                {theme === '1989' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-200/20 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-300/20 rounded-full blur-3xl group-hover:bg-orange-400/30 transition-all"></div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-orange-400 to-amber-500"></div>
                    </>
                )}

                {/* FOLKLORE EFFECTS */}
                {theme === 'folklore' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-400/10 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-zinc-400/20 rounded-full blur-3xl group-hover:bg-slate-400/30 transition-all"></div>
                    </>
                )}

                {/* TTPD EFFECTS */}
                {theme === 'ttpd' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-neutral-300/10 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-stone-300/10 rounded-full blur-3xl group-hover:bg-stone-400/20 transition-all"></div>
                    </>
                )}

                {/* EVERMORE EFFECTS */}
                {theme === 'evermore' && (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-lime-900/10 to-transparent opacity-100 transition-opacity"></div>
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-800/10 rounded-full blur-3xl group-hover:bg-orange-900/20 transition-all"></div>
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
                  <h3 className={`text-xl font-bold mb-2 transition-colors ${theme === 'showgirl' ? 'text-white group-hover:text-teal-400' : theme === 'swift' ? 'text-slate-900 dark:text-white group-hover:text-cyan-400' : theme === '1989' ? 'text-slate-900 dark:text-white group-hover:text-orange-500' : theme === 'folklore' ? 'text-slate-800 dark:text-zinc-100 group-hover:text-slate-500' : theme === 'ttpd' ? 'text-stone-800 dark:text-stone-200 font-serif' : theme === 'evermore' ? 'text-orange-900 dark:text-orange-100 font-serif group-hover:text-orange-700' : `text-slate-900 dark:text-white group-hover:${historyColors.iconText.split(' ')[0]}`}`}>
                      {theme === 'showgirl' ? "Archives (Lịch sử)" : theme === 'swift' ? "Vault Tracks (History)" : theme === '1989' ? "From The Vault (History)" : theme === 'folklore' ? "august (History)" : theme === 'ttpd' ? "The Anthology (History)" : theme === 'evermore' ? "it's time to go (History)" : "Lịch sử thi"}
                  </h3>
                  <p className={`text-sm mb-4 leading-relaxed ${theme === 'showgirl' ? 'text-slate-300' : theme === 'ttpd' || theme === 'evermore' ? 'text-stone-500 dark:text-stone-400' : 'text-slate-500 dark:text-slate-400'}`}>
                     {theme === 'showgirl' ? "Xem lại các màn trình diễn cũ trong kho lưu trữ." : theme === 'swift' ? "Unlock the vault. Xem lại kết quả các bài thi trước đó." : theme === '1989' ? "Mở khóa kho lưu trữ. Xem lại những bài thi trong quá khứ." : theme === 'folklore' ? "Salt air, and the rust on your door. Mở khóa ký ức bài thi." : theme === 'ttpd' ? "Fresh out the slammer. Xem lại hồ sơ các vụ án kiến thức." : theme === 'evermore' ? "Sometimes giving up is the strong thing. Xem lại những bài thi cũ." : "Xem lại kết quả và đáp án các đề đã làm."}
                  </p>
                  <div className={`flex items-center text-sm font-semibold group-hover:translate-x-2 transition-transform ${theme === 'showgirl' ? 'text-teal-500' : theme === 'swift' ? 'text-cyan-600 dark:text-cyan-300' : theme === '1989' ? 'text-orange-600 dark:text-orange-400' : theme === 'folklore' ? 'text-slate-600 dark:text-slate-400' : theme === 'ttpd' ? 'text-stone-600 dark:text-stone-300' : theme === 'evermore' ? 'text-orange-700 dark:text-orange-400' : historyColors.iconText}`}>
                    {theme === 'showgirl' ? "Open Archives" : "Xem lịch sử"} <ChevronRight className="w-4 h-4 ml-1" />
                  </div>
                </div>
              </button>
            </div>

            <div className={`mt-20 text-center border-t pt-8 pb-12 ${theme === 'showgirl' ? 'border-yellow-900/30' : theme === 'ttpd' ? 'border-stone-300 dark:border-stone-800' : 'border-slate-200 dark:border-slate-800'}`}>
                <p className={`text-sm font-bold mb-4 ${theme === 'showgirl' ? 'text-yellow-600/80' : theme === 'ttpd' ? 'text-stone-500 dark:text-stone-400 font-serif' : 'text-slate-500 dark:text-slate-400'}`}>
                    © {currentYear} Lam Chan Dat (Y2025B - PNTU)
                </p>
                
                <div className={`text-[10px] md:text-xs leading-relaxed space-y-1.5 ${theme === 'showgirl' ? 'text-yellow-600/50 font-mono uppercase tracking-widest' : theme === 'ttpd' ? 'text-stone-400 dark:text-stone-500 font-serif' : 'text-slate-400 dark:text-slate-500'}`}>
                    <p>Version: 1.0</p>
                    <p>Powered by: Gemini Pro 3 & Gemini Flash 2.5</p>
                    <p>Code written on: Google AI Studio & MS Visual Studio Code</p>
                    <p>UI/UX designed by: Lam Chan Dat</p>
                    <p>Core idea by: Lam Chan Dat</p>
                    <p className="italic opacity-80">Powered on browser only</p>
                </div>
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
      showTTPDGift={showTTPDGift}
      onCloseTTPDGift={handleCloseTTPDGift}
    >
      <InstallPWA theme={theme} />
      
      {isSessionLoading ? (
        // --- LOADING SCREEN ---
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
            <div className={`w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mb-6 shadow-xl border-4 border-slate-100 dark:border-slate-800 ${theme === 'showgirl' ? 'border-yellow-500 shadow-glow-gold' : theme === '1989' ? 'border-sky-400 shadow-[0_0_30px_rgba(56,189,248,0.5)]' : theme === 'folklore' ? 'border-zinc-400 shadow-[0_0_30px_rgba(161,161,170,0.5)]' : theme === 'ttpd' ? 'border-stone-400 shadow-[0_0_30px_rgba(168,162,158,0.5)]' : ''}`}>
                <span className="text-6xl animate-[bounce_2s_infinite] filter drop-shadow-lg">
                    {theme === 'xmas' ? '🎅' : theme === 'swift' ? '🐍' : theme === 'blackpink' ? '👑' : theme === 'aespa' ? '👽' : theme === 'rosie' ? '🌹' : theme === 'pkl' ? '🗡️' : theme === 'showgirl' ? '💃' : theme === '1989' ? '🕊️' : theme === 'folklore' ? '🌲' : theme === 'ttpd' ? '🖋️' : theme === 'evermore' ? '🍂' : '🦦'}
                </span>
            </div>
            <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-bold text-lg">
                <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                <span>Đang tải dữ liệu...</span>
            </div>
        </div>
      ) : !user ? (
        <LoginScreen 
          onLogin={handleLogin} 
          darkMode={darkMode} 
          toggleDarkMode={() => setDarkMode(!darkMode)} 
          isExiting={isLoginExiting}
          theme={theme}
        />
      ) : (
        <>
            {renderContent()}
            
            {/* EVERMORE GIFT MODAL */}
            {showEvermoreGift && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#271c19]/80 backdrop-blur-sm animate-in fade-in duration-700 font-serif">
                    <div className="relative max-w-md w-full mx-4 animate-in slide-in-from-bottom-8 duration-700">
                        {/* Confetti / Leaves Fall */}
                        <div className="absolute -top-20 left-0 text-4xl animate-[wiggle_3s_infinite]">🍂</div>
                        <div className="absolute top-0 right-0 text-3xl animate-[wiggle_4s_infinite]">🍁</div>

                        <div className="bg-[#fffbeb] dark:bg-[#3f302b] p-8 rounded-sm shadow-2xl border-4 border-orange-900/30 relative overflow-hidden">
                            {/* Plaid Texture Overlay */}
                            <div className="absolute inset-0 opacity-10 bg-[repeating-linear-gradient(45deg,#000_0,#000_1px,transparent_0,transparent_50%)] mix-blend-overlay pointer-events-none"></div>
                            
                            <div className="text-center mb-6 relative z-10">
                                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-700 to-amber-900 rounded-full flex items-center justify-center mb-4 border-4 border-orange-200 shadow-lg">
                                    <span className="text-4xl animate-pulse">🧥</span>
                                </div>
                                <h2 className="text-3xl font-bold text-orange-900 dark:text-orange-100 italic tracking-wide mb-2">
                                    evermore
                                </h2>
                                <p className="text-xs text-orange-800 dark:text-orange-200 uppercase tracking-widest">
                                    achievement unlocked
                                </p>
                            </div>

                            <div className="bg-white/50 dark:bg-black/20 p-6 rounded-lg border border-orange-900/10 mb-6 relative z-10 backdrop-blur-sm text-center">
                                <p className="text-orange-900 dark:text-orange-100 text-lg font-serif italic mb-2">
                                    "Long story short, I survived."
                                </p>
                                <p className="text-sm text-orange-800 dark:text-orange-200">
                                    Bạn đã hoàn thành 1 bài thi và mở khóa giao diện <strong>evermore</strong> đầy ấm áp.
                                </p>
                            </div>

                            <button
                                onClick={handleCloseEvermoreGift}
                                className="w-full py-3 bg-orange-800 hover:bg-orange-900 text-orange-100 font-bold uppercase tracking-widest transition-colors shadow-lg border border-orange-700 relative z-10"
                            >
                                Claim Reward
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
      )}
    </Layout>
  );
};

export default App;
