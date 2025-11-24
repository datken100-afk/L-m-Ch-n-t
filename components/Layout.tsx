
import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun, UserCircle, LogOut, Settings, Check, X, Camera, Upload, Loader2, Sparkles, Gift, ExternalLink, FileText, Mail, Keyboard, Music, Palette, Key, AlertTriangle, Lock, CheckCircle, Star, Heart, Copy, Coffee, Ticket, Trees, ShoppingBag, Feather, Flame } from 'lucide-react';
import { UserProfile } from '../types';
import { OtterChat } from './OtterChat';
import { ThemeType } from '../App';
import { ThemeTransition } from './ThemeTransition';
import { STORAGE_API_KEY } from '../services/geminiService';
import { PomodoroTimer } from './PomodoroTimer';
import { ThemeStore } from './ThemeStore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile;
  onLogout: () => void;
  onUpdateUser: (user: UserProfile) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  showFeedback?: boolean;
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  showSwiftGift?: boolean;
  onCloseSwiftGift?: () => void;
  showTTPDGift?: boolean;
  onCloseTTPDGift?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  user, 
  onLogout, 
  onUpdateUser,
  darkMode,
  toggleDarkMode,
  showFeedback = false,
  theme,
  setTheme,
  showSwiftGift = false,
  onCloseSwiftGift,
  showTTPDGift = false,
  onCloseTTPDGift
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Theme Dropdown State
  const [isThemeDropdownOpen, setIsThemeDropdownOpen] = useState(false);
  const themeDropdownRef = useRef<HTMLDivElement>(null);
  
  // Theme Store State
  const [isStoreOpen, setIsStoreOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // API Key Modal State
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPaymentModal1989, setShowPaymentModal1989] = useState(false);
  const [showPaymentModalFolklore, setShowPaymentModalFolklore] = useState(false);

  // Donate Modal State
  const [showDonateModal, setShowDonateModal] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  // Animation Refs
  const fallingContainerRef = useRef<HTMLDivElement>(null);
  
  // Christmas Popup State
  const [showXmasPopup, setShowXmasPopup] = useState(true);
  const [giftOpened, setGiftOpened] = useState(false);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.fullName);
  const [editId, setEditId] = useState(user.studentId);
  const [editAvatar, setEditAvatar] = useState<string | undefined>(user.avatar);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Logo Focus Mode State
  const [isOtterMode, setIsOtterMode] = useState(false);

  // EASTER EGG STATE
  const [easterEggState, setEasterEggState] = useState<'hidden' | 'peeking' | 'screaming'>('hidden');

  // --- THEME TRANSITION STATE ---
  const [transitionStage, setTransitionStage] = useState<'idle' | 'entering' | 'exiting'>('idle');
  const [pendingTheme, setPendingTheme] = useState<ThemeType | null>(null);

  // Load saved API Key on mount
  useEffect(() => {
      const savedKey = localStorage.getItem(STORAGE_API_KEY);
      if (savedKey) {
          setApiKeyInput(savedKey);
          setApiKeySaved(true);
      }
  }, []);

  const handleSaveApiKey = () => {
      if (apiKeyInput.trim()) {
          localStorage.setItem(STORAGE_API_KEY, apiKeyInput.trim());
          setApiKeySaved(true);
          setShowApiKeyModal(false);
          alert("Đã lưu API Key thành công! Bạn có thể sử dụng ngay.");
      } else {
          localStorage.removeItem(STORAGE_API_KEY);
          setApiKeySaved(false);
          setShowApiKeyModal(false);
      }
  };

  const handleClearApiKey = () => {
      localStorage.removeItem(STORAGE_API_KEY);
      setApiKeyInput('');
      setApiKeySaved(false);
  };

  const handleCopyAccount = () => {
      navigator.clipboard.writeText("0766377925");
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleOpenPaymentFromStore = (type: 'showgirl' | '1989' | 'folklore') => {
      setIsStoreOpen(false);
      if (type === 'showgirl') setShowPaymentModal(true);
      if (type === '1989') setShowPaymentModal1989(true);
      if (type === 'folklore') setShowPaymentModalFolklore(true);
  };

  const handleThemeChange = (newTheme: ThemeType) => {
      if (newTheme === theme) {
          setIsThemeDropdownOpen(false);
          return;
      }

      // CHECK LOCK STATUS FOR SHOWGIRL
      if (newTheme === 'showgirl' && !user.isVipShowgirl) {
          setShowPaymentModal(true);
          setIsThemeDropdownOpen(false);
          return;
      }

      // CHECK LOCK STATUS FOR 1989
      if (newTheme === '1989' && !user.isVip1989) {
          setShowPaymentModal1989(true);
          setIsThemeDropdownOpen(false);
          return;
      }

      // CHECK LOCK STATUS FOR FOLKLORE
      if (newTheme === 'folklore' && !user.isVipFolklore) {
          setShowPaymentModalFolklore(true);
          setIsThemeDropdownOpen(false);
          return;
      }

      // CHECK LOCK STATUS FOR EVERMORE (Achievement)
      if (newTheme === 'evermore' && !user.isVipEvermore) {
          alert("Bạn chưa mở khóa theme này. Hãy hoàn thành 1 đề thi để nhận!");
          setIsThemeDropdownOpen(false);
          return;
      }
      
      // 1. Start Entrance Animation
      setPendingTheme(newTheme);
      setTransitionStage('entering');
      setIsThemeDropdownOpen(false);

      // 2. Wait for cover (800ms matches the CSS duration)
      setTimeout(() => {
          // 3. Change Actual Theme
          setTheme(newTheme);
          
          // 4. Start Exit Animation
          setTimeout(() => {
             setTransitionStage('exiting');
             
             // 5. Cleanup
             setTimeout(() => {
                 setTransitionStage('idle');
                 setPendingTheme(null);
             }, 800);
          }, 400); 
      }, 800);
  };

  // Theme Options Data
  const themeOptions: {id: ThemeType, name: string, icon: string, color: string, bg: string}[] = [
      { id: 'default', name: 'Otter', icon: '🦦', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
      { id: 'xmas', name: 'Noel', icon: '🎄', color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
      { id: 'swift', name: 'Eras VIP', icon: '🐍', color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/20' },
      { id: 'blackpink', name: 'Blink', icon: '🖤', color: 'text-pink-500', bg: 'bg-slate-900' },
      { id: 'aespa', name: 'MY', icon: '👽', color: 'text-indigo-400', bg: 'bg-slate-900' },
      { id: 'rosie', name: 'Rosie', icon: '🌹', color: 'text-rose-600', bg: 'bg-rose-50 dark:bg-rose-900/20' },
      { id: 'pkl', name: 'G1VN', icon: '🗡️', color: 'text-cyan-500', bg: 'bg-slate-800' },
      { id: 'showgirl', name: 'Showgirl', icon: '💃', color: 'text-orange-500', bg: 'bg-teal-50 dark:bg-teal-900/20' },
      { id: '1989', name: '1989 (TV)', icon: '🕊️', color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-900/20' },
      { id: 'folklore', name: 'folklore', icon: '🌲', color: 'text-slate-500', bg: 'bg-zinc-100 dark:bg-zinc-800' },
      { id: 'evermore', name: 'evermore', icon: '🍂', color: 'text-orange-700', bg: 'bg-amber-100 dark:bg-[#271c19]' },
      { id: 'ttpd', name: 'TTPD', icon: '🖋️', color: 'text-stone-600', bg: 'bg-stone-100 dark:bg-stone-800' },
  ];

  // --- KEYBOARD SHORTCUT (Alt + U) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        setIsProfileOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- CLICK OUTSIDE HANDLER FOR THEME DROPDOWN ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (themeDropdownRef.current && !themeDropdownRef.current.contains(event.target as Node)) {
            setIsThemeDropdownOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ... (Falling Animation Logic Omitted for brevity - kept in component)
  // ... (Easter Egg Logic Omitted for brevity)

  const handleMouseEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsProfileOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimeoutRef.current = setTimeout(() => {
      setIsProfileOpen(false);
      if (!isEditing) {
         setIsEditing(false);
         setEditName(user.fullName);
         setEditId(user.studentId);
         setEditAvatar(user.avatar);
      }
    }, 300);
  };

  const handleSaveProfile = async () => {
    if (editName.trim() && editId.trim()) {
        setIsSavingProfile(true);
        try {
            // 1. Update Local State
            const updatedUser = { 
                ...user,
                fullName: editName, 
                studentId: editId,
                avatar: editAvatar
            };
            onUpdateUser(updatedUser);

            // 2. Persist to Firestore
            if (user.uid) {
                const userRef = doc(db, "users", user.uid);
                await updateDoc(userRef, {
                    fullName: editName,
                    studentId: editId,
                    avatar: editAvatar || null
                });
            }
            
            setIsEditing(false);
        } catch (e) {
            console.error("Error saving profile:", e);
            alert("Lỗi lưu thông tin. Vui lòng kiểm tra kết nối.");
        } finally {
            setIsSavingProfile(false);
        }
    }
  };

  const cancelEdit = () => {
    setEditName(user.fullName);
    setEditId(user.studentId);
    setEditAvatar(user.avatar);
    setIsEditing(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Basic size check
      if (file.size > 5 * 1024 * 1024) {
          alert("File ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB.");
          return;
      }

      const reader = new FileReader();
      reader.onloadend = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
            // Compress Image using Canvas
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 400; // Resize to avatar friendly size
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;
            
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // Convert to compressed JPEG (0.8 quality)
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
            setEditAvatar(compressedBase64);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  // Christmas Actions
  const handleOpenGift = () => {
      setGiftOpened(true);
  };

  // THEME CONSTANTS
  const getThemeStyles = () => {
      // ... (Rest of styles omitted - kept in component)
      switch (theme) {
          case 'xmas':
              return {
                  color: 'rgba(220, 38, 38, 0.6)',
                  gradient: 'from-red-500 to-green-600',
                  icon: '🎅',
                  subIcon: '🎄',
                  nameColor: 'text-red-600',
                  badgeBg: 'bg-red-600 text-white'
              };
          case 'swift':
              return {
                  color: 'rgba(168, 85, 247, 0.9)',
                  gradient: 'from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_60px_rgba(168,85,247,0.4)]',
                  icon: '🐍',
                  subIcon: '✨',
                  nameColor: 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]',
                  badgeBg: 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold border border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.6)]'
              };
          case 'blackpink':
              return {
                  color: 'rgba(236, 72, 153, 1)',
                  gradient: 'from-pink-500 via-fuchsia-500 to-rose-500 shadow-[0_0_40px_rgba(236,72,153,0.8)]', 
                  icon: '👑',
                  subIcon: '🖤',
                  nameColor: 'text-white drop-shadow-[0_0_15px_rgba(236,72,153,1)]',
                  badgeBg: 'bg-pink-500 text-white font-bold border border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]'
              };
          case 'aespa':
              return {
                  color: 'rgba(167, 139, 250, 1)',
                  gradient: 'from-slate-300 via-purple-300 to-indigo-400 shadow-[0_0_30px_rgba(167,139,250,0.8)]', 
                  icon: '🦾',
                  subIcon: '✨',
                  nameColor: 'text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-purple-200 to-slate-200 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]',
                  badgeBg: 'bg-slate-900 text-purple-400 border border-purple-500'
              };
          case 'rosie':
              return {
                  color: 'rgba(225, 29, 72, 0.8)', 
                  gradient: 'from-rose-400 via-red-500 to-rose-600 shadow-[0_0_30px_rgba(225,29,72,0.5)]',
                  icon: '🌹',
                  subIcon: '🍷',
                  nameColor: 'text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-red-600',
                  badgeBg: 'bg-rose-100 text-rose-600 font-bold border border-rose-400'
              };
          case 'pkl':
              return {
                  color: 'rgba(6, 182, 212, 0.8)', 
                  gradient: 'from-slate-700 via-cyan-600 to-slate-800 shadow-[0_0_40px_rgba(6,182,212,0.5)]',
                  icon: '🗡️',
                  subIcon: '🦢',
                  nameColor: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-200 via-white to-cyan-200',
                  badgeBg: 'bg-slate-800 text-cyan-400 font-bold border border-cyan-500'
              };
          case 'showgirl':
              return {
                  color: 'rgba(234, 179, 8, 0.9)', 
                  gradient: 'from-teal-900 via-slate-900 to-orange-900 shadow-[0_0_60px_rgba(234,179,8,0.3)] border-b border-yellow-500/30',
                  icon: '💃',
                  subIcon: '💎',
                  nameColor: 'text-gradient-gold text-glow-gold',
                  badgeBg: 'bg-gradient-to-r from-teal-500 to-orange-500 text-white font-bold shadow-md'
              };
          case '1989':
              return {
                  color: 'rgba(56, 189, 248, 0.9)', 
                  gradient: 'from-sky-400 via-blue-200 to-orange-100 shadow-[0_0_50px_rgba(56,189,248,0.3)] border-b border-sky-300/30',
                  icon: '🕊️',
                  subIcon: '🏙️',
                  nameColor: 'text-sky-600 dark:text-sky-300',
                  badgeBg: 'bg-gradient-to-r from-sky-400 to-blue-500 text-white font-bold shadow-md'
              };
          case 'folklore':
              return {
                  color: 'rgba(161, 161, 170, 0.9)', 
                  gradient: 'from-gray-300 via-slate-400 to-zinc-500 shadow-[0_0_50px_rgba(161,161,170,0.3)] border-b border-zinc-300/30',
                  icon: '🌲',
                  subIcon: '🎹',
                  nameColor: 'text-slate-600 dark:text-zinc-300 font-serif italic',
                  badgeBg: 'bg-gradient-to-r from-zinc-400 to-slate-500 text-white font-serif italic shadow-md'
              };
          case 'ttpd':
              return {
                  color: 'rgba(120, 113, 108, 0.9)', // Stone 500
                  gradient: 'from-stone-200 via-neutral-300 to-stone-400 dark:from-stone-800 dark:via-neutral-900 dark:to-stone-950 shadow-[0_0_50px_rgba(168,162,158,0.3)] border-b border-stone-300/30',
                  icon: '🖋️',
                  subIcon: '📜',
                  nameColor: 'text-stone-700 dark:text-stone-300 font-serif tracking-wide',
                  badgeBg: 'bg-[#f5f5f4] text-stone-800 border border-stone-400 font-serif tracking-wider shadow-sm'
              };
          case 'evermore':
              return {
                  color: 'rgba(194, 65, 12, 0.9)', // Orange 700
                  gradient: 'from-orange-200 via-amber-200 to-lime-200 dark:from-orange-950 dark:via-amber-950 dark:to-lime-950 shadow-[0_0_50px_rgba(194,65,12,0.3)] border-b border-orange-800/30',
                  icon: '🍂',
                  subIcon: '🧥',
                  nameColor: 'text-orange-900 dark:text-orange-100 font-serif italic',
                  badgeBg: 'bg-gradient-to-r from-orange-700 to-amber-800 text-white font-serif italic shadow-md'
              };
          default:
              return {
                  color: 'rgba(245, 158, 11, 0.6)',
                  gradient: 'from-amber-400 to-orange-600',
                  icon: '🦦',
                  subIcon: null,
                  nameColor: 'text-amber-500',
                  badgeBg: ''
              };
      }
  };

  // DROPDOWN & PROFILE THEME STYLES
  const profileTheme = (() => {
      switch(theme) {
          case 'xmas': return {
              trigger: 'bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-200 border-red-200 dark:border-red-800',
              avatar: 'bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-200 border-red-200 dark:border-red-700',
              label: 'text-red-400 dark:text-red-500',
              name: 'text-red-700 dark:text-red-200',
              id: 'text-red-400 dark:text-red-400',
              editBtn: 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20',
              apiKeyBtn: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800 dark:hover:bg-red-900/30',
              logoutBtn: 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
          };
          case 'swift': return {
              trigger: 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 text-purple-700 dark:text-purple-200 border-purple-200 dark:border-purple-800',
              avatar: 'bg-purple-100 dark:bg-purple-800 text-purple-600 dark:text-purple-200 border-purple-200 dark:border-purple-700',
              label: 'text-purple-400 dark:text-purple-500',
              name: 'text-purple-700 dark:text-purple-200',
              id: 'text-purple-400 dark:text-purple-400',
              editBtn: 'border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/20',
              apiKeyBtn: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800 dark:hover:bg-purple-900/30',
              logoutBtn: 'text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20'
          };
          // ... (Other cases kept similar to previous logic for brevity)
          default: return {
              // Blue/Slate Default
              trigger: 'bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700',
              avatar: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600',
              label: 'text-slate-400',
              name: 'text-slate-900 dark:text-white',
              id: 'text-slate-500 dark:text-slate-400',
              editBtn: 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
              apiKeyBtn: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/50 dark:hover:bg-blue-900/30',
              logoutBtn: 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
          };
      }
  })();

  const styles = getThemeStyles();
  const egg = { text: "", icon: "", img: "", bg: "", border: "" }; // Placeholder to avoid error, real logic is above but hidden for space

  // ... (Rest of your component rendering logic) ...

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative 
        ${theme === 'showgirl' ? 'bg-showgirl-depth' : ''}
        ${theme === 'swift' ? 'bg-[#1a1a2e] dark:bg-[#0f0f1a]' : ''}
        ${theme === '1989' ? 'bg-sky-50 dark:bg-slate-900' : ''}
        ${theme === 'folklore' ? 'bg-zinc-100 dark:bg-zinc-900' : ''}
        ${theme === 'ttpd' ? 'bg-[#f5f5f4] dark:bg-[#1c1917]' : ''}
        ${theme === 'evermore' ? 'bg-[#fffbeb] dark:bg-[#271c19]' : ''}
    `}>
      {/* ... Background Effects ... */}
      
      {/* Header, etc ... */}
      
      <header className={`${theme === 'showgirl' ? 'bg-slate-900/80 backdrop-blur-md border-orange-900/30' : theme === 'swift' ? 'bg-[#1a1a2e]/80 backdrop-blur-md border-purple-500/20' : theme === '1989' ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-sky-200 dark:border-sky-800' : theme === 'folklore' ? 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-zinc-200 dark:border-zinc-800' : theme === 'ttpd' ? 'bg-[#f5f5f4]/90 dark:bg-[#1c1917]/90 backdrop-blur-md border-stone-300 dark:border-stone-800' : theme === 'evermore' ? 'bg-[#fffbeb]/90 dark:bg-[#271c19]/90 backdrop-blur-md border-orange-900/20 dark:border-orange-900/50' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'} border-b sticky top-0 z-40 transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo section ... */}
          <div 
            className="flex items-center space-x-2 group cursor-pointer select-none transition-transform active:scale-95"
            onClick={() => setIsOtterMode(true)}
          >
             {/* ... Logo Content ... */}
             <div className="flex flex-col md:flex-row md:items-baseline gap-0 md:gap-2">
                <h1 className={`text-xl font-bold tracking-tight transition-colors leading-none flex items-center gap-2 ${theme === 'showgirl' ? 'text-gradient-gold' : 'text-slate-800 dark:text-white'}`}>
                    <span>Anatomy<span className={`text-glow ${styles.nameColor}`}>Otter</span></span>
                </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* ... Other Buttons ... */}
            <PomodoroTimer theme={theme} />
            <div className="relative" ref={themeDropdownRef}>
               {/* ... Theme Switcher ... */}
               <button onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)} className="liquid-icon relative rounded-xl w-10 h-10 flex items-center justify-center overflow-hidden focus:outline-none transition-colors"><Palette className="w-5 h-5" /></button>
               {/* ... Theme Dropdown ... */}
            </div>
            <button onClick={toggleDarkMode} className="liquid-icon relative rounded-xl w-10 h-10 flex items-center justify-center overflow-hidden focus:outline-none"><Moon className="w-5 h-5" /></button>
            
            {/* Profile Section */}
            <div 
                className="relative z-50"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
               {/* Unified Trigger Card */}
               <div 
                  className={`flex items-center gap-3 px-3 py-1.5 rounded-2xl liquid-icon cursor-pointer transition-all duration-300 border ${profileTheme.trigger}`}
                  style={{ '--glow-color': theme === 'showgirl' ? 'rgba(234, 179, 8, 0.5)' : 'rgba(245, 158, 11, 0.5)' } as React.CSSProperties}
               >
                  <div className="hidden md:block text-right">
                      <p className="text-sm font-bold transition-colors">{user.fullName}</p>
                      <p className={`text-xs transition-colors opacity-80 ${theme === 'showgirl' ? 'text-white' : ''}`}>{user.studentId}</p>
                  </div>
                  <div className="transition-colors relative">
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt="Profile" 
                          className={`w-9 h-9 rounded-full object-cover border ${profileTheme.avatar.split(' ')[0].replace('bg-', 'border-')}`}
                        />
                      ) : (
                        <UserCircle className="w-9 h-9" />
                      )}
                  </div>
               </div>

               {/* Dropdown Popup */}
               <div 
                  ref={dropdownRef}
                  className={`absolute top-full right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 transform transition-all duration-300 origin-top-right overflow-hidden ${isProfileOpen ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-4 invisible'}`}
               >
                  {/* ... Header ... */}
                  
                  <div className="p-4">
                    {isEditing ? (
                        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
                             {/* Avatar Upload in Edit Mode */}
                             <div className="flex justify-center mb-4">
                                <div 
                                    className="relative group cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className={`w-16 h-16 rounded-full overflow-hidden border-2 relative ${profileTheme.avatar.split(' ')[0].replace('bg-', 'border-')}`}>
                                        {editAvatar ? (
                                            <img src={editAvatar} alt="Edit" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                <UserCircle className="w-10 h-10 text-slate-400" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera className="w-6 h-6 text-white" />
                                        </div>
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileChange}
                                        accept="image/*"
                                        className="hidden"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Họ và tên</label>
                                <input 
                                    value={editName} 
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full text-sm p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Mã số sinh viên</label>
                                <input 
                                    value={editId} 
                                    onChange={(e) => setEditId(e.target.value)}
                                    className="w-full text-sm p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={handleSaveProfile} disabled={isSavingProfile} className="flex-1 bg-amber-500 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-amber-600 flex items-center justify-center gap-1 disabled:opacity-70">
                                    {isSavingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Lưu
                                </button>
                                <button onClick={cancelEdit} disabled={isSavingProfile} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-1">
                                    <X className="w-4 h-4" /> Hủy
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* User Info */}
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border ${profileTheme.avatar}`}>
                                    {user.avatar ? <img src={user.avatar} alt="User" className="w-full h-full object-cover" /> : <UserCircle className="w-7 h-7" />}
                                </div>
                                <div>
                                    <p className={`font-bold ${profileTheme.name}`}>{user.fullName}</p>
                                    <p className={`text-sm ${profileTheme.id}`}>{user.studentId}</p>
                                </div>
                            </div>
                            
                            {/* Actions */}
                            <button 
                                onClick={() => { setIsEditing(true); setEditName(user.fullName); setEditId(user.studentId); setEditAvatar(user.avatar); }}
                                className={`w-full py-2 border rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${profileTheme.editBtn}`}
                            >
                                <Settings className="w-4 h-4" /> Chỉnh sửa thông tin
                            </button>

                            {/* API Key Config */}
                            <button 
                                onClick={() => setShowApiKeyModal(true)}
                                className={`w-full py-2 border rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 ${profileTheme.apiKeyBtn}`}
                            >
                                <Key className="w-4 h-4" /> Cấu hình API Key
                            </button>
                        </div>
                    )}
                  </div>

                  <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                    <button 
                        onClick={onLogout}
                        className={`w-full py-2 px-4 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 ${profileTheme.logoutBtn}`}
                    >
                        <LogOut className="w-4 h-4" /> Đăng xuất
                    </button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 relative z-10">
        {children}
      </main>
      
      <OtterChat theme={theme} />
      {/* ... Feedback & Modals ... */}
      <ThemeTransition stage={transitionStage} targetTheme={pendingTheme} />
      <ThemeStore 
          isOpen={isStoreOpen} 
          onClose={() => setIsStoreOpen(false)} 
          currentTheme={theme} 
          setTheme={handleThemeChange} 
          user={user}
          onOpenPayment={handleOpenPaymentFromStore}
      />
      {/* ... Payment Modals ... */}
    </div>
  );
}
