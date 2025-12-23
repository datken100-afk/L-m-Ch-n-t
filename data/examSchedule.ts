
export interface ExamItem {
  id: number;
  subject: string;
  dayOfWeek: string;
  date: string;
  time: string;
}

export const EXAM_SCHEDULE: ExamItem[] = [
  { "id": 1, "subject": "Y Đức - Khoa Học Hành Vi", "dayOfWeek": "Thứ 7", "date": "31/01/2026", "time": "08:00" },
  { "id": 2, "subject": "Giải Phẫu Đại Cương", "dayOfWeek": "Thứ 7", "date": "07/02/2026", "time": "08:00" },
  { "id": 3, "subject": "Tâm Lý Y Học", "dayOfWeek": "Thứ 3", "date": "03/03/2026", "time": "08:00" },
  { "id": 4, "subject": "Mô Học", "dayOfWeek": "Thứ 2", "date": "09/03/2026", "time": "13:30" },
  { "id": 5, "subject": "Triết Học Mác – Lênin", "dayOfWeek": "Thứ 3", "date": "10/03/2026", "time": "09:30" },
  { "id": 6, "subject": "Tin Học", "dayOfWeek": "Thứ 4", "date": "11/03/2026", "time": "13:30" },
  { "id": 7, "subject": "Hóa Đại Cương", "dayOfWeek": "Thứ 7", "date": "21/03/2026", "time": "13:30" },
  { "id": 8, "subject": "Vật Lý Y Sinh", "dayOfWeek": "Thứ 7", "date": "28/03/2026", "time": "13:30" },
  { "id": 9, "subject": "Kinh Tế Chính Trị Mác – Lênin", "dayOfWeek": "Thứ 4", "date": "01/04/2026", "time": "13:30" },
  { "id": 10, "subject": "Tư Tưởng Hồ Chí Minh", "dayOfWeek": "Thứ 2", "date": "20/04/2026", "time": "08:00" },
  { "id": 11, "subject": "Cấp Cứu Thông Thường", "dayOfWeek": "Thứ 4", "date": "29/04/2026", "time": "13:30" },
  { "id": 12, "subject": "Pháp Luật", "dayOfWeek": "Thứ 2", "date": "04/05/2026", "time": "08:00" },
  { "id": 13, "subject": "Sinh học tế bào - Di truyền", "dayOfWeek": "Thứ 4", "date": "06/05/2026", "time": "08:00" },
  { "id": 14, "subject": "Thống Kê Y Học", "dayOfWeek": "Thứ 6", "date": "10/07/2026", "time": "08:00" },
  { "id": 15, "subject": "Giải Phẫu 1", "dayOfWeek": "Thứ 2", "date": "13/07/2026", "time": "08:00" },
  { "id": 16, "subject": "Sinh Lý Học", "dayOfWeek": "Thứ 6", "date": "17/07/2026", "time": "08:00" }
];
