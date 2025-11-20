import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Difficulty, GeneratedMCQResponse, GeneratedStationResponse } from "../types";

const apiKey = process.env.GEMINI_API_KEY || '';

// Initialize Gemini Client
// Note: In a real app, ensure usage of a backend proxy or secure environment variable handling.
// This demo assumes process.env.API_KEY is injected by the environment.
const ai = new GoogleGenAI({ apiKey });

const modelId = "gemini-2.5-flash";

export const generateMCQQuestions = async (
  topic: string,
  count: number,
  difficulty: Difficulty
): Promise<GeneratedMCQResponse> => {
  if (!apiKey) throw new Error("API Key is missing");

  const prompt = `
    Tạo ${count} câu hỏi trắc nghiệm giải phẫu học về chủ đề: "${topic}".
    Mức độ khó: ${difficulty}.
    Ngôn ngữ: Tiếng Việt.
    Mỗi câu hỏi phải có 4 lựa chọn, chỉ 1 đáp án đúng.
    Giải thích chi tiết tại sao đáp án đó đúng.
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
          },
          required: ["question", "options", "correctAnswer", "explanation"],
        },
      },
    },
    required: ["questions"],
  };

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as GeneratedMCQResponse;
  } catch (error) {
    console.error("MCQ Generation Error:", error);
    throw error;
  }
};

export const generateStationQuestionsForImage = async (
  imageBase64: string,
  count: number = 3
): Promise<GeneratedStationResponse> => {
  if (!apiKey) throw new Error("API Key is missing");

  // Clean base64 string if needed (remove data:image/png;base64, prefix)
  const cleanBase64 = imageBase64.split(',')[1] || imageBase64;

  const prompt = `
    Đóng vai giáo sư giải phẫu học. Hãy xem hình ảnh này và tạo ${count} câu hỏi ngắn dạng "chạy trạm" (Spot Test).
    Các câu hỏi nên tập trung vào việc định danh cấu trúc (ví dụ: "Cấu trúc được chỉ mũi tên là gì?", "Chức năng của cơ quan này?", "Mạch máu này cấp máu cho vùng nào?").
    Vì đây là thi chạy trạm, câu trả lời phải ngắn gọn, chính xác (1-3 từ).
    Ngôn ngữ: Tiếng Việt.
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            questionText: { type: Type.STRING, description: "Câu hỏi về cấu trúc trong hình" },
            correctAnswer: { type: Type.STRING, description: "Đáp án ngắn gọn" },
            explanation: { type: Type.STRING, description: "Giải thích thêm về cấu trúc" },
          },
          required: ["questionText", "correctAnswer", "explanation"],
        },
      },
    },
    required: ["questions"],
  };

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg", // Assuming JPEG for simplicity, but works with PNG too
              data: cleanBase64,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        temperature: 0.5, // Lower temperature for more factual answers
      },
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as GeneratedStationResponse;
  } catch (error) {
    console.error("Station Generation Error:", error);
    throw error;
  }
};
