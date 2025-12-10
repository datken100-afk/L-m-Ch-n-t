
import React, { useState, useRef, useEffect } from 'react';
import { generateStationQuestionFromImage, analyzeResultWithOtter, STORAGE_API_KEY } from '../services/geminiService';
import { StationItem, MentorResponse } from '../types';
import { Play, Timer, ArrowRight, CheckCircle, Eye, Activity, FileText, Crosshair, Database, Sparkles, FileUp, Loader2, ZoomIn, ZoomOut, RefreshCw, Check, X, ThumbsUp, ShieldAlert, AlertCircle, Lightbulb, List, Search, Book, Move, Maximize2, BrainCircuit, Stethoscope, Milestone, Footprints, Trophy, Trees } from 'lucide-react';
import { ThemeType } from '../App';

// Declare pdfjsLib globally
declare const pdfjsLib: any;

interface StationModeProps {
  onBack: () => void;
  theme: ThemeType;
  onExamComplete?: () => void;
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

// New interface for prepared questions
interface PreparedStation {
    image: string;
    questionData: {
        questionText: string;
        correctAnswer: string;
        acceptedKeywords: string[];
        explanation: string;
    }
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

export const StationMode: React.FC<StationModeProps> = ({ onBack, theme, onExamComplete }) => {
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
    const [preparedStations, setPreparedStations] = useState<PreparedStation[]>([]);
    const [stationResults, setStationResults] = useState<StationResult[]>([]);
    
    // Loading State
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingText, setLoadingText] = useState('');
    const [validFoundCount, setValidFoundCount] = useState(0); 
    
    // Running State
    const [currentStationIdx, setCurrentStationIdx] = useState(0);
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

    // --- ANSWER CHECKING LOGIC ---
    
    const normalizeAnswer = (str: string) => {
        if (!str) return "";
        let s = str.toLowerCase().trim();
        // Replace punctuation with space
        s = s.replace(/[.,:;()\-]/g, " ");
        
        // Expand abbreviations (must be whole words)
        const abbreviations: Record<string, string> = {
            "đm": "động mạch",
            "tm": "tĩnh mạch",
            "tk": "thần kinh",
            "dc": "dây chằng",
            "gm": "gân mạc",
            "hạch": "hạch bạch huyết",
            "nm": "niêm mạc"
        };
        
        s = s.split(" ").map(word => abbreviations[word] || word).join(" ");
        
        // Remove extra spaces
        s = s.replace(/\s+/g, " ").trim();
        return s;
    };

    // Function to remove generic anatomical prefixes to find the "core" name
    const getCoreName = (str: string) => {
        const prefixes = [
            "cơ", "xương", "động mạch", "tĩnh mạch", "thần kinh", "dây chằng", 
            "khớp", "xoang", "ngách", "rãnh", "hố", "mào", "gai", "củ", "lồi cầu",
            "bờ", "mặt", "ngành", "thân", "đầu", "cổ"
        ];
        // Create regex from prefixes
        const prefixRegex = new RegExp(`^(${prefixes.join("|")})\\s+`, "i");
        return str.replace(prefixRegex, "").trim();
    };

