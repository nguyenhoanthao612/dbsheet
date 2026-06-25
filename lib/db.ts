// Types and Interfaces for IC3 GS6 Application

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  MULTIPLE_RESPONSE = 'multiple_response',
  TRUE_FALSE = 'true_false',
  MATCHING = 'matching',
  DRAG_DROP = 'drag_drop',
  FILL_BLANK = 'fill_blank',
  DROPDOWN = 'dropdown',
  IMAGE_BASED = 'image_based',
  SCENARIO = 'scenario',
  SEQUENCE = 'sequence',
  HOTSPOT = 'hotspot',
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
export const DEFAULT_TESTS: Test[] = [
  // LEVEL 1
  {
    id: 't_1',
    code: 'OT1_LV1',
    level: 1,
    title: 'Đề Ôn Tập 1 - Nền tảng số căn bản',
    description: 'Kiểm tra kiến thức cơ bản về phần cứng máy tính, hệ điều hành và tệp tin.',
    category: IC3Category.COMPUTING_FUNDAMENTALS,
    timeLimit: 15,
    questionsCount: 10,
  },
  {
    id: 't_2',
    code: 'OT2_LV1',
    level: 1,
    title: 'Đề Ôn Tập 2 - Ứng dụng văn phòng cơ bản',
    description: 'Các câu hỏi về soạn thảo văn bản, bảng tính đơn giản và duyệt web an toàn.',
    category: IC3Category.KEY_APPLICATIONS,
    timeLimit: 15,
    questionsCount: 5,
  },
  // LEVEL 2
  {
    id: 't_3',
    code: 'OT1_LV2',
    level: 2,
    title: 'Đề Ôn Tập 1 - Thiết bị di động & Cloud',
    description: 'Quản lý cài đặt thiết bị di động, đồng bộ đám mây và xử lý sự cố mạng.',
    category: IC3Category.LIVING_ONLINE,
    timeLimit: 20,
    questionsCount: 5,
  },
  {
    id: 't_4',
    code: 'OT2_LV2',
    level: 2,
    title: 'Đề Ôn Tập 2 - Kỹ năng cộng tác trực tuyến',
    description: 'Sử dụng các công cụ làm việc nhóm, Google Workspace và bảo mật tài khoản mạng xã hội.',
    category: IC3Category.KEY_APPLICATIONS,
    timeLimit: 20,
    questionsCount: 5,
  },
  // LEVEL 3
  {
    id: 't_5',
    code: 'OT1_LV3',
    level: 3,
    title: 'Đề Ôn Tập 1 - Tư duy thiết kế & An ninh nâng cao',
    description: 'Kỹ năng thiết kế đồ họa cơ bản, lập trình thuật toán và bảo mật hệ thống doanh nghiệp.',
    category: IC3Category.COMPUTING_FUNDAMENTALS,
    timeLimit: 25,
    questionsCount: 5,
  },
];

