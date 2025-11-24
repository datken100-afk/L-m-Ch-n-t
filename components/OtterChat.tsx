
import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Image as ImageIcon, Loader2, RefreshCw, Maximize2, Minimize2, ChevronDown } from 'lucide-react';
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

// Simple Markdown Formatter Component
const FormattedMessage = ({ text, role }: { text: string, role: 'user' | 'model' }) => {
    // Normalize newlines to paragraphs
    const paragraphs = text.split(/\n\n+/);
    
    const formatInline = (str: string) => {
        // Escape HTML first to prevent injection
        let safeStr = str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        return safeStr
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/`([^`]+)`/g, '<code class="bg-black/10 dark:bg-white/10 px-1 rounded font-mono text-xs">$1</code>'); // Code
    };

    return (
        <div className={`space-y-2 text-sm leading-relaxed ${role === 'user' ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
            {paragraphs.map((para, idx) => {
                // Check for list items
                if (para.trim().startsWith('- ') || para.trim().startsWith('* ')) {
                    const items = para.split(/\n/).filter(line => line.trim().match(/^[-*]\s/));
                    return (
                        <ul key={idx} className="list-disc pl-5 space-y-1">
                            {items.map((item, i) => (
                                <li key={i} dangerouslySetInnerHTML={{ __html: formatInline(item.replace(/^[-*]\s/, '')) }} />
                            ))}
                        </ul>
                    );
                }
                // Regular Paragraph
                return <p key={idx} dangerouslySetInnerHTML={{ __html: formatInline(para) }} />;
            })}
        </div>
    );
};

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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen]);

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
                modelIcon: 'bg-slate-800 border-indigo-500',
                loaderColor: 'bg-indigo-500'
            };
            case 'rosie': return {
                floatBtn: 'bg-gradient-to-br from-rose-500 to-red-600 shadow-[0_4px_20px_rgba(225,29,72,0.5)]',
                header: 'bg-gradient-to-r from-rose-500 to-red-600',
                userBubble: 'bg-gradient-to-br from-rose-500 to-red-600 shadow-rose-500/20',
                sendBtn: 'bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/30',
                inputFocus: 'focus:border-rose-500',
                modelIcon: 'bg-rose-100 dark:bg-rose-900/30 border-rose-200',
                loaderColor: 'bg-rose-500'
            };
            case 'pkl': return {
                floatBtn: 'bg-gradient-to-br from-slate-700 to-cyan-600 shadow-[0_4px_20px_rgba(6,182,212,0.5)]',
                header: 'bg-gradient-to-r from-slate-800 to-cyan-800',
                userBubble: 'bg-gradient-to-br from-cyan-600 to-slate-700 shadow-cyan-500/20',
                sendBtn: 'bg-gradient-to-r from-slate-600 to-cyan-700 shadow-cyan-500/30',
                inputFocus: 'focus:border-cyan-500',
                modelIcon: 'bg-cyan-50 dark:bg-cyan-900/30 border-cyan-200',
                loaderColor: 'bg-cyan-500'
            };
            case 'showgirl': return {
                floatBtn: 'bg-gradient-to-br from-teal-600 to-orange-500 shadow-[0_4px_20px_rgba(234,179,8,0.6)]',
                header: 'bg-gradient-to-r from-teal-600 to-orange-500',
                userBubble: 'bg-gradient-to-br from-teal-500 to-orange-500 shadow-orange-500/20',
                sendBtn: 'bg-gradient-to-r from-teal-500 to-orange-500 shadow-orange-500/30',
                inputFocus: 'focus:border-orange-500',
                modelIcon: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200',
                loaderColor: 'bg-orange-500'
            };
            case '1989': return {
                floatBtn: 'bg-gradient-to-br from-sky-400 to-blue-500 shadow-[0_4px_20px_rgba(56,189,248,0.5)] hover:shadow-[0_6px_30px_rgba(56,189,248,0.6)]',
                header: 'bg-gradient-to-r from-sky-400 to-blue-500',
                userBubble: 'bg-gradient-to-br from-sky-400 to-blue-500 shadow-sky-500/20',
                sendBtn: 'bg-gradient-to-r from-sky-400 to-blue-500 shadow-sky-500/30',
                inputFocus: 'focus:border-sky-500',
                modelIcon: 'bg-sky-100 text-sky-600 border-sky-200',
                loaderColor: 'bg-sky-500'
            };
            case 'folklore': return {
                floatBtn: 'bg-gradient-to-br from-zinc-500 to-slate-600 shadow-[0_4px_20px_rgba(113,113,122,0.5)] hover:shadow-[0_6px_30px_rgba(113,113,122,0.6)]',
                header: 'bg-gradient-to-r from-zinc-500 to-slate-600',
                userBubble: 'bg-gradient-to-br from-zinc-500 to-slate-600 shadow-zinc-500/20',
                sendBtn: 'bg-gradient-to-r from-zinc-500 to-slate-600 shadow-zinc-500/30',
                inputFocus: 'focus:border-zinc-500',
                modelIcon: 'bg-zinc-100 text-zinc-600 border-zinc-200',
                loaderColor: 'bg-zinc-500'
            };
            case 'ttpd': return {
                floatBtn: 'bg-gradient-to-br from-stone-500 to-stone-700 shadow-[0_4px_20px_rgba(168,162,158,0.5)] hover:shadow-[0_6px_30px_rgba(168,162,158,0.6)]',
                header: 'bg-gradient-to-r from-stone-500 to-stone-700',
                userBubble: 'bg-gradient-to-br from-stone-500 to-stone-700 shadow-stone-500/20',
                sendBtn: 'bg-gradient-to-r from-stone-500 to-stone-700 shadow-stone-500/30',
                inputFocus: 'focus:border-stone-500',
                modelIcon: 'bg-stone-100 text-stone-600 border-stone-200',
                loaderColor: 'bg-stone-500'
            };
            default: return {
                floatBtn: 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-[0_4px_20px_rgba(59,130,246,0.5)] hover:shadow-[0_6px_30px_rgba(79,70,229,0.6)]',
                header: 'bg-gradient-to-r from-blue-600 to-indigo-700',
                userBubble: 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-blue-500/20',
                sendBtn: 'bg-gradient-to-r from-blue-500 to-indigo-600 shadow-blue-500/30',
                inputFocus: 'focus:border-blue-500',
                modelIcon: 'bg-blue-100 text-blue-600 border-blue-200',
                loaderColor: 'bg-blue-500'
            };
        }
    };
    const styles = getThemeStyles();

    const handleSend = async () => {
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

        try {
            // Prepare history for context
            const historyContext = messages.map(m => ({
                role: m.role,
                text: m.text
            }));

            const responseText = await chatWithOtter(historyContext, userMsg.text, userMsg.image);
            
            const modelMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: responseText
            };
            setMessages(prev => [...prev, modelMsg]);
        } catch (error) {
            console.error("Chat Error", error);
            setMessages(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: "Xin lỗi, Rái cá đang gặp chút trục trặc. Bạn thử lại sau nhé! 🦦"
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
        // Reset input
        e.target.value = '';
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Trigger Button - Always Visible */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-4 right-4 z-[60] w-16 h-16 rounded-full flex items-center justify-center text-white transition-all duration-300 transform hover:scale-110 active:scale-95 ${styles.floatBtn} ${isOpen ? 'rotate-90' : 'rotate-0'}`}
                title={isOpen ? "Đóng chat" : "Mở chat"}
            >
                {isOpen ? (
                    <X className="w-8 h-8" />
                ) : (
                    <span className="text-3xl">🦦</span>
                )}
            </button>

            {/* Chat Window */}
            {isOpen && (
                <div className={`fixed bottom-24 right-4 z-50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col transition-all duration-300 border border-slate-200 dark:border-slate-700 overflow-hidden origin-bottom-right animate-in slide-in-from-bottom-10 fade-in
                    ${isExpanded 
                        ? 'w-[95vw] md:w-[700px] h-[60vh] md:h-[550px]' 
                        : 'w-[85vw] md:w-[350px] h-[50vh] md:h-[450px]'
                    } max-h-[calc(100vh-8rem)]`}
                >
                    {/* Header */}
                    <div className={`p-4 flex justify-between items-center text-white ${styles.header}`}>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">🦦</span>
                            <div>
                                <h3 className="font-bold text-sm">Rái cá Anatomy</h3>
                                <p className="text-[10px] opacity-90">Trợ lý học tập AI</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button onClick={() => setMessages([{ id: 'intro', role: 'model', text: 'Xin chào! Mình là **Rái cá Anatomy** 🦦.\n\nMình có thể giúp gì cho bạn?\n- Giải thích cấu trúc giải phẫu\n- Phân tích hình ảnh lâm sàng\n- Ôn tập kiến thức\n\nHãy hỏi mình ngay nhé!' }])} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Làm mới">
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button onClick={() => setIsExpanded(!isExpanded)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title={isExpanded ? "Thu nhỏ" : "Mở rộng"}>
                                {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                            </button>
                            <button onClick={() => setIsOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Ẩn">
                                <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-950/50 scroll-smooth">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                {msg.role === 'model' && (
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${styles.modelIcon}`}>
                                        <span className="text-base">🦦</span>
                                    </div>
                                )}
                                <div className={`max-w-[80%] space-y-2`}>
                                    {msg.image && (
                                        <img src={msg.image} alt="Uploaded" className="rounded-xl max-w-full h-auto border border-slate-200 dark:border-slate-700" />
                                    )}
                                    <div className={`p-3 rounded-2xl ${msg.role === 'user' ? `${styles.userBubble}` : 'bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-sm'}`}>
                                        <FormattedMessage text={msg.text} role={msg.role} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${styles.modelIcon}`}>
                                    <span className="text-base">🦦</span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full animate-bounce ${styles.loaderColor}`} style={{ animationDelay: '0ms' }}></div>
                                    <div className={`w-2 h-2 rounded-full animate-bounce ${styles.loaderColor}`} style={{ animationDelay: '150ms' }}></div>
                                    <div className={`w-2 h-2 rounded-full animate-bounce ${styles.loaderColor}`} style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800">
                        {selectedImage && (
                            <div className="mb-2 relative inline-block">
                                <img src={selectedImage} alt="Selected" className="h-16 rounded-lg border border-slate-200 dark:border-slate-700" />
                                <button 
                                    onClick={() => setSelectedImage(null)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                        <div className="flex items-end gap-2">
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                                title="Gửi ảnh"
                            >
                                <ImageIcon className="w-5 h-5" />
                            </button>
                            <input 
                                type="file" 
                                ref={fileInputRef}
                                onChange={handleImageSelect}
                                accept="image/*"
                                className="hidden"
                            />
                            <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-transparent focus-within:border-current focus-within:ring-1 focus-within:ring-current transition-all">
                                <textarea
                                    value={inputText}
                                    onChange={(e) => setInputText(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Hỏi Rái cá gì đó..."
                                    className={`w-full bg-transparent border-none focus:ring-0 p-3 max-h-32 resize-none text-sm text-slate-800 dark:text-white placeholder-slate-400 ${styles.inputFocus}`}
                                    rows={1}
                                    style={{ minHeight: '44px' }}
                                />
                            </div>
                            <button 
                                onClick={handleSend}
                                disabled={isLoading || (!inputText.trim() && !selectedImage)}
                                className={`p-3 rounded-xl text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${styles.sendBtn}`}
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
