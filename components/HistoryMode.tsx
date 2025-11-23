
import React, { useEffect, useState } from 'react';
import { ArrowRight, Calendar, Clock, Trophy, Search, History, CheckCircle2, XCircle, AlertCircle, ChevronRight, Trash2 } from 'lucide-react';
import { ThemeType } from '../App';
import { ExamHistory, UserProfile } from '../types';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc } from 'firebase/firestore';

interface HistoryModeProps {
    onBack: () => void;
    theme: ThemeType;
    user: UserProfile;
}

export const HistoryMode: React.FC<HistoryModeProps> = ({ onBack, theme, user }) => {
    const [historyList, setHistoryList] = useState<ExamHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedExam, setSelectedExam] = useState<ExamHistory | null>(null);

    const getThemeStyles = () => {
        switch(theme) {
            case 'xmas': return {
                accent: 'text-red-600',
                bgSoft: 'bg-red-50 dark:bg-red-900/20',
                cardBorder: 'border-red-200 dark:border-red-800',
                iconColor: 'text-emerald-600',
                gradient: 'from-red-600 to-emerald-600'
            };
            case 'swift': return {
                accent: 'text-purple-600',
                bgSoft: 'bg-purple-50 dark:bg-purple-900/20',
                cardBorder: 'border-purple-200 dark:border-purple-800',
                iconColor: 'text-indigo-500',
                gradient: 'from-indigo-500 via-purple-500 to-pink-500'
            };
            case 'blackpink': return {
                accent: 'text-pink-500',
                bgSoft: 'bg-pink-50 dark:bg-pink-900/20',
                cardBorder: 'border-pink-200 dark:border-pink-800',
                iconColor: 'text-pink-400',
                gradient: 'from-pink-600 to-slate-900'
            };
            case 'showgirl': return {
                accent: 'text-orange-500',
                bgSoft: 'bg-orange-50 dark:bg-orange-900/20',
                cardBorder: 'border-orange-200 dark:border-orange-800',
                iconColor: 'text-teal-500',
                gradient: 'from-teal-600 to-orange-500'
            };
            default: return {
                accent: 'text-blue-600',
                bgSoft: 'bg-blue-50 dark:bg-blue-900/20',
                cardBorder: 'border-blue-200 dark:border-blue-800',
                iconColor: 'text-amber-500',
                gradient: 'from-blue-600 to-indigo-600'
            };
        }
    };
    const styles = getThemeStyles();

    useEffect(() => {
        const fetchHistory = async () => {
            if (!user.uid) return;
            setLoading(true);
            try {
                const q = query(
                    collection(db, 'users', user.uid, 'exam_history'),
                    orderBy('createdAt', 'desc'),
                    limit(20)
                );
                const snapshot = await getDocs(q);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ExamHistory));
                setHistoryList(data);
            } catch (error) {
                console.error("Error fetching history:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [user.uid]);

    const handleDeleteExam = async (e: React.MouseEvent, historyId: string) => {
        e.stopPropagation(); // Prevent opening details
        if (!user.uid) return;

        if (window.confirm("Bạn có chắc chắn muốn xóa lịch sử bài thi này không? Hành động này không thể hoàn tác.")) {
            try {
                // Optimistic UI update
                setHistoryList(prev => prev.filter(item => item.id !== historyId));
                
                await deleteDoc(doc(db, 'users', user.uid, 'exam_history', historyId));
            } catch (error) {
                console.error("Error deleting history:", error);
                alert("Không thể xóa lịch sử. Vui lòng thử lại.");
                // Re-fetch if failed (optional, but simple for now)
            }
        }
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // DETAIL VIEW
    if (selectedExam) {
        const percentage = Math.round((selectedExam.score / selectedExam.totalQuestions) * 100);
        
        return (
            <div className="max-w-4xl mx-auto pb-20 px-4">
                <div className="flex items-center mb-6">
                    <button onClick={() => setSelectedExam(null)} className="mr-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                        <ArrowRight className="w-6 h-6 rotate-180" />
                    </button>
                    <h2 className="text-xl font-medium text-slate-500 dark:text-slate-400">Quay lại danh sách</h2>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-xl border border-slate-200 dark:border-slate-700 mb-8 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-100 dark:border-slate-800 pb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{selectedExam.topic}</h1>
                            <div className="flex items-center gap-3 text-sm text-slate-500">
                                <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {formatDate(selectedExam.timestamp)}</span>
                                <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> {selectedExam.timeLimit} phút</span>
                            </div>
                        </div>
                        <div className={`px-6 py-3 rounded-2xl ${percentage >= 50 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                            <span className="text-xs font-bold uppercase block mb-1">Điểm số</span>
                            <span className="text-3xl font-black">{selectedExam.score}/{selectedExam.totalQuestions}</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {selectedExam.questions.map((q, idx) => {
                            const userAns = selectedExam.userAnswers[q.id];
                            const isCorrect = userAns === q.correctAnswer;
                            
                            return (
                                <div key={idx} className={`p-6 rounded-2xl border-2 ${isCorrect ? 'border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/30' : 'border-red-100 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10'}`}>
                                    <div className="flex gap-3">
                                        <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center font-bold ${isCorrect ? 'bg-green-100 text-green-600 dark:bg-green-900/50 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3">{q.question}</h4>
                                            
                                            <div className="space-y-2 mb-4">
                                                {q.options.map((opt, optIdx) => {
                                                    const isSelected = userAns === opt;
                                                    const isTheCorrectAnswer = q.correctAnswer === opt;
                                                    
                                                    let itemClass = "p-3 rounded-lg border text-sm ";
                                                    if (isTheCorrectAnswer) {
                                                        itemClass += "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300 font-bold";
                                                    } else if (isSelected && !isTheCorrectAnswer) {
                                                        itemClass += "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300";
                                                    } else {
                                                        itemClass += "bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-400 opacity-70";
                                                    }

                                                    return (
                                                        <div key={optIdx} className={itemClass}>
                                                            {opt} {isSelected && "(Bạn chọn)"} {isTheCorrectAnswer && "✓"}
                                                        </div>
                                                    )
                                                })}
                                            </div>

                                            <div className="text-sm bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-slate-600 dark:text-slate-300 italic">
                                                <span className="font-bold not-italic mr-1">Giải thích:</span> {q.explanation}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // LIST VIEW
    return (
        <div className="max-w-5xl mx-auto pb-20 px-4">
             <div className="flex items-center mb-6">
                <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                    <ArrowRight className="w-6 h-6 rotate-180" />
                </button>
                <h2 className="text-xl font-medium text-slate-500 dark:text-slate-400">Quay lại trang chủ</h2>
            </div>

            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${styles.gradient} p-8 text-white shadow-xl mb-8 animate-fade-up`}>
                 <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                 <div className="relative z-10 flex items-center gap-6">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                        <History className="w-10 h-10 text-white drop-shadow-lg" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-glow-white">Lịch sử luyện đề</h1>
                        <p className="text-lg text-white/90">Xem lại các bài thi trắc nghiệm đã làm để rút kinh nghiệm.</p>
                    </div>
                 </div>
            </div>

            {loading ? (
                 <div className="text-center py-20">
                    <div className={`w-10 h-10 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4 ${styles.iconColor} border-current`}></div>
                    <p className="text-slate-500">Đang tải lịch sử...</p>
                 </div>
            ) : historyList.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-700">
                    <div className={`w-20 h-20 mx-auto rounded-full ${styles.bgSoft} flex items-center justify-center mb-4`}>
                        <Search className={`w-10 h-10 ${styles.iconColor}`} />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Chưa có lịch sử thi</h3>
                    <p className="text-slate-500 dark:text-slate-400">Hãy làm bài trắc nghiệm đầu tiên để ghi nhận kết quả!</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 gap-4">
                    {historyList.map((item) => {
                        const percentage = Math.round((item.score / item.totalQuestions) * 100);
                        const isPass = percentage >= 50;

                        return (
                            <button 
                                key={item.id}
                                onClick={() => setSelectedExam(item)}
                                className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-all hover:-translate-y-1 text-left group relative"
                            >
                                {/* Delete Button (Shows on Hover) */}
                                <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div 
                                        onClick={(e) => handleDeleteExam(e, item.id)}
                                        className="p-2 bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors shadow-sm border border-red-100 dark:border-red-800"
                                        title="Xóa lịch sử"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </div>
                                </div>

                                <div className="flex justify-between items-start mb-4 pr-10">
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white text-lg mb-1 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {item.topic}
                                        </h3>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(item.timestamp)}</span>
                                            <span>•</span>
                                            <span>{item.type}</span>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-lg text-xs font-bold uppercase shrink-0 ${isPass ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                                        {percentage}%
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isPass ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                            {isPass ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        </div>
                                        <div className="text-sm">
                                            <span className="font-bold text-slate-800 dark:text-white">{item.score}</span>
                                            <span className="text-slate-400"> / {item.totalQuestions} câu</span>
                                        </div>
                                    </div>
                                    <div className={`text-sm font-bold flex items-center gap-1 ${styles.accent}`}>
                                        Xem chi tiết <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
