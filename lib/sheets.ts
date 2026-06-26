import { Student, Test, Question, TestResult, QuestionType, IC3Category, Badge, BADGES, initDB, getStudents, getTests, getAdmins, getTestResults, getQuestions } from './db';

// Key for storing the Apps Script API URL in localStorage
const APPS_SCRIPT_URL_KEY = 'ic3_google_sheet_api_url';

// Default public Google Sheet Web App URL for demonstration/fallback
// This is a live mock sheet designed to let the app run immediately even if env is not set up
const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxg1_yqPFYxcszhRpu_nqNZtDnmhpHR-cM0t65s1kjI6MYxwNa4yg12WyTagF4zDdFr/exec';

/**
 * Get the currently configured Google Sheets Apps Script URL
 */
export function getGoogleSheetUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.GOOGLE_SHEET_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;
  }
  return localStorage.getItem(APPS_SCRIPT_URL_KEY) || process.env.NEXT_PUBLIC_GOOGLE_SHEET_APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;
}

/**
 * Save a custom Google Sheets Apps Script URL
 */
export function setGoogleSheetUrl(url: string) {
  if (typeof window === 'undefined') return;
  if (!url) {
    localStorage.removeItem(APPS_SCRIPT_URL_KEY);
  } else {
    localStorage.setItem(APPS_SCRIPT_URL_KEY, url.trim());
  }
}

/**
 * Map Google Sheet Level string (e.g., "LV1", "LV2", "LV3") to number
 */
export function mapSheetLevel(levelStr: any): 1 | 2 | 3 {
  if (!levelStr) return 1;
  const str = String(levelStr).toUpperCase().trim();
  if (str.includes('3') || str.includes('LV3')) return 3;
  if (str.includes('2') || str.includes('LV2')) return 2;
  return 1;
}

/**
 * Map Sheet Category string to IC3Category Enum
 */
export function mapSheetCategory(catStr: any): IC3Category {
  if (!catStr) return IC3Category.COMPUTING_FUNDAMENTALS;
  const str = String(catStr).toLowerCase().trim();
  if (str.includes('key') || str.includes('ứng dụng') || str.includes('application')) {
    return IC3Category.KEY_APPLICATIONS;
  }
  if (str.includes('living') || str.includes('cuộc sống') || str.includes('online')) {
    return IC3Category.LIVING_ONLINE;
  }
  return IC3Category.COMPUTING_FUNDAMENTALS;
}

/**
 * Map Google Sheet Question Type string to QuestionType Enum
 */
export function mapSheetQuestionType(typeStr: any): QuestionType {
  if (!typeStr) return QuestionType.MULTIPLE_CHOICE;
  const str = String(typeStr).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (str.includes('multipleresponse') || str.includes('nhiềudápán')) return QuestionType.MULTIPLE_RESPONSE;
  if (str.includes('truefalse') || str.includes('đúngsai') || str.includes('tf')) return QuestionType.TRUE_FALSE;
  if (str.includes('matching') || str.includes('ghépcặp') || str.includes('nối')) return QuestionType.MATCHING;
  if (str.includes('drag') || str.includes('kếothả')) return QuestionType.DRAG_DROP;
  if (str.includes('fill') || str.includes('điềnkhuyết') || str.includes('điềnvào')) return QuestionType.FILL_BLANK;
  if (str.includes('dropdown') || str.includes('danhsáchlựachọn')) return QuestionType.DROPDOWN;
  if (str.includes('image') || str.includes('hìnhảnh')) return QuestionType.IMAGE_BASED;
  if (str.includes('scenario') || str.includes('tìnhhuống')) return QuestionType.SCENARIO;
  if (str.includes('sequence') || str.includes('sắpxếp') || str.includes('thứtự')) return QuestionType.SEQUENCE;
  return QuestionType.MULTIPLE_CHOICE;
}

/**
 * Helper to fetch API requests
 */
