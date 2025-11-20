import React, { useState, useRef, useEffect } from 'react';
import { generateStationQuestionsForImage } from '../services/geminiService';
import { StationItem, StationQuestion } from '../types';
import { Upload, Image as ImageIcon, Play, Trash2, Timer, Eye, EyeOff, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react';

interface StationModeProps {
  onBack: () => void;
}

enum StationStep {
  SETUP,
  RUNNING,
  SUMMARY
}

export const StationMode: React.FC<StationModeProps> = ({ onBack }) => {
  const [step, setStep] = useState<StationStep>(StationStep.SETUP);
  const [stations, setStations] = useState<StationItem[]>([]);
  const [timePerStation, setTimePerStation] = useState(60); // seconds
  const [loadingImageId, setLoadingImageId] = useState<string | null>(null);

  // Setup Logic
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
            const newStation: StationItem = {
                id: Math.random().toString(36).substr(2, 9),
                imageUri: reader.result,
                questions: []
            };
            setStations(prev => [...prev, newStation]);
            // Auto generate questions for this image
            generateQuestionsForStation(newStation.id, reader.result);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const generateQuestionsForStation = async (stationId: string, imageUri: string) => {
    setLoadingImageId(stationId);
    try {
      const response = await generateStationQuestionsForImage(imageUri);
      const newQuestions: StationQuestion[] = response.questions.map((q, idx) => ({
        id: `sq-${stationId}-${idx}`,
        ...q
      }));
      
      setStations(prev => prev.map(s => 
        s.id === stationId ? { ...s, questions: newQuestions } : s
      ));
    } catch (error) {
      console.error("Failed to generate questions", error);
    } finally {
      setLoadingImageId(null);
    }
  };

  const removeStation = (id: string) => {
    setStations(prev => prev.filter(s => s.id !== id));
  };

  if (step === StationStep.SETUP) {
    return (
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-600 dark:text-slate-300">
                    <ArrowRight className="w-6 h-6 rotate-180" />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Thi Chạy Trạm (Spot Test)</h2>
                    <p className="text-slate-500 dark:text-slate-400">Tải lên hình ảnh giải phẫu để AI tạo trạm thi</p>
                </div>
            </div>
            {stations.length > 0 && (
                 <button
                 onClick={() => setStep(StationStep.RUNNING)}
                 className="bg-medical-600 hover:bg-medical-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95"
               >
                 <Play className="w-5 h-5" />
                 Bắt đầu thi ({stations.length} trạm)
               </button>
            )}
        </div>

        {/* Configuration Bar */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mb-8 flex flex-col md:flex-row gap-6 items-center justify-between transition-colors">
             <div className="flex items-center gap-4 w-full md:w-auto">
                <label className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white px-6 py-3 rounded-xl cursor-pointer font-medium transition-colors flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    <span>Thêm hình ảnh</span>
                    <input type="file" multiple accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
             </div>
             <div className="flex items-center gap-3 w-full md:w-auto">
                <Timer className="w-5 h-5 text-slate-400" />
                <span className="text-slate-600 dark:text-slate-300 whitespace-nowrap">Thời gian mỗi trạm:</span>
                <select 
                    value={timePerStation} 
                    onChange={(e) => setTimePerStation(Number(e.target.value))}
                    className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg p-2 font-bold text-slate-800 dark:text-white outline-none focus:border-medical-500"
                >
                    <option value={30}>30 giây</option>
                    <option value={45}>45 giây</option>
                    <option value={60}>60 giây</option>
                    <option value={90}>90 giây</option>
                </select>
             </div>
        </div>

        {/* Stations Grid */}
        {stations.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 transition-colors">
                <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                    <ImageIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                </div>
                <h3 className="text-xl font-medium text-slate-600 dark:text-slate-300 mb-2">Chưa có trạm nào</h3>
                <p className="text-slate-400 dark:text-slate-500 max-w-md mx-auto">Tải lên hình ảnh mô hình, tiêu bản hoặc sơ đồ giải phẫu. AI sẽ tự động tạo câu hỏi định danh.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stations.map((station, index) => (
                    <div key={station.id} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden group relative transition-colors">
                        <div className="aspect-video bg-slate-100 dark:bg-slate-900 relative">
                            <img src={station.imageUri} alt={`Station ${index + 1}`} className="w-full h-full object-cover" />
                            <button 
                                onClick={() => removeStation(station.id)}
                                className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-2 rounded-full transition-colors backdrop-blur-sm"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <div className="absolute top-2 left-2 bg-black/50 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                                Trạm {index + 1}
                            </div>
                        </div>
                        <div className="p-4">
                            {loadingImageId === station.id ? (
                                <div className="flex items-center gap-2 text-medical-600 dark:text-medical-400 text-sm font-medium animate-pulse">
                                    <div className="w-4 h-4 border-2 border-medical-600 dark:border-medical-400 border-t-transparent rounded-full animate-spin"></div>
                                    Đang phân tích ảnh...
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Câu hỏi ({station.questions.length})</span>
                                        <button 
                                            onClick={() => generateQuestionsForStation(station.id, station.imageUri)}
                                            className="text-xs text-medical-600 dark:text-medical-400 hover:underline"
                                        >
                                            Tạo lại
                                        </button>
                                    </div>
                                    {station.questions.slice(0, 2).map((q, i) => (
                                        <div key={i} className="text-sm text-slate-600 dark:text-slate-300 line-clamp-1 pl-2 border-l-2 border-slate-200 dark:border-slate-600">
                                            {q.questionText}
                                        </div>
                                    ))}
                                    {station.questions.length > 2 && (
                                        <div className="text-xs text-slate-400 pl-2">+ {station.questions.length - 2} câu hỏi khác</div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    );
  }

  if (step === StationStep.RUNNING) {
    return <StationRunner stations={stations} timePerStation={timePerStation} onFinish={() => setStep(StationStep.SUMMARY)} />;
  }

  if (step === StationStep.SUMMARY) {
    return <StationSummary stations={stations} onRestart={() => setStep(StationStep.SETUP)} />;
  }

  return null;
};

// ---------------------------------------------------------------------------
// Sub-component: Station Runner (The actual exam view)
// ---------------------------------------------------------------------------
const StationRunner: React.FC<{ stations: StationItem[], timePerStation: number, onFinish: () => void }> = ({ stations, timePerStation, onFinish }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(timePerStation);
    const [isPaused, setIsPaused] = useState(false);

    useEffect(() => {
        if (isPaused) return;
        if (timeLeft <= 0) {
            handleNext();
            return;
        }
        const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft, isPaused]);

    const handleNext = () => {
        if (currentIndex >= stations.length - 1) {
            onFinish();
        } else {
            setCurrentIndex(prev => prev + 1);
            setTimeLeft(timePerStation);
        }
    };

    const currentStation = stations[currentIndex];

    if (!currentStation) return null; // Safety check

    const progress = ((timePerStation - timeLeft) / timePerStation) * 100;

    return (
        <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white z-50 flex flex-col transition-colors duration-300">
            {/* Header / Timer Bar */}
            <div className="h-2 bg-slate-200 dark:bg-slate-800 w-full">
                <div 
                    className="h-full bg-medical-500 transition-all duration-1000 ease-linear"
                    style={{ width: `${100 - progress}%` }}
                ></div>
            </div>
            
            <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="text-xl font-bold text-medical-600 dark:text-medical-400">
                    Trạm {currentIndex + 1} / {stations.length}
                </div>
                <div className={`text-3xl font-mono font-bold ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-slate-800 dark:text-white'}`}>
                    {timeLeft}s
                </div>
                <button 
                    onClick={() => setIsPaused(!isPaused)}
                    className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors"
                >
                    {isPaused ? "Tiếp tục" : "Tạm dừng"}
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Image Area */}
                <div className="flex-1 bg-slate-200 dark:bg-black/90 flex items-center justify-center p-4 relative">
                     {/* Grid Pattern Background for Image Area */}
                     <div className="absolute inset-0 opacity-10 dark:opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#64748b 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                    <img 
                        src={currentStation.imageUri} 
                        alt="Station" 
                        className="max-w-full max-h-full object-contain rounded shadow-2xl relative z-10"
                    />
                </div>

                {/* Questions Area */}
                <div className="w-full md:w-96 bg-white dark:bg-slate-900 p-6 overflow-y-auto border-l border-slate-200 dark:border-slate-800">
                    <h3 className="text-lg font-medium text-slate-500 dark:text-slate-400 mb-6 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        Câu hỏi định danh
                    </h3>
                    
                    <div className="space-y-8">
                        {currentStation.questions.map((q, i) => (
                            <div key={i} className="space-y-3">
                                <div className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center text-sm font-bold border border-slate-200 dark:border-slate-700">
                                        {i + 1}
                                    </span>
                                    <p className="text-lg leading-snug text-slate-800 dark:text-slate-200">{q.questionText}</p>
                                </div>
                                {/* Hidden answer field for user self-check mentally or scratchpad */}
                                <div className="pl-9">
                                    <div className="h-24 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 text-slate-400 text-sm italic">
                                        Ghi câu trả lời của bạn ra giấy...
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer Controls */}
            <div className="bg-white dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                 <button 
                    onClick={handleNext}
                    className="bg-medical-600 hover:bg-medical-700 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all"
                 >
                    <span>{currentIndex === stations.length - 1 ? "Kết thúc" : "Trạm tiếp theo"}</span>
                    <ArrowRight className="w-5 h-5" />
                 </button>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Sub-component: Station Summary
// ---------------------------------------------------------------------------
const StationSummary: React.FC<{ stations: StationItem[], onRestart: () => void }> = ({ stations, onRestart }) => {
    const [revealedStationId, setRevealedStationId] = useState<string | null>(null);

    return (
        <div className="max-w-5xl mx-auto pb-20">
            <div className="text-center mb-10">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Hoàn thành bài thi!</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-2">Hãy xem lại đáp án các trạm bên dưới.</p>
            </div>

            <div className="space-y-12">
                {stations.map((station, idx) => (
                    <div key={station.id} className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                        <div className="grid grid-cols-1 md:grid-cols-2">
                            <div className="bg-slate-100 dark:bg-black/50 flex items-center justify-center p-4 max-h-96">
                                <img src={station.imageUri} className="max-w-full max-h-full object-contain" />
                            </div>
                            <div className="p-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Trạm {idx + 1}</h3>
                                    <button 
                                        onClick={() => setRevealedStationId(revealedStationId === station.id ? null : station.id)}
                                        className="text-medical-600 dark:text-medical-400 font-medium text-sm flex items-center gap-2 hover:bg-medical-50 dark:hover:bg-medical-900/30 px-3 py-1.5 rounded-lg transition-colors"
                                    >
                                        {revealedStationId === station.id ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}
                                        {revealedStationId === station.id ? 'Ẩn đáp án' : 'Hiện đáp án'}
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {station.questions.map((q, qIdx) => (
                                        <div key={qIdx} className="border-b border-slate-100 dark:border-slate-700 pb-4 last:border-0 last:pb-0">
                                            <p className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                                                <span className="text-medical-600 dark:text-medical-400 font-bold mr-2">{qIdx + 1}.</span>
                                                {q.questionText}
                                            </p>
                                            
                                            {revealedStationId === station.id ? (
                                                <div className="bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-300 p-4 rounded-xl animate-in fade-in slide-in-from-top-2 border border-green-100 dark:border-green-800">
                                                    <p className="font-bold text-lg">{q.correctAnswer}</p>
                                                    <p className="text-sm text-green-700 dark:text-green-400 mt-1 opacity-80">{q.explanation}</p>
                                                </div>
                                            ) : (
                                                <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl border border-slate-100 dark:border-slate-600">
                                                    <div className="h-6 w-24 bg-slate-200 dark:bg-slate-600 rounded animate-pulse"></div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
                <button 
                    onClick={onRestart}
                    className="bg-slate-900 dark:bg-white dark:text-slate-900 text-white px-8 py-4 rounded-full font-bold shadow-xl hover:scale-105 transition-transform"
                >
                    Thử bài thi mới
                </button>
            </div>
        </div>
    );
};