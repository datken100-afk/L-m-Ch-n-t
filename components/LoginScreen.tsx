
import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, GraduationCap, User, Sun, Moon, Camera, Upload, Loader2, Snowflake } from 'lucide-react';
import { UserProfile } from '../types';

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  isExiting?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, darkMode, toggleDarkMode, isExiting = false }) => {
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [error, setError] = useState('');
  
  // MARIAH EASTER EGG STATE
  const [mariahState, setMariahState] = useState<'hidden' | 'peeking' | 'screaming'>('hidden');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger Mariah on mount
  useEffect(() => {
      const timer = setTimeout(() => {
          triggerMariahSequence();
      }, 1000);
      return () => clearTimeout(timer);
  }, []);

  const triggerMariahSequence = () => {
      setMariahState('peeking');
      setTimeout(() => {
          setMariahState('screaming');
          setTimeout(() => {
              setMariahState('hidden');
          }, 4000);
      }, 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !studentId.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    onLogin({
      fullName: fullName.trim(),
      studentId: studentId.trim(),
      avatar: avatar || undefined,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${isExiting ? 'opacity-0 blur-md scale-95 -translate-y-10' : 'opacity-100 scale-100'}`}>
      
      {/* MARIAH CAREY EASTER EGG COMPONENT */}
      <div 
        className={`fixed bottom-0 left-0 md:left-10 z-[99999] pointer-events-none transition-transform duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)]
            ${mariahState === 'hidden' ? 'translate-y-[120%]' : ''}
            ${mariahState === 'peeking' ? 'translate-y-[50%]' : ''}
            ${mariahState === 'screaming' ? 'translate-y-[0%]' : ''}
        `}
      >
           <div className={`relative w-60 md:w-80 transition-transform duration-100 ${mariahState === 'screaming' ? 'animate-shake-intense origin-bottom' : ''}`}>
               {/* The Speech Bubble */}
               <div className={`absolute -top-32 -right-10 md:-right-20 bg-white border-4 border-red-600 text-red-600 p-6 rounded-[3rem] rounded-bl-none shadow-[0_10px_40px_rgba(0,0,0,0.3)] z-50 transition-all duration-300 transform
                    ${mariahState === 'screaming' ? 'opacity-100 scale-100 rotate-6' : 'opacity-0 scale-0 rotate-0'}
               `}>
                   <p className="text-4xl font-black tracking-tighter uppercase animate-pulse drop-shadow-md whitespace-nowrap">
                       IT'S TIMEEEEE!
                   </p>
                   <div className="text-2xl absolute -top-4 -right-4 animate-bounce">🎄</div>
                   <div className="text-2xl absolute -bottom-4 -left-4 animate-bounce delay-100">❄️</div>
               </div>

               {/* Mariah Image (Reliable Source) */}
               <img 
                   src="https://i.scdn.co/image/ab67616d0000b2734246e3158421f5abb75abc4f" 
                   alt="Mariah" 
                   className="w-full h-auto drop-shadow-2xl rounded-t-full border-8 border-white/30 bg-red-100" 
               />
               
               {/* Peeking Eyes */}
               {mariahState === 'peeking' && (
                   <div className="absolute top-[20%] left-[40%] text-4xl animate-bounce">👀</div>
               )}
           </div>
      </div>

      {/* Dark Mode Toggle (Absolute positioned) */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
        <button 
          onClick={toggleDarkMode}
          className="liquid-icon relative rounded-xl text-slate-500 dark:text-slate-400 w-10 h-10 flex items-center justify-center overflow-hidden focus:outline-none bg-white dark:bg-slate-900 shadow-sm"
          style={{ '--glow-color': darkMode ? 'rgba(99, 102, 241, 0.5)' : 'rgba(220, 38, 38, 0.5)' } as React.CSSProperties}
          aria-label="Toggle Dark Mode"
        >
           <div className={`absolute transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${darkMode ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0'}`}>
              <Sun className="w-5 h-5" />
           </div>
           <div className={`absolute transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${darkMode ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`}>
              <Moon className="w-5 h-5" />
           </div>
        </button>
      </div>

      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 relative z-10">
        {/* BRANDING HEADER: CHRISTMAS THEME (Red/Emerald) */}
        <div className="bg-gradient-to-br from-red-600 to-emerald-700 p-8 text-center relative overflow-hidden">
          {/* Snow decoration */}
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-pulse"></div>
          <div className="absolute -top-4 -left-4 text-white/20 rotate-12"><Snowflake size={60} /></div>
          <div className="absolute top-10 right-4 text-white/20 -rotate-12"><Snowflake size={40} /></div>
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border-4 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              {/* Santa Otter */}
              <span className="text-5xl leading-none drop-shadow-md transform -translate-y-1">🎅</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-1">
                <h1 className="text-3xl font-black text-white text-glow-white tracking-tight">AnatomyOtter</h1>
                <span className="text-[10px] font-bold text-red-700 bg-white px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                    Xmas Edition
                </span>
            </div>
            <p className="text-red-100 mt-3 font-medium">Ôn thi Giải phẫu mùa Giáng sinh</p>
          </div>
        </div>

        <div className="p-8">
          <div className="flex justify-center -mt-16 mb-6 relative z-20">
            <div 
              className="relative group cursor-pointer"
              onClick={() => !isExiting && fileInputRef.current?.click()}
            >
              <div className={`w-24 h-24 rounded-full border-4 border-white dark:border-slate-800 shadow-lg flex items-center justify-center overflow-hidden bg-slate-100 dark:bg-slate-700 transition-all ${!avatar ? 'hover:bg-slate-200 dark:hover:bg-slate-600' : ''}`}>
                {avatar ? (
                  <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-400" />
                )}
              </div>
              <div className="absolute bottom-0 right-0 bg-red-500 text-white p-2 rounded-full shadow-md hover:bg-red-600 transition-colors border-2 border-white dark:border-slate-900">
                {avatar ? <Camera className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*" 
                className="hidden" 
                disabled={isExiting}
              />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase text-xs tracking-wider">Họ và tên</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400"
                  placeholder="Nguyễn Văn A"
                  disabled={isExiting}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase text-xs tracking-wider">Mã số sinh viên</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <GraduationCap className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400"
                  placeholder="Nhập chính xác MSSV"
                  disabled={isExiting}
                />
              </div>
            </div>

            {error && (
              <p className="text-red-600 text-sm text-center bg-red-50 dark:bg-red-900/20 py-3 rounded-xl font-medium border border-red-200 dark:border-red-900/50">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isExiting}
              className="w-full bg-gradient-to-r from-red-600 to-emerald-600 hover:from-red-700 hover:to-emerald-700 text-white font-bold py-4 rounded-xl shadow-[0_10px_20px_-10px_rgba(220,38,38,0.5)] hover:shadow-[0_20px_30px_-10px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2 group disabled:opacity-80 disabled:cursor-wait transition-all duration-300 transform active:scale-95"
            >
              {isExiting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Đang vào lớp...</span>
                </>
              ) : (
                <>
                  <span>Bắt đầu học</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
          © {new Date().getFullYear()} AnatomyOtter. Merry Christmas! 🎄
        </div>
      </div>
    </div>
  );
};