export const DEFAULT_QUESTIONS: Question[] = [
  // OT1_LV1: 10 câu hỏi bao trùm toàn bộ 10 dạng câu hỏi
  {
    id: 'q1_1',
    testId: 'OT1_LV1',
    type: QuestionType.MULTIPLE_CHOICE,
    category: IC3Category.COMPUTING_FUNDAMENTALS,
    content: 'Thiết bị nào sau đây được coi là "bộ não" của toàn bộ máy tính, chịu trách nhiệm xử lý hầu hết các lệnh và dữ liệu?',
    options: [
      'RAM (Bộ nhớ truy cập ngẫu nhiên)',
      'CPU (Bộ vi xử lý trung tâm)',
      'HDD (Ổ đĩa cứng)',
      'GPU (Bộ xử lý đồ họa)'
    ],
    correctAnswer: 1,
    explanation: 'CPU (Central Processing Unit) là bộ vi xử lý trung tâm, đóng vai trò như bộ não điều khiển mọi hoạt động tính toán và xử lý của máy tính.',
    tip: 'Hãy nhớ chữ "Central" (Trung tâm) nhé! CPU là trung tâm chỉ huy của máy tính đó!'
  },
  {
    id: 'q1_2',
    testId: 'OT1_LV1',
    type: QuestionType.MULTIPLE_RESPONSE,
    category: IC3Category.COMPUTING_FUNDAMENTALS,
    content: 'Những thiết bị nào sau đây là thiết bị đầu vào (Input Devices)? (Chọn tất cả các đáp án đúng)',
    options: [
      'Bàn phím (Keyboard)',
      'Màn hình hiển thị (Monitor)',
      'Chuột máy tính (Mouse)',
      'Máy in (Printer)'
    ],
    correctAnswer: [0, 2],
    explanation: 'Bàn phím và chuột dùng để gửi thông tin và lệnh vào máy tính, nên là thiết bị đầu vào. Màn hình và máy in nhận dữ liệu từ máy tính để hiển thị/in ra, nên là thiết bị đầu ra.',
    tip: 'Nhập thông tin = Input! Bạn gõ bàn phím và click chuột chính là đang "nạp" dữ liệu cho máy đấy.'
  },
  {
    id: 'q1_3',
    testId: 'OT1_LV1',
    type: QuestionType.TRUE_FALSE,
    category: IC3Category.COMPUTING_FUNDAMENTALS,
    content: 'RAM là bộ nhớ tạm thời, dữ liệu lưu trong RAM sẽ bị mất sạch khi bạn tắt máy tính hoặc mất điện đột ngột.',
    options: ['Đúng', 'Sai'],
    correctAnswer: true,
    explanation: 'RAM là bộ nhớ truy cập ngẫu nhiên và có đặc tính "khả biến" (volatile), nghĩa là nó cần điện để duy trì dữ liệu. Khi tắt máy, mọi dữ liệu lưu trên RAM sẽ biến mất.',
    tip: 'Hãy nhớ lưu bài viết thường xuyên trước khi tắt nguồn! RAM sẽ quên sạch mọi thứ nếu mất điện đấy.'
  },
  {
    id: 'q1_4',
    testId: 'OT1_LV1',
    type: QuestionType.MATCHING,
    category: IC3Category.COMPUTING_FUNDAMENTALS,
    content: 'Hãy nối phần mở rộng tệp tin ở cột bên trái với định dạng tệp tin tương ứng ở cột bên phải.',
    options: {
      itemsA: ['.docx', '.xlsx', '.mp3', '.pdf'],
      itemsB: ['Tệp âm thanh nén', 'Tài liệu Word', 'Tài liệu di động PDF', 'Bảng tính Excel']
    },
    correctAnswer: [1, 3, 0, 2], // .docx -> Word (1), .xlsx -> Excel (3), .mp3 -> mp3 (0), .pdf -> PDF (2)
    explanation: '.docx là tệp Microsoft Word, .xlsx là tệp Microsoft Excel, .mp3 là tệp âm thanh, .pdf là định dạng tài liệu di động của Adobe.',
    tip: 'Cẩn thận kẻo nhầm lẫn nhé! x trong xlsx chính là bảng tính Excel có các ô dòng cột chéo nhau!'
  },
  {
    id: 'q1_5',
    testId: 'OT1_LV1',
    type: QuestionType.DRAG_DROP,
    category: IC3Category.COMPUTING_FUNDAMENTALS,
    content: 'Hãy hoàn thành câu định nghĩa sau bằng cách kéo thả từ thích hợp vào chỗ trống:',
    options: {
      items: ['hệ điều hành', 'phần cứng', 'ứng dụng'],
      textWithBlanks: 'Windows 11 là một [blank1] quản lý cả [blank2] lẫn phần mềm của máy tính.'
    },
    correctAnswer: ['hệ điều hành', 'phần cứng'],
    explanation: 'Windows 11 là một hệ điều hành (operating system), có vai trò điều hành và quản lý cả phần cứng và phần mềm của toàn hệ thống.',
    tip: 'Hệ điều hành giống như người nhạc trưởng điều khiển dàn nhạc máy tính vậy!'
  },
  {
    id: 'q1_6',
    testId: 'OT1_LV1',
    type: QuestionType.FILL_BLANK,
    category: IC3Category.COMPUTING_FUNDAMENTALS,
    content: 'Điền vào chỗ trống: Phím tắt phổ biến nhất trên hệ điều hành Windows dùng để SAO CHÉP (Copy) một tệp tin hay văn bản được chọn là Ctrl + _____. (Nhập một chữ cái duy nhất)',
    options: [],
    correctAnswer: ['C', 'c'],
    explanation: 'Tổ hợp phím Ctrl + C được dùng để sao chép (Copy) đối tượng được chọn trên Windows và macOS.',
    tip: 'Ctrl + C là sao chép, Ctrl + V là dán! Hãy ghi nhớ cặp đôi quyền lực này!'
  },
  {
    id: 'q1_7',
    testId: 'OT1_LV1',
    type: QuestionType.DROPDOWN,
    category: IC3Category.COMPUTING_FUNDAMENTALS,
    content: 'Chọn định nghĩa đúng cho các loại bộ nhớ sau:',
    options: {
      textWithDropdowns: 'Bộ nhớ [drop1] dùng để lưu trữ hệ thống khởi động cơ bản (BIOS) và không bị mất dữ liệu khi tắt máy. Trong khi đó, [drop2] dùng để lưu trữ lâu dài hệ điều hành và dữ liệu người dùng.',
      dropdownOptions: [
        ['RAM', 'ROM', 'Cache'],
        ['Ổ cứng SSD/HDD', 'RAM', 'USB Flash']
      ]
    },
    correctAnswer: ['ROM', 'Ổ cứng SSD/HDD'],
    explanation: 'ROM (Read-Only Memory) là bộ nhớ chỉ đọc chứa firmware khởi động máy. Ổ cứng SSD/HDD dùng để lưu trữ dữ liệu lâu dài.',
    tip: 'ROM là Read-Only (Chỉ đọc) nên thông tin khởi động được lưu chết trong đó, không ai xóa được.'
  },
  {
    id: 'q1_8',
    testId: 'OT1_LV1',
    type: QuestionType.IMAGE_BASED,
    category: IC3Category.COMPUTING_FUNDAMENTALS,
    content: 'Dưới đây là sơ đồ kết nối mạng máy tính. Đâu là biểu tượng đại diện cho mạng Internet toàn cầu (Cloud)?',
    imageUrl: 'https://picsum.photos/seed/networking/600/300',
    options: [
      'Hình đám mây (Cloud Symbol)',
      'Hình máy tính cá nhân (PC Symbol)',
      'Hình sợi cáp Ethernet (Cable Symbol)',
      'Hình ổ khóa bảo mật (Lock Symbol)'
    ],
    correctAnswer: 0,
    explanation: 'Biểu tượng đám mây thường được sử dụng phổ biến nhất để minh họa cho mạng Internet toàn cầu và các dịch vụ lưu trữ đám mây.',
    tip: 'Internet giống như những đám mây lơ lửng, kết nối mọi thiết bị lại với nhau khắp mọi nơi!'
  },
  {
    id: 'q1_9',
    testId: 'OT1_LV1',
    type: QuestionType.SCENARIO,
    category: IC3Category.COMPUTING_FUNDAMENTALS,
    content: 'Tình huống: Máy tính của bạn đột ngột bị đơ, con chuột không di chuyển được và các chương trình dừng hoạt động. Bạn nên nhấn tổ hợp phím nào để mở Task Manager cứu nguy và tắt ứng dụng gây nghẽn?',
    options: [
      'Alt + F4',
      'Ctrl + Alt + Delete',
      'Windows + L',
      'Ctrl + Shift + Esc'
    ],
    correctAnswer: 3,
    explanation: 'Mặc dù Ctrl+Alt+Del mở menu bảo mật, Ctrl + Shift + Esc là tổ hợp phím tắt trực tiếp nhất giúp mở ngay lập tức Task Manager (Trình quản lý tác vụ) trên Windows mà không cần qua màn hình trung gian.',
    tip: 'Task Manager là vệ binh giải cứu khi máy bị đơ! Ctrl + Shift + Esc sẽ triệu hồi vệ binh này lập tức.'
  },
  {
    id: 'q1_10',
    testId: 'OT1_LV1',
    type: QuestionType.SEQUENCE,
    category: IC3Category.COMPUTING_FUNDAMENTALS,
    content: 'Hãy sắp xếp các bước sau theo thứ tự đúng để KHỞI ĐỘNG VÀ ĐĂNG NHẬP vào máy tính Windows của bạn:',
    options: [
      'Nhập mật khẩu hoặc mã PIN tài khoản',
      'Nhấn nút nguồn (Power) trên thùng máy hoặc laptop',
      'Đợi màn hình khóa (Lock Screen) hiển thị và nhấn phím bất kỳ',
      'Bật công tắc nguồn của màn hình (nếu là PC để bàn)'
    ],
    correctAnswer: [3, 1, 2, 0], // Bật màn hình -> Bật nguồn PC -> Đợi khóa hiển thị -> Nhập mật khẩu
    explanation: 'Thứ tự đúng là bật màn hình trước (để quan sát), sau đó nhấn nút nguồn PC, đợi hệ điều hành tải đến màn hình khóa, và cuối cùng gõ mật khẩu để đăng nhập vào desktop.',
    tip: 'Sắp xếp khoa học nhé! Chúng ta phải có điện hiển thị màn hình rồi mới bật nút nguồn máy tính được chứ!'
  },

  // OT2_LV1: 5 câu hỏi Key Applications
  {
    id: 'q2_1',
    testId: 'OT2_LV1',
    type: QuestionType.MULTIPLE_CHOICE,
    category: IC3Category.KEY_APPLICATIONS,
    content: 'Trong phần mềm soạn thảo Word, để canh lề đều hai bên cho đoạn văn bản, bạn dùng tổ hợp phím tắt nào?',
    options: ['Ctrl + L', 'Ctrl + R', 'Ctrl + E', 'Ctrl + J'],
    correctAnswer: 3,
    explanation: 'Ctrl + J (Justify) dùng để căn đều hai bên văn bản. Ctrl+L là canh trái, Ctrl+R canh phải, Ctrl+E canh giữa.',
    tip: 'Justify bắt đầu bằng chữ J. Nên phím tắt căn đều chính là Ctrl + J!'
  },
  {
    id: 'q2_2',
    testId: 'OT2_LV1',
    type: QuestionType.TRUE_FALSE,
    category: IC3Category.KEY_APPLICATIONS,
    content: 'Trong Excel, công thức luôn luôn bắt đầu bằng dấu bằng (=). Nếu không có dấu này, Excel sẽ hiểu đó là dữ liệu văn bản thông thường.',
    options: ['Đúng', 'Sai'],
    correctAnswer: true,
    explanation: 'Đúng vậy, mọi công thức hoặc hàm trong Excel đều bắt đầu bằng dấu "=". Nếu không, nó chỉ được hiển thị dưới dạng chuỗi văn bản.',
    tip: 'Dấu "=" chính là chiếc đũa phép thuật báo cho Excel biết bạn sắp làm phép tính toán học đấy!'
  },
  {
    id: 'q2_3',
    testId: 'OT2_LV1',
    type: QuestionType.MULTIPLE_RESPONSE,
    category: IC3Category.KEY_APPLICATIONS,
    content: 'Những hành động nào sau đây giúp bảo mật thông tin cá nhân khi duyệt Web trên trình duyệt? (Chọn tất cả đáp án đúng)',
    options: [
      'Duyệt web bằng chế độ ẩn danh (Incognito/Private)',
      'Lưu mật khẩu ngân hàng trên máy tính công cộng',
      'Xóa lịch sử duyệt web và cookie sau khi sử dụng',
      'Nhấp vào mọi đường link quảng cáo trúng thưởng'
    ],
    correctAnswer: [0, 2],
    explanation: 'Chế độ ẩn danh và xóa lịch sử/cookie giúp bảo vệ thông tin riêng tư. Lưu mật khẩu máy công cộng và click link rác là hành vi mất an toàn nghiêm trọng.',
    tip: 'Thám tử ẩn danh không để lại dấu vết! Hãy dùng ẩn danh và xóa lịch sử khi cần thiết.'
  },
  {
    id: 'q2_4',
    testId: 'OT2_LV1',
    type: QuestionType.MATCHING,
    category: IC3Category.KEY_APPLICATIONS,
    content: 'Hãy nối hàm Excel ở cột bên trái với chức năng tương ứng của nó ở cột bên phải.',
    options: {
      itemsA: ['SUM', 'AVERAGE', 'COUNT', 'MAX'],
      itemsB: ['Tính giá trị trung bình', 'Tính tổng các số', 'Tìm số lớn nhất', 'Đếm số lượng ô chứa số']
    },
    correctAnswer: [1, 0, 3, 2], // SUM->tổng, AVERAGE->tb, COUNT->đếm, MAX->lớn nhất
    explanation: 'SUM: tổng; AVERAGE: trung bình; COUNT: đếm các ô chứa số; MAX: tìm giá trị lớn nhất.',
    tip: 'SUM = Cộng dồn, AVERAGE = Chia đều trung bình, COUNT = Đếm 1 2 3!'
  },
  {
    id: 'q2_5',
    testId: 'OT2_LV1',
    type: QuestionType.DRAG_DROP,
    category: IC3Category.KEY_APPLICATIONS,
    content: 'Kéo thả phần mềm vào chức năng phù hợp của nó:',
    options: {
      items: ['Excel', 'Word', 'PowerPoint'],
      textWithBlanks: 'Chúng ta sử dụng [blank1] để soạn thảo báo cáo, [blank2] để trình chiếu slide thuyết trình và [blank3] để lập bảng tính.'
    },
    correctAnswer: ['Word', 'PowerPoint', 'Excel'],
    explanation: 'Word soạn văn bản, PowerPoint thiết kế slide, Excel quản lý bảng tính tính toán.',
    tip: 'Bộ ba quyền lực Office giúp bạn xử lý mọi công việc học tập hằng ngày.'
  },

  // OT1_LV2: 5 câu hỏi Living Online
  {
    id: 'q3_1',
    testId: 'OT1_LV2',
    type: QuestionType.MULTIPLE_CHOICE,
    category: IC3Category.LIVING_ONLINE,
    content: 'Thuật ngữ "Cloud Computing" (Điện toán đám mây) đề cập đến việc lưu trữ và truy cập dữ liệu qua dịch vụ nào sau đây?',
    options: [
      'Mạng Internet toàn cầu',
      'Ổ đĩa CD-ROM cục bộ',
      'Bộ nhớ RAM của máy tính',
      'Thẻ nhớ SD di động'
    ],
    correctAnswer: 0,
    explanation: 'Điện toán đám mây là việc lưu trữ, quản lý và xử lý dữ liệu thông qua các máy chủ trên mạng Internet thay vì ổ đĩa cứng của máy tính cá nhân.',
    tip: 'Đám mây ở trên trời, Internet kết nối muôn nơi! Cloud chính là mạng Internet đấy.'
  },
  {
    id: 'q3_2',
    testId: 'OT1_LV2',
    type: QuestionType.TRUE_FALSE,
    category: IC3Category.LIVING_ONLINE,
    content: 'Khi bạn kết nối điện thoại với một mạng Wi-Fi công cộng không có mật khẩu (ở quán cafe, sân bay), các giao dịch ngân hàng trực tuyến của bạn hoàn toàn được bảo mật an toàn 100%.',
    options: ['Đúng', 'Sai'],
    correctAnswer: false,
    explanation: 'Wi-Fi công cộng không có mật khẩu rất dễ bị kẻ xấu nghe lén, đánh cắp thông tin tài khoản và dữ liệu giao dịch nhạy cảm. Tránh thực hiện giao dịch ngân hàng trên các mạng này.',
    tip: 'Wi-Fi miễn phí cực kỳ nguy hiểm! Hãy tắt kết nối tự động khi ở nơi công cộng.'
  },
  {
    id: 'q3_3',
    testId: 'OT1_LV2',
    type: QuestionType.MULTIPLE_RESPONSE,
    category: IC3Category.LIVING_ONLINE,
    content: 'Những hành động nào sau đây giúp bảo vệ an toàn tài khoản mạng xã hội của bạn khỏi tin tặc (hacker)? (Chọn tất cả đáp án đúng)',
    options: [
      'Sử dụng xác thực 2 yếu tố (2FA)',
      'Đặt mật khẩu dễ đoán như "123456" cho dễ nhớ',
      'Sử dụng các mật khẩu khác nhau cho từng tài khoản',
      'Cung cấp mật khẩu cho người lạ khi họ gửi email yêu cầu hỗ trợ'
    ],
    correctAnswer: [0, 2],
    explanation: 'Sử dụng xác thực 2 yếu tố và không dùng chung mật khẩu là hai biện pháp bảo mật tài khoản cực kỳ hiệu quả chống hacker.',
    tip: 'Xác thực 2 lớp giống như nhà có 2 ổ khóa! Hacker có chìa khóa 1 cũng không thể vào được.'
  },
  {
    id: 'q3_4',
    testId: 'OT1_LV2',
    type: QuestionType.DROPDOWN,
    category: IC3Category.LIVING_ONLINE,
    content: 'Hoàn thành các khái niệm về mạng sau đây:',
    options: {
      textWithDropdowns: 'Mạng [drop1] dùng để kết nối các thiết bị trong phạm vi nhỏ như văn phòng, gia đình. Trong khi mạng [drop2] kết nối trên phạm vi địa lý rộng lớn như quốc gia hay toàn cầu.',
      dropdownOptions: [
        ['LAN', 'WAN', 'MAN'],
        ['WAN', 'LAN', 'PAN']
      ]
    },
    correctAnswer: ['LAN', 'WAN'],
    explanation: 'LAN (Local Area Network) là mạng nội bộ phạm vi hẹp. WAN (Wide Area Network) là mạng diện rộng phạm vi lớn toàn cầu.',
    tip: 'L là Local (Cục bộ), W là Wide (Rộng lớn)! Nhớ mẹo chữ cái đầu nhé!'
  },
  {
    id: 'q3_5',
    testId: 'OT1_LV2',
    type: QuestionType.SEQUENCE,
    category: IC3Category.LIVING_ONLINE,
    content: 'Sắp xếp quy trình gửi một email đính kèm tài liệu học tập một cách an toàn:',
    options: [
      'Đính kèm tệp tin tài liệu đã được quét virus',
      'Nhập địa chỉ email người nhận và tiêu đề rõ ràng',
      'Kiểm tra lại nội dung, người nhận và nhấn nút Gửi (Send)',
      'Soạn nội dung thư lịch sự, ngắn gọn'
    ],
    correctAnswer: [1, 3, 0, 2],
    explanation: 'Quy trình chuẩn: Nhập địa chỉ & tiêu đề -> viết nội dung -> đính kèm file sạch -> kiểm tra và bấm Gửi.',
    tip: 'Làm việc chuyên nghiệp từ những bước nhỏ nhất! Nhớ kiểm tra tệp đính kèm trước khi nhấn gửi.'
  },

  // OT2_LV2: 5 câu hỏi Key Applications
  {
    id: 'q4_1',
    testId: 'OT2_LV2',
    type: QuestionType.MULTIPLE_CHOICE,
    category: IC3Category.KEY_APPLICATIONS,
    content: 'Trong Google Drive, tính năng nào cho phép nhiều người cùng chỉnh sửa đồng thời trên một tài liệu Google Docs tại cùng một thời điểm?',
    options: [
      'Chế độ xem ngoại tuyến (Offline mode)',
      'Chia sẻ và cộng tác thời gian thực (Real-time Collaboration)',
      'Khôi phục phiên bản sao lưu (Backup restore)',
      'Nén thư mục (Zipping folders)'
    ],
    correctAnswer: 1,
    explanation: 'Real-time Collaboration (Cộng tác thời gian thực) là tính năng cốt lõi của Google Workspace, cho phép nhiều người cùng làm việc đồng thời trên một file.',
    tip: 'Làm việc nhóm cực vui khi thấy trỏ chuột của bạn bè nhảy múa trên màn hình đúng không nào!'
  },
  {
    id: 'q4_2',
    testId: 'OT2_LV2',
    type: QuestionType.TRUE_FALSE,
    category: IC3Category.KEY_APPLICATIONS,
    content: 'Trong Google Calendar, bạn có thể tạo một cuộc họp trực tuyến Google Meet gắn liền với sự kiện lịch chỉ bằng một cú nhấp chuột.',
    options: ['Đúng', 'Sai'],
    correctAnswer: true,
    explanation: 'Đúng vậy, Google Calendar tích hợp sẵn với Google Meet, cho phép tự động tạo link họp video khi lên lịch sự kiện.',
    tip: 'Lên lịch họp nhanh như chớp! Chỉ cần tạo sự kiện và bấm "Add Google Meet video conferencing".'
  },
  {
    id: 'q4_3',
    testId: 'OT2_LV2',
    type: QuestionType.MULTIPLE_RESPONSE,
    category: IC3Category.KEY_APPLICATIONS,
    content: 'Những lợi ích nào sau đây của việc lưu trữ tài liệu trên đám mây (OneDrive, Google Drive)? (Chọn tất cả đáp án đúng)',
    options: [
      'Truy cập tài liệu mọi lúc mọi nơi chỉ cần có Internet',
      'Tránh mất dữ liệu hoàn toàn khi máy tính bị hỏng phần cứng',
      'Không cần kết nối Internet vẫn có thể đồng bộ tức thì lên đám mây',
      'Dễ dàng chia sẻ file dung lượng lớn cho người khác qua đường link'
    ],
    correctAnswer: [0, 1, 3],
    explanation: 'Lưu đám mây giúp truy cập từ xa, sao lưu an toàn khi hỏng máy, và chia sẻ file lớn dễ dàng. Tuy nhiên, việc đồng bộ tức thì bắt buộc phải có Internet.',
    tip: 'Đám mây cứu cánh khi ổ cứng máy tính bị "đột tử"!'
  },
  {
    id: 'q4_4',
    testId: 'OT2_LV2',
    type: QuestionType.MATCHING,
    category: IC3Category.KEY_APPLICATIONS,
    content: 'Nối tên ứng dụng đám mây với hãng phát triển tương ứng:',
    options: {
      itemsA: ['Google Drive', 'OneDrive', 'iCloud', 'Dropbox'],
      itemsB: ['Apple', 'Dropbox Inc.', 'Microsoft', 'Google']
    },
    correctAnswer: [3, 2, 0, 1], // Google Drive->Google, OneDrive->Microsoft, iCloud->Apple, Dropbox->Dropbox
    explanation: 'Google Drive do Google phát triển, OneDrive của Microsoft, iCloud của Apple, Dropbox của Dropbox Inc.',
    tip: 'Hãy nhớ hệ sinh thái của từng hãng công nghệ khổng lồ nhé!'
  },
  {
    id: 'q4_5',
    testId: 'OT2_LV2',
    type: QuestionType.DRAG_DROP,
    category: IC3Category.KEY_APPLICATIONS,
    content: 'Kéo thả các vai trò chia sẻ tệp tin trong Google Drive vào mô tả đúng:',
    options: {
      items: ['Viewer (Người xem)', 'Editor (Người chỉnh sửa)', 'Commenter (Người nhận xét)'],
      textWithBlanks: 'Bạn muốn bạn của mình chỉ được đọc tài liệu mà không thể viết gì, hãy cấp quyền [blank1]. Nếu muốn bạn ấy có thể gõ nhận xét bên cạnh, hãy cấp quyền [blank2]. Còn nếu muốn cùng viết bài báo cáo, hãy cấp quyền [blank3].'
    },
    correctAnswer: ['Viewer (Người xem)', 'Commenter (Người nhận xét)', 'Editor (Người chỉnh sửa)'],
    explanation: 'Viewer chỉ xem, Commenter được viết nhận xét, Editor có toàn quyền chỉnh sửa tài liệu.',
    tip: 'Hãy cẩn thận khi phân quyền! Đừng chia sẻ quyền Editor cho người lạ nhé.'
  },

  // OT1_LV3: 5 câu hỏi Computing Fundamentals (Nâng cao)
  {
    id: 'q5_1',
    testId: 'OT1_LV3',
    type: QuestionType.MULTIPLE_CHOICE,
    category: IC3Category.COMPUTING_FUNDAMENTALS,
    content: 'Trong an ninh mạng nâng cao, phương thức "Phishing" (Tấn công giả mạo) thường được thực hiện thông qua con đường nào phổ biến nhất?',
    options: [
      'Mạng xã hội hoặc Email giả dạng các tổ chức uy tín',
      'Cắm trực tiếp USB bị nhiễm mã độc vào máy',
      'Tấn công trực tiếp vào phần cứng máy chủ',
      'Sử dụng sóng Bluetooth tầm gần'
    ],
    correctAnswer: 0,
    explanation: 'Phishing là hình thức tấn công lừa đảo trực tuyến phổ biến nhất bằng cách giả mạo ngân hàng, trường học, hay trang web lớn qua email/tin nhắn dụ người dùng gõ mật khẩu.',
    tip: 'Phishing phát âm giống "fishing" (câu cá). Hacker đang thả mồi câu chính là các link giả mạo đấy!'
  },
  {
    id: 'q5_2',
    testId: 'OT1_LV3',
    type: QuestionType.TRUE_FALSE,
    category: IC3Category.COMPUTING_FUNDAMENTALS,
    content: 'Một thuật toán lập trình là một chuỗi các chỉ dẫn rõ ràng, không mập mờ, được thực hiện theo từng bước tuần tự để giải quyết một bài toán cụ thể.',
    options: ['Đúng', 'Sai'],
    correctAnswer: true,
    explanation: 'Đúng, định nghĩa cơ bản của thuật toán (Algorithm) là một tập hợp hữu hạn các chỉ dẫn rõ ràng để giải quyết một vấn đề trong thời gian hữu hạn.',
    tip: 'Thuật toán giống như một công thức nấu ăn: làm đúng từng bước sẽ ra món ăn ngon!'
  },
  {
    id: 'q5_3',
    testId: 'OT1_LV3',
    type: QuestionType.MULTIPLE_RESPONSE,
    category: IC3Category.COMPUTING_FUNDAMENTALS,
    content: 'Những yếu tố nào sau đây được sử dụng để thiết lập Xác thực đa yếu tố (MFA)? (Chọn tất cả đáp án đúng)',
    options: [
      'Thứ bạn biết (Mật khẩu, mã PIN)',
      'Thứ bạn sở hữu (Điện thoại, thẻ khóa bảo mật)',
      'Thứ đại diện cho bạn (Vân tay, nhận diện khuôn mặt)',
      'Tên thú cưng đầu tiên của bạn'
    ],
    correctAnswer: [0, 1, 2],
    explanation: 'MFA dựa trên 3 yếu tố cốt lõi: Kiến thức (thứ bạn biết), Sở hữu (thứ bạn có), Sinh trắc học (thứ là bạn). Tên thú cưng chỉ là một câu hỏi bảo mật phụ thuộc yếu tố kiến thức nhưng rất dễ bị mò ra.',
    tip: 'Bảo mật vững chãi nhờ sự kết hợp của: Bộ não (biết), Túi quần (có điện thoại), và Cơ thể (vân tay)!'
  },
  {
    id: 'q5_4',
    testId: 'OT1_LV3',
    type: QuestionType.MATCHING,
    category: IC3Category.COMPUTING_FUNDAMENTALS,
    content: 'Nối các khái niệm an ninh mạng sau đây với định nghĩa phù hợp:',
    options: {
      itemsA: ['Firewall (Tường lửa)', 'Malware (Mã độc)', 'Encryption (Mã hóa)', 'VPN'],
      itemsB: ['Chương trình phá hoại hệ thống', 'Mã hóa đường truyền Internet an toàn', 'Bộ lọc kiểm soát lưu lượng mạng', 'Chuyển dữ liệu sang dạng không đọc được']
    },
    correctAnswer: [2, 0, 3, 1], // Firewall->bộ lọc, Malware->chương trình phá hoại, Encryption->chuyển dữ liệu ko đọc được, VPN->mã hóa đường truyền
    explanation: 'Firewall lọc mạng; Malware là mã độc phá hoại; Encryption biến đổi dữ liệu thành dạng mật mã bí mật; VPN tạo đường truyền riêng tư bảo mật.',
    tip: 'Hãy là một chiến binh bảo mật am hiểu tường tận các lá chắn phòng thủ!'
  },
  {
    id: 'q5_5',
    testId: 'OT1_LV3',
    type: QuestionType.SEQUENCE,
    category: IC3Category.COMPUTING_FUNDAMENTALS,
    content: 'Sắp xếp các bước xử lý sự cố khi máy tính bàn của bạn đột ngột mất kết nối Internet hoàn toàn:',
    options: [
      'Kiểm tra xem các thiết bị khác (điện thoại) có kết nối Wi-Fi được không',
      'Thử khởi động lại Router/Modem mạng',
      'Kiểm tra cáp mạng Ethernet cắm ở sau thùng máy PC xem đèn có sáng không',
      'Liên hệ nhà mạng ISP hỗ trợ kỹ thuật đường dây'
    ],
    correctAnswer: [2, 0, 1, 3], // Kiểm tra cáp -> kiểm tra thiết bị khác -> reset Router -> gọi nhà mạng
    explanation: 'Xử lý sự cố mạng chuẩn: Kiểm tra phần cứng tại chỗ (cáp PC) -> Kiểm tra diện rộng (thiết bị khác) -> Thử reset thiết bị trung tâm (Router) -> Gọi nhà mạng hỗ trợ nếu tất cả thất bại.',
    tip: 'Xử lý sự cố khoa học giúp bạn tiết kiệm hàng giờ đồng hồ mệt mỏi!'
  }
];

