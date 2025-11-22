
import React, { useState, useRef, useEffect } from 'react';
import { generateStationQuestionFromImage, analyzeResultWithOtter } from '../services/geminiService';
import { StationItem, MentorResponse } from '../types';
import { Play, Timer, ArrowRight, CheckCircle, Eye, EyeOff, Activity, FileText, Crosshair, Database, Sparkles, FileUp, Loader2, ZoomIn, ZoomOut, RotateCcw, Check, X, ThumbsUp, ShieldAlert, AlertCircle, Lightbulb, List, Search, Book, ChevronLeft, Edit3, Key, Milestone, Footprints, BookOpen, Move } from 'lucide-react';
import { ThemeType } from '../App';

// Declare pdfjsLib globally
declare const pdfjsLib: any;

interface StationModeProps {
  onBack: () => void;
  theme: ThemeType;
}

enum StationStep {
  SETUP,
  RUNNING,
  SUMMARY
}

interface SectionMap {
    id: string;
    name: string;
    range: [number, number]; 
    keywords: string[];
}

// Based on Gray's Anatomy for Students Flash Cards 3rd Edition
const GRAYS_SECTIONS: SectionMap[] = [
    { id: 'all', name: 'Tất cả (Ngẫu nhiên toàn bộ)', range: [1, 400], keywords: [] },
    { id: 'overview', name: '1. Overview (Tổng quan)', range: [2, 22], keywords: ['overview', 'tổng quan', 'nhập môn'] },
    { id: 'back', name: '2. Back (Lưng & Cột sống)', range: [23, 76], keywords: ['back', 'lưng', 'cột sống', 'đốt sống', 'vertebra', 'spine'] },
    { id: 'thorax', name: '3. Thorax (Ngực)', range: [77, 148], keywords: ['thorax', 'ngực', 'tim', 'phổi', 'trung thất', 'heart', 'lung', 'mediastinum'] },
    { id: 'abdomen', name: '4. Abdomen (Bụng)', range: [149, 242], keywords: ['abdomen', 'bụng', 'dạ dày', 'gan', 'ruột', 'thận', 'stomach', 'liver', 'kidney'] },
    { id: 'pelvis', name: '5. Pelvis (Chậu hông)', range: [243, 298], keywords: ['pelvis', 'chậu', 'sinh dục', 'tiết niệu', 'perineum', 'đáy chậu'] },
    { id: 'lower', name: '6. Lower Limb (Chi dưới)', range: [299, 408], keywords: ['lower', 'chi dưới', 'chân', 'đùi', 'cẳng chân', 'bàn chân', 'leg', 'foot', 'femur'] },
    { id: 'upper', name: '7. Upper Limb (Chi trên)', range: [409, 538], keywords: ['upper', 'chi trên', 'tay', 'cánh tay', 'vai', 'arm', 'hand', 'shoulder'] },
    { id: 'head', name: '8. Head & Neck (Đầu Mặt Cổ)', range: [539, 730], keywords: ['head', 'neck', 'đầu', 'mặt', 'cổ', 'sọ', 'thần kinh sọ', 'cranial', 'skull', 'face'] },
];

const formatText = (text: string) => {
  if (!text) return "";
  return text.replace(/->/g, ' → ').replace(/=>/g, ' ⇒ ').replace(/<-/g, ' ← ');
};

const normalizeString = (str: string) => {
    return str.trim().toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "") 
        .replace(/\s{2,}/g, " "); 
};

const checkAnswer = (userAns: string, correctAns: string): boolean => {
    const u = normalizeString(userAns);
    const c = normalizeString(correctAns);

    if (!u) return false; 
    if (u === c) return true;
    if (u.length < 3) return false; 
    if (c.includes(u)) {
        return u.length >= c.length * 0.5;
    }
    if (u.includes(c)) {
        return true;
    }
    return false;
};

