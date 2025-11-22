
import React, { useState, useRef, useEffect } from 'react';
import { generateMCQQuestions, analyzeResultWithOtter } from '../services/geminiService';
import { Difficulty, MCQQuestion, MentorResponse } from '../types';
import { CheckCircle2, CheckCircle, XCircle, BrainCircuit, RefreshCw, ArrowRight, AlertCircle, BookOpen, Activity, Clock, FileCheck, Trash, Plus, File as FileIcon, Check, Sparkles, Loader2, Trophy, ThumbsUp, ShieldAlert, FileText, Key, Stethoscope, Milestone, Footprints } from 'lucide-react';
import { ThemeType } from '../App';

// Declare pdfjsLib globally
declare const pdfjsLib: any;

interface UploadedFile {
    name: string;
    data: string; 
    type: 'text' | 'base64'; 
}

const MAX_FILE_SIZE = 200 * 1024 * 1024; 
const MAX_FILES_PER_CATEGORY = 3;

const formatText = (text: string) => {
  if (!text) return "";
  return text.replace(/->/g, ' → ').replace(/=>/g, ' ⇒ ').replace(/<-/g, ' ← ');
};

interface FileCategoryProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  bgGradient: string;
  iconColor: string;
  glowClass: string;
  files: UploadedFile[];
  onRemove: (index: number) => void;
  onAdd: () => void;
  themeColorClass: string; 
}

