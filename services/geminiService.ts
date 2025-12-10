
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
  initialDelay: number = 4000 // Increased to 4000ms to be safer against 429
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

  let systemInstruction = `
    Bạn là Giáo sư GIẢI PHẪU ĐẠI THỂ (Gross Anatomy) hàng đầu tại Đại học Y Dược.
    Nhiệm vụ: Phân tích KỸ LƯỠNG tài liệu được cung cấp (nếu có) để tạo CHÍNH XÁC ${count} câu trắc nghiệm.
    Chủ đề Trọng Tâm: "${topic}".
    
    YÊU CẦU VỀ ĐỘ KHÓ (BẮT BUỘC TUÂN THỦ):
    Bạn chỉ được tạo câu hỏi thuộc các mức độ sau: ${difficulties.join(', ')}.
    
    TỈ LỆ PHÂN BỐ CÂU HỎI (QUAN TRỌNG):
    Nếu danh sách độ khó cho phép, hãy tuân thủ tỉ lệ:
    - **60%** câu hỏi thuộc mức độ: ${Difficulty.REMEMBER} (Ghi nhớ) + ${Difficulty.UNDERSTAND} (Hiểu).
    - **40%** câu hỏi thuộc mức độ: ${Difficulty.APPLY} (Vận dụng thấp) + ${Difficulty.CLINICAL} (Lâm sàng).
    (Nếu người dùng không chọn đủ các mức độ trên, hãy chia đều cho các mức độ được chọn).
    
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

    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
    const cleanAnswerBase64 = answerImageBase64 ? answerImageBase64.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "") : null;

    // EXTREME ZONING INSTRUCTION
    const systemInstruction = `
        Bạn là Hội đồng Khảo thí Giải phẫu học (Chế độ Chạy trạm / Spot Test).
        
        MỤC TIÊU: Tìm ảnh giải phẫu sạch, có chú thích số/đường dẫn, đúng chủ đề "${detailedTopic}".

        INPUT:
        - ẢNH 1: Trang câu hỏi (có thể là hình vẽ, X-quang, mô hình).
        - ẢNH 2: Trang đáp án (hoặc trang liền kề).

        QUY TRÌNH "FAIL-FAST" (PHẢI TUÂN THỦ NGHIÊM NGẶT):
        
        1. **CHECK VĂN BẢN (TEXT HEAVY CHECK) - CỰC KỲ QUAN TRỌNG**:
           - Nếu trang chứa chủ yếu là chữ (Text > 25% diện tích) -> **REJECT NGAY**.
           - Nếu là Trang Bìa, Mục Lục, Lời nói đầu, Danh sách thuật ngữ, Index -> **REJECT NGAY**.
           - Nếu là Bảng biểu (Table) toàn chữ -> **REJECT NGAY**.
           - Nếu hình ảnh nhỏ (thumbnail) và xung quanh toàn là text mô tả -> **REJECT NGAY**.
           - CHỈ CHẤP NHẬN trang có HÌNH VẼ GIẢI PHẪU LỚN, RÕ RÀNG, CHIẾM ĐA SỐ DIỆN TÍCH.

        2. **CHECK CHỦ ĐỀ (ZONING)**: 
           - Hình ảnh có thuộc vùng "${detailedTopic}" không? 
           - Nếu chủ đề là "Chi trên" mà hình là "Tim" -> REJECT ngay.
           - Nếu hình ảnh không có chi tiết giải phẫu nào được đánh số hoặc chỉ mũi tên (Leader lines) -> REJECT ngay.

        3. **TRÍCH XUẤT (NẾU PASS BƯỚC 1 & 2)**:
           - Chọn 1 chi tiết CÓ ĐÁNH SỐ RÕ RÀNG trên Hình 1.
           - Dùng Hình 2 để tìm tên chính xác.
           - **BẮT BUỘC: DỊCH TÊN CẤU TRÚC SANG TIẾNG VIỆT CHUẨN (Danh pháp giải phẫu VN).**
           - Nếu tên gốc là Latin/Anh, PHẢI dịch sang Tiếng Việt tương ứng. Ví dụ: "Deltoid muscle" -> "Cơ delta", "Humerus" -> "Xương cánh tay".
           - Không dùng tên tiếng Anh làm đáp án chính (chỉ để trong keywords).
           - Tạo câu hỏi "Chi tiết số X là gì?".

        4. **TỐI ƯU KEYWORDS (acceptedKeywords)**:
           - Hãy liệt kê TẤT CẢ các cách gọi thông dụng có thể có.
           - Viết tắt: ĐM (Động mạch), TM (Tĩnh mạch), TK (Thần kinh), DC (Dây chằng). Ví dụ: "Động mạch nách" -> thêm "ĐM nách".
           - Tên ngắn gọn: Bỏ bớt từ loại. Ví dụ: "Cơ nhị đầu cánh tay" -> thêm "Cơ nhị đầu", "Nhị đầu". "Xương quay" -> thêm "Quay".
           - Tên Latin/Anh (nếu phổ biến).

        OUTPUT JSON:
        {
            "isValid": boolean, 
            "questions": [
                {
                    "questionText": "Chi tiết số [X] là gì?", 
                    "correctAnswer": "Tên Tiếng Việt chuẩn",
                    "acceptedKeywords": ["Tên Latin", "Tên tiếng Anh", "Tên viết tắt (ĐM...)", "Tên ngắn gọn"],
                    "explanation": "Mô tả ngắn về vị trí/chức năng bằng Tiếng Việt."
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
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
    
    if (cleanAnswerBase64) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanAnswerBase64 } });
        parts.push({ text: `ẢNH 1: Đề thi. ẢNH 2: Đáp án/Tham khảo. Chủ đề bắt buộc: "${detailedTopic}". Nếu không đúng chủ đề hoặc không phải hình giải phẫu, trả về isValid: false ngay.` });
    } else {
        parts.push({ text: `Chủ đề: "${detailedTopic}". Nếu không đúng, isValid: false.` });
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
                temperature: 0.1
            }
        });
        
        const text = response.text;
        if (!text) return { questions: [], isValid: false };
        try {
            return JSON.parse(text);
        } catch (e) {
            return { questions: [], isValid: false };
        }
    });
};

export const chatWithOtter = async (history: any[], newMessage: string, image?: string): Promise<string> => {
    const ai = getAI();

    const contents: any[] = history.map(h => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: h.text }] 
    }));

    const currentParts: any[] = [];
    if (image) {
        const cleanBase64 = image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
        currentParts.push({ inlineData: { mimeType: 'image/jpeg', data: cleanBase64 } });
    }
    currentParts.push({ text: newMessage });

    contents.push({
        role: 'user',
        parts: currentParts
    });

    return retryGeminiCall(async () => {
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
    
    const systemInstruction = `
        Bạn là Rái Cá Mentor - một Giáo sư Giải phẫu học hàng đầu.
        Nhiệm vụ: Phân tích kết quả bài thi của sinh viên y khoa.
        Dữ liệu: Chủ đề "${topic}", Kết quả ${JSON.stringify(stats)}.
        Output JSON: analysis (nhận xét), strengths (điểm mạnh), weaknesses (điểm yếu), roadmap (lộ trình 3 bước).
    `;

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            analysis: { type: Type.STRING },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            roadmap: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        step: { type: Type.STRING },
                        details: { type: Type.STRING }
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
                parts: [{ text: `Phân tích kết quả bài thi chủ đề "${topic}".` }]
            }],
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema,
                temperature: 0.7
            }
        });

        const text = response.text;
        if (!text) throw new Error("No analysis");
        return JSON.parse(text) as MentorResponse;
    });
};
