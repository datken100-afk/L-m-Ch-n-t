
import React, { useState, useRef, useEffect } from 'react';
import { generateMCQQuestions, analyzeResultWithOtter } from '../services/geminiService';
import { Difficulty, MCQQuestion, MentorResponse } from '../types';
import { CheckCircle2, CheckCircle, XCircle, BrainCircuit, RefreshCw, ArrowRight, AlertCircle, BookOpen, FileText, Activity, Clock, FileCheck, UploadCloud, Trash, Plus, File as FileIcon, X, Check, Sparkles, Loader2, ArrowUpCircle, Timer, AlertTriangle, ChevronDown, Zap, Trophy, ThumbsUp, ShieldAlert, Snowflake, Minimize2, Maximize2 } from 'lucide-react';

// Declare pdfjsLib globally
declare const pdfjsLib: any;

interface UploadedFile {
    name: string;
    data: string; // Stores extracted Text for PDFs, or Base64 for images
    type: 'text' | 'base64'; 
}

// INCREASED LIMIT because we now extract text instead of loading full PDF into RAM
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
const MAX_FILES_PER_CATEGORY = 3;

// Helper to format text (replace arrows with professional unicode characters)
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
}

const FileCategory: React.FC<FileCategoryProps> = ({ 
    icon, title, desc, bgGradient, iconColor, glowClass, files, onRemove, onAdd 
}) => {
    return (
        <div className={`group relative rounded-2xl border border-slate-200 dark:border-slate-700 p-4 transition-all duration-300 ${bgGradient} ${glowClass}`}>
            {/* Header */}
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
                    className="w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-medical-50 dark:hover:bg-medical-900/30 hover:border-medical-200 dark:hover:border-medical-500/50 text-slate-400 hover:text-medical-600 transition-all shadow-sm active:scale-90"
                    title="Thêm tài liệu"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {/* Files List */}
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
                <div className="relative z-10 mt-2 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-3 text-center hover:border-medical-400 dark:hover:border-medical-600 transition-colors cursor-pointer bg-white/30 dark:bg-black/10" onClick={onAdd}>
                    <p className="text-xs text-slate-400 font-medium">Chưa có file nào. <br/> Nhấn + để thêm.</p>
                </div>
            )}
        </div>
    );
};

// --- NEW COMPONENT: SKILL SCANNER BAR ---
const SkillBar: React.FC<{ label: string; correct: number; total: number; icon: React.ReactNode; color: string }> = ({ label, correct, total, icon, color }) => {
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    // Determine color based on percentage
    let barColor = "bg-red-500";
    let statusText = "Cần ôn gấp";
    if (percentage >= 80) { barColor = "bg-green-500"; statusText = "Thượng thừa"; }
    else if (percentage >= 50) { barColor = "bg-yellow-400"; statusText = "Khá ổn"; }

    return (
        <div className="mb-4">
            <div className="flex justify-between items-end mb-1">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300">
                    {icon}
                    <span>{label}</span>
                </div>
                <div className="text-xs font-medium">
                    <span className={`${percentage >= 80 ? 'text-green-600 dark:text-green-400' : percentage >= 50 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'} mr-2`}>
                        {statusText}
                    </span>
                    <span className="text-slate-400">({correct}/{total})</span>
                </div>
            </div>
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                <div 
                    className={`h-full ${barColor} transition-all duration-1000 ease-out rounded-full relative`}
                    style={{ width: `${percentage}%` }}
                >
                    <div className="absolute inset-0 bg-white/30 w-full h-full animate-[shimmer_2s_infinite]"></div>
                </div>
            </div>
        </div>
    );
};

