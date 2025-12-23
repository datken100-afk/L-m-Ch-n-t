
import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, GraduationCap, User, Camera, Upload, Loader2, Snowflake, Mail, Lock, Eye, EyeOff, LogIn, ChevronLeft, KeyRound, CheckCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { ThemeType } from '../App';
import { auth, db } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { STUDENT_WHITELIST } from '../data/studentWhitelist';

interface LoginScreenProps {
  onLogin: (user: UserProfile) => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  isExiting?: boolean;
  theme: ThemeType;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, darkMode, toggleDarkMode, isExiting = false, theme }) => {
  // Flow State: WELCOME -> AUTH -> FORGOT
  const [step, setStep] = useState<'WELCOME' | 'AUTH' | 'FORGOT'>('WELCOME');

  // Auth State
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // EASTER EGG STATE
  const [easterEggState, setEasterEggState] = useState<'hidden' | 'peeking' | 'screaming'>('hidden');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trigger Easter Egg on mount (Only if Not Default)
  useEffect(() => {
      if (theme === 'default') return;
      const timer = setTimeout(() => {
          triggerEasterEggSequence();
      }, 1000);
      return () => clearTimeout(timer);
  }, [theme]);

  const triggerEasterEggSequence = () => {
      setEasterEggState('peeking');
      setTimeout(() => {
          setEasterEggState('screaming');
          setTimeout(() => {
              setEasterEggState('hidden');
          }, 4000);
      }, 2000);
  };

  const translateFirebaseError = (errorCode: string) => {
      switch (errorCode) {
          case 'auth/email-already-in-use':
              return 'Email này đã được sử dụng.';
          case 'auth/invalid-email':
              return 'Địa chỉ Email không hợp lệ.';
          case 'auth/user-not-found':
              return 'Không tìm thấy tài khoản với Email này.';
          case 'auth/wrong-password':
              return 'Mật khẩu không chính xác.';
          case 'auth/weak-password':
              return 'Mật khẩu phải có ít nhất 6 ký tự.';
          case 'auth/too-many-requests':
              return 'Đã thử quá nhiều lần. Vui lòng thử lại sau.';
          case 'auth/credential-already-in-use':
              return 'Thông tin đăng nhập đã được sử dụng.';
          case 'permission-denied':
              return 'Lỗi quyền truy cập dữ liệu (Permission Denied). Đang thử đăng nhập lại...';
          default:
              return `Lỗi: ${errorCode}`;
      }
  };

  // --- FIREBASE AUTH HANDLERS ---

  const handleLoginFirebase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
        setError('Vui lòng nhập Email và Mật khẩu.');
        return;
    }

    setIsLoading(true);

    try {
        // 1. Login with Auth
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;
        
        // 2. Fetch extra User Data from Firestore
        let userData: any = null;
        try {
            const userDocRef = doc(db, "users", uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                userData = userDoc.data();
            }
        } catch (firestoreError) {
            console.warn("Firestore Read Error (ignoring for login):", firestoreError);
            // Fallthrough: If we can't read profile (permission-denied), we still allow login with basic auth info.
        }

        if (userData) {
            onLogin({
                uid: uid,
                fullName: userData.fullName,
                studentId: userData.studentId,
                avatar: userData.avatar || undefined,
                isVipShowgirl: userData.isVipShowgirl || false,
                isVip1989: userData.isVip1989,
                isVipFolklore: userData.isVipFolklore,
                isVipTTPD: userData.isVipTTPD,
                isVipEvermore: userData.isVipEvermore,
                isVipTet2026: userData.isVipTet2026
            });
        } else {
             // Fallback if user exists in Auth but not in Firestore OR if Permission Denied
             onLogin({
                uid: uid,
                fullName: userCredential.user.displayName || email.split('@')[0],
                studentId: "N/A",
                avatar: undefined,
                isVipShowgirl: false
            });
        }

    } catch (err: any) {
        console.error("Login Error:", err);
        setError(translateFirebaseError(err.code));
    } finally {
        setIsLoading(false);
    }
  };

  const handleRegisterFirebase = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedFullName = fullName.trim();
    const trimmedStudentId = studentId.trim();

    if (!email || !password || !trimmedFullName || !trimmedStudentId) {
        setError('Vui lòng điền đầy đủ thông tin đăng ký.');
        return;
    }

    // --- 1. VALIDATE AGAINST WHITELIST ---
    const normalizeStr = (str: string) => str.trim().toLowerCase().normalize("NFC");

    const isAllowed = STUDENT_WHITELIST.find(s => 
        s.id === trimmedStudentId && 
        normalizeStr(s.name) === normalizeStr(trimmedFullName)
    );

    if (!isAllowed) {
        setError('Thông tin Họ tên và MSSV không khớp với danh sách được cấp phép.');
        return;
    }

    setIsLoading(true);

    try {
        // --- 2. CHECK FOR DUPLICATE STUDENT ID IN FIRESTORE ---
        let isDuplicate = false;
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("studentId", "==", trimmedStudentId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                isDuplicate = true;
            }
        } catch (dbError) {
            console.warn("Could not check duplicates due to permissions", dbError);
            // Proceed cautiously if we can't check
        }

        if (isDuplicate) {
            setError('Mã số sinh viên này đã được đăng ký tài khoản.');
            setIsLoading(false);
            return;
        }

        // --- 3. Create User in Auth ---
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const uid = userCredential.user.uid;

        // --- 4. Save Extra Info to Firestore ---
        const newUser = {
            fullName: trimmedFullName, 
            studentId: trimmedStudentId,
            email: email,
            avatar: avatar || null,
            isVipShowgirl: false, // Default to not VIP
            createdAt: new Date().toISOString()
        };

        try {
            await setDoc(doc(db, "users", uid), newUser);
        } catch (writeErr) {
            console.error("Failed to write profile", writeErr);
            // Proceed even if write fails (Auth succeeded)
        }
        
        // --- 5. Auto Login ---
        onLogin({
            uid: uid,
            fullName: newUser.fullName,
            studentId: newUser.studentId,
            avatar: newUser.avatar || undefined,
            isVipShowgirl: false
        });

    } catch (err: any) {
        console.error("Register Error:", err);
        setError(translateFirebaseError(err.code));
    } finally {
        setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setSuccessMsg('');

      const trimmedFullName = fullName.trim();
      const trimmedStudentId = studentId.trim();

      if (!email || !trimmedFullName || !trimmedStudentId) {
          setError('Vui lòng nhập đủ Email, Họ tên và MSSV để xác minh.');
          return;
      }

      setIsLoading(true);

      try {
          // 1. Query Firestore to find user with this Email
          const usersRef = collection(db, "users");
          const q = query(usersRef, where("email", "==", email));
          const querySnapshot = await getDocs(q);

          if (querySnapshot.empty) {
              setError('Không tìm thấy tài khoản với Email này.');
              setIsLoading(false);
              return;
          }

          // 2. Verify Name and Student ID locally
          const userData = querySnapshot.docs[0].data();
          
          const normalizeStr = (str: string) => str.trim().toLowerCase().normalize("NFC");
          const isNameMatch = normalizeStr(userData.fullName) === normalizeStr(trimmedFullName);
          const isIdMatch = userData.studentId === trimmedStudentId;

          if (!isNameMatch || !isIdMatch) {
              setError('Thông tin xác minh (Họ tên hoặc MSSV) không khớp với dữ liệu hệ thống.');
              setIsLoading(false);
              return;
          }

          // 3. Send Password Reset Email via Firebase Auth
          await sendPasswordResetEmail(auth, email);
          
          setSuccessMsg('Đã gửi liên kết đặt lại mật khẩu vào Email của bạn. Vui lòng kiểm tra hộp thư (kể cả mục Spam).');
          
      } catch (err: any) {
          console.error("Reset Password Error:", err);
          if (err.code === 'permission-denied') {
              setError('Hệ thống đang bảo trì quyền truy cập. Vui lòng liên hệ Admin để được hỗ trợ đặt lại mật khẩu.');
          } else {
              setError(translateFirebaseError(err.code));
          }
      } finally {
          setIsLoading(false);
      }
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

  // Theme Specific Styles
  const getThemeStyles = () => {
    switch (theme) {
        case 'xmas':
            return {
                headerGradient: 'from-red-600 to-emerald-700',
                btnGradient: 'from-red-600 to-emerald-600 hover:from-red-700 hover:to-emerald-700',
                btnShadow: 'shadow-[0_10px_20px_-10px_rgba(220,38,38,0.5)] hover:shadow-[0_20px_30px_-10px_rgba(16,185,129,0.5)]',
                focusRing: 'focus:ring-red-500',
                iconBg: 'bg-red-500',
                badgeBg: 'bg-red-600 text-white',
                textLink: 'text-red-500 hover:text-red-600'
            };
        case 'swift':
            return {
                headerGradient: 'from-pink-400 via-purple-400 to-indigo-400',
                btnGradient: 'from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700',
                btnShadow: 'shadow-[0_10px_20px_-10px_rgba(236,72,153,0.5)] hover:shadow-[0_20px_30px_-10px_rgba(168,85,247,0.5)]',
                focusRing: 'focus:ring-purple-500',
                iconBg: 'bg-purple-500',
                badgeBg: 'bg-white text-purple-600 font-bold',
                textLink: 'text-purple-500 hover:text-purple-600'
            };
        case 'blackpink':
            return {
                headerGradient: 'from-pink-500 via-rose-500 to-pink-600 shadow-[0_0_50px_rgba(236,72,153,0.5)]',
                btnGradient: 'from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500',
                btnShadow: 'shadow-[0_0_20px_rgba(236,72,153,0.6)] hover:shadow-[0_0_30px_rgba(236,72,153,0.8)]',
                focusRing: 'focus:ring-pink-500',
                iconBg: 'bg-pink-500',
                badgeBg: 'bg-pink-500 text-white font-bold border border-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.5)]',
                textLink: 'text-pink-500 hover:text-pink-400'
            };
        case 'aespa':
            return {
                headerGradient: 'from-slate-700 via-indigo-900 to-slate-900 border-b-4 border-purple-500',
                btnGradient: 'from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500',
                btnShadow: 'shadow-[0_0_20px_rgba(167,139,250,0.6)] hover:shadow-[0_0_30px_rgba(167,139,250,0.8)]',
                focusRing: 'focus:ring-indigo-500',
                iconBg: 'bg-gradient-to-br from-indigo-500 to-purple-600',
                badgeBg: 'bg-slate-900 text-purple-400 border border-purple-500',
                textLink: 'text-indigo-400 hover:text-indigo-300'
            };
        case 'rosie':
            return {
                headerGradient: 'from-rose-500 via-red-500 to-rose-600 shadow-[0_0_40px_rgba(225,29,72,0.5)]',
                btnGradient: 'from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500',
                btnShadow: 'shadow-[0_0_20px_rgba(225,29,72,0.6)] hover:shadow-[0_0_30px_rgba(225,29,72,0.8)]',
                focusRing: 'focus:ring-rose-500',
                iconBg: 'bg-rose-500',
                badgeBg: 'bg-rose-100 text-rose-600 font-bold border border-rose-400',
                textLink: 'text-rose-500 hover:text-rose-600'
            };
        case 'pkl':
            return {
                headerGradient: 'from-slate-800 via-cyan-800 to-slate-900 shadow-[0_0_40px_rgba(6,182,212,0.4)]',
                btnGradient: 'from-slate-700 to-cyan-700 hover:from-slate-600 hover:to-cyan-600 border border-cyan-500',
                btnShadow: 'shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]',
                focusRing: 'focus:ring-cyan-500',
                iconBg: 'bg-gradient-to-br from-cyan-500 to-slate-600',
                badgeBg: 'bg-slate-800 text-cyan-400 font-bold border border-cyan-500',
                textLink: 'text-cyan-500 hover:text-cyan-400'
            };
        case 'showgirl':
            return {
                headerGradient: 'from-teal-500 via-orange-400 to-teal-600 shadow-[0_0_50px_rgba(20,184,166,0.5)]',
                btnGradient: 'from-teal-500 to-orange-500 hover:from-teal-600 hover:to-orange-600',
                btnShadow: 'shadow-[0_0_20px_rgba(249,115,22,0.6)] hover:shadow-[0_0_30px_rgba(20,184,166,0.8)]',
                focusRing: 'focus:ring-orange-500',
                iconBg: 'bg-gradient-to-br from-teal-400 to-orange-500',
                badgeBg: 'bg-orange-500 text-white font-bold border border-orange-400',
                textLink: 'text-orange-500 hover:text-orange-400'
            };
        default:
            return {
                headerGradient: 'from-amber-400 to-orange-600',
                btnGradient: 'from-amber-400 to-orange-600 hover:from-amber-500 hover:to-orange-700',
                btnShadow: 'shadow-[0_10px_20px_-10px_rgba(245,158,11,0.5)] hover:shadow-[0_20px_30px_-10px_rgba(251,146,60,0.5)]',
                focusRing: 'focus:ring-amber-500',
                iconBg: 'bg-amber-500',
                badgeBg: '',
                textLink: 'text-amber-500 hover:text-amber-600'
            };
    }
  };

  const styles = getThemeStyles();

  // Easter Egg Data
  const getEasterEggContent = () => {
      if (theme === 'xmas') return { text: "IT'S TIMEEEEE!", icon: '🎄', img: "https://i.scdn.co/image/ab67616d0000b2734246e3158421f5abb75abc4f", bg: 'bg-red-100', border: 'border-red-600 text-red-600' };
      if (theme === 'swift') return { text: "ARE YOU READY?", icon: '🐍', img: "https://em-content.zobj.net/source/microsoft-teams/337/snake_1f40d.png", bg: 'bg-green-100', border: 'border-slate-800 text-slate-800' };
      if (theme === 'blackpink') return { text: "BLACKPINK!", icon: '🔨', img: null, bg: 'bg-slate-900', border: 'border-pink-500 text-pink-500' };
      if (theme === 'aespa') return { text: "SUPERNOVA!", icon: '🪐', img: null, bg: 'bg-slate-900', border: 'border-indigo-500 text-indigo-500' };
      if (theme === 'rosie') return { text: "APT. APT.!", icon: '⚡', img: null, bg: 'bg-rose-100', border: 'border-rose-500 text-rose-500' };
      if (theme === 'pkl') return { text: "KHÓC BLOCK", icon: '⚔️', img: null, bg: 'bg-slate-800', border: 'border-cyan-500 text-cyan-500' };
      if (theme === 'showgirl') return { text: "OPALITE", icon: '💎', img: null, bg: 'bg-gradient-to-br from-teal-100 to-orange-100', border: 'border-orange-500 text-orange-600' };
      return null;
  };
  const egg = getEasterEggContent();

  return (
    <div className={`min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${isExiting ? 'opacity-0 blur-md scale-95 -translate-y-10' : 'opacity-100 scale-100'}`}>
      
      {/* EASTER EGG POPUP */}
      {theme !== 'default' && egg && (
        <div 
            className={`fixed bottom-0 left-0 md:left-10 z-[99999] pointer-events-none transition-transform duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)]
                ${easterEggState === 'hidden' ? 'translate-y-[120%]' : ''}
                ${easterEggState === 'peeking' ? 'translate-y-[50%]' : ''}
                ${easterEggState === 'screaming' ? 'translate-y-[0%]' : ''}
            `}
        >
            <div className={`relative w-60 md:w-80 transition-transform duration-100 ${easterEggState === 'screaming' ? 'animate-shake-intense origin-bottom' : ''}`}>
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
                ) : (
                    <img 
                        src={egg.img!} 
                        alt="Easter Egg" 
                        className={`w-full h-auto drop-shadow-2xl rounded-t-full border-8 border-white/30 ${egg.bg}`} 
                    />
                )}
            </div>
        </div>
      )}

      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 relative z-10">
        {/* BRANDING HEADER */}
        <div className={`bg-gradient-to-br ${styles.headerGradient} p-8 text-center relative overflow-hidden transition-colors duration-500`}>
          {theme === 'xmas' && (
             <>
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-pulse"></div>
                <div className="absolute -top-4 -left-4 text-white/20 rotate-12"><Snowflake size={60} /></div>
                <div className="absolute top-10 right-4 text-white/20 -rotate-12"><Snowflake size={40} /></div>
             </>
          )}
          {(theme === 'swift' || theme === 'blackpink' || theme === 'aespa' || theme === 'rosie' || theme === 'pkl' || theme === 'showgirl') && (
             <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.8),transparent)]"></div>
          )}
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border-4 border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.3)]">
              <span className="text-5xl leading-none drop-shadow-md transform -translate-y-1">
                {theme === 'xmas' ? '🎅' : theme === 'swift' ? '🐍' : theme === 'blackpink' ? '👑' : theme === 'aespa' ? '👽' : theme === 'rosie' ? '🌹' : theme === 'pkl' ? '🗡️' : theme === 'showgirl' ? '💃' : '🦦'}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center gap-1">
                <h1 className="text-3xl font-black text-white text-glow-white tracking-tight">AnatomyOtter <span className="text-lg font-mono opacity-80">v1.1</span></h1>
                
                {theme !== 'default' && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm ${styles.badgeBg}`}>
                        {theme === 'xmas' ? 'Xmas Edition v1.1' : theme === 'swift' ? "Taylor's Version v1.1" : theme === 'blackpink' ? "Born Pink v1.1" : theme === 'aespa' ? "MY WORLD v1.1" : theme === 'rosie' ? "number one girl" : theme === 'pkl' ? "G1VN Edition" : theme === 'showgirl' ? "The Life of a Showgirl" : ""}
                    </span>
                )}
            </div>
            <p className="text-white/90 mt-3 font-medium">
                {step === 'WELCOME' 
                    ? "Hệ thống ôn thi Giải phẫu học thông minh" 
                    : step === 'FORGOT' ? "Khôi phục mật khẩu" 
                    : (isRegistering ? "Tạo tài khoản mới" : "Đăng nhập để tiếp tục")}
            </p>
          </div>
        </div>

        <div className="p-8">
            
          {/* STEP 1: WELCOME SCREEN */}
          {step === 'WELCOME' ? (
             <div className="space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="space-y-2">
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                          Chào mừng bạn đến với <span className="font-bold text-slate-800 dark:text-white">AnatomyOtter</span>. 
                          Hãy đăng nhập để lưu trữ kết quả học tập và sử dụng các tính năng nâng cao của Rái cá nhé! 🦦
                      </p>
                  </div>
                  <button
                      onClick={() => setStep('AUTH')}
                      className={`w-full bg-gradient-to-r ${styles.btnGradient} text-white font-bold py-4 rounded-xl ${styles.btnShadow} flex items-center justify-center gap-2 group transition-all duration-300 transform active:scale-95`}
                  >
                      <span>Bắt đầu học</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
             </div>
          ) : step === 'FORGOT' ? (
             /* STEP 3: FORGOT PASSWORD SCREEN */
             <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                 <button 
                    onClick={() => { setStep('AUTH'); setError(''); setSuccessMsg(''); }}
                    className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mb-6 transition-colors"
                >
                     <ChevronLeft className="w-4 h-4" /> Quay lại
                </button>

                <div className="space-y-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                        <p className="text-sm text-blue-800 dark:text-blue-300 leading-relaxed">
                            Để bảo mật, vui lòng nhập đúng <strong>Họ tên</strong> và <strong>Mã số sinh viên</strong> đã đăng ký để nhận liên kết đặt lại mật khẩu.
                        </p>
                    </div>

                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase text-xs tracking-wider">Email đăng nhập</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-slate-400" />
                                </div>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className={`w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 ${styles.focusRing}`}
                                    placeholder="email@domain.com"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

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
                                    className={`w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 ${styles.focusRing}`}
                                    placeholder="Nguyễn Văn A"
                                    disabled={isLoading}
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
                                    className={`w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 ${styles.focusRing}`}
                                    placeholder="Nhập chính xác MSSV"
                                    disabled={isLoading}
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-600 text-sm text-center bg-red-50 dark:bg-red-900/20 py-3 rounded-xl font-medium border border-red-200 dark:border-red-900/50 animate-pulse">
                                {error}
                            </p>
                        )}

                        {successMsg && (
                            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-200 dark:border-green-800 flex flex-col items-center text-center gap-2">
                                <CheckCircle className="w-8 h-8 text-green-500" />
                                <p className="text-green-700 dark:text-green-300 text-sm font-medium">
                                    {successMsg}
                                </p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !!successMsg}
                            className={`w-full bg-gradient-to-r ${styles.btnGradient} text-white font-bold py-4 rounded-xl ${styles.btnShadow} flex items-center justify-center gap-2 group disabled:opacity-80 disabled:cursor-wait transition-all duration-300 transform active:scale-95 mt-4`}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>Đang xác minh...</span>
                                </>
                            ) : successMsg ? (
                                <span>Đã gửi yêu cầu</span>
                            ) : (
                                <>
                                    <span>Xác minh & Gửi Link</span>
                                    <KeyRound className="w-5 h-5" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
             </div>
          ) : (
             /* STEP 2: AUTH SCREEN (Login / Register) */
             <div className="animate-in fade-in slide-in-from-right-8 duration-500">
                <button 
                    onClick={() => setStep('WELCOME')}
                    className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mb-6 transition-colors"
                >
                     <ChevronLeft className="w-4 h-4" /> Quay lại
                </button>

                {/* Avatar Upload (Only in Register Mode) */}
                {isRegistering && (
                    <div className="flex justify-center -mt-6 mb-6 relative z-20">
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
                        <div className={`absolute bottom-0 right-0 text-white p-2 rounded-full shadow-md hover:opacity-90 transition-colors border-2 border-white dark:border-slate-900 ${styles.iconBg}`}>
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
                )}

                <form onSubmit={isRegistering ? handleRegisterFirebase : handleLoginFirebase} className="space-y-4">
                    
                    {/* LOGIN / REGISTER FIELDS */}
                    <div className="space-y-4">
                        {/* EMAIL */}
                        <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase text-xs tracking-wider">Email</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Mail className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 ${styles.focusRing}`}
                            placeholder="example@gmail.com"
                            disabled={isExiting || isLoading}
                            />
                        </div>
                        </div>

                        {/* PASSWORD */}
                        <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase text-xs tracking-wider">Mật khẩu</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Lock className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`w-full pl-11 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 ${styles.focusRing}`}
                            placeholder="••••••••"
                            disabled={isExiting || isLoading}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            >
                                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                            </button>
                        </div>
                        </div>

                        {/* EXTRA FIELDS FOR REGISTER */}
                        {isRegistering && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                                            className={`w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 ${styles.focusRing}`}
                                            placeholder="Nguyễn Văn A"
                                            disabled={isExiting || isLoading}
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
                                            className={`w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:border-transparent outline-none transition-all text-slate-900 dark:text-white placeholder-slate-400 ${styles.focusRing}`}
                                            placeholder="Nhập chính xác MSSV"
                                            disabled={isExiting || isLoading}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* FORGOT PASSWORD LINK (Only in Login Mode) */}
                    {!isRegistering && (
                        <div className="flex justify-end">
                            <button
                                type="button"
                                onClick={() => { 
                                    setStep('FORGOT'); 
                                    setError('');
                                    // Pre-clear inputs or keep email if typed? Keeping email is better UX.
                                }}
                                className={`text-sm font-medium transition-colors ${styles.textLink}`}
                            >
                                Quên mật khẩu?
                            </button>
                        </div>
                    )}

                    {error && (
                    <p className="text-red-600 text-sm text-center bg-red-50 dark:bg-red-900/20 py-3 rounded-xl font-medium border border-red-200 dark:border-red-900/50 animate-pulse">
                        {error}
                    </p>
                    )}

                    <button
                    type="submit"
                    disabled={isExiting || isLoading}
                    className={`w-full bg-gradient-to-r ${styles.btnGradient} text-white font-bold py-4 rounded-xl ${styles.btnShadow} flex items-center justify-center gap-2 group disabled:opacity-80 disabled:cursor-wait transition-all duration-300 transform active:scale-95 mt-4`}
                    >
                    {isLoading || isExiting ? (
                        <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Đang xử lý...</span>
                        </>
                    ) : (
                        <>
                        <span>{isRegistering ? "Đăng ký tài khoản" : "Đăng nhập"}</span>
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </>
                    )}
                    </button>
                </form>
             </div>
          )}
        </div>
        
        {/* FOOTER TOGGLE (Only visible in Auth Step) */}
        {step === 'AUTH' && (
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 text-center border-t border-slate-100 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {isRegistering ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
                    <button 
                        onClick={() => {
                            setIsRegistering(!isRegistering);
                            setError('');
                        }}
                        className={`font-bold ${styles.textLink} transition-colors focus:outline-none ml-1`}
                    >
                        {isRegistering ? "Đăng nhập ngay" : "Đăng ký ngay"}
                    </button>
                </p>
            </div>
        )}
      </div>
    </div>
  );
};
