
import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Plus, Save, Trash2, Edit, Play, RotateCw, Layers, ChevronLeft, ChevronRight, StickyNote, LayoutGrid, BrainCircuit, Clock, Calendar, BarChart3, CheckCircle2, ThumbsUp, ThumbsDown, Hand } from 'lucide-react';
import { ThemeType } from '../App';
import { FlashcardDeck, Flashcard, FlashcardSRData } from '../types';

interface FlashcardModeProps {
    onBack: () => void;
    theme: ThemeType;
}

type ViewState = 'LIST' | 'EDITOR' | 'STUDY';
type StudyMode = 'LINEAR' | 'SMART'; // LINEAR = Cũ, SMART = Spaced Repetition

// SR Constants
const SR_GRADES = {
    AGAIN: 1,
    HARD: 2,
    GOOD: 3,
    EASY: 4
};

export const FlashcardMode: React.FC<FlashcardModeProps> = ({ onBack, theme }) => {
    const [view, setView] = useState<ViewState>('LIST');
    const [decks, setDecks] = useState<FlashcardDeck[]>([]);
    const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);

    // Editor State
    const [deckTitle, setDeckTitle] = useState('');
    const [deckDesc, setDeckDesc] = useState('');
    const [editingCards, setEditingCards] = useState<Flashcard[]>([]);

    // Study State
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [studyMode, setStudyMode] = useState<StudyMode>('LINEAR');
    
    // Smart Study Queue (Indices of cards in the activeDeck)
    const [smartQueue, setSmartQueue] = useState<number[]>([]);
    const [sessionStats, setSessionStats] = useState({ reviewed: 0, again: 0 });

    // Swipe Gesture State
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragStartRef = useRef<{ x: number, y: number } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Load Decks from LocalStorage
    useEffect(() => {
        const saved = localStorage.getItem('otter_flashcards');
        if (saved) {
            try {
                setDecks(JSON.parse(saved));
            } catch (e) {
                console.error("Failed to load flashcards", e);
            }
        }
    }, []);

    // Save Decks to LocalStorage
    const saveDecksToStorage = (newDecks: FlashcardDeck[]) => {
        setDecks(newDecks);
        localStorage.setItem('otter_flashcards', JSON.stringify(newDecks));
    };

    const getThemeStyles = () => {
        switch (theme) {
            case 'xmas': return {
                gradient: 'from-red-600 to-green-700',
                accent: 'text-red-600',
                bgSoft: 'bg-red-50 dark:bg-red-900/20',
                btnPrimary: 'bg-red-600 hover:bg-red-700',
                btnSecondary: 'bg-green-600 hover:bg-green-700',
                cardBorder: 'border-red-200 dark:border-red-800',
            };
            case 'swift': return {
                gradient: 'from-pink-400 via-purple-400 to-indigo-400',
                accent: 'text-purple-600',
                bgSoft: 'bg-purple-50 dark:bg-purple-900/20',
                btnPrimary: 'bg-purple-600 hover:bg-purple-700',
                btnSecondary: 'bg-pink-500 hover:bg-pink-600',
                cardBorder: 'border-purple-200 dark:border-purple-800',
            };
            case 'blackpink': return {
                gradient: 'from-pink-500 to-black',
                accent: 'text-pink-500',
                bgSoft: 'bg-pink-50 dark:bg-pink-900/10',
                btnPrimary: 'bg-pink-600 hover:bg-pink-700',
                btnSecondary: 'bg-slate-800 hover:bg-slate-900',
                cardBorder: 'border-pink-200 dark:border-pink-800',
            };
            case 'aespa': return {
                gradient: 'from-indigo-900 to-purple-900',
                accent: 'text-indigo-400',
                bgSoft: 'bg-indigo-50 dark:bg-indigo-900/20',
                btnPrimary: 'bg-indigo-600 hover:bg-indigo-700',
                btnSecondary: 'bg-purple-600 hover:bg-purple-700',
                cardBorder: 'border-indigo-200 dark:border-indigo-800',
            };
            case 'rosie': return {
                gradient: 'from-rose-500 to-red-600',
                accent: 'text-rose-600',
                bgSoft: 'bg-rose-50 dark:bg-rose-900/20',
                btnPrimary: 'bg-rose-600 hover:bg-rose-700',
                btnSecondary: 'bg-red-600 hover:bg-red-700',
                cardBorder: 'border-rose-200 dark:border-rose-800',
            };
            case 'pkl': return {
                gradient: 'from-slate-700 via-cyan-700 to-slate-800',
                accent: 'text-cyan-500',
                bgSoft: 'bg-cyan-50 dark:bg-cyan-900/20',
                btnPrimary: 'bg-cyan-600 hover:bg-cyan-700',
                btnSecondary: 'bg-slate-600 hover:bg-slate-700',
                cardBorder: 'border-cyan-200 dark:border-cyan-800',
            };
            case 'showgirl': return {
                gradient: 'from-teal-600 to-orange-500',
                accent: 'text-orange-500',
                bgSoft: 'bg-orange-50 dark:bg-orange-900/20',
                btnPrimary: 'bg-orange-500 hover:bg-orange-600',
                btnSecondary: 'bg-teal-500 hover:bg-teal-600',
                cardBorder: 'border-orange-200 dark:border-orange-800',
            };
            default: return {
                gradient: 'from-amber-400 to-orange-600',
                accent: 'text-amber-600',
                bgSoft: 'bg-amber-50 dark:bg-amber-900/20',
                btnPrimary: 'bg-amber-500 hover:bg-amber-600',
                btnSecondary: 'bg-blue-500 hover:bg-blue-600',
                cardBorder: 'border-amber-200 dark:border-amber-800',
            };
        }
    };
    const styles = getThemeStyles();

    // --- ALGORITHM: SPACED REPETITION (Simplified SM-2) ---
    const calculateNextReview = (card: Flashcard, grade: number): FlashcardSRData => {
        const now = Date.now();
        let sr = card.srData || {
            interval: 0,
            ease: 2.5,
            dueDate: now,
            reviewCount: 0,
            state: 'NEW'
        };

        let newInterval = sr.interval;
        let newEase = sr.ease;
        let newState = sr.state;

        if (grade === SR_GRADES.AGAIN) {
            newInterval = 0; // < 1 day (Review in same session usually, but here we just mark as Due Now)
            newEase = Math.max(1.3, newEase - 0.2);
            newState = 'RELEARNING';
        } else {
            // Hard, Good, Easy
            if (sr.state === 'NEW' || sr.state === 'RELEARNING') {
                 newInterval = 1; // Graduate to 1 day
                 newState = 'REVIEW';
            } else {
                // Algorithm for REVIEW state
                if (grade === SR_GRADES.HARD) {
                    newInterval = Math.max(1, newInterval * 1.2);
                    newEase = Math.max(1.3, newEase - 0.15);
                } else if (grade === SR_GRADES.GOOD) {
                    newInterval = Math.max(1, newInterval * 2.5); // Standard multiplier
                } else if (grade === SR_GRADES.EASY) {
                    newInterval = Math.max(1, newInterval * newEase * 1.3);
                    newEase += 0.15;
                }
            }
        }
        
        // If Hard, interval shouldn't jump too much. 
        // Convert Interval (days) to Milliseconds for DueDate
        // If interval is 0, we set it to 1 minute later for immediate review in "Smart" queue context
        // But for storage, we keep interval as days.
        
        const nextDueDate = now + (newInterval === 0 ? 60 * 1000 : newInterval * 24 * 60 * 60 * 1000);

        return {
            interval: newInterval,
            ease: newEase,
            dueDate: nextDueDate,
            reviewCount: sr.reviewCount + 1,
            state: newState as any
        };
    };

    const getNextReviewText = (interval: number): string => {
        if (interval === 0) return "< 1 phút";
        if (interval < 1) return "10 phút"; // Placeholder logic
        if (interval === 1) return "1 ngày";
        return `${Math.round(interval)} ngày`;
    };

    // --- HANDLERS ---

    const handleCreateDeck = () => {
        setDeckTitle('');
        setDeckDesc('');
        setEditingCards([{ id: Date.now().toString(), front: '', back: '' }]);
        setActiveDeck(null);
        setView('EDITOR');
    };

    const handleEditDeck = (deck: FlashcardDeck) => {
        setDeckTitle(deck.title);
        setDeckDesc(deck.description);
        setEditingCards([...deck.cards]);
        setActiveDeck(deck);
        setView('EDITOR');
    };

    const handleDeleteDeck = (id: string) => {
        if (confirm("Bạn có chắc muốn xóa bộ thẻ này không?")) {
            const newDecks = decks.filter(d => d.id !== id);
            saveDecksToStorage(newDecks);
        }
    };

    const handleSaveDeck = () => {
        if (!deckTitle.trim()) return alert("Vui lòng nhập tên bộ thẻ!");
        if (editingCards.length === 0) return alert("Vui lòng thêm ít nhất 1 thẻ!");
        
        // Filter out empty cards
        const validCards = editingCards.filter(c => c.front.trim() || c.back.trim());
        if (validCards.length === 0) return alert("Thẻ không được để trống!");

        const newDeck: FlashcardDeck = {
            id: activeDeck ? activeDeck.id : Date.now().toString(),
            title: deckTitle,
            description: deckDesc,
            cards: validCards,
            createdAt: activeDeck ? activeDeck.createdAt : Date.now()
        };

        let newDecks;
        if (activeDeck) {
            newDecks = decks.map(d => d.id === activeDeck.id ? newDeck : d);
        } else {
            newDecks = [...decks, newDeck];
        }
        
        saveDecksToStorage(newDecks);
        setView('LIST');
    };

    const handleStartStudy = (deck: FlashcardDeck, mode: StudyMode) => {
        if (deck.cards.length === 0) return alert("Bộ thẻ này chưa có nội dung!");
        
        setActiveDeck(deck);
        setStudyMode(mode);
        setIsFlipped(false);
        setSessionStats({ reviewed: 0, again: 0 });
        setDragOffset({ x: 0, y: 0 }); // Reset swipe

        if (mode === 'SMART') {
            const now = Date.now();
            // Filter cards that are New or Due
            const dueIndices = deck.cards
                .map((card, index) => ({ card, index }))
                .filter(({ card }) => !card.srData || card.srData.dueDate <= now)
                .sort((a, b) => {
                    // Sort: New/Relearning first, then by Due Date
                    const aDue = a.card.srData?.dueDate || 0;
                    const bDue = b.card.srData?.dueDate || 0;
                    return aDue - bDue;
                })
                .map(item => item.index);
            
            setSmartQueue(dueIndices);
            // Start with first in queue, or -1 if empty
            if (dueIndices.length > 0) {
                setCurrentCardIndex(dueIndices[0]);
                setView('STUDY');
            } else {
                alert("Bạn đã hoàn thành tất cả thẻ cần ôn tập hôm nay! Hãy quay lại vào ngày mai hoặc chọn 'Ôn tập thường' để xem lại tất cả.");
            }
        } else {
            // Linear Mode
            setCurrentCardIndex(0);
            setView('STUDY');
        }
    };

    const handleSmartGrade = (grade: number) => {
        if (!activeDeck) return;
        
        const card = activeDeck.cards[currentCardIndex];
        const newSRData = calculateNextReview(card, grade);
        
        // Update Card Data
        const updatedCards = [...activeDeck.cards];
        updatedCards[currentCardIndex] = {
            ...card,
            srData: newSRData
        };
        
        // Update Deck in State & Storage
        const updatedDeck = { ...activeDeck, cards: updatedCards };
        setActiveDeck(updatedDeck);
        const newDecks = decks.map(d => d.id === updatedDeck.id ? updatedDeck : d);
        saveDecksToStorage(newDecks);

        // Update Session Stats
        setSessionStats(prev => ({
            reviewed: prev.reviewed + 1,
            again: grade === SR_GRADES.AGAIN ? prev.again + 1 : prev.again
        }));

        // Reset Swipe
        setDragOffset({ x: 0, y: 0 });

        // Move to next card in Smart Queue
        const newQueue = [...smartQueue];
        newQueue.shift(); // Remove current

        // If graded AGAIN, re-queue it at the end of the session (simplified)
        if (grade === SR_GRADES.AGAIN) {
            newQueue.push(currentCardIndex);
        }

        setSmartQueue(newQueue);
        setIsFlipped(false);

        if (newQueue.length > 0) {
            setCurrentCardIndex(newQueue[0]);
        } else {
            // Session Complete
            setView('LIST'); // Or a summary screen
            alert(`Hoàn thành! Bạn đã ôn tập ${sessionStats.reviewed + 1} thẻ.`);
        }
    };

    // --- SWIPE HANDLERS ---
    const handleStart = (clientX: number) => {
        if (studyMode !== 'SMART') return; // Only enable swipe for Smart/SR mode
        dragStartRef.current = { x: clientX, y: 0 };
        setIsDragging(true);
    };

    const handleMove = (clientX: number) => {
        if (!isDragging || !dragStartRef.current) return;
        const deltaX = clientX - dragStartRef.current.x;
        setDragOffset({ x: deltaX, y: 0 });
    };

    const handleEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);
        
        const THRESHOLD = 100; // px to trigger swipe action

        if (dragOffset.x > THRESHOLD) {
            // Swipe Right -> GOOD
            handleSmartGrade(SR_GRADES.GOOD);
        } else if (dragOffset.x < -THRESHOLD) {
            // Swipe Left -> AGAIN
            handleSmartGrade(SR_GRADES.AGAIN);
        } else {
            // Reset if threshold not met
            setDragOffset({ x: 0, y: 0 });
        }
        dragStartRef.current = null;
    };

    // Touch Events
    const onTouchStart = (e: React.TouchEvent) => handleStart(e.touches[0].clientX);
    const onTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX);
    const onTouchEnd = () => handleEnd();

    // Mouse Events
    const onMouseDown = (e: React.MouseEvent) => handleStart(e.clientX);
    const onMouseMove = (e: React.MouseEvent) => handleMove(e.clientX);
    const onMouseUp = () => handleEnd();
    const onMouseLeave = () => { if(isDragging) handleEnd(); };


    // --- SUB-VIEWS ---

    const renderList = () => (
        <div className="max-w-5xl mx-auto pb-20 px-4">
            {/* Header */}
            <div className="flex items-center mb-6">
                <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                    <ArrowRight className="w-6 h-6 rotate-180" />
                </button>
                <h2 className="text-xl font-medium text-slate-500 dark:text-slate-400">Quay lại</h2>
            </div>

            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${styles.gradient} p-8 text-white shadow-xl mb-8 animate-fade-up`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="relative z-10 flex items-center justify-between flex-col md:flex-row gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                            <Layers className="w-10 h-10 text-white drop-shadow-lg" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-glow-white">{theme === 'showgirl' ? "Script Cards" : "Flashcards"}</h1>
                            <p className="text-lg text-white/90">{theme === 'showgirl' ? "Kịch bản bỏ túi cho màn trình diễn." : "Tự tạo bộ thẻ ghi nhớ và ôn tập mọi lúc."}</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleCreateDeck}
                        className="bg-white text-slate-900 px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-slate-50 transition-transform active:scale-95 flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" /> Tạo bộ thẻ mới
                    </button>
                </div>
            </div>

            {decks.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className={`w-20 h-20 mx-auto rounded-full ${styles.bgSoft} flex items-center justify-center mb-4`}>
                        <StickyNote className={`w-10 h-10 ${styles.accent}`} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Chưa có bộ thẻ nào</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6">Hãy tạo bộ thẻ đầu tiên để bắt đầu ôn tập!</p>
                    <button onClick={handleCreateDeck} className={`px-6 py-2 text-white rounded-xl font-bold ${styles.btnPrimary}`}>
                        + Tạo ngay
                    </button>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {decks.map(deck => {
                        // Calculate Due Cards
                        const now = Date.now();
                        const dueCount = deck.cards.filter(c => !c.srData || c.srData.dueDate <= now).length;
                        
                        return (
                        <div key={deck.id} className={`group bg-white dark:bg-slate-900 p-6 rounded-2xl border ${styles.cardBorder} shadow-sm hover:shadow-xl transition-all hover:-translate-y-1`}>
                            <div className="flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-xl ${styles.bgSoft} flex items-center justify-center relative`}>
                                    <LayoutGrid className={`w-6 h-6 ${styles.accent}`} />
                                    {dueCount > 0 && (
                                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900">
                                            {dueCount}
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleEditDeck(deck)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500">
                                        <Edit className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteDeck(deck.id)} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 truncate" title={deck.title}>{deck.title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 min-h-[2.5em]">{deck.description || "Không có mô tả"}</p>
                            
                            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 gap-2">
                                <button 
                                    onClick={() => handleStartStudy(deck, 'LINEAR')}
                                    className="px-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold flex items-center gap-1 transition-colors"
                                    title="Ôn tập thường (Xem tất cả)"
                                >
                                    <RotateCw className="w-3 h-3" /> Xem
                                </button>
                                <button 
                                    onClick={() => handleStartStudy(deck, 'SMART')}
                                    className={`flex-1 px-3 py-2 rounded-lg text-white text-xs font-bold shadow-md flex items-center justify-center gap-1 ${styles.btnSecondary} hover:scale-105 transition-transform`}
                                    title="Học thông minh (Spaced Repetition)"
                                >
                                    <BrainCircuit className="w-3 h-3" /> 
                                    {theme === 'showgirl' ? "Diễn tập (Smart)" : "Học (SR)"}
                                    {dueCount > 0 && <span className="bg-white/20 px-1.5 rounded-full ml-1">{dueCount}</span>}
                                </button>
                            </div>
                        </div>
                    )})}
                </div>
            )}
        </div>
    );

    const renderEditor = () => (
        <div className="max-w-4xl mx-auto pb-20 px-4">
            <div className="flex items-center justify-between mb-6">
                <button onClick={() => setView('LIST')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors">
                    <ArrowRight className="w-5 h-5 rotate-180" /> Quay lại
                </button>
                <button onClick={handleSaveDeck} className={`px-6 py-2 rounded-xl text-white font-bold shadow-lg flex items-center gap-2 ${styles.btnPrimary}`}>
                    <Save className="w-5 h-5" /> Lưu bộ thẻ
                </button>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 mb-8 animate-fade-up">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tên bộ thẻ</label>
                <input 
                    value={deckTitle}
                    onChange={(e) => setDeckTitle(e.target.value)}
                    placeholder="Ví dụ: Giải phẫu tim mạch..."
                    className="w-full text-2xl font-bold bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-amber-500 outline-none pb-2 mb-4 text-slate-900 dark:text-white placeholder-slate-300"
                />
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Mô tả ngắn</label>
                <input 
                    value={deckDesc}
                    onChange={(e) => setDeckDesc(e.target.value)}
                    placeholder="Mô tả nội dung bộ thẻ..."
                    className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-amber-500 outline-none pb-2 text-slate-600 dark:text-slate-300 placeholder-slate-300"
                />
            </div>

            <div className="space-y-4">
                {editingCards.map((card, idx) => (
                    <div key={card.id} className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex gap-4 items-start animate-in slide-in-from-bottom-2">
                        <div className="text-xs font-bold text-slate-300 mt-2 w-6">{idx + 1}</div>
                        <div className="flex-1 grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Mặt trước (Câu hỏi)</label>
                                <textarea 
                                    value={card.front}
                                    onChange={(e) => {
                                        const newCards = [...editingCards];
                                        newCards[idx].front = e.target.value;
                                        setEditingCards(newCards);
                                    }}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-amber-500 outline-none resize-none h-24 text-sm"
                                    placeholder="Nhập nội dung mặt trước..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Mặt sau (Đáp án)</label>
                                <textarea 
                                    value={card.back}
                                    onChange={(e) => {
                                        const newCards = [...editingCards];
                                        newCards[idx].back = e.target.value;
                                        setEditingCards(newCards);
                                    }}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-amber-500 outline-none resize-none h-24 text-sm"
                                    placeholder="Nhập nội dung mặt sau..."
                                />
                            </div>
                        </div>
                        <button 
                            onClick={() => {
                                const newCards = editingCards.filter((_, i) => i !== idx);
                                setEditingCards(newCards);
                            }}
                            className="text-slate-300 hover:text-red-500 p-1 transition-colors mt-8"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>

            <button 
                onClick={() => setEditingCards([...editingCards, { id: Date.now().toString(), front: '', back: '' }])}
                className="w-full py-4 mt-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 font-bold hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-all flex items-center justify-center gap-2"
            >
                <Plus className="w-5 h-5" /> Thêm thẻ mới
            </button>
        </div>
    );

    const renderStudy = () => {
        if (!activeDeck) return null;
        const card = activeDeck.cards[currentCardIndex];

        // Calculate rotation for swipe effect
        const rotate = dragOffset.x * 0.05;
        const opacityRight = Math.min(1, Math.max(0, dragOffset.x / 100));
        const opacityLeft = Math.min(1, Math.max(0, -dragOffset.x / 100));

        const nextCard = () => {
            setIsFlipped(false);
            setDragOffset({ x: 0, y: 0 });
            setTimeout(() => {
                setCurrentCardIndex(prev => (prev + 1) % activeDeck.cards.length);
            }, 150);
        };

        const prevCard = () => {
            setIsFlipped(false);
            setDragOffset({ x: 0, y: 0 });
            setTimeout(() => {
                setCurrentCardIndex(prev => prev === 0 ? activeDeck.cards.length - 1 : prev - 1);
            }, 150);
        };

        return (
            <div className="max-w-3xl mx-auto h-[calc(100vh-10rem)] flex flex-col px-4 select-none touch-none">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={() => setView('LIST')} className="text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors text-sm font-bold flex items-center gap-1">
                        <ArrowRight className="w-4 h-4 rotate-180" /> Thoát
                    </button>
                    
                    {/* Progress / Mode Indicator */}
                    <div className="flex items-center gap-3">
                        {studyMode === 'SMART' ? (
                            <div className="flex items-center gap-2 text-sm font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                <BrainCircuit className="w-4 h-4 text-blue-500" />
                                <span>Còn lại: {smartQueue.length}</span>
                                <span className="text-xs text-slate-300 mx-1">|</span>
                                <div className="flex items-center gap-1 text-[10px]">
                                    <Hand className="w-3 h-3" /> Vuốt để học
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-400 font-mono text-sm">
                                {currentCardIndex + 1} / {activeDeck.cards.length}
                            </div>
                        )}
                    </div>
                </div>

                {/* 3D Flip Container with Swipe Logic */}
                <div 
                    className="flex-1 relative perspective-1000 group cursor-grab active:cursor-grabbing" 
                    onClick={() => { if(!isDragging) setIsFlipped(!isFlipped); }}
                    // Touch Events
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    // Mouse Events
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseLeave}
                    ref={containerRef}
                >
                    <div 
                        className={`relative w-full h-full transform-style-3d ${isDragging ? 'transition-none' : 'transition-all duration-500'}`}
                        style={{ 
                            transform: `translateX(${dragOffset.x}px) rotate(${rotate}deg) ${isFlipped ? 'rotateY(180deg)' : ''}`
                        }}
                    >
                        
                        {/* FRONT */}
                        <div className={`absolute inset-0 backface-hidden bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border-2 ${styles.cardBorder} flex flex-col items-center justify-center p-8 md:p-16 text-center select-none overflow-hidden`}>
                            {/* Visual Overlay for Swipe Right (Green) */}
                            <div 
                                className="absolute inset-0 bg-green-500/20 z-10 flex items-center justify-center transition-opacity pointer-events-none"
                                style={{ opacity: opacityRight }}
                            >
                                <div className="bg-green-500 text-white p-4 rounded-full shadow-lg transform rotate-12 border-4 border-white">
                                    <ThumbsUp className="w-12 h-12" />
                                </div>
                            </div>
                            {/* Visual Overlay for Swipe Left (Red) */}
                            <div 
                                className="absolute inset-0 bg-red-500/20 z-10 flex items-center justify-center transition-opacity pointer-events-none"
                                style={{ opacity: opacityLeft }}
                            >
                                <div className="bg-red-500 text-white p-4 rounded-full shadow-lg transform -rotate-12 border-4 border-white">
                                    <ThumbsDown className="w-12 h-12" />
                                </div>
                            </div>

                            <span className="absolute top-6 left-6 text-xs font-bold text-slate-400 uppercase tracking-widest">Mặt trước</span>
                            {studyMode === 'SMART' && card.srData?.state === 'NEW' && (
                                <span className="absolute top-6 right-6 text-xs font-bold text-white bg-blue-500 px-2 py-1 rounded-full">MỚI</span>
                            )}
                             {studyMode === 'SMART' && card.srData?.state === 'REVIEW' && (
                                <span className="absolute top-6 right-6 text-xs font-bold text-white bg-green-500 px-2 py-1 rounded-full">ÔN TẬP</span>
                            )}
                            {studyMode === 'SMART' && card.srData?.state === 'RELEARNING' && (
                                <span className="absolute top-6 right-6 text-xs font-bold text-white bg-red-500 px-2 py-1 rounded-full">HỌC LẠI</span>
                            )}

                            <div className="text-2xl md:text-4xl font-bold text-slate-800 dark:text-white leading-relaxed">
                                {card.front}
                            </div>
                            <div className="absolute bottom-6 text-slate-400 text-sm animate-pulse flex items-center gap-2">
                                <RotateCw className="w-4 h-4" /> Chạm để lật / Vuốt để đánh giá
                            </div>
                        </div>

                        {/* BACK */}
                        <div className={`absolute inset-0 backface-hidden rotate-y-180 bg-slate-50 dark:bg-slate-800 rounded-3xl shadow-2xl border-2 border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center p-8 md:p-16 text-center select-none overflow-hidden`}>
                             {/* Visual Overlay for Swipe Right (Green) */}
                             <div 
                                className="absolute inset-0 bg-green-500/20 z-10 flex items-center justify-center transition-opacity pointer-events-none"
                                style={{ opacity: opacityRight }}
                            >
                                <div className="bg-green-500 text-white p-4 rounded-full shadow-lg transform rotate-12 border-4 border-white">
                                    <ThumbsUp className="w-12 h-12" />
                                </div>
                            </div>
                            {/* Visual Overlay for Swipe Left (Red) */}
                            <div 
                                className="absolute inset-0 bg-red-500/20 z-10 flex items-center justify-center transition-opacity pointer-events-none"
                                style={{ opacity: opacityLeft }}
                            >
                                <div className="bg-red-500 text-white p-4 rounded-full shadow-lg transform -rotate-12 border-4 border-white">
                                    <ThumbsDown className="w-12 h-12" />
                                </div>
                            </div>

                            <span className="absolute top-6 left-6 text-xs font-bold ${styles.accent} uppercase tracking-widest">Đáp án</span>
                            <div className={`text-xl md:text-3xl font-medium ${styles.accent} leading-relaxed`}>
                                {card.back}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Controls - Dynamic based on Mode */}
                <div className="mt-8 min-h-[80px] flex items-center justify-center">
                    {studyMode === 'LINEAR' ? (
                        <div className="flex items-center justify-center gap-8">
                            <button onClick={prevCard} className="p-4 rounded-full bg-white dark:bg-slate-800 shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-transform active:scale-90">
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <button onClick={() => setIsFlipped(!isFlipped)} className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center gap-2 ${styles.btnPrimary}`}>
                                <RotateCw className="w-5 h-5" /> Lật thẻ
                            </button>
                            <button onClick={nextCard} className="p-4 rounded-full bg-white dark:bg-slate-800 shadow-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-transform active:scale-90">
                                <ChevronRight className="w-6 h-6" />
                            </button>
                        </div>
                    ) : (
                        // SMART MODE CONTROLS
                        <div className="grid grid-cols-4 gap-2 md:gap-4 w-full">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleSmartGrade(SR_GRADES.AGAIN); }}
                                className="flex flex-col items-center justify-center py-3 rounded-xl bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 transition-all active:scale-95"
                            >
                                <span className="text-sm font-bold">Học lại</span>
                                <span className="text-[10px] opacity-70">&lt; 1 phút</span>
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleSmartGrade(SR_GRADES.HARD); }}
                                className="flex flex-col items-center justify-center py-3 rounded-xl bg-orange-100 dark:bg-orange-900/30 hover:bg-orange-200 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800 transition-all active:scale-95"
                            >
                                <span className="text-sm font-bold">Khó</span>
                                <span className="text-[10px] opacity-70">{getNextReviewText(card.srData?.interval ? Math.max(1, card.srData.interval * 1.2) : 1)}</span>
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleSmartGrade(SR_GRADES.GOOD); }}
                                className="flex flex-col items-center justify-center py-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 transition-all active:scale-95"
                            >
                                <span className="text-sm font-bold">Được</span>
                                <span className="text-[10px] opacity-70">{getNextReviewText(card.srData?.interval ? Math.max(1, card.srData.interval * 2.5) : 1)}</span>
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleSmartGrade(SR_GRADES.EASY); }}
                                className="flex flex-col items-center justify-center py-3 rounded-xl bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 transition-all active:scale-95"
                            >
                                <span className="text-sm font-bold">Dễ</span>
                                <span className="text-[10px] opacity-70">{getNextReviewText(card.srData?.interval ? Math.max(4, card.srData.interval * 3.5) : 4)}</span>
                            </button>
                        </div>
                    )}
                </div>
                
                {/* CSS Injection for 3D Flip */}
                <style>{`
                    .perspective-1000 { perspective: 1000px; }
                    .transform-style-3d { transform-style: preserve-3d; }
                    .backface-hidden { backface-visibility: hidden; }
                    .rotate-y-180 { transform: rotateY(180deg); }
                `}</style>
            </div>
        );
    };

    return (
        <div className="min-h-screen">
            {view === 'LIST' && renderList()}
            {view === 'EDITOR' && renderEditor()}
            {view === 'STUDY' && renderStudy()}
        </div>
    );
};
