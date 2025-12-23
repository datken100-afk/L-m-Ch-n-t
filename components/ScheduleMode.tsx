
import React, { useMemo } from 'react';
import { ArrowRight, Calendar, Clock, BookOpen, Star, AlertCircle, Hourglass } from 'lucide-react';
import { ThemeType } from '../App';
import { EXAM_SCHEDULE, ExamItem } from '../data/examSchedule';

interface ScheduleModeProps {
    onBack: () => void;
    theme: ThemeType;
}

export const ScheduleMode: React.FC<ScheduleModeProps> = ({ onBack, theme }) => {
    
    // Theme Styles
    const getThemeStyles = () => {
        switch(theme) {
            case 'xmas': return {
                gradient: 'from-red-600 to-green-700',
                text: 'text-red-600',
                bgSoft: 'bg-red-50 dark:bg-red-900/20',
                border: 'border-red-200 dark:border-red-800',
                highlight: 'bg-red-100 text-red-700 border-red-300'
            };
            case 'swift': return {
                gradient: 'from-pink-400 via-purple-400 to-indigo-400',
                text: 'text-purple-600',
                bgSoft: 'bg-purple-50 dark:bg-purple-900/20',
                border: 'border-purple-200 dark:border-purple-800',
                highlight: 'bg-purple-100 text-purple-700 border-purple-300'
            };
            case 'blackpink': return {
                gradient: 'from-pink-500 to-black',
                text: 'text-pink-500',
                bgSoft: 'bg-pink-50 dark:bg-pink-900/10',
                border: 'border-pink-200 dark:border-pink-800',
                highlight: 'bg-pink-100 text-pink-700 border-pink-300'
            };
            case 'showgirl': return {
                gradient: 'from-teal-600 to-orange-500',
                text: 'text-orange-500',
                bgSoft: 'bg-orange-50 dark:bg-orange-900/20',
                border: 'border-orange-200 dark:border-orange-800',
                highlight: 'bg-yellow-100 text-yellow-700 border-yellow-300'
            };
            default: return {
                gradient: 'from-blue-600 to-cyan-500',
                text: 'text-blue-600',
                bgSoft: 'bg-blue-50 dark:bg-blue-900/20',
                border: 'border-blue-200 dark:border-blue-800',
                highlight: 'bg-amber-100 text-amber-700 border-amber-300'
            };
        }
    };
    const styles = getThemeStyles();

    // Sorting Logic
    const sortedSchedule = useMemo(() => {
        const parseDate = (dateStr: string) => {
            const [day, month, year] = dateStr.split('/');
            return new Date(Number(year), Number(month) - 1, Number(day));
        };

        return [...EXAM_SCHEDULE].sort((a, b) => {
            return parseDate(a.date).getTime() - parseDate(b.date).getTime();
        });
    }, []);

    // Helper: Days Left
    const getDaysLeft = (dateStr: string) => {
        const [day, month, year] = dateStr.split('/');
        const examDate = new Date(Number(year), Number(month) - 1, Number(day));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const diffTime = examDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    return (
        <div className="max-w-4xl mx-auto pb-20 px-4">
            {/* Header */}
            <div className="flex items-center mb-6">
                <button onClick={onBack} className="mr-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors">
                    <ArrowRight className="w-6 h-6 rotate-180" />
                </button>
                <h2 className="text-xl font-medium text-slate-500 dark:text-slate-400">Quay lại trang chủ</h2>
            </div>

            {/* Banner */}
            <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-r ${styles.gradient} p-8 text-white shadow-xl mb-8 animate-fade-up`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="relative z-10 flex items-center gap-6">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-inner">
                        <Calendar className="w-10 h-10 text-white drop-shadow-lg" />
                    </div>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold mb-2 text-glow-white">Lịch Thi 2026</h1>
                        <p className="text-lg text-white/90">Theo dõi lịch trình và chuẩn bị ôn tập thật tốt nhé!</p>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="space-y-4">
                {sortedSchedule.map((exam, index) => {
                    const isAnatomy = exam.subject.toLowerCase().includes('giải phẫu');
                    const daysLeft = getDaysLeft(exam.date);
                    const isPast = daysLeft < 0;
                    const isToday = daysLeft === 0;

                    return (
                        <div 
                            key={exam.id}
                            className={`group relative bg-white dark:bg-slate-900 rounded-2xl p-6 border-2 transition-all hover:shadow-lg hover:-translate-y-1 animate-in slide-in-from-bottom-4
                                ${isAnatomy 
                                    ? `border-amber-400 dark:border-amber-600 shadow-amber-100 dark:shadow-none` 
                                    : 'border-slate-100 dark:border-slate-800'
                                }
                                ${isPast ? 'opacity-60 grayscale' : ''}
                            `}
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            {/* Anatomy Tag */}
                            {isAnatomy && (
                                <div className="absolute -top-3 -right-3 bg-amber-500 text-white p-2 rounded-full shadow-lg animate-bounce z-10 border-2 border-white dark:border-slate-900">
                                    <Star className="w-5 h-5 fill-current" />
                                </div>
                            )}

                            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                {/* Date Box */}
                                <div className={`flex flex-col items-center justify-center w-20 h-20 rounded-xl border-2 shrink-0 
                                    ${isAnatomy 
                                        ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400' 
                                        : `${styles.bgSoft} ${styles.border} ${styles.text} dark:text-slate-300`
                                    }`}>
                                    <span className="text-xs font-bold uppercase">{exam.dayOfWeek.replace("Thứ ", "T")}</span>
                                    <span className="text-2xl font-black">{exam.date.split('/')[0]}</span>
                                    <span className="text-xs font-bold">{exam.date.split('/')[1]}</span>
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <h3 className={`text-xl font-bold mb-2 truncate ${isAnatomy ? 'text-amber-700 dark:text-amber-400' : 'text-slate-800 dark:text-white'}`}>
                                        {exam.subject}
                                    </h3>
                                    
                                    <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
                                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                            <Clock className="w-4 h-4" />
                                            {exam.time}
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                                            <Calendar className="w-4 h-4" />
                                            {exam.date}
                                        </div>
                                    </div>
                                </div>

                                {/* Status / Countdown */}
                                <div className="w-full md:w-auto flex justify-end">
                                    {isPast ? (
                                        <span className="px-4 py-2 rounded-xl bg-slate-100 text-slate-400 font-bold text-sm flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" /> Đã thi
                                        </span>
                                    ) : (
                                        <div className={`px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 border
                                            ${isToday 
                                                ? 'bg-red-100 text-red-600 border-red-200 animate-pulse' 
                                                : isAnatomy 
                                                    ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                                    : 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                            }`}>
                                            <Hourglass className="w-4 h-4" />
                                            {isToday ? "Hôm nay!" : `Còn ${daysLeft} ngày`}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
