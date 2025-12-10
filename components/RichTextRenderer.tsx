
import React from 'react';
import katex from 'katex';

interface RichTextRendererProps {
    content: string;
    className?: string;
}

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({ content, className = '' }) => {
    if (!content) return null;

    // Helper to render inline content: Text, Math ($...$), Images (![](url))
    const renderInline = (text: string) => {
        // Regex captures: 
        // 1. Image syntax: ![alt](url)
        // 2. Math syntax: $...$
        // The regex splits by capturing groups so we can interleave text/images/math
        const regex = /(!\[.*?\]\(.*?\))|(\$[^\$]+\$)/g;
        
        return text.split(regex).map((part, index) => {
            if (!part) return null;

            // Check Image: ![alt](url)
            const imgMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/);
            if (imgMatch) {
                return (
                    <img 
                        key={index} 
                        src={imgMatch[2]} 
                        alt={imgMatch[1]} 
                        className="max-w-full h-auto rounded-lg my-3 mx-auto shadow-sm block" 
                        loading="lazy"
                    />
                );
            }

            // Check Math: $...$
            if (part.startsWith('$') && part.endsWith('$')) {
                const math = part.slice(1, -1);
                try {
                    const html = katex.renderToString(math, {
                        throwOnError: false,
                        displayMode: false
                    });
                    return (
                        <span 
                            key={index} 
                            dangerouslySetInnerHTML={{ __html: html }} 
                            className="mx-1 inline-block"
                        />
                    );
                } catch (e) {
                    return <span key={index} className="text-red-500 font-mono">{part}</span>;
                }
            }

            // Regular Text
            return <span key={index}>{part}</span>;
        });
    };

    // Split content into lines to handle Lists vs Paragraphs
    const lines = content.split(/\r?\n/);
    const blocks: React.ReactNode[] = [];
    let listBuffer: string[] = [];

    const flushList = () => {
        if (listBuffer.length > 0) {
            blocks.push(
                <ul key={`list-${blocks.length}`} className="list-disc pl-6 space-y-2 my-3 text-left w-full inline-block bg-black/5 dark:bg-white/5 rounded-xl p-4 border border-black/5 dark:border-white/5">
                    {listBuffer.map((item, i) => (
                        <li key={i} className="pl-1 leading-relaxed text-[0.95em]">
                            {renderInline(item)}
                        </li>
                    ))}
                </ul>
            );
            listBuffer = [];
        }
    };

    lines.forEach((line, i) => {
        const trimmed = line.trim();
        // Detect bullet points: starts with -, *, or • followed by space
        if (/^[-*•]\s/.test(trimmed)) {
            listBuffer.push(trimmed.replace(/^[-*•]\s/, ''));
        } else {
            flushList();
            
            // Handle regular line
            if (trimmed.length === 0) {
                // Empty line creates a gap
                blocks.push(<div key={`gap-${i}`} className="h-4" />); 
            } else {
                blocks.push(
                    <div key={`p-${i}`} className="mb-2 leading-relaxed break-words">
                        {renderInline(line)}
                    </div>
                );
            }
        }
    });
    flushList(); // Final flush for any remaining list items

    return (
        <div className={`w-full ${className} text-left`}>
            {blocks}
        </div>
    );
};
