
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

// OPTIMIZATION: Massive Token Limits for Gemini 2.5 Flash (1M context)
// We can afford to send much more context to ensure accuracy.
const LIMIT_THEORY_CHARS = 200000; 
const LIMIT_CLINICAL_CHARS = 100000; 
const LIMIT_SAMPLE_CHARS = 50000;

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

// --- INTELLIGENT CONTEXT FILTERING (RELAXED) ---
// With larger context window, we can be less aggressive about filtering.
function filterRelevantContent(content: string, topic: string, limit: number): string {
    if (!topic || topic.trim().length < 2) {
        return content.substring(0, limit); 
    }

    const keywords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 2); 
    if (keywords.length === 0) return content.substring(0, limit);

    // Split by paragraphs to keep context together
    const chunks = content.split(/\n\s*\n/); 
    
    const scoredChunks = chunks.map(chunk => {
        const lowerChunk = chunk.toLowerCase();
        let score = 0;
        // Base score for keyword match
        keywords.forEach(kw => {
            if (lowerChunk.includes(kw)) score += 5; 
        });
        // Boost for definition/intro
        if (score > 0 && (lowerChunk.includes("khái niệm") || lowerChunk.includes("định nghĩa") || lowerChunk.includes("chức năng") || lowerChunk.includes("cấu tạo"))) {
            score += 2;
        }
        // Boost for exact phrase match (high value)
        if (lowerChunk.includes(topic.toLowerCase())) {
            score += 10;
        }
        return { text: chunk, score };
    });

    // Sort by score descending
    scoredChunks.sort((a, b) => b.score - a.score);

    let result = "";
    let currentLen = 0;

    for (const chunk of scoredChunks) {
        // Include chunk if it has a score OR if we have plenty of space (context filler)
        // But prioritize high scores first.
        if (chunk.score === 0 && currentLen > limit * 0.8) continue; 
        
        if (currentLen + chunk.text.length > limit) break;
        
        result += chunk.text + "\n\n";
        currentLen += chunk.text.length;
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

  // REFINED PROMPT FOR STRICTER TOPIC ADHERENCE AND DIFFICULTY ANALYSIS
  let systemInstruction = `
    Bạn là Giáo sư GIẢI PHẪU ĐẠI THỂ (Gross Anatomy) hàng đầu tại Đại học Y Dược.
    Nhiệm vụ: Phân tích KỸ LƯỠNG tài liệu được cung cấp (nếu có) để tạo CHÍNH XÁC ${count} câu trắc nghiệm.
    Chủ đề Trọng Tâm: "${topic}".
    
    YÊU CẦU VỀ ĐỘ KHÓ (BẮT BUỘC TUÂN THỦ):
    Bạn chỉ được tạo câu hỏi thuộc các mức độ sau: ${difficulties.join(', ')}. Hãy chia tỷ lệ hợp lý.
    
    CHIẾN LƯỢC PHÂN TÍCH FILE & TẠO CÂU HỎI:
    
    1. **${Difficulty.REMEMBER} (Ghi nhớ)**: 
       - Quét file LÝ THUYẾT: Tìm các định nghĩa, tên cấu trúc, nguyên ủy, bám tận, chi phối thần kinh.
       - Hỏi trực diện: "Cơ nào...", "Thần kinh nào...", "Cấu trúc nào nằm ở...".
       
    2. **${Difficulty.UNDERSTAND} (Hiểu)**: 
       - Quét file LÝ THUYẾT: Tìm các đoạn văn mô tả liên quan, chức năng, sự tương quan giữa các cơ quan.
       - Hỏi về cơ chế: "Tại sao...", "Chức năng chính của...", "Hệ quả khi...".
       
    3. **${Difficulty.APPLY} (Vận dụng thấp)**: 
       - Kết hợp thông tin LÝ THUYẾT: Đặt tình huống giả định đơn giản về vị trí tương đối.
       - Ví dụ: "Trong phẫu thuật vùng X, cấu trúc nào dễ bị tổn thương nhất?".
       
    4. **${Difficulty.CLINICAL} (Lâm sàng)**: 
       - **QUAN TRỌNG**: Ưu tiên tối đa việc trích xuất dữ liệu từ file "LÂM SÀNG" (Case Study, Bệnh án) nếu người dùng cung cấp.
       - Nếu có file Lâm sàng: Hãy tạo câu hỏi dựa trên đúng các case đó.
       - Nếu KHÔNG có file Lâm sàng: Hãy dùng kiến thức y khoa chuẩn để tạo tình huống bệnh lý thực tế liên quan đến "${topic}" (Gãy xương, liệt thần kinh, tắc mạch...).
       - Cấu trúc: [Mô tả triệu chứng/Tiền sử] -> [Hỏi về tổn thương giải phẫu].

    QUY TẮC CHUNG:
    - **BÁM SÁT FILE**: Nếu tài liệu có thông tin về "${topic}", phải ưu tiên dùng nó làm dữ liệu nguồn (grounding).
    - **GROSS ANATOMY ONLY**: Chỉ hỏi giải phẫu đại thể (Cơ, Xương, Mạch, Thần kinh, Tạng). Không hỏi mô học/tế bào.
    - **OUTPUT**: JSON thuần túy.
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

    parts.push({ text: `\n--- TÀI LIỆU THAM KHẢO: ${sectionTitle} ---\n` });
    
    let currentChars = 0;

    for (const item of fileItems) {
        if (currentChars >= charLimit) break;

        if (item.content && item.isText) {
             const remaining = charLimit - currentChars;
             // Filter content to prioritize the topic, but keep large context
             const relevantContent = filterRelevantContent(item.content, topic, remaining);
             
             parts.push({ text: relevantContent });
             currentChars += relevantContent.length;
        } else if (item.content && !item.isText) {
             parts.push({ text: item.content.substring(0, 2000) });
        }
    }
  };

  addContentParts(files.theory, "LÝ THUYẾT", LIMIT_THEORY_CHARS);
  addContentParts(files.clinical, "LÂM SÀNG (Dùng cho câu hỏi Lâm sàng)", LIMIT_CLINICAL_CHARS);
  addContentParts(files.sample, "ĐỀ MẪU", LIMIT_SAMPLE_CHARS);

  // Final Reminder in prompt
  parts.push({ text: `YÊU CẦU: Tạo ${count} câu hỏi trắc nghiệm về chủ đề "${topic}". Hãy phân tích kỹ các file trên (đặc biệt là file Lâm sàng cho câu hỏi Lâm sàng) để tạo câu hỏi sát thực tế.` });

  return retryGeminiCall(async () => {
      const response = await ai.models.generateContent({
          model: MODEL_MCQ,
          contents: [{
              role: 'user',
              parts: parts
          }],
          config: {
              systemInstruction: systemInstruction,
              responseMimeType: "application/json",
              responseSchema: schema,
              temperature: 0.4
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

    // STRICTER SYSTEM INSTRUCTION
    const systemInstruction = `
        Bạn là Hội đồng Khảo thí Giải phẫu học cực kỳ nghiêm ngặt.
        Nhiệm vụ: Kiểm duyệt hình ảnh và tạo 1 câu hỏi định danh cấu trúc (Spot Test) NẾU VÀ CHỈ NẾU hình ảnh đạt chuẩn.

        DỮ LIỆU:
        - HÌNH 1: Đề bài (Thường là hình vẽ giải phẫu).
        - HÌNH 2: Đáp án/Chú thích (Nếu có).
        - CHỦ ĐỀ YÊU CẦU: "${detailedTopic}".

        QUY TRÌNH KIỂM DUYỆT (STEP-BY-STEP):
        
        1. **BƯỚC 1: KIỂM TRA LOẠI HÌNH ẢNH (Quan trọng nhất)**
           - Nhìn vào HÌNH 1.
           - Nếu HÌNH 1 chứa 80% là văn bản, danh sách (list), bảng biểu (table), hoặc mục lục -> **TRẢ VỀ isValid: false NGAY LẬP TỨC**.
           - Nếu HÌNH 1 là trang trắng hoặc chỉ có tiêu đề -> **TRẢ VỀ isValid: false**.
           - HÌNH 1 BẮT BUỘC phải là HÌNH VẼ MINH HỌA GIẢI PHẪU (Atlas, mô hình, xác, xương, cơ...).

        2. **BƯỚC 2: KIỂM TRA CHỦ ĐỀ**
           - Hình ảnh có liên quan đến "${detailedTopic}" không?
           - Ví dụ: Yêu cầu "Tim mạch" nhưng hình là "Xương chi dưới" -> **TRẢ VỀ isValid: false**.
           - Chỉ chấp nhận nếu đúng hoặc liên quan mật thiết đến chủ đề.

        3. **BƯỚC 3: TẠO CÂU HỎI (Chỉ khi Bước 1 & 2 OK)**
           - Tìm một chi tiết có số hoặc mũi tên trên HÌNH 1.
           - Đối chiếu HÌNH 2 để tìm tên chính xác.
           - Nếu không có số: Hãy tự chọn một cấu trúc NỔI BẬT NHẤT và hỏi.
           - Output câu hỏi JSON.

        OUTPUT JSON:
        {
            "isValid": boolean, // False nếu là trang chữ/mục lục/sai chủ đề.
            "questions": [
                {
                    "questionText": "Cấu trúc số X là gì?",
                    "correctAnswer": "Tên chuẩn (Latin/Việt)",
                    "acceptedKeywords": ["tên khác"],
                    "explanation": "Mô tả ngắn gọn vị trí/chức năng."
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
        parts.push({ text: `HÌNH 1 là CÂU HỎI. HÌNH 2 là ĐÁP ÁN. Kiểm tra kỹ xem HÌNH 1 có phải là hình vẽ giải phẫu không. Nếu toàn chữ -> isValid: false.` });
    } else {
        parts.push({ text: `Phân tích hình ảnh này. Nếu là văn bản/text -> isValid: false.` });
    }

    return retryGeminiCall(async () => {
        const response = await ai.models.generateContent({
            model: MODEL_VISION,
            contents: [{
                role: 'user',
                parts: parts
            }],
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.2 // Low temperature to be strict about isValid rules
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

    // Prepare conversation history for generateContent (Stateless usage)
    // history contains objects like { role: 'user'|'model', text: string }
    const contents: any[] = history.map(h => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.text }] 
    }));

    // Prepare the new message parts
    const currentParts: any[] = [];
    if (image) {
        const cleanBase64 = image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
        currentParts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
    }
    currentParts.push({ text: newMessage });

    // Add new message to the end of contents
    contents.push({
        role: 'user',
        parts: currentParts
    });

    return retryGeminiCall(async () => {
        // Use generateContent directly instead of chats.create/sendMessage to avoid ContentUnion/State errors
        const response = await ai.models.generateContent({
            model: MODEL_CHAT,
            contents: contents,
            config: {
                systemInstruction: "Bạn là Rái Cá Anatomy, trợ lý học tập vui vẻ, chuyên gia giải phẫu học. Hãy trả lời ngắn gọn, súc tích và dễ hiểu. Sử dụng định dạng Markdown (in đậm, gạch đầu dòng) để trình bày rõ ràng.",
            }
        });

        return response.text || "Rái cá đang bận bắt cá, thử lại sau nhé! 🦦";
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
            contents: [{
                role: 'user',
                parts: [{ text: `Phân tích kết quả bài thi chủ đề "${topic}". Số liệu chi tiết: ${JSON.stringify(stats)}.` }]
            }],
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
