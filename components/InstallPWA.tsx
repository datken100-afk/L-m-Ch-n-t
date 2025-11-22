
import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, ChevronRight } from 'lucide-react';
import { ThemeType } from '../App';

interface InstallPWAProps {
  theme: ThemeType;
}

export const InstallPWA: React.FC<InstallPWAProps> = ({ theme }) => {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // 1. Kiểm tra xem đã ở chế độ Standalone (đã cài) chưa
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      return; // Đã cài rồi thì không làm gì cả
    }

    // 2. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 3. Lắng nghe sự kiện cài đặt (Android/Chrome)
    const handler = (e: any) => {
      e.preventDefault();
      setPromptInstall(e);
      setSupportsPWA(true);
      setShowBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Nếu là iOS, luôn hiện banner (vì iOS không có event beforeinstallprompt)
    if (isIosDevice) {
        setSupportsPWA(true);
        // Delay một chút cho mượt
        setTimeout(() => setShowBanner(true), 2000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = (e: React.MouseEvent) => {
    e.preventDefault();

    if (isIOS) {
      setShowIOSInstructions(true);
    } else if (promptInstall) {
      promptInstall.prompt();
      promptInstall.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
           setShowBanner(false);
        }
        setPromptInstall(null);
      });
    }
  };

  const handleDismiss = () => {
      setShowBanner(false);
      // Có thể lưu vào localStorage để không hiện lại trong phiên này nếu muốn
      // sessionStorage.setItem('pwa_banner_dismissed', 'true');
  };

  if (!supportsPWA || !showBanner) return null;

  // Theme Styles
  const getThemeStyles = () => {
      switch(theme) {
          case 'xmas': return {
              bg: 'bg-gradient-to-r from-red-900/95 to-green-900/95',
              btn: 'bg-white text-red-600 hover:bg-red-50',
              icon: 'text-green-400',
              border: 'border-t border-red-500/30'
          };
          case 'swift': return {
              bg: 'bg-gradient-to-r from-indigo-900/95 via-purple-900/95 to-pink-900/95',
              btn: 'bg-white text-purple-600 hover:bg-purple-50',
              icon: 'text-pink-400',
              border: 'border-t border-purple-500/30'
          };
          case 'blackpink': return {
              bg: 'bg-slate-900/95',
              btn: 'bg-pink-500 text-white hover:bg-pink-600',
              icon: 'text-pink-400',
              border: 'border-t border-pink-500/30'
          };
          case 'aespa': return {
              bg: 'bg-gradient-to-r from-slate-900/95 to-indigo-900/95',
              btn: 'bg-indigo-500 text-white hover:bg-indigo-600',
              icon: 'text-purple-400',
              border: 'border-t border-indigo-500/30'
          };
          case 'rosie': return {
              bg: 'bg-gradient-to-r from-rose-900/95 to-red-900/95',
              btn: 'bg-rose-500 text-white hover:bg-rose-600',
              icon: 'text-rose-300',
              border: 'border-t border-rose-500/30'
          };
          case 'pkl': return {
               bg: 'bg-gradient-to-r from-slate-800/95 to-cyan-900/95',
               btn: 'bg-cyan-500 text-white hover:bg-cyan-600',
               icon: 'text-cyan-300',
               border: 'border-t border-cyan-500/30'
          };
          case 'showgirl': return {
              bg: 'bg-gradient-to-r from-teal-900/95 to-orange-900/95',
              btn: 'bg-gradient-to-r from-teal-500 to-orange-500 text-white shadow-lg',
              icon: 'text-yellow-400',
              border: 'border-t border-yellow-500/30'
          };
          default: return {
              bg: 'bg-slate-900/95',
              btn: 'bg-amber-500 text-white hover:bg-amber-600',
              icon: 'text-amber-400',
              border: 'border-t border-amber-500/30'
          };
      }
  };
  const styles = getThemeStyles();

  return (
    <>
        {/* Bottom Banner */}
        <div className={`fixed bottom-0 left-0 right-0 z-[100] ${styles.bg} backdrop-blur-md p-4 shadow-2xl ${styles.border} animate-in slide-in-from-bottom-full duration-500`}>
            <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className={`p-3 bg-white/10 rounded-xl backdrop-blur-sm ${styles.icon}`}>
                        <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="text-white font-bold text-sm md:text-base">Cài đặt App ngay!</h4>
                        <p className="text-slate-300 text-xs md:text-sm">Trải nghiệm mượt mà, toàn màn hình & không cần tải lại.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleInstallClick}
                        className={`px-4 py-2 rounded-lg font-bold text-sm shadow-md transition-transform active:scale-95 whitespace-nowrap flex items-center gap-2 ${styles.btn}`}
                    >
                        <Download className="w-4 h-4" /> <span className="hidden md:inline">Cài đặt ngay</span><span className="md:hidden">Cài đặt</span>
                    </button>
                    <button 
                        onClick={handleDismiss}
                        className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>

        {/* iOS Instruction Modal */}
        {showIOSInstructions && (
            <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
                <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl p-6 shadow-2xl relative animate-in slide-in-from-bottom-10 zoom-in-95 duration-300">
                    <button 
                        onClick={() => setShowIOSInstructions(false)}
                        className="absolute top-4 right-4 p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                             <span className="text-4xl">🍎</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">Cài đặt trên iOS</h3>
                        <p className="text-slate-500 text-sm">Thao tác thủ công (do Apple quy định)</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <div className="w-10 h-10 flex items-center justify-center bg-blue-500 text-white rounded-xl shrink-0">
                                <Share className="w-5 h-5" />
                            </div>
                            <div className="text-sm text-slate-700 dark:text-slate-300">
                                <span className="font-bold block text-slate-900 dark:text-white">Bước 1</span>
                                Bấm vào nút <span className="font-bold">Chia sẻ</span> trên thanh công cụ Safari.
                            </div>
                        </div>

                        <div className="flex justify-center">
                             <div className="h-8 w-0.5 bg-slate-200 dark:bg-slate-700"></div>
                        </div>

                        <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                            <div className="w-10 h-10 flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl shrink-0">
                                <PlusSquare className="w-5 h-5" />
                            </div>
                            <div className="text-sm text-slate-700 dark:text-slate-300">
                                <span className="font-bold block text-slate-900 dark:text-white">Bước 2</span>
                                Chọn dòng <span className="font-bold">"Thêm vào MH chính"</span> (Add to Home Screen).
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-8 text-center">
                        <p className="text-xs text-slate-400">Sau khi cài đặt, App sẽ xuất hiện trên màn hình chính như một ứng dụng thông thường.</p>
                        <button 
                            onClick={() => setShowIOSInstructions(false)}
                            className="mt-4 w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl"
                        >
                            Đã hiểu
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>
  );
};