async function apiFetch(action: string, extraParams: Record<string, string> = {}, postData?: any): Promise<any> {
  const customUrl = getGoogleSheetUrl();
  let queryUrl = `/api/sheets?action=${action}`;
  if (customUrl) {
    queryUrl += `&customUrl=${encodeURIComponent(customUrl)}`;
  }
  
  for (const [key, val] of Object.entries(extraParams)) {
    queryUrl += `&${key}=${encodeURIComponent(val)}`;
  }

  const options: RequestInit = {
    method: postData ? 'POST' : 'GET',
    headers: {
      'Content-Type': 'application/json',
    }
  };

  if (postData) {
    options.body = JSON.stringify({ ...postData, action });
  }

  const response = await fetch(queryUrl, options);
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText || `Server error ${response.status}`);
  }
  const data = await response.json();
  if (data && (data.error === 'NOT_CONFIGURED' || data.error === 'HTML_RESPONSE' || data.error === 'INVALID_JSON')) {
    return { error: 'NOT_CONFIGURED', message: data.message || 'Google Sheets is not configured.' };
  }
  return data;
}

/**
 * Fetch and process the entire system database from Google Sheets
 */
export async function syncDatabaseFromGoogleSheets(): Promise<{
  students: Student[];
  tests: Test[];
  admins: any[];
  results: TestResult[];
}> {
  try {
    // 1. Fetch catalog data (students, admin, exam_catalog)
    const rawData = await apiFetch('getInitialData');
    
    if (rawData && rawData.error === 'NOT_CONFIGURED') {
      console.warn('Google Sheets is not configured. Falling back to offline local storage database.');
      if (typeof window !== 'undefined') {
        initDB();
      }
      return {
        students: getStudents(),
        tests: getTests(),
        admins: getAdmins(),
        results: getTestResults()
      };
    }
    
    // 2. Fetch results to dynamically compute student completed tests and stats
    let rawResults: any[] = [];
    try {
      rawResults = await apiFetch('getData', { sheetName: 'results' });
    } catch (e) {
      console.warn('Results sheet not found or empty, starting with 0 results', e);
    }

    // 3. Process test results
    const results: TestResult[] = (Array.isArray(rawResults) ? rawResults : []).map((r: any, idx: number) => {
      return {
        id: r.id || `res_${idx}`,
        studentId: String(r.student_id || ''),
        studentName: String(r.fullname || r.studentName || ''),
        studentClass: String(r.class || r.studentClass || ''),
        level: mapSheetLevel(r.level),
        testCode: String(r.exam_id || r.testCode || ''),
        testTitle: String(r.exam_name || r.testTitle || ''),
        date: r.timestamp || r.date || new Date().toISOString(),
        score: Number(r.score || 0),
        timeSpent: Number(r.duration || r.timeSpent || 0),
        totalQuestions: Number(r.correct || 0) + Number(r.incorrect || 0),
        correctCount: Number(r.correct || 0),
        incorrectCount: Number(r.incorrect || 0),
        categoryAnalysis: {
          computingFundamentals: Number(r.score || 0), // Fallback calculation
          keyApplications: Number(r.score || 0),
          livingOnline: Number(r.score || 0)
        },
        answers: []
      };
    });

    // 4. Process test catalog (exam_catalog)
    const rawCatalog = rawData.exam_catalog || [];
    const tests: Test[] = rawCatalog
      .filter((t: any) => String(t.active).toUpperCase() === 'TRUE' || t.active === true || t.active === 1 || String(t.active) === '1')
      .map((t: any) => {
        return {
          id: String(t.exam_id),
          code: String(t.exam_id),
          level: mapSheetLevel(t.level),
          title: String(t.exam_name),
          description: `Yêu cầu đạt: đúng hết tất cả câu.`,
          category: mapSheetCategory(t.category),
          timeLimit: Number(t.time_limit || 15),
          questionsCount: 10, // will update dynamically if cached or loaded
          sheetName: String(t.sheet_name) // extra property for fetching questions
        };
      });

    // 5. Process students list with calculated stats from results
    const rawStudents = rawData.students || [];
    const students: Student[] = rawStudents.map((s: any) => {
      const studentId = String(s.student_id || s.code || '');
      const studentResults = results.filter(r => r.studentId === studentId);
      const completedTests = Array.from(new Set(studentResults.map(r => r.testCode)));
      
      const totalScore = studentResults.reduce((sum, r) => sum + r.score, 0);
      const averageScore = studentResults.length > 0 ? Math.round(totalScore / studentResults.length) : 0;
      
      const totalQuestionsSolved = studentResults.reduce((sum, r) => sum + r.totalQuestions, 0);
      const correctQuestionsSolved = studentResults.reduce((sum, r) => sum + r.correctCount, 0);

      // Compute streak
      let streak = 0;
      if (studentResults.length > 0) {
        const dates = studentResults
          .map(r => new Date(r.date).toDateString())
          .filter((v, i, a) => a.indexOf(v) === i)
          .map(d => new Date(d).getTime())
          .sort((a, b) => b - a); // descending order
        
        const oneDay = 24 * 60 * 60 * 1000;
        let current = new Date().toDateString();
        let currentTime = new Date(current).getTime();
        
        let streakActive = true;
        let checkTime = currentTime;
        
        while (streakActive) {
          const hasDay = dates.some(d => Math.abs(d - checkTime) < 10000);
          if (hasDay) {
            streak++;
            checkTime -= oneDay;
          } else if (checkTime === currentTime) {
            // Allow last active to be yesterday too for streak active
            checkTime -= oneDay;
          } else {
            streakActive = false;
          }
        }
      }

      // Compute Badges
      const badges: string[] = [];
      if (studentResults.length > 0) {
        badges.push('badge_1'); // Completed first test
      }
      if (studentResults.some(r => r.score === 100)) {
        badges.push('badge_2'); // High score 100
      }
      if (completedTests.length >= 3) {
        badges.push('badge_3'); // Finished 3 tests
      }
      if (studentResults.some(r => r.timeSpent < 300 && r.score >= 50)) {
        badges.push('badge_4'); // Super speed under 5 min
      }
      if (averageScore >= 90 && studentResults.length >= 2) {
        badges.push('badge_5'); // Brainiac avg >= 90
      }

      return {
        id: studentId,
        code: studentId,
        name: String(s.fullname || ''),
        class: String(s.class || ''),
        school: String(s.school || ''),
        password: String(s.password || '123456'),
        currentLevel: mapSheetLevel(s.level),
        avatar: studentId.charCodeAt(0) % 3 === 0 ? 'fox' : studentId.charCodeAt(0) % 3 === 1 ? 'robot' : 'panda',
        badges,
        completedTests,
        averageScore,
        totalQuestionsSolved,
        correctQuestionsSolved,
        streak: s.streak ? Number(s.streak) : streak,
        lastActiveDate: studentResults.length > 0 ? studentResults[studentResults.length - 1].date : undefined,
        isLocked: String(s.status).toLowerCase() === 'locked' || String(s.status).toLowerCase() === 'disabled'
      };
    });

    const admins = (rawData.admin || []).map((a: any) => ({
      username: String(a.username || ''),
      fullname: String(a.fullname || a.name || ''),
      password: String(a.password || ''),
      role: String(a.role || 'admin'),
      status: String(a.status || 'active')
    }));

    // Cache to localstorage as a robust fallback/offline layer
    if (typeof window !== 'undefined') {
      localStorage.setItem('ic3_students', JSON.stringify(students));
      localStorage.setItem('ic3_tests', JSON.stringify(tests));
      localStorage.setItem('ic3_admins', JSON.stringify(admins));
      localStorage.setItem('ic3_results', JSON.stringify(results));
    }

    return { students, tests, admins, results };
  } catch (error) {
    console.warn('Error syncing database from Google Sheet:', error);
    throw error;
  }
}

