import React, { useState } from 'react';
import { Heart, ArrowRight, GraduationCap, User, Sun, Moon } from 'lucide-react';
import { UserProfile } from '../types';

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, darkMode, toggleDarkMode }) => {
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !studentId.trim()) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    onLogin({
      fullName: fullName.trim(),
      studentId: studentId.trim(),
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-300 relative">
      
      {/* Dark Mode Toggle (Absolute positioned) */}
      <div className="absolute top-4 right-4 sm:top-8 sm:right-8">
        <button 
          onClick={toggleDarkMode}
          className="liquid-icon relative rounded-xl text-slate-500 dark:text-slate-400 w-10 h-10 flex items-center justify-center overflow-hidden focus:outline-none bg-white dark:bg-slate-900 shadow-sm"
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
      </div>

      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="bg-medical-600 p-8 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Heart className="w-8 h-8 text-white" fill="currentColor" />
          </div>
          <h1 className="text-2xl font-bold text-white text-glow-white">AnatomyGenius</h1>
          <p className="text-medical-100 mt-2">Hệ thống ôn thi giải phẫu thông minh</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Họ và tên</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400"
                  placeholder="Nguyễn Văn A"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Mã số sinh viên</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <GraduationCap className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400"
                  placeholder="Y2024..."
                />
              </div>
            </div>

            {error && (
              <p className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 py-2 rounded-lg">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full bg-medical-600 hover:bg-medical-700 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
            >
              <span>Bắt đầu học</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
          © {new Date().getFullYear()} AnatomyGenius. Dành cho sinh viên Y khoa.
        </div>
      </div>
    </div>
  );
};