const FileCategory: React.FC<FileCategoryProps> = ({ 
    icon, title, desc, bgGradient, iconColor, glowClass, files, onRemove, onAdd, themeColorClass
}) => {
    return (
        <div className={`group relative rounded-2xl border border-slate-200 dark:border-slate-700 p-4 transition-all duration-300 ${bgGradient} ${glowClass}`}>
            <div className="flex items-center gap-4 mb-3 relative z-10">
                <div className={`w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center ${iconColor} ring-1 ring-black/5 dark:ring-white/5`}>
                    {icon}
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wide">{title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{desc}</p>
                </div>
                <button 
                    onClick={onAdd}
                    className={`w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-90 text-slate-400 ${themeColorClass}`}
                    title="Thêm tài liệu"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {files.length > 0 ? (
                <div className="space-y-2 relative z-10">
                    {files.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-700/50 text-xs animate-in fade-in slide-in-from-left-2">
                            <FileIcon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span className="flex-1 truncate font-medium text-slate-700 dark:text-slate-300" title={file.name}>{file.name}</span>
                            <button onClick={() => onRemove(idx)} className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                <Trash className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={`relative z-10 mt-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 text-center transition-colors cursor-pointer bg-white/30 dark:bg-black/10 hover:border-slate-400 dark:hover:border-slate-600`} onClick={onAdd}>
                    <p className="text-xs text-slate-400 font-medium">Chưa có file nào. <br/> Nhấn + để thêm.</p>
                </div>
            )}
        </div>
    );
};

interface MCQModeProps {
    onBack: () => void;
    theme: ThemeType;
}

export const MCQMode: React.FC<MCQModeProps> = ({ onBack, theme }) => {
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10); 
  const [timeLimit, setTimeLimit] = useState(15); 
  const [difficulties, setDifficulties] = useState<Difficulty[]>([Difficulty.UNDERSTAND]);
  
  const [theoryFiles, setTheoryFiles] = useState<UploadedFile[]>([]);
  const [clinicalFiles, setClinicalFiles] = useState<UploadedFile[]>([]);
  const [sampleFiles, setSampleFiles] = useState<UploadedFile[]>([]);
  
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isResultMinimized, setIsResultMinimized] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0); 

  const [showMentor, setShowMentor] = useState(false);
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorData, setMentorData] = useState<MentorResponse | null>(null);

  const theoryInputRef = useRef<HTMLInputElement>(null);
  const clinicalInputRef = useRef<HTMLInputElement>(null);
  const sampleInputRef = useRef<HTMLInputElement>(null);
  const mentorSectionRef = useRef<HTMLDivElement>(null);

  const getThemeStyles = () => {
      switch(theme) {
          case 'xmas': return {
              headerGradient: 'from-red-600 to-green-700',
              headerIconBg: 'bg-white/20',
              headerText: 'text-red-50',
              headerGlow: 'text-glow-white',
              inputFocus: 'focus:ring-red-500',
              rangeColor: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30',
              activeDiff: 'bg-red-100 border-red-500 text-red-700 dark:bg-red-900/40 dark:text-red-300',
              primaryBtn: 'from-red-600 to-green-600 hover:from-red-500 hover:to-green-500 shadow-red-500/30',
              iconColor: 'hover:text-red-600 dark:hover:text-red-400 hover:border-red-300'
          };
          case 'swift': return {
              // VIP Eras Style: Holographic & Lavender
              headerGradient: 'from-indigo-500 via-purple-500 to-pink-500 shadow-[0_0_60px_rgba(168,85,247,0.4)]',
              headerIconBg: 'bg-white/10 backdrop-blur-md border border-purple-500/30',
              headerText: 'text-purple-100',
              headerGlow: 'text-glow-white drop-shadow-lg',
              inputFocus: 'focus:ring-purple-500',
              rangeColor: 'text-fuchsia-400 dark:text-fuchsia-300 bg-fuchsia-900/30',
              activeDiff: 'bg-purple-900/40 border-purple-500 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.3)]',
              primaryBtn: 'from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 shadow-[0_0_30px_rgba(236,72,153,0.5)] border border-purple-400/30',
              iconColor: 'hover:text-purple-400 dark:hover:text-purple-300 hover:border-purple-400'
          };
          case 'blackpink': return {
              headerGradient: 'from-pink-500 to-black',
              headerIconBg: 'bg-black/20',
              headerText: 'text-white',
              headerGlow: 'text-glow',
              inputFocus: 'focus:ring-pink-500',
              rangeColor: 'text-pink-500 bg-pink-50 dark:bg-pink-900/30',
              activeDiff: 'bg-slate-900 border-pink-500 text-pink-500',
              primaryBtn: 'from-pink-600 to-black hover:from-pink-500 hover:to-slate-900 shadow-pink-500/40',
              iconColor: 'hover:text-pink-500 hover:border-pink-500'
          };
          case 'aespa': return {
              headerGradient: 'from-slate-700 via-indigo-900 to-purple-900',
              headerIconBg: 'bg-white/10',
              headerText: 'text-indigo-50',
              headerGlow: 'text-glow-white',
              inputFocus: 'focus:ring-indigo-500',
              rangeColor: 'text-indigo-400 bg-indigo-900/30',
              activeDiff: 'bg-indigo-900/50 border-indigo-400 text-indigo-300',
              primaryBtn: 'from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-500/30',
              iconColor: 'hover:text-indigo-400 hover:border-indigo-400'
          };
          case 'rosie': return {
              headerGradient: 'from-rose-500 via-red-500 to-rose-600',
              headerIconBg: 'bg-white/20',
              headerText: 'text-white',
              headerGlow: 'text-glow-white',
              inputFocus: 'focus:ring-rose-500',
              rangeColor: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/30',
              activeDiff: 'bg-rose-100 border-rose-500 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
              primaryBtn: 'from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 shadow-rose-500/40',
              iconColor: 'hover:text-rose-600 dark:hover:text-rose-400 hover:border-rose-300'
          };
          case 'pkl': return {
              headerGradient: 'from-slate-700 via-cyan-700 to-slate-800',
              headerIconBg: 'bg-white/10',
              headerText: 'text-cyan-100',
              headerGlow: 'text-glow-white',
              inputFocus: 'focus:ring-cyan-500',
              rangeColor: 'text-cyan-500 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30',
              activeDiff: 'bg-slate-100 border-cyan-500 text-cyan-700 dark:bg-slate-800 dark:text-cyan-400',
              primaryBtn: 'from-slate-600 to-cyan-800 hover:from-slate-500 hover:to-cyan-700 border border-cyan-500/50 shadow-cyan-500/20',
              iconColor: 'hover:text-cyan-500 dark:hover:text-cyan-400 hover:border-cyan-400'
          };
          case 'showgirl': return {
              headerGradient: 'from-teal-600 to-orange-500',
              headerIconBg: 'bg-white/20',
              headerText: 'text-white',
              headerGlow: 'text-glow-white',
              inputFocus: 'focus:ring-orange-500',
              rangeColor: 'text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30',
              activeDiff: 'bg-orange-50 border-orange-400 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
              primaryBtn: 'from-teal-500 to-orange-500 hover:from-teal-400 hover:to-orange-400 shadow-[0_0_30px_rgba(249,115,22,0.5)]',
              iconColor: 'hover:text-orange-500 dark:hover:text-orange-300 hover:border-orange-300'
          };
          default: return {
              headerGradient: 'from-blue-600 to-indigo-600',
              headerIconBg: 'bg-white/20',
              headerText: 'text-blue-100',
              headerGlow: 'text-glow-white',
              inputFocus: 'focus:ring-blue-500',
              rangeColor: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
              activeDiff: 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
              primaryBtn: 'from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/30',
              iconColor: 'hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-200'
          };
      }
  };
  const themeStyle = getThemeStyles();

  const extractTextFromPDF = async (file: File): Promise<string> => {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      
      for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(" ");
          fullText += `\n--- Page ${i} ---\n${pageText}`;
      }
      return fullText;
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>, 
    setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>,
    currentFiles: UploadedFile[]
  ) => {
    const files = e.target.files;
    setError(null);

    if (files) {
      const fileArray = Array.from(files) as File[];
      
      if (currentFiles.length + fileArray.length > MAX_FILES_PER_CATEGORY) {
          setError(`Chỉ được tải tối đa ${MAX_FILES_PER_CATEGORY} file cho mỗi mục.`);
          return;
      }

      setIsProcessingFile(true);

      for (const file of fileArray) {
          if (file.size > MAX_FILE_SIZE) {
              setError(`File ${file.name} quá lớn (>200MB).`);
              continue;
          }

          try {
            if (file.type === 'application/pdf') {
                const text = await extractTextFromPDF(file);
                if (!text || text.trim().length < 100) {
                   setError(`File ${file.name} có vẻ là bản scan (ảnh). AI chỉ đọc được văn bản có thể copy. Vui lòng dùng file có Text Layer.`);
                }
                setFiles(prev => [...prev, { name: file.name, data: text, type: 'text' }]);
            } else {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onloadend = () => {
                    setFiles(prev => [...prev, { name: file.name, data: reader.result as string, type: 'base64' }]);
                };
            }
          } catch (err) {
              console.error("File processing error", err);
              setError(`Lỗi khi đọc file ${file.name}. File có thể bị hỏng.`);
          }
      }
      
      setIsProcessingFile(false);
    }
    if (e.target) e.target.value = '';
  };

  const removeFile = (index: number, setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleDifficulty = (diff: Difficulty) => {
    setDifficulties(prev => {
      if (prev.includes(diff)) {
        return prev.filter(d => d !== diff);
      } else {
        return [...prev, diff];
      }
    });
  };

  const getLoadingStyles = () => {
    // ... (Theme styles remain the same, omitted for brevity)
    if (theme === 'xmas') return { bar: 'bg-[repeating-linear-gradient(45deg,#dc2626,#dc2626_10px,#ffffff_10px,#ffffff_20px)]', shadow: 'shadow-[0_0_20px_rgba(220,38,38,0.5)]', icon: '🎅', title: 'ÔNG GIÀ NOEL ĐANG SOẠN ĐỀ...', titleGradient: 'from-red-500 to-emerald-600' };
    if (theme === 'swift') return { bar: 'bg-[repeating-linear-gradient(45deg,#a855f7,#a855f7_10px,#ec4899_10px,#ec4899_20px)]', shadow: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]', icon: '🐍', title: 'RẮN CHÚA ĐANG SOẠN ĐỀ...', titleGradient: 'from-purple-500 to-pink-600' };
    if (theme === 'blackpink') return { bar: 'bg-[repeating-linear-gradient(45deg,#ec4899,#ec4899_10px,#0f172a_10px,#0f172a_20px)]', shadow: 'shadow-[0_0_20px_rgba(236,72,153,0.5)]', icon: '🔨', title: 'HẮC HƯỜNG ĐANG SOẠN ĐỀ...', titleGradient: 'from-pink-500 to-slate-900' };
    if (theme === 'aespa') return { bar: 'bg-[repeating-linear-gradient(45deg,#94a3b8,#94a3b8_10px,#a855f7_10px,#a855f7_20px)]', shadow: 'shadow-[0_0_20px_rgba(168,85,247,0.8)]', icon: '👽', title: 'KẾT NỐI VỚI NAEVIS...', titleGradient: 'from-slate-300 via-purple-400 to-indigo-500' };
    if (theme === 'rosie') return { bar: 'bg-[repeating-linear-gradient(45deg,#e11d48,#e11d48_10px,#fbbf24_10px,#fbbf24_20px)]', shadow: 'shadow-[0_0_20px_rgba(225,29,72,0.8)]', icon: '🌹', title: 'ROSIE ĐANG SOẠN ĐỀ...', titleGradient: 'from-rose-500 to-red-600' };
    if (theme === 'pkl') return { bar: 'bg-[repeating-linear-gradient(45deg,#334155,#334155_10px,#06b6d4_10px,#06b6d4_20px)]', shadow: 'shadow-[0_0_20px_rgba(6,182,212,0.5)]', icon: '🗡️', title: 'ĐANG MÀI GƯƠM...', titleGradient: 'from-slate-400 via-cyan-400 to-slate-400' };
    if (theme === 'showgirl') return { bar: 'bg-[repeating-linear-gradient(45deg,#14b8a6,#14b8a6_10px,#f97316_10px,#f97316_20px)]', shadow: 'shadow-[0_0_30px_rgba(249,115,22,0.6)]', icon: '💃', title: 'LIGHTS, CAMERA, SMILE!', titleGradient: 'from-teal-500 to-orange-500' };
    return { bar: 'bg-[repeating-linear-gradient(45deg,#3b82f6,#3b82f6_10px,#6366f1_10px,#6366f1_20px)]', shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]', icon: '🦦', title: 'RÁI CÁ ĐANG SOẠN ĐỀ...', titleGradient: 'from-blue-500 to-purple-600' };
  };
  const loadingStyle = getLoadingStyles();

  useEffect(() => {
    if (!loading) return;
    
    const messages = [
        "Đang tải dữ liệu...",
        "Phân tích cấu trúc PDF...",
        theme === 'swift' ? "Are you ready for it? 🐍" : theme === 'blackpink' ? "Blackpink in your area! 🖤💗" : theme === 'aespa' ? "I'm on the Next Level! 🦾" : theme === 'rosie' ? "APT. APT.! 🍷" : theme === 'pkl' ? "Giữa một vạn người... 🗡️" : theme === 'showgirl' ? "Đính đá lên trang phục... 💎" : "Rái cá đang gói quà kiến thức...",
        theme === 'swift' ? "Shake it off! 🎵" : theme === 'blackpink' ? "Hit you with that ddu-du ddu-du! 🔨" : theme === 'aespa' ? "Synk Dive into Kwangya... 🌌" : theme === 'rosie' ? "On The Ground... 🌹" : theme === 'pkl' ? "Chỉ có kiến thức ở lại... 🦢" : theme === 'showgirl' ? "Kiểm tra ánh đèn sân khấu... ✨" : "Ông già Noel đang duyệt đề...",
        theme === 'showgirl' ? "Rehearsing for the show... 💃" : "Cấu trúc hoá kiến thức...",
        "Đang soạn câu hỏi...",
        "Kiểm tra độ chính xác đáp án..."
    ];
    
    let msgIndex = 0;
    setLoadingText(messages[0]);

    const textInterval = setInterval(() => {
        msgIndex = (msgIndex + 1) % messages.length;
        setLoadingText(messages[msgIndex]);
    }, 2500);

    const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
            if (prev >= 95) return prev; 
            const increment = prev > 80 ? 0.2 : 1.5;
            return prev + increment;
        });
    }, 200);

    return () => {
        clearInterval(textInterval);
        clearInterval(progressInterval);
    };
  }, [loading, theme]);

  useEffect(() => {
    if (questions.length === 0 || showResult || loading) return;

    if (timeLeft <= 0) {
        if (timeLeft === 0 && !loading && questions.length > 0) {
            setShowResult(true);
        }
        return;
    }

    const timerInterval = setInterval(() => {
        setTimeLeft(prev => {
            if (prev <= 0) return 0;
            return prev - 1;
        });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [timeLeft, questions.length, showResult, loading]);

  const formatTime = (seconds: number) => {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return `${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  const handleGenerate = async () => {
    if (!topic.trim() || difficulties.length === 0) return;
    
    setLoading(true);
    setError(null);
    setLoadingProgress(5);
    setLoadingText(theme === 'showgirl' ? "Opening Curtain..." : "Khởi động máy...");
    setMentorData(null);
    setShowMentor(false);

    setTimeout(async () => {
        try {
            const files = {
                theory: theoryFiles.map(f => ({ content: f.data, isText: f.type === 'text' })),
                clinical: clinicalFiles.map(f => ({ content: f.data, isText: f.type === 'text' })),
                sample: sampleFiles.map(f => ({ content: f.data, isText: f.type === 'text' })),
            };
            
            const response = await generateMCQQuestions(topic, count, difficulties, files);
            
            const newQuestions: MCQQuestion[] = response.questions.map((q, idx) => ({
                ...q,
                id: `q-${Date.now()}-${idx}`
            }));
            
            setLoadingProgress(100);
            setLoadingText("Hoàn tất!");
            
            setTimeout(() => {
                setTimeLeft(timeLimit * 60);
                setQuestions(newQuestions);
                setUserAnswers({});
                setShowResult(false);
                setLoading(false);
                setIsResultMinimized(false);
            }, 500);

        } catch (err: any) {
            console.error(err);
            let errMsg = "Không thể tạo câu hỏi. Vui lòng thử lại.";
            const errString = err.message || err.toString();
            
            if (errString.includes("QUOTA_EXCEEDED") || errString.includes("MISSING_API_KEY")) {
                errMsg = "QUOTA_ERROR"; // Flag for UI
            } else if (errString.includes("Too Large")) {
                errMsg = "Dữ liệu quá lớn. Hãy thử giảm bớt số lượng file.";
            } else {
                errMsg = errString;
            }
            setError(errMsg);
            setLoading(false);
        }
    }, 200);
  };

  const handleAnswer = (questionId: string, option: string) => {
    if (showResult) return;
    setUserAnswers(prev => ({ ...prev, [questionId]: option }));
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach(q => {
      if (userAnswers[q.id] === q.correctAnswer) score++;
    });
    return score;
  };

  const handleConsultMentor = async () => {
      if (mentorData) {
          setShowMentor(true);
          mentorSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
          return;
      }

      setMentorLoading(true);
      setShowMentor(true);

      const stats: Record<string, { correct: number, total: number }> = {};
      
      Object.values(Difficulty).forEach(d => {
          stats[d] = { correct: 0, total: 0 };
      });

      questions.forEach(q => {
          const diff = q.difficulty || Difficulty.UNDERSTAND; 
          if (!stats[diff]) stats[diff] = { correct: 0, total: 0 };
          
          stats[diff].total++;
          if (userAnswers[q.id] === q.correctAnswer) {
              stats[diff].correct++;
          }
      });

      try {
          const response = await analyzeResultWithOtter(topic, stats);
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

  // ... Loading, Result, and Render Logic (mostly same, just checking Error UI) ...

  if (loading) {
     // ... (Same loading component)
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
                    <p className="text-xl font-bold text-slate-700 dark:text-slate-200 animate-fade-up" key={loadingText}>
                        {loadingText}
                    </p>
                </div>
            </div>
        </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto pb-20 px-4">
        <div className="flex items-center mb-6">
            <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                <ArrowRight className="w-6 h-6 rotate-180" />
            </button>
            <h2 className="text-xl font-medium text-slate-500 dark:text-slate-400">Quay lại</h2>
        </div>

        <div className="space-y-8">
            {/* HEADER ... */}
             <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${themeStyle.headerGradient} p-8 text-white shadow-xl animate-fade-up`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="relative z-10 flex items-center gap-6">
                    <div className={`w-20 h-20 ${themeStyle.headerIconBg} backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner`}>
                        <BookOpen className="w-10 h-10 text-white drop-shadow-lg" />
                    </div>
                    <div>
                        <h1 className={`text-3xl md:text-4xl font-bold mb-2 ${themeStyle.headerGlow}`}>{theme === 'showgirl' ? "Kịch Bản Sân Khấu (MCQ)" : theme === 'swift' ? "The Setlist (MCQ)" : "Tạo Đề Trắc Nghiệm"}</h1>
                        <p className={`text-lg ${themeStyle.headerText}`}>{theme === 'showgirl' ? "AI sẽ thiết kế các bước nhảy kiến thức cho màn trình diễn của bạn." : theme === 'swift' ? "Chọn kỷ nguyên kiến thức và trả lời các câu hỏi hit." : "AI sẽ đọc tài liệu và tạo bộ câu hỏi theo yêu cầu của bạn."}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-lg border border-slate-200 dark:border-slate-700 animate-fade-up" style={{ animationDelay: '100ms' }}>
                {/* ... Inputs (Topic, Count, Time, Difficulty) ... */}
                <div className="grid md:grid-cols-2 gap-8 mb-8">
                    <div className="col-span-2">
                         <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">
                            {theme === 'showgirl' ? (
                                <span className="flex items-center gap-2 text-orange-500">
                                    <Sparkles className="w-4 h-4" /> Kịch bản chính (Chủ đề)
                                </span>
                            ) : theme === 'swift' ? "Era / Album Chủ đề" : "Chủ đề ôn tập"}
                         </label>
                         <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder={theme === 'showgirl' ? "VD: Màn trình diễn hệ tuần hoàn..." : "VD: Giải phẫu tim, Hệ thần kinh trung ương..."}
                            className={`w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 outline-none transition-all text-lg font-medium text-slate-900 dark:text-white ${themeStyle.inputFocus}`}
                         />
                    </div>
                    {/* Sliders */}
                     <div>
                         <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex justify-between">
                            <span className="uppercase tracking-wide">Số lượng câu hỏi</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${themeStyle.rangeColor}`}>{count} câu</span>
                         </label>
                         <input type="range" min="5" max="50" step="5" value={count} onChange={(e) => setCount(Number(e.target.value))} className="liquid-slider w-full" style={{ '--range-progress': `${((count - 5) / 45) * 100}%` } as React.CSSProperties} />
                    </div>
                     <div>
                         <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex justify-between">
                            <span className="uppercase tracking-wide">Thời gian làm bài</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${themeStyle.rangeColor}`}>{timeLimit} phút</span>
                         </label>
                         <input type="range" min="5" max="60" step="5" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} className="liquid-slider w-full" style={{ '--range-progress': `${((timeLimit - 5) / 55) * 100}%` } as React.CSSProperties} />
                    </div>
                </div>
                {/* Diff Buttons */}
                <div className="mb-8">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 uppercase tracking-wide">Mức độ câu hỏi (Chọn nhiều)</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.values(Difficulty).map((diff) => (
                            <button
                                key={diff}
                                onClick={() => toggleDifficulty(diff)}
                                className={`py-3 px-4 rounded-xl border-2 text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2
                                ${difficulties.includes(diff) ? themeStyle.activeDiff : `bg-slate-50 dark:bg-slate-800 text-slate-500 border-slate-200`}`}
                            >
                                {difficulties.includes(diff) && <Check className="w-4 h-4" />}
                                {diff}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* File Categories */}
            <div className="grid md:grid-cols-3 gap-6 animate-fade-up" style={{ animationDelay: '200ms' }}>
                <FileCategory 
                    icon={<BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />}
                    title="Lý thuyết" desc="Sách, Slide (PDF)"
                    bgGradient="bg-gradient-to-b from-blue-50 to-white dark:from-blue-900/10 dark:to-slate-900"
                    iconColor="text-blue-600" glowClass="hover:shadow-[0_0_20px_rgba(37,99,235,0.15)] hover:border-blue-300 dark:hover:border-blue-700"
                    files={theoryFiles} onRemove={(idx) => removeFile(idx, setTheoryFiles)} onAdd={() => theoryInputRef.current?.click()} themeColorClass={themeStyle.iconColor}
                />
                <input type="file" multiple accept=".pdf" ref={theoryInputRef} className="hidden" onChange={(e) => handleFileChange(e, setTheoryFiles, theoryFiles)} />
                {/* ... Other Categories ... */}
                 <FileCategory 
                    icon={<Activity className="w-6 h-6 text-red-600 dark:text-red-400" />}
                    title="Lâm sàng" desc="Ca bệnh (PDF)"
                    bgGradient="bg-gradient-to-b from-red-50 to-white dark:from-red-900/10 dark:to-slate-900"
                    iconColor="text-red-600" glowClass="hover:shadow-[0_0_20px_rgba(220,38,38,0.15)] hover:border-red-300 dark:hover:border-red-700"
                    files={clinicalFiles} onRemove={(idx) => removeFile(idx, setClinicalFiles)} onAdd={() => clinicalInputRef.current?.click()} themeColorClass={themeStyle.iconColor}
                />
                <input type="file" multiple accept=".pdf" ref={clinicalInputRef} className="hidden" onChange={(e) => handleFileChange(e, setClinicalFiles, clinicalFiles)} />
                 <FileCategory 
                    icon={<FileCheck className="w-6 h-6 text-amber-600 dark:text-amber-400" />}
                    title="Đề thi mẫu" desc="Ngân hàng cũ (PDF)"
                    bgGradient="bg-gradient-to-b from-amber-50 to-white dark:from-amber-900/10 dark:to-slate-900"
                    iconColor="text-amber-600" glowClass="hover:shadow-[0_0_20px_rgba(217,119,6,0.15)] hover:border-amber-300 dark:hover:border-amber-700"
                    files={sampleFiles} onRemove={(idx) => removeFile(idx, setSampleFiles)} onAdd={() => sampleInputRef.current?.click()} themeColorClass={themeStyle.iconColor}
                />
                <input type="file" multiple accept=".pdf" ref={sampleInputRef} className="hidden" onChange={(e) => handleFileChange(e, setSampleFiles, sampleFiles)} />
            </div>
            
            {isProcessingFile && (
                <div className="flex justify-center items-center gap-2 text-blue-600 font-medium animate-pulse">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang đọc nội dung file...
                </div>
            )}

            {/* ERROR UI WITH KEY CHANGE SUGGESTION */}
            {error && (
                <div className={`p-4 rounded-xl flex flex-col gap-2 animate-pulse border ${error === "QUOTA_ERROR" ? "bg-red-100 dark:bg-red-900/30 border-red-500 text-red-800 dark:text-red-300" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-600"}`}>
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <span className="text-sm font-medium">
                            {error === "QUOTA_ERROR" 
                                ? "Hệ thống đang quá tải hoặc chưa có API Key." 
                                : error}
                        </span>
                    </div>
                    
                    {error === "QUOTA_ERROR" && (
                         <div className="ml-8">
                             <p className="text-xs mb-2 opacity-90">Vui lòng cập nhật API Key cá nhân để tiếp tục sử dụng không giới hạn.</p>
                             <button 
                                className="px-3 py-1.5 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 transition-colors flex items-center gap-1"
                                onClick={() => {
                                    // Hint user to go to settings since we can't easily open modal from here without props
                                    alert("Vui lòng kéo lên đầu trang, nhấn vào Avatar > 'Cấu hình API Key' để nhập khóa Gemini của bạn.");
                                }}
                             >
                                 <Key className="w-3 h-3" /> Hướng dẫn nhập Key
                             </button>
                         </div>
                    )}
                </div>
            )}

            <button
                onClick={handleGenerate}
                disabled={!topic.trim() || difficulties.length === 0 || isProcessingFile}
                className={`w-full bg-gradient-to-r ${themeStyle.primaryBtn} text-white font-bold py-5 rounded-2xl shadow-xl transition-all flex items-center justify-center space-x-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 animate-fade-up`}
                style={{ animationDelay: '300ms' }}
            >
                <Sparkles className="w-6 h-6" />
                <span>{theme === 'showgirl' ? "Tạo đề thi ngay" : "Tạo đề thi ngay"}</span>
            </button>
        </div>
      </div>
    );
  }

  // ... Result View ...
  if (showResult) {
    // ... (No changes needed in result view, error logic is handled in creation view)
    const score = calculateScore();
    const percentage = Math.round((score / questions.length) * 100);

    return (
      <div className="max-w-5xl mx-auto pb-20 px-4">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-700 mb-8 animate-fade-up">
             <div className="text-center">
                 <div className="inline-block p-4 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 mb-4 shadow-sm">
                     <Trophy className="w-12 h-12" />
                 </div>
                 <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2">Kết Quả Bài Thi</h2>
                 <p className="text-slate-500 dark:text-slate-400 mb-8">Chủ đề: {topic}</p>

                 <div className="flex justify-center items-end gap-2 mb-8">
                     <span className="text-6xl font-black text-blue-600 dark:text-blue-400">{score}</span>
                     <span className="text-2xl font-bold text-slate-400 mb-2">/ {questions.length}</span>
                 </div>

                 {/* Stats Grid */}
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Độ chính xác</div>
                        <div className={`text-xl font-black ${percentage >= 80 ? 'text-green-500' : percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                            {percentage}%
                        </div>
                    </div>
                    {/* ... Other stats ... */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Thời gian</div>
                        <div className="text-xl font-black text-slate-800 dark:text-slate-200">{formatTime((timeLimit * 60) - timeLeft)}</div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Đúng</div>
                        <div className="text-xl font-black text-green-500">{score}</div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                        <div className="text-xs text-slate-500 uppercase font-bold mb-1">Sai</div>
                        <div className="text-xl font-black text-red-500">{questions.length - score}</div>
                    </div>
                 </div>

                 <div className="flex flex-col md:flex-row gap-4 justify-center">
                     <button 
                        onClick={() => {
                            setQuestions([]);
                            setTopic('');
                            setTheoryFiles([]);
                            setClinicalFiles([]);
                            setSampleFiles([]);
                        }}
                        className="px-8 py-3 rounded-xl font-bold border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                     >
                         <RefreshCw className="w-5 h-5" /> Làm đề mới
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
                 
                 {/* Error UI if Mentor fails */}
                 {error === "QUOTA_ERROR" && (
                     <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg border border-red-200 text-sm">
                         Không thể kết nối Rái Cá do hết hạn mức API. Vui lòng cập nhật Key trong Cài đặt.
                     </div>
                 )}
             </div>
        </div>
        
        {/* UPDATED MENTOR SECTION */}
        {showMentor && (
             <div ref={mentorSectionRef} className="mb-12 animate-in slide-in-from-bottom-10 duration-700">
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
                        
                        {/* Header Section */}
                        <div className="flex flex-col md:flex-row gap-8 items-start mb-8 border-b border-amber-200/50 dark:border-slate-700 pb-8">
                            <div className="flex-shrink-0 flex flex-col items-center gap-2">
                                <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg border-4 border-amber-100 dark:border-slate-600">
                                    <span className="text-5xl animate-[wiggle_3s_infinite]">🦦</span>
                                </div>
                                <div className="bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider shadow-sm">
                                    Senior Professor
                                </div>
                            </div>
                            <div className="flex-1 space-y-4">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Bệnh án học tập</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-amber-500" /> 
                                        Chủ đề: <span className="text-slate-800 dark:text-slate-200 font-bold">{topic}</span>
                                    </p>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border-l-4 border-amber-400 shadow-sm italic text-slate-700 dark:text-slate-300 leading-relaxed relative">
                                    <span className="absolute top-2 left-2 text-4xl text-amber-200 dark:text-slate-700 font-serif opacity-50">"</span>
                                    {mentorData.analysis}
                                    <span className="absolute bottom-2 right-2 text-4xl text-amber-200 dark:text-slate-700 font-serif opacity-50">"</span>
                                </div>
                            </div>
                        </div>

                        {/* 3-Column Layout for Deep Analysis */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                             {/* Strengths */}
                            <div className="bg-green-50/80 dark:bg-green-900/10 border border-green-200 dark:border-green-800/50 rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-green-200 dark:border-green-800/50">
                                    <ThumbsUp className="w-5 h-5 text-green-600 dark:text-green-400" />
                                    <h4 className="font-bold text-green-800 dark:text-green-300 uppercase text-xs tracking-wider">Điểm mạnh</h4>
                                </div>
                                <ul className="space-y-2">
                                    {mentorData.strengths?.map((s, i) => (
                                        <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                                            <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                            <span>{s}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Weaknesses */}
                            <div className="bg-red-50/80 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-red-200 dark:border-red-800/50">
                                    <Stethoscope className="w-5 h-5 text-red-600 dark:text-red-400" />
                                    <h4 className="font-bold text-red-800 dark:text-red-300 uppercase text-xs tracking-wider">Cần cải thiện</h4>
                                </div>
                                <ul className="space-y-2">
                                    {mentorData.weaknesses?.map((w, i) => (
                                        <li key={i} className="text-sm text-slate-700 dark:text-slate-300 flex items-start gap-2">
                                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                                            <span>{w}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                             {/* Summary Score or Quick Tip */}
                             <div className="bg-blue-50/80 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-5 flex flex-col justify-center items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3 text-blue-600 dark:text-blue-400">
                                    <BrainCircuit className="w-6 h-6" />
                                </div>
                                <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm mb-1">Tư duy lâm sàng</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Hãy luôn đặt câu hỏi "Tại sao?" khi học giải phẫu để nhớ lâu hơn.
                                </p>
                             </div>
                        </div>

                        {/* ROADMAP SECTION */}
                        <div className="bg-slate-900 text-white rounded-2xl p-6 md:p-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-8">
                                    <Milestone className="w-8 h-8 text-amber-400" />
                                    <h3 className="text-xl font-bold text-white">Lộ trình điều trị kiến thức (3 Bước)</h3>
                                </div>

                                <div className="grid md:grid-cols-3 gap-6 relative">
                                    {/* Connecting Line (Desktop) */}
                                    <div className="hidden md:block absolute top-6 left-0 w-full h-0.5 bg-slate-700 -z-0"></div>

                                    {mentorData.roadmap?.map((step, idx) => (
                                        <div key={idx} className="relative z-10 group">
                                            <div className="w-12 h-12 rounded-full bg-slate-800 border-4 border-slate-700 group-hover:border-amber-500 transition-colors flex items-center justify-center font-bold text-lg mb-4 shadow-lg mx-auto md:mx-0">
                                                {idx + 1}
                                            </div>
                                            <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5 hover:bg-slate-800 transition-colors">
                                                <h4 className="font-bold text-amber-400 mb-2 text-lg">{step.step}</h4>
                                                <p className="text-sm text-slate-300 leading-relaxed">
                                                    {step.details}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400 opacity-70">
                                    <Footprints className="w-4 h-4" />
                                    <span>Theo sát lộ trình này để đạt điểm A+</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : null}
             </div>
        )}
        
        <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5" /> Chi tiết đáp án
                </h3>
                <button onClick={() => setIsResultMinimized(!isResultMinimized)} className="text-slate-500 hover:text-blue-500 text-sm font-medium">
                    {isResultMinimized ? "Hiện tất cả" : "Thu gọn"}
                </button>
             </div>

             {!isResultMinimized && questions.map((q, idx) => {
                 const userAns = userAnswers[q.id];
                 const isCorrect = userAns === q.correctAnswer;
                 return (
                     <div key={q.id} className={`bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border-l-4 ${isCorrect ? 'border-l-green-500 border-slate-100 dark:border-slate-800' : 'border-l-red-500 border-red-100 dark:border-red-900/30'}`}>
                         {/* ... Question Content ... */}
                         <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-2">Câu {idx+1}: {q.question}</h4>
                         <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Đáp án đúng: <span className="font-bold text-green-600">{q.correctAnswer}</span></div>
                         <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800 p-2 rounded">{q.explanation}</p>
                     </div>
                 );
             })}
        </div>
      </div>
    );
  }

  // Question View
  const currentQIdx = questions.findIndex(q => !userAnswers[q.id]);
  const activeQIdx = currentQIdx === -1 ? questions.length - 1 : currentQIdx;
  const activeQ = questions[activeQIdx];

  return (
    <div className="max-w-3xl mx-auto pb-20 px-4">
        {/* Timer & Progress ... */}
        <div className="sticky top-20 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
            <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium">
                    <Clock className="w-4 h-4" />
                    <span className={`font-mono text-lg ${timeLeft < 60 ? 'text-red-500 animate-pulse font-bold' : ''}`}>{formatTime(timeLeft)}</span>
                </div>
                <div className="text-sm font-bold text-slate-700 dark:text-slate-300">Câu {activeQIdx + 1} <span className="text-slate-400">/ {questions.length}</span></div>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-300 ease-out" style={{ width: `${((activeQIdx) / questions.length) * 100}%` }}></div>
            </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700 min-h-[400px] flex flex-col animate-in slide-in-from-right-8 duration-300 key={activeQ.id}">
             <div className="mb-6">
                 <span className="inline-block px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-3">{activeQ.difficulty || "Kiến thức chung"}</span>
                 <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white leading-relaxed">{activeQ.question}</h3>
             </div>

             <div className="space-y-3 flex-1">
                 {activeQ.options.map((opt, idx) => (
                     <button
                        key={idx}
                        onClick={() => handleAnswer(activeQ.id, opt)}
                        className={`w-full p-4 rounded-xl text-left border-2 transition-all duration-200 flex items-center gap-3 group
                        ${userAnswers[activeQ.id] === opt ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-md' : 'border-slate-100 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                     >
                         <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${userAnswers[activeQ.id] === opt ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 text-transparent group-hover:border-blue-400'}`}>
                             <div className="w-2 h-2 bg-white rounded-full"></div>
                         </div>
                         <span className="text-base font-medium">{opt}</span>
                     </button>
                 ))}
             </div>
             
             {activeQIdx === questions.length - 1 && (
                 <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6">
                     <button onClick={() => setShowResult(true)} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                         <CheckCircle className="w-5 h-5" /> Nộp bài
                     </button>
                 </div>
             )}
        </div>
    </div>
  );
};