/**
 * Fetch questions of a specific test sheet from Google Sheet
 */
export async function fetchQuestionsFromGoogleSheet(sheetName: string, testCode: string): Promise<Question[]> {
  try {
    const rawQuestions = await apiFetch('getData', { sheetName });
    if (rawQuestions && rawQuestions.error === 'NOT_CONFIGURED') {
      console.warn(`Google Sheets is not configured. Falling back to local questions for ${testCode}.`);
      return getQuestions().filter(q => q.testId === testCode);
    }
    if (!Array.isArray(rawQuestions)) return [];

    return rawQuestions.map((q: any, idx: number) => {
      const qType = mapSheetQuestionType(q.type);
      
      // Parse options
      let options: any = undefined;
      let correctAnswer: any = undefined;

      const optA = q.optionA ? String(q.optionA).trim() : '';
      const optB = q.optionB ? String(q.optionB).trim() : '';
      const optC = q.optionC ? String(q.optionC).trim() : '';
      const optD = q.optionD ? String(q.optionD).trim() : '';

      const answerRaw = q.answer ? String(q.answer).trim() : '';

      if (qType === QuestionType.MULTIPLE_CHOICE || qType === QuestionType.SCENARIO || qType === QuestionType.IMAGE_BASED) {
        options = [optA, optB, optC, optD].filter(Boolean);
        // Answer is index (A=0, B=1, C=2, D=3 or numeric index)
        const upperAns = answerRaw.toUpperCase();
        if (upperAns === 'A' || upperAns === '0') correctAnswer = 0;
        else if (upperAns === 'B' || upperAns === '1') correctAnswer = 1;
        else if (upperAns === 'C' || upperAns === '2') correctAnswer = 2;
        else if (upperAns === 'D' || upperAns === '3') correctAnswer = 3;
        else {
          // find option index
          const foundIdx = options.findIndex((opt: string) => opt.toLowerCase() === answerRaw.toLowerCase());
          correctAnswer = foundIdx !== -1 ? foundIdx : 0;
        }
      } 
      else if (qType === QuestionType.MULTIPLE_RESPONSE) {
        options = [optA, optB, optC, optD].filter(Boolean);
        // Answer is list of correct option indices (e.g., "A,C" or "0,2")
        const parts = answerRaw.split(/[,;\s]+/).map(p => p.trim().toUpperCase()).filter(Boolean);
        const ansIndices: number[] = [];
        parts.forEach(p => {
          if (p === 'A' || p === '0') ansIndices.push(0);
          else if (p === 'B' || p === '1') ansIndices.push(1);
          else if (p === 'C' || p === '2') ansIndices.push(2);
          else if (p === 'D' || p === '3') ansIndices.push(3);
          else {
            const foundIdx = options.findIndex((opt: string) => opt.toLowerCase() === p.toLowerCase());
            if (foundIdx !== -1) ansIndices.push(foundIdx);
          }
        });
        correctAnswer = ansIndices.length > 0 ? ansIndices : [0];
      } 
      else if (qType === QuestionType.TRUE_FALSE) {
        options = ['Đúng', 'Sai'];
        const val = answerRaw.toLowerCase();
        correctAnswer = val === 'true' || val === 't' || val === 'đúng' || val === 'dung' || val === 'yes' || val === 'y' || val === '1';
      } 
      else if (qType === QuestionType.MATCHING) {
        // Option columns contain key|value pairs
        const pairs = [optA, optB, optC, optD].filter(Boolean).map(p => {
          const pts = p.split(/[|:-]+/).map(x => x.trim());
          return { key: pts[0] || '', val: pts[1] || '' };
        }).filter(p => p.key && p.val);

        const itemsA = pairs.map(p => p.key);
        const itemsB = [...pairs.map(p => p.val)].sort(() => Math.random() - 0.5); // shuffle targets

        options = { itemsA, itemsB };
        // correctAnswer maps index of itemsA to index in itemsB
        correctAnswer = itemsA.map((key, idx) => {
          const originalVal = pairs[idx].val;
          return itemsB.indexOf(originalVal);
        });
      } 
      else if (qType === QuestionType.DRAG_DROP) {
        // Items are in opt columns, separated by commas or plain
        const items = [optA, optB, optC, optD].filter(Boolean);
        options = {
          items,
          textWithBlanks: String(q.question)
        };
        // correctAnswer is the items in correct order
        correctAnswer = answerRaw.split(/[,;\s|]+/).map(x => x.trim()).filter(Boolean);
      } 
      else if (qType === QuestionType.FILL_BLANK) {
        options = {};
        // correctAnswer is array of acceptable keywords for blanks
        correctAnswer = answerRaw.split(/[,;|]+/).map(x => x.trim()).filter(Boolean);
      } 
      else if (qType === QuestionType.DROPDOWN) {
        // Dropdown options in columns, e.g. optA = "HTTP,FTP,SMTP"
        const dropdownOptions = [optA, optB, optC, optD]
          .filter(Boolean)
          .map(col => col.split(/[,;|]+/).map(x => x.trim()));
        
        options = {
          textWithDropdowns: String(q.question),
          dropdownOptions
        };
        correctAnswer = answerRaw.split(/[,;|]+/).map(x => x.trim()).filter(Boolean);
      } 
      else if (qType === QuestionType.SEQUENCE) {
        const items = [optA, optB, optC, optD].filter(Boolean);
        options = items;
        // Answer is order of original options, e.g., "A,C,B,D" or "0,2,1,3" or text order
        const parts = answerRaw.split(/[,;\s]+/).map(p => p.trim().toUpperCase()).filter(Boolean);
        let order: number[] = [];
        parts.forEach(p => {
          if (p === 'A' || p === '0') order.push(0);
          else if (p === 'B' || p === '1') order.push(1);
          else if (p === 'C' || p === '2') order.push(2);
          else if (p === 'D' || p === '3') order.push(3);
          else {
            const idx = items.findIndex(item => item.toLowerCase() === p.toLowerCase());
            if (idx !== -1) order.push(idx);
          }
        });
        if (order.length !== items.length) {
          // fall back to default sequence index [0, 1, 2, 3]
          order = items.map((_, i) => i);
        }
        correctAnswer = order;
      }
      else if (qType === QuestionType.HOTSPOT) {
        options = ['Vị trí hợp lệ'];
        const parts = answerRaw.split(/[,;|]+/).map(Number);
        correctAnswer = {
          x: parts[0] !== undefined && !isNaN(parts[0]) ? parts[0] : 50,
          y: parts[1] !== undefined && !isNaN(parts[1]) ? parts[1] : 50,
          radius: parts[2] !== undefined && !isNaN(parts[2]) ? parts[2] : 10
        };
      }

      return {
        id: q.id || `q_${idx}`,
        testId: testCode,
        type: qType,
        category: q.category ? mapSheetCategory(q.category) : IC3Category.COMPUTING_FUNDAMENTALS,
        content: String(q.question || ''),
        imageUrl: q.image || undefined,
        options,
        correctAnswer,
        explanation: q.explanation || 'Hãy cố gắng rèn luyện thêm nhé!',
        tip: q.tip || 'Mascot khuyên bạn nên ôn tập kỹ phần lý thuyết!'
      };
    });
  } catch (error) {
    console.warn(`Error loading questions for sheet "${sheetName}":`, error);
    return [];
  }
}