export const MCQMode: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  // Configuration State
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10); // Default 10
  const [timeLimit, setTimeLimit] = useState(15); // Default 15 mins
  const [difficulties, setDifficulties] = useState<Difficulty[]>([Difficulty.UNDERSTAND]);
  
  // File States (Arrays of files)
  const [theoryFiles, setTheoryFiles] = useState<UploadedFile[]>([]);
  const [clinicalFiles, setClinicalFiles] = useState<UploadedFile[]>([]);
  const [sampleFiles, setSampleFiles] = useState<UploadedFile[]>([]);
  
  // Processing State
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Quiz State
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // UI State
  const [isResultMinimized, setIsResultMinimized] = useState(false);
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(0); // In seconds

  // Mentor "Rái Cá Nhỏ" State
  const [showMentor, setShowMentor] = useState(false);
  const [mentorLoading, setMentorLoading] = useState(false);
  const [mentorData, setMentorData] = useState<MentorResponse | null>(null);
  const [mentorStats, setMentorStats] = useState<Record<string, { correct: number, total: number }> | null>(null);

  // Refs for hidden file inputs
  const theoryInputRef = useRef<HTMLInputElement>(null);
  const clinicalInputRef = useRef<HTMLInputElement>(null);
  const sampleInputRef = useRef<HTMLInputElement>(null);
  const mentorSectionRef = useRef<HTMLDivElement>(null);

  const extractTextFromPDF = async (file: File): Promise<string> => {
      const arrayBuffer = await file.arrayBuffer();
      // Using global pdfjsLib from CDN
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      
      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(" ");
          fullText += `\n--- Page ${i} ---\n${pageText}`;
      }
      
      return fullText;
  };

  // Helper to handle multi-file upload with TEXT EXTRACTION
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

      setIsProcessingFile(true); // Show spinner

      for (const file of fileArray) {
          if (file.size > MAX_FILE_SIZE) {
              setError(`File ${file.name} quá lớn (>200MB).`);
              continue;
          }

          try {
            if (file.type === 'application/pdf') {
                // EXTRACT TEXT to avoid Out of Memory
                const text = await extractTextFromPDF(file);
                if (!text || text.trim().length < 100) {
                   // Warning if text layer is missing (scanned PDF)
                   setError(`File ${file.name} có vẻ là bản scan (ảnh). AI chỉ đọc được văn bản có thể copy. Vui lòng dùng file có Text Layer.`);
                }
                setFiles(prev => [...prev, { name: file.name, data: text, type: 'text' }]);
            } else {
                // Handle other types normally if needed (though we restrict to PDF mostly)
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
    // Reset input value
    if (e.target) e.target.value = '';
  };

  const removeFile = (index: number, setFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const toggleDifficulty = (diff: Difficulty) => {
    setDifficulties(prev => {
      if (prev.includes(diff)) {
        // Allow deselecting even if it's the last one (we disable submit button instead)
        return prev.filter(d => d !== diff);
      } else {
        return [...prev, diff];
      }
    });
  };

  // Use Effect for Loading Animation text
  useEffect(() => {
    if (!loading) return;
    
    const messages = [
        "Đang tải dữ liệu...",
        "Phân tích cấu trúc PDF...",
        "Rái cá đang gói quà kiến thức...",
        "Ông già Noel đang duyệt đề...",
        "Rái cá nhỏ đang suy nghĩ...",
        "Cấu trúc hoá kiến thức...",
        "Đang soạn câu hỏi...",
        "Kiểm tra độ chính xác đáp án..."
    ];
    
    let msgIndex = 0;
    setLoadingText(messages[0]);

    const textInterval = setInterval(() => {
        msgIndex = (msgIndex + 1) % messages.length;
        setLoadingText(messages[msgIndex]);
    }, 2500);

    // Simulate progress
    const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
            if (prev >= 95) return prev; // Hold at 95% until finish
            // Slow down as it gets higher
            const increment = prev > 80 ? 0.2 : 1.5;
            return prev + increment;
        });
    }, 200);

    return () => {
        clearInterval(textInterval);
        clearInterval(progressInterval);
    };
  }, [loading]);

  // Timer Effect
  useEffect(() => {
    if (questions.length === 0 || showResult || loading) return;

    // Auto submit if time runs out
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
    
    // 1. Set Loading State immediately
    setLoading(true);
    setError(null);
    setLoadingProgress(5);
    setLoadingText("Gọi Rái cá nhỏ...");
    setMentorData(null);
    setMentorStats(null);
    setShowMentor(false);

    // 2. Defer the heavy processing to the next event loop tick
    setTimeout(async () => {
        try {
            const files = {
                theory: theoryFiles.map(f => ({ content: f.data, isText: f.type === 'text' })),
                clinical: clinicalFiles.map(f => ({ content: f.data, isText: f.type === 'text' })),
                sample: sampleFiles.map(f => ({ content: f.data, isText: f.type === 'text' })),
            };
            
            // API Call
            const response = await generateMCQQuestions(topic, count, difficulties, files);
            
            // Success
            const newQuestions: MCQQuestion[] = response.questions.map((q, idx) => ({
                ...q,
                id: `q-${Date.now()}-${idx}`
            }));
            
            // Jump to 100%
            setLoadingProgress(100);
            setLoadingText("Hoàn tất!");
            
            // Short delay to show 100% before switching view
            setTimeout(() => {
                // Initialize Timer here
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
            if (err.message && err.message.includes("Too Large")) {
                errMsg = "Dữ liệu quá lớn vượt quá giới hạn của Rái cá. Hãy thử giảm bớt số lượng file.";
            } else if (err.message) {
                errMsg = err.message;
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

  // Mentor Logic
  const handleConsultMentor = async () => {
      if (mentorData) {
          setShowMentor(true);
          mentorSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
          return;
      }

      setMentorLoading(true);
      setShowMentor(true);

      // 1. Detailed Stats Calculation per Difficulty
      const stats: Record<string, { correct: number, total: number }> = {};
      
      // Initialize all difficulties to ensure they appear even if 0 (Fix for missing 'Ghi nhớ')
      Object.values(Difficulty).forEach(d => {
          stats[d] = { correct: 0, total: 0 };
      });

      // Initialize all potential difficulties that are present in the quiz