// KHỞI TẠO DỮ LIỆU BAN ĐẦU VÀO LOCALSTORAGE
export function initDB() {
  if (typeof window === 'undefined') return;

  // 1. Khởi tạo Students
  if (!localStorage.getItem('ic3_students')) {
    const sampleStudents: Student[] = [
      {
        id: 'std_1',
        code: 'HS001',
        name: 'Nguyễn Minh Quân',
        class: '8A1',
        password: '123',
        currentLevel: 1,
        avatar: 'robot',
        badges: ['badge_1', 'badge_4'],
        completedTests: ['OT1_LV1'],
        averageScore: 85,
        totalQuestionsSolved: 10,
        correctQuestionsSolved: 8,
        streak: 3,
        lastActiveDate: '2026-06-25',
        isLocked: false,
      },
      {
        id: 'std_2',
        code: 'HS002',
        name: 'Trần Khánh Linh',
        class: '9B2',
        password: '123',
        currentLevel: 2,
        avatar: 'fox',
        badges: ['badge_1', 'badge_2', 'badge_5'],
        completedTests: ['OT1_LV1', 'OT2_LV1'],
        averageScore: 94,
        totalQuestionsSolved: 15,
        correctQuestionsSolved: 14,
        streak: 5,
        lastActiveDate: '2026-06-24',
        isLocked: false,
      },
      {
        id: 'std_3',
        code: 'HS003',
        name: 'Lê Hoàng Nam',
        class: '8A3',
        password: '123',
        currentLevel: 1,
        avatar: 'panda',
        badges: [],
        completedTests: [],
        averageScore: 0,
        totalQuestionsSolved: 0,
        correctQuestionsSolved: 0,
        streak: 1,
        lastActiveDate: '2026-06-25',
        isLocked: false,
      },
      {
        id: 'std_4',
        code: 'HS004',
        name: 'Phạm Hải Yến',
        class: '9A1',
        password: '123',
        currentLevel: 3,
        avatar: 'robot',
        badges: ['badge_1', 'badge_2', 'badge_3', 'badge_6'],
        completedTests: ['OT1_LV1', 'OT2_LV1', 'OT1_LV2', 'OT2_LV2', 'OT1_LV3'],
        averageScore: 98,
        totalQuestionsSolved: 30,
        correctQuestionsSolved: 29,
        streak: 12,
        lastActiveDate: '2026-06-25',
        isLocked: false,
      },
    ];
    localStorage.setItem('ic3_students', JSON.stringify(sampleStudents));
  }

  // 2. Khởi tạo Admin
  if (!localStorage.getItem('ic3_admins')) {
    const sampleAdmins: Admin[] = [
      {
        username: 'admin',
        name: 'Thầy Minh Trí (Mascot Master)',
        password: 'admin',
      },
    ];
    localStorage.setItem('ic3_admins', JSON.stringify(sampleAdmins));
  }

  // 3. Khởi tạo Tests
  if (!localStorage.getItem('ic3_tests')) {
    localStorage.setItem('ic3_tests', JSON.stringify(DEFAULT_TESTS));
  }

  // 4. Khởi tạo Questions
  if (!localStorage.getItem('ic3_questions')) {
    localStorage.setItem('ic3_questions', JSON.stringify(DEFAULT_QUESTIONS));
  }

  // 5. Khởi tạo Test Results
  if (!localStorage.getItem('ic3_results')) {
    const sampleResults: TestResult[] = [
      {
        id: 'res_1',
        studentId: 'std_1',
        studentName: 'Nguyễn Minh Quân',
        studentClass: '8A1',
        level: 1,
        testCode: 'OT1_LV1',
        testTitle: 'Đề Ôn Tập 1 - Nền tảng số căn bản',
        date: '2026-06-24T15:30:00.000Z',
        score: 80,
        timeSpent: 480,
        totalQuestions: 10,
        correctCount: 8,
        incorrectCount: 2,
        categoryAnalysis: {
          computingFundamentals: 85,
          keyApplications: 0,
          livingOnline: 0,
        },
        answers: [],
      },
      {
        id: 'res_2',
        studentId: 'std_2',
        studentName: 'Trần Khánh Linh',
        studentClass: '9B2',
        level: 1,
        testCode: 'OT1_LV1',
        testTitle: 'Đề Ôn Tập 1 - Nền tảng số căn bản',
        date: '2026-06-23T10:15:00.000Z',
        score: 90,
        timeSpent: 350,
        totalQuestions: 10,
        correctCount: 9,
        incorrectCount: 1,
        categoryAnalysis: {
          computingFundamentals: 90,
          keyApplications: 0,
          livingOnline: 0,
        },
        answers: [],
      },
      {
        id: 'res_3',
        studentId: 'std_2',
        studentName: 'Trần Khánh Linh',
        studentClass: '9B2',
        level: 1,
        testCode: 'OT2_LV1',
        testTitle: 'Đề Ôn Tập 2 - Ứng dụng văn phòng cơ bản',
        date: '2026-06-24T11:00:00.000Z',
        score: 100,
        timeSpent: 280,
        totalQuestions: 5,
        correctCount: 5,
        incorrectCount: 0,
        categoryAnalysis: {
          computingFundamentals: 0,
          keyApplications: 100,
          livingOnline: 0,
        },
        answers: [],
      },
      {
        id: 'res_4',
        studentId: 'std_4',
        studentName: 'Phạm Hải Yến',
        studentClass: '9A1',
        level: 3,
        testCode: 'OT1_LV3',
        testTitle: 'Đề Ôn Tập 1 - Tư duy thiết kế & An ninh nâng cao',
        date: '2026-06-25T02:00:00.000Z',
        score: 100,
        timeSpent: 410,
        totalQuestions: 5,
        correctCount: 5,
        incorrectCount: 0,
        categoryAnalysis: {
          computingFundamentals: 100,
          keyApplications: 0,
          livingOnline: 0,
        },
        answers: [],
      },
    ];
    localStorage.setItem('ic3_results', JSON.stringify(sampleResults));
  }
}