export const StationMode: React.FC<StationModeProps> = ({ onBack, theme }) => {
  const [step, setStep] = useState<StationStep>(StationStep.SETUP);
  const [stations, setStations] = useState<StationItem[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  
  const [selectedSectionId, setSelectedSectionId] = useState<string>('all');
  const [detailedTopic, setDetailedTopic] = useState<string>('');
  const [questionCount, setQuestionCount] = useState(5); 
  const [timePerQuestion, setTimePerQuestion] = useState(30); 
  
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Running State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  // Image Interaction State
  const [imageScale, setImageScale] = useState(1);
  const [imagePos, setImagePos] = useState({ x: 0, y: 0 });
  const [isDraggingImage, setIsDraggingImage] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Mentor State
  const [showMentor, setShowMentor] = useState(false);
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorData, setMentorData] = useState<MentorResponse | null>(null);
  const mentorSectionRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const getThemeStyles = () => {
      switch(theme) {
          case 'xmas': return { 
              headerGradient: 'from-emerald-600 to-teal-600', headerIconBg: 'bg-white/20', headerText: 'text-teal-100', headerGlow: 'text-glow-white', 
              fileBorderActive: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', fileBorderHover: 'hover:border-emerald-400', 
              sectionSelected: 'bg-emerald-600 text-white shadow-emerald-500/30', sectionDefault: 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20',
              inputFocus: 'focus:ring-emerald-500', rangeColor: 'text-emerald-400', primaryBtn: 'from-red-600 to-emerald-600 hover:from-red-500 hover:to-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
          };
          case 'swift': return { 
              headerGradient: 'from-indigo-600 via-purple-600 to-pink-600', 
              headerIconBg: 'bg-white/10 backdrop-blur-md border border-purple-500/30', 
              headerText: 'text-purple-100', 
              headerGlow: 'text-glow-white drop-shadow-lg', 
              fileBorderActive: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20', 
              fileBorderHover: 'hover:border-purple-400', 
              sectionSelected: 'bg-purple-600 text-white shadow-purple-500/30', sectionDefault: 'bg-white dark:bg-[#1e1e3f] text-slate-600 dark:text-slate-300 hover:bg-purple-50 dark:hover:bg-purple-900/20',
              inputFocus: 'focus:ring-purple-500', 
              rangeColor: 'text-fuchsia-400', 
              primaryBtn: 'from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-[0_0_30px_rgba(168,85,247,0.5)] border border-purple-400/30' 
          };
          case 'blackpink': return {
              headerGradient: 'from-pink-600 to-black', headerIconBg: 'bg-black/20', headerText: 'text-pink-100', headerGlow: 'text-glow',
              fileBorderActive: 'border-pink-500 bg-slate-800', fileBorderHover: 'hover:border-pink-400',
              sectionSelected: 'bg-pink-600 text-white shadow-pink-500/30', sectionDefault: 'bg-slate-800 text-slate-300 hover:bg-slate-700',
              inputFocus: 'focus:ring-pink-500', rangeColor: 'text-pink-500', primaryBtn: 'from-pink-600 to-slate-900 shadow-pink-500/40'
          };
          case 'showgirl': return {
              headerGradient: 'from-teal-600 to-orange-500', headerIconBg: 'bg-white/20', headerText: 'text-white', headerGlow: 'text-glow-white',
              fileBorderActive: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20', fileBorderHover: 'hover:border-orange-400',
              sectionSelected: 'bg-gradient-to-r from-teal-500 to-orange-500 text-white shadow-orange-500/30', sectionDefault: 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-orange-50 dark:hover:bg-orange-900/20',
              inputFocus: 'focus:ring-orange-500', rangeColor: 'text-orange-400', primaryBtn: 'from-teal-500 to-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.5)]'
          };
          default: return { 
              headerGradient: 'from-amber-500 to-orange-600', headerIconBg: 'bg-white/20', headerText: 'text-amber-100', headerGlow: 'text-glow-white', 
              fileBorderActive: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20', fileBorderHover: 'hover:border-amber-400', 
              sectionSelected: 'bg-amber-500 text-white shadow-amber-500/30', sectionDefault: 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/20',
              inputFocus: 'focus:ring-amber-500', rangeColor: 'text-amber-400', primaryBtn: 'from-amber-500 to-orange-600 shadow-orange-500/30' 
          };
      }
  };
  const themeStyle = getThemeStyles();

  const getLoadingStyles = () => {
      if (theme === 'xmas') return { bar: 'bg-[repeating-linear-gradient(45deg,#dc2626,#dc2626_10px,#ffffff_10px,#ffffff_20px)]', shadow: 'shadow-[0_0_20px_rgba(220,38,38,0.5)]', icon: '🎅', title: 'SẮP XẾP TRẠM NOEL...', titleGradient: 'from-red-500 to-emerald-600' };
      if (theme === 'swift') return { bar: 'bg-[repeating-linear-gradient(45deg,#a855f7,#a855f7_10px,#ec4899_10px,#ec4899_20px)]', shadow: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]', icon: '🐍', title: 'CHUẨN BỊ SÂN KHẤU...', titleGradient: 'from-purple-500 to-pink-600' };
      if (theme === 'blackpink') return { bar: 'bg-[repeating-linear-gradient(45deg,#ec4899,#ec4899_10px,#0f172a_10px,#0f172a_20px)]', shadow: 'shadow-[0_0_20px_rgba(236,72,153,0.5)]', icon: '🔨', title: 'BLACKPINK IN YOUR AREA...', titleGradient: 'from-pink-500 to-slate-900' };
      if (theme === 'aespa') return { bar: 'bg-[repeating-linear-gradient(45deg,#94a3b8,#94a3b8_10px,#a855f7_10px,#a855f7_20px)]', shadow: 'shadow-[0_0_20px_rgba(168,85,247,0.8)]', icon: '👽', title: 'SYNCING TO KWANGYA...', titleGradient: 'from-slate-300 via-purple-400 to-indigo-500' };
      if (theme === 'rosie') return { bar: 'bg-[repeating-linear-gradient(45deg,#e11d48,#e11d48_10px,#fbbf24_10px,#fbbf24_20px)]', shadow: 'shadow-[0_0_20px_rgba(225,29,72,0.8)]', icon: '🌹', title: 'ROSIE ĐANG CHUẨN BỊ...', titleGradient: 'from-rose-500 to-red-600' };
      if (theme === 'pkl') return { bar: 'bg-[repeating-linear-gradient(45deg,#334155,#334155_10px,#06b6d4_10px,#06b6d4_20px)]', shadow: 'shadow-[0_0_20px_rgba(6,182,212,0.5)]', icon: '🗡️', title: 'CHẠY TRẠM SINH TỒN...', titleGradient: 'from-slate-400 via-cyan-400 to-slate-400' };
      if (theme === 'showgirl') return { bar: 'bg-[repeating-linear-gradient(45deg,#14b8a6,#14b8a6_10px,#f97316_10px,#f97316_20px)]', shadow: 'shadow-[0_0_30px_rgba(249,115,22,0.6)]', icon: '💃', title: 'SETTING THE STAGE...', titleGradient: 'from-teal-500 to-orange-500' };
      return { bar: 'bg-[repeating-linear-gradient(45deg,#3b82f6,#3b82f6_10px,#6366f1_10px,#6366f1_20px)]', shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]', icon: '🦦', title: 'RÁI CÁ ĐANG SOI ATLAS...', titleGradient: 'from-blue-500 to-purple-600' };
  };
  const loadingStyle = getLoadingStyles();

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  // Effects for Running Timer
  useEffect(() => {
      if (step !== StationStep.RUNNING) return;
      
      const interval = setInterval(() => {
          setTimeLeft(prev => {
              if (prev <= 1) {
                 handleNextStation();
                 return timePerQuestion; 
              }
              return prev - 1;
          });
      }, 1000);
      return () => clearInterval(interval);
  }, [step, currentIndex, timePerQuestion]);

  // Effects for Loading Text
  useEffect(() => {
    if (!loading) return;
    const messages = [
        "Đang đọc file Atlas...",
        "Trích xuất hình ảnh...",
        "Phân tích giải phẫu học...",
        theme === 'showgirl' ? "Lighting up the stage..." : "Tạo câu hỏi định danh...",
        "Sắp xếp thứ tự trạm..."
    ];
    let msgIndex = 0;
    const interval = setInterval(() => {
        msgIndex = (msgIndex + 1) % messages.length;
        setLoadingText(messages[msgIndex]);
    }, 3000);
    return () => clearInterval(interval);
  }, [loading, theme]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
        setPdfFile(file);
        setError(null);
    } else if (file) {
        setError("Vui lòng chỉ tải lên file PDF.");
    }
  };

  const getRandomPages = (total: number, count: number, min: number, max: number): number[] => {
      const range = max - min + 1;
      if (range <= 0) return [];
      
      const pages = new Set<number>();
      // Attempt to get 1.5x required pages to account for invalid ones
      const targetAttempt = Math.min(count * 2, range);
      
      while (pages.size < targetAttempt) {
          const p = Math.floor(Math.random() * range) + min;
          if (p <= total) pages.add(p);
      }
      return Array.from(pages);
  };

  const renderPageToImage = async (pdf: any, pageNum: number): Promise<string> => {
        try {
            const page = await pdf.getPage(pageNum);
            const scale = 1.5;
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            await page.render({ canvasContext: context!, viewport }).promise;
            return canvas.toDataURL('image/jpeg', 0.8);
        } catch (e) {
            console.error(`Error rendering page ${pageNum}`, e);
            return "";
        }
  };

  const handleGenerate = async () => {
      if (!pdfFile) return;
      setLoading(true);
      setLoadingText(theme === 'showgirl' ? "Opening Curtain..." : "Khởi động máy quét...");
      setLoadingProgress(5);
      setError(null);
      setMentorData(null);

      try {
          // 1. Load PDF
          const arrayBuffer = await pdfFile.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          
          // 2. Determine Range
          const section = GRAYS_SECTIONS.find(s => s.id === selectedSectionId) || GRAYS_SECTIONS[0];
          // Get more candidates than needed
          const pagesToPick = getRandomPages(pdf.numPages, questionCount, section.range[0], section.range[1]);
          
          const newStations: StationItem[] = [];
          let processedCount = 0;
          
          // 3. Process Pages
          for (let i = 0; i < pagesToPick.length; i++) {
              if (newStations.length >= questionCount) break; // Stop if we have enough

              const pageNum = pagesToPick[i];
              setLoadingText(`Đang xử lý trạm ${newStations.length + 1}/${questionCount}...`);
              
              const imageBase64 = await renderPageToImage(pdf, pageNum);
              if (!imageBase64) continue;

              // Use section name as topic context
              const topicContext = section.id === 'all' ? "Giải phẫu học" : section.name;
              
              const result = await generateStationQuestionFromImage(imageBase64, topicContext, detailedTopic);
              
              if (result.isValid && result.questions.length > 0) {
                  newStations.push({
                      id: `st-${Date.now()}-${i}`,
                      imageUri: imageBase64,
                      questions: result.questions.map((q, idx) => ({ ...q, id: `q-${i}-${idx}` }))
                  });
              }
              
              processedCount++;
              // Progress bar logic
              const progress = Math.min(90, Math.round((newStations.length / questionCount) * 90));
              setLoadingProgress(progress);
          }

          if (newStations.length === 0) {
              throw new Error("Không tìm thấy hình ảnh giải phẫu phù hợp trong các trang đã chọn. Hãy thử chọn phần khác hoặc file khác.");
          }

          setStations(newStations);
          setStep(StationStep.RUNNING);
          setCurrentIndex(0);
          setTimeLeft(timePerQuestion);
          setImageScale(1);
          setImagePos({ x: 0, y: 0 });

      } catch (e: any) {
          console.error(e);
          setError(e.message || "Lỗi khi xử lý PDF.");
      } finally {
          setLoading(false);
      }
  };

  const handleNextStation = () => {
      if (currentIndex < stations.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setTimeLeft(timePerQuestion);
          // Reset Image Zoom/Pan
          setImageScale(1);
          setImagePos({ x: 0, y: 0 });
      } else {
          setStep(StationStep.SUMMARY);
      }
  };

  const calculateScore = () => {
      let score = 0;
      let total = 0;
      stations.forEach(st => {
          st.questions.forEach(q => {
              total++;
              if (checkAnswer(userAnswers[q.id] || '', q.correctAnswer)) {
                  score++;
              }
          });
      });
      return { score, total };
  };

  const handleConsultMentor = async () => {
      if (mentorData) {
          setShowMentor(true);
          mentorSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
          return;
      }

      setMentorLoading(true);
      setShowMentor(true);

      const { score, total } = calculateScore();
      // Simulate stats object for station mode
      const stats = {
          "Thực hành chạy trạm": { correct: score, total: total }
      };
      
      const topic = detailedTopic ? `${selectedSectionId} - ${detailedTopic}` : selectedSectionId;

      try {
          const response = await analyzeResultWithOtter(topic, stats);
          setMentorData(response);
      } catch (e: any) {
          console.error("Mentor Error", e);
      } finally {
          setMentorLoading(false);
          setTimeout(() => {
              mentorSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 200);
      }
  };

  // --- IMAGE INTERACTION HANDLERS ---
  const handleWheel = (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) { // Zoom pinch trackpad or ctrl+wheel
          e.preventDefault();
          const delta = e.deltaY * -0.01;
          const newScale = Math.min(Math.max(1, imageScale + delta), 4);
          setImageScale(newScale);
      }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      if (imageScale > 1) {
          setIsDraggingImage(true);
          setDragStart({ x: e.clientX - imagePos.x, y: e.clientY - imagePos.y });
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (isDraggingImage) {
          setImagePos({
              x: e.clientX - dragStart.x,
              y: e.clientY - dragStart.y
          });
      }
  };

  const handleMouseUp = () => setIsDraggingImage(false);

  if (loading) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md transition-all duration-500">
            <div className="w-full max-w-2xl p-8 relative">
                <h3 className={`text-3xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r ${loadingStyle.titleGradient} mb-16 animate-pulse`}>
                    {loadingStyle.title}
                </h3>
                <div className="relative w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-visible border border-slate-300 dark:border-slate-700">
                    <div 
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out ${loadingStyle.bar} ${loadingStyle.shadow}`}
                        style={{ width: `${loadingProgress}%` }}
                    >
                    </div>
                    <div 
                        className="absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-out z-20"
                        style={{ left: `${loadingProgress}%`, transform: 'translate(-50%, -50%)' }}
                    >
                        <div className="relative">
                            <div className="text-6xl transform -scale-x-100 animate-[bounce_0.4s_infinite] filter drop-shadow-lg">
                                {loadingStyle.icon}
                            </div>
                        </div>
                    </div>
                </div>
                <div className="mt-20 text-center">
                    <p className="text-xl font-bold text-slate-700 dark:text-slate-200 animate-fade-up">
                        {loadingText}
                    </p>
                </div>
            </div>
        </div>
      );
  }

  if (step === StationStep.SETUP) {
      return (
        <div className="max-w-5xl mx-auto pb-20 px-4">
             <div className="flex items-center mb-6">
                <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                    <ArrowRight className="w-6 h-6 rotate-180" />
                </button>
                <h2 className="text-xl font-medium text-slate-500 dark:text-slate-400">Quay lại</h2>
            </div>

            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${themeStyle.headerGradient} p-8 text-white shadow-xl animate-fade-up`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="relative z-10 flex items-center gap-6">
                    <div className={`w-20 h-20 ${themeStyle.headerIconBg} backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner`}>
                        <Activity className="w-10 h-10 text-white drop-shadow-lg" />
                    </div>
                    <div>
                        <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${themeStyle.headerGlow}`}>{theme === 'showgirl' ? "Showtime (Chạy trạm)" : theme === 'swift' ? "Vigilante Shit (Spot)" : "Thi Chạy Trạm (Spot Test)"}</h1>
                        <p className={`text-lg ${themeStyle.headerText}`}>
                            {theme === 'showgirl' ? "Thử thách tốc độ trên sàn diễn." : "Tải lên Atlas PDF để AI tạo bài thi chạy trạm."}
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-lg border border-slate-200 dark:border-slate-700 mt-8 animate-fade-up">
                
                {/* File Upload Section */}
                <div className="mb-8">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wide flex items-center gap-2">
                        <BookOpen className="w-4 h-4" /> Bước 1: Tải lên Atlas PDF
                    </label>
                    
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all group ${pdfFile ? themeStyle.fileBorderActive : 'border-slate-300 dark:border-slate-700'} ${themeStyle.fileBorderHover}`}
                    >
                        <input type="file" accept=".pdf" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                            {pdfFile ? <CheckCircle className="w-8 h-8 text-green-500" /> : <FileUp className="w-8 h-8 text-slate-400" />}
                        </div>
                        {pdfFile ? (
                            <div>
                                <p className="text-slate-800 dark:text-white font-bold text-lg">{pdfFile.name}</p>
                                <p className="text-slate-500 text-sm">{(pdfFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                <p className="text-green-500 text-sm mt-2 font-medium">Đã sẵn sàng trích xuất!</p>
                            </div>
                        ) : (
                            <div>
                                <p className="text-slate-600 dark:text-slate-300 font-medium text-lg">Nhấn để tải file PDF</p>
                                <p className="text-sm text-slate-400 mt-2">Khuyên dùng: <span className="font-bold text-amber-500">Gray's Anatomy for Students Flash Cards (3rd Ed)</span></p>
                                <p className="text-xs text-slate-400 mt-1">Hoặc bất kỳ Atlas Giải phẫu nào (Netter, Sobotta...)</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Section Selection */}
                <div className="mb-8">
                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wide flex items-center gap-2">
                        <List className="w-4 h-4" /> Bước 2: Chọn phần học (Chương)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {GRAYS_SECTIONS.map((sec) => (
                            <button
                                key={sec.id}
                                onClick={() => setSelectedSectionId(sec.id)}
                                className={`p-4 rounded-xl text-left transition-all border border-transparent font-medium text-sm flex items-center justify-between
                                ${selectedSectionId === sec.id ? themeStyle.sectionSelected : themeStyle.sectionDefault}`}
                            >
                                <span className="truncate pr-2">{sec.name}</span>
                                {selectedSectionId === sec.id && <CheckCircle className="w-4 h-4 shrink-0" />}
                            </button>
                        ))}
                    </div>
                </div>

                 {/* Detailed Topic Input - NEW FEATURE */}
                 {selectedSectionId !== 'all' && (
                    <div className="mb-8 animate-in slide-in-from-top-2 fade-in">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wide flex items-center gap-2">
                            <Search className="w-4 h-4" /> Bước 2.5: Chủ đề chi tiết (Tùy chọn)
                        </label>
                        <input
                            type="text"
                            value={detailedTopic}
                            onChange={(e) => setDetailedTopic(e.target.value)}
                            placeholder={`VD: Xương sọ, Cơ vùng mặt, Thần kinh sọ... (Thuộc ${GRAYS_SECTIONS.find(s => s.id === selectedSectionId)?.name})`}
                            className={`w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 outline-none transition-all text-lg font-medium text-slate-900 dark:text-white ${themeStyle.inputFocus}`}
                         />
                         <p className="text-xs text-slate-500 mt-2 ml-1">
                             Rái cá sẽ ưu tiên tìm các hình ảnh và tạo câu hỏi liên quan đến chủ đề này.
                         </p>
                    </div>
                 )}
                
                {/* Settings */}
                <div className="grid md:grid-cols-2 gap-8 mb-8 border-t border-slate-100 dark:border-slate-800 pt-8">
                     <div>
                         <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex justify-between">
                            <span className="uppercase tracking-wide">Số lượng trạm</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${themeStyle.rangeColor}`}>{questionCount} trạm</span>
                         </label>
                         <input type="range" min="5" max="30" step="1" value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} className="liquid-slider w-full" style={{ '--range-progress': `${((questionCount - 5) / 25) * 100}%` } as React.CSSProperties} />
                    </div>
                     <div>
                         <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex justify-between">
                            <span className="uppercase tracking-wide">Thời gian mỗi trạm</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${themeStyle.rangeColor}`}>{timePerQuestion} giây</span>
                         </label>
                         <input type="range" min="15" max="90" step="5" value={timePerQuestion} onChange={(e) => setTimePerQuestion(Number(e.target.value))} className="liquid-slider w-full" style={{ '--range-progress': `${((timePerQuestion - 15) / 75) * 100}%` } as React.CSSProperties} />
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400 mb-6 animate-pulse">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-medium">{error}</span>
                    </div>
                )}

                <button
                    onClick={handleGenerate}
                    disabled={!pdfFile}
                    className={`w-full bg-gradient-to-r ${themeStyle.primaryBtn} text-white font-bold py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 hover:shadow-2xl`}
                >
                    <Play className="w-6 h-6" />
                    <span>{pdfFile ? "Bắt đầu chạy trạm" : "Vui lòng chọn file PDF"}</span>
                </button>
            </div>
        </div>
      );
  }

  if (step === StationStep.RUNNING && stations.length > 0) {
      const currentStation = stations[currentIndex];
      const currentQ = currentStation.questions[0]; 

      return (
          <div className="max-w-6xl mx-auto px-4 pb-20 h-screen flex flex-col">
              {/* Header Bar */}
              <div className="flex items-center justify-between mb-4 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600">
                          {currentIndex + 1}
                      </div>
                      <span className="text-sm font-bold text-slate-500 uppercase">Trạm {currentIndex + 1} / {stations.length}</span>
                  </div>
                  <div className={`flex items-center gap-2 font-mono text-2xl font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-slate-700 dark:text-white'}`}>
                      <Timer className="w-6 h-6" />
                      {formatTime(timeLeft)}
                  </div>
              </div>

              <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
                  {/* Image Area with Zoom/Pan */}
                  <div className="flex-1 bg-black rounded-3xl overflow-hidden relative shadow-lg flex items-center justify-center group select-none">
                      {/* Controls */}
                      <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                          <button onClick={() => setImageScale(prev => Math.min(prev + 0.5, 4))} className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm">
                              <ZoomIn className="w-5 h-5" />
                          </button>
                          <button onClick={() => setImageScale(prev => Math.max(prev - 0.5, 1))} className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm">
                              <ZoomOut className="w-5 h-5" />
                          </button>
                          <button onClick={() => { setImageScale(1); setImagePos({x:0,y:0}); }} className="p-2 bg-black/50 hover:bg-black/70 text-white rounded-lg backdrop-blur-sm">
                              <RotateCcw className="w-5 h-5" />
                          </button>
                      </div>

                      {imageScale > 1 && (
                          <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-lg text-xs font-bold backdrop-blur-sm z-20 flex items-center gap-2">
                              <Move className="w-3 h-3" /> Kéo để di chuyển
                          </div>
                      )}

                      <div 
                        ref={imageContainerRef}
                        className="w-full h-full flex items-center justify-center cursor-grab active:cursor-grabbing overflow-hidden"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        onWheel={(e) => {
                             if (e.ctrlKey || e.metaKey) {
                                e.preventDefault();
                                setImageScale(prev => Math.min(Math.max(1, prev + e.deltaY * -0.01), 4));
                             }
                        }}
                      >
                        <img 
                            src={currentStation.imageUri} 
                            alt="Anatomy" 
                            className="max-w-full max-h-full object-contain transition-transform duration-100"
                            style={{
                                transform: `scale(${imageScale}) translate(${imagePos.x / imageScale}px, ${imagePos.y / imageScale}px)`
                            }}
                            draggable={false}
                        />
                      </div>
                  </div>

                  {/* Question Area */}
                  <div className="w-full md:w-96 flex flex-col gap-4">
                      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 flex-1 flex flex-col">
                          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-start gap-2">
                              <Crosshair className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                              {currentQ.questionText}
                          </h3>
                          
                          <div className="mt-auto">
                              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Câu trả lời của bạn</label>
                              <textarea 
                                  value={userAnswers[currentQ.id] || ''}
                                  onChange={(e) => setUserAnswers(prev => ({...prev, [currentQ.id]: e.target.value}))}
                                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl focus:border-blue-500 outline-none resize-none text-lg font-medium"
                                  rows={4}
                                  placeholder="Nhập tên cấu trúc..."
                                  autoFocus
                              />
                              <button 
                                  onClick={handleNextStation}
                                  className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-500/30 transition-all"
                              >
                                  {currentIndex < stations.length - 1 ? "Tiếp theo" : "Hoàn thành"}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  if (step === StationStep.SUMMARY) {
      const { score, total } = calculateScore();
      return (
          <div className="max-w-5xl mx-auto pb-20 px-4">
               <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-700 mb-8 animate-fade-up">
                   <div className="text-center">
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-4">Kết quả Chạy Trạm</h2>
                        <div className="text-6xl font-black text-blue-600 dark:text-blue-400 mb-2">{score} <span className="text-3xl text-slate-400">/ {total}</span></div>
                        <p className="text-slate-500 mb-8">Chính xác: {Math.round((score/total)*100)}%</p>

                        <div className="flex flex-col md:flex-row justify-center gap-4">
                            <button onClick={() => { setStations([]); setPdfFile(null); setStep(StationStep.SETUP); }} className="px-6 py-3 rounded-xl border-2 font-bold text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800">
                                Làm lại
                            </button>
                            
                            {!showMentor && (
                                <button 
                                    onClick={handleConsultMentor}
                                    disabled={mentorLoading}
                                    className="px-8 py-3 rounded-xl font-bold bg-amber-400 hover:bg-amber-500 text-white shadow-lg shadow-amber-400/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {mentorLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <span className="text-xl">🦦</span>}
                                    <span>Hỏi Rái Cá (Mentor AI)</span>
                                </button>
                             )}
                        </div>
                   </div>

                    {/* MENTOR SECTION (Copied & Adapted from MCQMode) */}
                    {showMentor && (
                        <div ref={mentorSectionRef} className="mt-12 animate-in slide-in-from-bottom-10 duration-700">
                            {mentorLoading ? (
                                <div className="w-full bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-xl border border-amber-200 dark:border-amber-900/30 text-center flex flex-col items-center gap-4">
                                    <div className="text-6xl animate-bounce">🦦</div>
                                    <p className="text-slate-600 dark:text-slate-300 font-medium animate-pulse">
                                        Giáo sư Rái cá đang chẩn bệnh cho bài thi của bạn...
                                    </p>
                                </div>
                            ) : mentorData ? (
                                <div className="relative bg-gradient-to-b from-amber-50 to-white dark:from-slate-900 dark:to-slate-950 rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-amber-200 dark:border-slate-700 overflow-hidden">
                                    {/* Decor */}
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                                    
                                    <div className="flex flex-col md:flex-row gap-8 items-start mb-8 border-b border-amber-200/50 dark:border-slate-700 pb-8">
                                        <div className="flex-shrink-0 flex flex-col items-center gap-2">
                                            <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg border-4 border-amber-100 dark:border-slate-600">
                                                <span className="text-5xl animate-[wiggle_3s_infinite]">🦦</span>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Bệnh án học tập (Chạy Trạm)</h3>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-l-4 border-amber-400 shadow-sm italic text-slate-700 dark:text-slate-300 leading-relaxed">
                                                {mentorData.analysis}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Strengths & Weaknesses */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                        <div className="bg-green-50/80 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 rounded-2xl p-5">
                                            <h4 className="font-bold text-green-800 dark:text-green-300 uppercase text-xs tracking-wider mb-3">Điểm mạnh</h4>
                                            <ul className="space-y-2">
                                                {mentorData.strengths?.map((s, i) => (
                                                    <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                                                        <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" /> <span>{s}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                        <div className="bg-red-50/80 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-2xl p-5">
                                            <h4 className="font-bold text-red-800 dark:text-red-300 uppercase text-xs tracking-wider mb-3">Cần cải thiện</h4>
                                             <ul className="space-y-2">
                                                {mentorData.weaknesses?.map((w, i) => (
                                                    <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                                                        <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" /> <span>{w}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    )}

                   <div className="mt-12 space-y-8">
                       <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                           <FileText className="w-5 h-5" /> Chi tiết từng trạm
                       </h3>
                       {stations.map((st, idx) => {
                           const isCorrect = checkAnswer(userAnswers[st.questions[0].id], st.questions[0].correctAnswer);
                           
                           return (
                           <div key={st.id} className={`rounded-2xl overflow-hidden border-2 ${isCorrect ? 'border-slate-100 dark:border-slate-800' : 'border-red-100 dark:border-red-900/30'}`}>
                               <div className="flex flex-col md:flex-row">
                                   {/* Image Thumbnail */}
                                   <div className="w-full md:w-64 h-64 bg-black shrink-0 relative group cursor-zoom-in">
                                       <img src={st.imageUri} className="w-full h-full object-contain" />
                                       <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold">
                                            Ảnh gốc
                                       </div>
                                   </div>
                                   <div className="flex-1 p-6 bg-white dark:bg-slate-900">
                                       <div className="flex items-center justify-between mb-4">
                                           <div className="font-bold text-slate-800 dark:text-white text-lg">Trạm {idx + 1}: {st.questions[0].questionText}</div>
                                           {isCorrect 
                                                ? <span className="text-green-600 bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full text-xs font-bold">ĐÚNG</span>
                                                : <span className="text-red-600 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full text-xs font-bold">SAI</span>
                                           }
                                       </div>
                                       
                                       <div className="grid md:grid-cols-2 gap-4 text-sm mb-6">
                                           <div className={`p-4 rounded-xl border ${isCorrect ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/10 dark:border-green-800 dark:text-green-300' : 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/10 dark:border-red-800 dark:text-red-300'}`}>
                                               <div className="text-xs opacity-70 uppercase font-bold mb-1">Câu trả lời của bạn</div>
                                               <div className="font-medium text-lg">{userAnswers[st.questions[0].id] || "(Bỏ trống)"}</div>
                                           </div>
                                           <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300">
                                               <div className="text-xs opacity-70 uppercase font-bold mb-1">Đáp án chính xác</div>
                                               <div className="font-medium text-lg">{st.questions[0].correctAnswer}</div>
                                           </div>
                                       </div>
                                       
                                       {/* Enhanced Explanation Box */}
                                       <div className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-400 p-4 rounded-r-xl">
                                            <h5 className="text-amber-700 dark:text-amber-400 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                                                <Lightbulb className="w-3 h-3" /> Giải thích chi tiết
                                            </h5>
                                            <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                                                {st.questions[0].explanation}
                                            </p>
                                       </div>
                                   </div>
                               </div>
                           </div>
                       )})}
                   </div>
               </div>
          </div>
      );
  }

  return null;
};
