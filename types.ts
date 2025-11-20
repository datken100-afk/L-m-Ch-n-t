
export enum AppMode {
  HOME = 'HOME',
  MCQ = 'MCQ', // Trắc nghiệm
  STATION = 'STATION', // Chạy trạm
}

export interface UserProfile {
  fullName: string;
  studentId: string;
}

export interface MCQQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string; // Should match one of the options
  explanation: string;
}

export interface StationItem {
  id: string;
  imageUri: string; // Base64 or URL
  questions: StationQuestion[];
}

export interface StationQuestion {
  id: string;
  questionText: string; // e.g., "Chi tiết số 1 là gì?"
  correctAnswer: string;
  explanation?: string;
}

export enum Difficulty {
  EASY = 'Dễ',
  MEDIUM = 'Trung bình',
  HARD = 'Khó',
  CLINICAL = 'Lâm sàng',
}

// Gemini Response Schemas
export interface GeneratedMCQResponse {
  questions: {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
  }[];
}

export interface GeneratedStationResponse {
  questions: {
    questionText: string;
    correctAnswer: string;
    explanation: string;
  }[];
}