// CÁC HÀM TRUY XUẤT DỮ LIỆU KHÁCH HÀNG

// 1. Học sinh
export function getStudents(): Student[] {
  if (typeof window === 'undefined') return [];
  initDB();
  return JSON.parse(localStorage.getItem('ic3_students') || '[]');
}

export function saveStudents(students: Student[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ic3_students', JSON.stringify(students));
}

// 2. Admin
export function getAdmins(): Admin[] {
  if (typeof window === 'undefined') return [];
  initDB();
  return JSON.parse(localStorage.getItem('ic3_admins') || '[]');
}

// 3. Đề ôn tập
export function getTests(): Test[] {
  if (typeof window === 'undefined') return [];
  initDB();
  return JSON.parse(localStorage.getItem('ic3_tests') || '[]');
}

export function saveTests(tests: Test[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ic3_tests', JSON.stringify(tests));
}

// 4. Câu hỏi
export function getQuestions(): Question[] {
  if (typeof window === 'undefined') return [];
  initDB();
  return JSON.parse(localStorage.getItem('ic3_questions') || '[]');
}

export function saveQuestions(questions: Question[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ic3_questions', JSON.stringify(questions));
}

// 5. Kết quả thi
export function getTestResults(): TestResult[] {
  if (typeof window === 'undefined') return [];
  initDB();
  return JSON.parse(localStorage.getItem('ic3_results') || '[]');
}

export function saveTestResults(results: TestResult[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ic3_results', JSON.stringify(results));
}
