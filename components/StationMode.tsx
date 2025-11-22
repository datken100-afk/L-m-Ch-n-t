import React, { useState, useRef, useEffect } from 'react';
import { generateStationQuestionFromImage, analyzeResultWithOtter } from '../services/geminiService';
import { StationItem, MentorResponse } from '../types';
import { Play, Timer, ArrowRight, CheckCircle, Eye, EyeOff, Activity, FileText, Crosshair, Database, Sparkles, FileUp, Loader2, ZoomIn, ZoomOut, RotateCcw, Check, X, ThumbsUp, ShieldAlert, AlertCircle, Lightbulb, List, Search, Book, ChevronLeft, Edit3, Key, Milestone, Footprints } from 'lucide-react';
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
  const [imageFiles, setImageFiles] = useState<{name: string, data: string}[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorData, setMentorData] = useState<MentorResponse | null>(null);
  const [showMentor, setShowMentor] = useState(false);

  // Running State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [currentInput, setCurrentInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mentorSectionRef = useRef<HTMLDivElement>(null);

  const getThemeStyles = () => {
      switch(theme) {
          case 'xmas': return { 
              headerGradient: 'from-emerald-600 to-teal-600', headerIconBg: 'bg-white/20', headerText: 'text-teal-100', headerGlow: 'text-glow-white', 
              fileBorderActive: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', fileBorderHover: 'hover:border-emerald-400', 
              sectionSelected: 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800', sectionHover: 'hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20', 
              inputFocus: 'focus:ring-emerald-500', rangeColor: 'text-emerald-400', primaryBtn: 'from-red-600 to-emerald-600 hover:from-red-500 hover:to-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
          };
          case 'swift': return { 
              headerGradient: 'from-indigo-600 via-purple-600 to-pink-600', 
              headerIconBg: 'bg-white/10 backdrop-blur-md border border-purple-500/30', 
              headerText: 'text-purple-100', 
              headerGlow: 'text-glow-white drop-shadow-lg', 
              fileBorderActive: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20', 
              fileBorderHover: 'hover:border-purple-400', 
              sectionSelected: 'bg-purple-50 dark:bg-purple-900/10 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.2)]', 
              sectionHover: 'hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20', 
              inputFocus: 'focus:ring-purple-500', 
              rangeColor: 'text-fuchsia-400', 
              primaryBtn: 'from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-[0_0_30px_rgba(168,85,247,0.5)] border border-purple-400/30' 
          };
          case 'blackpink': return {
              headerGradient: 'from-pink-600 to-black', headerIconBg: 'bg-black/20', headerText: 'text-pink-100', headerGlow: 'text-glow',
              fileBorderActive: 'border-pink-500 bg-slate-800', fileBorderHover: 'hover:border-pink-400',
              sectionSelected: 'bg-slate-800 border-pink-500 text-pink-500', sectionHover: 'hover:border-pink-500 hover:bg-slate-800',
              inputFocus: 'focus:ring-pink-500', rangeColor: 'text-pink-500', primaryBtn: 'from-pink-600 to-slate-900 shadow-pink-500/40'
          };
          case 'aespa': return {
              headerGradient: 'from-indigo-900 to-purple-900', headerIconBg: 'bg-white/10', headerText: 'text-indigo-100', headerGlow: 'text-glow-white',
              fileBorderActive: 'border-indigo-500 bg-slate-800', fileBorderHover: 'hover:border-indigo-400',
              sectionSelected: 'bg-slate-800 border-indigo-500 text-indigo-400', sectionHover: 'hover:border-indigo-500 hover:bg-slate-800',
              inputFocus: 'focus:ring-indigo-500', rangeColor: 'text-indigo-400', primaryBtn: 'from-indigo-600 to-purple-600 shadow-indigo-500/40'
          };
          case 'rosie': return {
              headerGradient: 'from-rose-500 to-red-600', headerIconBg: 'bg-white/20', headerText: 'text-rose-100', headerGlow: 'text-glow-white',
              fileBorderActive: 'border-rose-500 bg-rose-50 dark:bg-rose-900/20', fileBorderHover: 'hover:border-rose-400',
              sectionSelected: 'bg-rose-50 dark:bg-rose-900/10 border-rose-500', sectionHover: 'hover:border-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20',
              inputFocus: 'focus:ring-rose-500', rangeColor: 'text-rose-400', primaryBtn: 'from-rose-500 to-red-600 shadow-rose-500/40'
          };
          case 'pkl': return {
              headerGradient: 'from-slate-700 via-cyan-700 to-slate-800', headerIconBg: 'bg-white/10', headerText: 'text-cyan-100', headerGlow: 'text-glow-white',
              fileBorderActive: 'border-cyan-500 bg-slate-800', fileBorderHover: 'hover:border-cyan-400',
              sectionSelected: 'bg-slate-800 border-cyan-500 text-cyan-400', sectionHover: 'hover:border-cyan-500 hover:bg-slate-800',
              inputFocus: 'focus:ring-cyan-500', rangeColor: 'text-cyan-400', primaryBtn: 'from-slate-600 to-cyan-700 shadow-cyan-500/40'
          };
          case 'showgirl': return {
              headerGradient: 'from-teal-600 to-orange-500', headerIconBg: 'bg-white/20', headerText: 'text-white', headerGlow: 'text-glow-white',
              fileBorderActive: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20', fileBorderHover: 'hover:border-orange-400',
              sectionSelected: 'bg-orange-50 dark:bg-orange-900/10 border-orange-500', sectionHover: 'hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20',
              inputFocus: 'focus:ring-orange-500', rangeColor: 'text-orange-400', primaryBtn: 'from-teal-500 to-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.5)]'
          };
          default: return { 
              headerGradient: 'from-amber-500 to-orange-600', headerIconBg: 'bg-white/20', headerText: 'text-amber-100', headerGlow: 'text-glow-white', 
              fileBorderActive: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20', fileBorderHover: 'hover:border-amber-400', 
              sectionSelected: 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800', sectionHover: 'hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20', 
              inputFocus: 'focus:ring-amber-500', rangeColor: 'text-amber-400', primaryBtn: 'from-amber-500 to-orange-600 shadow-orange-500/30' 
          };
      }
  };
  const themeStyle = getThemeStyles();

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
                 // Time's up for this station, move next
                 handleNextStation();
                 return timePerQuestion; 
              }
              return prev - 1;
          });
      }, 1000);
      return () => clearInterval(interval);
  }, [step, currentIndex, timePerQuestion]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
        Array.from(files).forEach((file: File) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageFiles(prev => [...prev, { name: file.name, data: reader.result as string }]);
            };
            reader.readAsDataURL(file);
        });
    }
  };

  const handleGenerate = async () => {
      if (imageFiles.length === 0) return;
      setLoading(true);
      setLoadingText("Đang phân tích hình ảnh...");
      setLoadingProgress(0);

      const newStations: StationItem[] = [];
      const limit = Math.min(imageFiles.length, questionCount);

      try {
          for (let i = 0; i < limit; i++) {
              setLoadingProgress(Math.round(((i) / limit) * 100));
              setLoadingText(`Đang tạo câu hỏi ${i + 1}/${limit}...`);
              
              const result = await generateStationQuestionFromImage(imageFiles[i].data, topic || "Giải phẫu học");
              
              if (result.isValid && result.questions.length > 0) {
                  newStations.push({
                      id: `st-${Date.now()}-${i}`,
                      imageUri: imageFiles[i].data,
                      questions: result.questions.map((q, idx) => ({ ...q, id: `q-${i}-${idx}` }))
                  });
              }
          }

          if (newStations.length === 0) {
              setError("Không tạo được câu hỏi nào. Hình ảnh có thể không rõ ràng.");
          } else {
              setStations(newStations);
              setStep(StationStep.RUNNING);
              setCurrentIndex(0);
              setTimeLeft(timePerQuestion);
          }
      } catch (e: any) {
          console.error(e);
          setError(e.message || "Lỗi khi tạo trạm.");
      } finally {
          setLoading(false);
      }
  };

  const handleNextStation = () => {
      // Save current answer if any (already saved via onChange)
      if (currentIndex < stations.length - 1) {
          setCurrentIndex(prev => prev + 1);
          setTimeLeft(timePerQuestion);
          setCurrentInput(''); // Reset input for next station (or keep if we want persistent review, but usually blank)
          // Actually we should pre-fill if user goes back/forth, but here logic is linear usually.
          // Let's allow linear only for now to sim station exam.
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

  if (loading) {
      return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md">
            <div className="w-full max-w-md text-center p-8">
                 <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
                 <p className="text-xl font-bold">{loadingText}</p>
                 <div className="w-full bg-slate-200 h-2 rounded-full mt-4 overflow-hidden">
                     <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${loadingProgress}%` }}></div>
                 </div>
            </div>
        </div>
      );
  }

  if (step === StationStep.SETUP) {
      return (
        <div className="max-w-4xl mx-auto pb-20 px-4">
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
                        <p className={`text-lg ${themeStyle.headerText}`}>{theme === 'showgirl' ? "Mô phỏng sân khấu thực tế. Nhận diện cấu trúc dưới ánh đèn spotlight." : theme === 'swift' ? "Dont get sad, get even. Nhận diện cấu trúc giải phẫu siêu tốc." : "Mô phỏng kỳ thi thực hành giải phẫu. AI sẽ tạo câu hỏi định danh từ hình ảnh."}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-lg border border-slate-200 dark:border-slate-700 mt-8 animate-fade-up">
                <div className="mb-8">
                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Chủ đề / Phần học</label>
                     <input
                        type="text"
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="VD: Xương chi trên, Cơ vùng mặt..."
                        className={`w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 outline-none transition-all text-lg font-medium text-slate-900 dark:text-white ${themeStyle.inputFocus}`}
                     />
                </div>
                
                <div className="grid md:grid-cols-2 gap-8 mb-8">
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

                <div className="mb-8">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wide">Tải lên hình ảnh (Atlas / Mô hình)</label>
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all group ${imageFiles.length > 0 ? themeStyle.fileBorderActive : 'border-slate-300 dark:border-slate-700'} ${themeStyle.fileBorderHover}`}
                    >
                        <input type="file" multiple accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                            <FileUp className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-slate-600 dark:text-slate-300 font-medium">Nhấn để chọn hình ảnh</p>
                        <p className="text-xs text-slate-400 mt-2">Đã chọn: {imageFiles.length} hình</p>
                    </div>
                    {imageFiles.length > 0 && (
                        <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                            {imageFiles.map((f, i) => (
                                <div key={i} className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-slate-200">
                                    <img src={f.data} alt="preview" className="w-full h-full object-cover" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {error && <p className="text-red-500 text-sm mb-4 text-center bg-red-50 p-2 rounded">{error}</p>}

                <button
                    onClick={handleGenerate}
                    disabled={imageFiles.length === 0 || !topic.trim()}
                    className={`w-full bg-gradient-to-r ${themeStyle.primaryBtn} text-white font-bold py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95`}
                >
                    <Play className="w-6 h-6" />
                    <span>Bắt đầu chạy trạm</span>
                </button>
            </div>
        </div>
      );
  }

  if (step === StationStep.RUNNING && stations.length > 0) {
      const currentStation = stations[currentIndex];
      const currentQ = currentStation.questions[0]; // Assume 1 question per image for now

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
                  {/* Image Area */}
                  <div className="flex-1 bg-black rounded-3xl overflow-hidden relative shadow-lg flex items-center justify-center group">
                      <img 
                        src={currentStation.imageUri} 
                        alt="Anatomy" 
                        className="max-w-full max-h-full object-contain"
                      />
                      {/* Zoom Controls (Visual Only for now) */}
                      <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 bg-black/50 text-white rounded-lg backdrop-blur-sm hover:bg-black/70"><ZoomIn className="w-5 h-5" /></button>
                          <button className="p-2 bg-black/50 text-white rounded-lg backdrop-blur-sm hover:bg-black/70"><ZoomOut className="w-5 h-5" /></button>
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

                        <div className="flex justify-center gap-4">
                            <button onClick={() => { setStations([]); setStep(StationStep.SETUP); }} className="px-6 py-3 rounded-xl border-2 font-bold text-slate-600 hover:bg-slate-50">
                                Làm lại
                            </button>
                        </div>
                   </div>

                   <div className="mt-12 space-y-6">
                       {stations.map((st, idx) => (
                           <div key={st.id} className="border-b border-slate-100 dark:border-slate-800 pb-6 last:border-0">
                               <div className="flex flex-col md:flex-row gap-6">
                                   <div className="w-32 h-32 rounded-xl overflow-hidden bg-black shrink-0">
                                       <img src={st.imageUri} className="w-full h-full object-cover" />
                                   </div>
                                   <div className="flex-1">
                                       <div className="font-bold text-slate-800 dark:text-white mb-2">Trạm {idx + 1}: {st.questions[0].questionText}</div>
                                       <div className="grid md:grid-cols-2 gap-4 text-sm">
                                           <div className={`p-3 rounded-lg border ${checkAnswer(userAnswers[st.questions[0].id], st.questions[0].correctAnswer) ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                                               <div className="text-xs opacity-70 uppercase font-bold mb-1">Trả lời</div>
                                               {userAnswers[st.questions[0].id] || "(Bỏ trống)"}
                                           </div>
                                           <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800">
                                               <div className="text-xs opacity-70 uppercase font-bold mb-1">Đáp án đúng</div>
                                               {st.questions[0].correctAnswer}
                                           </div>
                                       </div>
                                       <p className="mt-2 text-xs text-slate-500 italic">{st.questions[0].explanation}</p>
                                   </div>
                               </div>
                           </div>
                       ))}
                   </div>
               </div>
          </div>
      );
  }

  return null;
};