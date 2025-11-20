import React, { useState } from 'react';
import { generateMCQQuestions } from '../services/geminiService';
import { Difficulty, MCQQuestion } from '../types';
import { CheckCircle2, XCircle, BrainCircuit, RefreshCw, ArrowRight, AlertCircle } from 'lucide-react';

export const MCQMode: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  // Configuration State
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.MEDIUM);
  
  // Quiz State
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const response = await generateMCQQuestions(topic, count, difficulty);
      const newQuestions: MCQQuestion[] = response.questions.map((q, idx) => ({
        ...q,
        id: `q-${Date.now()}-${idx}`
      }));
      setQuestions(newQuestions);
      setUserAnswers({});
      setShowResult(false);
    } catch (err) {
      setError("Không thể tạo câu hỏi. Vui lòng kiểm tra kết nối hoặc thử lại.");
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-6 text-medical-700 dark:text-medical-400">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-medical-200 dark:border-medical-900 border-t-medical-600 dark:border-t-medical-500 rounded-full animate-spin"></div>
          <BrainCircuit className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-medical-600 dark:text-medical-500" />
        </div>
        <p className="text-xl font-medium animate-pulse">AI đang soạn đề thi về "{topic}"...</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">Đang tham khảo tài liệu giải phẫu...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 transition-colors">
        <div className="mb-6 flex items-center space-x-2 text-medical-700 dark:text-medical-400">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                <ArrowRight className="w-6 h-6 rotate-180" />
            </button>
            <h2 className="text-2xl font-bold">Tạo Đề Trắc Nghiệm</h2>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Chủ đề giải phẫu</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ví dụ: Hệ xương chi trên, Tim mạch, Thần kinh sọ..."
              className="w-full p-4 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-medical-500 focus:border-medical-500 outline-none transition-all bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Số lượng câu hỏi</label>
              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="w-full p-4 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-medical-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                <option value={5}>5 câu</option>
                <option value={10}>10 câu</option>
                <option value={20}>20 câu</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Độ khó</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full p-4 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-medical-500 outline-none bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              >
                {Object.values(Difficulty).map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={!topic.trim()}
            className="w-full bg-medical-600 hover:bg-medical-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2"
          >
            <BrainCircuit className="w-6 h-6" />
            <span>Bắt đầu tạo đề</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Đề thi: {topic}</h2>
        <div className="flex gap-3">
            <button onClick={onBack} className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-medium transition-colors">
                Thoát
            </button>
            <button
            onClick={() => setQuestions([])}
            className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
            <RefreshCw className="w-4 h-4" />
            <span>Tạo đề mới</span>
            </button>
        </div>
      </div>

      <div className="space-y-8">
        {questions.map((q, index) => {
            const isAnswered = !!userAnswers[q.id];
            
            return (
                <div key={q.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 transition-colors">
                    <div className="flex gap-4">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-medical-50 dark:bg-medical-900/30 text-medical-700 dark:text-medical-400 font-bold rounded-full">
                        {index + 1}
                    </span>
                    <div className="flex-1">
                        <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-4">{q.question}</h3>
                        <div className="grid grid-cols-1 gap-3">
                        {q.options.map((option) => {
                            let btnClass = "p-4 text-left rounded-xl border transition-all relative ";
                            
                            if (showResult) {
                                if (option === q.correctAnswer) btnClass += "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400 ";
                                else if (userAnswers[q.id] === option && option !== q.correctAnswer) btnClass += "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400 ";
                                else btnClass += "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 opacity-60 ";
                            } else {
                                if (userAnswers[q.id] === option) btnClass += "bg-medical-50 dark:bg-medical-900/20 border-medical-300 dark:border-medical-600 text-medical-900 dark:text-medical-200 ring-1 ring-medical-300 dark:ring-medical-600 ";
                                else btnClass += "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-medical-300 dark:hover:border-medical-500 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 ";
                            }

                            return (
                            <button
                                key={option}
                                onClick={() => handleAnswer(q.id, option)}
                                disabled={showResult}
                                className={btnClass}
                            >
                                <span className="block pr-8">{option}</span>
                                {showResult && option === q.correctAnswer && (
                                    <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-green-600 dark:text-green-400" />
                                )}
                                {showResult && userAnswers[q.id] === option && option !== q.correctAnswer && (
                                    <XCircle className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-red-600 dark:text-red-400" />
                                )}
                            </button>
                            );
                        })}
                        </div>

                        {showResult && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200 rounded-xl text-sm leading-relaxed border border-blue-100 dark:border-blue-800">
                            <p className="font-semibold mb-1 flex items-center gap-2 text-blue-800 dark:text-blue-300">
                                <BrainCircuit className="w-4 h-4" /> Giải thích:
                            </p>
                            {q.explanation}
                        </div>
                        )}
                    </div>
                    </div>
                </div>
            );
        })}
      </div>

      <div className="sticky bottom-6 mt-8 flex justify-center">
        {!showResult ? (
            <button
                onClick={() => setShowResult(true)}
                className="bg-medical-600 text-white px-8 py-4 rounded-full font-bold shadow-lg hover:bg-medical-700 hover:scale-105 transition-all flex items-center gap-2"
            >
                <CheckCircle2 className="w-5 h-5" />
                Nộp bài & Xem kết quả
            </button>
        ) : (
            <div className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-4 rounded-full font-bold shadow-lg flex items-center gap-4">
                <span>Kết quả: {calculateScore()}/{questions.length}</span>
            </div>
        )}
      </div>
    </div>
  );
};