    const checkAnswer = (userRaw: string, correctRaw: string, keywords: string[] = []) => {
        const u = normalizeAnswer(userRaw);
        const c = normalizeAnswer(correctRaw);
        
        if (!u) return false;
        
        // 1. Exact Match (Normalized)
        if (u === c) return true;
        
        // 2. Keyword Match
        if (keywords && keywords.some(k => normalizeAnswer(k) === u)) return true;
        
        // 3. Core Name Match (ignoring prefixes like "cơ", "xương" if user omitted them)
        const cCore = getCoreName(c);
        const uCore = getCoreName(u); 
        
        if (u === cCore) return true; // Correct: "Cơ A", User: "A"
        if (uCore === c) return true; // Correct: "A", User: "Cơ A"
        if (uCore === cCore && uCore.length > 2) return true; // Both typed "A" (ignoring prefixes)
        
        // 4. Substring Match (The user answer is a significant part of the correct answer)
        // Constraint: User answer must be at least 60% of the length of correct answer
        if (c.includes(u) && u.length >= c.length * 0.6) return true;
        
        return false;
    }

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
            case 'folklore': return {
                primary: 'bg-gradient-to-r from-zinc-500 to-slate-600',
                accent: 'text-slate-600',
                bg: 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700',
                icon: 'text-slate-500',
                rangeColor: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800',
                inputFocus: 'focus:ring-slate-500'
            };
            case 'ttpd': return {
                primary: 'bg-gradient-to-r from-stone-500 to-neutral-600',
                accent: 'text-stone-600',
                bg: 'bg-[#f5f5f4] dark:bg-[#1c1917] border-stone-300 dark:border-stone-700',
                icon: 'text-stone-500',
                rangeColor: 'text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-800',
                inputFocus: 'focus:ring-stone-500'
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

    // Loading logic ...
    const getLoadingStyles = () => {
        switch (theme) {
            case 'xmas': return { 
                bar: 'bg-red-500', 
                shadow: 'shadow-red-500/50', 
                icon: '🎅', 
                title: 'ÔNG GIÀ NOEL ĐANG SOẠN QUÀ...', 
                titleGradient: 'from-red-500 to-green-600',
                overlayBg: 'bg-red-50/95 dark:bg-red-950/95 backdrop-blur-xl',
                textColor: 'text-red-800 dark:text-red-100'
            };
            case 'showgirl': return { 
                bar: 'bg-orange-500', 
                shadow: 'shadow-orange-500/50', 
                icon: '💃', 
                title: 'ĐANG BẬT ĐÈN SÂN KHẤU...', 
                titleGradient: 'from-orange-400 via-yellow-400 to-teal-400',
                overlayBg: 'bg-slate-900/98 backdrop-blur-xl',
                textColor: 'text-orange-100'
            };
            case 'swift': return { 
                bar: 'bg-purple-500', 
                shadow: 'shadow-purple-500/50', 
                icon: '🐍', 
                title: 'THE ERAS TOUR ĐANG BẮT ĐẦU...', 
                titleGradient: 'from-indigo-500 via-purple-500 to-pink-500',
                overlayBg: 'bg-[#1a1a2e]/95 backdrop-blur-xl',
                textColor: 'text-purple-100'
            };
            case 'blackpink': return { 
                bar: 'bg-pink-500', 
                shadow: 'shadow-pink-500/50', 
                icon: '🖤', 
                title: 'BLACKPINK IN YOUR AREA...', 
                titleGradient: 'from-pink-500 to-slate-900',
                overlayBg: 'bg-black/95 backdrop-blur-xl',
                textColor: 'text-pink-100'
            };
            case 'aespa': return { 
                bar: 'bg-indigo-500', 
                shadow: 'shadow-indigo-500/50', 
                icon: '👽', 
                title: 'SYNK DIVE INTO KWANGYA...', 
                titleGradient: 'from-indigo-400 to-purple-600',
                overlayBg: 'bg-slate-900/95 backdrop-blur-xl',
                textColor: 'text-indigo-100'
            };
            case 'rosie': return { 
                bar: 'bg-rose-500', 
                shadow: 'shadow-rose-500/50', 
                icon: '🌹', 
                title: 'APT. APT. ĐANG LOAD...', 
                titleGradient: 'from-rose-500 to-red-600',
                overlayBg: 'bg-rose-50/95 dark:bg-rose-950/95 backdrop-blur-xl',
                textColor: 'text-rose-800 dark:text-rose-100'
            };
            case 'pkl': return { 
                bar: 'bg-cyan-500', 
                shadow: 'shadow-cyan-500/50', 
                icon: '🗡️', 
                title: 'G1VN ĐANG TRIỂN KHAI...', 
                titleGradient: 'from-cyan-500 to-blue-600',
                overlayBg: 'bg-slate-800/95 backdrop-blur-xl',
                textColor: 'text-cyan-100'
            };
            case '1989': return { 
                bar: 'bg-sky-400', 
                shadow: 'shadow-sky-400/50', 
                icon: '🕊️', 
                title: 'WELCOME TO NEW YORK...', 
                titleGradient: 'from-sky-400 to-blue-500',
                overlayBg: 'bg-sky-50/95 dark:bg-slate-900/95 backdrop-blur-xl',
                textColor: 'text-sky-800 dark:text-sky-100'
            };
            case 'folklore': return { 
                bar: 'bg-zinc-500', 
                shadow: 'shadow-zinc-500/50', 
                icon: '🌲', 
                title: 'LOST IN THE WOODS...', 
                titleGradient: 'from-zinc-500 to-slate-600',
                overlayBg: 'bg-zinc-100/95 dark:bg-zinc-900/95 backdrop-blur-xl',
                textColor: 'text-slate-700 dark:text-zinc-200'
            };
            case 'ttpd': return { 
                bar: 'bg-stone-500', 
                shadow: 'shadow-stone-500/50', 
                icon: '🖋️', 
                title: 'THE CHAIRMAN IS WRITING...', 
                titleGradient: 'from-stone-500 to-neutral-600',
                overlayBg: 'bg-[#f5f5f4]/95 dark:bg-[#1c1917]/95 backdrop-blur-xl',
                textColor: 'text-stone-800 dark:text-stone-200'
            };
            case 'evermore': return { 
                bar: 'bg-orange-700', 
                shadow: 'shadow-orange-700/50', 
                icon: '🍂', 
                title: 'LONG STORY SHORT...', 
                titleGradient: 'from-orange-700 to-amber-800',
                overlayBg: 'bg-[#fffbeb]/95 dark:bg-[#271c19]/95 backdrop-blur-xl',
                textColor: 'text-orange-900 dark:text-orange-100'
            };
            default: return { 
                bar: 'bg-blue-500', 
                shadow: 'shadow-blue-500/50', 
                icon: '🦦', 
                title: 'RÁI CÁ ĐANG CHUẨN BỊ TRẠM...', 
                titleGradient: 'from-blue-500 to-purple-600',
                overlayBg: 'bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-xl',
                textColor: 'text-slate-700 dark:text-slate-200'
            };
        }
    };
    const loadingStyle = getLoadingStyles();

    useEffect(() => {
        let interval: any;
        if (step === StationStep.RUNNING && preparedStations.length > 0) {
            interval = setInterval(() => {
                setTimeLeft(prev => Math.max(0, prev - 1));
            }, 1000);
        }
        return () => { if (interval) clearInterval(interval); };
    }, [step, preparedStations]);

    useEffect(() => {
        if (timeLeft === 0 && step === StationStep.RUNNING && preparedStations.length > 0) {
            handleMoveToNextStation();
        }
    }, [timeLeft, step, preparedStations]);

    useEffect(() => {
        if (step === StationStep.RUNNING && answerInputRef.current) answerInputRef.current.focus();
        setScale(1); setPosition({ x: 0, y: 0 });
    }, [step, currentStationIdx]);

    const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // MAIN FUNCTION: PREPARE EXAM
    const prepareExam = async () => {
        if (!file) return;
        setStep(StationStep.GENERATING);
        setLoadingProgress(0);
        setLoadingText("Đang tải file PDF...");
        setValidFoundCount(0);
        setPreparedStations([]);
        
        try {
            const buffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
            
            const effectiveEndPage = Math.min(endPage, pdf.numPages);
            const effectiveStartPage = Math.max(1, startPage);

            // Candidates
            const candidatePairs: number[] = [];
            for (let i = effectiveStartPage; i < effectiveEndPage; i++) candidatePairs.push(i);
            const shuffledCandidates = candidatePairs.sort(() => 0.5 - Math.random());
            
            setLoadingText("Đang quét định khu giải phẫu (Fast Scan)...");
            let validCount = 0;
            const validStations: PreparedStation[] = [];
            
            // OPTIMIZED: Increased Batch Size + Text Filtering
            const BATCH_SIZE = 4; 

            const searchTopic = topic.trim() ? topic : "Giải phẫu học";

            try {
                for (let i = 0; i < shuffledCandidates.length; i += BATCH_SIZE) {
                    if (validCount >= limitStations) break;

                    const batch = shuffledCandidates.slice(i, i + BATCH_SIZE);
                    setLoadingText(`Đang quét nhóm ${batch.length} trang... (Đã tìm thấy: ${validCount}/${limitStations})`);

                    // Execute Batch
                    const results = await Promise.all(batch.map(async (pageIndex) => {
                        try {
                            const page = await pdf.getPage(pageIndex);
                            
                            // 1. FAST FAIL: CHECK TEXT CONTENT FIRST
                            // Get text content to filter out Textbook pages (too many words) or Index pages
                            const textContent = await page.getTextContent();
                            const textItems = textContent.items.map((item: any) => item.str).join(' ');
                            
                            // Heuristic: Atlas images usually have labels (numbers) and minimal text.
                            // Textbook pages have huge chunks of text.
                            if (textItems.length > 2000) {
                                // Skip this page, it's likely text-heavy
                                return { success: false };
                            }
                            if (textItems.length < 10) {
                                // Skip empty/blank pages
                                return { success: false };
                            }

                            // 2. OPTIMIZED RENDER: Reduce Scale from 2.0 to 1.5
                            // 1.5 is sufficient for Gemini 2.5 Flash to read numbers, but much smaller payload.
                            const viewport = page.getViewport({ scale: 1.5 }); 
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
                            await page.render({ canvasContext: context, viewport: viewport }).promise;
                            const imgBase64 = canvas.toDataURL('image/jpeg', 0.80); // Compress slightly more (0.85 -> 0.80)

                            // Answer Page (Next Page)
                            // Also optimization: only render if first page passed checks
                            const pageAns = await pdf.getPage(pageIndex + 1);
                            const viewportAns = pageAns.getViewport({ scale: 1.5 });
                            const canvasAns = document.createElement('canvas');
                            const contextAns = canvasAns.getContext('2d');
                            canvasAns.height = viewportAns.height;
                            canvasAns.width = viewportAns.width;
                            await pageAns.render({ canvasContext: contextAns, viewport: viewportAns }).promise;
                            const answerImgBase64 = canvasAns.toDataURL('image/jpeg', 0.80);

                            // AI Call
                            const result = await generateStationQuestionFromImage(imgBase64, answerImgBase64, "Giải phẫu học", searchTopic);
                            
                            if (result.isValid && result.questions.length > 0) {
                                return {
                                    success: true,
                                    station: { image: imgBase64, questionData: result.questions[0] }
                                };
                            }
                        } catch (e: any) {
                            // CRITICAL ERROR HANDLING
                            if (e.message === "QUOTA_EXCEEDED" || e.message.includes("429") || e.message.includes("quota")) {
                                throw new Error("QUOTA_EXCEEDED"); // Abort Promise.all via throw
                            }
                            if (e.message === "MISSING_API_KEY" || e.message === "INVALID_API_KEY") {
                                throw new Error("AUTH_ERROR");
                            }
                            // Non-critical error (e.g. PDF render fail), just ignore this page
                            console.warn(`Page ${pageIndex} failed:`, e);
                        }
                        return { success: false };
                    }));

                    // Process Results
                    for (const res of results) {
                        if (res && res.success && res.station) {
                            validStations.push(res.station);
                            validCount++;
                            if (validCount >= limitStations) break;
                        }
                    }
                    setValidFoundCount(validCount);
                    setLoadingProgress((validCount / limitStations) * 100);

                    // Reduced Wait Time (1000ms is usually safe for Flash tier)
                    if (validCount < limitStations && i + BATCH_SIZE < shuffledCandidates.length) {
                        await wait(1000); 
                    }
                }
            } catch (err: any) {
                // Handle Aborts
                if (err.message === "QUOTA_EXCEEDED") {
                    const hasCustomKey = localStorage.getItem(STORAGE_API_KEY);
                    if (hasCustomKey) {
                        alert("API Key của bạn đã chạm giới hạn (Rate Limit/Quota) của Google. Vui lòng thử lại sau ít phút hoặc kiểm tra hạn mức trên Google AI Studio.");
                    } else {
                        alert("Hệ thống quá tải (Hết Quota miễn phí). Vui lòng vào Cài đặt (Alt+U) > 'Cấu hình API Key' để nhập Key cá nhân và tiếp tục sử dụng.");
                    }
                    setStep(StationStep.SETUP);
                    return;
                }
                if (err.message === "AUTH_ERROR") {
                    alert("API Key không hợp lệ hoặc chưa được cấu hình. Vui lòng kiểm tra lại trong Cài đặt.");
                    setStep(StationStep.SETUP);
                    return;
                }
                throw err; // Unknown error
            }
            
            if (validStations.length === 0) {
                alert("Không tìm thấy hình ảnh phù hợp. Vui lòng thử chủ đề khác.");
                setStep(StationStep.SETUP);
            } else {
                if (validStations.length < limitStations) {
                    alert(`Đã tìm thấy ${validStations.length} trạm (Yêu cầu ${limitStations}).`);
                }
                setPreparedStations(validStations);
                setStationResults([]);
                setCurrentStationIdx(0);
                setStep(StationStep.RUNNING);
                setTimeLeft(timeLimit);
                setCurrentUserAnswer('');
            }

        } catch (err) {
            console.error(err);
            alert("Lỗi xử lý. Vui lòng thử lại.");
            setStep(StationStep.SETUP);
        }
    };

    const handleMoveToNextStation = () => {
        const currentStation = preparedStations[currentStationIdx];
        if (!currentStation) return;

        // Use smart check logic
        const isCorrect = checkAnswer(currentUserAnswer, currentStation.questionData.correctAnswer, currentStation.questionData.acceptedKeywords);

        setStationResults(prev => [...prev, {
            image: currentStation.image,
            question: currentStation.questionData.questionText,
            userAnswer: currentUserAnswer,
            correctAnswer: currentStation.questionData.correctAnswer,
            acceptedKeywords: currentStation.questionData.acceptedKeywords || [],
            explanation: currentStation.questionData.explanation,
            isCorrect: isCorrect
        }]);
        
        const nextIdx = currentStationIdx + 1;
        if (nextIdx < preparedStations.length) {
            setCurrentStationIdx(nextIdx);
            setCurrentUserAnswer('');
            setTimeLeft(timeLimit);
            setScale(1); setPosition({ x: 0, y: 0 });
        } else {
            finishExam();
        }
    };

    const finishExam = () => {
        setStep(StationStep.SUMMARY);
        if (onExamComplete) onExamComplete();
    };

    // --- IMAGE VIEWER HANDLERS ---
    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        setScale(prev => Math.min(Math.max(1, prev + e.deltaY * -0.001), 4));
    };
    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1) { setIsDragging(true); dragStartRef.current = { x: e.clientX - position.x, y: e.clientY - position.y }; }
    };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && dragStartRef.current) setPosition({ x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y });
    };
    const handleMouseUp = () => setIsDragging(false);

    const handleConsultMentor = async () => {
        setMentorLoading(true);
        try {
            const stats = { "Thực hành": { correct: stationResults.filter(r => r.isCorrect).length, total: stationResults.length } };
            const analyzeResult = await analyzeResultWithOtter(topic || "Chạy trạm", stats);
            setMentorData(analyzeResult);
            setTimeout(() => mentorSectionRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch (e) {
            alert("Rái cá đang bận!");
        } finally {
            setMentorLoading(false);
        }
    };

    // --- RENDER ---
    if (step === StationStep.GENERATING) {
        return (
            <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center backdrop-blur-md ${loadingStyle.overlayBg}`}>
                <div className="w-full max-w-2xl p-8 relative text-center">
                    <div className="text-6xl mb-6 animate-bounce">{loadingStyle.icon}</div>
                    <h3 className={`text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r ${loadingStyle.titleGradient} mb-12 animate-pulse`}>{loadingStyle.title}</h3>
                    <div className="relative w-full h-4 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <div className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${loadingStyle.bar} ${loadingStyle.shadow}`} style={{ width: `${loadingProgress}%` }}></div>
                    </div>
                    <div className="mt-12">
                        <p className={`text-xl font-bold animate-fade-up ${loadingStyle.textColor}`}>{loadingText}</p>
                        <p className={`text-sm mt-2 opacity-80 ${loadingStyle.textColor}`}>Đã tìm thấy: <strong>{validFoundCount}</strong>/{limitStations}</p>
                        <p className={`text-xs mt-1 italic opacity-60 ${loadingStyle.textColor}`}>(Đang lọc bỏ trang text và xử lý Batch...)</p>
                    </div>
                </div>
            </div>
        );
    }

    if (step === StationStep.SETUP) {
        return (
            <div className="max-w-3xl mx-auto pb-20 px-4">
                <div className="flex items-center mb-6">
                    <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"><ArrowRight className="w-6 h-6 rotate-180" /></button>
                    <h2 className="text-xl font-medium text-slate-500 dark:text-slate-400">Quay lại</h2>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-4 mb-8">
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 ${styles.icon}`}><Crosshair className="w-8 h-8" /></div>
                        <div><h1 className="text-3xl font-bold text-slate-900 dark:text-white">Thi Chạy Trạm</h1><p className="text-slate-500">Tải lên tài liệu (Atlas/Slide) để tạo bài thi.</p></div>
                    </div>
                    <div className="space-y-8">
                        <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 ${file ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-slate-300 dark:border-slate-700'}`}>
                            <input type="file" ref={fileInputRef} accept=".pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                            {file ? <div className="text-green-600"><FileText className="w-12 h-12 mx-auto mb-2" /><p className="font-bold">{file.name}</p></div> : <div className="text-slate-400"><FileUp className="w-12 h-12 mx-auto mb-3" /><p className="font-bold">Chọn file PDF (Atlas)</p></div>}
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Chọn chương (Gray's Anatomy)</label>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">{GRAYS_SECTIONS.map(sec => (<button key={sec.id} onClick={() => { setActivePresetId(sec.id); setStartPage(sec.range[0]); setEndPage(sec.range[1]); setTopic(sec.keywords.join(', ')); }} className={`px-3 py-2 rounded-xl border text-xs font-bold text-left transition-all ${activePresetId === sec.id ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>{sec.name}</button>))}</div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-8">
                             <div><label className="block text-sm font-bold text-slate-700 mb-4 flex justify-between"><span>Số lượng trạm</span><span className={`px-2 py-0.5 rounded text-xs font-bold ${styles.rangeColor}`}>{limitStations}</span></label><input type="range" min="5" max="30" step="1" value={limitStations} onChange={(e) => setLimitStations(Number(e.target.value))} className="liquid-slider w-full" style={{ '--range-progress': `${((limitStations - 5) / 25) * 100}%` } as React.CSSProperties} /></div>
                             <div><label className="block text-sm font-bold text-slate-700 mb-4 flex justify-between"><span>Thời gian/trạm</span><span className={`px-2 py-0.5 rounded text-xs font-bold ${styles.rangeColor}`}>{timeLimit}s</span></label><input type="range" min="15" max="120" step="15" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))} className="liquid-slider w-full" style={{ '--range-progress': `${((timeLimit - 15) / 105) * 100}%` } as React.CSSProperties} /></div>
                        </div>
                        <div><label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Chủ đề trọng tâm</label><input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="VD: Tim, Phổi..." className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-blue-500" /></div>
                        <button onClick={prepareExam} disabled={!file} className={`w-full py-5 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 text-lg ${!file ? 'bg-slate-300 cursor-not-allowed' : styles.primary}`}><Play className="w-6 h-6" /><span>Bắt đầu thi ngay</span></button>
                    </div>
                </div>
            </div>
        );
    }

    if (step === StationStep.RUNNING) {
        const currentStation = preparedStations[currentStationIdx];
        return (
            <div className="h-[calc(100vh-6rem)] flex flex-col md:flex-row gap-4 px-4 pb-4 max-w-[1600px] mx-auto">
                <div className="flex-1 md:flex-[7] bg-black rounded-3xl relative overflow-hidden group border border-slate-800 shadow-2xl flex flex-col">
                    <div className="absolute top-4 left-4 z-20 bg-black/50 text-white px-3 py-1 rounded-full text-sm font-mono backdrop-blur-md">Station {currentStationIdx + 1}/{preparedStations.length}</div>
                    <div className="flex-1 relative overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center" onWheel={handleWheel} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
                        <img ref={imageRef} src={currentStation?.image} alt="Station" className="max-w-full max-h-full object-contain transition-transform duration-100 ease-out select-none" style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }} draggable={false} />
                    </div>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20 bg-black/60 p-2 rounded-2xl backdrop-blur-md border border-white/10">
                        <button onClick={() => setScale(Math.max(1, scale - 0.5))} className="p-2 hover:bg-white/20 rounded-xl text-white"><ZoomOut className="w-5 h-5" /></button>
                        <span className="text-white text-xs font-mono flex items-center px-2 w-12 justify-center">{Math.round(scale * 100)}%</span>
                        <button onClick={() => setScale(Math.min(4, scale + 0.5))} className="p-2 hover:bg-white/20 rounded-xl text-white"><ZoomIn className="w-5 h-5" /></button>
                        <div className="w-[1px] bg-white/20 mx-1"></div>
                        <button onClick={() => { setScale(1); setPosition({x:0,y:0}); }} className="p-2 hover:bg-white/20 rounded-xl text-white"><RefreshCw className="w-5 h-5" /></button>
                    </div>
                </div>
                <div className="md:flex-[3] bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl p-6 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm uppercase tracking-wider"><Crosshair className="w-4 h-4" /> Câu hỏi</div>
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono font-bold text-lg border ${timeLeft < 10 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-slate-100 text-slate-700 border-slate-200'}`}><Timer className="w-4 h-4" /> {timeLeft}s</div>
                    </div>
                    <div className="flex-1 flex flex-col justify-center mb-6">
                        <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-white leading-relaxed">{currentStation?.questionData.questionText}</h3>
                        <p className="text-slate-500 text-sm mt-2 italic">(Nhập tên cấu trúc chính xác)</p>
                    </div>
                    <div className="mt-auto">
                        <input ref={answerInputRef} type="text" value={currentUserAnswer} onChange={(e) => setCurrentUserAnswer(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleMoveToNextStation()} placeholder="Nhập đáp án..." className={`w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-lg font-medium outline-none transition-all mb-4 ${styles.inputFocus} focus:ring-2`} autoComplete="off" />
                        <button onClick={handleMoveToNextStation} className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${styles.primary}`}>{currentStationIdx === preparedStations.length - 1 ? "Nộp bài" : "Tiếp tục"} <ArrowRight className="w-5 h-5" /></button>
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
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700 mb-8 text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-500 to-blue-500"></div>
                    <div className="w-20 h-20 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-4xl shadow-inner">{percentage >= 80 ? '🏆' : '📚'}</div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Kết quả Chạy trạm</h1>
                    <div className="flex items-center justify-center gap-4 text-slate-500 mb-6">
                        <span className="flex items-center gap-1"><Trophy className="w-4 h-4" /> {correctCount}/{stationResults.length}</span>
                        <span className="flex items-center gap-1"><Timer className="w-4 h-4" /> {timeLimit}s/trạm</span>
                    </div>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => setStep(StationStep.SETUP)} className="px-6 py-3 rounded-xl border border-slate-200 font-bold hover:bg-slate-50">Làm đề mới</button>
                        {!mentorData && <button onClick={handleConsultMentor} disabled={mentorLoading} className={`px-6 py-3 rounded-xl text-white font-bold shadow-lg ${styles.primary}`}>{mentorLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "🦦 Phân tích"}</button>}
                    </div>
                </div>
                {mentorData && (
                    <div ref={mentorSectionRef} className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-800 rounded-3xl p-8 shadow-xl border border-indigo-100 mb-8 animate-in slide-in-from-bottom-10">
                        <div className="flex items-center gap-4 mb-6"><div className="text-4xl animate-bounce">🦦</div><div><h3 className="text-xl font-bold text-indigo-900 dark:text-indigo-100">Nhận xét từ Rái Cá</h3></div></div>
                        <p className="text-slate-700 dark:text-slate-300 italic mb-6">"{mentorData.analysis}"</p>
                    </div>
                )}
                <div className="space-y-6">
                    {stationResults.map((result, idx) => (
                        <div key={idx} className={`bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border-2 ${result.isCorrect ? 'border-green-100' : 'border-red-100'} shadow-sm flex flex-col md:flex-row`}>
                            <div className="w-full md:w-48 h-48 bg-black flex items-center justify-center relative shrink-0"><img src={result.image} alt={`Station ${idx + 1}`} className="max-w-full max-h-full object-contain" /><div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs font-bold">#{idx + 1}</div></div>
                            <div className="p-6 flex-1">
                                <h4 className="font-bold text-lg text-slate-800 dark:text-white mb-4">{result.question}</h4>
                                <div className="grid md:grid-cols-2 gap-4 mb-4">
                                    <div className={`p-3 rounded-xl ${result.isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}><p className="text-xs font-bold uppercase opacity-60 mb-1">Bạn trả lời</p><p className={`font-bold ${result.isCorrect ? 'text-green-700' : 'text-red-700'}`}>{result.userAnswer || "(Bỏ trống)"}</p></div>
                                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100"><p className="text-xs font-bold uppercase opacity-60 mb-1">Đáp án đúng</p><p className="font-bold text-slate-800">{result.correctAnswer}</p></div>
                                </div>
                                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-xl"><p className="text-sm text-slate-700"><span className="font-bold text-amber-600 block mb-1 flex items-center gap-2"><Lightbulb className="w-4 h-4" /> Giải thích:</span>{result.explanation}</p></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};