/**
 * Save result of test execution back to Google Sheets results sheet
 */
export async function saveResultToGoogleSheet(result: Omit<TestResult, 'id'>) {
  try {
    const response = await apiFetch('addResult', {}, {
      student_id: result.studentId,
      fullname: result.studentName,
      school: result.studentClass, // Wait, results schema columns: student_id, fullname, school, class, level, exam_id, exam_name, score, correct, incorrect, duration
      class: result.studentClass,
      level: `LV${result.level}`,
      exam_id: result.testCode,
      exam_name: result.testTitle,
      score: result.score,
      correct: result.correctCount,
      incorrect: result.incorrectCount,
      duration: result.timeSpent
    });
    if (response && response.error === 'NOT_CONFIGURED') {
      console.warn('Google Sheets is not configured. Saving result to offline local storage instead.');
      if (typeof window !== 'undefined') {
        const curResults = JSON.parse(localStorage.getItem('ic3_results') || '[]');
        const newRes: TestResult = {
          ...result,
          id: `res_local_${Date.now()}`
        };
        curResults.push(newRes);
        localStorage.setItem('ic3_results', JSON.stringify(curResults));
      }
      return;
    }
  } catch (error) {
    console.warn('Error saving result to Google Sheet, falling back to local storage:', error);
    // Fall back to localStorage append
    if (typeof window !== 'undefined') {
      const curResults = JSON.parse(localStorage.getItem('ic3_results') || '[]');
      const newRes: TestResult = {
        ...result,
        id: `res_local_${Date.now()}`
      };
      curResults.push(newRes);
      localStorage.setItem('ic3_results', JSON.stringify(curResults));
    }
  }
}

