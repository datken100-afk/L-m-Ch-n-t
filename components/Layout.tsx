
import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun, UserCircle, LogOut, Settings, Check, X, Camera, Upload, Loader2, Sparkles, Gift, ExternalLink, FileText, Mail, Keyboard, Music, Palette, Key, AlertTriangle, Lock, CheckCircle, Star, Heart, Copy, Coffee, Ticket, Trees, ShoppingBag, Feather, Flame } from 'lucide-react';
import { UserProfile } from '../types';
import { OtterChat } from './OtterChat';
import { ThemeType } from '../App';
import { ThemeTransition } from './ThemeTransition';
import { STORAGE_API_KEY } from '../services/geminiService';
import { PomodoroTimer } from './PomodoroTimer';
import { ThemeStore } from './ThemeStore';

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

  // --- Falling Animation Logic ---
  useEffect(() => {
    if (theme === 'default') return;

    const container = fallingContainerRef.current;
    if (!container) return;

    // Xmas Icons
    const xmasIcons = ['❄️', '🎄', '🎁', '🎅', '🔔', '🍪', '⛄', '🦌', '⭐', '🧊'];
    // Taylor Swift Eras Icons
    const swiftIcons = ['🤠', '💛', '💜', '🧣', '🕶️', '🐍', '🦋', '🧶', '🧥', '🕰️', '🤍'];
    // Blackpink & Solos Icons
    const bpIcons = ['🖤', '💗', '🔨', '💸', '⭐', '🍓', '🏎️', '🌹', '🥂', '🌸', '🐰'];
    // aespa Icons
    const aespaIcons = ['👽', '👾', '🪐', '💿', '⛓️', '🌌', '🦋', '💜', '🤖', '⭐'];
    // Rosie Icons
    const rosieIcons = ['🌹', '🍷', '⚡', '👱‍♀️', '🎸', '✨', '💋', '💿'];
    // PKL Icons (Sword, Swan, Shield, Note, Sparkle, Heart)
    const pklIcons = ['🗡️', '🦢', '🛡️', '✨', '💙', '⚔️', '🧊', '🎶'];
    // Showgirl Icons
    const showgirlIcons = ['💎', '💃', '👠', '✨', '🪩', '💄', '🦢', '📸', '🥂', '🧡'];
    // 1989 Icons
    const icons1989 = ['🕊️', '🏙️', '☁️', '✈️', '🕶️', '📷', '🐚', '🏖️'];
    // Folklore Icons
    const folkloreIcons = ['🌲', '🍃', '🎹', '🧶', '🩶', '🍂', '🌫️'];
    // Evermore Icons
    const evermoreIcons = ['🍂', '🧥', '🕯️', '🌲', '🧡', '🪵', '🥂'];
    // TTPD Icons
    const ttpdIcons = ['🖋️', '📜', '🤍', '🎼', '🏛️', '🪜', '🥀'];

    let icons = xmasIcons;
    if (theme === 'swift') icons = swiftIcons;
    if (theme === 'blackpink') icons = bpIcons;
    if (theme === 'aespa') icons = aespaIcons;
    if (theme === 'rosie') icons = rosieIcons;
    if (theme === 'pkl') icons = pklIcons;
    if (theme === 'showgirl') icons = showgirlIcons;
    if (theme === '1989') icons = icons1989;
    if (theme === 'folklore') icons = folkloreIcons;
    if (theme === 'evermore') icons = evermoreIcons;
    if (theme === 'ttpd') icons = ttpdIcons;
    
    const createItem = () => {
       if (container.childElementCount > 25) return;

       const item = document.createElement('div');
       item.className = 'xmas-item'; 
       item.innerText = icons[Math.floor(Math.random() * icons.length)];
       
       const left = Math.random() * 100; 
       const duration = Math.random() * 5 + 5; 
       const size = Math.random() * 1.5 + 1; 
       const sway = (Math.random() - 0.5) * 200; 
       
       item.style.left = `${left}%`;
       item.style.fontSize = `${size}rem`;
       
       // 1989: Float sideways more like birds
       if (theme === '1989') {
           const direction = Math.random() > 0.5 ? 1 : -1;
           item.style.animation = `xmas-fall ${duration * 1.5}s linear forwards`;
           item.style.setProperty('--sway', `${sway * 2}px`);
       } else if (theme === 'folklore') {
           // Folklore: Slower, drifting leaves style
           item.style.animation = `xmas-fall ${duration * 1.5}s ease-in-out forwards`;
           item.style.setProperty('--sway', `${sway * 1.5}px`);
           item.style.opacity = '0.7';
       } else if (theme === 'evermore') {
           // Evermore: Falling autumn leaves, slightly faster than folklore
           item.style.animation = `xmas-fall ${duration * 1.2}s ease-in-out forwards`;
           item.style.setProperty('--sway', `${sway * 1.8}px`);
           item.style.opacity = '0.9';
           item.style.filter = 'sepia(0.5) hue-rotate(-30deg)'; // Warm tone
       } else if (theme === 'ttpd') {
           // TTPD: Falling paper/feathers, light sway
           item.style.animation = `xmas-fall ${duration * 1.8}s ease-in-out forwards`;
           item.style.setProperty('--sway', `${sway * 0.8}px`);
           item.style.opacity = '0.6';
           item.style.filter = 'sepia(0.8)'; // Sepia tone
       } else {
           item.style.animation = `xmas-fall ${duration}s linear forwards`;
           item.style.setProperty('--sway', `${sway}px`);
       }
       
       // Style adjustments
       if (theme === 'blackpink') {
           item.style.filter = 'drop-shadow(0 0 5px rgba(236, 72, 153, 0.8))';
       } else if (theme === 'aespa') {
           item.style.filter = 'drop-shadow(0 0 8px rgba(167, 139, 250, 0.8))';
       } else if (theme === 'rosie') {
           item.style.filter = 'drop-shadow(0 0 5px rgba(225, 29, 72, 0.6))';
       } else if (theme === 'pkl') {
           item.style.filter = 'drop-shadow(0 0 5px rgba(6, 182, 212, 0.6))'; // Cyan/Blue glow
       } else if (theme === 'showgirl') {
           item.style.filter = 'drop-shadow(0 0 8px rgba(234, 179, 8, 0.6))'; // Gold glow
           item.style.textShadow = '0 0 10px rgba(234, 179, 8, 0.8)';
       } else if (theme === 'swift') {
           item.style.filter = 'drop-shadow(0 0 8px rgba(168, 85, 247, 0.6))'; // Purple glow
           item.style.textShadow = '0 0 10px rgba(168, 85, 247, 0.5)';
       } else if (theme === '1989') {
           item.style.filter = 'drop-shadow(0 2px 4px rgba(56, 189, 248, 0.4))'; // Sky blue shadow
           item.style.opacity = '0.8';
       } else if (theme === 'folklore') {
           item.style.filter = 'grayscale(100%) contrast(1.2) drop-shadow(0 2px 4px rgba(0,0,0,0.2))'; // Silver/Grayscale
       } else if (theme === 'evermore') {
           item.style.filter = 'contrast(1.1) saturate(1.2) drop-shadow(0 2px 4px rgba(194,65,12,0.2))'; // Rust glow
       } else {
           item.style.textShadow = '0 0 5px rgba(255,255,255,0.5), 0 0 2px rgba(0,0,0,0.1)';
       }

       container.appendChild(item);
       
       setTimeout(() => {
         if (item && item.parentNode) {
             item.remove();
         }
       }, duration * 1000);
    };

    const interval = setInterval(createItem, 800);
    return () => clearInterval(interval);
  }, [theme]);

  // --- EASTER EGG RANDOM TRIGGER LOGIC ---
  useEffect(() => {
    if (theme === 'default') return;

    const interval = setInterval(() => {
        // 10% chance every 30 seconds to trigger peeking if not active
        if (Math.random() > 0.9 && easterEggState === 'hidden') {
             triggerEasterEggSequence();
        }
    }, 30000);
    return () => clearInterval(interval);
  }, [easterEggState, theme]);

  const triggerEasterEggSequence = () => {
      if (theme === 'default' || easterEggState !== 'hidden') return;
      
      // Phase 1: Peek
      setEasterEggState('peeking');
      
      // Phase 2: Action (Scream or Hiss) after 2s
      setTimeout(() => {
          setEasterEggState('screaming');
          
          // Phase 3: Retreat (after 4s of action)
          setTimeout(() => {
              setEasterEggState('hidden');
          }, 4000);
      }, 2000);
  };

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

  const handleSaveProfile = () => {
    if (editName.trim() && editId.trim()) {
        onUpdateUser({ 
            fullName: editName, 
            studentId: editId,
            avatar: editAvatar
        });
        setIsEditing(false);
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
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditAvatar(reader.result as string);
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
                  // VIP Gradient: Midnight Blue -> Indigo -> Pink (Bejeweled style)
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
          case 'blackpink': return {
              trigger: 'bg-pink-50 hover:bg-pink-100 dark:bg-pink-900/20 dark:hover:bg-pink-900/40 text-pink-700 dark:text-pink-200 border-pink-200 dark:border-pink-800',
              avatar: 'bg-pink-100 dark:bg-pink-800 text-pink-600 dark:text-pink-200 border-pink-200 dark:border-pink-700',
              label: 'text-pink-400 dark:text-pink-500',
              name: 'text-pink-700 dark:text-pink-200',
              id: 'text-pink-400 dark:text-pink-400',
              editBtn: 'border-pink-200 text-pink-600 hover:bg-pink-50 dark:border-pink-800 dark:text-pink-400 dark:hover:bg-pink-900/20',
              apiKeyBtn: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800 dark:hover:bg-pink-900/30',
              logoutBtn: 'text-pink-600 hover:bg-pink-50 dark:text-pink-400 dark:hover:bg-pink-900/20'
          };
          case 'aespa': return {
              trigger: 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-200 border-indigo-200 dark:border-indigo-800',
              avatar: 'bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-200 border-indigo-200 dark:border-indigo-700',
              label: 'text-indigo-400 dark:text-indigo-500',
              name: 'text-indigo-700 dark:text-indigo-200',
              id: 'text-indigo-400 dark:text-indigo-400',
              editBtn: 'border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/20',
              apiKeyBtn: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800 dark:hover:bg-indigo-900/30',
              logoutBtn: 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20'
          };
          case 'rosie': return {
              trigger: 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-200 border-rose-200 dark:border-rose-800',
              avatar: 'bg-rose-100 dark:bg-rose-800 text-rose-600 dark:text-rose-200 border-rose-200 dark:border-rose-700',
              label: 'text-rose-400 dark:text-rose-500',
              name: 'text-rose-700 dark:text-rose-200',
              id: 'text-rose-400 dark:text-rose-400',
              editBtn: 'border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20',
              apiKeyBtn: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800 dark:hover:bg-rose-900/30',
              logoutBtn: 'text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20'
          };
          case 'pkl': return {
              trigger: 'bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:hover:bg-cyan-900/40 text-cyan-700 dark:text-cyan-200 border-cyan-200 dark:border-cyan-800',
              avatar: 'bg-cyan-100 dark:bg-cyan-800 text-cyan-600 dark:text-cyan-200 border-cyan-200 dark:border-cyan-700',
              label: 'text-cyan-400 dark:text-cyan-500',
              name: 'text-cyan-700 dark:text-cyan-200',
              id: 'text-cyan-400 dark:text-cyan-400',
              editBtn: 'border-cyan-200 text-cyan-600 hover:bg-cyan-50 dark:border-cyan-800 dark:text-cyan-400 dark:hover:bg-cyan-900/20',
              apiKeyBtn: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800 dark:hover:bg-cyan-900/30',
              logoutBtn: 'text-cyan-600 hover:bg-cyan-50 dark:text-cyan-400 dark:hover:bg-cyan-900/20'
          };
          case 'showgirl': return {
              // Gold/Orange Vibe
              trigger: 'bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40 text-orange-800 dark:text-orange-100 border-orange-200 dark:border-orange-700',
              avatar: 'bg-orange-100 dark:bg-orange-800 text-orange-600 dark:text-orange-200 border-orange-200 dark:border-orange-700 ring-2 ring-orange-100 dark:ring-orange-900',
              label: 'text-orange-400 dark:text-orange-500',
              name: 'text-orange-800 dark:text-orange-100',
              id: 'text-orange-500 dark:text-orange-400',
              editBtn: 'border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-300 dark:hover:bg-orange-900/20',
              apiKeyBtn: 'bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border-orange-200 hover:from-orange-100 hover:to-amber-100 dark:from-orange-900/20 dark:to-amber-900/20 dark:text-orange-300 dark:border-orange-800',
              logoutBtn: 'text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
          };
          case '1989': return {
              // Sky Blue/Beige Vibe
              trigger: 'bg-gradient-to-r from-sky-100 to-blue-100 dark:from-sky-900/40 dark:to-blue-900/40 text-sky-800 dark:text-sky-100 border-sky-200 dark:border-sky-700',
              avatar: 'bg-sky-100 dark:bg-sky-800 text-sky-600 dark:text-sky-200 border-sky-200 dark:border-sky-700 ring-2 ring-sky-100 dark:ring-sky-900',
              label: 'text-sky-400 dark:text-sky-500',
              name: 'text-sky-800 dark:text-sky-100',
              id: 'text-sky-500 dark:text-sky-400',
              editBtn: 'border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-300 dark:hover:bg-sky-900/20',
              apiKeyBtn: 'bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 border-sky-200 hover:from-sky-100 hover:to-blue-100 dark:from-sky-900/20 dark:to-blue-900/20 dark:text-sky-300 dark:border-sky-800',
              logoutBtn: 'text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
          };
          case 'folklore': return {
              // Silver/Zinc/Slate Vibe (Grayscale)
              trigger: 'bg-gradient-to-r from-zinc-100 to-slate-100 dark:from-zinc-800 dark:to-slate-800 text-slate-800 dark:text-zinc-200 border-zinc-300 dark:border-zinc-600',
              avatar: 'bg-zinc-100 dark:bg-zinc-700 text-slate-600 dark:text-zinc-200 border-zinc-300 dark:border-zinc-600 ring-2 ring-zinc-200 dark:ring-zinc-700',
              label: 'text-slate-500 dark:text-zinc-400 font-serif italic',
              name: 'text-slate-800 dark:text-zinc-100 font-serif',
              id: 'text-slate-500 dark:text-zinc-400 font-mono',
              editBtn: 'border-zinc-300 text-slate-700 hover:bg-zinc-100 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800',
              apiKeyBtn: 'bg-gradient-to-r from-zinc-50 to-slate-50 text-slate-700 border-zinc-300 hover:from-zinc-100 hover:to-slate-100 dark:from-zinc-800 dark:to-slate-800 dark:text-zinc-300 dark:border-zinc-600',
              logoutBtn: 'text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
          };
          case 'ttpd': return {
              // TTPD Vibe (Sepia/Stone/Parchment)
              trigger: 'bg-stone-100 dark:bg-stone-900/60 text-stone-800 dark:text-stone-200 border-stone-300 dark:border-stone-700',
              avatar: 'bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-700 ring-2 ring-stone-200 dark:ring-stone-800',
              label: 'text-stone-500 dark:text-stone-400 font-serif italic',
              name: 'text-stone-900 dark:text-stone-100 font-serif',
              id: 'text-stone-500 dark:text-stone-400 font-mono',
              editBtn: 'border-stone-300 text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800 font-serif',
              apiKeyBtn: 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100 dark:bg-stone-900/30 dark:text-stone-300 dark:border-stone-700 dark:hover:bg-stone-900/50 font-serif',
              logoutBtn: 'text-stone-600 hover:text-red-600 hover:bg-stone-50 dark:text-stone-400 dark:hover:text-red-400 dark:hover:bg-stone-900/20 font-serif'
          };
          case 'evermore': return {
              // Evermore Vibe (Rust/Amber/Forest)
              trigger: 'bg-orange-50 dark:bg-orange-900/30 text-orange-900 dark:text-orange-100 border-orange-200 dark:border-orange-800',
              avatar: 'bg-orange-100 dark:bg-orange-800 text-orange-700 dark:text-orange-200 border-orange-200 dark:border-orange-700 ring-2 ring-orange-200 dark:ring-orange-900',
              label: 'text-orange-500 dark:text-orange-400 font-serif italic',
              name: 'text-orange-900 dark:text-orange-100 font-serif',
              id: 'text-orange-600 dark:text-orange-400 font-mono',
              editBtn: 'border-orange-300 text-orange-800 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/20 font-serif',
              apiKeyBtn: 'bg-orange-50 text-orange-800 border-orange-300 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700 dark:hover:bg-orange-900/50 font-serif',
              logoutBtn: 'text-orange-700 hover:text-red-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:text-red-400 dark:hover:bg-orange-900/20 font-serif'
          };
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

  // Easter Egg Content Map
  const getEasterEggContent = () => {
      if (theme === 'xmas') return { text: "IT'S TIMEEEEE!", icon: '🎄', img: "https://i.scdn.co/image/ab67616d0000b2734246e3158421f5abb75abc4f", bg: 'bg-red-100', border: 'border-red-600 text-red-600' };
      if (theme === 'swift') return { text: "ARE YOU READY?", icon: '🐍', img: "https://em-content.zobj.net/source/microsoft-teams/337/snake_1f40d.png", bg: 'bg-purple-100', border: 'border-indigo-800 text-indigo-800' };
      if (theme === 'blackpink') return { text: "BLACKPINK!", icon: '🔨', img: null, bg: 'bg-slate-900', border: 'border-pink-500 text-pink-500' };
      if (theme === 'aespa') return { text: "SUPERNOVA!", icon: '🪐', img: null, bg: 'bg-slate-900', border: 'border-purple-500 text-purple-500' };
      if (theme === 'rosie') return { text: "APT. APT.!", icon: '⚡', img: null, bg: 'bg-rose-950', border: 'border-rose-500 text-rose-500' };
      if (theme === 'pkl') return { text: "KHÓC BLOCK", icon: '⚔️', img: null, bg: 'bg-slate-800', border: 'border-cyan-500 text-cyan-500' };
      if (theme === 'showgirl') return { text: "OPALITE", icon: '💎', img: null, bg: 'bg-gradient-to-br from-teal-900 to-orange-900', border: 'border-yellow-500 text-yellow-500' };
      if (theme === '1989') return { text: "WELCOME TO NEW YORK", icon: '🕊️', img: null, bg: 'bg-gradient-to-br from-sky-200 to-blue-200', border: 'border-sky-500 text-sky-600' };
      if (theme === 'folklore') return { text: "I'm doing good, I'm on some new shit", icon: '🌲', img: null, bg: 'bg-gradient-to-br from-gray-200 to-slate-300', border: 'border-slate-500 text-slate-600' };
      if (theme === 'ttpd') return { text: "I love you, it's ruining my life", icon: '🖋️', img: null, bg: 'bg-[#f5f5f4]', border: 'border-stone-500 text-stone-700' };
      if (theme === 'evermore') return { text: "Long story short, I survived", icon: '🍂', img: null, bg: 'bg-amber-50', border: 'border-orange-700 text-orange-800' };
      return null;
  };
  const egg = getEasterEggContent();

  // VietQR Link Generation
  // Bank: MB (Military Bank)
  // Account: 0766377925
  // Name: LAM CHAN DAT
  const qrAmount = 50000;
  const qrContentShowgirl = `${user.studentId} MUA GIAO DIEN SHOWGIRL`;
  const qrUrlShowgirl = `https://img.vietqr.io/image/MB-0766377925-compact.png?amount=${qrAmount}&addInfo=${encodeURIComponent(qrContentShowgirl)}&accountName=LAM%20CHAN%20DAT`;

  const qrContent1989 = `${user.studentId} MUA GIAO DIEN 1989`;
  const qrUrl1989 = `https://img.vietqr.io/image/MB-0766377925-compact.png?amount=${qrAmount}&addInfo=${encodeURIComponent(qrContent1989)}&accountName=LAM%20CHAN%20DAT`;

  const qrContentFolklore = `${user.studentId} MUA GIAO DIEN FOLKLORE`;
  const qrUrlFolklore = `https://img.vietqr.io/image/MB-0766377925-compact.png?amount=${qrAmount}&addInfo=${encodeURIComponent(qrContentFolklore)}&accountName=LAM%20CHAN%20DAT`;

  // General Donate QR (No specific amount/content forced)
  const donateQrUrl = `https://img.vietqr.io/image/MB-0766377925-compact.png?accountName=LAM%20CHAN%20DAT`;

  return (
    <div className={`min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative 
        ${theme === 'showgirl' ? 'bg-showgirl-depth' : ''}
        ${theme === 'swift' ? 'bg-[#1a1a2e] dark:bg-[#0f0f1a]' : ''}
        ${theme === '1989' ? 'bg-sky-50 dark:bg-slate-900' : ''}
        ${theme === 'folklore' ? 'bg-zinc-100 dark:bg-zinc-900' : ''}
        ${theme === 'ttpd' ? 'bg-[#f5f5f4] dark:bg-[#1c1917]' : ''}
        ${theme === 'evermore' ? 'bg-[#fffbeb] dark:bg-[#271c19]' : ''}
    `}>
      
      {/* THEME SPECIFIC BACKGROUND FX */}
      {theme === 'showgirl' && (
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div className="spotlight-beam left-1/4 -ml-12 animate-spotlight"></div>
            <div className="spotlight-beam right-1/4 -mr-12 animate-spotlight" style={{ animationDelay: '-2s' }}></div>
            <div className="absolute inset-0 stage-curtain mix-blend-overlay"></div>
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-teal-900/20 to-transparent"></div>
        </div>
      )}

      {/* TTPD ATMOSPHERE */}
      {theme === 'ttpd' && (
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
              {/* Paper Texture Overlay */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] opacity-40 mix-blend-multiply dark:mix-blend-overlay"></div>
              
              {/* Fog / Blur */}
              <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-stone-200/50 to-transparent dark:from-stone-900/50 dark:to-transparent blur-3xl"></div>
              
              {/* Floating Letters */}
              {[...Array(6)].map((_, i) => (
                  <div 
                      key={i}
                      className="absolute text-stone-400/20 font-serif italic"
                      style={{
                          top: `${Math.random() * 100}%`,
                          left: `${Math.random() * 100}%`,
                          fontSize: `${Math.random() * 2 + 1}rem`,
                          animation: `float-letter ${10 + Math.random() * 20}s linear infinite`,
                          animationDelay: `${Math.random() * 5}s`,
                          transform: `rotate(${Math.random() * 30 - 15}deg)`
                      }}
                  >
                      {['a', 'b', 'c', '...', '?', '!', '🖋️'][i % 7]}
                  </div>
              ))}
              
              <style>{`
                  @keyframes float-letter {
                      0% { transform: translateY(0) rotate(0deg); opacity: 0; }
                      20% { opacity: 0.4; }
                      80% { opacity: 0.4; }
                      100% { transform: translateY(-100px) rotate(10deg); opacity: 0; }
                  }
              `}</style>
          </div>
      )}

      {/* EVERMORE ATMOSPHERE (Autumn Leaves + Flannel) */}
      {theme === 'evermore' && (
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
              {/* Flannel Pattern Overlay */}
              <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_50px,rgba(194,65,12,0.03)_50px,rgba(194,65,12,0.03)_51px),repeating-linear-gradient(0deg,transparent,transparent_50px,rgba(194,65,12,0.03)_50px,rgba(194,65,12,0.03)_51px)]"></div>
              
              {/* Falling Leaves */}
              {[...Array(12)].map((_, i) => (
                  <div 
                      key={i}
                      className="absolute text-orange-700/20 dark:text-orange-300/20 animate-[float_15s_linear_infinite]"
                      style={{
                          top: `${Math.random() * 100}%`,
                          left: `${Math.random() * 100}%`,
                          fontSize: `${1 + Math.random()}rem`,
                          animationDuration: `${15 + Math.random() * 10}s`,
                          animationDelay: `${Math.random() * 10}s`,
                          transform: `rotate(${Math.random() * 360}deg)`
                      }}
                  >
                      {Math.random() > 0.5 ? '🍂' : '🍁'}
                  </div>
              ))}
              
              {/* Vignette Warmth */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(124,45,18,0.05)_100%)] dark:bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]"></div>
          </div>
      )}

      {/* SWIFT VIP ATMOSPHERE (Lavender Haze + Midnight Rain) */}
      {theme === 'swift' && (
         <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            {/* Drifting Clouds/Fog */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/foggy-birds.png')] opacity-20 animate-[pulse_10s_infinite] mix-blend-soft-light"></div>
            <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-gradient-to-br from-purple-900/10 via-transparent to-indigo-900/10 animate-[spin_60s_linear_infinite]"></div>
            {/* Floating Particles (Stars/Glitter) */}
            {[...Array(20)].map((_, i) => (
                <div 
                    key={i} 
                    className="absolute rounded-full bg-white blur-[1px] opacity-30 animate-pulse shadow-[0_0_5px_white]"
                    style={{
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        width: `${Math.random() * 3 + 1}px`,
                        height: `${Math.random() * 3 + 1}px`,
                        animationDuration: `${Math.random() * 3 + 2}s`
                    }}
                ></div>
            ))}
         </div>
      )}

      {/* 1989 ATMOSPHERE (Sky Blue & Seagulls) */}
      {theme === '1989' && (
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
              {/* Gradient Sky */}
              <div className="absolute inset-0 bg-gradient-to-b from-sky-200/30 to-orange-50/30 dark:from-sky-900/20 dark:to-slate-900/80"></div>
              
              {/* Clouds */}
              <div className="absolute top-20 left-10 text-9xl opacity-10 animate-[pulse_8s_infinite]">☁️</div>
              <div className="absolute top-40 right-20 text-8xl opacity-10 animate-[pulse_10s_infinite]" style={{animationDelay: '2s'}}>☁️</div>
              
              {/* Seagulls (Custom SVG) */}
              {[...Array(5)].map((_, i) => (
                  <div 
                      key={i}
                      className="absolute text-slate-400/30 dark:text-slate-600/30"
                      style={{
                          top: `${10 + Math.random() * 40}%`,
                          left: `-50px`,
                          fontSize: `${1 + Math.random() * 2}rem`,
                          animation: `seagull-fly ${15 + Math.random() * 10}s linear infinite`,
                          animationDelay: `${Math.random() * 10}s`
                      }}
                  >
                      🕊️
                  </div>
              ))}
              
              <style>{`
                  @keyframes seagull-fly {
                      0% { transform: translateX(-100px) translateY(0) rotate(5deg); opacity: 0; }
                      10% { opacity: 0.6; }
                      50% { transform: translateX(50vw) translateY(-20px) rotate(0deg); }
                      90% { opacity: 0.6; }
                      100% { transform: translateX(100vw) translateY(10px) rotate(-5deg); opacity: 0; }
                  }
              `}</style>
          </div>
      )}

      {/* FOLKLORE ATMOSPHERE (Foggy Woods) */}
      {theme === 'folklore' && (
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
              {/* Fog Overlay */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/foggy-birds.png')] opacity-10 mix-blend-overlay animate-[pulse_20s_infinite]"></div>
              
              {/* Floating Leaves / Sparkles (Silver) */}
              {[...Array(10)].map((_, i) => (
                  <div 
                      key={i}
                      className="absolute text-zinc-400/30 animate-[float_15s_linear_infinite]"
                      style={{
                          top: `${Math.random() * 100}%`,
                          left: `${Math.random() * 100}%`,
                          fontSize: `${0.5 + Math.random()}rem`,
                          animationDuration: `${10 + Math.random() * 20}s`,
                          animationDelay: `${Math.random() * 10}s`
                      }}
                  >
                      {Math.random() > 0.5 ? '🍃' : '✨'}
                  </div>
              ))}
              
              {/* Vignette */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.1)_100%)] dark:bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.5)_100%)]"></div>
              
              <style>{`
                  @keyframes float {
                      0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
                      20% { opacity: 0.5; }
                      80% { opacity: 0.5; }
                      100% { transform: translateY(100vh) translateX(50px) rotate(360deg); opacity: 0; }
                  }
              `}</style>
          </div>
      )}

      {/* TRANSITION OVERLAY */}
      <ThemeTransition stage={transitionStage} targetTheme={pendingTheme} />

      {/* THEME STORE MODAL */}
      <ThemeStore 
          isOpen={isStoreOpen} 
          onClose={() => setIsStoreOpen(false)} 
          currentTheme={theme} 
          setTheme={handleThemeChange} 
          user={user}
          onOpenPayment={handleOpenPaymentFromStore}
      />

      {/* FALLING ITEMS OVERLAY (Only if NOT Default) */}
      {theme !== 'default' && <div ref={fallingContainerRef} className="xmas-container"></div>}

      {/* TTPD GIFT MODAL */}
      {showTTPDGift && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#1c1917]/80 backdrop-blur-sm animate-in fade-in duration-700 font-serif">
              <div className="relative max-w-md w-full mx-4 animate-in slide-in-from-bottom-8 duration-700">
                  <div className="bg-[#f5f5f4] dark:bg-[#292524] p-8 rounded-sm shadow-2xl border border-stone-400 relative overflow-hidden">
                      {/* Letterhead Styling */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-stone-800 dark:bg-stone-500"></div>
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-800 dark:bg-stone-500"></div>
                      
                      <div className="text-center mb-6">
                          <div className="w-16 h-16 mx-auto bg-stone-200 dark:bg-stone-700 rounded-full flex items-center justify-center mb-4 border border-stone-400">
                              <Feather className="w-8 h-8 text-stone-700 dark:text-stone-300" />
                          </div>
                          <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-200 uppercase tracking-widest mb-1">
                              THE CHAIRMAN'S MEMO
                          </h2>
                          <p className="text-xs text-stone-500 uppercase tracking-widest">
                              Est. 2024 • The Tortured Poets Dept.
                          </p>
                      </div>

                      <div className="bg-white dark:bg-[#1c1917] p-6 border border-stone-200 dark:border-stone-700 shadow-inner mb-6 relative">
                          <div className="absolute -left-1 top-4 bottom-4 w-1 border-l-2 border-dotted border-stone-300"></div>
                          <p className="text-stone-700 dark:text-stone-300 text-sm leading-relaxed italic mb-4">
                              "Gửi thành viên mới,<br/><br/>
                              Chào mừng đến với Bộ phận. Chúng tôi đã để dành một chỗ ngồi cho bạn. Không cần vé vào cửa trong thời gian này. Hãy lấy bút và bắt đầu viết nên câu chuyện của riêng mình."
                          </p>
                          <p className="text-right text-xs font-bold text-stone-500 uppercase">
                              - The Chairman
                          </p>
                      </div>

                      <button
                          onClick={onCloseTTPDGift}
                          className="w-full py-3 bg-stone-800 hover:bg-stone-700 dark:bg-stone-200 dark:hover:bg-stone-300 text-stone-100 dark:text-stone-900 font-bold uppercase tracking-widest transition-colors shadow-lg border border-stone-600"
                      >
                          Enter The Department
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* SWIFT GIFT MODAL */}
      {showSwiftGift && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-700">
              <div className="relative max-w-lg w-full mx-4 animate-in zoom-in-90 slide-in-from-bottom-10 duration-700">
                   {/* Confetti Burst Effect (Visual only) */}
                   <div className="absolute -top-20 -left-20 w-40 h-40 bg-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
                   <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-pink-500/30 rounded-full blur-3xl animate-pulse"></div>

                   {/* Ticket Container */}
                   <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-1 rounded-[2rem] shadow-[0_0_60px_rgba(168,85,247,0.6)] transform rotate-1 hover:rotate-0 transition-transform duration-500">
                       <div className="bg-white dark:bg-[#1a1a2e] rounded-[1.9rem] p-8 relative overflow-hidden border-2 border-white/20 flex flex-col items-center text-center">
                           
                           {/* Ticket Stub Line */}
                           <div className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-10 bg-black/80 rounded-r-full border-r border-white/20"></div>
                           <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-10 bg-black/80 rounded-l-full border-l border-white/20"></div>
                           <div className="absolute left-6 right-6 top-1/2 border-t-2 border-dashed border-white/20 pointer-events-none opacity-50"></div>

                           {/* Content */}
                           <div className="mb-8 relative z-10">
                               <div className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-400 to-purple-600 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-purple-200 mb-4">
                                   <span className="text-5xl animate-bounce">🐍</span>
                               </div>
                               <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-300 dark:via-purple-300 dark:to-pink-300 mb-1 uppercase tracking-tighter drop-shadow-md">
                                   THE ERAS TOUR
                               </h2>
                               <p className="font-mono text-sm text-slate-500 dark:text-slate-300 tracking-[0.3em] uppercase">
                                   (Otter's Version)
                               </p>
                           </div>

                           <div className="bg-slate-50/80 dark:bg-white/5 p-6 rounded-xl border border-slate-100 dark:border-white/10 mb-8 relative z-10 backdrop-blur-sm w-full shadow-inner">
                               <div className="flex justify-between items-center mb-3 pb-3 border-b border-dashed border-slate-300 dark:border-white/20">
                                   <div className="text-left">
                                       <p className="text-xs text-slate-400 uppercase font-bold">ADMIT</p>
                                       <p className="text-lg font-black text-slate-800 dark:text-white">ONE</p>
                                   </div>
                                   <div className="text-right">
                                       <p className="text-xs text-slate-400 uppercase font-bold">SECTION</p>
                                       <p className="text-lg font-black text-purple-500">VIP</p>
                                   </div>
                               </div>
                               <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                   Bạn đã nhận được <strong>VIP Package</strong> độc quyền! Tận hưởng giao diện mới với hiệu ứng đặc biệt và năng lượng từ Taylor Swift.
                               </p>
                           </div>

                           <button
                               onClick={onCloseSwiftGift}
                               className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold text-lg shadow-lg shadow-purple-500/40 transition-all hover:scale-[1.02] active:scale-95 relative z-10 flex items-center justify-center gap-2 hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]"
                           >
                               <Ticket className="w-5 h-5" />
                               <span>Nhận vé & Vào học</span>
                           </button>
                           
                           {/* Background texture */}
                           <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 pointer-events-none mix-blend-overlay"></div>
                       </div>
                   </div>
              </div>
          </div>
      )}

      {/* DONATE MODAL */}
      {showDonateModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-300 p-4">
            <div className={`relative bg-white dark:bg-slate-900 rounded-[2rem] p-6 max-w-[360px] w-full shadow-2xl animate-in zoom-in-95 overflow-hidden border-2 ${
                theme === 'showgirl' ? 'border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.4)]' :
                theme === 'swift' ? 'border-purple-500 shadow-[0_0_40px_rgba(168,85,247,0.4)]' :
                theme === 'xmas' ? 'border-red-500 shadow-[0_0_40px_rgba(220,38,38,0.3)]' :
                theme === 'blackpink' ? 'border-pink-500 shadow-[0_0_40px_rgba(236,72,153,0.4)]' :
                theme === 'aespa' ? 'border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.4)]' :
                theme === '1989' ? 'border-sky-400 shadow-[0_0_40px_rgba(56,189,248,0.4)]' :
                theme === 'folklore' ? 'border-zinc-400 shadow-[0_0_40px_rgba(161,161,170,0.4)]' :
                theme === 'ttpd' ? 'border-stone-400 shadow-[0_0_40px_rgba(168,162,158,0.4)]' :
                theme === 'evermore' ? 'border-orange-700 shadow-[0_0_40px_rgba(194,65,12,0.4)]' :
                'border-slate-200 dark:border-slate-700'
            }`}>
                {/* Background Gradients based on Theme */}
                <div className={`absolute top-0 left-0 w-full h-24 bg-gradient-to-b ${styles.gradient} opacity-20`}></div>
                
                <div className="relative z-10 text-center mb-4">
                    {/* Animated Icon */}
                    <div className={`w-16 h-16 mx-auto mb-3 rounded-full flex items-center justify-center shadow-xl border-4 border-white dark:border-slate-800 bg-gradient-to-br ${styles.gradient}`}>
                        <span className="text-3xl animate-[bounce_2s_infinite] filter drop-shadow-md">
                            {theme === 'xmas' ? '🎅' : theme === 'showgirl' ? '💃' : theme === 'swift' ? '🐍' : theme === '1989' ? '🕊️' : theme === 'folklore' ? '🌲' : theme === 'ttpd' ? '🖋️' : theme === 'evermore' ? '🍂' : '🦦'}
                        </span>
                    </div>

                    <h2 className={`text-2xl font-black mb-2 tracking-tight ${theme === 'showgirl' ? 'text-gradient-gold text-glow-gold' : theme === 'swift' ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400' : theme === '1989' ? 'text-sky-500' : theme === 'folklore' ? 'text-slate-600 dark:text-zinc-300 font-serif' : theme === 'ttpd' ? 'text-stone-700 dark:text-stone-200 font-serif' : theme === 'evermore' ? 'text-orange-800 dark:text-orange-100 font-serif' : 'text-slate-800 dark:text-white'}`}>
                        Tiếp sức Rái Cá
                    </h2>

                    <div className="bg-slate-50/80 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-100 dark:border-slate-700 backdrop-blur-sm">
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed italic font-medium">
                            "Ủng hộ để Rái Cá có thêm ly cà phê ☕ duy trì server nhé! Cảm ơn bạn! ❤️"
                        </p>
                    </div>
                </div>

                <div className="relative z-10 flex flex-col items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-lg mb-4 transform transition-transform hover:scale-[1.02]">
                     <img
                         src={donateQrUrl}
                         alt="Donate QR"
                         className="w-40 h-40 object-contain mb-3 rounded-lg"
                     />
                     <div
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl cursor-pointer transition-all border-2 group
                            ${copiedAccount
                                ? 'bg-green-50 border-green-200'
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-100 hover:border-blue-200'
                            }
                        `}
                        onClick={handleCopyAccount}
                        title="Sao chép số tài khoản"
                     >
                         <div className="text-left flex-1 min-w-0">
                             <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider truncate">MB Bank</p>
                             <p className={`font-mono font-black text-lg tracking-wide transition-colors truncate ${copiedAccount ? 'text-green-600' : 'text-slate-800 group-hover:text-blue-600'}`}>
                                0766377925
                             </p>
                             <p className="text-[9px] font-bold text-slate-400 uppercase truncate">LAM CHAN DAT</p>
                         </div>
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all shrink-0 ${copiedAccount ? 'bg-green-500 text-white' : 'bg-white text-slate-400 group-hover:text-blue-500 group-hover:scale-110'}`}>
                             {copiedAccount ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                         </div>
                     </div>
                </div>

                <button
                    onClick={() => setShowDonateModal(false)}
                    className={`w-full py-3 rounded-xl font-bold text-base text-white shadow-xl transition-all hover:-translate-y-1 active:scale-95 bg-gradient-to-r ${styles.gradient}`}
                >
                    Đóng
                </button>
            </div>
        </div>
      )}

      {/* PAYMENT MODAL FOR SHOWGIRL */}
      {showPaymentModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-orange-200 dark:border-orange-800 animate-in zoom-in-95 relative overflow-hidden">
                  {/* Background Decoration */}
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-teal-500 via-orange-500 to-teal-500"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                  
                  <div className="text-center mb-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-teal-100 to-orange-100 dark:from-slate-800 dark:to-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white dark:border-slate-700 shadow-lg">
                          <span className="text-4xl animate-[bounce_2s_infinite]">💃</span>
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                          Mở khóa giao diện Showgirl
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">
                          Trở thành VIP để sở hữu giao diện độc quyền này!
                      </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 flex flex-col items-center">
                       <div className="bg-white p-2 rounded-xl shadow-sm mb-4 border border-slate-100">
                           <img 
                                src={qrUrlShowgirl} 
                                alt="VietQR Payment" 
                                className="w-48 h-48 object-contain"
                           />
                       </div>
                       <div className="text-center space-y-2 w-full">
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Hướng dẫn thanh toán</p>
                           <div className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                               <p>Chuyển khoản: <strong className="text-orange-600 dark:text-orange-400">50.000đ</strong></p>
                               <p>Nội dung: <strong className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">{user.studentId} - MUA GIAO DIEN SHOWGIRL</strong></p>
                           </div>
                           <p className="text-xs text-slate-500 italic mt-2">
                               Sau khi chuyển khoản, vui lòng chụp màn hình và gửi Zalo cho Admin để được duyệt.
                           </p>
                           <p className="text-xs text-red-600 dark:text-red-400 font-medium italic mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                               Lưu ý: Vì hệ thống duyệt thủ công, vui lòng chờ từ 15 - 30 phút (hoặc tối đa 24h) sau khi chuyển khoản để tài khoản được nâng cấp. Đừng lo lắng nhé!
                           </p>
                       </div>
                  </div>

                  <div className="space-y-3">
                      <button 
                          onClick={() => {
                              setShowPaymentModal(false);
                              alert("Vui lòng chờ Admin duyệt trong giây lát. Bạn có thể liên hệ qua Zalo để được hỗ trợ nhanh hơn.");
                          }}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-teal-500 to-orange-500 text-white font-bold shadow-lg hover:shadow-orange-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                          <CheckCircle className="w-5 h-5" /> Tôi đã chuyển khoản
                      </button>
                      <button 
                          onClick={() => setShowPaymentModal(false)}
                          className="w-full py-3 rounded-xl text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                          Đóng
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* PAYMENT MODAL FOR 1989 */}
      {showPaymentModal1989 && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-sky-200 dark:border-sky-800 animate-in zoom-in-95 relative overflow-hidden">
                  {/* Background Decoration */}
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sky-400 via-blue-300 to-sky-400"></div>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                  
                  <div className="text-center mb-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-sky-100 to-blue-100 dark:from-slate-800 dark:to-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white dark:border-slate-700 shadow-lg">
                          <span className="text-4xl animate-pulse">🕊️</span>
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                          Mở khóa giao diện 1989
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">
                          Sở hữu giao diện VIP phong cách Taylor Swift!
                      </p>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 flex flex-col items-center">
                       <div className="bg-white p-2 rounded-xl shadow-sm mb-4 border border-slate-100">
                           <img 
                                src={qrUrl1989} 
                                alt="VietQR Payment" 
                                className="w-48 h-48 object-contain"
                           />
                       </div>
                       <div className="text-center space-y-2 w-full">
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Hướng dẫn thanh toán</p>
                           <div className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600">
                               <p>Chuyển khoản: <strong className="text-sky-600 dark:text-sky-400">50.000đ</strong></p>
                               <p>Nội dung: <strong className="font-mono bg-slate-100 dark:bg-slate-700 px-1 rounded">{user.studentId} - MUA GIAO DIEN 1989</strong></p>
                           </div>
                           <p className="text-xs text-slate-500 italic mt-2">
                               Sau khi chuyển khoản, vui lòng chụp màn hình và gửi Zalo cho Admin để được duyệt.
                           </p>
                           <p className="text-xs text-red-600 dark:text-red-400 font-medium italic mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                               Lưu ý: Vì hệ thống duyệt thủ công, vui lòng chờ từ 15 - 30 phút (hoặc tối đa 24h) sau khi chuyển khoản để tài khoản được nâng cấp. Đừng lo lắng nhé!
                           </p>
                       </div>
                  </div>

                  <div className="space-y-3">
                      <button 
                          onClick={() => {
                              setShowPaymentModal1989(false);
                              alert("Vui lòng chờ Admin duyệt trong giây lát. Bạn có thể liên hệ qua Zalo để được hỗ trợ nhanh hơn.");
                          }}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 text-white font-bold shadow-lg hover:shadow-sky-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                          <CheckCircle className="w-5 h-5" /> Tôi đã chuyển khoản
                      </button>
                      <button 
                          onClick={() => setShowPaymentModal1989(false)}
                          className="w-full py-3 rounded-xl text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                          Đóng
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* PAYMENT MODAL FOR FOLKLORE */}
      {showPaymentModalFolklore && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-zinc-300 dark:border-zinc-700 animate-in zoom-in-95 relative overflow-hidden">
                  {/* Background Decoration */}
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-zinc-400 via-slate-400 to-zinc-400"></div>
                  
                  <div className="text-center mb-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-zinc-100 to-slate-200 dark:from-zinc-800 dark:to-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white dark:border-zinc-600 shadow-lg">
                          <span className="text-4xl animate-pulse">🌲</span>
                      </div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2 font-serif italic">
                          folklore edition
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm">
                          Mở khóa giao diện độc quyền lấy cảm hứng từ album folklore.
                      </p>
                  </div>

                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 mb-6 flex flex-col items-center">
                       <div className="bg-white p-2 rounded-xl shadow-sm mb-4 border border-zinc-100">
                           <img 
                                src={qrUrlFolklore} 
                                alt="VietQR Payment" 
                                className="w-48 h-48 object-contain grayscale"
                           />
                       </div>
                       <div className="text-center space-y-2 w-full">
                           <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Hướng dẫn thanh toán</p>
                           <div className="text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-zinc-800 p-3 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600">
                               <p>Chuyển khoản: <strong className="text-slate-600 dark:text-slate-400">50.000đ</strong></p>
                               <p>Nội dung: <strong className="font-mono bg-zinc-100 dark:bg-zinc-700 px-1 rounded">{user.studentId} - MUA GIAO DIEN FOLKLORE</strong></p>
                           </div>
                           <p className="text-xs text-slate-500 italic mt-2">
                               Sau khi chuyển khoản, vui lòng chụp màn hình và gửi Zalo cho Admin để được duyệt.
                           </p>
                       </div>
                  </div>

                  <div className="space-y-3">
                      <button 
                          onClick={() => {
                              setShowPaymentModalFolklore(false);
                              alert("Vui lòng chờ Admin duyệt trong giây lát. Bạn có thể liên hệ qua Zalo để được hỗ trợ nhanh hơn.");
                          }}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-zinc-500 to-slate-600 text-white font-bold shadow-lg hover:shadow-zinc-500/25 transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                          <CheckCircle className="w-5 h-5" /> Tôi đã chuyển khoản
                      </button>
                      <button 
                          onClick={() => setShowPaymentModalFolklore(false)}
                          className="w-full py-3 rounded-xl text-slate-500 dark:text-slate-400 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                          Đóng
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* API KEY MODAL */}
      {showApiKeyModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95">
                  <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                          <Key className="w-6 h-6" />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Cấu hình API Key</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Sử dụng khóa Gemini cá nhân</p>
                      </div>
                  </div>

                  <div className="space-y-4 mb-6">
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed flex gap-2">
                             <AlertTriangle className="w-5 h-5 text-blue-500 shrink-0" />
                             <span>
                                 Nếu hệ thống báo lỗi <strong>"Quota Exceeded"</strong> (Hết hạn mức), hãy nhập API Key cá nhân (Miễn phí) để tiếp tục sử dụng.
                             </span>
                          </p>
                          <a 
                             href="https://aistudio.google.com/app/apikey" 
                             target="_blank" 
                             rel="noopener noreferrer"
                             className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-flex items-center gap-1"
                          >
                             Lấy API Key tại đây <ExternalLink className="w-3 h-3" />
                          </a>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Gemini API Key</label>
                          <input 
                              type="password" 
                              value={apiKeyInput}
                              onChange={(e) => setApiKeyInput(e.target.value)}
                              placeholder="AIzaSy..."
                              className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                          />
                      </div>
                  </div>

                  <div className="flex gap-3">
                      <button 
                          onClick={handleSaveApiKey}
                          className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold transition-colors shadow-lg shadow-amber-500/20"
                      >
                          Lưu cài đặt
                      </button>
                      {apiKeySaved && (
                          <button 
                              onClick={handleClearApiKey}
                              className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                              title="Xóa Key"
                          >
                              Xóa
                          </button>
                      )}
                      <button 
                          onClick={() => setShowApiKeyModal(false)}
                          className="px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                          Đóng
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* ... Easter Egg & Xmas Popup ... */}
      {theme !== 'default' && egg && (
        <div 
            className={`fixed bottom-0 left-0 md:left-10 z-[99999] pointer-events-none transition-transform duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                ${easterEggState === 'hidden' ? 'translate-y-[120%]' : ''}
                ${easterEggState === 'peeking' ? 'translate-y-[50%]' : ''}
                ${easterEggState === 'screaming' ? 'translate-y-[0%]' : ''}
            `}
        >
            <div className={`relative w-60 md:w-80 transition-transform duration-100 ${easterEggState === 'screaming' ? 'animate-shake-intense origin-bottom' : ''}`}>
                {/* ... Bubble content ... */}
                <div className={`absolute -top-32 -right-10 md:-right-20 bg-white border-4 ${egg.border} p-6 rounded-[3rem] rounded-bl-none shadow-[0_10px_40px_rgba(0,0,0,0.3)] z-50 transition-all duration-300 transform
                        ${easterEggState === 'screaming' ? 'opacity-100 scale-100 rotate-6' : 'opacity-0 scale-0 rotate-0'}
                `}>
                    <p className="text-3xl font-black tracking-tighter uppercase animate-pulse drop-shadow-md whitespace-nowrap">
                        {egg.text}
                    </p>
                    <div className="text-2xl absolute -top-4 -right-4 animate-bounce">{egg.icon}</div>
                </div>

                {theme === 'blackpink' ? (
                     <div className={`w-full h-64 flex items-end justify-center drop-shadow-2xl rounded-t-full border-8 border-pink-400 bg-black`}>
                         <div className="text-[8rem] animate-[wiggle_0.5s_infinite]">🔨</div>
                     </div>
                ) : theme === 'aespa' ? (
                     <div className={`w-full h-64 flex items-end justify-center drop-shadow-2xl rounded-t-full border-8 border-indigo-500 bg-gradient-to-b from-slate-800 to-black`}>
                         <div className="text-[8rem] animate-[spin_4s_linear_infinite]">🪐</div>
                     </div>
                ) : theme === 'rosie' ? (
                     <div className={`w-full h-64 flex items-end justify-center drop-shadow-2xl rounded-t-full border-8 border-rose-500 bg-rose-950`}>
                         <div className="text-[8rem] animate-[bounce_2s_infinite]">🌹</div>
                     </div>
                ) : theme === 'pkl' ? (
                     <div className={`w-full h-64 flex items-end justify-center drop-shadow-2xl rounded-t-full border-8 border-cyan-500 bg-slate-800`}>
                         <div className="text-[8rem] animate-[pulse_3s_infinite] rotate-45">🗡️</div>
                     </div>
                ) : theme === 'showgirl' ? (
                     <div className={`w-full h-64 flex items-end justify-center drop-shadow-2xl rounded-t-full border-8 border-orange-400 bg-gradient-to-b from-teal-800 to-orange-900`}>
                         <div className="text-[8rem] animate-[pulse_2s_infinite]">💎</div>
                     </div>
                ) : theme === '1989' ? (
                     <div className={`w-full h-64 flex items-end justify-center drop-shadow-2xl rounded-t-full border-8 border-sky-400 bg-gradient-to-b from-sky-100 to-blue-200`}>
                         <div className="text-[8rem] animate-[pulse_4s_infinite]">🕊️</div>
                     </div>
                ) : theme === 'folklore' ? (
                     <div className={`w-full h-64 flex items-end justify-center drop-shadow-2xl rounded-t-full border-8 border-zinc-400 bg-gradient-to-b from-zinc-100 to-slate-300`}>
                         <div className="text-[8rem] animate-[pulse_6s_infinite] opacity-80">🌲</div>
                     </div>
                ) : theme === 'ttpd' ? (
                     <div className={`w-full h-64 flex items-end justify-center drop-shadow-2xl rounded-t-full border-8 border-stone-400 bg-gradient-to-b from-stone-200 to-neutral-300`}>
                         <div className="text-[8rem] animate-[pulse_5s_infinite]">🖋️</div>
                     </div>
                ) : theme === 'evermore' ? (
                     <div className={`w-full h-64 flex items-end justify-center drop-shadow-2xl rounded-t-full border-8 border-orange-800 bg-gradient-to-b from-orange-900 to-amber-950`}>
                         <div className="text-[8rem] animate-[wiggle_3s_infinite]">🧥</div>
                     </div>
                ) : (
                    <img 
                        src={egg.img!}
                        alt="Easter Egg" 
                        className={`w-full h-auto drop-shadow-2xl rounded-t-full border-8 border-white/30 ${egg.bg}`} 
                    />
                )}
                
                {easterEggState === 'peeking' && (
                    <div className="absolute top-[20%] left-[40%] text-4xl animate-bounce">👀</div>
                )}
            </div>
        </div>
      )}

      {/* ... Xmas Popup (Only show if not Swift/TTPD/Evermore Gift) ... */}
      {theme === 'xmas' && showXmasPopup && !showSwiftGift && !showTTPDGift && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-500">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(220,38,38,0.5)] overflow-hidden relative animate-in zoom-in-50 slide-in-from-bottom-[20%] duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] group transition-all">
                <div className={`absolute top-0 inset-x-0 h-36 bg-gradient-to-b ${giftOpened ? 'from-amber-400 via-amber-500' : 'from-red-600 via-red-500'} to-transparent z-0 transition-colors duration-700`}></div>
                
                {!giftOpened && (
                    <>
                        <div className="absolute top-[-20px] left-[-20px] text-[5rem] opacity-20 rotate-[-15deg] select-none animate-[wiggle_3s_ease-in-out_infinite]">❄️</div>
                        <div className="absolute top-[20px] right-[-20px] text-[4rem] opacity-20 rotate-[15deg] select-none animate-[wiggle_3s_ease-in-out_infinite_reverse]">🎄</div>
                    </>
                )}

                <div className="relative z-10 flex flex-col items-center text-center pt-12 pb-8 px-8">
                    {!giftOpened ? (
                        <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="relative mb-6">
                                <div className="w-28 h-28 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-2xl border-4 border-red-100 dark:border-red-900/30 z-10 relative">
                                    <span className="text-7xl animate-[bounce_2s_infinite] origin-bottom">🎅</span>
                                </div>
                                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-3 rounded-full border-4 border-white dark:border-slate-900 shadow-xl animate-[pulse_2s_infinite] z-50 scale-110 transform rotate-12">
                                    <Gift className="w-6 h-6" />
                                </div>
                            </div>

                            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2 tracking-tight drop-shadow-sm">
                                Giáng Sinh Vui Vẻ!
                            </h2>
                            <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed text-lg">
                                Chúc <span className="font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-lg border border-red-100 dark:border-red-900/50">{user.fullName}</span> một mùa lễ hội ấm áp, tràn đầy niềm vui và học tốt Giải phẫu nhé! 🦦❄️
                            </p>

                            <button 
                                onClick={handleOpenGift}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold text-lg shadow-lg shadow-red-500/30 transform transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group/btn"
                            >
                                <Gift className="w-5 h-5 group-hover/btn:animate-bounce" />
                                <span>Nhận quà Giáng Sinh</span>
                            </button>
                        </div>
                    ) : (
                        <div className="w-full flex flex-col items-center animate-in zoom-in-90 duration-500">
                             <div className="relative mb-6">
                                <div className="w-28 h-28 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.6)] border-4 border-amber-200 dark:border-amber-900/30 z-10 relative">
                                    <span className="text-6xl animate-[wiggle_1s_infinite]">🎁</span>
                                </div>
                                <div className="absolute top-0 left-0 w-full h-full rounded-full animate-ping bg-amber-400/30"></div>
                                <div className="absolute top-[-20px] left-[50%] translate-x-[-50%] text-amber-400 animate-bounce"><Sparkles className="w-8 h-8" /></div>
                            </div>

                            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
                                Quà tặng học tập!
                            </h2>
                             <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                                Rái cá gửi tặng bạn tài liệu ôn thi độc quyền nè.
                            </p>

                            <a 
                                href="https://drive.google.com/file/d/1sqTxjLw9NdSBFmFz6gtIkwppvaTNk9u9/view?usp=drivesdk"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl mb-6 hover:bg-amber-100 dark:hover:bg-amber-900/40 hover:scale-[1.02] transition-all group/link shadow-sm hover:shadow-md"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="bg-amber-100 dark:bg-amber-800 p-2.5 rounded-xl text-amber-600 dark:text-amber-400">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="text-left flex-1">
                                        <p className="font-bold text-slate-800 dark:text-white text-sm mb-0.5 group-hover/link:text-amber-600 transition-colors">Tài liệu Giải Phẫu.pdf</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
                                            Google Drive <ExternalLink className="w-3 h-3" />
                                        </p>
                                    </div>
                                </div>
                            </a>

                            <button 
                                onClick={() => setShowXmasPopup(false)}
                                className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                            >
                                Cảm ơn & Vào học
                            </button>
                        </div>
                    )}
                </div>

                <button 
                    onClick={() => setShowXmasPopup(false)}
                    className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 rounded-full text-white transition-colors z-50 backdrop-blur-sm"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
      )}

      {/* Focus Mode (Full Screen Overlay) */}
      {isOtterMode && (
        <div 
            className={`fixed inset-0 z-[200] flex flex-col items-center justify-center animate-in zoom-in duration-300 cursor-pointer
                ${theme === 'showgirl' ? 'bg-slate-900/95' : theme === '1989' ? 'bg-sky-50/95' : theme === 'folklore' ? 'bg-zinc-100/95 dark:bg-zinc-900/95' : theme === 'ttpd' ? 'bg-[#f5f5f4]/95 dark:bg-[#1c1917]/95' : theme === 'evermore' ? 'bg-[#fffbeb]/95 dark:bg-[#271c19]/95' : 'bg-slate-900/90 backdrop-blur-xl'}
            `}
            onClick={() => setIsOtterMode(false)}
        >
            {/* Showgirl: Glitter/Sparkle Effects in Focus Mode */}
            {theme === 'showgirl' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {/* Stardust texture fallback */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-pulse"></div>
                    
                    {/* CSS Generated Sparkles */}
                    {[...Array(15)].map((_, i) => (
                        <div 
                            key={i}
                            className="absolute animate-pulse"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                animationDuration: `${Math.random() * 2 + 1}s`,
                                animationDelay: `${Math.random()}s`
                            }}
                        >
                            <Sparkles className={`text-yellow-200 w-${Math.random() > 0.5 ? '4' : '6'} h-${Math.random() > 0.5 ? '4' : '6'}`} />
                        </div>
                    ))}
                </div>
            )}

            {/* 1989: Birds */}
            {theme === '1989' && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(10)].map((_, i) => (
                        <div 
                            key={i}
                            className="absolute text-slate-400 animate-pulse"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                fontSize: `${1 + Math.random()}rem`,
                                animationDuration: `${3 + Math.random() * 2}s`
                            }}
                        >🕊️</div>
                    ))}
                </div>
            )}

            {/* Swift: Midnight/Lavender Effects in Focus Mode */}
            {theme === 'swift' && (
                 <div className="absolute inset-0 pointer-events-none overflow-hidden">
                     <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-indigo-900/50 via-purple-900/50 to-black/50"></div>
                     {[...Array(15)].map((_, i) => (
                        <div 
                            key={i}
                            className="absolute animate-pulse bg-white rounded-full blur-[1px]"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                width: `${Math.random() * 4}px`,
                                height: `${Math.random() * 4}px`,
                                animationDuration: `${Math.random() * 3 + 1}s`,
                            }}
                        ></div>
                    ))}
                 </div>
            )}

            {/* FOLKLORE FOCUS MODE */}
            {theme === 'folklore' && (
                 <div className="absolute inset-0 pointer-events-none overflow-hidden grayscale">
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/foggy-birds.png')] opacity-30"></div>
                     {[...Array(8)].map((_, i) => (
                        <div 
                            key={i}
                            className="absolute animate-bounce text-zinc-400"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                fontSize: `${2 + Math.random()}rem`,
                                animationDuration: `${5 + Math.random() * 5}s`,
                            }}
                        >🌲</div>
                    ))}
                 </div>
            )}

            {/* TTPD FOCUS MODE */}
            {theme === 'ttpd' && (
                 <div className="absolute inset-0 pointer-events-none overflow-hidden font-serif italic">
                     <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] opacity-20"></div>
                     {[...Array(8)].map((_, i) => (
                        <div 
                            key={i}
                            className="absolute animate-pulse text-stone-400/40"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                fontSize: `${1 + Math.random()}rem`,
                                animationDuration: `${8 + Math.random() * 5}s`,
                                transform: `rotate(${Math.random() * 20 - 10}deg)`
                            }}
                        >
                            {['I love you', 'it\'s ruining my life', 'fortnight', 'down bad'][i % 4]}
                        </div>
                    ))}
                 </div>
            )}

            {/* EVERMORE FOCUS MODE */}
            {theme === 'evermore' && (
                 <div className="absolute inset-0 pointer-events-none overflow-hidden font-serif italic">
                     <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_50px,rgba(194,65,12,0.03)_50px,rgba(194,65,12,0.03)_51px),repeating-linear-gradient(0deg,transparent,transparent_50px,rgba(194,65,12,0.03)_50px,rgba(194,65,12,0.03)_51px)]"></div>
                     {[...Array(8)].map((_, i) => (
                        <div 
                            key={i}
                            className="absolute animate-[wiggle_5s_infinite] text-orange-900/20 dark:text-orange-200/20"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                fontSize: `${2 + Math.random()}rem`,
                                animationDuration: `${8 + Math.random() * 5}s`,
                            }}
                        >🍂</div>
                    ))}
                 </div>
            )}

            <div className={`relative transform transition-transform hover:scale-110 duration-300 ${theme === 'showgirl' ? 'animate-[bounce_3s_infinite]' : 'animate-bounce'}`}>
                <div className={`w-40 h-40 rounded-[2rem] flex items-center justify-center shadow-2xl border-4 relative 
                    ${theme === 'showgirl' 
                        ? 'bg-gradient-to-br from-teal-900 to-orange-900 border-yellow-500 shadow-[0_0_60px_rgba(234,179,8,0.6)]' 
                        : theme === 'swift'
                            ? 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 border-white/30 shadow-[0_0_60px_rgba(168,85,247,0.8)]'
                        : theme === '1989'
                            ? 'bg-gradient-to-br from-sky-200 to-blue-300 border-white shadow-[0_0_60px_rgba(56,189,248,0.5)]'
                        : theme === 'folklore'
                            ? 'bg-gradient-to-br from-zinc-200 to-slate-300 border-slate-500 shadow-[0_0_60px_rgba(161,161,170,0.5)]'
                        : theme === 'ttpd'
                            ? 'bg-[#f5f5f4] border-stone-400 shadow-[0_0_60px_rgba(168,162,158,0.5)]'
                        : theme === 'evermore'
                            ? 'bg-[#fffbeb] border-orange-900 shadow-[0_0_60px_rgba(194,65,12,0.5)]'
                        : `bg-gradient-to-br ${styles.gradient} border-white/20`
                    }`}
                >
                    <span className="text-8xl drop-shadow-lg select-none">
                        {styles.icon}
                    </span>
                    {theme === 'showgirl' && (
                         <div className="absolute -top-6 -right-6 animate-spin-slow">
                             <Sparkles className="w-12 h-12 text-yellow-400 drop-shadow-lg" />
                         </div>
                    )}
                </div>
                {/* Glow effect */}
                <div className={`absolute inset-0 blur-3xl -z-10 opacity-50 ${theme === 'showgirl' ? 'bg-yellow-500' : theme === 'swift' ? 'bg-purple-500' : theme === '1989' ? 'bg-sky-400' : theme === 'folklore' ? 'bg-white' : theme === 'ttpd' ? 'bg-stone-300' : theme === 'evermore' ? 'bg-orange-700' : 'bg-white'}`}></div>
            </div>
            
            <h1 className={`mt-8 text-5xl font-black text-center tracking-tight ${theme === 'showgirl' ? 'text-gradient-gold text-glow-gold' : theme === 'swift' ? 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]' : theme === '1989' ? 'text-sky-500' : theme === 'folklore' ? 'text-slate-600 dark:text-zinc-300 font-serif italic' : theme === 'ttpd' ? 'text-stone-700 dark:text-stone-200 font-serif' : theme === 'evermore' ? 'text-orange-900 dark:text-orange-100 font-serif italic' : 'text-white drop-shadow-lg'}`}>
                AnatomyOtter
            </h1>
            <p className={`mt-2 font-mono text-lg tracking-widest uppercase ${theme === 'showgirl' ? 'text-yellow-400/80 text-glow-gold' : theme === '1989' ? 'text-slate-500' : theme === 'folklore' ? 'text-slate-500 font-serif lowercase' : theme === 'ttpd' ? 'text-stone-500 font-serif lowercase' : theme === 'evermore' ? 'text-orange-800 dark:text-orange-200 font-serif lowercase' : 'text-white/60'}`}>
                {theme === 'xmas' ? "Jingle Bells Edition" :
                 theme === 'swift' ? "The Eras Tour VIP" :
                 theme === 'blackpink' ? "BLACKPINK IN YOUR AREA" :
                 theme === 'aespa' ? "SYNK DIVE INTO KWANGYA" :
                 theme === 'rosie' ? "NUMBER ONE GIRL" :
                 theme === 'pkl' ? "G1VN - ANH LÀ THẰNG TỒI" :
                 theme === 'showgirl' ? "THE SPOTLIGHT IS YOURS" :
                 theme === '1989' ? "WELCOME TO NEW YORK" :
                 theme === 'folklore' ? "passed down like folk songs" :
                 theme === 'ttpd' ? "the tortured poets department" :
                 theme === 'evermore' ? "life was a willow" :
                 "STUDY WITH OTTER"}
            </p>
            {theme === 'showgirl' && <p className="text-yellow-400/80 text-sm font-bold mt-1 animate-pulse">✨ VIP ACCESS ✨</p>}
            {theme === '1989' && <p className="text-sky-500 text-sm font-bold mt-1 animate-pulse">🕊️ VIP ACCESS 🕊️</p>}
            {theme === 'folklore' && <p className="text-slate-500 text-sm font-bold mt-1 animate-pulse font-serif italic">🌲 VIP ACCESS 🌲</p>}
            {theme === 'ttpd' && <p className="text-stone-500 text-sm font-bold mt-1 animate-pulse font-serif italic">🖋️ THE CHAIRMAN 🖋️</p>}
            {theme === 'evermore' && <p className="text-orange-700 text-sm font-bold mt-1 animate-pulse font-serif italic">🍂 SURVIVOR 🍂</p>}
            
            <p className="absolute bottom-10 text-white/40 text-sm">Chạm bất kỳ đâu để đóng</p>
        </div>
      )}
      
      {/* HEADER */}
      <header className={`${theme === 'showgirl' ? 'bg-slate-900/80 backdrop-blur-md border-orange-900/30' : theme === 'swift' ? 'bg-[#1a1a2e]/80 backdrop-blur-md border-purple-500/20' : theme === '1989' ? 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-sky-200 dark:border-sky-800' : theme === 'folklore' ? 'bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-zinc-200 dark:border-zinc-800' : theme === 'ttpd' ? 'bg-[#f5f5f4]/90 dark:bg-[#1c1917]/90 backdrop-blur-md border-stone-300 dark:border-stone-800' : theme === 'evermore' ? 'bg-[#fffbeb]/90 dark:bg-[#271c19]/90 backdrop-blur-md border-orange-900/20 dark:border-orange-900/50' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'} border-b sticky top-0 z-40 transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 group cursor-pointer select-none transition-transform active:scale-95"
            onClick={() => setIsOtterMode(true)}
          >
            <div 
                className={`w-10 h-10 bg-gradient-to-br ${styles.gradient} rounded-xl flex items-center justify-center liquid-icon relative z-10 ${theme === 'showgirl' ? 'border border-yellow-500/50 shadow-glow-gold' : ''}`}
                style={{ '--glow-color': styles.color } as React.CSSProperties}
            >
                <span className="text-2xl leading-none">{styles.icon}</span>
                {styles.subIcon && <span className="absolute -top-2 -right-1 text-base rotate-12 drop-shadow-sm">{styles.subIcon}</span>}
            </div>
            <div className="flex flex-col md:flex-row md:items-baseline gap-0 md:gap-2">
                <h1 className={`text-xl font-bold tracking-tight transition-colors leading-none flex items-center gap-2 ${theme === 'showgirl' ? 'text-gradient-gold' : theme === '1989' ? 'text-sky-600 dark:text-sky-300' : theme === 'folklore' ? 'text-slate-700 dark:text-zinc-200 font-serif italic' : theme === 'ttpd' ? 'text-stone-800 dark:text-stone-200 font-serif' : theme === 'evermore' ? 'text-orange-900 dark:text-orange-100 font-serif' : 'text-slate-800 dark:text-white'}`}>
                    <span>Anatomy<span className={`text-glow ${styles.nameColor}`}>Otter</span></span>
                    
                    {/* THEME EDITION TAG */}
                    {theme !== 'default' && (
                        <span 
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm border ${theme === 'showgirl' ? 'border-orange-400/50' : theme === '1989' ? 'border-sky-300/50' : 'border-transparent'} ${styles.badgeBg} transform translate-y-[-2px]`}
                            style={theme === 'showgirl' ? { WebkitTextFillColor: '#ffffff' } : undefined}
                        >
                            {theme === 'xmas' ? 'Xmas Edition' 
                             : theme === 'swift' ? "Eras VIP" 
                             : theme === 'blackpink' ? "Born Pink" 
                             : theme === 'aespa' ? "MY WORLD" 
                             : theme === 'rosie' ? "number one girl" 
                             : theme === 'pkl' ? "G1VN Edition" 
                             : theme === 'showgirl' ? "The Life of a Showgirl" 
                             : theme === '1989' ? "1989 (TV)"
                             : theme === 'folklore' ? "folklore"
                             : theme === 'ttpd' ? "TTPD"
                             : theme === 'evermore' ? "evermore"
                             : ""}
                        </span>
                    )}
                    
                    <span 
                        className="text-xs font-mono text-slate-400 ml-0.5"
                        style={theme === 'showgirl' ? { WebkitTextFillColor: '#94a3b8' } : undefined}
                    >
                        v1.0
                    </span>
                </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Donate Button */}
            <button 
                onClick={() => setShowDonateModal(true)}
                className={`liquid-icon relative rounded-xl w-10 h-10 flex items-center justify-center overflow-hidden focus:outline-none transition-colors ${theme === 'showgirl' ? 'bg-slate-800 text-rose-400 border-rose-900/50' : 'text-rose-500 dark:text-rose-400 bg-slate-100 dark:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-300'}`}
                style={{ '--glow-color': 'rgba(244, 63, 94, 0.5)' } as React.CSSProperties}
                title="Ủng hộ Rái Cá"
            >
                <Heart className="w-5 h-5" />
            </button>

            {/* Pomodoro Timer */}
            <PomodoroTimer theme={theme} />

            {/* NEW: Theme Store Trigger */}
            <button 
                onClick={() => setIsStoreOpen(true)}
                className={`liquid-icon relative rounded-xl w-10 h-10 flex items-center justify-center overflow-hidden focus:outline-none transition-colors ${theme === 'showgirl' ? 'bg-slate-800 text-teal-400 border-teal-900/50' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:text-emerald-600 dark:hover:text-emerald-400'}`}
                style={{ '--glow-color': 'rgba(16, 185, 129, 0.5)' } as React.CSSProperties}
                title="Cửa hàng Theme"
            >
                <ShoppingBag className="w-5 h-5" />
            </button>

            {/* Theme Switcher (Legacy Dropdown) */}
            <div className="relative" ref={themeDropdownRef}>
                <button 
                    onClick={() => setIsThemeDropdownOpen(!isThemeDropdownOpen)}
                    className={`liquid-icon relative rounded-xl w-10 h-10 flex items-center justify-center overflow-hidden focus:outline-none transition-colors ${theme === 'showgirl' ? 'bg-slate-800 text-yellow-500 border-yellow-900/50' : 'text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:text-amber-600 dark:hover:text-amber-400'}`}
                    style={{ '--glow-color': 'rgba(236, 72, 153, 0.5)' } as React.CSSProperties}
                    title="Đổi giao diện nhanh"
                >
                    <Palette className="w-5 h-5" />
                </button>
                {isThemeDropdownOpen && (
                    <div className="absolute top-full right-0 mt-3 w-56 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                         <div className="p-3 space-y-1">
                            <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400 tracking-wider">Chọn giao diện</div>
                            <div className="grid grid-cols-2 gap-2">
                                {themeOptions.map((opt) => {
                                    const isShowgirl = opt.id === 'showgirl';
                                    const isSwift = opt.id === 'swift';
                                    const is1989 = opt.id === '1989';
                                    const isFolklore = opt.id === 'folklore';
                                    const isTTPD = opt.id === 'ttpd';
                                    const isEvermore = opt.id === 'evermore';
                                    const isSelected = theme === opt.id;
                                    const isLocked = (isShowgirl && !user.isVipShowgirl) || (is1989 && !user.isVip1989) || (isFolklore && !user.isVipFolklore) || (isTTPD && !user.isVipTTPD) || (isEvermore && !user.isVipEvermore);

                                    return (
                                        <button
                                            key={opt.id}
                                            onClick={() => handleThemeChange(opt.id)}
                                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 relative overflow-hidden ${
                                                isSelected
                                                    ? `border-current ${opt.color} ${opt.bg} ring-1 ring-current/20` 
                                                    : isShowgirl
                                                        ? 'border-orange-400 dark:border-orange-500 bg-gradient-to-br from-orange-50 to-teal-50 dark:from-slate-800 dark:to-slate-800 text-orange-600 dark:text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.5)] ring-2 ring-orange-400/30 scale-[1.02]'
                                                        : is1989
                                                            ? 'border-sky-400 dark:border-sky-600 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 text-sky-600 dark:text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)] ring-2 ring-sky-400/30 scale-[1.02]'
                                                        : isFolklore
                                                            ? 'border-zinc-400 dark:border-zinc-600 bg-gradient-to-br from-zinc-100 to-slate-200 dark:from-zinc-800 dark:to-slate-800 text-slate-600 dark:text-zinc-300 shadow-[0_0_15px_rgba(161,161,170,0.5)] ring-2 ring-zinc-400/30 scale-[1.02]'
                                                        : isTTPD
                                                            ? 'border-stone-400 dark:border-stone-600 bg-gradient-to-br from-stone-100 to-neutral-200 dark:from-stone-800 dark:to-stone-950 text-stone-700 dark:text-stone-300 shadow-[0_0_15px_rgba(168,162,158,0.5)] ring-2 ring-stone-400/30 scale-[1.02]'
                                                        : isEvermore
                                                            ? 'border-orange-700 dark:border-orange-600 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-amber-950 dark:to-orange-950 text-orange-800 dark:text-orange-200 shadow-[0_0_15px_rgba(194,65,12,0.5)] ring-2 ring-orange-700/30 scale-[1.02]'
                                                        : isSwift
                                                            ? 'border-purple-400 dark:border-purple-600 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 text-purple-600 dark:text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                                                        : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                                            } ${isLocked ? 'opacity-80 grayscale-[0.3]' : ''}`}
                                        >
                                            {(isShowgirl || is1989 || isFolklore || isTTPD || isEvermore) && !isSelected && !isLocked && (
                                                <div className={`absolute inset-0 bg-gradient-to-tr ${is1989 ? 'from-sky-400/20' : isFolklore ? 'from-zinc-400/20' : isTTPD ? 'from-stone-400/20' : isEvermore ? 'from-orange-700/20' : 'from-orange-400/20'} to-transparent opacity-50 pointer-events-none animate-pulse`}></div>
                                            )}
                                            {(isShowgirl || is1989 || isFolklore || isTTPD || isEvermore) && !isLocked && <span className="absolute top-0 right-0.5 text-xs animate-pulse">👑</span>}
                                            
                                            {/* LOCK OVERLAY */}
                                            {isLocked && (
                                                <div className="absolute inset-0 bg-black/10 dark:bg-black/40 flex items-center justify-center z-20 backdrop-blur-[1px]">
                                                    <Lock className="w-6 h-6 text-white drop-shadow-md" />
                                                </div>
                                            )}

                                            <span className={`text-2xl mb-1 ${(isShowgirl || is1989 || isFolklore || isTTPD || isEvermore) && !isSelected && !isLocked ? 'animate-bounce' : ''}`}>{opt.icon}</span>
                                            <span className="text-xs font-bold relative z-10">{opt.name}</span>
                                            {(isShowgirl || is1989 || isFolklore || isTTPD || isEvermore) && !isSelected && !isLocked && <span className={`absolute top-2 right-2 w-1.5 h-1.5 ${is1989 ? 'bg-sky-500' : isFolklore ? 'bg-emerald-500' : isTTPD ? 'bg-stone-500' : isEvermore ? 'bg-orange-600' : 'bg-orange-500'} rounded-full animate-ping`}></span>}
                                            {isSelected && <div className="w-1 h-1 rounded-full bg-current mt-1"></div>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <button 
              onClick={toggleDarkMode}
              className="liquid-icon relative rounded-xl text-slate-500 dark:text-slate-400 w-10 h-10 flex items-center justify-center overflow-hidden focus:outline-none bg-slate-100 dark:bg-slate-800"
              style={{ '--glow-color': darkMode ? 'rgba(99, 102, 241, 0.5)' : 'rgba(245, 158, 11, 0.5)' } as React.CSSProperties}
            >
               <div className={`absolute transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${darkMode ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`}>
                  <Sun className="w-5 h-5" />
               </div>
               <div className={`absolute transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${darkMode ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}>
                  <Moon className="w-5 h-5" />
               </div>
            </button>
            
            {/* Profile Section */}
            <div 
                className="relative z-50"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
               {/* Unified Trigger Card */}
               <div 
                  className={`flex items-center gap-3 px-3 py-1.5 rounded-2xl liquid-icon cursor-pointer transition-all duration-300 border ${profileTheme.trigger}`}
                  style={{ '--glow-color': theme === 'showgirl' ? 'rgba(234, 179, 8, 0.5)' : theme === '1989' ? 'rgba(56, 189, 248, 0.5)' : theme === 'folklore' ? 'rgba(161, 161, 170, 0.5)' : theme === 'ttpd' ? 'rgba(168, 162, 158, 0.5)' : theme === 'evermore' ? 'rgba(194, 65, 12, 0.5)' : 'rgba(245, 158, 11, 0.5)' } as React.CSSProperties}
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
                          className={`w-9 h-9 rounded-full object-cover border ${theme === 'showgirl' ? 'border-yellow-500 shadow-glow-gold' : theme === '1989' ? 'border-sky-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]' : theme === 'folklore' ? 'border-zinc-400 shadow-[0_0_10px_rgba(161,161,170,0.5)]' : theme === 'ttpd' ? 'border-stone-400 shadow-[0_0_10px_rgba(168,162,158,0.5)]' : theme === 'evermore' ? 'border-orange-700 shadow-[0_0_10px_rgba(194,65,12,0.5)]' : 'border-white/20'}`}
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
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
                    <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${profileTheme.label}`}>Thông tin cá nhân</p>
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1 bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                        <Keyboard className="w-3 h-3" /> Alt+U
                    </span>
                  </div>
                  
                  <div className="p-4">
                    {isEditing ? (
                         /* ... Edit Profile Form (unchanged) ... */
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
                                <button onClick={handleSaveProfile} className="flex-1 bg-amber-500 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-amber-600 flex items-center justify-center gap-1">
                                    <Check className="w-4 h-4" /> Lưu
                                </button>
                                <button onClick={cancelEdit} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-1.5 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center gap-1">
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

      {showFeedback && (
          <a 
              href="https://mail.google.com/mail/?view=cm&fs=1&to=datken100@gmail.com&su=[Góp ý] AnatomyOtter"
              target="_blank"
              rel="noopener noreferrer"
              className="fixed bottom-6 left-6 z-40 flex items-center gap-0 hover:gap-2 px-3 hover:px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-lg text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-300 dark:hover:border-amber-700 transition-all duration-300 group hover:shadow-amber-500/20"
          >
              <Mail className="w-5 h-5" />
              <span className="max-w-0 overflow-hidden group-hover:max-w-xs opacity-0 group-hover:opacity-100 transition-all duration-300 text-sm font-bold whitespace-nowrap">
                  Góp ý
              </span>
          </a>
      )}
    </div>
  );
}