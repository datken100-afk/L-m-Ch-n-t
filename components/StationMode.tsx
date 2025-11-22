
import React, { useState, useRef, useEffect } from 'react';
import { generateStationQuestionFromImage, analyzeResultWithOtter } from '../services/geminiService';
import { StationItem, MentorResponse } from '../types';
import { Play, Timer, ArrowRight, CheckCircle, Eye, EyeOff, Activity, FileText, Crosshair, Database, Sparkles, FileUp, Loader2, ZoomIn, ZoomOut, RotateCcw, Check, X, ThumbsUp, ShieldAlert, AlertCircle, Lightbulb, List, Search, Book, ChevronLeft, Edit3, Key } from 'lucide-react';
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
    b: number; 
    keywords: string[];
}

const GRAYS_SECTIONS: SectionMap[] = [
    { id: 'overview', name: '1. Overview (Tổng quan)', range: [1, 8], b: 12, keywords: ['overview', 'tổng quan', 'nhập môn'] },
    { id: 'back', name: '2. Back (Lưng & Cột sống)', range: [9, 34], b: 14, keywords: ['back', 'lưng', 'cột sống', 'đốt sống', 'vertebra', 'spine'] },
    { id: 'thorax', name: '3. Thorax (Ngực)', range: [35, 74], b: 16, keywords: ['thorax', 'ngực', 'tim', 'phổi', 'trung thất', 'heart', 'lung', 'mediastinum'] },
    { id: 'abdomen', name: '4. Abdomen (Bụng)', range: [75, 113], b: 18, keywords: ['abdomen', 'bụng', 'dạ dày', 'gan', 'ruột', 'thận', 'stomach', 'liver', 'kidney'] },
    { id: 'pelvis', name: '5. Pelvis (Chậu hông)', range: [114, 133], b: 20, keywords: ['pelvis', 'chậu', 'sinh dục', 'tiết niệu', 'perineum', 'đáy chậu'] },
    { id: 'lower', name: '6. Lower Limb (Chi dưới)', range: [134, 191], b: 22, keywords: ['lower', 'chi dưới', 'chân', 'đùi', 'cẳng chân', 'bàn chân', 'leg', 'foot', 'femur'] },
    { id: 'upper', name: '7. Upper Limb (Chi trên)', range: [192, 258], b: 24, keywords: ['upper', 'chi trên', 'tay', 'cánh tay', 'vai', 'arm', 'hand', 'shoulder'] },
    { id: 'head', name: '8. Head & Neck (Đầu Mặt Cổ)', range: [259, 349], b: 28, keywords: ['head', 'neck', 'đầu', 'mặt', 'cổ', 'sọ', 'thần kinh sọ', 'cranial', 'skull', 'face'] },
    { id: 'surface', name: '9. Surface Anatomy (Bề mặt)', range: [350, 369], b: 30, keywords: ['surface', 'bề mặt'] },
    { id: 'nervous', name: '10. Nervous System (Thần kinh)', range: [370, 377], b: 32, keywords: ['nervous', 'thần kinh', 'não', 'tủy', 'brain', 'spinal'] },
    { id: 'imaging', name: '11. Imaging (Hình ảnh học)', range: [378, 391], b: 34, keywords: ['imaging', 'hình ảnh', 'x-quang', 'ct', 'mri', 'radiograph'] },
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
  
  const [selectedSection, setSelectedSection] = useState<SectionMap | null>(null);
  const [topic, setTopic] = useState(''); 
  const [questionCount, setQuestionCount] = useState(5); 
  const [timePerQuestion, setTimePerQuestion] = useState(30); 
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorData, setMentorData] = useState<MentorResponse | null>(null);
  const [showMentor, setShowMentor] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mentorSectionRef = useRef<HTMLDivElement>(null);

  const getThemeStyles = () => {
      switch(theme) {
          // ... (Theme styles preserved, omitted for brevity)
          case 'xmas': return { headerGradient: 'from-emerald-600 to-teal-600', headerIconBg: 'bg-white/20', headerText: 'text-teal-100', headerGlow: 'text-glow-white', fileBorderActive: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', fileBorderHover: 'hover:border-emerald-400', sectionSelected: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800', sectionHover: 'hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20', inputFocus: 'focus:ring-emerald-500', rangeColor: 'text-emerald-400', primaryBtn: 'from-red-600 to-emerald-600 hover:from-red-500 hover:to-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' };
          case 'swift': return { headerGradient: 'from-purple-600 to-indigo-600', headerIconBg: 'bg-white/20', headerText: 'text-purple-100', headerGlow: 'text-glow-white', fileBorderActive: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20', fileBorderHover: 'hover:border-purple-400', sectionSelected: 'bg-purple-50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-800', sectionHover: 'hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20', inputFocus: 'focus:ring-purple-500', rangeColor: 'text-purple-400', primaryBtn: 'from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]' };
          case 'blackpink': return { headerGradient: 'from-slate-900 to-pink-900', headerIconBg: 'bg-pink-500/30', headerText: 'text-pink-100', headerGlow: 'text-glow', fileBorderActive: 'border-pink-500 bg-pink-900/10', fileBorderHover: 'hover:border-pink-400', sectionSelected: 'bg-slate-800 border-pink-500 text-pink-400', sectionHover: 'hover:border-pink-400 hover:bg-slate-800', inputFocus: 'focus:ring-pink-500', rangeColor: 'text-pink-500', primaryBtn: 'from-slate-900 to-pink-600 hover:from-black hover:to-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.4)]' };
          case 'aespa': return { headerGradient: 'from-indigo-900 to-slate-800', headerIconBg: 'bg-indigo-500/30', headerText: 'text-indigo-100', headerGlow: 'text-glow-white', fileBorderActive: 'border-indigo-500 bg-indigo-900/20', fileBorderHover: 'hover:border-indigo-400', sectionSelected: 'bg-slate-800 border-indigo-400 text-indigo-300', sectionHover: 'hover:border-indigo-400 hover:bg-slate-800', inputFocus: 'focus:ring-indigo-500', rangeColor: 'text-indigo-400', primaryBtn: 'from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.4)]' };
          case 'rosie': return { headerGradient: 'from-red-700 to-rose-800', headerIconBg: 'bg-rose-500/30', headerText: 'text-rose-100', headerGlow: 'text-glow-white', fileBorderActive: 'border-rose-500 bg-rose-50 dark:bg-rose-900/20', fileBorderHover: 'hover:border-rose-400', sectionSelected: 'bg-rose-50 dark:bg-rose-900/10 border-rose-200 dark:border-rose-800', sectionHover: 'hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20', inputFocus: 'focus:ring-rose-500', rangeColor: 'text-rose-400', primaryBtn: 'from-red-700 to-rose-600 hover:from-red-600 hover:to-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.4)]' };
          case 'pkl': return { headerGradient: 'from-slate-800 via-cyan-900 to-slate-900', headerIconBg: 'bg-white/10', headerText: 'text-cyan-100', headerGlow: 'text-glow-white', fileBorderActive: 'border-cyan-500 bg-slate-800', fileBorderHover: 'hover:border-cyan-400', sectionSelected: 'bg-slate-800 border-cyan-500 text-cyan-400', sectionHover: 'hover:border-cyan-400 hover:bg-slate-800', inputFocus: 'focus:ring-cyan-500', rangeColor: 'text-cyan-500', primaryBtn: 'from-slate-700 to-slate-900 hover:from-slate-600 hover:to-slate-800 border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.4)]' };
          case 'showgirl': return { headerGradient: 'from-orange-600 to-teal-600', headerIconBg: 'bg-white/20', headerText: 'text-teal-50', headerGlow: 'text-glow-white', fileBorderActive: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20', fileBorderHover: 'hover:border-orange-400', sectionSelected: 'bg-teal-50 dark:bg-teal-900/10 border-teal-200 dark:border-teal-800', sectionHover: 'hover:border-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20', inputFocus: 'focus:ring-orange-500', rangeColor: 'text-orange-400', primaryBtn: 'from-orange-500 via-orange-400 to-teal-500 hover:from-orange-400 hover:to-teal-400 shadow-[0_0_20px_rgba(249,115,22,0.4)]' };
          default: return { headerGradient: 'from-emerald-600 to-teal-600', headerIconBg: 'bg-white/20', headerText: 'text-teal-100', headerGlow: 'text-glow-white', fileBorderActive: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', fileBorderHover: 'hover:border-emerald-400', sectionSelected: 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800', sectionHover: 'hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20', inputFocus: 'focus:ring-blue-500', rangeColor: 'text-emerald-400', primaryBtn: 'from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' };
      }
  };
  const themeStyle = getThemeStyles();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.type !== 'application/pdf') {
              setError("Vui lòng chọn file PDF.");
              return;
          }
          setPdfFile(file);
          setError(null);
      }
  };

  const handleGenerate = async () => {
    if (!pdfFile) { setError("Vui lòng tải lên file Flashcard PDF."); return; }
    if (!selectedSection) { setError("Vui lòng chọn chương sách."); return; }
    const processingTopic = topic.trim() || selectedSection.name;

    setLoading(true);
    setLoadingProgress(0);
    setError(null);
    setStations([]);
    setMentorData(null);
    setShowMentor(false);

    try {
        setLoadingText(`Đang khởi tạo dữ liệu chương: ${selectedSection.name}`);
        
        const [startCard, endCard] = selectedSection.range;
        const b = selectedSection.b;
        let potentialCards = Array.from({length: endCard - startCard + 1}, (_, i) => startCard + i);
        
        for (let i = potentialCards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [potentialCards[i], potentialCards[j]] = [potentialCards[j], potentialCards[i]];
        }

        let targetPageNums = potentialCards.map(x => (2 * x) + b);
        const arrayBuffer = await pdfFile.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const totalPages = pdf.numPages;
        targetPageNums = targetPageNums.filter(p => p <= totalPages && p > 0);

        if (targetPageNums.length === 0) throw new Error("Lỗi tính toán trang PDF.");

        const newStations: StationItem[] = [];
        const BATCH_SIZE = 3; 
        let processedCount = 0;
        let hasQuotaError = false;

        for (let i = 0; i < targetPageNums.length; i += BATCH_SIZE) {
            if (newStations.length >= questionCount) break;
            if (hasQuotaError) break;

            const batch = targetPageNums.slice(i, i + BATCH_SIZE);
            setLoadingText(`Đang quét song song ${batch.length} ảnh... (Đã có ${newStations.length}/${questionCount} trạm)`);
            
            const batchPromises = batch.map(async (pageNum) => {
                try {
                    const page = await pdf.getPage(pageNum);
                    const viewport = page.getViewport({ scale: 2.0 }); 
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    if (!ctx) return null;
                    await page.render({ canvasContext: ctx, viewport }).promise;
                    const base64 = canvas.toDataURL('image/jpeg', 0.8); 
                    const res = await generateStationQuestionFromImage(base64, processingTopic);
                    
                    if (res.isValid && res.questions && res.questions.length > 0) {
                        return {
                            id: `st-${Date.now()}-${pageNum}`,
                            imageUri: base64,
                            questions: res.questions.map((q: any, idx: number) => ({
                                ...q, 
                                id: `q-${Date.now()}-${pageNum}-${idx}`
                            }))
                        } as StationItem;
                    }
                    return null;
                } catch (e: any) {
                    if (e.message && (e.message.includes("quota") || e.message.includes("429") || e.message.includes("QUOTA"))) {
                        hasQuotaError = true;
                    }
                    return null;
                }
            });

            const results = await Promise.all(batchPromises);
            results.forEach(item => {
                if (item && newStations.length < questionCount) {
                    newStations.push(item);
                }
            });

            processedCount += batch.length;
            const progress = Math.min(Math.round((newStations.length / questionCount) * 100), 95);
            setLoadingProgress(progress);
        }

        if (newStations.length > 0) {
             if (hasQuotaError && newStations.length < questionCount) {
                 setError("Đã đạt giới hạn AI. Đang hiển thị các trạm đã tạo được.");
             }
             setLoadingProgress(100);
             setLoadingText("Hoàn tất! Đang vào trạm...");
             setTimeout(() => {
                setStations(newStations); 
                setUserAnswers({});
                setStep(StationStep.RUNNING);
                setLoading(false);
             }, 500);
        } else {
            if (hasQuotaError) {
                 throw new Error("QUOTA_EXCEEDED");
            } else {
                 throw new Error("Không tìm thấy hình ảnh giải phẫu nào phù hợp với chủ đề này.");
            }
        }

    } catch (err: any) {
        console.error("Station generation error", err);
        let message = err.message || "Có lỗi xảy ra.";
        if (message === "QUOTA_EXCEEDED" || message.includes("MISSING_API_KEY")) {
            message = "QUOTA_ERROR";
        }
        setError(message);
        setLoading(false);
    }
  };

  const handleConsultMentor = async () => {
    if (mentorData) {
        setShowMentor(true);
        mentorSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    setMentorLoading(true);
    setShowMentor(true);

    const stats: Record<string, { correct: number, total: number }> = {
        "Thực hành chạy trạm": { correct: 0, total: 0 }
    };

    stations.forEach(s => {
        stats["Thực hành chạy trạm"].total++;
        const userAns = userAnswers[s.id] || "";
        const correctAns = s.questions[0].correctAnswer;
        if (checkAnswer(userAns, correctAns)) {
            stats["Thực hành chạy trạm"].correct++;
        }
    });

    try {
        const response = await analyzeResultWithOtter(topic || selectedSection?.name || "Giải phẫu học", stats);
        setMentorData(response);
    } catch (e: any) {
        console.error("Mentor Error", e);
        if (e.message.includes("QUOTA") || e.message.includes("MISSING_API_KEY")) {
            setError("QUOTA_ERROR");
        }
    } finally {
        setMentorLoading(false);
        setTimeout(() => {
            mentorSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 200);
    }
  };

  // ... Loading State ...
  if (loading) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md transition-all duration-500">
            <div className="w-full max-w-2xl p-8 relative">
                <h3 className="text-3xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-emerald-600 mb-16 animate-pulse">RÁI CÁ ĐANG CHẠY TRẠM...</h3>
                <div className="relative w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-visible border border-slate-300 dark:border-slate-700">
                    <div className="absolute top-0 left-0 h-full bg-[repeating-linear-gradient(45deg,#dc2626,#dc2626_10px,#ffffff_10px,#ffffff_20px)] rounded-full transition-all duration-500 ease-out shadow-[0_0_20px_rgba(220,38,38,0.5)]" style={{ width: `${loadingProgress}%` }}></div>
                    <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-out z-20" style={{ left: `${loadingProgress}%`, transform: 'translate(-50%, -50%)' }}>
                        <div className="relative">
                            <div className="text-7xl transform -scale-x-100 animate-[bounce_0.4s_infinite] filter drop-shadow-lg">🦦</div>
                        </div>
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded-md whitespace-nowrap opacity-80">{loadingProgress}%</div>
                    </div>
                </div>
                <div className="mt-20 text-center space-y-3">
                    <p className="text-xl font-bold text-slate-700 dark:text-slate-200 animate-fade-up" key={loadingText}>{loadingText}</p>
                </div>
            </div>
        </div>
    );
  }

  if (step === StationStep.SETUP) {
    return (
      <div className="max-w-4xl mx-auto pb-20 px-4">
        <div className="flex items-center mb-6">
            <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ArrowRight className="w-6 h-6 rotate-180" /></button>
            <h2 className="text-xl font-medium text-slate-500 dark:text-slate-400">Quay lại</h2>
        </div>

        <div className="space-y-8">
            {/* CARD 1: HEADER */}
            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${themeStyle.headerGradient} p-8 text-white shadow-xl animate-fade-up`} style={{ animationDelay: '0ms' }}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="relative z-10 flex items-center gap-6">
                    <div className={`w-20 h-20 ${themeStyle.headerIconBg} backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner`}>
                        <Activity className="w-10 h-10 text-white drop-shadow-lg" />
                    </div>
                    <div>
                        <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${themeStyle.headerGlow}`}>{theme === 'showgirl' ? "Chạy Trạm (Showtime)" : "Chạy Trạm (Spot Test)"}</h1>
                        <p className={`text-lg ${themeStyle.headerText}`}>{theme === 'showgirl' ? "Sân khấu đã sẵn sàng. Hệ thống sẽ kiểm tra phản xạ của bạn dưới ánh đèn sân khấu." : "Hệ thống sử dụng thuật toán quét song song để tạo trạm siêu tốc."}</p>
                    </div>
                </div>
            </div>

            {/* CARD 2: INPUT & SOURCE */}
            <div className="relative rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-8 shadow-lg animate-fade-up" style={{ animationDelay: '100ms' }}>
                <div className="grid md:grid-cols-2 gap-8">
                    {/* LEFT: UPLOAD SOURCE */}
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Database className="w-5 h-5 text-slate-400" /> Nguồn dữ liệu gốc (PDF)</h3>
                        <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 group ${pdfFile ? themeStyle.fileBorderActive : `border-slate-300 dark:border-slate-700 ${themeStyle.fileBorderHover} hover:bg-slate-50 dark:hover:bg-slate-800`}`}>
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="application/pdf" className="hidden" />
                            {pdfFile ? (
                                <div className="flex flex-col items-center gap-2 animate-in zoom-in">
                                    <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-sm"><CheckCircle className="w-6 h-6 text-green-500" /></div>
                                    <p className="font-bold text-slate-700 dark:text-slate-200 text-sm break-all px-2">{pdfFile.name}</p>
                                    <span className="text-xs opacity-70">Nhấn để thay đổi file</span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center gap-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                                    <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center"><FileUp className="w-6 h-6" /></div>
                                    <div><p className="font-bold text-sm">Tải lên Flashcard PDF</p><p className="text-xs opacity-70">Gray's Anatomy (3rd Ed)</p></div>
                                </div>
                            )}
                        </div>
                    </div>

                     {/* RIGHT: TOPIC SELECTION */}
                     <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-500" /> Chủ đề (Chọn chương sách)</h3>
                        {!selectedSection ? (
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                                {GRAYS_SECTIONS.map((sec) => (
                                    <button key={sec.id} onClick={() => { setSelectedSection(sec); setTopic(''); }} className={`w-full text-left px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-300 transition-all ${themeStyle.sectionHover}`}>{sec.name}</button>
                                ))}
                            </div>
                        ) : (
                            <div className="animate-in fade-in slide-in-from-right-4">
                                <div className={`rounded-xl p-4 mb-4 ${themeStyle.sectionSelected}`}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold uppercase tracking-wider opacity-70">Đang chọn chương</span>
                                        <button onClick={() => setSelectedSection(null)} className="text-xs text-slate-400 hover:text-blue-500 flex items-center gap-1"><RotateCcw className="w-3 h-3" /> Chọn lại</button>
                                    </div>
                                    <p className="font-bold text-lg">{selectedSection.name}</p>
                                </div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{theme === 'showgirl' ? <span className="flex items-center gap-2 text-orange-500 font-bold uppercase tracking-wide animate-pulse"><Sparkles className="w-4 h-4" /> Tâm điểm màn trình diễn (Spotlight Focus)</span> : "Chủ đề chính (để AI tạo câu hỏi):"}</label>
                                <div className="relative group">
                                    <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={theme === 'showgirl' ? "VD: Vũ điệu Van tim, Khúc ca Thần kinh..." : `Ví dụ: ${selectedSection.keywords.slice(0, 3).join(', ')}...`} className={`w-full p-3 pl-10 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:border-transparent outline-none transition-all text-slate-900 dark:text-white ${theme === 'showgirl' ? 'bg-white/90 dark:bg-slate-900/90 border-orange-300 dark:border-orange-700 focus:ring-2 focus:ring-orange-500 text-lg font-medium shadow-inner' : themeStyle.inputFocus}`} />
                                    {theme === 'showgirl' ? <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-500 animate-spin-slow" /> : <Edit3 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className={`mt-6 p-4 rounded-xl flex items-center gap-2 text-sm animate-pulse border ${error === "QUOTA_ERROR" ? "bg-red-100 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-300" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400"}`}>
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <div>
                            <span className="font-bold">{error === "QUOTA_ERROR" ? "Hết hạn mức AI!" : error}</span>
                            {error === "QUOTA_ERROR" && (
                                <p className="text-xs mt-1">Vui lòng cập nhật API Key trong phần Cài đặt để tiếp tục.</p>
                            )}
                        </div>
                        {error === "QUOTA_ERROR" && (
                            <button className="ml-auto px-3 py-1.5 bg-white text-red-600 text-xs font-bold rounded border border-red-200 shadow-sm" onClick={() => alert("Nhấn vào Avatar > Cấu hình API Key để nhập khóa cá nhân.")}>Sửa Key</button>
                        )}
                    </div>
                )}
            </div>

            {/* CARD 3: SETTINGS */}
            <div className="relative rounded-3xl bg-gradient-to-br from-midnight-950 to-midnight-900 border border-slate-700 p-8 shadow-2xl animate-fade-up" style={{ animationDelay: '200ms' }}>
                <div className={`absolute top-0 right-0 w-full h-1 bg-gradient-to-r ${themeStyle.headerGradient} opacity-50`}></div>
                <div className="grid md:grid-cols-2 gap-12 mb-10">
                    <div className="relative">
                        <div className="flex justify-between mb-4"><label className="text-sm font-bold text-slate-300">Số lượng trạm (1-10)</label><span className={`text-2xl font-bold ${themeStyle.rangeColor}`}>{questionCount}</span></div>
                        <div className="relative h-10 flex items-center"><input type="range" min="1" max="10" value={questionCount} onChange={(e) => setQuestionCount(Number(e.target.value))} className="liquid-slider w-full" style={{ '--range-progress': `${((questionCount - 1) / 9) * 100}%` } as React.CSSProperties} /></div>
                    </div>
                    <div className="relative">
                        <div className="flex justify-between mb-4"><label className="text-sm font-bold text-slate-300">Thời gian (giây/trạm)</label><span className={`text-2xl font-bold ${themeStyle.rangeColor}`}>{timePerQuestion}s</span></div>
                        <div className="relative h-10 flex items-center"><input type="range" min="10" max="120" step="5" value={timePerQuestion} onChange={(e) => setTimePerQuestion(Number(e.target.value))} className="liquid-slider w-full" style={{ '--range-progress': `${((timePerQuestion - 10) / 110) * 100}%` } as React.CSSProperties} /></div>
                    </div>
                </div>
                <button onClick={handleGenerate} disabled={!selectedSection || !pdfFile} className={`w-full bg-gradient-to-r ${themeStyle.primaryBtn} disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-5 rounded-2xl transition-all flex items-center justify-center space-x-3 text-lg active:scale-95 relative overflow-hidden group`}>
                    <Play className="w-6 h-6 fill-current" />
                    <span>{theme === 'showgirl' ? "Let the show begin!" : "Bắt đầu thi Chạy Trạm"}</span>
                </button>
            </div>
        </div>
      </div>
    );
  }

  // ... Running & Summary steps remain largely unchanged except for error handling integration ...
  if (step === StationStep.RUNNING) {
    // (Using the existing StationRunner defined below/in file)
    return <StationRunner stations={stations} timePerStation={timePerQuestion} userAnswers={userAnswers} setUserAnswers={setUserAnswers} onFinish={() => setStep(StationStep.SUMMARY)} />;
  }

  if (step === StationStep.SUMMARY) {
    return <StationSummary stations={stations} userAnswers={userAnswers} onRestart={() => setStep(StationStep.SETUP)} handleConsultMentor={handleConsultMentor} mentorLoading={mentorLoading} mentorData={mentorData} showMentor={showMentor} mentorSectionRef={mentorSectionRef} />;
  }

  return null;
};