/**
 * Save user log event to Google Sheets login_logs sheet
 */
export async function saveLogToGoogleSheet(log: {
  student_id: string;
  fullname: string;
  school: string;
  class: string;
  status: 'Login Success' | 'Login Failed' | 'Logout';
}) {
  try {
    const response = await apiFetch('addLoginLog', {}, log);
    if (response && response.error === 'NOT_CONFIGURED') {
      console.warn('Google Sheets is not configured. Login log saved locally.');
      return;
    }
  } catch (error) {
    console.warn('Error writing login log to Google Sheet:', error);
  }
}

/**
 * Add or update student details in Google Sheets
 */
export async function updateStudentInGoogleSheet(student: {
  student_id: string;
  fullname: string;
  school: string;
  class: string;
  password?: string;
  level?: string;
  status?: 'active' | 'locked';
}) {
  try {
    const response = await apiFetch('updateStudent', {}, student);
    if (response && response.error === 'NOT_CONFIGURED') {
      console.warn('Google Sheets is not configured. Student update kept in offline cache.');
      return;
    }
  } catch (error) {
    console.warn('Error updating student in Google Sheet:', error);
  }
}

/**
 * Add or update exam (test catalog) details in Google Sheets
 */
export async function updateExamInGoogleSheet(exam: {
  exam_id: string;
  level: number;
  exam_name: string;
  category: string;
  time_limit: number;
  sheet_name: string;
  active?: boolean;
}) {
  try {
    const response = await apiFetch('updateExam', {}, {
      exam_id: exam.exam_id,
      level: String(exam.level),
      exam_name: exam.exam_name,
      category: exam.category,
      time_limit: exam.time_limit,
      sheet_name: exam.sheet_name,
      active: exam.active !== undefined ? exam.active : true,
    });
    if (response && response.error === 'NOT_CONFIGURED') {
      console.warn('Google Sheets is not configured. Exam update kept in offline cache.');
      return;
    }
  } catch (error) {
    console.warn('Error updating exam in Google Sheet:', error);
  }
}

