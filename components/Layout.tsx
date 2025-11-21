
import React, { useState, useRef, useEffect } from 'react';
import { Moon, Sun, UserCircle, LogOut, Settings, Check, X, Camera, Sparkles, Gift, ExternalLink, FileText, Mail } from 'lucide-react';
import { UserProfile } from '../types';
import { OtterChat } from './OtterChat';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile;
  onLogout: () => void;
  onUpdateUser: (user: UserProfile) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  showFeedback?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  user, 
  onLogout, 
  onUpdateUser,
  darkMode,
  toggleDarkMode,
  showFeedback = false
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Christmas Animation Ref
  const xmasContainerRef = useRef<HTMLDivElement>(null);
  
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

  // MARIAH EASTER EGG STATE
  const [mariahState, setMariahState] = useState<'hidden' | 'peeking' | 'screaming'>('hidden');

  // --- Christmas Animation Logic ---
  useEffect(() => {
    const container = xmasContainerRef.current;
    if (!container) return;

    const icons = ['❄️', '🎄', '🎁', '🎅', '🔔', '🍪', '⛄', '🦌', '⭐', '🧊'];
    
    const createItem = () => {
       // Don't overload the DOM, keep max items reasonable
       if (container.childElementCount > 25) return;

       const item = document.createElement('div');
       item.className = 'xmas-item'; // Uses global CSS in index.html
       item.innerText = icons[Math.floor(Math.random() * icons.length)];
       
       // Random properties
       const left = Math.random() * 100; // 0 to 100vw
       const duration = Math.random() * 5 + 5; // 5s to 10s fall duration
       const size = Math.random() * 1.5 + 1; // 1rem to 2.5rem size
       const sway = (Math.random() - 0.5) * 200; // -100px to 100px horizontal sway
       
       item.style.left = `${left}%`;
       item.style.fontSize = `${size}rem`;
       item.style.animation = `xmas-fall ${duration}s linear forwards`;
       item.style.setProperty('--sway', `${sway}px`);
       
       // Add text shadow for better visibility
       item.style.textShadow = '0 0 5px rgba(255,255,255,0.5), 0 0 2px rgba(0,0,0,0.1)';

       container.appendChild(item);
       
       // Cleanup after animation finishes
       setTimeout(() => {
         if (item && item.parentNode) {
             item.remove();
         }
       }, duration * 1000);
    };

    const interval = setInterval(createItem, 800);
    return () => clearInterval(interval);
  }, []);

  // --- MARIAH RANDOM TRIGGER LOGIC ---
  useEffect(() => {
    const interval = setInterval(() => {
        // 10% chance every 30 seconds to trigger peeking if not active
        if (Math.random() > 0.9 && mariahState === 'hidden') {
             triggerMariahSequence();
        }
    }, 30000);
    return () => clearInterval(interval);
  }, [mariahState]);

  const triggerMariahSequence = () => {
      if (mariahState !== 'hidden') return;
      
      // Phase 1: Peek
      setMariahState('peeking');
      
      // Phase 2: Scream (after 2s)
      setTimeout(() => {
          setMariahState('screaming');
          
          // Phase 3: Retreat (after 4s of screaming)
          setTimeout(() => {
              setMariahState('hidden');
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
         // Only reset if not currently editing
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative">
      
      {/* CHRISTMAS FALLING ITEMS OVERLAY (Logged-in only) */}
      <div ref={xmasContainerRef} className="xmas-container"></div>

      {/* MARIAH CAREY EASTER EGG COMPONENT */}
      <div 
        className={`fixed bottom-0 left-0 md:left-10 z-[99999] pointer-events-none transition-transform duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            ${mariahState === 'hidden' ? 'translate-y-[120%]' : ''}
            ${mariahState === 'peeking' ? 'translate-y-[50%]' : ''}
            ${mariahState === 'screaming' ? 'translate-y-[0%]' : ''}
        `}
      >
           <div className={`relative w-60 md:w-80 transition-transform duration-100 ${mariahState === 'screaming' ? 'animate-shake-intense origin-bottom' : ''}`}>
               {/* The Speech Bubble (Only visible when screaming) */}
               <div className={`absolute -top-32 -right-10 md:-right-20 bg-white border-4 border-red-600 text-red-600 p-6 rounded-[3rem] rounded-bl-none shadow-[0_10px_40px_rgba(0,0,0,0.3)] z-50 transition-all duration-300 transform
                    ${mariahState === 'screaming' ? 'opacity-100 scale-100 rotate-6' : 'opacity-0 scale-0 rotate-0'}
               `}>
                   <p className="text-4xl font-black tracking-tighter uppercase animate-pulse drop-shadow-md whitespace-nowrap">
                       IT'S TIMEEEEE!
                   </p>
                   <div className="text-2xl absolute -top-4 -right-4 animate-bounce">🎄</div>
                   <div className="text-2xl absolute -bottom-4 -left-4 animate-bounce delay-100">❄️</div>
               </div>

               {/* Mariah Image (Using reliable Spotify CDN) */}
               <img 
                   src="https://i.scdn.co/image/ab67616d0000b2734246e3158421f5abb75abc4f" 
                   alt="Mariah" 
                   className="w-full h-auto drop-shadow-2xl rounded-t-full border-8 border-white/30 bg-red-100" 
               />
               
               {/* Peeking Eyes Overlay (Optional comedic effect for peeking stage) */}
               {mariahState === 'peeking' && (
                   <div className="absolute top-[20%] left-[40%] text-4xl animate-bounce">👀</div>
               )}
           </div>
      </div>

      {/* CHRISTMAS GREETING POPUP */}
      {showXmasPopup && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-500">
            <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(220,38,38,0.5)] overflow-hidden relative animate-in zoom-in-50 slide-in-from-bottom-[20%] duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] group transition-all">
                
                {/* Festive Header Background - Changes color based on stage */}
                <div className={`absolute top-0 inset-x-0 h-36 bg-gradient-to-b ${giftOpened ? 'from-amber-400 via-amber-500' : 'from-red-600 via-red-500'} to-transparent z-0 transition-colors duration-700`}></div>
                
                {/* Decorations (only in greeting mode) */}
                {!giftOpened && (
                    <>
                        <div className="absolute top-[-20px] left-[-20px] text-[5rem] opacity-20 rotate-[-15deg] select-none animate-[wiggle_3s_ease-in-out_infinite]">❄️</div>
                        <div className="absolute top-[20px] right-[-20px] text-[4rem] opacity-20 rotate-[15deg] select-none animate-[wiggle_3s_ease-in-out_infinite_reverse]">🎄</div>
                    </>
                )}

                <div className="relative z-10 flex flex-col items-center text-center pt-12 pb-8 px-8">
                    
                    {!giftOpened ? (
                        /* --- STAGE 1: GREETING --- */
                        <div className="w-full flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Main Icon */}
                            <div className="relative mb-6">
                                <div className="w-28 h-28 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-2xl border-4 border-red-100 dark:border-red-900/30 z-10 relative">
                                    <span className="text-7xl animate-[bounce_2s_infinite] origin-bottom">🎅</span>
                                </div>
                                {/* Gift Icon */}
                                <div className="absolute -bottom-2 -right-2 bg-green-500 text-white p-3 rounded-full border-4 border-white dark:border-slate-900 shadow-xl animate-[pulse_2s_infinite] z-50 scale-110 transform rotate-12">
                                    <Gift className="w-6 h-6" />
                                </div>
                            </div>

                            {/* Text */}
                            <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-2 tracking-tight drop-shadow-sm">
                                Giáng Sinh Vui Vẻ!
                            </h2>
                            <p className="text-slate-600 dark:text-slate-300 mb-8 leading-relaxed text-lg">
                                Chúc <span className="font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-lg border border-red-100 dark:border-red-900/50">{user.fullName}</span> một mùa lễ hội ấm áp, tràn đầy niềm vui và học tốt Giải phẫu nhé! 🦦❄️
                            </p>

                            {/* Action Button */}
                            <button 
                                onClick={handleOpenGift}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold text-lg shadow-lg shadow-red-500/30 transform transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 group/btn"
                            >
                                <Gift className="w-5 h-5 group-hover/btn:animate-bounce" />
                                <span>Nhận quà Giáng Sinh</span>
                            </button>
                        </div>
                    ) : (
                        /* --- STAGE 2: GIFT REVEAL --- */
                        <div className="w-full flex flex-col items-center animate-in zoom-in-90 duration-500">
                             <div className="relative mb-6">
                                <div className="w-28 h-28 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(251,191,36,0.6)] border-4 border-amber-200 dark:border-amber-900/30 z-10 relative">
                                    <span className="text-6xl animate-[wiggle_1s_infinite]">🎁</span>
                                </div>
                                {/* Glowing Aura */}
                                <div className="absolute top-0 left-0 w-full h-full rounded-full animate-ping bg-amber-400/30"></div>
                                <div className="absolute top-[-20px] left-[50%] translate-x-[-50%] text-amber-400 animate-bounce"><Sparkles className="w-8 h-8" /></div>
                            </div>

                            <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
                                Quà tặng học tập!
                            </h2>
                             <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                                Rái cá gửi tặng bạn tài liệu ôn thi độc quyền nè.
                            </p>

                            {/* Google Drive Link Card */}
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

                {/* Close X */}
                <button 
                    onClick={() => setShowXmasPopup(false)}
                    className="absolute top-4 right-4 p-2 bg-black/10 hover:bg-black/20 dark:bg-white/10 dark:hover:bg-white/20 rounded-full text-white transition-colors z-50 backdrop-blur-sm"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
        </div>
      )}

      {/* OTTER FOCUS MODE OVERLAY - SMOOTH TRANSITION UPDATE */}
      {/* We keep this rendered to allow exit animations via CSS classes */}
      <div 
          className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
          ${isOtterMode ? 'opacity-100 visible backdrop-blur-md bg-slate-900/60' : 'opacity-0 invisible backdrop-blur-none bg-transparent pointer-events-none'}`}
          onClick={() => setIsOtterMode(false)}
      >
          <div 
              className={`relative max-w-lg w-full mx-4 bg-gradient-to-br from-red-500 to-emerald-600 p-1 rounded-[3rem] shadow-[0_0_100px_rgba(220,38,38,0.4)] cursor-default group transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]
              ${isOtterMode ? 'scale-100 translate-y-0 opacity-100' : 'scale-50 -translate-y-20 -translate-x-20 opacity-0'}`}
              onClick={(e) => e.stopPropagation()}
          >
              <div className="bg-white dark:bg-slate-900 rounded-[2.9rem] p-12 flex flex-col items-center text-center relative overflow-hidden">
                  {/* Background decoration */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.15),transparent_70%)]"></div>
                  <div className="absolute top-0 right-0 w-40 h-40 bg-red-400/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                  <div className="absolute bottom-0 left-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>
                  
                  {/* Large Animated Otter */}
                  <div 
                      className="relative z-10 mb-8 transform transition-transform duration-500 hover:scale-110 cursor-pointer" 
                      onClick={() => setIsOtterMode(false)}
                  >
                      <div className="text-[8rem] md:text-[10rem] leading-none animate-[bounce_3s_infinite] drop-shadow-2xl filter">
                          🎅
                      </div>
                      {/* Sparkles */}
                      <div className="absolute top-0 right-0 animate-pulse text-red-400"><Sparkles className="w-8 h-8" /></div>
                      <div className="absolute bottom-4 left-4 animate-pulse delay-300 text-emerald-400"><Sparkles className="w-6 h-6" /></div>
                  </div>

                  <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-emerald-600 mb-4 tracking-tight">
                      AnatomyOtter
                  </h2>
                  <p className="text-slate-600 dark:text-slate-300 text-lg font-medium mb-8 max-w-xs mx-auto leading-relaxed">
                      Người bạn đồng hành tin cậy trên hành trình chinh phục giải phẫu học.
                  </p>

                  <button 
                      onClick={() => setIsOtterMode(false)}
                      className="px-8 py-3 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-sm font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                      Đóng
                  </button>
              </div>
          </div>
      </div>

      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center space-x-2 group cursor-pointer select-none transition-transform active:scale-95"
            onClick={() => setIsOtterMode(true)}
          >
            <div 
                className="w-10 h-10 bg-gradient-to-br from-red-500 to-green-600 rounded-xl flex items-center justify-center liquid-icon relative z-10"
                style={{ '--glow-color': 'rgba(220, 38, 38, 0.6)' } as React.CSSProperties}
            >
                <span className="text-2xl leading-none">🦦</span>
                <span className="absolute -top-2 -right-1 text-base rotate-12 drop-shadow-sm">🎄</span>
            </div>
            <div className="flex flex-col md:flex-row md:items-baseline gap-0 md:gap-2">
                <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight transition-colors leading-none">
                Anatomy<span className="text-red-600 text-glow">Otter</span>
                </h1>
                <span 
                    onClick={(e) => { e.stopPropagation(); triggerMariahSequence(); }}
                    className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 self-start md:self-auto cursor-pointer hover:scale-110 transition-transform hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 hover:border-red-200"
                    title="???"
                >
                    Xmas
                </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleDarkMode}
              className="liquid-icon relative rounded-xl text-slate-500 dark:text-slate-400 w-10 h-10 flex items-center justify-center overflow-hidden focus:outline-none bg-slate-100 dark:bg-slate-800"
              style={{ '--glow-color': darkMode ? 'rgba(99, 102, 241, 0.5)' : 'rgba(245, 158, 11, 0.5)' } as React.CSSProperties}
              aria-label="Toggle Dark Mode"
            >
               <div className={`absolute transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${darkMode ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`}>
                  <Sun className="w-5 h-5" />
               </div>
               <div className={`absolute transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${darkMode ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}>
                  <Moon className="w-5 h-5" />
               </div>
            </button>
            
            {/* Profile Section with Hover Popup */}
            <div 
                className="relative z-50"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
               {/* Unified Trigger Card */}
               <div 
                  className="flex items-center gap-3 px-3 py-1.5 rounded-2xl liquid-icon cursor-pointer bg-transparent transition-all duration-300 border border-transparent hover:border-amber-100 dark:hover:border-amber-900"
                  style={{ '--glow-color': 'rgba(245, 158, 11, 0.5)' } as React.CSSProperties}
               >
                  <div className="hidden md:block text-right">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors">{user.fullName}</p>
                      <p className="text-xs text-slate-400 transition-colors">{user.studentId}</p>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 transition-colors relative">
                      {user.avatar ? (
                        <img 
                          src={user.avatar} 
                          alt="Profile" 
                          className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700" 
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
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Thông tin cá nhân</p>
                  </div>
                  
                  <div className="p-4">
                    {isEditing ? (
                        <div className="space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
                            {/* Avatar Upload in Edit Mode */}
                            <div className="flex justify-center mb-4">
                                <div 
                                    className="relative group cursor-pointer"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-amber-500 relative">
                                        {editAvatar ? (
                                            <img src={editAvatar} alt="Edit" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                <UserCircle className="w-10 h-10 text-slate-400" />
                                            </div>
                                        )}
                                        {/* Overlay */}
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
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-700 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                    {user.avatar ? (
                                        <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                        <UserCircle className="w-7 h-7" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">{user.fullName}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{user.studentId}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => {
                                    setIsEditing(true);
                                    setEditName(user.fullName);
                                    setEditId(user.studentId);
                                    setEditAvatar(user.avatar);
                                }}
                                className="w-full py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                            >
                                <Settings className="w-4 h-4" />
                                Chỉnh sửa thông tin
                            </button>
                        </div>
                    )}
                  </div>

                  <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
                    <button 
                        onClick={onLogout}
                        className="w-full py-2 px-4 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                    >
                        <LogOut className="w-4 h-4" />
                        Đăng xuất
                    </button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        {children}
      </main>
      
      {/* Otter Chat Widget */}
      <OtterChat />

      {/* Feedback Button - Conditional Render */}
      {showFeedback && (
          <a 
              href="https://mail.google.com/mail/?view=cm&fs=1&to=datken100@gmail.com&su=[Góp ý] AnatomyOtter"
              target="_blank"
              rel="noopener noreferrer"
              className="fixed bottom-6 left-6 z-40 flex items-center gap-0 hover:gap-2 px-3 hover:px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 group hover:shadow-blue-500/20"
          >
              <Mail className="w-5 h-5" />
              <span className="max-w-0 overflow-hidden group-hover:max-w-xs opacity-0 group-hover:opacity-100 transition-all duration-300 text-sm font-bold whitespace-nowrap">
                  Góp ý
              </span>
          </a>
      )}
    </div>
  );
};
    