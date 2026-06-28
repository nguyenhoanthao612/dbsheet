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
  if (str.includes('truefalsemultiple')) return QuestionType.TRUE_FALSE_MULTIPLE;
  if (str.includes('truefalse') || str.includes('đúngsai') || str.includes('tf')) return QuestionType.TRUE_FALSE;
  if (str.includes('matching') || str.includes('ghépcặp') || str.includes('nối')) return QuestionType.MATCHING;
  if (str.includes('sequence') || str.includes('sắpxếp') || str.includes('thứtự')) return QuestionType.SEQUENCE;
  if (str.includes('video')) return QuestionType.VIDEO_BASED;
  if (str.includes('categorization') || str.includes('phânloại')) return QuestionType.CATEGORIZATION;
  if (str.includes('hotspot') || str.includes('điểmnóng')) return QuestionType.HOTSPOT;
  if (str.includes('matchimage') || str.includes('ghépảnh') || str.includes('ghéphình')) return QuestionType.MATCH_IMAGE;
  if (str.includes('matrix') || str.includes('matrận')) return QuestionType.MATRIX_SELECTION;
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
    const sheetNames: string[] = Array.isArray(rawData.sheetNames) ? rawData.sheetNames.map((sn: any) => String(sn).trim()) : [];
    const tests: Test[] = [];

    for (const t of rawCatalog) {
      const isActive = String(t.active).toUpperCase() === 'TRUE' || t.active === true || t.active === 1 || String(t.active) === '1';
      if (!isActive) continue;

      const examId = String(t.exam_id).trim();
      const sheetName = String(t.sheet_name || examId).trim();

      // Detect manually deleted sheets and auto-heal
      if (sheetNames.length > 0 && !sheetNames.includes(sheetName)) {
        console.warn(`Detected deleted/missing Google Sheet tab: ${sheetName}. Automatically removing from exam_catalog...`);
        deleteRowInGoogleSheet('exam_catalog', 'exam_id', examId).catch((err) => {
          console.error(`Failed to automatically delete missing sheet record from exam_catalog: ${examId}`, err);
        });
        continue;
      }

      tests.push({
        id: examId,
        code: examId,
        level: mapSheetLevel(t.level),
        title: String(t.exam_name),
        description: `Yêu cầu đạt: đúng hết tất cả câu.`,
        category: mapSheetCategory(t.category),
        timeLimit: Number(t.time_limit || 15),
        questionsCount: 10
      });
    }

    // Detect unlisted sheets (created directly in Google Sheet)
    const systemSheets = ['students', 'admin', 'exam_catalog', 'results', 'login_logs'];
    const unlistedSheets = sheetNames.filter(name => 
      !systemSheets.includes(name.toLowerCase()) && 
      !tests.some(t => t.code === name)
    );
    if (typeof window !== 'undefined') {
      if (unlistedSheets.length > 0) {
        localStorage.setItem('ic3_unlisted_sheets', JSON.stringify(unlistedSheets));
      } else {
        localStorage.removeItem('ic3_unlisted_sheets');
      }
    }

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

    const validQuestions = rawQuestions.filter((q: any) => q !== null && typeof q === 'object');

    return (validQuestions.map((q: any, idx: number) => {
      try {
        const qType = mapSheetQuestionType(q.type);
      
      // First, get raw dynamic options from legacy columns or a string
      const optionKeys = Object.keys(q)
        .filter(key => /^option[a-zA-Z0-9]+$/i.test(key) && key.toLowerCase() !== 'options')
        .sort((a, b) => {
          const aSuffix = a.substring(6).toUpperCase();
          const bSuffix = b.substring(6).toUpperCase();
          if (aSuffix.length === 1 && bSuffix.length === 1) {
            return aSuffix.charCodeAt(0) - bSuffix.charCodeAt(0);
          }
          return aSuffix.localeCompare(bSuffix, undefined, { numeric: true });
        });
      
      let legacyOptions: string[] = optionKeys
        .map(key => q[key] ? String(q[key]).trim() : '')
        .filter(Boolean);

      // Determine parsed options & answer from JSON columns, falling back to legacy
      let options: any = undefined;
      let correctAnswer: any = undefined;

      // Helper to try parsing options JSON
      let parsedOptionsJson: any = null;
      if (q.options !== undefined && q.options !== null && String(q.options).trim() !== '') {
        try {
          parsedOptionsJson = JSON.parse(String(q.options).trim());
        } catch (e) {
          // If it's not valid JSON, treat it as a newline-separated string
          legacyOptions = String(q.options).trim().split('\n').map(x => x.trim()).filter(Boolean);
        }
      }

      // Helper to try parsing answer JSON
      let parsedAnswerJson: any = null;
      const answerRaw = q.answer ? String(q.answer).trim() : '';
      if (answerRaw) {
        try {
          parsedAnswerJson = JSON.parse(answerRaw);
        } catch (e) {
          parsedAnswerJson = answerRaw; // Keep as raw string if not JSON
        }
      }

      if (qType === QuestionType.MULTIPLE_CHOICE) {
        // Options format: [{"id": "A", "text": "Google Docs"}, ...] or ["Google Docs", ...]
        if (Array.isArray(parsedOptionsJson)) {
          options = parsedOptionsJson.map((o: any) => (o && typeof o === 'object') ? o.text : o);
        } else {
          options = legacyOptions;
        }

        // Answer format: "A" or 0
        const ansVal = parsedAnswerJson !== null ? parsedAnswerJson : answerRaw;
        if (typeof ansVal === 'number') {
          correctAnswer = ansVal;
        } else {
          const sAns = String(ansVal).toUpperCase().trim();
          if (Array.isArray(parsedOptionsJson)) {
            const foundIdx = parsedOptionsJson.findIndex((o: any) => o && typeof o === 'object' && String(o.id).toUpperCase() === sAns);
            if (foundIdx !== -1) {
              correctAnswer = foundIdx;
            }
          }
          if (correctAnswer === undefined) {
            if (sAns.length === 1 && sAns >= 'A' && sAns <= 'Z') {
              correctAnswer = sAns.charCodeAt(0) - 65;
            } else if (/^\d+$/.test(sAns)) {
              correctAnswer = parseInt(sAns, 10);
            } else {
              const foundIdx = options.findIndex((opt: string) => opt.toLowerCase() === sAns.toLowerCase());
              correctAnswer = foundIdx !== -1 ? foundIdx : 0;
            }
          }
        }
      } 
      else if (qType === QuestionType.MULTIPLE_RESPONSE) {
        // Options format: [{"id": "A", "text": "..."}] or string[]
        if (Array.isArray(parsedOptionsJson)) {
          options = parsedOptionsJson.map((o: any) => (o && typeof o === 'object') ? o.text : o);
        } else {
          options = legacyOptions;
        }

        // Answer format: ["A", "B"] or "A,B" or [0, 1]
        const ansVal = parsedAnswerJson !== null ? parsedAnswerJson : answerRaw;
        let ansArray: any[] = [];
        if (Array.isArray(ansVal)) {
          ansArray = ansVal;
        } else if (typeof ansVal === 'string') {
          ansArray = ansVal.split(/[,;\s]+/).map(p => p.trim()).filter(Boolean);
        } else if (ansVal !== null && ansVal !== undefined) {
          ansArray = [ansVal];
        }

        const indices: number[] = [];
        ansArray.forEach(val => {
          if (typeof val === 'number') {
            indices.push(val);
          } else {
            const sVal = String(val).toUpperCase().trim();
            if (Array.isArray(parsedOptionsJson)) {
              const foundIdx = parsedOptionsJson.findIndex((o: any) => o && typeof o === 'object' && String(o.id).toUpperCase() === sVal);
              if (foundIdx !== -1) {
                indices.push(foundIdx);
                return;
              }
            }
            if (sVal.length === 1 && sVal >= 'A' && sVal <= 'Z') {
              indices.push(sVal.charCodeAt(0) - 65);
            } else if (/^\d+$/.test(sVal)) {
              indices.push(parseInt(sVal, 10));
            } else {
              const foundIdx = options.findIndex((opt: string) => opt.toLowerCase() === sVal.toLowerCase());
              if (foundIdx !== -1) indices.push(foundIdx);
            }
          }
        });
        correctAnswer = indices.length > 0 ? indices : [0];
      } 
      else if (qType === QuestionType.TRUE_FALSE) {
        options = ['Đúng', 'Sai'];
        const ansVal = parsedAnswerJson !== null ? parsedAnswerJson : answerRaw;
        const sVal = String(ansVal).toLowerCase().trim();
        correctAnswer = sVal === 'a' || sVal === 'true' || sVal === 't' || sVal === 'đúng' || sVal === 'dung' || sVal === 'yes' || sVal === 'y' || sVal === '1';
      } 
      else if (qType === QuestionType.MATCHING) {
        // Pairs format: [{"left": "CPU", "right": "Processor"}, ...]
        let pairs: { left: string; right: string }[] = [];
        const optVal = parsedOptionsJson || parsedAnswerJson;
        if (Array.isArray(optVal)) {
          pairs = optVal.map((item: any) => ({
            left: item?.left || item?.key || '',
            right: item?.right || item?.val || ''
          })).filter(p => p.left && p.right);
        }

        // Fallback to legacy
        if (pairs.length === 0) {
          pairs = legacyOptions.map(p => {
            const pts = p.split(/[|:-]+/).map(x => x.trim());
            return { left: pts[0] || '', right: pts[1] || '' };
          }).filter(p => p.left && p.right);
        }

        const itemsA = pairs.map(p => p.left);
        const originalItemsB = pairs.map(p => p.right);
        const itemsB = [...originalItemsB].sort(() => Math.random() - 0.5);

        options = { itemsA, itemsB };
        correctAnswer = itemsA.map((_, iIdx) => {
          const originalRight = originalItemsB[iIdx];
          return itemsB.indexOf(originalRight);
        });
      } 
      else if (qType === QuestionType.TRUE_FALSE_MULTIPLE) {
        options = legacyOptions;
        if (Array.isArray(parsedOptionsJson)) {
          options = parsedOptionsJson.map((o: any) => (o && typeof o === 'object') ? o.text : o);
        }
        
        let correctArray: boolean[] = [];
        if (Array.isArray(parsedAnswerJson)) {
          correctArray = parsedAnswerJson.map(val => val === true || String(val).toLowerCase() === 'true' || String(val).toLowerCase() === 'đúng');
        } else if (typeof parsedAnswerJson === 'string') {
          correctArray = parsedAnswerJson.split(/[,;\s|]+/).filter(Boolean).map(val => val.toLowerCase() === 'true' || val.toLowerCase() === 'đúng');
        } else if (answerRaw) {
          correctArray = answerRaw.split(/[,;\s|]+/).filter(Boolean).map(val => val.toLowerCase() === 'true' || val.toLowerCase() === 'đúng');
        }
        
        // Pad array if needed
        while (correctArray.length < options.length) correctArray.push(true);
        correctAnswer = correctArray;
      }
      else if (qType === QuestionType.VIDEO_BASED) {
        let isMrq = false;
        let videoUrl = '';
        let videoTitle = '';
        let videoDuration = '';
        
        if (parsedOptionsJson && typeof parsedOptionsJson === 'object' && !Array.isArray(parsedOptionsJson)) {
          options = parsedOptionsJson.options || [];
          isMrq = !!parsedOptionsJson.isMultipleResponse;
          videoUrl = parsedOptionsJson.videoUrl || '';
          videoTitle = parsedOptionsJson.videoTitle || '';
          videoDuration = parsedOptionsJson.videoDuration || '';
        } else {
          options = legacyOptions;
        }

        options = {
          options: Array.isArray(options) ? options : [],
          isMultipleResponse: isMrq,
          videoUrl,
          videoTitle,
          videoDuration
        };

        const ansVal = parsedAnswerJson !== null ? parsedAnswerJson : answerRaw;
        
        if (isMrq) {
          let ansArray: any[] = [];
          if (Array.isArray(ansVal)) {
            ansArray = ansVal;
          } else if (typeof ansVal === 'string') {
            ansArray = ansVal.split(/[,;\s]+/).map(p => p.trim()).filter(Boolean);
          } else if (ansVal !== null && ansVal !== undefined) {
            ansArray = [ansVal];
          }

          const indices: number[] = [];
          ansArray.forEach(val => {
            if (typeof val === 'number') {
              indices.push(val);
            } else {
              const sVal = String(val).toUpperCase().trim();
              if (sVal.length === 1 && sVal >= 'A' && sVal <= 'Z') {
                indices.push(sVal.charCodeAt(0) - 65);
              } else if (/^\d+$/.test(sVal)) {
                indices.push(parseInt(sVal, 10));
              } else {
                const foundIdx = (options.options as string[]).findIndex(opt => opt.toLowerCase() === sVal.toLowerCase());
                if (foundIdx !== -1) indices.push(foundIdx);
              }
            }
          });
          correctAnswer = indices;
        } else {
          if (typeof ansVal === 'number') {
            correctAnswer = ansVal;
          } else {
            const sAns = String(ansVal).toUpperCase().trim();
            if (sAns.length === 1 && sAns >= 'A' && sAns <= 'Z') {
              correctAnswer = sAns.charCodeAt(0) - 65;
            } else if (/^\d+$/.test(sAns)) {
              correctAnswer = parseInt(sAns, 10);
            } else {
              const foundIdx = (options.options as string[]).findIndex(opt => opt.toLowerCase() === sAns.toLowerCase());
              correctAnswer = foundIdx !== -1 ? foundIdx : 0;
            }
          }
        }
      }
      else if (qType === QuestionType.SEQUENCE) {
        options = legacyOptions;
        if (Array.isArray(parsedOptionsJson)) {
          options = parsedOptionsJson.map((o: any) => (o && typeof o === 'object') ? o.text : o);
        }

        // Answer format: ["step1", "step2"] in correct order
        let orderedSteps: string[] = [];
        if (Array.isArray(parsedAnswerJson)) {
          orderedSteps = parsedAnswerJson.map(String);
        }

        let correctSeq: number[] = [];
        if (orderedSteps.length > 0) {
          correctSeq = orderedSteps.map(step => options.indexOf(step)).filter(idx => idx !== -1);
        }

        if (correctSeq.length !== options.length) {
          // fallback to indices or letter keys
          let parts: string[] = [];
          if (Array.isArray(parsedAnswerJson)) {
            parts = parsedAnswerJson.map(String);
          } else if (answerRaw) {
            parts = answerRaw.split(/[,;\s]+/).map(p => p.trim());
          }

          const order: number[] = [];
          parts.forEach(p => {
            const pUpper = p.toUpperCase();
            if (pUpper.length === 1 && pUpper >= 'A' && pUpper <= 'Z') {
              order.push(pUpper.charCodeAt(0) - 65);
            } else if (/^\d+$/.test(pUpper)) {
              order.push(parseInt(pUpper, 10));
            } else {
              const idx = options.findIndex((item: string) => item.toLowerCase() === p.toLowerCase());
              if (idx !== -1) order.push(idx);
            }
          });
          correctSeq = order;
        }

        if (correctSeq.length !== options.length) {
          correctSeq = options.map((_: any, i: number) => i);
        }
        correctAnswer = correctSeq;
      }
      else if (qType === QuestionType.CATEGORIZATION) {
        options = parsedOptionsJson || { categories: [], items: [] };
        correctAnswer = Array.isArray(parsedAnswerJson) ? parsedAnswerJson : [];
      }
      else if (qType === QuestionType.HOTSPOT) {
        options = parsedOptionsJson || { spots: [] };
        correctAnswer = Array.isArray(parsedAnswerJson) ? parsedAnswerJson : [];
      }
      else if (qType === QuestionType.MATCH_IMAGE) {
        options = parsedOptionsJson || { texts: [], images: [] };
        correctAnswer = Array.isArray(parsedAnswerJson) ? parsedAnswerJson : [];
      }
      else if (qType === QuestionType.MATRIX_SELECTION) {
        options = parsedOptionsJson || { rows: [], columns: [] };
        correctAnswer = Array.isArray(parsedAnswerJson) ? parsedAnswerJson : [];
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
      } catch (err) {
        console.error(`[Exam] Error parsing question row at index ${idx}:`, q, err);
        return null;
      }
    }).filter(Boolean) as Question[]);
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
  old_exam_id?: string;
  old_sheet_name?: string;
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
      old_exam_id: exam.old_exam_id,
      old_sheet_name: exam.old_sheet_name,
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
 * Helper to map a local Question object into sheet option parameters dynamically
 */
function serializeQuestionForSheet(question: Question, testCode: string) {
  const qType = question.type;
  let optionsJson = '';
  let answerJson = '';

  if (qType === QuestionType.MULTIPLE_CHOICE) {
    const opts = (Array.isArray(question.options) ? question.options : []) as string[];
    // Convert to [{"id": "A", "text": "Google Docs"}, ...]
    const mappedOpts = opts.map((opt, idx) => ({
      id: String.fromCharCode(65 + idx),
      text: opt || ''
    }));
    optionsJson = JSON.stringify(mappedOpts);

    const ansIdx = Number(question.correctAnswer);
    const ansLetter = (ansIdx >= 0 && ansIdx < 26) ? String.fromCharCode(65 + ansIdx) : 'A';
    answerJson = JSON.stringify(ansLetter);
  } 
  else if (qType === QuestionType.MULTIPLE_RESPONSE) {
    const opts = (Array.isArray(question.options) ? question.options : []) as string[];
    const mappedOpts = opts.map((opt, idx) => ({
      id: String.fromCharCode(65 + idx),
      text: opt || ''
    }));
    optionsJson = JSON.stringify(mappedOpts);

    const ansIndices = question.correctAnswer as number[] || [];
    const ansLetters = ansIndices.map(idx => (idx >= 0 && idx < 26) ? String.fromCharCode(65 + idx) : '').filter(Boolean);
    answerJson = JSON.stringify(ansLetters);
  } 
  else if (qType === QuestionType.TRUE_FALSE) {
    const mappedOpts = [
      { id: 'A', text: 'Đúng' },
      { id: 'B', text: 'Sai' }
    ];
    optionsJson = JSON.stringify(mappedOpts);
    
    const isTrue = question.correctAnswer === true || String(question.correctAnswer).toLowerCase() === 'đúng' || String(question.correctAnswer).toLowerCase() === 'true';
    answerJson = JSON.stringify(isTrue ? 'A' : 'B');
  } 
  else if (qType === QuestionType.MATCHING) {
    const opts = question.options as { itemsA: string[]; itemsB: string[] };
    const ansIndices = question.correctAnswer as number[] || [];
    
    // List of correct pairs: [{"left": "CPU", "right": "Processor"}, ...]
    const pairs: { left: string; right: string }[] = [];
    if (opts && opts.itemsA) {
      opts.itemsA.forEach((itemA, idx) => {
        const itemB = opts.itemsB[ansIndices[idx]] !== undefined ? opts.itemsB[ansIndices[idx]] : '';
        pairs.push({ left: itemA, right: itemB });
      });
    }
    optionsJson = JSON.stringify(pairs);
    answerJson = JSON.stringify(pairs);
  } 
  else if (qType === QuestionType.TRUE_FALSE_MULTIPLE) {
    const opts = (Array.isArray(question.options) ? question.options : []) as string[];
    const mappedOpts = opts.map((opt, idx) => ({
      id: String.fromCharCode(65 + idx),
      text: opt || ''
    }));
    optionsJson = JSON.stringify(mappedOpts);
    
    const ansArray = question.correctAnswer as boolean[] || [];
    answerJson = JSON.stringify(ansArray);
  }
  else if (qType === QuestionType.VIDEO_BASED) {
    const opts = question.options as { options: string[], videoUrl: string, isMultipleResponse: boolean, videoTitle: string, videoDuration: string };
    optionsJson = JSON.stringify({
      options: opts?.options || [],
      videoUrl: opts?.videoUrl || '',
      isMultipleResponse: !!opts?.isMultipleResponse,
      videoTitle: opts?.videoTitle || '',
      videoDuration: opts?.videoDuration || ''
    });
    
    if (opts?.isMultipleResponse) {
      const ansIndices = question.correctAnswer as number[] || [];
      const ansLetters = ansIndices.map(idx => (idx >= 0 && idx < 26) ? String.fromCharCode(65 + idx) : '').filter(Boolean);
      answerJson = JSON.stringify(ansLetters);
    } else {
      const ansIdx = Number(question.correctAnswer);
      const ansLetter = (ansIdx >= 0 && ansIdx < 26) ? String.fromCharCode(65 + ansIdx) : 'A';
      answerJson = JSON.stringify(ansLetter);
    }
  }
  else if (qType === QuestionType.SEQUENCE) {
    const opts = (Array.isArray(question.options) ? question.options : []) as string[];
    const mappedOpts = opts.map((opt, idx) => ({
      id: String(idx + 1),
      text: opt || ''
    }));
    optionsJson = JSON.stringify(mappedOpts);

    const correctIndices = question.correctAnswer as number[] || [];
    // The sequence steps in correct order
    const orderedSteps = correctIndices.map(idx => opts[idx]).filter(Boolean);
    answerJson = JSON.stringify(orderedSteps);
  }
  else if (qType === QuestionType.CATEGORIZATION || qType === QuestionType.HOTSPOT || qType === QuestionType.MATCH_IMAGE || qType === QuestionType.MATRIX_SELECTION) {
    optionsJson = JSON.stringify(question.options || {});
    answerJson = JSON.stringify(question.correctAnswer || []);
  }

  const serialized: Record<string, any> = {
    id: question.id,
    sheet_name: testCode,
    type: qType,
    category: question.category,
    question: question.content,
    image: question.imageUrl || '',
    options: optionsJson,
    answer: answerJson,
    explanation: question.explanation,
    tip: question.tip || ''
  };

  return serialized;
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

/**
 * Run manual system database structure initialization in Google Sheets
 */
export async function initializeDatabaseOnGoogleSheet() {
  try {
    const response = await apiFetch('initializeDatabase', {}, {});
    return response;
  } catch (error) {
    console.warn('Error initializing database in Google Sheet:', error);
    throw error;
  }
}

