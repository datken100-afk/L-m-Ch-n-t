
import React, { useState, useRef, useEffect } from 'react';
import { generateMCQQuestions, analyzeResultWithOtter } from '../services/geminiService';
import { Difficulty, MCQQuestion, MentorResponse, UserProfile, ExamHistory } from '../types';
import { CheckCircle2, CheckCircle, XCircle, BrainCircuit, RefreshCw, ArrowRight, AlertCircle, BookOpen, Activity, Clock, FileCheck, Trash, Plus, File as FileIcon, Check, Sparkles, Loader2, Trophy, ThumbsUp, ShieldAlert, FileText, Key, Stethoscope, Milestone, Footprints, Scale, ShieldCheck, Lightbulb, Ticket, Settings, AlertTriangle, Feather, Flame, List, UploadCloud, Target, TrendingUp } from 'lucide-react';
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

const getDifficultyColor = (diff?: string) => {
    switch (diff) {
        case Difficulty.REMEMBER: return 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
        case Difficulty.UNDERSTAND: return 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800';
        case Difficulty.APPLY: return 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800';
        case Difficulty.CLINICAL: return 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400 border-rose-200 dark:border-rose-800';
        default: return 'bg-slate-50 text-slate-500 border-slate-200';
    }
};

interface FileCategoryProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  bgGradient: string;
  iconColor: string;
  glowClass: string;
  borderColor: string; // Added for drag state
  files: UploadedFile[];
  onRemove: (index: number) => void;
  onFileSelect: (file: File) => Promise<void>;
  themeColorClass: string;
  isProcessing: boolean;
}

