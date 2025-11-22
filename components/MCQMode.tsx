
import React, { useState, useRef, useEffect } from 'react';
import { generateMCQQuestions, analyzeResultWithOtter } from '../services/geminiService';
import { Difficulty, MCQQuestion, MentorResponse, UserProfile, ExamHistory } from '../types';
import { CheckCircle2, CheckCircle, XCircle, BrainCircuit, RefreshCw, ArrowRight, AlertCircle, BookOpen, Activity, Clock, FileCheck, Trash, Plus, File as FileIcon, Check, Sparkles, Loader2, Trophy, ThumbsUp, ShieldAlert, FileText, Key, Stethoscope, Milestone, Footprints, Scale, ShieldCheck } from 'lucide-react';
import { ThemeType } from '../App';
import { db } from '../firebaseConfig';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

// Declare pdfjsLib globally
declare const pdfjsLib: any;

interface UploadedFile {
    name: string;
    data: string; 
    type: 'text' | 'base64'; 
}

const MAX_FILE_SIZE = 200 * 1024 * 1024; 
const MAX_FILES_PER_CATEGORY = 3;
const COPYRIGHT_KEY_PREFIX = 'otter_copyright_agreed_';

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
  onTriggerUpload: () => void; // Changed from onAdd to onTriggerUpload
  themeColorClass: string; 
}

const FileCategory: React.FC<FileCategoryProps> = ({ 
    icon, title, desc, bgGradient, iconColor, glowClass, files, onRemove, onTriggerUpload, themeColorClass
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
                    onClick={onTriggerUpload}
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
                <div className={`relative z-10 mt-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 text-center transition-colors cursor-pointer bg-white/30 dark:bg-black/10 hover:border-slate-400 dark:hover:border-slate-600`} onClick={onTriggerUpload}>
                    <p className="text-xs text-slate-400 font-medium">Chưa có file nào. <br/> Nhấn + để thêm.</p>
                </div>
            )}
        </div>
    );
};

interface MCQModeProps {
    onBack: () => void;
    theme: ThemeType;
    user: UserProfile;
}

export const MCQMode: React.FC<MCQModeProps> = ({ onBack, theme, user }) => {
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

  // COPYRIGHT STATE
  const [showCopyrightModal, setShowCopyrightModal] = useState(false);
  const [pendingInputRef, setPendingInputRef] = useState<React.RefObject<HTMLInputElement> | null>(null);

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

  // --- COPYRIGHT HANDLERS ---
  const handleTriggerUpload = (targetInputRef: React.RefObject<HTMLInputElement>) => {
      const key = `${COPYRIGHT_KEY_PREFIX}${user.uid}`;
      const hasAgreed = localStorage.getItem(key);

      if (hasAgreed) {
          targetInputRef.current?.click();
      } else {
          setPendingInputRef(targetInputRef);
          setShowCopyrightModal(true);
      }
  };

  const handleConfirmCopyright = () => {
      if (user.uid) {
        localStorage.setItem(`${COPYRIGHT_KEY_PREFIX}${user.uid}`, 'true');
      }
      setShowCopyrightModal(false);
      
      // Trigger the pending input click
      if (pendingInputRef && pendingInputRef.current) {
          pendingInputRef.current.click();
      }
      setPendingInputRef(null);
  };

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

  // Timer and Auto-submit
  useEffect(() => {
    if (questions.length === 0 || showResult || loading) return;

    if (timeLeft <= 0) {
        if (timeLeft === 0 && !loading && questions.length > 0) {
            handleFinishExam();
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

  const handleFinishExam = async () => {
      setShowResult(true);
      
      // Save History to Firebase
      if (user.uid) {
        try {
            const score = calculateScore();
            const historyData = {
                type: 'MCQ',
                topic: topic,
                score: score,
                totalQuestions: questions.length,
                questions: questions,
                userAnswers: userAnswers,
                timeLimit: timeLimit,
                timestamp: Date.now(),
                createdAt: serverTimestamp()
            };
            
            await addDoc(collection(db, 'users', user.uid, 'exam_history'), historyData);
        } catch (e) {
            console.error("Error saving history:", e);
        }
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
          const analyzeResult = await analyzeResultWithOtter(topic, stats);
          setMentorData(analyzeResult);
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
      <div className="max-w-4xl mx-auto pb-20 px-4 relative">
        {/* COPYRIGHT MODAL */}
        {showCopyrightModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in p-4">
                <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-8 shadow-2xl border border-slate-200 dark:border-slate-700 animate-in zoom-in-95">
                    <div className="flex flex-col items-center text-center mb-6">
                        <div className={`w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4 ${theme === 'showgirl' ? 'text-orange-500' : 'text-blue-600'}`}>
                            <Scale className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                            Tuyên bố bản quyền & Trách nhiệm
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Vui lòng xác nhận trước khi tải lên tài liệu.
                        </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-300 leading-relaxed text-justify mb-8">
                        <p>
                            Bằng việc tải lên tài liệu, người dùng cam kết sở hữu quyền sử dụng hợp pháp và chịu hoàn toàn trách nhiệm về nội dung. 
                        </p>
                        <p className="mt-2">
                            Ứng dụng <span className="font-bold">AnatomyOtter</span> không lưu trữ vĩnh viễn, không chia sẻ dữ liệu và miễn trừ mọi trách nhiệm liên quan đến tranh chấp bản quyền. Tài liệu chỉ được xử lý tạm thời để tạo câu hỏi và tự động xóa sau khi hoàn tất.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button 
                            onClick={handleConfirmCopyright}
                            className={`w-full py-3 rounded-xl text-white font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2
                                ${theme === 'showgirl' ? 'bg-gradient-to-r from-teal-500 to-orange-500' : 
                                  theme === 'xmas' ? 'bg-gradient-to-r from-red-600 to-green-600' :
                                  'bg-blue-600 hover:bg-blue-700'}
                            `}
                        >
                            <ShieldCheck className="w-5 h-5" /> Tôi đồng ý và chịu trách nhiệm
                        </button>
                        <button 
                            onClick={() => {
                                setShowCopyrightModal(false);
                                setPendingInputRef(null);
                            }}
                            className="w-full py-3 rounded-xl text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            Hủy bỏ
                        </button>
                    </div>
                </div>
            </div>
        )}

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
                         <input type="range" min="5" max="60" step="5" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target