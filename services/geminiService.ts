
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
    Bạn là Giáo sư GIẢI PHẪU ĐẠI THỂ (Gross Anatomy) hàng đầu tại Đại học Y Dược.
    Nhiệm vụ: Tạo ${count} câu trắc nghiệm giải phẫu về chủ đề "${topic}".
    Độ khó: ${difficulties.join(', ')}.

    QUY TẮC TỐI THƯỢNG (STRICT RULES):
    1. **TRỌNG TÂM TUYỆT ĐỐI LÀ GIẢI PHẪU ĐẠI THỂ (GROSS ANATOMY)**:
       - Chỉ tập trung vào cấu trúc nhìn thấy bằng mắt thường trên phẫu tích: Cơ, Xương, Khớp, Mạch máu, Thần kinh, Tạng, Liên quan giải phẫu.
       - Các câu hỏi phải xoay quanh: Nguyên ủy, Bám tận, Đường đi, Chi phối, Cấp máu, Vị trí tương đối, Hình thể ngoài, Hình thể trong (cấu trúc lớn).
    
    2. **TUYỆT ĐỐI LOẠI BỎ MÔ HỌC/VI THỂ (NO HISTOLOGY)**:
       - **CẤM** hỏi về cấu trúc tế bào, mô học, kính hiển vi.
       - **CẤM** sử dụng các từ khóa vi thể: "biểu mô", "lát tầng", "trụ đơn", "tiểu cầu thận", "tế bào gan", "ống lượn", "quai Henle", "nang bạch huyết", "tiểu đảo Langerhans", "vi nhung mao".
       - Nếu tài liệu đầu vào có chứa thông tin Mô học/Vi thể, hãy **LỜ ĐI** và chỉ trích xuất thông tin Đại thể.
       - Ví dụ sai (Vi thể): "Biểu mô lót bàng quang là gì?" -> **LOẠI BỎ**.
       - Ví dụ đúng (Đại thể): "Động mạch cấp máu cho bàng quang xuất phát từ đâu?" -> **CHẤP NHẬN**.

    3. **BÁM SÁT TÀI LIỆU**:
       - Chỉ sử dụng thông tin từ văn bản được cung cấp dưới đây.
       - Nếu tài liệu không có thông tin về "${topic}", hãy trả lời trung thực hoặc tạo câu hỏi từ phần có liên quan nhất trong tài liệu đó (nhưng vẫn phải là ĐẠI THỂ).

    4. **ĐỊNH DẠNG JSON**:
       - Trả về định dạng JSON thuần túy.
       - 4 lựa chọn, 1 đáp án đúng.
       - Giải thích ngắn gọn, súc tích, tập trung vào tư duy giải phẫu đại thể.
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

  parts.push({ text: `Hãy tạo đúng ${count} câu hỏi JSON về GIẢI PHẪU ĐẠI THỂ (Tuyệt đối KHÔNG MÔ HỌC).` });

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
              temperature: 0.4 // Lower temperature even more for stricter adherence to Gross Anatomy
          }
      });

      const text = response.text;
      if (!text) throw new Error("AI trả về dữ liệu rỗng.");
      return JSON.parse(text) as GeneratedMCQResponse;
  });
};

export const generateStationQuestionFromImage = async (
    base64Image: string,
    answerImageBase64: string | null,
    topic: string,
    detailedTopic: string = ""
): Promise<{ questions: any[], isValid: boolean }> => {
    const ai = getAI();

    // Extract clean base64
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
    const cleanAnswerBase64 = answerImageBase64 ? answerImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "") : null;

    // EXTREMELY RELAXED SYSTEM INSTRUCTION
    const systemInstruction = `
        Bạn là Trợ giảng Giải phẫu học. Nhiệm vụ là tạo câu hỏi định danh cấu trúc (Spot Test) từ hình ảnh.
        
        QUAN TRỌNG NHẤT: CỐ GẮNG TẠO CÂU HỎI, ĐỪNG BỎ QUA.
        
        1. **HÌNH ẢNH**: Bạn nhận được HÌNH CÂU HỎI và (tùy chọn) HÌNH ĐÁP ÁN (trang sau).
        
        2. **ĐIỀU KIỆN CHẤP NHẬN (Rất lỏng)**:
           - Nếu hình ảnh có BẤT KỲ cấu trúc giải phẫu người nào (xương, cơ, tạng...), hãy đặt câu hỏi.
           - KHÔNG cần thiết phải có số/mũi tên. Nếu không có, hãy tự chọn một cấu trúc nổi bật và hỏi vị trí của nó.
           - CHỈ từ chối (isValid: false) nếu hình là: Trang bìa, Trang trắng hoàn toàn, Toàn chữ văn bản không có hình.
           - Về chủ đề: Ưu tiên "${detailedTopic}", NHƯNG nếu hình thuộc chủ đề giải phẫu khác cũng VẪN CHẤP NHẬN để sinh viên có bài ôn tập.

        3. **CHIẾN LƯỢC TẠO CÂU HỎI**:
           - Tìm số/chữ trên hình và tra cứu ở hình đáp án.
           - NẾU KHÔNG TÌM THẤY ĐÁP ÁN TEXT: Hãy dùng kiến thức y khoa của bạn để tự định danh cấu trúc đó.
           - Ví dụ câu hỏi khi không có số: "Cấu trúc lớn nhất nằm ở trung tâm hình là gì?" hoặc "Đây là mặt nào của xương ...?".

        OUTPUT JSON:
        {
            "isValid": boolean, // True cho 99% hình giải phẫu. False chỉ cho hình rác.
            "questions": [
                {
                    "questionText": "Câu hỏi ngắn gọn",
                    "correctAnswer": "Tên cấu trúc chính xác",
                    "acceptedKeywords": ["tên khác", "tên latin"],
                    "explanation": "Giải thích ngắn gọn."
                }
            ]
        }
    `;

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            isValid: { type: Type.BOOLEAN },
            questions: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        questionText: { type: Type.STRING },
                        correctAnswer: { type: Type.STRING },
                        acceptedKeywords: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING }
                        },
                        explanation: { type: Type.STRING }
                    },
                    required: ["questionText", "correctAnswer", "acceptedKeywords", "explanation"]
                }
            }
        },
        required: ["isValid", "questions"]
    };

    const parts: any[] = [];
    
    // 1. Add Question Image
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
    
    // 2. Add Answer Image if available
    if (cleanAnswerBase64) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanAnswerBase64 } });
        parts.push({ text: `HÌNH 1 là CÂU HỎI. HÌNH 2 là ĐÁP ÁN. Hãy tìm một chi tiết để hỏi. Nếu không có text đáp án, HÃY DÙNG KIẾN THỨC CỦA BẠN. Đừng trả về isValid=false trừ khi hình không phải giải phẫu.` });
    } else {
        parts.push({ text: `Hãy phân tích hình ảnh giải phẫu này và tạo 1 câu hỏi định danh cấu trúc. Dùng kiến thức của bạn nếu cần.` });
    }

    return retryGeminiCall(async () => {
        const response = await ai.models.generateContent({
            model: MODEL_VISION,
            contents: {
                role: 'user',
                parts: parts
            },
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.5 // More creative to allow guessing/inferring
            }
        });
        
        const text = response.text;
        if (!text) return { questions: [], isValid: false };
        try {
            return JSON.parse(text);
        } catch (e) {
            // If JSON parsing fails, treat as invalid
            console.error("JSON Parse Error", text);
            return { questions: [], isValid: false };
        }
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
