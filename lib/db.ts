// Types and Interfaces for IC3 GS6 Application

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  MULTIPLE_RESPONSE = 'multiple_response',
  TRUE_FALSE = 'true_false',
  MATCHING = 'matching',
  SEQUENCE = 'sequence',
  TRUE_FALSE_MULTIPLE = 'true_false_multiple',
  VIDEO_BASED = 'video_based',
  CATEGORIZATION = 'categorization',
  HOTSPOT = 'hotspot',
  MATCH_IMAGE = 'match_image',
  MATRIX_SELECTION = 'matrix_selection',
}

export enum IC3Category {
  COMPUTING_FUNDAMENTALS = 'Computing Fundamentals',
  KEY_APPLICATIONS = 'Key Applications',
  LIVING_ONLINE = 'Living Online',
}

export interface Student {
  id: string;
  code: string; // ID đăng nhập
  name: string;
  class: string;
  school?: string;
  password?: string;
  currentLevel: 1 | 2 | 3;
  avatar: string; // Mascot key: 'robot', 'fox', 'panda', etc.
  badges: string[]; // List of badge IDs
  completedTests: string[]; // List of completed Test Codes
  averageScore: number;
  totalQuestionsSolved: number;
  correctQuestionsSolved: number;
  streak: number; // Ngày học liên tiếp
  lastActiveDate?: string; // YYYY-MM-DD
  isLocked: boolean;
}

export interface Admin {
  username: string;
  name: string;
  password?: string;
}

export interface Test {
  id: string;
  code: string; // Ví dụ: OT1_LV1
  level: 1 | 2 | 3;
  title: string;
  description: string;
  category: IC3Category;
  timeLimit: number; // tính bằng phút
  questionsCount: number;
}

export interface Question {
  id: string;
  testId: string; // references Test.code (e.g. OT1_LV1)
  type: QuestionType;
  category: IC3Category;
  content: string;
  imageUrl?: string;
  options?: any; // Dựa vào từng loại câu hỏi:
  // - MCQ / MR / True-False / Image-based: chuỗi[]
  // - Matching: { itemsA: string[], itemsB: string[] }
  // - DragDrop: { items: string[], textWithBlanks: string } // textWithBlanks chứa [blank1], [blank2]...
  // - Dropdown: { textWithDropdowns: string, dropdownOptions: string[][] } // textWithDropdowns chứa [drop1], [drop2]...
  // - Sequence: string[] (danh sách các bước bị xáo trộn)
  correctAnswer: any;
  // - MCQ: number (chỉ số đáp án đúng)
  // - MR: number[] (mảng chỉ số đáp án đúng)
  // - True-False: boolean (true = Đúng, false = Sai)
  // - Matching: number[] (bản đồ từ A sang B: correctAnswer[i] là chỉ số trong itemsB tương ứng với itemsA[i])
  // - DragDrop: string[] (mảng các chuỗi điền vào các chỗ trống theo thứ tự)
  // - FillBlank: string[] (mảng các từ đúng cho các ô trống)
  // - Dropdown: string[] (mảng các lựa chọn đúng cho từng dropdown)
  // - Image-based: number (chỉ số hình ảnh đúng)
  // - Scenario: number (chỉ số đáp án đúng)
  // - Sequence: number[] (thứ tự đúng của các bước ban đầu, ví dụ: [1, 0, 2])
  explanation: string;
  tip: string; // Mẹo ghi nhớ từ Mascot
}

export interface TestResult {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  level: 1 | 2 | 3;
  testCode: string;
  testTitle: string;
  date: string; // ISO String
  score: number; // 0 - 100
  timeSpent: number; // tính bằng giây
  totalQuestions: number;
  correctCount: number;
  incorrectCount: number;
  categoryAnalysis: {
    computingFundamentals: number; // 0 - 100%
    keyApplications: number; // 0 - 100%
    livingOnline: number; // 0 - 100%
  };
  answers: {
    questionId: string;
    userAnswer: any;
    isCorrect: boolean;
  }[];
}

// Mẫu Huy hiệu (Badge)
export interface Badge {
  id: string;
  title: string;
  icon: string;
  description: string;
  color: string;
}

