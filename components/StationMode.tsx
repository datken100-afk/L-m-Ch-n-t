
import React, { useState, useRef, useEffect } from 'react';
import { generateStationQuestionFromImage, analyzeResultWithOtter } from '../services/geminiService';
import { StationItem, MentorResponse } from '../types';
import { Play, Timer, ArrowRight, CheckCircle, Eye, Activity, FileText, Crosshair, Database, Sparkles, FileUp, Loader2, ZoomIn, ZoomOut, RotateCcw, Check, X, ThumbsUp, ShieldAlert, AlertCircle, Lightbulb, List, Search, Book, Move, Maximize2, RefreshCw, BrainCircuit, Stethoscope, Milestone, Footprints, Trophy } from 'lucide-react';
import { ThemeType } from '../App';

// Declare pdfjsLib globally
declare const pdfjsLib: any;

interface StationModeProps {
  onBack: () => void;
  theme: ThemeType;
}

enum StationStep {
  SETUP,
  GENERATING, 
  RUNNING,
  SUMMARY
}

interface StationResult {
    image: string;
    question: string;
    userAnswer: string;
    correctAnswer: string;
    explanation: string;
    acceptedKeywords: string[];
    isCorrect: boolean;
}

interface SectionMap {
    id: string;
    name: string;
    range: [number, number]; 
    keywords: string[];
}

// Based on Gray's Anatomy for Students Flash Cards 3rd Edition
const GRAYS_SECTIONS: SectionMap[] = [
    { id: 'all', name: 'Tất cả (Ngẫu nhiên)', range: [1, 400], keywords: [] },
    { id: 'overview', name: '1. Overview (Tổng quan)', range: [2, 22], keywords: ['overview', 'tổng quan', 'nhập môn'] },
    { id: 'back', name: '2. Back (Lưng & Cột sống)', range: [23, 76], keywords: ['back', 'lưng', 'cột sống', 'đốt sống', 'vertebra', 'spine'] },
    { id: 'thorax', name: '3. Thorax (Ngực)', range: [77, 148], keywords: ['thorax', 'ngực', 'tim', 'phổi', 'trung thất', 'heart', 'lung', 'mediastinum'] },
    { id: 'abdomen', name: '4. Abdomen (Bụng)', range: [149, 242], keywords: ['abdomen', 'bụng', 'dạ dày', 'gan', 'ruột', 'thận', 'stomach', 'liver', 'kidney'] },
    { id: 'pelvis', name: '5. Pelvis (Chậu hông)', range: [243, 298], keywords: ['pelvis', 'chậu', 'sinh dục', 'tiết niệu', 'perineum', 'đáy chậu'] },
    { id: 'lower', name: '6. Lower Limb (Chi dưới)', range: [299, 408], keywords: ['lower', 'chi dưới', 'chân', 'đùi', 'cẳng chân', 'bàn chân', 'leg', 'foot', 'femur'] },
    { id: 'upper', name: '7. Upper Limb (Chi trên)', range: [409, 538], keywords: ['upper', 'chi trên', 'tay', 'cánh tay', 'vai', 'arm', 'hand', 'shoulder'] },
    { id: 'head', name: '8. Head & Neck (Đầu Mặt Cổ)', range: [539, 730], keywords: ['head', 'neck', 'đầu', 'mặt', 'cổ', 'sọ', 'thần kinh sọ', 'cranial', 'skull', 'face'] },
];