/**
 * Helper to map a local Question object into sheet option parameters
 */
function serializeQuestionForSheet(question: Question, testCode: string) {
  let optionA = '';
  let optionB = '';
  let optionC = '';
  let optionD = '';
  let answerStr = '';

  const qType = question.type;

  if (qType === QuestionType.MULTIPLE_CHOICE || qType === QuestionType.SCENARIO || qType === QuestionType.IMAGE_BASED) {
    const opts = question.options as string[] || [];
    optionA = opts[0] || '';
    optionB = opts[1] || '';
    optionC = opts[2] || '';
    optionD = opts[3] || '';
    const ansIdx = Number(question.correctAnswer);
    answerStr = ansIdx === 0 ? 'A' : ansIdx === 1 ? 'B' : ansIdx === 2 ? 'C' : ansIdx === 3 ? 'D' : '';
  } 
  else if (qType === QuestionType.MULTIPLE_RESPONSE) {
    const opts = question.options as string[] || [];
    optionA = opts[0] || '';
    optionB = opts[1] || '';
    optionC = opts[2] || '';
    optionD = opts[3] || '';
    const ansIndices = question.correctAnswer as number[] || [];
    answerStr = ansIndices.map(idx => idx === 0 ? 'A' : idx === 1 ? 'B' : idx === 2 ? 'C' : idx === 3 ? 'D' : '').filter(Boolean).join(',');
  } 
  else if (qType === QuestionType.TRUE_FALSE) {
    optionA = 'Đúng';
    optionB = 'Sai';
    answerStr = question.correctAnswer ? 'A' : 'B';
  } 
  else if (qType === QuestionType.MATCHING) {
    const opts = question.options as { itemsA: string[]; itemsB: string[] };
    const ansIndices = question.correctAnswer as number[] || [];
    
    if (opts && opts.itemsA) {
      optionA = opts.itemsA[0] ? `${opts.itemsA[0]}|${opts.itemsB[ansIndices[0]] !== undefined ? opts.itemsB[ansIndices[0]] : ''}` : '';
      optionB = opts.itemsA[1] ? `${opts.itemsA[1]}|${opts.itemsB[ansIndices[1]] !== undefined ? opts.itemsB[ansIndices[1]] : ''}` : '';
      optionC = opts.itemsA[2] ? `${opts.itemsA[2]}|${opts.itemsB[ansIndices[2]] !== undefined ? opts.itemsB[ansIndices[2]] : ''}` : '';
      optionD = opts.itemsA[3] ? `${opts.itemsA[3]}|${opts.itemsB[ansIndices[3]] !== undefined ? opts.itemsB[ansIndices[3]] : ''}` : '';
    }
    answerStr = 'A,B,C,D';
  } 
  else if (qType === QuestionType.DRAG_DROP) {
    const opts = question.options as { items: string[]; textWithBlanks: string };
    if (opts && opts.items) {
      optionA = opts.items[0] || '';
      optionB = opts.items[1] || '';
      optionC = opts.items[2] || '';
      optionD = opts.items[3] || '';
    }
    const correctItems = question.correctAnswer as string[] || [];
    answerStr = correctItems.join(',');
  } 
  else if (qType === QuestionType.FILL_BLANK) {
    const correctKeywords = question.correctAnswer as string[] || [];
    answerStr = correctKeywords.join(',');
  } 
  else if (qType === QuestionType.DROPDOWN) {
    const opts = question.options as { dropdownOptions: string[][]; textWithDropdowns: string };
    if (opts && opts.dropdownOptions) {
      optionA = opts.dropdownOptions[0] ? opts.dropdownOptions[0].join(',') : '';
      optionB = opts.dropdownOptions[1] ? opts.dropdownOptions[1].join(',') : '';
      optionC = opts.dropdownOptions[2] ? opts.dropdownOptions[2].join(',') : '';
      optionD = opts.dropdownOptions[3] ? opts.dropdownOptions[3].join(',') : '';
    }
    const correctVals = question.correctAnswer as string[] || [];
    answerStr = correctVals.join(',');
  } 
  else if (qType === QuestionType.SEQUENCE) {
    const opts = question.options as string[] || [];
    optionA = opts[0] || '';
    optionB = opts[1] || '';
    optionC = opts[2] || '';
    optionD = opts[3] || '';
    const correctIndices = question.correctAnswer as number[] || [];
    answerStr = correctIndices.map(idx => idx === 0 ? 'A' : idx === 1 ? 'B' : idx === 2 ? 'C' : idx === 3 ? 'D' : '').filter(Boolean).join(',');
  }
  else if (qType === QuestionType.HOTSPOT) {
    const corr = question.correctAnswer as { x: number; y: number; radius?: number; r?: number } || { x: 50, y: 50, radius: 10 };
    const rVal = corr.radius !== undefined ? corr.radius : (corr.r !== undefined ? corr.r : 10);
    answerStr = `${corr.x},${corr.y},${rVal}`;
    optionA = 'Vị trí hợp lệ';
  }

  return {
    id: question.id,
    sheet_name: testCode,
    type: qType,
    category: question.category,
    question: question.content,
    image: question.imageUrl || '',
    optionA,
    optionB,
    optionC,
    optionD,
    answer: answerStr,
    explanation: question.explanation,
    tip: question.tip || ''
  };
}

