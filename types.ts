
export enum AppMode {
  HOME = 'HOME',
  MCQ = 'MCQ', // Trắc nghiệm
  STATION = 'STATION', // Chạy trạm
  FLASHCARD = 'FLASHCARD', // Thẻ ghi nhớ
  HISTORY = 'HISTORY', // Lịch sử thi
}

export interface UserProfile {
  uid?: string; // Firebase User ID
  fullName: string;
  studentId: string;
  avatar?: string; // Base64 image string
  isVipShowgirl?: boolean; // Trạng thái đã mua giao diện Showgirl
  isVip1989?: boolean; // Trạng thái đã mua giao diện 1989
  isVipFolklore?: boolean; // Trạng thái đã mua giao diện Folklore
  isVipTTPD?: boolean; // Trạng thái đã mua giao diện TTPD
  isVipEvermore?: boolean; // Trạng thái đạt được giao diện Evermore (Achievement)
}

export interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string; // Should match one of the options
  explanation: string;
  difficulty?: string; // Mức độ khó của câu hỏi
}

export interface StationItem {
  id: string;
  imageUri: string; // Base64 of the PDF page
  questions: StationQuestion[];
}

export interface StationQuestion {
  id: string;
  questionText: string; // e.g., "Chi tiết số 1 là gì?"
  correctAnswer: string;
  explanation?: string;
}

export enum Difficulty {
  REMEMBER = 'Ghi nhớ',
  UNDERSTAND = 'Hiểu',
  APPLY = 'Vận dụng thấp',
  CLINICAL = 'Lâm sàng',
}

// Gemini Response Schemas
export interface GeneratedMCQResponse {
  questions: {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    difficulty: string;
  }[];
}

export interface GeneratedStationResponse {
  questions: {
    questionText: string;
    correctAnswer: string;
    explanation: string;
  }[];
}

// Otter Mentor Response
export interface MentorResponse {
    analysis: string; // Lời nhận xét của Rái cá
    strengths: string[]; // Điểm mạnh
    weaknesses: string[]; // Điểm yếu
    roadmap: {
        step: string;
        details: string;
    }[]; // Các bước cải thiện
}

// Flashcard Interfaces

export interface FlashcardSRData {
  interval: number; // Khoảng cách (ngày) cho lần ôn tiếp theo. 0 nghĩa là đang học lại.
  ease: number; // Hệ số dễ (mặc định 2.5)
  dueDate: number; // Timestamp thời điểm cần ôn tập
  reviewCount: number; // Số lần đã ôn
  state: 'NEW' | 'LEARNING' | 'REVIEW' | 'RELEARNING';
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  srData?: FlashcardSRData; // Optional: Dữ liệu Spaced Repetition
}

export interface FlashcardDeck {
  id: string;
  title: string;
  description: string;
  cards: Flashcard[];
  createdAt: number;
}

// History Interfaces
export interface ExamHistory {
  id: string;
  type: 'MCQ' | 'STATION';
  topic: string;
  score: number;
  totalQuestions: number;
  timestamp: number;
  questions: MCQQuestion[]; // Store the full questions to review later
  userAnswers: Record<string, string>;
  timeLimit: number;
  createdAt: any; // Firestore Timestamp
}