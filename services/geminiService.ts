
import { GoogleGenAI, Type, Schema, GenerateContentResponse } from "@google/genai";
import { Difficulty, GeneratedMCQResponse, GeneratedStationResponse, MentorResponse, StationItem } from "../types";

// Storage Key for User's Custom API Key
export const STORAGE_API_KEY = 'OTTER_API_KEY';

// Helper to get the active client instance dynamically
const getAI = () => {
    const customKey = localStorage.getItem(STORAGE_API_KEY);
    // Prioritize custom key, fallback to env
    const key = customKey && customKey.trim().length > 0 ? customKey : (process.env.API_KEY || '');
    
    if (!key) {
        // Throw a specific error that UI can catch to show the Key Modal
        throw new Error("MISSING_API_KEY"); 
    }
    return new GoogleGenAI({ apiKey: key });
};

// OPTIMIZATION: Use Gemini 2.5 Flash exclusively.
const MODEL_MCQ = "gemini-2.5-flash"; 
const MODEL_VISION = "gemini-2.5-flash"; 
const MODEL_CHAT = "gemini-2.5-flash";

interface ContentFile {
    content: string;
    isText: boolean;
}

// OPTIMIZATION: Strict Token Limits.
const LIMIT_THEORY_CHARS = 60000; 
const LIMIT_CLINICAL_CHARS = 30000; 
const LIMIT_SAMPLE_CHARS = 20000;

// --- RETRY LOGIC HELPER ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryGeminiCall<T>(
  call: () => Promise<T>,
  retries: number = 3,
  initialDelay: number = 2000
): Promise<T> {
  let lastError: any;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await call();
    } catch (error: any) {
      lastError = error;
      
      const isRateLimit = 
        error.status === 429 || 
        error.status === 503 ||
        (error.message && (
          error.message.includes("429") || 
          error.message.includes("quota") || 
          error.message.includes("RESOURCE_EXHAUSTED") ||
          error.message.includes("Overloaded")
        ));

      if (error.status === 404 || (error.message && error.message.includes("not found"))) {
          throw new Error(`Lỗi Model AI (${error.status}): Không tìm thấy Model. Vui lòng Redeploy code mới nhất.`);
      }
      
      // Invalid Key Error
      if (error.status === 400 && error.message?.includes("API key")) {
          throw new Error("INVALID_API_KEY");
      }

      if (isRateLimit) {
        if (i === retries - 1) break; 
        console.warn(`Gemini Rate Limit hit. Retrying in ${initialDelay}ms... (Attempt ${i + 1}/${retries})`);
        await wait(initialDelay);
        initialDelay *= 2; 
      } else {
        throw error; 
      }
    }
  }
  
  const cleanMsg = lastError?.message || "Unknown error";
  if (cleanMsg.includes("quota") || cleanMsg.includes("RESOURCE_EXHAUSTED")) {
      // Return a specific flag string that UI can detect
      throw new Error("QUOTA_EXCEEDED");
  }
  throw new Error(`Lỗi kết nối AI: ${cleanMsg}`);
}

// --- INTELLIGENT CONTEXT FILTERING ---
function filterRelevantContent(content: string, topic: string, limit: number): string {
    if (!topic || topic.trim().length < 2) {
        return content.substring(0, limit); 
    }

    const keywords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 2); 
    if (keywords.length === 0) return content.substring(0, limit);

    const chunks = content.split(/\n\s*\n/); 
    
    const scoredChunks = chunks.map(chunk => {
        const lowerChunk = chunk.toLowerCase();
        let score = 0;
        keywords.forEach(kw => {
            if (lowerChunk.includes(kw)) score += 3; 
        });
        if (score > 0 && (lowerChunk.includes("khái niệm") || lowerChunk.includes("định nghĩa") || lowerChunk.includes("chức năng"))) {
            score += 1;
        }
        return { text: chunk, score };
    });

    scoredChunks.sort((a, b) => b.score - a.score);

    let result = "";
    let currentLen = 0;

    for (const chunk of scoredChunks) {
        if (chunk.score === 0 && currentLen > limit / 2) continue; 
        if (currentLen + chunk.text.length > limit) break;
        
        result += chunk.text + "\n\n";
        currentLen += chunk.text.length;
    }

    if (currentLen < Math.min(limit, 5000)) {
        const remaining = limit - currentLen;
        result += "\n--- Additional Context ---\n" + content.substring(0, remaining);
    }

    return result;
}