/**
 * Add or update an individual question in Google Sheets
 */
export async function updateQuestionInGoogleSheet(testCode: string, question: Question) {
  try {
    const serialized = serializeQuestionForSheet(question, testCode);
    const response = await apiFetch('updateQuestion', {}, serialized);
    if (response && response.error === 'NOT_CONFIGURED') {
      console.warn('Google Sheets is not configured. Question update kept in offline cache.');
      return;
    }
  } catch (error) {
    console.warn('Error updating question in Google Sheet:', error);
  }
}

/**
 * Batch add/update questions in Google Sheets (essential for AI import)
 */
export async function saveQuestionsBatchToGoogleSheet(testCode: string, questions: Question[]) {
  try {
    const serializedQuestions = questions.map(q => {
      const s = serializeQuestionForSheet(q, testCode);
      const { sheet_name, ...rest } = s;
      return rest;
    });

    const response = await apiFetch('saveQuestionsBatch', {}, {
      sheet_name: testCode,
      questions: serializedQuestions
    });

    if (response && response.error === 'NOT_CONFIGURED') {
      console.warn('Google Sheets is not configured. Questions batch update kept in offline cache.');
      return;
    }
  } catch (error) {
    console.warn('Error batch updating questions in Google Sheet:', error);
  }
}

/**
 * Delete a row in Google Sheets (for deleting students, exams, or questions)
 */
export async function deleteRowInGoogleSheet(sheetName: string, keyColumn: string, keyValue: string) {
  try {
    const response = await apiFetch('deleteRow', {}, {
      sheet_name: sheetName,
      key_column: keyColumn,
      key_value: keyValue
    });
    if (response && response.error === 'NOT_CONFIGURED') {
      console.warn('Google Sheets is not configured. Delete kept in offline cache.');
      return { success: true, offline: true };
    }
    return response;
  } catch (error) {
    console.warn('Error executing delete row in Google Sheet:', error);
    throw error;
  }
}

