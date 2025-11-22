
import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Image as ImageIcon, Loader2, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { chatWithOtter } from '../services/geminiService';
import { ThemeType } from '../App';

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    image?: string;
}

interface OtterChatProps {
    theme?: ThemeType;
}

export const OtterChat: React.FC<OtterChatProps> = ({ theme = 'default' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false); 
    const [messages, setMessages] = useState<Message[]>([
        { 
            id: 'intro', 
            role: 'model', 
            text: 'Xin chào! Mình là **Rái cá Anatomy** 🦦.\n\nMình có thể giúp gì cho bạn?\n- Giải thích cấu trúc giải phẫu\n- Phân tích hình ảnh lâm sàng\n- Ôn tập kiến thức\n\nHãy hỏi mình ngay nhé!' 
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Theme Styles Config
    const getThemeStyles = () => {
        switch (theme) {
            case 'xmas': return {
                floatBtn: 'bg-gradient-to-br from-red-600 to-green-600 shadow-[0_4px_20px_rgba(220,38,38,0.5)] hover:shadow-[0_6px_30px_rgba(22,163,74,0.6)]',
                header: 'bg-gradient-to-r from-red-600 to-green-600',
                userBubble: 'bg-gradient-to-br from-red-600 to-green-600 shadow-red-500/20',
                sendBtn: 'bg-gradient-to-r from-red-500 to-green-600 shadow-red-500/30',
                inputFocus: 'focus:border-red-500 dark:focus:border-green-500',
                modelIcon: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
                loaderColor: 'bg-red-500'
            };
            case 'swift': return {
                floatBtn: 'bg-gradient-to-br from-pink-500 to-purple-600 shadow-[0_4px_20px_rgba(236,72,153,0.5)] hover:shadow-[0_6px_30px_rgba(168,85,247,0.6)]',
                header: 'bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400',
                userBubble: 'bg-gradient-to-br from-pink-500 to-purple-600 shadow-pink-500/20',
                sendBtn: 'bg-gradient-to-r from-pink-500 to-purple-600 shadow-purple-500/30',
                inputFocus: 'focus:border-pink-500 dark:focus:border-purple-500',
                modelIcon: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
                loaderColor: 'bg-purple-500'
            };
            case 'blackpink': return {
                floatBtn: 'bg-gradient-to-br from-pink-600 to-black shadow-[0_4px_20px_rgba(236,72,153,0.6)] hover:shadow-[0_6px_30px_rgba(0,0,0,0.8)]',
                header: 'bg-gradient-to-r from-pink-600 to-slate-900',
                userBubble: 'bg-gradient-to-br from-pink-600 to-slate-900 shadow-pink-500/30',
                sendBtn: 'bg-gradient-to-r from-pink-600 to-slate-900 shadow-pink-500/30',
                inputFocus: 'focus:border-pink-500 dark:focus:border-pink-700',
                modelIcon: 'bg-pink-100 dark:bg-pink-900/30 border-pink-200 dark:border-pink-800',
                loaderColor: 'bg-pink-500'
            };
            case 'aespa': return {
                floatBtn: 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-[0_4px_20px_rgba(99,102,241,0.5)] hover:shadow-[0_6px_30px_rgba(168,85,247,0.6)]',
                header: 'bg-gradient-to-r from-indigo-500 via-purple-500 to-slate-800',
                userBubble: 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-indigo-500/20',
                sendBtn: 'bg-gradient-to-r from-indigo-500 to-purple-600 shadow-indigo-500/30',
                inputFocus: 'focus:border-indigo-500 dark:focus:border-purple-500',
                modelIcon: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800',
                loaderColor: 'bg-indigo-500'
            };
            case 'rosie': return {
                floatBtn: 'bg-gradient-to-br from-rose-500 to-red-600 shadow-[0_4px_20px_rgba(225,29,72,0.5)] hover:shadow-[0_6px_30px_rgba(220,38,38,0.6)]',
                header: 'bg-gradient-to-r from-rose-500 to-red-600',
                userBubble: 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/20',
                sendBtn: 'bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/30',
                inputFocus: 'focus:border-rose-500 dark:focus:border-red-500',
                modelIcon: 'bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800',
                loaderColor: 'bg-rose-500'
            };
            case 'pkl': return {
                floatBtn: 'bg-gradient-to-br from-slate-600 to-cyan-600 shadow-[0_4px_20px_rgba(6,182,212,0.5)] hover:shadow-[0_6px_30px_rgba(71,85,105,0.6)]',
                header: 'bg-gradient-to-r from-slate-700 via-cyan-600 to-slate-800',
                userBubble: 'bg-gradient-to-br from-slate-600 to-cyan-600 shadow-cyan-500/20',
                sendBtn: 'bg-gradient-to-r from-slate-600 to-cyan-600 shadow-cyan-500/30',
                inputFocus: 'focus:border-cyan-500 dark:focus:border-slate-500',
                modelIcon: 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800',
                loaderColor: 'bg-cyan-500'
            };
            case 'showgirl': return {
                floatBtn: 'bg-gradient-to-br from-teal-500 to-orange-500 shadow-[0_4px_20px_rgba(20,184,166,0.5)] hover:shadow-[0_6px_30px_rgba(249,115,22,0.6)]',
                header: 'bg-gradient-to-r from-teal-500 to-orange-500',
                userBubble: 'bg-gradient-to-br from-teal-500 to-orange-500 shadow-orange-500/20',
                sendBtn: 'bg-gradient-to-r from-teal-500 to-orange-500 shadow-teal-500/30',
                inputFocus: 'focus:border-orange-500 dark:focus:border-teal-500',
                modelIcon: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
                loaderColor: 'bg-orange-500'
            };
            default: return {
                floatBtn: 'bg-gradient-to-br from-amber-400 to-orange-600 shadow-[0_4px_20px_rgba(245,158,11,0.5)] hover:shadow-[0_6px_30px_rgba(245,158,11,0.7)]',
                header: 'bg-gradient-to-r from-amber-400 to-orange-500',
                userBubble: 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/20',
                sendBtn: 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-orange-500/30',
                inputFocus: 'focus:border-amber-400 dark:focus:border-amber-600',
                modelIcon: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700',
                loaderColor: 'bg-amber-500'
            };
        }
    };

    const styles = getThemeStyles();

    // Auto scroll to bottom
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 300); // Slight delay for animation
        }
    }, [messages, isOpen, isExpanded]);

    const handleSendMessage = async () => {
        if ((!inputText.trim() && !selectedImage) || isLoading) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            text: inputText,
            image: selectedImage || undefined
        };

        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setSelectedImage(null);
        setIsLoading(true);

        // Prepare history for API
        const history = messages.map(m => ({
            role: m.role,
            text: m.text,
            image: m.image
        }));

        try {
            const responseText = await chatWithOtter(history, userMsg.text, userMsg.image);
            
            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: responseText
            };
            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error("Chat error", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
        if (e.target) e.target.value = '';
    };

    const toggleChat = () => {
        setIsOpen(!isOpen);
        // Reset expansion when closing usually feels better
        if (isOpen) setIsExpanded(false);
    };

    const renderStyledText = (text: string) => {
        const lines = text.split('\n');
        const elements: React.ReactNode[] = [];
        let listItems: React.ReactNode[] = [];

        const flushList = (keyPrefix: string) => {
            if (listItems.length > 0) {
                elements.push(
                    <ul key={`${keyPrefix}-list`} className="list-disc pl-5 mb-3 space-y-1 marker:text-amber-500">
                        {listItems}
                    </ul>
                );
                listItems = [];
            }
        };

        const parseInline = (str: string, idxPrefix: string) => {
            const parts = str.split(/(\*\*.*?\*\*)/g);
            return parts.map((part, i) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={`${idxPrefix}-${i}`} className="font-bold text-slate-900 dark:text-white bg-amber-100 dark:bg-amber-900/40 px-1 rounded-sm">{part.slice(2, -2)}</strong>;
                }
                return part;
            });
        };

        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            if (trimmed.match(/^[-*]\s/)) {
                const content = trimmed.replace(/^[-*]\s+/, '');
                listItems.push(
                    <li key={`li-${index}`} className="pl-1 leading-relaxed">
                        {parseInline(content, `li-${index}`)}
                    </li>
                );
                return;
            } 
            
            flushList(`flush-${index}`);

            if (!trimmed) {
                elements.push(<div key={`br-${index}`} className="h-3"></div>);
                return;
            }

            if (trimmed.startsWith('#')) {
                const content = trimmed.replace(/^#+\s*/, '');
                elements.push(
                    <h4 key={`h-${index}`} className="text-md font-bold text-amber-600 dark:text-amber-400 mt-4 mb-2 uppercase tracking-wide border-l-4 border-amber-400 pl-3">
                        {content}
                    </h4>
                );
                return;
            }

            elements.push(
                <p key={`p-${index}`} className="mb-2 leading-relaxed">
                    {parseInline(line, `p-${index}`)}
                </p>
            );
        });

        flushList('flush-end');
        return elements;
    };

    return (
        <>
            {/* Chat Window - Now persists in DOM but animates visibility */}
            <div 
                className={`fixed z-50 bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] origin-bottom-right
                ${isOpen 
                    ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
                    : 'opacity-0 scale-90 translate-y-12 pointer-events-none'
                }
                ${isExpanded 
                    ? 'inset-4 md:inset-10 rounded-3xl' 
                    : 'bottom-24 right-6 w-[380px] h-[600px] max-h-[calc(100vh-8rem)] max-w-[calc(100vw-2rem)] rounded-2xl'
                }`}
            >
                {/* Header */}
                <div 
                    className={`px-4 py-3 ${styles.header} text-white flex items-center justify-between shrink-0 cursor-pointer select-none transition-colors duration-300`}
                    onDoubleClick={() => setIsExpanded(!isExpanded)}
                >
                        <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-xl border border-white/30 shadow-inner">
                            {theme === 'xmas' ? '🎅' : theme === 'swift' ? '🐍' : theme === 'blackpink' ? '👑' : theme === 'aespa' ? '👽' : theme === 'rosie' ? '🌹' : theme === 'pkl' ? '🗡️' : theme === 'showgirl' ? '💃' : '🦦'}
                        </div>
                        <div>
                            <h3 className="font-bold text-base leading-none">
                                {theme === 'xmas' ? 'Ông già Noel' : theme === 'swift' ? 'Taylor Bot' : theme === 'blackpink' ? 'Blink Bot' : theme === 'aespa' ? 'naevis' : theme === 'rosie' ? 'Rosie' : theme === 'pkl' ? 'G1VN Bot' : theme === 'showgirl' ? 'Showgirl' : 'Rái cá Anatomy'}
                            </h3>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(74,222,128,0.8)]"></span>
                                <span className="text-[10px] opacity-90 uppercase tracking-wider font-medium">Trực tuyến</span>
                            </div>
                        </div>
                        </div>
                        <div className="flex items-center gap-1">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setMessages([{ id: 'intro', role: 'model', text: 'Chào bạn! Rái cá đã sẵn sàng. Bạn muốn hỏi về phần nào trong cơ thể người? 🦴' }]); }}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            title="Làm mới"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            title={isExpanded ? "Thu nhỏ" : "Phóng to"}
                        >
                            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); toggleChat(); }}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors md:hidden"
                            title="Đóng"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950 scroll-smooth">
                    {messages.map((msg) => (
                        <div 
                            key={msg.id} 
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            {msg.role === 'model' && (
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 text-lg shadow-sm border self-end mb-1 shrink-0 ${styles.modelIcon}`}>
                                    {theme === 'xmas' ? '🎅' : theme === 'swift' ? '🐍' : theme === 'blackpink' ? '👑' : theme === 'aespa' ? '👽' : theme === 'rosie' ? '🌹' : theme === 'pkl' ? '🗡️' : theme === 'showgirl' ? '💃' : '🦦'}
                                </div>
                            )}

                            <div 
                                className={`max-w-[85%] p-3.5 rounded-2xl relative shadow-sm transition-colors duration-300 ${
                                    msg.role === 'user' 
                                    ? `${styles.userBubble} text-white rounded-br-none` 
                                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-bl-none border border-slate-200 dark:border-slate-700'
                                }`}
                            >
                                {msg.image && (
                                    <div className="mb-2 rounded-xl overflow-hidden border border-white/20 shadow-sm bg-black/10">
                                        <img src={msg.image} alt="Uploaded" className="w-full h-auto max-h-60 object-contain" />
                                    </div>
                                )}
                                
                                <div className={`text-sm ${msg.role === 'user' ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {msg.role === 'user' ? (
                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                    ) : (
                                        renderStyledText(msg.text)
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="ml-10 bg-white dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-none border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-2">
                                <div className="flex gap-1">
                                    <div className={`w-1.5 h-1.5 rounded-full animate-[bounce_1s_infinite_0ms] ${styles.loaderColor}`}></div>
                                    <div className={`w-1.5 h-1.5 rounded-full animate-[bounce_1s_infinite_200ms] ${styles.loaderColor}`}></div>
                                    <div className={`w-1.5 h-1.5 rounded-full animate-[bounce_1s_infinite_400ms] ${styles.loaderColor}`}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0 relative z-20">
                    {selectedImage && (
                        <div className="flex items-center gap-3 mb-2 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-2">
                            <div className="w-10 h-10 rounded-lg overflow-hidden relative border border-slate-300 dark:border-slate-600">
                                <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">Ảnh đính kèm</p>
                            </div>
                            <button onClick={() => setSelectedImage(null)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    )}
                    <div className="flex items-end gap-2">
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="p-3 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors flex-shrink-0"
                            title="Gửi ảnh"
                        >
                            <ImageIcon className="w-5 h-5" />
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*" 
                            onChange={handleFileSelect}
                        />
                        
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Hỏi gì đó..."
                            className={`flex-1 max-h-32 p-3 bg-slate-100 dark:bg-slate-950 border border-transparent focus:bg-white dark:focus:bg-slate-900 rounded-xl focus:ring-0 resize-none text-sm text-slate-900 dark:text-white placeholder-slate-400 scrollbar-hide transition-all shadow-inner ${styles.inputFocus}`}
                            rows={1}
                        />
                        
                        <button 
                            onClick={handleSendMessage}
                            disabled={(!inputText.trim() && !selectedImage) || isLoading}
                            className={`p-3 text-white rounded-xl shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex-shrink-0 ${styles.sendBtn}`}
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Floating Trigger / Toggle Button */}
            <button
                onClick={toggleChat}
                className={`fixed bottom-6 right-6 z-[60] w-16 h-16 rounded-full transition-all duration-300 flex items-center justify-center group active:scale-95
                ${isOpen 
                    ? 'bg-slate-800 dark:bg-slate-700 text-white rotate-90 shadow-lg' 
                    : `${styles.floatBtn} text-white hover:scale-110`
                }`}
                title={isOpen ? "Đóng chat" : "Chat với Rái cá"}
            >
                <div className="relative w-full h-full flex items-center justify-center">
                     {/* Icon: Otter (Shows when closed) */}
                    <span className={`absolute text-3xl transition-all duration-300 ${isOpen ? 'opacity-0 scale-0 rotate-90' : 'opacity-100 scale-100 rotate-0'}`}>
                        {theme === 'xmas' ? '🎅' : theme === 'swift' ? '🐍' : theme === 'blackpink' ? '👑' : theme === 'aespa' ? '👽' : theme === 'rosie' ? '🌹' : theme === 'pkl' ? '🗡️' : theme === 'showgirl' ? '💃' : '🦦'}
                        {/* Ping animation */}
                        <span className="absolute inset-0 rounded-full bg-white/20 animate-[ping_2s_infinite] -z-10"></span>
                    </span>

                    {/* Icon: X (Shows when open) */}
                    <X className={`absolute w-8 h-8 transition-all duration-300 ${isOpen ? 'opacity-100 scale-100 rotate-0' : 'opacity-0 scale-0 -rotate-90'}`} />
                </div>
            </button>
        </>
    );
};