// Sub-components (StationRunner, StationSummary) logic is preserved but included in file context
// ... StationRunner & StationSummary implementation ...

interface StationRunnerProps { stations: StationItem[]; timePerStation: number; userAnswers: Record<string, string>; setUserAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>; onFinish: () => void; }
const StationRunner: React.FC<StationRunnerProps> = ({ stations, timePerStation, userAnswers, setUserAnswers, onFinish }) => {
    // ... Implementation ...
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(timePerStation);
    const [isPaused, setIsPaused] = useState(false);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => { setTimeLeft(timePerStation); setZoomLevel(1); setPan({ x: 0, y: 0 }); }, [currentIndex, timePerStation]);
    useEffect(() => { if (isPaused) return; if (timeLeft <= 0) { handleNext(); return; } const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000); return () => clearInterval(timer); }, [timeLeft, isPaused]);

    const handleNext = () => { if (currentIndex >= stations.length - 1) { onFinish(); } else { setCurrentIndex(prev => prev + 1); } };
    // ... Zoom/Pan Handlers ...
    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 8));
    const handleZoomOut = () => { setZoomLevel(prev => { const newZoom = Math.max(prev - 0.5, 1); if (newZoom === 1) setPan({ x: 0, y: 0 }); return newZoom; }); };
    const handleResetZoom = () => { setZoomLevel(1); setPan({ x: 0, y: 0 }); };
    const handleMouseDown = (e: React.MouseEvent) => { if (zoomLevel > 1) { setIsDragging(true); setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); } };
    const handleMouseMove = (e: React.MouseEvent) => { if (isDragging && zoomLevel > 1) { e.preventDefault(); setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); } };
    const handleMouseUp = () => { setIsDragging(false); };
    const handleDoubleClick = () => { if (zoomLevel === 1) { setZoomLevel(2.5); } else { handleZoomIn(); } };
    const handleAnswerChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { const currentStationId = stations[currentIndex].id; setUserAnswers(prev => ({ ...prev, [currentStationId]: e.target.value })); };

    const currentStation = stations[currentIndex];
    const currentQuestion = currentStation?.questions[0]; 
    const currentAnswer = userAnswers[currentStation.id] || "";
    if (!currentStation) return null; 
    const progress = ((timePerStation - timeLeft) / timePerStation) * 100;

    return (
        <div className="fixed inset-0 bg-slate-950 text-white z-50 flex flex-col">
            <div className="h-2 bg-slate-800 w-full"><div className="h-full bg-emerald-500 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(16,185,129,0.8)]" style={{ width: `${100 - progress}%` }}></div></div>
            <div className="flex items-center justify-between px-4 md:px-8 py-4 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-4"><div className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-lg font-bold border border-emerald-500/30 text-sm md:text-base">TRẠM {currentIndex + 1}</div><span className="text-slate-400 text-sm">/ {stations.length}</span></div>
                <div className={`text-4xl md:text-5xl font-mono font-bold tracking-widest ${timeLeft < 10 ? 'text-red-500 animate-pulse scale-110' : 'text-white'} transition-all`}>{timeLeft}</div>
                <button onClick={() => setIsPaused(!isPaused)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors text-sm">{isPaused ? "Tiếp tục" : "Tạm dừng"}</button>
            </div>
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                <div className="flex-1 bg-black/80 relative overflow-hidden flex items-center justify-center group select-none order-1 touch-none">
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex gap-2 bg-slate-800/80 backdrop-blur-md p-1.5 rounded-xl border border-slate-700 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={handleZoomOut} className="p-2 hover:bg-slate-700 rounded-lg text-white"><ZoomOut className="w-5 h-5" /></button>
                        <button onClick={handleResetZoom} className="p-2 hover:bg-slate-700 rounded-lg text-white font-mono text-xs min-w-[3ch]">{Math.round(zoomLevel * 100)}%</button>
                        <button onClick={handleZoomIn} className="p-2 hover:bg-slate-700 rounded-lg text-white"><ZoomIn className="w-5 h-5" /></button>
                        <div className="w-px bg-slate-600 mx-1"></div>
                        <button onClick={handleResetZoom} className="p-2 hover:bg-slate-700 rounded-lg text-white"><RotateCcw className="w-5 h-5" /></button>
                    </div>
                    <div className="w-full h-full flex items-center justify-center overflow-hidden p-4" onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} onDoubleClick={handleDoubleClick} style={{ cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}>
                         <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`, transition: isDragging ? 'none' : 'transform 0.2s ease-out' }} className="origin-center flex items-center justify-center">
                             <img src={currentStation.imageUri} alt="Anatomy Spot" className="max-h-[85vh] max-w-full object-contain shadow-2xl rounded-lg pointer-events-none select-none" draggable={false} />
                         </div>
                    </div>
                </div>
                <div className="md:w-[420px] w-full bg-slate-900 border-l border-slate-800 p-6 flex flex-col justify-between shadow-2xl relative z-10 order-2">
                     <div className="space-y-6">
                         <div className="flex items-center gap-2 text-emerald-400 font-bold uppercase tracking-wider text-xs"><Crosshair className="w-4 h-4" /> Câu hỏi định danh</div>
                         <h2 className="text-2xl font-bold leading-snug text-white">{formatText(currentQuestion?.questionText)}</h2>
                         <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 text-slate-400 italic text-xs">Lưu ý: Quan sát kỹ hình ảnh bên trái. Có thể phóng to và kéo chuột để xem rõ chi tiết.</div>
                     </div>
                     <div className="mt-8 md:mt-0 space-y-4 flex-1 flex flex-col justify-end">
                         <div className="space-y-2">
                             <label className="text-sm font-bold text-slate-300">Câu trả lời của bạn:</label>
                             <textarea value={currentAnswer} onChange={handleAnswerChange} placeholder="Nhập tên cấu trúc giải phẫu..." className="w-full h-32 bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none resize-none text-lg placeholder-slate-600" />
                         </div>
                         <button onClick={handleNext} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg hover:shadow-emerald-500/30 transition-all text-lg mt-4"><span>{currentIndex === stations.length - 1 ? "Nộp bài" : "Tiếp theo"}</span><ArrowRight className="w-6 h-6" /></button>
                     </div>
                </div>
            </div>
        </div>
    );
};

interface StationSummaryProps { stations: StationItem[]; userAnswers: Record<string, string>; onRestart: () => void; handleConsultMentor: () => void; mentorLoading: boolean; mentorData: MentorResponse | null; showMentor: boolean; mentorSectionRef: React.RefObject<HTMLDivElement>; }
const StationSummary: React.FC<StationSummaryProps> = ({ stations, userAnswers, onRestart, handleConsultMentor, mentorLoading, mentorData, showMentor, mentorSectionRef }) => {
    // ... Implementation ...
    let correctCount = 0;
    const gradedStations = stations.map(s => {
        const userAns = userAnswers[s.id] || "";
        const correctAns = s.questions[0].correctAnswer;
        const isCorrect = checkAnswer(userAns, correctAns);
        if (isCorrect) correctCount++;
        return { ...s, isCorrect };
    });
    const scorePercentage = Math.round((correctCount / stations.length) * 100);
    const radius = 28;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (scorePercentage / 100) * circumference;
    const pigAngle = (scorePercentage / 100) * 2 * Math.PI;
    const pigX = 35 + 28 * Math.cos(pigAngle);
    const pigY = 35 + 28 * Math.sin(pigAngle);

    return (
        <div className="max-w-4xl mx-auto pb-20 px-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700 mb-10 flex flex-col md:flex-row items-center gap-8 animate-fade-up">
                 <div className="relative w-32 h-32 flex-shrink-0 group">
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 70 70"><circle cx="35" cy="35" r={radius} fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-800" strokeWidth="6" /><circle cx="35" cy="35" r={radius} fill="none" stroke="#10b981" strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" className="transition-all duration-1000 ease-out" /><foreignObject x={pigX - 7} y={pigY - 7} width="14" height="14"><div className="w-full h-full rounded-full bg-pink-100 border border-pink-300 flex items-center justify-center shadow-sm rotate-90"><span className="text-[9px]">🐷</span></div></foreignObject></svg>
                        <div className="absolute inset-0 flex items-center justify-center flex-col"><span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{scorePercentage}%</span></div>
                </div>
                <div className="text-center md:text-left flex-1">
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Kết quả Chạy Trạm</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-4">Heo con đã chấm bài xong! Bạn làm đúng <strong className="text-emerald-600 dark:text-emerald-400">{correctCount}/{stations.length}</strong> trạm.</p>
                    <div className="flex gap-3 justify-center md:justify-start">
                        <button onClick={onRestart} className="px-6 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold hover:opacity-90 transition-all shadow-md flex items-center gap-2"><Activity className="w-4 h-4" /> Thi lại</button>
                        {!showMentor && (<button onClick={handleConsultMentor} disabled={mentorLoading} className="px-6 py-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-all flex items-center gap-2 font-bold rounded-xl"><span>🦦</span><span>Hỏi Rái cá</span></button>)}
                    </div>
                </div>
            </div>

            {showMentor && (
                <div ref={mentorSectionRef} className="mb-12 animate-in slide-in-from-bottom-10 duration-700">
                    {mentorLoading ? (<div className="w-full bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-xl border border-amber-200 dark:border-amber-900/30 text-center flex flex-col items-center gap-4"><div className="text-6xl animate-bounce">🦦</div><p className="text-slate-600 dark:text-slate-300 font-medium animate-pulse">Rái cá nhỏ đang xem bài làm của bạn...</p></div>) 
                    : mentorData ? (
                        <div className="relative bg-gradient-to-b from-amber-50 to-white dark:from-slate-900 dark:to-slate-900 rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-amber-200 dark:border-slate-700 overflow-hidden">
                            {/* ... Mentor Display ... */}
                             <div className="absolute top-0 right-0 w-64 h-64 bg-amber-300/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
                             <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                                    <div className="lg:col-span-5 flex flex-col gap-6">
                                        <div className="flex items-center gap-6">
                                            <div className="w-28 h-28 bg-gradient-to-br from-amber-100 to-white dark:from-slate-800 dark:to-slate-700 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-600 relative flex-shrink-0"><span className="text-6xl animate-[wiggle_3s_infinite]">🦦</span></div>
                                            <div><h3 className="text-xl font-bold text-slate-900 dark:text-white">Rái cá nhỏ</h3><p className="text-xs text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wide">Góc nhìn chuyên gia</p></div>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl rounded-tl-none shadow-sm border border-amber-100 dark:border-slate-700 relative"><p className="text-slate-700 dark:text-slate-300 leading-relaxed italic text-lg">"{mentorData.analysis}"</p></div>
                                    </div>
                                    <div className="lg:col-span-7 flex flex-col gap-4">
                                        <div className="bg-green-50/80 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4"><div className="flex items-center gap-2 mb-2 text-green-700 dark:text-green-400 font-bold text-sm uppercase"><ThumbsUp className="w-4 h-4" /> Điểm mạnh</div><ul className="space-y-1">{mentorData.strengths?.map((s, i) => <li key={i} className="text-xs text-slate-600 dark:text-slate-300">• {s}</li>)}</ul></div>
                                        <div className="bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4"><div className="flex items-center gap-2 mb-2 text-red-700 dark:text-red-400 font-bold text-sm uppercase"><ShieldAlert className="w-4 h-4" /> Điểm yếu</div><ul className="space-y-1">{mentorData.weaknesses?.map((w, i) => <li key={i} className="text-xs text-slate-600 dark:text-slate-300">• {w}</li>)}</ul></div>
                                    </div>
                            </div>
                            {/* ... Roadmap ... */}
                        </div>
                    ) : null}
                </div>
            )}

            <div className="space-y-8">
                {gradedStations.map((station, idx) => {
                    const userAns = userAnswers[station.id];
                    return (
                    <div key={station.id} className={`bg-white dark:bg-slate-800 rounded-3xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${station.isCorrect ? 'border-green-200 dark:border-green-900/30' : 'border-red-200 dark:border-red-900/30'}`}>
                        <div className="w-full h-64 bg-slate-950 flex items-center justify-center relative overflow-hidden group">
                             <img src={station.imageUri} alt={`Station ${idx+1}`} className="h-full w-auto object-contain" />
                             <div className={`absolute top-4 left-4 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 ${station.isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>{station.isCorrect ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Trạm {idx + 1}</div>
                        </div>
                        <div className="p-6">
                            <div className="mb-6"><h3 className="text-lg font-bold text-slate-900 dark:text-white">{formatText(station.questions[0].questionText)}</h3></div>
                            <div className="grid md:grid-cols-2 gap-4 mb-6">
                                <div className={`p-4 rounded-2xl border ${station.isCorrect ? 'bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/30' : 'bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30'}`}><label className="text-xs font-bold uppercase tracking-wider mb-1 block opacity-70">Đáp án của bạn</label><p className={`font-medium text-lg ${station.isCorrect ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{userAns || "(Bỏ trống)"}</p></div>
                                <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30"><label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1 block opacity-70">Đáp án đúng</label><p className="font-medium text-lg text-blue-800 dark:text-blue-300">{formatText(station.questions[0].correctAnswer)}</p></div>
                            </div>
                            <div className="bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400 dark:border-yellow-600 p-5 rounded-r-xl shadow-sm"><div className="flex items-center gap-2 mb-2"><Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" /><span className="font-bold text-yellow-700 dark:text-yellow-300 uppercase text-xs tracking-wide">Giải thích chi tiết</span></div><p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed pl-7">{formatText(station.questions[0].explanation)}</p></div>
                        </div>
                    </div>
                )})}
            </div>
        </div>
    );
};