export const BADGES: Badge[] = [
  { id: 'badge_1', title: '🥉 Tân Binh Công Nghệ', icon: 'Shield', description: 'Hoàn thành bài luyện tập đầu tiên đạt trên 50 điểm', color: 'from-amber-500 to-amber-700' },
  { id: 'badge_2', title: '🥈 Thợ Săn Điểm Cao', icon: 'Award', description: 'Đạt điểm tuyệt đối 100/100 trong chế độ Kiểm tra', color: 'from-slate-300 to-slate-500' },
  { id: 'badge_3', title: '🥇 Bậc Thầy IC3', icon: 'Crown', description: 'Hoàn thành tất cả các đề ôn tập của một Level', color: 'from-yellow-400 to-amber-500 font-bold' },
  { id: 'badge_4', title: '🚀 Siêu Tốc', icon: 'Zap', description: 'Hoàn thành bài kiểm tra chỉ trong vòng dưới 5 phút', color: 'from-cyan-400 to-blue-500' },
  { id: 'badge_5', title: '🧠 Não Bộ Số', icon: 'Brain', description: 'Đạt tỷ lệ trả lời đúng trung bình trên 90% sau 5 đề thi', color: 'from-purple-400 to-pink-500' },
  { id: 'badge_6', title: '👑 Vua IC3', icon: 'Sparkles', description: 'Đạt vị trí Top 1 trên bảng xếp hạng toàn trường', color: 'from-indigo-500 via-purple-500 to-pink-500' },
];

// DỮ LIỆU MẪU ĐỀ THI VÀ CÂU HỎI
export const DEFAULT_TESTS: Test[] = [];
export const DEFAULT_QUESTIONS: Question[] = [];


// KHỞI TẠO DỮ LIỆU BAN ĐẦU VÀO LOCALSTORAGE
export function initDB() {
  if (typeof window === 'undefined') return;

  // 1. Khởi tạo Students
  if (!localStorage.getItem('ic3_students')) {
    localStorage.setItem('ic3_students', JSON.stringify([]));
  }

  // 2. Khởi tạo Admin
  if (!localStorage.getItem('ic3_admins')) {
    localStorage.setItem('ic3_admins', JSON.stringify([]));
  }

  // 3. Khởi tạo Tests
  if (!localStorage.getItem('ic3_tests')) {
    localStorage.setItem('ic3_tests', JSON.stringify([]));
  } else {
    // Tự động cập nhật số lượng câu hỏi chính xác dựa trên danh sách câu hỏi thực tế trong localStorage
    try {
      const existingTests = JSON.parse(localStorage.getItem('ic3_tests') || '[]');
      const questions = JSON.parse(localStorage.getItem('ic3_questions') || '[]');
      const updatedTests = existingTests.map((t: any) => {
        const count = questions.filter((q: any) => q.testId === t.code).length;
        return { ...t, questionsCount: count };
      });
      localStorage.setItem('ic3_tests', JSON.stringify(updatedTests));
    } catch (e) {
      console.error(e);
    }
  }

  // 4. Khởi tạo Questions
  if (!localStorage.getItem('ic3_questions')) {
    localStorage.setItem('ic3_questions', JSON.stringify([]));
  }

  // 5. Khởi tạo Test Results
  if (!localStorage.getItem('ic3_results')) {
    localStorage.setItem('ic3_results', JSON.stringify([]));
  }
}

// CÁC HÀM TRUY XUẤT DỮ LIỆU KHÁCH HÀNG

// 1. Học sinh
export function getStudents(): Student[] {
  if (typeof window === 'undefined') return [];
  initDB();
  return (JSON.parse(localStorage.getItem('ic3_students') || '[]') as Student[]).filter(Boolean);
}

export function saveStudents(students: Student[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ic3_students', JSON.stringify(students.filter(Boolean)));
}

// 2. Admin
export function getAdmins(): Admin[] {
  if (typeof window === 'undefined') return [];
  initDB();
  return (JSON.parse(localStorage.getItem('ic3_admins') || '[]') as Admin[]).filter(Boolean);
}

// 3. Đề ôn tập
export function getTests(): Test[] {
  if (typeof window === 'undefined') return [];
  initDB();
  return (JSON.parse(localStorage.getItem('ic3_tests') || '[]') as Test[]).filter(Boolean);
}

export function saveTests(tests: Test[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ic3_tests', JSON.stringify(tests.filter(Boolean)));
}

// 4. Câu hỏi
export function getQuestions(): Question[] {
  if (typeof window === 'undefined') return [];
  initDB();
  return (JSON.parse(localStorage.getItem('ic3_questions') || '[]') as Question[]).filter(Boolean);
}

export function saveQuestions(questions: Question[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ic3_questions', JSON.stringify(questions.filter(Boolean)));
}

// 5. Kết quả thi
export function getTestResults(): TestResult[] {
  if (typeof window === 'undefined') return [];
  initDB();
  return (JSON.parse(localStorage.getItem('ic3_results') || '[]') as TestResult[]).filter(Boolean);
}

export function saveTestResults(results: TestResult[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ic3_results', JSON.stringify(results.filter(Boolean)));
}