export const generateMCQQuestions = async (
  topic: string,
  count: number,
  difficulties: Difficulty[],
  files: { theory?: ContentFile[]; clinical?: ContentFile[]; sample?: ContentFile[] } = {}
): Promise<GeneratedMCQResponse> => {
  const ai = getAI();

  let systemInstruction = `
    Bạn là giáo sư Y khoa. Tạo ${count} câu trắc nghiệm giải phẫu về chủ đề "${topic}".
    Độ khó: ${difficulties.join(', ')}.
    Yêu cầu: 
    1. Trả về định dạng JSON thuần túy.
    2. 4 lựa chọn, 1 đáp án đúng.
    3. Giải thích ngắn gọn, súc tích.
    4. Tập trung hoàn toàn vào nội dung tài liệu được cung cấp dưới đây liên quan đến "${topic}".
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            difficulty: { type: Type.STRING },
          },
          required: ["question", "options", "correctAnswer", "explanation", "difficulty"],
        },
      },
    },
    required: ["questions"],
  };

  const parts: any[] = [];

  const addContentParts = (fileItems: ContentFile[] | undefined, sectionTitle: string, charLimit: number) => {
    if (!fileItems || fileItems.length === 0) return;

    parts.push({ text: `\n--- TÀI LIỆU ${sectionTitle} (Đã lọc theo chủ đề "${topic}") ---\n` });
    
    let currentChars = 0;

    for (const item of fileItems) {
        if (currentChars >= charLimit) break;

        if (item.content && item.isText) {
             const remaining = charLimit - currentChars;
             const relevantContent = filterRelevantContent(item.content, topic, remaining);
             
             parts.push({ text: relevantContent });
             currentChars += relevantContent.length;
        } else if (item.content && !item.isText) {
             parts.push({ text: item.content.substring(0, 1000) });
        }
    }
  };

  addContentParts(files.theory, "LÝ THUYẾT", LIMIT_THEORY_CHARS);
  addContentParts(files.clinical, "LÂM SÀNG", LIMIT_CLINICAL_CHARS);
  addContentParts(files.sample, "ĐỀ MẪU", LIMIT_SAMPLE_CHARS);

  parts.push({ text: `Hãy tạo đúng ${count} câu hỏi JSON.` });

  return retryGeminiCall(async () => {
      const response = await ai.models.generateContent({
          model: MODEL_MCQ,
          contents: {
              role: 'user',
              parts: parts
          },
          config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json",
              responseSchema: schema,
              temperature: 0.7
          }
      });

      const text = response.text;
      if (!text) throw new Error("AI trả về dữ liệu rỗng.");
      return JSON.parse(text) as GeneratedMCQResponse;
  });
};

export const generateStationQuestionFromImage = async (
    base64Image: string,
    topic: string,
    detailedTopic: string = ""
): Promise<{ questions: any[], isValid: boolean }> => {
    const ai = getAI();

    const systemInstruction = `
        Bạn là trạm trưởng thi chạy trạm giải phẫu (Spot Test).
        Nhiệm vụ: Nhìn hình ảnh lát cắt hoặc mô hình giải phẫu và đặt 1 câu hỏi định danh cấu trúc (VD: "Chi tiết số 1 là gì?", "Cấu trúc mũi tên chỉ vào?").
        
        Bối cảnh chương học: "${topic}".
        ${detailedTopic ? `Yêu cầu đặc biệt: Tập trung vào các chi tiết liên quan đến "${detailedTopic}".` : ""}

        Nếu hình ảnh chứa các chi tiết giải phẫu rõ ràng (số, mũi tên, hoặc cấu trúc đặc trưng), hãy tạo câu hỏi.
        Nếu hình ảnh KHÔNG RÕ RÀNG, quá mờ, hoặc KHÔNG PHẢI GIẢI PHẪU, hãy trả về isValid: false.
    `;

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            isValid: { type: Type.BOOLEAN, description: "True nếu ảnh là giải phẫu rõ ràng" },
            questions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        questionText: { type: Type.STRING },
                        correctAnswer: { type: Type.STRING },
                        explanation: { type: Type.STRING }
                    },
                    required: ["questionText", "correctAnswer", "explanation"]
                }
            }
        },
        required: ["isValid", "questions"]
    };

    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");

    return retryGeminiCall(async () => {
        const response = await ai.models.generateContent({
            model: MODEL_VISION,
            contents: {
                role: 'user',
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } },
                    { text: `Tạo 1 câu hỏi định danh cấu trúc quan trọng nhất trong hình này${detailedTopic ? ` liên quan đến ${detailedTopic}` : ""}.` }
                ]
            },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.5
            }
        });
        
        const text = response.text;
        if (!text) return { questions: [], isValid: false };
        return JSON.parse(text);
    });
};

export const chatWithOtter = async (history: any[], newMessage: string, image?: string): Promise<string> => {
    const ai = getAI();

    let parts: any[] = [];
    if (image) {
        const cleanBase64 = image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
    }
    parts.push({ text: newMessage });

    const recentHistory = history.slice(-8).map(h => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.text }] 
    }));

    return retryGeminiCall(async () => {
        const chat = ai.chats.create({
            model: MODEL_CHAT,
            history: recentHistory,
            config: {
                systemInstruction: "Bạn là Rái Cá Anatomy, trợ lý học tập vui vẻ, chuyên gia giải phẫu học.",
            }
        });

        const result = await chat.sendMessage({
            parts: parts
        });

        return result.text || "Rái cá đang bận bắt cá, thử lại sau nhé! 🦦";
    });
};

export const analyzeResultWithOtter = async (topic: string, stats: any): Promise<MentorResponse> => {
    const ai = getAI();
    
    // UPGRADED SYSTEM INSTRUCTION FOR DEEP ANALYSIS
    const systemInstruction = `
        Bạn là Rái Cá Mentor - một Giáo sư Giải phẫu học hàng đầu, rất nghiêm khắc về chuyên môn nhưng cũng vui tính (dùng emoji 🦦, 🧠, 🦴).
        
        Nhiệm vụ: Phân tích kết quả bài thi của sinh viên y khoa một cách chuyên sâu (Deep Dive Analysis).
        
        Dữ liệu đầu vào:
        - Chủ đề: ${topic}
        - Số liệu: ${JSON.stringify(stats)} (Số câu đúng/tổng theo từng mức độ khó).

        Yêu cầu output (JSON):
        1. "analysis": Một đoạn văn ngắn (3-4 câu) nhận xét tổng quan. Hãy so sánh khả năng ghi nhớ (Lý thuyết) với khả năng vận dụng (Lâm sàng). Nếu làm sai câu lâm sàng, hãy nhắc nhở về tầm quan trọng của việc ứng dụng. Nếu sai câu cơ bản, hãy nhắc học lại giải phẫu đại thể.
        2. "strengths": Liệt kê 2-3 điểm mạnh cụ thể dựa trên số liệu (VD: "Tư duy lâm sàng sắc bén", "Nắm vững chi tiết giải phẫu học").
        3. "weaknesses": Liệt kê 2-3 điểm yếu chí mạng cần khắc phục ngay (VD: "Hổng kiến thức giải phẫu định khu", "Chưa liên kết được giải phẫu và triệu chứng").
        4. "roadmap": Đưa ra một lộ trình 3 bước (Step 1, Step 2, Step 3) cực kỳ cụ thể để cải thiện chủ đề này. 
           - Step 1: Tập trung vào tài liệu nào, phương pháp nào (Atlas Netter, Flashcard...).
           - Step 2: Cách tư duy (Liên hệ chức năng, vẽ sơ đồ tư duy...).
           - Step 3: Luyện tập nâng cao (Giải case study, chạy trạm...).
    `;

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            analysis: { type: Type.STRING, description: "Nhận xét chuyên sâu, so sánh lý thuyết và lâm sàng." },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            roadmap: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        step: { type: Type.STRING, description: "Tên bước (VD: Bước 1: Củng cố nền tảng)" },
                        details: { type: Type.STRING, description: "Chi tiết hành động cần làm" }
                    },
                    required: ["step", "details"]
                }
            }
        },
        required: ["analysis", "strengths", "weaknesses", "roadmap"]
    };

    return retryGeminiCall(async () => {
        const response = await ai.models.generateContent({
            model: MODEL_MCQ, 
            contents: {
                role: 'user',
                parts: [{ text: `Phân tích kết quả bài thi chủ đề "${topic}". Số liệu chi tiết: ${JSON.stringify(stats)}.` }]
            },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.7 // Increase slightly for more creative advice
            }
        });

        const text = response.text;
        if (!text) throw new Error("No analysis");
        return JSON.parse(text) as MentorResponse;
    });
};