export const StationMode: React.FC<StationModeProps> = ({ onBack, theme }) => {
    const [step, setStep] = useState<StationStep>(StationStep.SETUP);
    const [topic, setTopic] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [startPage, setStartPage] = useState<number>(1);
    const [endPage, setEndPage] = useState<number>(400);
    const [activePresetId, setActivePresetId] = useState<string>('all');
    
    // Settings
    const [limitStations, setLimitStations] = useState<number>(10);
    const [timeLimit, setTimeLimit] = useState<number>(45);
    
    // Data State
    const [images, setImages] = useState<string[]>([]);
    const [answerImages, setAnswerImages] = useState<string[]>([]); // Parallel array for answer pages
    const [stationResults, setStationResults] = useState<StationResult[]>([]);
    const [validStationsCount, setValidStationsCount] = useState(0); // Track actually generated questions
    
    // Loading State
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingText, setLoadingText] = useState('');
    
    // Running State
    const [currentIdx, setCurrentIdx] = useState(0); // Index in the 'images' array
    const [questionData, setQuestionData] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [currentUserAnswer, setCurrentUserAnswer] = useState('');
    
    // Image Viewer State
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ x: number, y: number } | null>(null);
    const imageRef = useRef<HTMLImageElement>(null);
    const answerInputRef = useRef<HTMLInputElement>(null);

    // Mentor State
    const [mentorData, setMentorData] = useState<MentorResponse | null>(null);
    const [mentorLoading, setMentorLoading] = useState(false);
    const mentorSectionRef = useRef<HTMLDivElement>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // THEME STYLES
    const getThemeStyles = () => {
        switch(theme) {
            case 'showgirl': return {
                primary: 'bg-gradient-to-r from-teal-500 to-orange-500',
                accent: 'text-orange-500',
                bg: 'bg-slate-900 border-orange-900/30',
                icon: 'text-yellow-400',
                rangeColor: 'text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30',
                inputFocus: 'focus:ring-orange-500'
            };
            case 'swift': return {
                primary: 'bg-gradient-to-r from-indigo-500 to-purple-600',
                accent: 'text-purple-500',
                bg: 'bg-[#1a1a2e] border-purple-900/30',
                icon: 'text-purple-400',
                rangeColor: 'text-purple-500 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30',
                inputFocus: 'focus:ring-purple-500'
            };
            case 'xmas': return {
                primary: 'bg-gradient-to-r from-red-600 to-green-600',
                accent: 'text-red-600',
                bg: 'bg-white dark:bg-slate-900',
                icon: 'text-red-500',
                rangeColor: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30',
                inputFocus: 'focus:ring-red-500'
            };
            default: return {
                primary: 'bg-blue-600 hover:bg-blue-700',
                accent: 'text-blue-600',
                bg: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800',
                icon: 'text-blue-500',
                rangeColor: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30',
                inputFocus: 'focus:ring-blue-500'
            };
        }
    };
    const styles = getThemeStyles();

    // ... Loading Logic
    const getLoadingStyles = () => {
        if (theme === 'xmas') return { bar: 'bg-[repeating-linear-gradient(45deg,#dc2626,#dc2626_10px,#ffffff_10px,#ffffff_20px)]', shadow: 'shadow-[0_0_20px_rgba(220,38,38,0.5)]', icon: '🎅', title: 'ÔNG GIÀ NOEL ĐANG CẮT LÁT...', titleGradient: 'from-red-500 to-emerald-600' };
        if (theme === 'swift') return { bar: 'bg-[repeating-linear-gradient(45deg,#a855f7,#a855f7_10px,#ec4899_10px,#ec4899_20px)]', shadow: 'shadow-[0_0_20px_rgba(168,85,247,0.5)]', icon: '🐍', title: 'RẮN CHÚA ĐANG SOI KÍNH...', titleGradient: 'from-purple-500 to-pink-600' };
        if (theme === 'showgirl') return { bar: 'bg-[repeating-linear-gradient(45deg,#14b8a6,#14b8a6_10px,#f97316_10px,#f97316_20px)]', shadow: 'shadow-[0_0_30px_rgba(249,115,22,0.6)]', icon: '💃', title: 'PREPARING THE STAGE...', titleGradient: 'from-teal-500 to-orange-500' };
        return { bar: 'bg-[repeating-linear-gradient(45deg,#3b82f6,#3b82f6_10px,#6366f1_10px,#6366f1_20px)]', shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.5)]', icon: '🦦', title: 'RÁI CÁ ĐANG CHUẨN BỊ TRẠM...', titleGradient: 'from-blue-500 to-purple-600' };
    };
    const loadingStyle = getLoadingStyles();

    useEffect(() => {
        if (step !== StationStep.GENERATING) return;
        const messages = ["Đang cắt lát PDF...", "Tách hình ảnh và đáp án...", "Soi kính hiển vi điện tử...", "Lọc hình ảnh toàn chữ...", "Sắp xếp các trạm thi..."];
        let msgIndex = 0;
        setLoadingText(messages[0]);
        const textInterval = setInterval(() => {
            msgIndex = (msgIndex + 1) % messages.length;
            setLoadingText(messages[msgIndex]);
        }, 2000);
        const progressInterval = setInterval(() => {
            setLoadingProgress(prev => prev >= 95 ? prev : prev + (prev > 80 ? 0.5 : 2));
        }, 200);
        return () => { clearInterval(textInterval); clearInterval(progressInterval); };
    }, [step]);

    // TIMER Logic
    useEffect(() => {
        if (step === StationStep.RUNNING && !isGenerating && timeLeft > 0) {
            const interval = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        handleMoveToNextStation(); // Auto submit on timeout
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [step, isGenerating, timeLeft]);

    // Setup Focus on Input
    useEffect(() => {
        if (!isGenerating && questionData && answerInputRef.current) {
            answerInputRef.current.focus();
        }
    }, [questionData, isGenerating]);

    // Setup Image Zoom Reset
    useEffect(() => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    }, [currentIdx]);

    const processPDF = async () => {
        if (!file) return;
        setStep(StationStep.GENERATING);
        setLoadingProgress(0);
        
        try {
            const buffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
            
            const totalPages = pdf.numPages;
            const effectiveEndPage = Math.min(endPage, totalPages);
            const effectiveStartPage = Math.max(1, startPage);

            const pagesToProcess: number[] = [];
            // IMPORTANT: We need pairs, so we iterate up to effectiveEndPage - 1
            for (let i = effectiveStartPage; i < effectiveEndPage; i++) {
                pagesToProcess.push(i);
            }

            // FETCH MORE CANDIDATES: Get 4x the limit to account for invalid slides (text-only, wrong topic)
            const candidateLimit = Math.min(pagesToProcess.length, limitStations * 4);
            const shuffled = pagesToProcess.filter(p => p < totalPages).sort(() => 0.5 - Math.random()).slice(0, candidateLimit);
            
            const extractedImages: string[] = [];
            const extractedAnswerImages: string[] = [];
            const chunkStep = 90 / shuffled.length;

            for (let i = 0; i < shuffled.length; i++) {
                // 1. Render Question Page (Page N)
                const page = await pdf.getPage(shuffled[i]);
                const viewport = page.getViewport({ scale: 1.5 }); 
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                extractedImages.push(canvas.toDataURL('image/jpeg', 0.8));

                // 2. Render Answer Page (Page N + 1) - The "Context"
                // Most flashcards follow: Page 1 (Question Image) -> Page 2 (Answer Text/Key)
                const pageAns = await pdf.getPage(shuffled[i] + 1);
                const viewportAns = pageAns.getViewport({ scale: 1.5 });
                const canvasAns = document.createElement('canvas');
                const contextAns = canvasAns.getContext('2d');
                canvasAns.height = viewportAns.height;
                canvasAns.width = viewportAns.width;

                await pageAns.render({ canvasContext: contextAns, viewport: viewportAns }).promise;
                extractedAnswerImages.push(canvasAns.toDataURL('image/jpeg', 0.8));
                
                setLoadingProgress(prev => Math.min(prev + chunkStep, 95));
            }
            
            setLoadingProgress(100);
            setLoadingText("Hoàn tất!");

            setTimeout(() => {
                setImages(extractedImages);
                setAnswerImages(extractedAnswerImages);
                setStationResults([]);
                setValidStationsCount(0);
                setStep(StationStep.RUNNING);
                setCurrentIdx(0);
                
                if (extractedImages.length > 0) {
                    generateQuestion(extractedImages[0], extractedAnswerImages[0]);
                } else {
                    alert("Không tìm thấy trang nào trong khoảng đã chọn.");
                    setStep(StationStep.SETUP);
                }
            }, 500);

        } catch (err) {
            console.error(err);
            alert("Lỗi xử lý file PDF. Vui lòng thử lại.");
            setStep(StationStep.SETUP);
        }
    };

    const generateQuestion = async (imgBase64: string, answerImgBase64: string) => {
        setIsGenerating(true);
        setQuestionData(null);
        setCurrentUserAnswer('');
        
        try {
            const searchTopic = topic.trim() ? topic : "Giải phẫu học";
            
            // Pass BOTH images to AI: Question + Answer Key
            const result = await generateStationQuestionFromImage(imgBase64, answerImgBase64, "Giải phẫu học", searchTopic);
            
            if (result.isValid && result.questions.length > 0) {
                setQuestionData(result.questions[0]);
                setTimeLeft(timeLimit);
            } else {
                // AI said NO (Wrong topic OR Text-only page): Skip silently to next candidate
                handleSkipToNext();
            }
        } catch (e) {
            console.error("Gen Error", e);
            // Error: Skip silently
            handleSkipToNext();
        } finally {
            setIsGenerating(false);
        }
    };

    // Called when AI rejects image -> Try next candidate WITHOUT counting as a question
    const handleSkipToNext = () => {
        const nextIdx = currentIdx + 1;
        if (nextIdx < images.length) {
            setCurrentIdx(nextIdx);
            generateQuestion(images[nextIdx], answerImages[nextIdx]);
        } else {
            // Ran out of ALL candidates
            if (validStationsCount === 0) {
                alert("Rái cá không tìm thấy hình ảnh giải phẫu phù hợp với chủ đề đã chọn trong các trang này. Hãy thử chọn chương khác hoặc file khác.");
                setStep(StationStep.SETUP);
            } else {
                finishExam();
            }
        }
    };

    // Called when User answers -> Record result AND check if exam is done
    const handleMoveToNextStation = () => {
        if (!questionData) return;

        // Check Correctness
        const normalize = (s: string) => s.toLowerCase().trim().replace(/[.,-]/g, "");
        const userNorm = normalize(currentUserAnswer);
        const correctNorm = normalize(questionData.correctAnswer);
        
        let isCorrect = userNorm === correctNorm;
        
        if (!isCorrect && questionData.acceptedKeywords) {
            isCorrect = questionData.acceptedKeywords.some((kw: string) => normalize(kw) === userNorm);
        }
        
        // Loose check for long answers
        if (!isCorrect && userNorm.length > 4 && correctNorm.includes(userNorm)) {
             isCorrect = true;
        }

        const result: StationResult = {
            image: images[currentIdx],
            question: questionData.questionText,
            userAnswer: currentUserAnswer,
            correctAnswer: questionData.correctAnswer,
            acceptedKeywords: questionData.acceptedKeywords || [],
            explanation: questionData.explanation,
            isCorrect: isCorrect
        };

        setStationResults(prev => [...prev, result]);
        
        const newValidCount = validStationsCount + 1;
        setValidStationsCount(newValidCount);

        if (newValidCount >= limitStations) {
            finishExam();
        } else {
            // Try next image in pool
            const nextIdx = currentIdx + 1;
            if (nextIdx < images.length) {
                setCurrentIdx(nextIdx);
                generateQuestion(images[nextIdx], answerImages[nextIdx]);
            } else {
                finishExam(); // Ran out of candidates
            }
        }
    };

    const finishExam = () => {
        setStep(StationStep.SUMMARY);
    };

    // --- IMAGE VIEWER LOGIC ---
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const scaleAdjustment = e.deltaY * -0.001;
        const newScale = Math.min(Math.max(1, scale + scaleAdjustment), 4);
        setScale(newScale);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1) {
            setIsDragging(true);
            dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && dragStartRef.current) {
            setPosition({
                x: e.clientX - dragStartRef.current.x,
                y: e.clientY - dragStartRef.current.y
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handlePresetSelect = (section: SectionMap) => {
        setActivePresetId(section.id);
        setStartPage(section.range[0]);
        setEndPage(section.range[1]);
        setTopic(section.keywords.join(', '));
    };

    const handleConsultMentor = async () => {
        setMentorLoading(true);
        
        const stats = {
            "Thực hành": {
                correct: stationResults.filter(r => r.isCorrect).length,
                total: stationResults.length
            }
        };

        try {
            const analyzeResult = await analyzeResultWithOtter(topic || "Chạy trạm giải phẫu", stats);
            setMentorData(analyzeResult);
            setTimeout(() => {
                mentorSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (e) {
            console.error("Mentor Error", e);
            alert("Rái cá đang bận, thử lại sau nhé!");
        } finally {
            setMentorLoading(false);
        }
    };

    // --- RENDER STEPS ---

    if (step === StationStep.GENERATING) {
        return (
            <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md transition-all duration-500">
                <div className="w-full max-w-2xl p-8 relative">
                    <h3 className={`text-3xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r ${loadingStyle.titleGradient} mb-16 animate-pulse`}>
                        {loadingStyle.title}
                    </h3>
                    <div className="relative w-full h-4 bg-slate-200 dark:bg-slate-800 rounded-full overflow-visible border border-slate-300 dark:border-slate-700">
                        <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out ${loadingStyle.bar} ${loadingStyle.shadow}`} style={{ width: `${loadingProgress}%` }}></div>
                        <div className="absolute top-1/2 -translate-y-1/2 transition-all duration-500 ease-out z-20" style={{ left: `${loadingProgress}%`, transform: 'translate(-50%, -50%)' }}>
                            <div className="text-6xl transform -scale-x-100 animate-[bounce_0.4s_infinite] filter drop-shadow-lg">{loadingStyle.icon}</div>
                        </div>
                    </div>
                    <div className="mt-20 text-center">
                        <p className="text-xl font-bold text-slate-700 dark:text-slate-200 animate-fade-up" key={loadingText}>{loadingText}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (step === StationStep.SETUP) {
        return (
            <div className="max-w-3xl mx-auto pb-20 px-4">
                <div className="flex items-center mb-6">
                    <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"><ArrowRight className="w-6 h-6 rotate-180" /></button>
                    <h2 className="text-xl font-medium text-slate-500 dark:text-slate-400">Quay lại</h2>
                </div>
                <div className={`bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700 animate-fade-up`}>
                    <div className="flex items-center gap-4 mb-8">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 ${styles.icon}`}><Crosshair className="w-8 h-8" /></div>
                        <div><h1 className="text-3xl font-bold text-slate-900 dark:text-white">Thi Chạy Trạm (Spot Test)</h1><p className="text-slate-500 dark:text-slate-400">Tải lên tài liệu (Atlas/Slide) để tạo bài thi thực hành.</p></div>
                    </div>
                    <div className="space-y-8">
                        <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800 group relative overflow-hidden ${file ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-slate-300 dark:border-slate-700'}`}>
                            {!file && <div className="absolute top-0 right-0 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 text-[10px] font-bold rounded-bl-xl border-l border-b border-yellow-200 dark:border-yellow-800 flex items-center gap-1 shadow-sm z-10"><Sparkles className="w-3 h-3" /> Khuyên dùng: Gray's Anatomy Flash Cards 3rd Ed</div>}
                            <input type="file" ref={fileInputRef} accept=".pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                            {file ? <div className="flex flex-col items-center text-green-600 dark:text-green-400"><FileText className="w-12 h-12 mb-2" /><p className="font-bold text-lg">{file.name}</p></div> : <div className="flex flex-col items-center text-slate-400 group-hover:text-slate-500 transition-colors"><FileUp className="w-12 h-12 mb-3" /><p className="font-bold text-lg mb-1">Chọn file PDF (Atlas)</p></div>}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2"><Book className="w-4 h-4" /> Chọn chương (Gray's Anatomy)</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">{GRAYS_SECTIONS.map(sec => (<button key={sec.id} onClick={() => handlePresetSelect(sec)} className={`px-3 py-2 rounded-xl border text-xs font-bold text-left transition-all flex items-center justify-between ${activePresetId === sec.id ? `bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-600 dark:text-blue-400 shadow-md` : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-blue-300'}`}><span className="truncate mr-2">{sec.name}</span>{activePresetId === sec.id && <Check className="w-3 h-3 shrink-0" />}</button>))}</div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-8">
                             <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex justify-between"><span className="uppercase tracking-wide flex items-center gap-2"><List className="w-4 h-4" /> Số lượng trạm</span><span className={`px-2 py-0.5 rounded text-xs font-bold ${styles.rangeColor}`}>{limitStations} trạm</span></label><input type="range" min="5" max="20" step="1" value={limitStations} onChange={(e) => setLimitStations(Number(e.target.value))} className="liquid-slider w-full" style={{ '--range-progress': `${((limitStations - 5) / 15) * 100}%` } as React.CSSProperties} /></div>
                             <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4 flex justify-between"><span className="uppercase tracking-wide flex items-center gap-2"><Timer className="w-4 h-4" /> Thời gian/trạm</span><span className={`px-2 py-0.5 rounded text-xs font-bold ${styles.rangeColor}`}>{timeLimit} giây</span></label><input type="range" min="15" max="120" step="15" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} className="liquid-slider w-full" style={{ '--range-progress': `${((timeLimit - 15) / 105) * 100}%` } as React.CSSProperties} /></div>
                        </div>
                        <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4" /> Chủ đề trọng tâm (Bắt buộc)</label><input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="VD: Xương chi trên, Tim..." className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium" /></div>
                        <button onClick={processPDF} disabled={!file} className={`w-full py-5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 text-lg ${!file ? 'bg-slate-300 dark:bg-slate-800 cursor-not-allowed' : styles.primary}`}><Play className="w-6 h-6 fill-current" /><span>Bắt đầu thi ngay</span></button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === StationStep.RUNNING) {
        return (
            <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-4 px-4 pb-4 max-w-[1600px] mx-auto">
                {/* LEFT: IMAGE VIEWER (70%) */}
                <div className="flex-1 md:flex-[7] bg-black rounded-3xl relative overflow-hidden group border border-slate-800 shadow-2xl flex flex-col">
                    <div className="absolute top-4 left-4 z-20 flex gap-2">
                        <div className="bg-black/50 text-white px-3 py-1 rounded-full text-sm font-mono backdrop-blur-md">
                            Station {validStationsCount + 1}/{limitStations}
                        </div>
                    </div>
                    
                    <div 
                        className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center"
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        {isGenerating ? (
                            <div className="flex flex-col items-center justify-center text-white gap-3">
                                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                                <p className="animate-pulse font-mono text-sm">Đang soi kính hiển vi...</p>
                            </div>
                        ) : (
                            <img 
                                ref={imageRef}
                                src={images[currentIdx]} 
                                alt="Station"
                                className="max-w-full max-h-full object-contain transition-transform duration-100 ease-out select-none"
                                style={{ 
                                    transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` 
                                }}
                                draggable={false}
                            />
                        )}
                    </div>

                    {/* Image Controls */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20 bg-black/60 p-2 rounded-2xl backdrop-blur-md border border-white/10">
                        <button onClick={() => setScale(Math.max(1, scale - 0.5))} className="p-2 hover:bg-white/20 rounded-xl text-white transition-colors"><ZoomOut className="w-5 h-5" /></button>
                        <span className="text-white text-xs font-mono flex items-center px-2 w-12 justify-center">{Math.round(scale * 100)}%</span>
                        <button onClick={() => setScale(Math.min(4, scale + 0.5))} className="p-2 hover:bg-white/20 rounded-xl text-white transition-colors"><ZoomIn className="w-5 h-5" /></button>
                        <div className="w-[1px] bg-white/20 mx-1"></div>
                        <button onClick={() => { setScale(1); setPosition({x:0,y:0}); }} className="p-2 hover:bg-white/20 rounded-xl text-white transition-colors"><RefreshCw className="w-5 h-5" /></button>
                    </div>
                </div>

                {/* RIGHT: QUESTION & INPUT (30%) */}
                <div className="md:flex-[3] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl p-6 flex flex-col">
                    {/* Timer */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-bold text-sm uppercase tracking-wider">
                            <Crosshair className="w-4 h-4" /> Câu hỏi
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-lg border ${timeLeft < 10 ? 'bg-red-50 dark:bg-red-900/20 text-red-600 border-red-200 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'}`}>
                            <Timer className="w-4 h-4" />
                            {timeLeft}s
                        </div>
                    </div>

                    {/* Question Text */}
                    <div className="flex-1 flex flex-col justify-center mb-6">
                        {isGenerating ? (
                            <div className="space-y-3 animate-pulse">
                                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
                                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                            </div>
                        ) : questionData ? (
                            <div className="animate-in slide-in-from-right-4">
                                <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white leading-relaxed">
                                    {questionData.questionText}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 italic">
                                    (Nhập tên cấu trúc chính xác)
                                </p>
                            </div>
                        ) : null}
                    </div>

                    {/* Input Area */}
                    <div className="mt-auto">
                        <input 
                            ref={answerInputRef}
                            type="text" 
                            value={currentUserAnswer}
                            onChange={(e) => setCurrentUserAnswer(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleMoveToNextStation()}
                            placeholder="Nhập đáp án của bạn..."
                            className={`w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-lg font-medium outline-none transition-all mb-4 ${styles.inputFocus} focus:ring-2`}
                            disabled={isGenerating}
                            autoComplete="off"
                        />
                        <button 
                            onClick={handleMoveToNextStation}
                            disabled={isGenerating}
                            className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${styles.primary}`}
                        >
                            {validStationsCount === limitStations - 1 ? "Nộp bài" : "Tiếp tục"} <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === StationStep.SUMMARY) {
        const correctCount = stationResults.filter(r => r.isCorrect).length;
        const percentage = Math.round((correctCount / stationResults.length) * 100) || 0;

        return (
            <div className="max-w-5xl mx-auto pb-20 px-4 pt-8">
                {/* Summary Header */}
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700 mb-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-500 to-blue-500"></div>
                    <div className="w-20 h-20 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-4xl shadow-inner">
                        {percentage >= 80 ? '🏆' : percentage >= 50 ? '👍' : '📚'}
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Kết quả Chạy trạm</h1>
                    <div className="flex items-center justify-center gap-4 text-slate-500 dark:text-slate-400 mb-6">
                        <span className="flex items-center gap-1"><Trophy className="w-4 h-4" /> Điểm: {correctCount}/{stationResults.length}</span>
                        <span className="flex items-center gap-1"><Timer className="w-4 h-4" /> {timeLimit}s/trạm</span>
                    </div>
                    
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => setStep(StationStep.SETUP)} className="px-6 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">Làm đề mới</button>
                        {!mentorData && (
                            <button 
                                onClick={handleConsultMentor} 
                                disabled={mentorLoading}
                                className={`px-6 py-3 rounded-xl text-white font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2 ${styles.primary}`}
                            >
                                {mentorLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "🦦"} Phân tích với Mentor
                            </button>
                        )}
                    </div>
                </div>

                {/* Mentor Section */}
                {mentorData && (
                    <div ref={mentorSectionRef} className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 rounded-3xl p-8 shadow-xl border border-indigo-100 dark:border-indigo-900/30 mb-8 animate-in slide-in-from-bottom-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="text-4xl animate-bounce">🦦</div>
                            <div>
                                <h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-100">Nhận xét từ Giáo sư Rái Cá</h3>
                                <p className="text-sm text-indigo-600 dark:text-indigo-300">Phân tích chuyên sâu năng lực thực hành</p>
                            </div>
                        </div>
                        <div className="prose dark:prose-invert max-w-none">
                            <p className="text-slate-700 dark:text-slate-300 italic mb-6">"{mentorData.analysis}"</p>
                            <div className="grid md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-green-100 dark:bg-green-900/30 p-4 rounded-xl">
                                    <h4 className="font-bold text-green-800 dark:text-green-300 text-sm uppercase mb-2 flex items-center gap-2"><ThumbsUp className="w-4 h-4" /> Điểm mạnh</h4>
                                    <ul className="list-disc list-inside text-sm space-y-1">{mentorData.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                                </div>
                                <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-xl">
                                    <h4 className="font-bold text-red-800 dark:text-red-300 text-sm uppercase mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Cần cải thiện</h4>
                                    <ul className="list-disc list-inside text-sm space-y-1">{mentorData.weaknesses.map((w, i) => <li key={i}>{w}</li>)}</ul>
                                </div>
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-xl">
                                    <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm uppercase mb-2 flex items-center gap-2"><Milestone className="w-4 h-4" /> Lộ trình</h4>
                                    <div className="space-y-2">
                                        {mentorData.roadmap.map((step, i) => (
                                            <div key={i} className="text-xs"><span className="font-bold">{step.step}:</span> {step.details}</div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Detailed Results List */}
                <div className="space-y-6">
                    {stationResults.map((result, idx) => (
                        <div key={idx} className={`bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border-2 ${result.isCorrect ? 'border-green-100 dark:border-green-900/30' : 'border-red-100 dark:border-red-900/30'} shadow-sm flex flex-col md:flex-row`}>
                            {/* Image Thumbnail */}
                            <div className="w-full md:w-48 h-48 bg-black flex items-center justify-center relative shrink-0 group">
                                <img src={result.image} alt={`Station ${idx + 1}`} className="max-w-full max-h-full object-contain" />
                                <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-bold">#{idx + 1}</div>
                            </div>
                            
                            {/* Content */}
                            <div className="p-6 flex-1">
                                <h4 className="font-bold text-lg text-slate-800 dark:text-white mb-4">{result.question}</h4>
                                
                                <div className="grid md:grid-cols-2 gap-4 mb-4">
                                    <div className={`p-3 rounded-xl ${result.isCorrect ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'}`}>
                                        <p className="text-xs font-bold uppercase opacity-60 mb-1">Bạn trả lời</p>
                                        <p className={`font-bold ${result.isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                                            {result.userAnswer || "(Bỏ trống)"}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                                        <p className="text-xs font-bold uppercase opacity-60 mb-1">Đáp án đúng</p>
                                        <p className="font-bold text-slate-800 dark:text-slate-200">{result.correctAnswer}</p>
                                        {result.acceptedKeywords.length > 0 && (
                                            <p className="text-xs text-slate-500 mt-1">Hoặc: {result.acceptedKeywords.join(', ')}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-400 p-4 rounded-r-xl">
                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                                        <span className="font-bold text-amber-600 dark:text-amber-400 block mb-1 flex items-center gap-2"><Lightbulb className="w-4 h-4" /> Giải thích chi tiết:</span>
                                        {result.explanation}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return null;
};
