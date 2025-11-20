import React, { useState, useRef } from 'react';
import { Heart, Moon, Sun, UserCircle, LogOut, Settings, Check, X } from 'lucide-react';
import { UserProfile } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: UserProfile;
  onLogout: () => void;
  onUpdateUser: (user: UserProfile) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  user, 
  onLogout, 
  onUpdateUser,
  darkMode,
  toggleDarkMode
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user.fullName);
  const [editId, setEditId] = useState(user.studentId);

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
      setIsEditing(false); // Reset edit mode when closing
    }, 300);
  };

  const handleSaveProfile = () => {
    if (editName.trim() && editId.trim()) {
        onUpdateUser({ fullName: editName, studentId: editId });
        setIsEditing(false);
    }
  };

  const cancelEdit = () => {
    setEditName(user.fullName);
    setEditId(user.studentId);
    setIsEditing(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2 group cursor-pointer">
            <div 
                className="w-10 h-10 bg-medical-600 rounded-xl flex items-center justify-center liquid-icon"
                style={{ '--glow-color': 'rgba(2, 132, 199, 0.6)' } as React.CSSProperties}
            >
                <Heart className="h-6 w-6 text-white transition-colors" fill="currentColor" />
            </div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight group-hover:text-medical-600 dark:group-hover:text-medical-400 transition-colors">
              Anatomy<span className="text-medical-600 dark:text-medical-400 text-glow">Genius</span>
            </h1>
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
                  className="flex items-center gap-3 px-3 py-1.5 rounded-2xl liquid-icon cursor-pointer bg-transparent transition-all duration-300 border border-transparent hover:border-medical-100 dark:hover:border-medical-900"
                  style={{ '--glow-color': 'rgba(2, 132, 199, 0.8)' } as React.CSSProperties}
               >
                  <div className="hidden md:block text-right">
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-200 transition-colors">{user.fullName}</p>
                      <p className="text-xs text-slate-400 transition-colors">{user.studentId}</p>
                  </div>
                  <div className="text-slate-600 dark:text-slate-300 transition-colors">
                      <UserCircle className="w-9 h-9" />
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
                            <div>
                                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Họ và tên</label>
                                <input 
                                    value={editName} 
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full text-sm p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-medical-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Mã số sinh viên</label>
                                <input 
                                    value={editId} 
                                    onChange={(e) => setEditId(e.target.value)}
                                    className="w-full text-sm p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-medical-500 outline-none"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button onClick={handleSaveProfile} className="flex-1 bg-medical-600 text-white py-1.5 rounded-lg text-sm font-medium hover:bg-medical-700 flex items-center justify-center gap-1">
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
                                <div className="w-12 h-12 bg-medical-100 dark:bg-medical-900/30 rounded-full flex items-center justify-center text-medical-600 dark:text-medical-400">
                                    <UserCircle className="w-7 h-7" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white">{user.fullName}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{user.studentId}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setIsEditing(true)}
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
    </div>
  );
};