const FileCategory: React.FC<FileCategoryProps> = ({ 
    icon, title, desc, bgGradient, iconColor, glowClass, borderColor, files, onRemove, onFileSelect, themeColorClass, isProcessing
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) await onFileSelect(file);
    };

    const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) await onFileSelect(file);
        // Reset input to allow re-uploading same file if needed
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
        <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`group relative rounded-2xl border transition-all duration-300 p-4 ${bgGradient} ${glowClass}
                ${isDragging ? `border-2 ${borderColor} scale-[1.02] shadow-lg` : 'border-slate-200 dark:border-slate-700'}
            `}
        >
            <input 
                type="file" 
                ref={inputRef} 
                className="hidden" 
                accept=".pdf,.txt" 
                onChange={handleChange} 
            />

            {/* Drag Overlay */}
            {isDragging && (
                <div className="absolute inset-0 bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm z-20 rounded-2xl flex flex-col items-center justify-center text-slate-800 dark:text-white animate-in fade-in duration-200">
                    <UploadCloud className={`w-10 h-10 mb-2 ${themeColorClass} animate-bounce`} />
                    <p className="font-bold text-sm">Thả file vào đây</p>
                </div>
            )}

            <div className="flex items-center gap-4 mb-3 relative z-10">
                <div className={`w-12 h-12 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center ${iconColor} ring-1 ring-black/5 dark:ring-white/5`}>
                    {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : icon}
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm uppercase tracking-wide">{title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{desc}</p>
                </div>
                <button 
                    onClick={() => inputRef.current?.click()}
                    disabled={isProcessing}
                    className={`w-8 h-8 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 flex items-center justify-center hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm active:scale-90 text-slate-400 ${themeColorClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                    title="Thêm tài liệu"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-2 relative z-10 min-h-[20px]">
                {files.map((file, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 p-2 rounded-lg border border-slate-100 dark:border-slate-700/50 text-xs animate-in fade-in slide-in-from-left-2 duration-300">
                        <FileIcon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span className="flex-1 truncate font-medium text-slate-700 dark:text-slate-300" title={file.name}>{file.name}</span>
                        <button onClick={() => onRemove(idx)} className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <Trash className="w-3 h-3" />
                        </button>
                    </div>
                ))}
                {files.length === 0 && !isProcessing && (
                    <div 
                        className="mt-2 border-2 border-dashed border-slate-300/50 dark:border-slate-700/50 rounded-xl p-3 text-center transition-colors cursor-pointer hover:border-slate-400 dark:hover:border-slate-500 hover:bg-white/20" 
                        onClick={() => inputRef.current?.click()}
                    >
                        <p className="text-[10px] text-slate-400 font-medium">Kéo thả hoặc nhấn +</p>
                    </div>
                )}
            </div>
        </div>
    );
};

interface MCQModeProps {
    onBack: () => void;
    theme: ThemeType;
    user: UserProfile;
    onExamComplete?: () => void;
}

enum MCQStep {
    SETUP,
    GENERATING,
    EXAM,
    SUMMARY
}

export const MCQMode: React.FC<MCQModeProps> = ({ onBack, theme, user, onExamComplete }) => {
    const [step, setStep] = useState<MCQStep>(MCQStep.SETUP);
    
    // Setup State
    const [topic, setTopic] = useState('');
    const [count, setCount] = useState(10);
    const [timeLimit, setTimeLimit] = useState(15); // minutes
    const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>([Difficulty.REMEMBER, Difficulty.UNDERSTAND, Difficulty.APPLY, Difficulty.CLINICAL]);
    
    // File State
    const [theoryFiles, setTheoryFiles] = useState<UploadedFile[]>([]);
    const [clinicalFiles, setClinicalFiles] = useState<UploadedFile[]>([]);
    const [sampleFiles, setSampleFiles] = useState<UploadedFile[]>([]);
    
    // Processing State
    const [processingCategory, setProcessingCategory] = useState<'theory' | 'clinical' | 'sample' | null>(null);

    // Exam State
    const [questions, setQuestions] = useState<MCQQuestion[]>([]);
    const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
    const [timeLeft, setTimeLeft] = useState(0); // seconds
    
    // Result State
    const [mentorData, setMentorData] = useState<MentorResponse | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const getThemeStyles = () => {
        switch(theme) {
            case 'showgirl': return { 
                primary: 'bg-orange-500 hover:bg-orange-600', 
                text: 'text-orange-500',
                rangeColor: 'text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30'
            };
            default: return { 
                primary: 'bg-blue-600 hover:bg-blue-700', 
                text: 'text-blue-600',
                rangeColor: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
            };
        }
    };
    const styles = getThemeStyles();

    const toggleDifficulty = (diff: Difficulty) => {
        setSelectedDifficulties(prev => {
            if (prev.includes(diff)) {
                if (prev.length === 1) return prev; // Prevent empty selection
                return prev.filter(d => d !== diff);
            } else {
                return [...prev, diff];
            }
        });
    };

    // -- FILE HANDLING --
    const extractTextFromPDF = async (file: File): Promise<string> => {
        try {
            const buffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
            let fullText = "";
            // Limit pages to avoid browser crash on huge books, process first 50 pages or reasonable chunk
            // Increased limit slightly for better context, but still cautious
            const maxPages = Math.min(pdf.numPages, 100); 
            
            for (let i = 1; i <= maxPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                fullText += pageText + "\n";
            }
            return fullText;
        } catch (e) {
            console.error("PDF Extract Error", e);
            throw new Error("Không thể đọc file PDF");
        }
    };

    const processFile = async (file: File, category: 'theory' | 'clinical' | 'sample') => {
        if (!file) return;

        const targetFiles = category === 'theory' ? theoryFiles : category === 'clinical' ? clinicalFiles : sampleFiles;
        if (targetFiles.length >= MAX_FILES_PER_CATEGORY) {
            alert(`Tối đa ${MAX_FILES_PER_CATEGORY} file cho mỗi mục.`);
            return;
        }

        setProcessingCategory(category);

        try {
            let content = "";
            if (file.type === 'application/pdf') {
                content = await extractTextFromPDF(file);
            } else {
                // Text file
                content = await file.text();
            }

            const newFile: UploadedFile = {
                name: file.name,
                data: content,
                type: 'text'
            };

            if (category === 'theory') setTheoryFiles(prev => [...prev, newFile]);
            if (category === 'clinical') setClinicalFiles(prev => [...prev, newFile]);
            if (category === 'sample') setSampleFiles(prev => [...prev, newFile]);
        } catch (error) {
            alert("Lỗi khi đọc file. Vui lòng thử file khác.");
        } finally {
            setProcessingCategory(null);
        }
    };

    // -- GENERATION --
    const handleGenerate = async () => {
        if (!topic) return alert("Vui lòng nhập chủ đề!");
        setStep(MCQStep.GENERATING);
        
        try {
            // Convert UploadedFile to ContentFile format for service
            const toContentFile = (f: UploadedFile) => ({ content: f.data, isText: true });
            
            const response = await generateMCQQuestions(
                topic, 
                count, 
                selectedDifficulties, 
                {
                    theory: theoryFiles.map(toContentFile),
                    clinical: clinicalFiles.map(toContentFile),
                    sample: sampleFiles.map(toContentFile)
                }
            );
            
            const generatedQuestions = response.questions.map((q, i) => ({
                ...q,
                id: i.toString(),
            }));
            
            setQuestions(generatedQuestions);
            setTimeLeft(timeLimit * 60);
            setStep(MCQStep.EXAM);
        } catch (e) {
            console.error(e);
            alert("Lỗi tạo câu hỏi. Vui lòng thử lại hoặc giảm bớt yêu cầu.");
            setStep(MCQStep.SETUP);
        }
    };

    // -- EXAM LOGIC --
    useEffect(() => {
        let timer: any;
        if (step === MCQStep.EXAM && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        } else if (step === MCQStep.EXAM && timeLeft === 0) {
            handleFinishExam();
        }
        return () => clearInterval(timer);
    }, [step, timeLeft]);

    const handleSelectAnswer = (qId: string, option: string) => {
        setUserAnswers(prev => ({ ...prev, [qId]: option }));
    };

    const handleFinishExam = async () => {
        setStep(MCQStep.SUMMARY);
        
        // Calculate Score
        const correctCount = questions.filter(q => userAnswers[q.id] === q.correctAnswer).length;
        
        // Save to History
        if (user.uid) {
            try {
                const history: ExamHistory = {
                    id: "", // Firestore will generate
                    type: 'MCQ',
                    topic: topic,
                    score: correctCount,
                    totalQuestions: questions.length,
                    timestamp: Date.now(),
                    questions: questions,
                    userAnswers: userAnswers,
                    timeLimit: timeLimit,
                    createdAt: serverTimestamp()
                };
                await addDoc(collection(db, 'users', user.uid, 'exam_history'), history);
            } catch (e) {
                console.error("Failed to save history", e);
            }
        }

        if (onExamComplete) onExamComplete();
    };

    // -- MENTOR --
    const handleConsultMentor = async () => {
        setIsAnalyzing(true);
        const correctCount = questions.filter(q => userAnswers[q.id] === q.correctAnswer).length;
        try {
            const stats = {
                total: questions.length,
                correct: correctCount,
                byDifficulty: selectedDifficulties.map(d => ({
                    difficulty: d,
                    correct: questions.filter(q => q.difficulty === d && userAnswers[q.id] === q.correctAnswer).length,
                    total: questions.filter(q => q.difficulty === d).length
                }))
            };
            const analysis = await analyzeResultWithOtter(topic, stats);
            setMentorData(analysis);
        } catch (e) {
            console.error(e);
            alert("Rái cá đang bận!");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // -- RENDER --
    if (step === MCQStep.GENERATING) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse"></div>
                    <Loader2 className="w-16 h-16 animate-spin text-blue-500 mb-4 relative z-10" />
                </div>
                <p className="text-2xl font-bold text-slate-700 dark:text-slate-300 animate-pulse">Đang tạo đề thi...</p>
                <p className="text-slate-500 mt-3 max-w-md text-center">Rái cá đang đọc tài liệu và soạn {count} câu hỏi về "{topic}" cho bạn.</p>
            </div>
        );
    }

    if (step === MCQStep.SETUP) {
        return (
            <div className="max-w-3xl mx-auto pb-20 px-4">
                
                <div className="flex items-center mb-6">
                    <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ArrowRight className="w-6 h-6 rotate-180" /></button>
                    <h2 className="text-xl font-medium text-slate-500 dark:text-slate-400">Quay lại</h2>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700 animate-fade-up">
                    <h1 className="text-3xl font-bold mb-6 text-slate-900 dark:text-white">Thi Trắc Nghiệm</h1>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Chủ đề (Bắt buộc)</label>
                            <input 
                                value={topic} 
                                onChange={(e) => setTopic(e.target.value)} 
                                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 font-medium transition-all"
                                placeholder="Nhập chủ đề chi tiết (VD: Giải phẫu Tim, Xương chi trên)..."
                            />
                            <p className="text-xs text-slate-400 mt-1 ml-1">Mẹo: Chủ đề càng cụ thể, câu hỏi càng sát nội dung.</p>
                        </div>

                        {/* Difficulty Selector */}
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                                <BrainCircuit className="w-4 h-4" /> Độ khó (Chọn ít nhất 1)
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {[Difficulty.REMEMBER, Difficulty.UNDERSTAND, Difficulty.APPLY, Difficulty.CLINICAL].map((diff) => (
                                    <button
                                        key={diff}
                                        onClick={() => toggleDifficulty(diff)}
                                        className={`p-3 rounded-xl text-sm font-bold transition-all border-2 flex items-center justify-center gap-2
                                            ${selectedDifficulties.includes(diff) 
                                                ? `bg-white dark:bg-slate-800 ${diff === Difficulty.CLINICAL ? 'border-red-500 text-red-500' : 'border-blue-500 text-blue-500'} shadow-md` 
                                                : 'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }
                                        `}
                                    >
                                        {diff === Difficulty.CLINICAL && <Stethoscope className="w-4 h-4" />}
                                        {diff}
                                    </button>
                                ))}
                            </div>
                            {selectedDifficulties.includes(Difficulty.CLINICAL) && (
                                <p className="text-xs text-red-500 mt-2 ml-1 italic flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Mẹo: Upload file vào mục "Lâm sàng" để AI tạo câu hỏi case study chuẩn xác hơn.
                                </p>
                            )}
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                             <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex justify-between">
                                    <span className="uppercase tracking-wide flex items-center gap-2">
                                        <List className="w-4 h-4" /> Số câu hỏi
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${styles.rangeColor}`}>
                                        {count} câu
                                    </span>
                                </label>
                                <input 
                                    type="range" 
                                    min="5" 
                                    max="50" 
                                    step="1" 
                                    value={count} 
                                    onChange={(e) => setCount(Number(e.target.value))} 
                                    className="liquid-slider w-full" 
                                    style={{ '--range-progress': `${((count - 5) / 45) * 100}%` } as React.CSSProperties} 
                                />
                            </div>
                             <div>
                                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex justify-between">
                                    <span className="uppercase tracking-wide flex items-center gap-2">
                                        <Clock className="w-4 h-4" /> Thời gian
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${styles.rangeColor}`}>
                                        {timeLimit} phút
                                    </span>
                                </label>
                                <input 
                                    type="range" 
                                    min="5" 
                                    max="120" 
                                    step="5" 
                                    value={timeLimit} 
                                    onChange={(e) => setTimeLimit(Number(e.target.value))} 
                                    className="liquid-slider w-full" 
                                    style={{ '--range-progress': `${((timeLimit - 5) / 115) * 100}%` } as React.CSSProperties} 
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tài liệu tham khảo (Tùy chọn)</label>
                            <p className="text-xs text-slate-500 mb-3">Kéo thả file PDF/TXT vào các ô bên dưới để AI tạo câu hỏi sát sườn.</p>
                            <div className="grid md:grid-cols-3 gap-4">
                                <FileCategory 
                                    icon={<BookOpen className="w-6 h-6 text-blue-500" />}
                                    title="Lý thuyết"
                                    desc="Sách, Giáo trình"
                                    bgGradient="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20"
                                    iconColor="text-blue-500"
                                    borderColor="border-blue-400"
                                    glowClass="hover:shadow-blue-200 dark:hover:shadow-blue-900/30"
                                    files={theoryFiles}
                                    onRemove={(i) => setTheoryFiles(prev => prev.filter((_, idx) => idx !== i))}
                                    onFileSelect={(f) => processFile(f, 'theory')}
                                    themeColorClass="text-blue-500"
                                    isProcessing={processingCategory === 'theory'}
                                />
                                <FileCategory 
                                    icon={<Stethoscope className="w-6 h-6 text-emerald-500" />}
                                    title="Lâm sàng"
                                    desc="Case study, Bệnh án"
                                    bgGradient="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20"
                                    iconColor="text-emerald-500"
                                    borderColor="border-emerald-400"
                                    glowClass="hover:shadow-emerald-200 dark:hover:shadow-emerald-900/30"
                                    files={clinicalFiles}
                                    onRemove={(i) => setClinicalFiles(prev => prev.filter((_, idx) => idx !== i))}
                                    onFileSelect={(f) => processFile(f, 'clinical')}
                                    themeColorClass="text-emerald-500"
                                    isProcessing={processingCategory === 'clinical'}
                                />
                                <FileCategory 
                                    icon={<FileCheck className="w-6 h-6 text-amber-500" />}
                                    title="Đề mẫu"
                                    desc="Bank đề cũ"
                                    bgGradient="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20"
                                    iconColor="text-amber-500"
                                    borderColor="border-amber-400"
                                    glowClass="hover:shadow-amber-200 dark:hover:shadow-amber-900/30"
                                    files={sampleFiles}
                                    onRemove={(i) => setSampleFiles(prev => prev.filter((_, idx) => idx !== i))}
                                    onFileSelect={(f) => processFile(f, 'sample')}
                                    themeColorClass="text-amber-500"
                                    isProcessing={processingCategory === 'sample'}
                                />
                            </div>
                        </div>

                        <button 
                            onClick={handleGenerate}
                            disabled={!topic || processingCategory !== null}
                            className={`w-full py-4 rounded-xl font-bold text-white shadow-lg ${styles.primary} transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                        >
                            {processingCategory ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                            {processingCategory ? "Đang xử lý file..." : "Tạo đề thi"}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === MCQStep.EXAM) {
        return (
            <div className="max-w-3xl mx-auto pb-20 px-4">
                <div className="sticky top-4 z-20 bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 mb-6 flex justify-between items-center animate-in slide-in-from-top-4">
                    <div className="font-bold text-slate-700 dark:text-slate-300">Câu hỏi {Object.keys(userAnswers).length}/{questions.length}</div>
                    <div className="flex items-center gap-2 text-red-500 font-mono font-bold bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-lg">
                        <Clock className="w-4 h-4" />
                        {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? '0' : ''}{timeLeft % 60}
                    </div>
                    <button onClick={handleFinishExam} className="text-sm font-bold text-blue-600 hover:underline">Nộp bài</button>
                </div>

                <div className="space-y-6">
                    {questions.map((q, idx) => (
                        <div key={q.id} className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-8" style={{animationDelay: `${idx * 50}ms`}}>
                            <div className="flex justify-between items-start gap-4 mb-4">
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                                    <span className="text-blue-500 mr-2">Câu {idx + 1}:</span> {q.question}
                                </h3>
                                {q.difficulty && (
                                    <span className={`shrink-0 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getDifficultyColor(q.difficulty)}`}>
                                        {q.difficulty}
                                    </span>
                                )}
                            </div>
                            <div className="space-y-2">
                                {q.options.map((opt, optIdx) => (
                                    <button 
                                        key={optIdx}
                                        onClick={() => handleSelectAnswer(q.id, opt)}
                                        className={`w-full p-4 rounded-xl text-left text-sm transition-all border ${userAnswers[q.id] === opt ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-slate-50 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300'}`}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                
                <button onClick={handleFinishExam} className={`w-full mt-8 py-4 rounded-xl font-bold text-white shadow-lg ${styles.primary} transition-transform active:scale-95`}>
                    Nộp bài thi
                </button>
            </div>
        );
    }

    if (step === MCQStep.SUMMARY) {
        const correctCount = questions.filter(q => userAnswers[q.id] === q.correctAnswer).length;
        const percentage = Math.round((correctCount / questions.length) * 100);
        const radius = 90; // Increased size
        const circumference = 2 * Math.PI * radius;
        const strokeDashoffset = circumference - (percentage / 100) * circumference;
        
        // --- THEME & SCORE BASED STYLING LOGIC ---
        const getResultConfig = () => {
            const isHigh = percentage >= 80;
            const isMid = percentage >= 50;

            const base = {
                grade: isHigh ? "Xuất sắc!" : isMid ? "Đạt yêu cầu" : "Cố gắng lên!",
                track: "stroke-slate-100 dark:stroke-slate-800",
                stroke: "stroke-current",
                textScore: "text-slate-800 dark:text-white",
                textGrade: "text-slate-500 dark:text-slate-400"
            };

            if (theme === 'showgirl') {
                return {
                    ...base,
                    gradientId: "showgirlGradient",
                    gradientStops: [
                        { offset: "0%", color: "#fcd34d" }, // Amber 300
                        { offset: "50%", color: "#f59e0b" }, // Amber 500
                        { offset: "100%", color: "#d97706" }  // Amber 600
                    ],
                    strokeColor: "url(#showgirlGradient)",
                    fillColor: "rgba(245, 158, 11, 0.1)",
                    glow: "drop-shadow-[0_0_15px_rgba(234,179,8,0.6)]",
                    textScore: "text-transparent bg-clip-text bg-gradient-to-b from-yellow-400 to-orange-600",
                    textGrade: "text-yellow-600 dark:text-yellow-400 font-bold"
                };
            } else if (theme === 'swift') {
                return {
                    ...base,
                    gradientId: "swiftGradient",
                    gradientStops: [
                        { offset: "0%", color: "#c084fc" }, // Purple 400
                        { offset: "50%", color: "#a855f7" }, // Purple 500
                        { offset: "100%", color: "#db2777" }  // Pink 600
                    ],
                    strokeColor: "url(#swiftGradient)",
                    fillColor: "rgba(168, 85, 247, 0.1)",
                    glow: "drop-shadow-[0_0_15px_rgba(168,85,247,0.6)]",
                    textScore: "text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-pink-600",
                    textGrade: "text-purple-600 dark:text-purple-300 font-bold"
                };
            } else if (theme === 'ttpd') {
                return {
                    ...base,
                    gradientId: "ttpdGradient",
                    gradientStops: [
                        { offset: "0%", color: "#d6d3d1" }, // Stone 300
                        { offset: "100%", color: "#57534e" }  // Stone 600
                    ],
                    strokeColor: "url(#ttpdGradient)",
                    fillColor: "rgba(120, 113, 108, 0.1)",
                    glow: "drop-shadow-[0_0_10px_rgba(168,162,158,0.4)]",
                    textScore: "text-stone-700 dark:text-stone-200 font-serif",
                    textGrade: "text-stone-500 dark:text-stone-400 font-serif italic"
                };
            } else if (theme === 'xmas') {
                const color1 = isHigh ? "#22c55e" : isMid ? "#eab308" : "#ef4444";
                const color2 = isHigh ? "#16a34a" : isMid ? "#ca8a04" : "#b91c1c";
                return {
                    ...base,
                    gradientId: "xmasGradient",
                    gradientStops: [
                        { offset: "0%", color: color1 },
                        { offset: "100%", color: color2 }
                    ],
                    strokeColor: "url(#xmasGradient)",
                    fillColor: isHigh ? "rgba(22, 163, 74, 0.1)" : isMid ? "rgba(202, 138, 4, 0.1)" : "rgba(220, 38, 38, 0.1)",
                    glow: isHigh ? "drop-shadow-[0_0_15px_rgba(22,163,74,0.5)]" : "drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]",
                    textScore: isHigh ? "text-green-600" : isMid ? "text-yellow-600" : "text-red-600",
                    textGrade: "font-bold"
                };
            } else {
                // Default & Others (Color based on score)
                const color = isHigh ? "#22c55e" : isMid ? "#eab308" : "#ef4444"; // Green/Yellow/Red
                return {
                    ...base,
                    strokeColor: color,
                    fillColor: isHigh ? "rgba(34, 197, 94, 0.05)" : isMid ? "rgba(234, 179, 8, 0.05)" : "rgba(239, 68, 68, 0.05)",
                    glow: isHigh ? "drop-shadow-[0_0_10px_rgba(34,197,94,0.4)]" : isMid ? "drop-shadow-[0_0_10px_rgba(234,179,8,0.4)]" : "drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]",
                    textScore: isHigh ? "text-green-500" : isMid ? "text-yellow-500" : "text-red-500",
                    textGrade: isHigh ? "text-green-600 dark:text-green-400" : isMid ? "text-yellow-600 dark:text-yellow-400" : "text-red-600 dark:text-red-400",
                    gradientId: undefined,
                    gradientStops: undefined
                };
            }
        };

        const config = getResultConfig();

        return (
            <div className="max-w-4xl mx-auto pb-20 px-4">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 text-center border border-slate-200 dark:border-slate-700 shadow-xl mb-8 animate-fade-up relative overflow-hidden">
                    {/* Decorative background hint */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-20 text-slate-400"></div>
                    
                    <h2 className="text-2xl font-bold mb-8 text-slate-800 dark:text-white uppercase tracking-wide opacity-80">Kết quả bài thi</h2>
                    
                    {/* PREMIUM CIRCLE CHART */}
                    <div className="relative w-64 h-64 mx-auto mb-8 flex items-center justify-center">
                        {/* SVG Container */}
                        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                            {/* Define Gradients */}
                            {config.gradientId && config.gradientStops && (
                                <defs>
                                    <linearGradient id={config.gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                                        {config.gradientStops.map((stop, i) => (
                                            <stop key={i} offset={stop.offset} stopColor={stop.color} />
                                        ))}
                                    </linearGradient>
                                </defs>
                            )}

                            {/* Track Background */}
                            <circle 
                                cx="100" cy="100" r={radius} 
                                className={`fill-none stroke-2 ${config.track}`}
                            />
                            
                            {/* Inner Fill (Phủ màu) */}
                            <circle 
                                cx="100" cy="100" r={radius}
                                className="transition-all duration-1000"
                                fill={config.fillColor}
                            />

                            {/* Progress Stroke */}
                            <circle 
                                cx="100" cy="100" r={radius} 
                                className={`fill-none stroke-[12px] transition-all duration-1000 ease-out ${config.glow}`} 
                                stroke={config.strokeColor}
                                strokeLinecap="round"
                                strokeDasharray={circumference} 
                                strokeDashoffset={strokeDashoffset}
                            />
                        </svg>

                        {/* Centered Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className={`text-5xl font-black tracking-tighter ${config.textScore} drop-shadow-sm`}>
                                {percentage}%
                            </span>
                            <span className="text-sm text-slate-400 font-medium mt-1 font-mono">
                                {correctCount}/{questions.length} câu
                            </span>
                        </div>
                    </div>
                    
                    <div className={`text-2xl font-bold mb-8 ${config.textGrade} animate-bounce`}>{config.grade}</div>

                    <div className="flex justify-center gap-4">
                        <button onClick={() => setStep(MCQStep.SETUP)} className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Làm đề mới</button>
                        {!mentorData && (
                            <button onClick={handleConsultMentor} disabled={isAnalyzing} className={`px-6 py-3 rounded-xl text-white font-bold flex items-center gap-2 ${styles.primary} shadow-lg active:scale-95 transition-transform`}>
                                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />} Phân tích AI
                            </button>
                        )}
                    </div>
                </div>

                {mentorData && (
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 p-8 rounded-3xl mb-8 border border-indigo-100 dark:border-indigo-900/30 animate-in slide-in-from-bottom-8 shadow-lg">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center text-2xl shadow-inner border border-indigo-200 dark:border-indigo-700">🦦</div>
                            <div>
                                <h3 className="font-bold text-indigo-900 dark:text-indigo-100 text-lg">Nhận xét từ Rái cá nhỏ</h3>
                                <p className="text-xs text-indigo-600 dark:text-indigo-400">Trợ lý học tập cá nhân</p>
                            </div>
                        </div>
                        
                        <div className="bg-white/60 dark:bg-black/20 p-5 rounded-2xl mb-6 border border-indigo-50 dark:border-indigo-900/20 shadow-sm">
                            <p className="text-slate-700 dark:text-slate-300 italic leading-relaxed">"{mentorData.analysis}"</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 mb-8">
                            <div className="bg-green-50 dark:bg-green-900/10 p-5 rounded-2xl border border-green-100 dark:border-green-900/30">
                                <h4 className="font-bold text-green-700 dark:text-green-400 text-sm mb-3 flex items-center gap-2"><ThumbsUp className="w-4 h-4" /> Điểm mạnh</h4>
                                <ul className="text-sm list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">{mentorData.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                            </div>
                            <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-2xl border border-red-100 dark:border-red-900/30">
                                <h4 className="font-bold text-red-700 dark:text-red-400 text-sm mb-3 flex items-center gap-2"><Target className="w-4 h-4" /> Cần cải thiện</h4>
                                <ul className="text-sm list-disc list-inside text-slate-700 dark:text-slate-300 space-y-1">{mentorData.weaknesses.map((s, i) => <li key={i}>{s}</li>)}</ul>
                            </div>
                        </div>

                        {/* ROADMAP FLOWCHART */}
                        <div>
                            <h4 className="font-bold text-blue-700 dark:text-blue-400 text-sm mb-6 flex items-center gap-2 uppercase tracking-wider"><TrendingUp className="w-4 h-4" /> Lộ trình cải thiện</h4>
                            
                            <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-blue-200 before:via-purple-200 before:to-transparent dark:before:from-blue-900 dark:before:via-purple-900">
                                {mentorData.roadmap.map((step, i) => (
                                    <div key={i} className="relative group">
                                        {/* Node Circle */}
                                        <div className={`absolute -left-[29px] top-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-md z-10
                                            ${i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-purple-500' : 'bg-indigo-500'}
                                        `}>
                                            {i + 1}
                                        </div>
                                        
                                        {/* Card */}
                                        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                            {/* Decorative bg gradient */}
                                            <div className={`absolute top-0 left-0 w-1 h-full ${i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-purple-500' : 'bg-indigo-500'}`}></div>
                                            
                                            <h5 className="font-bold text-slate-800 dark:text-white text-sm mb-1">{step.step}</h5>
                                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{step.details}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-6">
                    {questions.map((q, idx) => {
                        const isCorrect = userAnswers[q.id] === q.correctAnswer;
                        return (
                            <div key={q.id} className={`p-6 rounded-2xl border-2 ${isCorrect ? 'border-green-200 bg-green-50/30' : 'border-red-200 bg-red-50/30'} dark:bg-slate-900`}>
                                <div className="flex justify-between items-start gap-4 mb-3">
                                    <h3 className="font-bold text-slate-800 dark:text-white">
                                        Câu {idx + 1}: {q.question}
                                    </h3>
                                    {q.difficulty && (
                                        <span className={`shrink-0 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getDifficultyColor(q.difficulty)}`}>
                                            {q.difficulty}
                                        </span>
                                    )}
                                </div>
                                <div className="space-y-2 mb-4">
                                    {q.options.map((opt, i) => {
                                        let style = "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500";
                                        if (opt === q.correctAnswer) style = "bg-green-100 border-green-500 text-green-800 font-bold";
                                        else if (opt === userAnswers[q.id]) style = "bg-red-100 border-red-500 text-red-800";
                                        
                                        return (
                                            <div key={i} className={`p-3 rounded-lg border text-sm ${style}`}>
                                                {opt} {opt === q.correctAnswer && <Check className="inline w-4 h-4 ml-1" />}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-sm text-slate-600 dark:text-slate-300 italic">
                                    <span className="font-bold not-italic">Giải thích:</span> {q.explanation}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return null;
};
