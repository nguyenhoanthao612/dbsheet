import React, { useState, useEffect, useRef } from 'react';
import {
  Student, Test, Question, TestResult, getStudents, saveStudents, getTests, saveTests,
  getQuestions, saveQuestions, getTestResults, saveTestResults, QuestionType, IC3Category, BADGES
} from '../lib/db';
import {
  updateStudentInGoogleSheet,
  updateExamInGoogleSheet,
  updateQuestionInGoogleSheet,
  saveQuestionsBatchToGoogleSheet,
  deleteRowInGoogleSheet,
  syncDatabaseFromGoogleSheets,
  initializeDatabaseOnGoogleSheet
} from '../lib/sheets';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import {
  Users, BookOpen, HelpCircle, BarChart3, Plus, Edit2, Trash2, Copy, Search, Lock, Unlock,
  ShieldCheck, RefreshCw, Eye, Sparkles, CheckCircle2, ChevronRight, X, LayoutGrid, Info, ArrowLeft, Check, Settings, GripVertical
} from 'lucide-react';
import QuestionRenderer from './QuestionRenderer';

interface AdminDashboardProps {
  adminData: { name: string; username: string };
  onLogout: () => void;
}

export default function AdminDashboard({ adminData, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'students' | 'tests' | 'questions' | 'reports'>('students');

  // Trạng thái cho Học sinh
  const [students, setStudents] = useState<Student[]>(() => getStudents());
  const [stSearch, setStSearch] = useState('');
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [stName, setStName] = useState('');
  const [stCode, setStCode] = useState('');
  const [stPassword, setStPassword] = useState('123');
  const [stClass, setStClass] = useState('');
  const [stSchool, setStSchool] = useState('');
  const [stLevel, setStLevel] = useState<1 | 2 | 3>(3);
  const [stAvatar, setStAvatar] = useState('robot');

  // Trạng thái cho Đề thi
  const [tests, setTests] = useState<Test[]>(() => getTests());
  const [showTestModal, setShowTestModal] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [oldTCode, setOldTCode] = useState('');
  const [tCode, setTCode] = useState('');
  const [tLevel, setTLevel] = useState<1 | 2 | 3>(1);
  const [tTitle, setTTitle] = useState('');
  const [tDesc, setTDesc] = useState('');
  const [tCategory, setTCategory] = useState<IC3Category>(IC3Category.COMPUTING_FUNDAMENTALS);
  const [tTime, setTTime] = useState<number>(15);

  // Trạng thái cho Câu hỏi
  const [questions, setQuestions] = useState<Question[]>(() => getQuestions());
  const [qSearchTest, setQSearchTest] = useState<string>('All');
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [qTestCode, setQTestCode] = useState<string>(() => {
    const allTests = getTests();
    return allTests.length > 0 ? allTests[0].code : '';
  });
  const [qType, setQType] = useState<QuestionType>(QuestionType.MULTIPLE_CHOICE);
  const [qCategory, setQCategory] = useState<IC3Category>(IC3Category.COMPUTING_FUNDAMENTALS);
  const [qContent, setQContent] = useState('');
  const [qImage, setQImage] = useState('');
  const [qExplanation, setQExplanation] = useState('');
  const [qTip, setQTip] = useState('');
  // Biến thể đáp án tùy theo loại câu hỏi
  const [qOptionsText, setQOptionsText] = useState(''); // text dạng dòng để parse cho MCQ/MR
  const [qCorrectAnsText, setQCorrectAnsText] = useState(''); // text chứa đáp án đúng để parse
  const [previewingQuestionObj, setPreviewingQuestionObj] = useState<Question | null>(null);

  // States for visual editor widgets (Problem 2)
  const [mcqOpts, setMcqOpts] = useState<string[]>(['', '', '', '']);
  const [matchingLines, setMatchingLines] = useState<{ left: string; right: string }[]>([
    { left: '', right: '' },
    { left: '', right: '' },
    { left: '', right: '' },
    { left: '', right: '' }
  ]);
  const [sequenceSteps, setSequenceSteps] = useState<string[]>(['', '', '', '']);
  const [tfmStatements, setTfmStatements] = useState<{ text: string; isTrue: boolean }[]>([{ text: '', isTrue: true }]);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDuration, setVideoDuration] = useState('');
  const [isVideoMrq, setIsVideoMrq] = useState(false);

  // States for new IC3 GS6 Question Types
  const [hotspotSpots, setHotspotSpots] = useState<{ label: string; x: number; y: number; w: number; h: number; isCorrect: boolean }[]>([
    { label: 'CPU', x: 20, y: 30, w: 25, h: 25, isCorrect: true },
    { label: 'RAM Slot', x: 55, y: 15, w: 10, h: 40, isCorrect: false }
  ]);
  const [catCategories, setCatCategories] = useState<string[]>(['Thiết bị nhập', 'Thiết bị xuất']);
  const [catItems, setCatItems] = useState<{ text: string; categoryIdx: number }[]>([
    { text: 'Bàn phím', categoryIdx: 0 },
    { text: 'Máy in', categoryIdx: 1 },
    { text: 'Chuột', categoryIdx: 0 },
    { text: 'Màn hình', categoryIdx: 1 }
  ]);
  const [matchImgPairs, setMatchImgPairs] = useState<{ text: string; imageUrl: string }[]>([
    { text: 'USB Port', imageUrl: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=150&auto=format&fit=crop&q=60' },
    { text: 'HDMI Port', imageUrl: 'https://images.unsplash.com/photo-1557002665-c552e183c49b?w=150&auto=format&fit=crop&q=60' }
  ]);
  const [matrixRows, setMatrixRows] = useState<string[]>(['Android', 'Windows', 'MacOS']);
  const [matrixCols, setMatrixCols] = useState<string[]>(['Google', 'Microsoft', 'Apple']);
  const [matrixCorrect, setMatrixCorrect] = useState<number[]>([0, 1, 2]); // maps matrixRows to matrixCols index

  // Hotspot drag/resize editor states
  const hotspotEditorContainerRef = useRef<HTMLDivElement>(null);
  const [activeDragIdx, setActiveDragIdx] = useState<number | null>(null);
  const [activeResizeIdx, setActiveResizeIdx] = useState<number | null>(null);
  const [dragStartPercent, setDragStartPercent] = useState({ x: 0, y: 0 });
  const [spotStartCoords, setSpotStartCoords] = useState({ x: 0, y: 0, w: 0, h: 0 });

  // States for individual question auto-parsing
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [isSingleAiLoading, setIsSingleAiLoading] = useState(false);
  const [previewTab, setPreviewTab] = useState<'student' | 'parsed'>('student');

  // Trạng thái cho AI Import
  const [showAiImportModal, setShowAiImportModal] = useState(false);
  const [aiRawText, setAiRawText] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [aiTargetTestCode, setAiTargetTestCode] = useState<string>(() => {
    const allTests = getTests();
    return allTests.length > 0 ? allTests[0].code : '';
  });
  const [editingParsedIdx, setEditingParsedIdx] = useState<number | null>(null);
  const [draftParsedQuestion, setDraftParsedQuestion] = useState<Question | null>(null);
  const [selectedPreviewParsedIdx, setSelectedPreviewParsedIdx] = useState<number>(0);

  // Trạng thái cho Custom Confirmation Modal tránh bị chặn trong iframe sandbox
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [unlistedSheets, setUnlistedSheets] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ic3_unlisted_sheets');
      const parsed = stored ? JSON.parse(stored) : [];
      const timer = setTimeout(() => {
        setUnlistedSheets(parsed);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [tests, isSyncing]);

  const handleInitializeDatabase = () => {
    triggerConfirm(
      'Khởi Tạo Cơ Sở Dữ Liệu',
      'Hành động này sẽ tạo cấu trúc bảng sạch (không kèm dữ liệu mẫu) trực tiếp trên Google Sheets liên kết nếu chưa tồn tại. Bạn có chắc chắn muốn thực hiện?',
      async () => {
        setIsInitializing(true);
        try {
          const res = await initializeDatabaseOnGoogleSheet();
          if (res && res.success) {
            alert('Khởi tạo cấu trúc cơ sở dữ liệu trên Google Sheets thành công!');
            // After initializing, run sync to refresh local cache
            const syncRes = await syncDatabaseFromGoogleSheets();
            setTests(syncRes.tests);
            setStudents(syncRes.students);
            setQuestions(getQuestions());
          } else {
            alert(`Lỗi khởi tạo: ${res?.message || 'Không rõ nguyên nhân'}`);
          }
        } catch (err: any) {
          alert(`Khởi tạo thất bại: ${err.message || err}`);
        } finally {
          setIsInitializing(false);
        }
      }
    );
  };

  const handleAddUnlistedSheet = async (sheetName: string) => {
    const cleanName = sheetName.replace(/_/g, ' ');
    const derivedLevel = sheetName.includes('LV2') ? 2 : sheetName.includes('LV3') ? 3 : 1;
    
    const newTest: Test = {
      id: `test_${Date.now()}`,
      code: sheetName.toUpperCase(),
      level: derivedLevel as 1 | 2 | 3,
      title: `Đề thi phát hiện: ${cleanName}`,
      description: `Được tự động phát hiện và đồng bộ từ Google Sheets.`,
      category: IC3Category.COMPUTING_FUNDAMENTALS,
      timeLimit: 15,
      questionsCount: 0,
    };

    const allTests = getTests();
    const isExist = allTests.some((t) => t.code.toUpperCase() === newTest.code);
    if (isExist) {
      alert('Đề thi này đã tồn tại trong hệ thống!');
      return;
    }

    const updatedTests = [...allTests, newTest];
    saveTests(updatedTests);
    setTests(updatedTests);

    try {
      await updateExamInGoogleSheet({
        exam_id: newTest.code,
        level: newTest.level,
        exam_name: newTest.title,
        category: newTest.category,
        time_limit: newTest.timeLimit,
        sheet_name: sheetName,
        active: true
      });

      const remaining = unlistedSheets.filter(s => s !== sheetName);
      setUnlistedSheets(remaining);
      if (typeof window !== 'undefined') {
        localStorage.setItem('ic3_unlisted_sheets', JSON.stringify(remaining));
      }
      alert(`Đã thêm bộ đề ${sheetName} vào danh mục thành công!`);
    } catch (err: any) {
      alert(`Lỗi thêm bộ đề: ${err.message || err}`);
    }
  };

  const handleSyncFromGoogleSheets = async () => {
    setIsSyncing(true);
    try {
      const res = await syncDatabaseFromGoogleSheets();
      setTests(res.tests);
      setStudents(res.students);
      setQuestions(getQuestions());
      alert('Đồng bộ tất cả dữ liệu từ Google Sheets thành công!');
    } catch (error: any) {
      alert(`Đồng bộ thất bại: ${error.message || error}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // --- HÀNH ĐỘNG HỌC SINH ---
  const handleOpenStudentModal = (student: Student | null = null) => {
    if (student) {
      setEditingStudent(student);
      setStName(student.name);
      setStCode(student.code);
      setStPassword(student.password || '123');
      setStClass(student.class);
      setStSchool(student.school || '');
      setStLevel(student.currentLevel);
      setStAvatar(student.avatar);
    } else {
      setEditingStudent(null);
      setStName('');
      setStCode('');
      setStPassword('123');
      setStClass('');
      setStSchool('');
      setStLevel(3);
      setStAvatar('robot');
    }
    setShowStudentModal(true);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stName || !stCode || !stClass || !stSchool) {
      alert('Vui lòng điền đầy đủ các thông tin bắt buộc (Họ tên, Mã HS, Trường học và Lớp học)!');
      return;
    }

    const allStudents = getStudents();

    if (editingStudent) {
      // Sửa học sinh
      const updated = allStudents.map((s) => {
        if (s.id === editingStudent.id) {
          return {
            ...s,
            name: stName,
            code: stCode,
            password: stPassword,
            class: stClass,
            school: stSchool,
            currentLevel: stLevel,
            avatar: stAvatar,
          };
        }
        return s;
      });
      saveStudents(updated);
      setStudents(updated);

      const updatedStudent = updated.find(s => s.id === editingStudent.id);
      if (updatedStudent) {
        updateStudentInGoogleSheet({
          student_id: updatedStudent.code,
          fullname: updatedStudent.name,
          school: updatedStudent.school || '',
          class: updatedStudent.class,
          password: updatedStudent.password,
          level: String(updatedStudent.currentLevel),
          status: updatedStudent.isLocked ? 'locked' : 'active'
        });
      }
    } else {
      // Thêm học sinh
      const isExist = allStudents.some((s) => s.code.toUpperCase() === stCode.trim().toUpperCase());
      if (isExist) {
        alert('Mã học sinh này đã tồn tại trong hệ thống!');
        return;
      }

      const newStudent: Student = {
        id: `std_${Date.now()}`,
        code: stCode.trim().toUpperCase(),
        name: stName.trim(),
        class: stClass.trim().toUpperCase(),
        school: stSchool.trim(),
        password: stPassword,
        currentLevel: stLevel,
        avatar: stAvatar,
        badges: [],
        completedTests: [],
        averageScore: 0,
        totalQuestionsSolved: 0,
        correctQuestionsSolved: 0,
        streak: 1,
        isLocked: false,
      };

      allStudents.push(newStudent);
      saveStudents(allStudents);
      setStudents(allStudents);

      updateStudentInGoogleSheet({
        student_id: newStudent.code,
        fullname: newStudent.name,
        school: newStudent.school || '',
        class: newStudent.class,
        password: newStudent.password,
        level: String(newStudent.currentLevel),
        status: 'active'
      });
    }

    setShowStudentModal(false);
  };

  const handleToggleLockStudent = (sId: string) => {
    const allStudents = getStudents();
    const updated = allStudents.map((s) => {
      if (s.id === sId) {
        return { ...s, isLocked: !s.isLocked };
      }
      return s;
    });
    saveStudents(updated);
    setStudents(updated);

    const updatedStudent = updated.find(s => s.id === sId);
    if (updatedStudent) {
      updateStudentInGoogleSheet({
        student_id: updatedStudent.code,
        fullname: updatedStudent.name,
        school: updatedStudent.school || '',
        class: updatedStudent.class,
        password: updatedStudent.password,
        level: String(updatedStudent.currentLevel),
        status: updatedStudent.isLocked ? 'locked' : 'active'
      });
    }
  };

  const handleDeleteStudent = (sId: string) => {
    triggerConfirm(
      'Xóa Tài Khoản Học Sinh',
      'Cảnh báo: Bạn có chắc chắn muốn xóa tài khoản học sinh này vĩnh viễn không? Hành động này sẽ được đồng bộ hóa lên Google Sheets.',
      () => {
        const allStudents = getStudents();
        const studentToDelete = allStudents.find((s) => s.id === sId);
        const updated = allStudents.filter((s) => s.id !== sId);
        saveStudents(updated);
        setStudents(updated);

        if (studentToDelete) {
          deleteRowInGoogleSheet('students', 'student_id', studentToDelete.code);
        }
      }
    );
  };

  // Reset kết quả làm bài của học sinh (đưa điểm số, streak, lịch sử thi về 0)
  const handleResetStudentResults = (sId: string) => {
    triggerConfirm(
      'Reset Kết Quả Học Sinh',
      'Xác nhận: Bạn có chắc chắn muốn reset toàn bộ điểm trung bình, lịch sử thi, số ngày streak và huy hiệu của học sinh này không?',
      () => {
        // Cập nhật Student
        const allStudents = getStudents();
        const updatedSt = allStudents.map((s) => {
          if (s.id === sId) {
            return {
              ...s,
              badges: [],
              completedTests: [],
              averageScore: 0,
              totalQuestionsSolved: 0,
              correctQuestionsSolved: 0,
              streak: 1,
            };
          }
          return s;
        });
        saveStudents(updatedSt);
        setStudents(updatedSt);

        // Xóa kết quả thi trong TestResults
        const allResults = getTestResults();
        const updatedRes = allResults.filter((r) => r.studentId !== sId);
        saveTestResults(updatedRes);

        const resetSt = updatedSt.find(s => s.id === sId);
        if (resetSt) {
          updateStudentInGoogleSheet({
            student_id: resetSt.code,
            fullname: resetSt.name,
            school: resetSt.school || '',
            class: resetSt.class,
            password: resetSt.password,
            level: String(resetSt.currentLevel),
            status: resetSt.isLocked ? 'locked' : 'active'
          });
          // Delete their exam results from Google Sheets
          deleteRowInGoogleSheet('results', 'student_id', resetSt.code);
        }

        alert('Đã reset toàn bộ kết quả của học sinh thành công!');
      }
    );
  };


  // --- HÀNH ĐỘNG ĐỀ THI ---
  const handleOpenTestModal = (test: Test | null = null) => {
    if (test) {
      setEditingTest(test);
      setTCode(test.code);
      setOldTCode(test.code);
      setTLevel(test.level);
      setTTitle(test.title);
      setTDesc(test.description);
      setTCategory(test.category);
      setTTime(test.timeLimit);
    } else {
      setEditingTest(null);
      setTCode('');
      setOldTCode('');
      setTLevel(1);
      setTTitle('');
      setTDesc('');
      setTCategory(IC3Category.COMPUTING_FUNDAMENTALS);
      setTTime(15);
    }
    setShowTestModal(true);
  };

  const handleSaveTest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tCode || !tTitle) {
      alert('Vui lòng điền đầy đủ các thông tin đề thi bắt buộc!');
      return;
    }

    const allTests = getTests();

    if (editingTest) {
      // Sửa đề
      const newCode = tCode.trim().toUpperCase();
      const isCodeChanged = newCode !== oldTCode;

      const updated = allTests.map((t) => {
        if (t.id === editingTest.id) {
          return {
            ...t,
            code: newCode,
            level: tLevel,
            title: tTitle.trim(),
            description: tDesc.trim(),
            category: tCategory,
            timeLimit: tTime,
          };
        }
        return t;
      });
      saveTests(updated);
      setTests(updated);

      const updatedTest = updated.find(t => t.id === editingTest.id);
      if (updatedTest) {
        updateExamInGoogleSheet({
          exam_id: updatedTest.code,
          level: updatedTest.level,
          exam_name: updatedTest.title,
          category: updatedTest.category,
          time_limit: updatedTest.timeLimit,
          sheet_name: updatedTest.code,
          active: true,
          old_exam_id: isCodeChanged ? oldTCode : undefined,
          old_sheet_name: isCodeChanged ? oldTCode : undefined
        });

        // If renamed, update all questions belonging to oldTCode to the newCode
        if (isCodeChanged) {
          const updatedQuestions = questions.map((q) => {
            if (q.testId === oldTCode) {
              return { ...q, testId: newCode };
            }
            return q;
          });
          saveQuestions(updatedQuestions);
          setQuestions(updatedQuestions);
        }
      }
    } else {
      // Thêm đề
      const isExist = allTests.some((t) => t.code.toUpperCase() === tCode.trim().toUpperCase());
      if (isExist) {
        alert('Mã bộ đề này đã tồn tại!');
        return;
      }

      const newTest: Test = {
        id: `test_${Date.now()}`,
        code: tCode.trim().toUpperCase(),
        level: tLevel,
        title: tTitle.trim(),
        description: tDesc.trim(),
        category: tCategory,
        timeLimit: tTime,
        questionsCount: 0, // Sẽ tính động sau dựa vào số câu hỏi
      };

      allTests.push(newTest);
      saveTests(allTests);
      setTests(allTests);

      updateExamInGoogleSheet({
        exam_id: newTest.code,
        level: newTest.level,
        exam_name: newTest.title,
        category: newTest.category,
        time_limit: newTest.timeLimit,
        sheet_name: newTest.code,
        active: true
      });
    }

    setShowTestModal(false);
  };

  const handleDeleteTest = (testCode: string) => {
    triggerConfirm(
      'Xóa Đề Thi',
      `Xác nhận: Bạn có muốn xóa đề thi ${testCode} và tất cả các câu hỏi thuộc đề này không? Hành động này sẽ được đồng bộ hóa lên Google Sheets.`,
      async () => {
        const targetTest = getTests().find((t) => t.code === testCode);
        
        const allTests = getTests().filter((t) => t.code !== testCode);
        saveTests(allTests);
        setTests(allTests);

        const allQuestions = getQuestions().filter((q) => q.testId !== testCode);
        saveQuestions(allQuestions);
        setQuestions(allQuestions);

        // Rename the tab to [DELETED]_ prefix to keep data but mark as deleted
        const deletedCode = `[DELETED]_${testCode}`;
        
        await updateExamInGoogleSheet({
          exam_id: deletedCode,
          level: targetTest?.level || 1,
          exam_name: targetTest?.title || deletedCode,
          category: targetTest?.category || 'Computing Fundamentals',
          time_limit: targetTest?.timeLimit || 15,
          sheet_name: deletedCode,
          active: false,
          old_exam_id: testCode,
          old_sheet_name: testCode
        });

        // Delete the row from exam_catalog
        await deleteRowInGoogleSheet('exam_catalog', 'exam_id', deletedCode);
      }
    );
  };

  // Sao chép đề thi (Duplicate)
  const handleDuplicateTest = (test: Test) => {
    const allTests = getTests();
    const newCode = `${test.code}_COPY`;
    
    // Thêm đề mới
    const duplicatedTest: Test = {
      ...test,
      id: `test_${Date.now()}`,
      code: newCode,
      title: `${test.title} (Bản Sao)`,
    };
    allTests.push(duplicatedTest);
    saveTests(allTests);
    setTests(allTests);

    // Sao chép tất cả câu hỏi thuộc đề
    const allQuestions = getQuestions();
    const testQuestions = allQuestions.filter((q) => q.testId === test.code);
    const duplicatedQuestions = testQuestions.map((q) => ({
      ...q,
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      testId: newCode,
    }));

    const finalQuestions = [...allQuestions, ...duplicatedQuestions];
    saveQuestions(finalQuestions);
    setQuestions(finalQuestions);

    // Sync duplicated exam & questions to Google Sheets
    updateExamInGoogleSheet({
      exam_id: duplicatedTest.code,
      level: duplicatedTest.level,
      exam_name: duplicatedTest.title,
      category: duplicatedTest.category,
      time_limit: duplicatedTest.timeLimit,
      sheet_name: duplicatedTest.code,
      active: true
    });

    if (duplicatedQuestions.length > 0) {
      saveQuestionsBatchToGoogleSheet(newCode, duplicatedQuestions);
    }

    alert(`Sao chép thành công đề ${test.code} sang đề mới ${newCode}!`);
  };


  // --- HÀNH ĐỘNG IMPORT BẰNG AI ---
  const handleAiAnalyze = async () => {
    if (!aiRawText.trim()) {
      alert('Vui lòng dán nội dung câu hỏi IC3 cần phân tích!');
      return;
    }

    setIsAiLoading(true);
    setParsedQuestions([]);
    setSelectedPreviewParsedIdx(0);
    
    try {
      const response = await fetch('/api/gemini/parse-questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: aiRawText,
          testId: aiTargetTestCode,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi phân tích câu hỏi bằng AI');
      }

      setParsedQuestions(data.questions);
    } catch (err: any) {
      alert(`Lỗi: ${err.message || 'Không thể phân tích câu hỏi bằng AI. Hãy kiểm tra kết nối mạng và khóa API.'}`);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSaveAllAiQuestions = () => {
    if (parsedQuestions.length === 0) {
      alert('Không có câu hỏi nào để lưu!');
      return;
    }

    // Thêm các câu hỏi đã phân tích
    const allQuestions = getQuestions();
    const updatedQuestions = [...allQuestions];
    const newQuestions: Question[] = [];

    parsedQuestions.forEach(q => {
      const finalQ = {
        ...q,
        testId: aiTargetTestCode,
      };
      updatedQuestions.push(finalQ);
      newQuestions.push(finalQ);
    });

    saveQuestions(updatedQuestions);
    setQuestions(updatedQuestions);

    // Cập nhật câu hỏi count trong Đề thi
    const allTests = getTests();
    const updatedTests = allTests.map((t) => {
      const count = updatedQuestions.filter((q) => q.testId === t.code).length;
      return { ...t, questionsCount: count };
    });
    saveTests(updatedTests);
    setTests(updatedTests);

    // Batch sync new questions to Google Sheets
    if (newQuestions.length > 0) {
      saveQuestionsBatchToGoogleSheet(aiTargetTestCode, newQuestions);
    }

    alert(`Đã lưu thành công ${parsedQuestions.length} câu hỏi mới vào bộ đề ${aiTargetTestCode}!`);
    setShowAiImportModal(false);
    setParsedQuestions([]);
    setAiRawText('');
  };

  const handleDeleteParsedQuestion = (index: number) => {
    const updated = parsedQuestions.filter((_, i) => i !== index);
    setParsedQuestions(updated);
    if (selectedPreviewParsedIdx >= updated.length && updated.length > 0) {
      setSelectedPreviewParsedIdx(updated.length - 1);
    }
  };

  const handleEditParsedQuestion = (index: number) => {
    setEditingParsedIdx(index);
    setDraftParsedQuestion({ ...parsedQuestions[index] });
  };

  const handleSaveParsedDraft = () => {
    if (!draftParsedQuestion || editingParsedIdx === null) return;
    const updated = [...parsedQuestions];
    updated[editingParsedIdx] = draftParsedQuestion;
    setParsedQuestions(updated);
    setEditingParsedIdx(null);
    setDraftParsedQuestion(null);
  };


  // --- HÀNH ĐỘNG CÂU HỎI ---
  const parseRawQuestionLocal = (text: string) => {
    if (!text.trim()) return null;

    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l);
    if (lines.length < 2) return null;

    // Find the first option line
    // Option markers: a. b. c. d. or A. B. C. D. or a) b) c) d) or A) B) C) D) or 1. 2. 3. 4.
    const optionPrefixRegex = /^\s*([a-z]|[0-9]+)\s*[\.\)-:\s]\s*/i;
    
    let firstOptionIdx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (optionPrefixRegex.test(lines[i])) {
        firstOptionIdx = i;
        break;
      }
    }

    // Also check if they are True/False lines without option prefix (e.g. just a line "Đúng" and a line "Sai")
    if (firstOptionIdx === -1) {
      for (let i = 0; i < lines.length; i++) {
        const lower = lines[i].toLowerCase();
        if (lower === 'đúng' || lower === 'sai' || lower === 'true' || lower === 'false') {
          firstOptionIdx = i;
          break;
        }
      }
    }

    if (firstOptionIdx === -1) {
      return {
        question: text.trim(),
        options: [],
        correctAnswer: '',
        type: QuestionType.MULTIPLE_CHOICE,
        error: "Không phát hiện đáp án đúng. Vui lòng kiểm tra lại nội dung."
      };
    }

    const questionPart = lines.slice(0, firstOptionIdx).join('\n').trim();
    const optionLines = lines.slice(firstOptionIdx);

    const parsedOptions: { text: string; isCorrect: boolean; originalLetter?: string }[] = [];
    let detectedType = QuestionType.MULTIPLE_CHOICE;

    // Let's check correct answer indicators
    const correctIndicators = [
      /\(Correct\)/i,
      /\(correct\)/i,
      /\(Đúng\)/i,
      /\(đúng\)/i,
      /\(Đáp án đúng\)/i,
      /\(đáp án đúng\)/i,
      /\[Correct\]/i,
      /\[Đúng\]/i,
      /\[Đáp án đúng\]/i,
      /\(True\)/i,
      /\[True\]/i,
      /\(x\)/i,
      /\[x\]/i,
      /✓/,
      /✔/,
      /^\s*\*/,
      /\*\s*$/
    ];

    // We can also have an answer block like "Answer: B" or "Correct Answer: B" at the end
    let bottomCorrectLetter = '';
    const bottomAnsMatch = text.match(/(?:answer|correct\s*answer|right\s*answer|đáp\s*án\s*đúng)\s*:\s*([a-z]|[0-9]+)/i);
    if (bottomAnsMatch) {
      bottomCorrectLetter = bottomAnsMatch[1].toUpperCase();
    }

    optionLines.forEach((line) => {
      // If it's a bottom answer line, skip it
      if (/^(answer|correct\s*answer|right\s*answer|đáp\s*án\s*đúng)\s*:/i.test(line)) {
        return;
      }

      let isCorrect = false;
      let optionText = line;
      let originalLetter = '';

      // Extract letter prefix if present
      const prefixMatch = line.match(/^\s*([a-z]|[0-9]+)\s*[\.\)-:\s]\s*(.*)$/i);
      if (prefixMatch) {
        originalLetter = prefixMatch[1].toUpperCase();
        optionText = prefixMatch[2].trim();
      }

      // Check for correct indicators
      for (const pattern of correctIndicators) {
        if (pattern.test(optionText)) {
          isCorrect = true;
          // Strip the indicator
          optionText = optionText.replace(pattern, '').trim();
        }
      }

      // Strip leading asterisks or checkmarks
      if (optionText.startsWith('*') || optionText.startsWith('✓') || optionText.startsWith('✔')) {
        isCorrect = true;
        optionText = optionText.substring(1).trim();
      }

      // Check if this matches bottom answer letter
      if (originalLetter && bottomCorrectLetter && originalLetter === bottomCorrectLetter) {
        isCorrect = true;
      }

      parsedOptions.push({
        text: optionText,
        isCorrect,
        originalLetter
      });
    });

    const correctAnswers = parsedOptions.filter((o) => o.isCorrect);

    // Check if true/false
    const isTrueFalse = parsedOptions.length === 2 && 
      parsedOptions.some(o => o.text.toLowerCase() === 'đúng' || o.text.toLowerCase() === 'true') &&
      parsedOptions.some(o => o.text.toLowerCase() === 'sai' || o.text.toLowerCase() === 'false');

    if (isTrueFalse) {
      detectedType = QuestionType.TRUE_FALSE;
    } else if (correctAnswers.length > 1) {
      detectedType = QuestionType.MULTIPLE_RESPONSE;
    } else {
      detectedType = QuestionType.MULTIPLE_CHOICE;
    }

    let correctAnswerStr = '';
    if (detectedType === QuestionType.TRUE_FALSE) {
      const trueOpt = parsedOptions.find(o => o.text.toLowerCase() === 'đúng' || o.text.toLowerCase() === 'true');
      correctAnswerStr = (trueOpt && trueOpt.isCorrect) ? 'Đúng' : 'Sai';
    } else if (detectedType === QuestionType.MULTIPLE_RESPONSE) {
      const indices = parsedOptions
        .map((o, idx) => o.isCorrect ? idx : -1)
        .filter(idx => idx !== -1);
      correctAnswerStr = indices.join(',');
    } else {
      const idx = parsedOptions.findIndex(o => o.isCorrect);
      if (idx !== -1) {
        correctAnswerStr = String(idx);
      }
    }

    let error: string | undefined;
    if (correctAnswers.length === 0) {
      error = "Không phát hiện đáp án đúng. Vui lòng kiểm tra lại nội dung.";
    }

    return {
      question: questionPart,
      options: parsedOptions.map(o => o.text),
      correctAnswer: correctAnswerStr,
      type: detectedType,
      error
    };
  };

  const handleAutoParseQuestion = (rawText: string) => {
    const parsed = parseRawQuestionLocal(rawText);
    if (!parsed || parsed.options.length === 0) {
      if (parsed?.error) {
        setParsingError(parsed.error);
      }
      return;
    }

    setQContent(parsed.question);
    setQOptionsText(parsed.options.join('\n'));
    setQType(parsed.type);
    setQCorrectAnsText(parsed.correctAnswer);
    setParsingError(parsed.error || null);

    if (parsed.type === QuestionType.MULTIPLE_CHOICE || parsed.type === QuestionType.MULTIPLE_RESPONSE) {
      setMcqOpts(parsed.options);
    }

    // Auto preview
    setTimeout(() => {
      const qObj = {
        id: editingQuestion ? editingQuestion.id : `q_${Date.now()}`,
        testId: qTestCode,
        type: parsed.type,
        category: qCategory,
        content: parsed.question,
        imageUrl: qImage.trim() || undefined,
        options: parsed.type === QuestionType.TRUE_FALSE ? ['Đúng', 'Sai'] : parsed.options,
        correctAnswer: parsed.type === QuestionType.TRUE_FALSE 
          ? (parsed.correctAnswer === 'Đúng')
          : parsed.type === QuestionType.MULTIPLE_RESPONSE 
            ? parsed.correctAnswer.split(',').map(n => parseInt(n))
            : parseInt(parsed.correctAnswer),
        explanation: qExplanation.trim(),
        tip: qTip.trim(),
      };
      setPreviewingQuestionObj(qObj as any);
    }, 100);
  };

  const handleSingleAiAnalyze = async () => {
    if (!qContent.trim()) {
      alert('Vui lòng dán hoặc nhập nội dung câu hỏi cần phân tích!');
      return;
    }
    setIsSingleAiLoading(true);
    setParsingError(null);
    try {
      const response = await fetch('/api/gemini/parse-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: qContent, testId: qTestCode })
      });
      const data = await response.json();
      if (!response.ok || !data.success || !data.questions || data.questions.length === 0) {
        throw new Error(data.error || 'Không bóc tách được câu hỏi');
      }
      const q = data.questions[0];
      
      // Set clean content
      setQContent(q.content);
      
      // Set type
      setQType(q.type as QuestionType);
      
      // Set explanation & tip
      setQExplanation(q.explanation || '');
      setQTip(q.tip || '');
      
      // Set options & correct answer depending on type
      if (q.type === QuestionType.MULTIPLE_CHOICE) {
        if (Array.isArray(q.options)) {
          setQOptionsText(q.options.join('\n'));
        }
        setQCorrectAnsText(String(q.correctAnswer));
      } else if (q.type === QuestionType.MULTIPLE_RESPONSE) {
        if (Array.isArray(q.options)) {
          setQOptionsText(q.options.join('\n'));
        }
        if (Array.isArray(q.correctAnswer)) {
          setQCorrectAnsText(q.correctAnswer.join(','));
        }
      } else if (q.type === QuestionType.TRUE_FALSE) {
        setQOptionsText('');
        setQCorrectAnsText(q.correctAnswer ? 'Đúng' : 'Sai');
      } else if (q.type === QuestionType.MATCHING) {
        if (q.options && Array.isArray(q.options.itemsA) && Array.isArray(q.options.itemsB)) {
          const lines = q.options.itemsA.map((a: string, i: number) => `${a} || ${q.options.itemsB[i] || ''}`);
          setQOptionsText(lines.join('\n'));
        }
        if (Array.isArray(q.correctAnswer)) {
          setQCorrectAnsText(q.correctAnswer.join(','));
        }
      } else if (q.type === QuestionType.TRUE_FALSE_MULTIPLE) {
        if (Array.isArray(q.options)) {
          const stmts = q.options.map((opt: string, idx: number) => ({
            text: opt,
            isTrue: Array.isArray(q.correctAnswer) ? !!q.correctAnswer[idx] : true
          }));
          setTfmStatements(stmts);
        }
      } else if (q.type === QuestionType.VIDEO_BASED) {
        if (q.options) {
          const opts = q.options as any;
          setVideoUrl(opts.videoUrl || '');
          setVideoTitle(opts.videoTitle || '');
          setVideoDuration(opts.videoDuration || '');
          setIsVideoMrq(!!opts.isMultipleResponse);
          if (Array.isArray(opts.options)) {
            setMcqOpts(opts.options);
          }
        }
        if (Array.isArray(q.correctAnswer)) {
          setQCorrectAnsText(q.correctAnswer.join(','));
        } else {
          setQCorrectAnsText(String(q.correctAnswer));
        }
      } else if (q.type === QuestionType.SEQUENCE) {
        if (Array.isArray(q.options)) {
          setQOptionsText(q.options.join('\n'));
        }
        if (Array.isArray(q.correctAnswer)) {
          setQCorrectAnsText(q.correctAnswer.join(','));
        }
      }

      // Set preview live
      setTimeout(() => {
        const qObj = {
          id: editingQuestion ? editingQuestion.id : `q_${Date.now()}`,
          testId: qTestCode,
          type: q.type,
          category: qCategory,
          content: q.content,
          imageUrl: qImage.trim() || undefined,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation || '',
          tip: q.tip || '',
        };
        setPreviewingQuestionObj(qObj as any);
      }, 100);

    } catch (err: any) {
      alert(`Lỗi phân tích AI: ${err.message || 'Có lỗi xảy ra'}`);
    } finally {
      setIsSingleAiLoading(false);
    }
  };

  const handleContentPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    const parsed = parseRawQuestionLocal(pastedText);
    if (parsed && parsed.options.length > 0) {
      e.preventDefault();
      setQContent(parsed.question);
      setQOptionsText(parsed.options.join('\n'));
      setQType(parsed.type);
      setQCorrectAnsText(parsed.correctAnswer);
      setParsingError(parsed.error || null);

      if (parsed.type === QuestionType.MULTIPLE_CHOICE || parsed.type === QuestionType.MULTIPLE_RESPONSE) {
        setMcqOpts(parsed.options);
      }

      // Auto preview
      setTimeout(() => {
        const qObj = {
          id: editingQuestion ? editingQuestion.id : `q_${Date.now()}`,
          testId: qTestCode,
          type: parsed.type,
          category: qCategory,
          content: parsed.question,
          imageUrl: qImage.trim() || undefined,
          options: parsed.type === QuestionType.TRUE_FALSE ? ['Đúng', 'Sai'] : parsed.options,
          correctAnswer: parsed.type === QuestionType.TRUE_FALSE 
            ? (parsed.correctAnswer === 'Đúng')
            : parsed.type === QuestionType.MULTIPLE_RESPONSE 
              ? parsed.correctAnswer.split(',').map(n => parseInt(n))
              : parseInt(parsed.correctAnswer),
          explanation: qExplanation.trim(),
          tip: qTip.trim(),
        };
        setPreviewingQuestionObj(qObj as any);
      }, 100);
    }
  };

  const handleOptionsChange = (text: string) => {
    setQOptionsText(text);

    // If there is a correct indicator inside the options text, let's parse it!
    const lines = text.split('\n').map(l => l.trim());
    const correctIndicators = [
      /\(Correct\)/i,
      /\(correct\)/i,
      /\(Đúng\)/i,
      /\(đúng\)/i,
      /\(Đáp án đúng\)/i,
      /\(đáp án đúng\)/i,
      /\[Correct\]/i,
      /\[Đúng\]/i,
      /\[Đáp án đúng\]/i,
      /\(True\)/i,
      /\[True\]/i,
      /\(x\)/i,
      /\[x\]/i,
      /✓/,
      /✔/,
      /^\s*\*/,
      /\*\s*$/
    ];

    let foundIndices: number[] = [];
    let cleanLines: string[] = [];
    let changed = false;

    lines.forEach((line, idx) => {
      let isCorrect = false;
      let optionText = line;

      // Extract letter prefix if present
      const prefixMatch = line.match(/^\s*([a-z]|[0-9]+)\s*[\.\)-:\s]\s*(.*)$/i);
      if (prefixMatch) {
        optionText = prefixMatch[2].trim();
      }

      // Check for indicators
      for (const pattern of correctIndicators) {
        if (pattern.test(optionText)) {
          isCorrect = true;
          optionText = optionText.replace(pattern, '').trim();
          changed = true;
        }
      }

      if (optionText.startsWith('*') || optionText.startsWith('✓') || optionText.startsWith('✔')) {
        isCorrect = true;
        optionText = optionText.substring(1).trim();
        changed = true;
      }

      cleanLines.push(optionText);
      if (isCorrect) {
        foundIndices.push(idx);
      }
    });

    if (changed && foundIndices.length > 0) {
      setQOptionsText(cleanLines.join('\n'));
      const newAns = qType === QuestionType.MULTIPLE_RESPONSE 
        ? foundIndices.join(',') 
        : String(foundIndices[0]);
      setQCorrectAnsText(newAns);

      // Auto update preview
      setTimeout(() => {
        const qObj = {
          id: editingQuestion ? editingQuestion.id : `q_${Date.now()}`,
          testId: qTestCode,
          type: qType,
          category: qCategory,
          content: qContent.trim(),
          imageUrl: qImage.trim() || undefined,
          options: qType === QuestionType.TRUE_FALSE ? ['Đúng', 'Sai'] : cleanLines.filter(Boolean),
          correctAnswer: qType === QuestionType.TRUE_FALSE 
            ? (newAns === 'Đúng' || newAns === 'true')
            : qType === QuestionType.MULTIPLE_RESPONSE 
              ? foundIndices
              : foundIndices[0],
          explanation: qExplanation.trim(),
          tip: qTip.trim(),
        };
        setPreviewingQuestionObj(qObj as any);
      }, 100);
    }
  };

  // --- HÀNH ĐỘNG CÂU HỎI ---
  const handleOpenQuestionModal = (q: Question | null = null) => {
    setParsingError(null);
    setPreviewTab('student');
    if (q) {
      setEditingQuestion(q);
      setQTestCode(q.testId);
      setQType(q.type);
      setQCategory(q.category);
      setQContent(q.content);
      setQImage(q.imageUrl || '');
      setQExplanation(q.explanation);
      setQTip(q.tip);

      // Convert options và correctAnswers sang string tiện chỉnh sửa
      if (q.type === QuestionType.MULTIPLE_CHOICE || q.type === QuestionType.MULTIPLE_RESPONSE) {
        const opts = q.options || [];
        setQOptionsText(opts.join('\n'));
        const ansText = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(',') : q.correctAnswer?.toString() || '';
        setQCorrectAnsText(ansText);
        
        const extendedOpts = [...opts];
        if (extendedOpts.length === 0) {
          extendedOpts.push('', '', '', '');
        }
        setMcqOpts(extendedOpts);
      } else if (q.type === QuestionType.TRUE_FALSE) {
        setQOptionsText('');
        setQCorrectAnsText(q.correctAnswer ? 'Đúng' : 'Sai');
      } else if (q.type === QuestionType.MATCHING) {
        const itemA = q.options?.itemsA || [];
        const itemB = q.options?.itemsB || [];
        const combined = itemA.map((it: string, i: number) => `${it} || ${itemB[i] || ''}`).join('\n');
        setQOptionsText(combined);
        setQCorrectAnsText((q.correctAnswer || []).join(','));

        const lines = itemA.map((it: string, i: number) => ({ left: it, right: itemB[i] || '' }));
        while (lines.length < 4) lines.push({ left: '', right: '' });
        setMatchingLines(lines);
      } else if (q.type === QuestionType.SEQUENCE) {
        const opts = q.options || [];
        setQOptionsText(opts.join('\n'));
        setQCorrectAnsText((q.correctAnswer || []).join(','));

        const corrAns = q.correctAnswer as number[] || [];
        const orderedSteps = Array(opts.length).fill('');
        corrAns.forEach((scrambledIdx, correctIndex) => {
          if (opts[scrambledIdx] !== undefined) {
            orderedSteps[correctIndex] = opts[scrambledIdx];
          }
        });
        const finalSteps = orderedSteps.filter(Boolean);
        while (finalSteps.length < 4) finalSteps.push('');
        setSequenceSteps(finalSteps);
      } else if (q.type === QuestionType.TRUE_FALSE_MULTIPLE) {
        const opts = q.options || [];
        const corrAns = q.correctAnswer || [];
        const statements = opts.map((opt: string, idx: number) => ({
          text: opt,
          isTrue: corrAns[idx] ?? true,
        }));
        if (statements.length === 0) statements.push({ text: '', isTrue: true });
        setTfmStatements(statements);
        setQOptionsText(opts.join('\n'));
        setQCorrectAnsText(corrAns.join(','));
      } else if (q.type === QuestionType.VIDEO_BASED) {
        const opts = q.options?.options || [];
        setVideoUrl(q.options?.videoUrl || '');
        setVideoTitle(q.options?.title || '');
        setVideoDuration(q.options?.duration || '');
        setIsVideoMrq(q.options?.isMultipleResponse || false);
        
        setQOptionsText(opts.join('\n'));
        const ansText = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(',') : q.correctAnswer?.toString() || '';
        setQCorrectAnsText(ansText);
        
        const extendedOpts = [...opts];
        if (extendedOpts.length === 0) {
          extendedOpts.push('', '', '', '');
        }
        setMcqOpts(extendedOpts);
      } else if (q.type === QuestionType.CATEGORIZATION) {
        const cats = q.options?.categories || ['Thiết bị nhập', 'Thiết bị xuất'];
        const items = q.options?.items || [];
        const corr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
        setCatCategories(cats);
        setCatItems(items.map((item: string, idx: number) => ({
          text: item,
          categoryIdx: corr[idx] ?? 0
        })));
      } else if (q.type === QuestionType.HOTSPOT) {
        setHotspotSpots(q.options?.spots || []);
      } else if (q.type === QuestionType.MATCH_IMAGE) {
        const texts = q.options?.texts || [];
        const images = q.options?.images || [];
        const corr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
        const pairs = texts.map((t: string, idx: number) => ({
          text: t,
          imageUrl: images[corr[idx]] || ''
        }));
        setMatchImgPairs(pairs);
      } else if (q.type === QuestionType.MATRIX_SELECTION) {
        setMatrixRows(q.options?.rows || []);
        setMatrixCols(q.options?.columns || []);
        setMatrixCorrect(Array.isArray(q.correctAnswer) ? q.correctAnswer : []);
      }
    } else {
      setEditingQuestion(null);
      // Gán mã đề thi tự động nếu chưa có hoặc dùng bộ đề đang lọc
      const currentTestCode = qSearchTest !== 'All' ? qSearchTest : (tests.length > 0 ? tests[0].code : '');
      setQTestCode(currentTestCode);
      setQType(QuestionType.MULTIPLE_CHOICE);
      setQCategory(IC3Category.COMPUTING_FUNDAMENTALS);
      setQContent('');
      setQImage('');
      setQExplanation('');
      setQTip('');
      setQOptionsText('Đáp án A\nĐáp án B\nĐáp án C\nĐáp án D');
      setQCorrectAnsText('0');
      setMcqOpts(['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D']);
      setMatchingLines([
        { left: 'A1', right: 'B1' },
        { left: 'A2', right: 'B2' },
        { left: 'A3', right: 'B3' },
        { left: 'A4', right: 'B4' }
      ]);
      setSequenceSteps(['Bước 1', 'Bước 2', 'Bước 3', 'Bước 4']);
      setTfmStatements([
        { text: 'Phát biểu 1', isTrue: true },
        { text: 'Phát biểu 2', isTrue: false },
        { text: 'Phát biểu 3', isTrue: true },
      ]);
      setVideoUrl('');
      setVideoTitle('');
      setVideoDuration('');
      setIsVideoMrq(false);
    }
    setPreviewingQuestionObj(null);
    setShowQuestionModal(true);
  };

  // Parse các trường của câu hỏi trước khi Lưu hoặc Preview
  const buildQuestionObjectFromForm = (showErrorAlerts: boolean = false): Question | null => {
    if (!qContent.trim()) {
      if (showErrorAlerts) {
        alert('Vui lòng nhập "Nội Dung Đề Bài" trước khi lưu!');
      }
      return null;
    }
    if (!qTestCode) {
      if (showErrorAlerts) {
        alert('Vui lòng chọn hoặc tạo ít nhất một bộ đề thi để gán câu hỏi này!');
      }
      return null;
    }

    let parsedOptions: any = null;
    let parsedCorrectAnswer: any = null;

    try {
      if (qType === QuestionType.MULTIPLE_CHOICE) {
        const emptyIndex = mcqOpts.findIndex(o => !o.trim());
        if (emptyIndex !== -1 && showErrorAlerts) {
          alert(`Lựa chọn thứ ${emptyIndex + 1} (${String.fromCharCode(65 + emptyIndex)}) đang bị trống. Vui lòng điền đầy đủ hoặc xóa đáp án này.`);
          return null;
        }
        parsedOptions = mcqOpts.map((o) => o.trim()).filter(Boolean);
        const ans = qCorrectAnsText.trim();
        let parsedIdx = parseInt(ans);
        if (isNaN(parsedIdx)) {
          const foundIdx = parsedOptions.findIndex((o: string) => o.toLowerCase() === ans.toLowerCase());
          if (foundIdx !== -1) {
            parsedIdx = foundIdx;
          } else {
            const letterCode = ans.toUpperCase();
            if (letterCode.length === 1 && letterCode >= 'A' && letterCode <= 'Z') {
              parsedIdx = letterCode.charCodeAt(0) - 65;
            }
          }
        }
        parsedCorrectAnswer = isNaN(parsedIdx) ? 0 : parsedIdx;
        
        if (showErrorAlerts && (parsedCorrectAnswer === null || parsedCorrectAnswer === undefined || parsedCorrectAnswer < 0 || parsedCorrectAnswer >= parsedOptions.length)) {
          alert('Vui lòng chọn đáp án đúng bằng cách click vào vòng tròn/ký hiệu chữ cái ở trước đáp án đúng!');
          return null;
        }
      } else if (qType === QuestionType.MULTIPLE_RESPONSE) {
        const emptyIndex = mcqOpts.findIndex(o => !o.trim());
        if (emptyIndex !== -1 && showErrorAlerts) {
          alert(`Lựa chọn thứ ${emptyIndex + 1} (${String.fromCharCode(65 + emptyIndex)}) đang bị trống. Vui lòng điền đầy đủ hoặc xóa đáp án này.`);
          return null;
        }
        parsedOptions = mcqOpts.map((o) => o.trim()).filter(Boolean);
        const parts = qCorrectAnsText.split(',').map((s) => s.trim()).filter(Boolean);
        parsedCorrectAnswer = parts.map((part) => {
          let parsedIdx = parseInt(part);
          if (isNaN(parsedIdx)) {
            const foundIdx = parsedOptions.findIndex((o: string) => o.toLowerCase() === part.toLowerCase());
            if (foundIdx !== -1) {
              parsedIdx = foundIdx;
            } else {
              const letterCode = part.toUpperCase();
              if (letterCode.length === 1 && letterCode >= 'A' && letterCode <= 'Z') {
                parsedIdx = letterCode.charCodeAt(0) - 65;
              }
            }
          }
          return parsedIdx;
        }).filter((idx) => !isNaN(idx) && idx >= 0 && idx < parsedOptions.length);

        if (showErrorAlerts && parsedCorrectAnswer.length === 0) {
          alert('Vui lòng chọn ít nhất một đáp án đúng bằng cách click vào ô vuông/ký hiệu chữ cái ở trước các đáp án đúng!');
          return null;
        }
      } else if (qType === QuestionType.TRUE_FALSE) {
        parsedOptions = ['Đúng', 'Sai'];
        parsedCorrectAnswer = qCorrectAnsText.trim().toLowerCase() === 'đúng' || qCorrectAnsText.trim() === 'true';
      } else if (qType === QuestionType.MATCHING) {
        const lines = qOptionsText.split('\n').filter((l) => l.includes('||'));
        const itemsA = lines.map((l) => l.split('||')[0].trim());
        const itemsB = lines.map((l) => l.split('||')[1].trim());
        parsedOptions = { itemsA, itemsB };
        parsedCorrectAnswer = qCorrectAnsText.split(',').map((n) => parseInt(n.trim()));
      } else if (qType === QuestionType.SEQUENCE) {
        parsedOptions = qOptionsText.split('\n').map((o) => o.trim()).filter((o) => o);
        parsedCorrectAnswer = qCorrectAnsText.split(',').map((n) => parseInt(n.trim()));
      } else if (qType === QuestionType.TRUE_FALSE_MULTIPLE) {
        const validStatements = tfmStatements.filter(s => s.text.trim());
        parsedOptions = validStatements.map(s => s.text.trim());
        parsedCorrectAnswer = validStatements.map(s => s.isTrue);
      } else if (qType === QuestionType.VIDEO_BASED) {
        const validOptions = mcqOpts.map((o) => o.trim()).filter(Boolean);
        parsedOptions = {
          videoUrl,
          title: videoTitle,
          duration: videoDuration,
          isMultipleResponse: isVideoMrq,
          options: validOptions
        };
        if (isVideoMrq) {
          const parts = qCorrectAnsText.split(',').map((s) => s.trim()).filter(Boolean);
          parsedCorrectAnswer = parts.map((part) => {
            let parsedIdx = parseInt(part);
            if (isNaN(parsedIdx)) {
              const letterCode = part.toUpperCase();
              if (letterCode.length === 1 && letterCode >= 'A' && letterCode <= 'Z') {
                parsedIdx = letterCode.charCodeAt(0) - 65;
              }
            }
            return parsedIdx;
          }).filter((idx) => !isNaN(idx) && idx >= 0 && idx < validOptions.length);
        } else {
          let parsedIdx = parseInt(qCorrectAnsText.trim());
          if (isNaN(parsedIdx)) {
            const letterCode = qCorrectAnsText.trim().toUpperCase();
            if (letterCode.length === 1 && letterCode >= 'A' && letterCode <= 'Z') {
              parsedIdx = letterCode.charCodeAt(0) - 65;
            }
          }
          parsedCorrectAnswer = isNaN(parsedIdx) ? 0 : parsedIdx;
        }
      } else if (qType === QuestionType.CATEGORIZATION) {
        const filteredCats = catCategories.map(c => c.trim()).filter(Boolean);
        const filteredItems = catItems.map(i => i.text.trim()).filter(Boolean);
        const corr = catItems.filter(i => i.text.trim()).map(i => i.categoryIdx);
        parsedOptions = { categories: filteredCats, items: filteredItems };
        parsedCorrectAnswer = corr;
      } else if (qType === QuestionType.HOTSPOT) {
        parsedOptions = { spots: hotspotSpots };
        parsedCorrectAnswer = hotspotSpots.map((s, idx) => s.isCorrect ? idx : -1).filter(idx => idx !== -1);
      } else if (qType === QuestionType.MATCH_IMAGE) {
        const validPairs = matchImgPairs.filter(p => p.text.trim() && p.imageUrl.trim());
        const texts = validPairs.map(p => p.text.trim());
        const images = validPairs.map(p => p.imageUrl.trim());
        parsedOptions = { texts, images };
        parsedCorrectAnswer = texts.map((_, i) => i);
      } else if (qType === QuestionType.MATRIX_SELECTION) {
        const rows = matrixRows.map(r => r.trim()).filter(Boolean);
        const cols = matrixCols.map(c => c.trim()).filter(Boolean);
        parsedOptions = { rows, columns: cols };
        parsedCorrectAnswer = matrixCorrect.slice(0, rows.length);
      }

      return {
        // eslint-disable-next-line react-hooks/purity
        id: editingQuestion ? editingQuestion.id : `q_${Date.now()}`,
        testId: qTestCode,
        type: qType,
        category: qCategory,
        content: qContent.trim(),
        imageUrl: qImage.trim() || undefined,
        options: parsedOptions,
        correctAnswer: parsedCorrectAnswer,
        explanation: qExplanation.trim(),
        tip: qTip.trim(),
      };
    } catch (e) {
      alert('Định dạng đáp án hoặc options chưa chính xác, hãy kiểm tra lại!');
      return null;
    }
  };

  const handlePreviewQuestion = () => {
    const qObj = buildQuestionObjectFromForm();
    if (qObj) {
      setPreviewingQuestionObj(qObj);
    }
  };

  const handleSpotMouseDown = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    if (!hotspotEditorContainerRef.current) return;
    
    const rect = hotspotEditorContainerRef.current.getBoundingClientRect();
    const currentXPct = ((e.clientX - rect.left) / rect.width) * 100;
    const currentYPct = ((e.clientY - rect.top) / rect.height) * 100;
    
    const spot = hotspotSpots[idx];
    if (spot) {
      setActiveDragIdx(idx);
      setDragStartPercent({ x: currentXPct, y: currentYPct });
      setSpotStartCoords({ x: spot.x, y: spot.y, w: spot.w, h: spot.h });
    }
  };

  const handleResizeMouseDown = (e: React.MouseEvent, idx: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hotspotEditorContainerRef.current) return;
    
    const rect = hotspotEditorContainerRef.current.getBoundingClientRect();
    const currentXPct = ((e.clientX - rect.left) / rect.width) * 100;
    const currentYPct = ((e.clientY - rect.top) / rect.height) * 100;
    
    const spot = hotspotSpots[idx];
    if (spot) {
      setActiveResizeIdx(idx);
      setDragStartPercent({ x: currentXPct, y: currentYPct });
      setSpotStartCoords({ x: spot.x, y: spot.y, w: spot.w, h: spot.h });
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!hotspotEditorContainerRef.current) return;
      
      const rect = hotspotEditorContainerRef.current.getBoundingClientRect();
      const currentXPct = ((e.clientX - rect.left) / rect.width) * 100;
      const currentYPct = ((e.clientY - rect.top) / rect.height) * 100;
      
      if (activeDragIdx !== null) {
        const deltaX = currentXPct - dragStartPercent.x;
        const deltaY = currentYPct - dragStartPercent.y;
        
        setHotspotSpots(prev => {
          const nextSpots = [...prev];
          const spot = nextSpots[activeDragIdx];
          if (spot) {
            let newX = Math.max(0, Math.min(100 - spot.w, spotStartCoords.x + deltaX));
            let newY = Math.max(0, Math.min(100 - spot.h, spotStartCoords.y + deltaY));
            nextSpots[activeDragIdx] = {
              ...spot,
              x: Math.round(newX),
              y: Math.round(newY)
            };
          }
          return nextSpots;
        });
      }
      
      if (activeResizeIdx !== null) {
        const deltaX = currentXPct - dragStartPercent.x;
        const deltaY = currentYPct - dragStartPercent.y;
        
        setHotspotSpots(prev => {
          const nextSpots = [...prev];
          const spot = nextSpots[activeResizeIdx];
          if (spot) {
            let newW = Math.max(5, Math.min(100 - spotStartCoords.x, spotStartCoords.w + deltaX));
            let newH = Math.max(5, Math.min(100 - spotStartCoords.y, spotStartCoords.h + deltaY));
            nextSpots[activeResizeIdx] = {
              ...spot,
              w: Math.round(newW),
              h: Math.round(newH)
            };
          }
          return nextSpots;
        });
      }
    };

    const handleMouseUp = () => {
      if (activeDragIdx !== null || activeResizeIdx !== null) {
        setActiveDragIdx(null);
        setActiveResizeIdx(null);
        if (typeof handlePreviewQuestion === 'function') {
          handlePreviewQuestion();
        }
      }
    };

    if (activeDragIdx !== null || activeResizeIdx !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeDragIdx, activeResizeIdx, dragStartPercent, spotStartCoords, handlePreviewQuestion]);

  const handleSaveQuestion = () => {
    const qObj = buildQuestionObjectFromForm(true);
    if (!qObj) return;

    const allQuestions = getQuestions();

    if (editingQuestion) {
      const updated = allQuestions.map((q) => (q.id === editingQuestion.id ? qObj : q));
      saveQuestions(updated);
      setQuestions(updated);
      updateQuestionInGoogleSheet(qObj.testId, qObj);
    } else {
      allQuestions.push(qObj);
      saveQuestions(allQuestions);
      setQuestions(allQuestions);
      updateQuestionInGoogleSheet(qObj.testId, qObj);
    }

    // Cập nhật câu hỏi count trong Đề thi tương ứng
    const allTests = getTests();
    const updatedTests = allTests.map((t) => {
      const count = allQuestions.filter((q) => q.testId === t.code).length;
      return { ...t, questionsCount: count };
    });
    saveTests(updatedTests);
    setTests(updatedTests);

    setShowQuestionModal(false);
  };

  const handleDeleteQuestion = (qId: string) => {
    triggerConfirm(
      'Xóa Câu Hỏi',
      'Bạn có chắc chắn muốn xóa câu hỏi này không? Hành động này sẽ được đồng bộ hóa lên Google Sheets.',
      async () => {
        const allQuestions = getQuestions();
        const qToDelete = allQuestions.find((q) => q.id === qId);
        
        if (!qToDelete) {
          alert('Lỗi: Không tìm thấy câu hỏi để xóa.');
          return;
        }

        try {
          // Try to delete from Google Sheets first
          const res = await deleteRowInGoogleSheet(qToDelete.testId, 'id', qId);
          if (res && res.error) {
            alert(`Lỗi khi xóa trên Google Sheets: ${res.message || JSON.stringify(res)}`);
            return;
          }

          const updated = allQuestions.filter((q) => q.id !== qId);
          saveQuestions(updated);
          setQuestions(updated);

          // Cập nhật câu hỏi count
          const allTests = getTests();
          const updatedTests = allTests.map((t) => {
            const count = updated.filter((q) => q.testId === t.code).length;
            return { ...t, questionsCount: count };
          });
          saveTests(updatedTests);
          setTests(updatedTests);

          alert('Đã xóa câu hỏi thành công!');
        } catch (error: any) {
          alert(`Lỗi chi tiết khi xóa câu hỏi: ${error.message || error}`);
        }
      }
    );
  };


  // --- BÁO CÁO THỐNG KÊ CHI TIẾT ---
  const getReportData = () => {
    const results = getTestResults();
    const stds = getStudents();

    const activeSt = stds.filter(s => s.completedTests.length > 0).length;
    const avgScore = stds.length > 0 ? Math.round(stds.reduce((acc, s) => acc + s.averageScore, 0) / stds.length) : 0;
    const totalAttempts = results.length;

    // Sắp xếp tìm Top 5 học sinh xuất sắc
    const topStudents = [...stds].sort((a, b) => b.averageScore - a.averageScore).slice(0, 5);

    // Tỷ lệ đạt chuẩn (điểm === 100)
    const passAttempts = results.filter(r => r.score === 100).length;
    const passRate = totalAttempts > 0 ? Math.round((passAttempts / totalAttempts) * 100) : 0;

    return {
      activeSt,
      avgScore,
      totalAttempts,
      passRate,
      topStudents
    };
  };

  const reports = getReportData();

  // Danh sách học sinh được lọc theo thanh tìm kiếm
  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(stSearch.toLowerCase()) ||
      s.code.toLowerCase().includes(stSearch.toLowerCase()) ||
      s.class.toLowerCase().includes(stSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="admin_dashboard">
      {/* HEADER BAR */}
      <header className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white py-4 px-6 shadow-md flex justify-between items-center relative z-20">
        <div className="flex items-center gap-3">
          <div className="bg-white/10 p-2 rounded-xl border border-white/20 text-indigo-400">
            <ShieldCheck className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg md:text-xl tracking-tight bg-gradient-to-r from-teal-300 via-cyan-400 to-indigo-300 bg-clip-text text-transparent">
              Hệ Thống Quản Trị IC3 GS6
            </h1>
            <p className="text-[10px] text-slate-300 font-bold tracking-widest uppercase">
              Bảng điều khiển cho thầy cô giáo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-bold text-sm text-slate-200">{adminData.name}</p>
            <p className="text-[10px] text-teal-400 font-extrabold uppercase">Quản trị viên hệ thống</p>
          </div>

          <button
            onClick={onLogout}
            className="p-2.5 bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 rounded-xl border border-white/10 transition-colors text-slate-300 text-xs font-bold flex items-center gap-1"
          >
            Đăng xuất
          </button>
        </div>
      </header>

      {/* SƯỜN TABS ĐIỀU HƯỚNG QUẢN TRỊ */}
      <div className="border-b bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-2 md:py-0">
          <div className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('students')}
              className={`py-4 px-6 text-sm font-black border-b-4 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'students' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
              id="admin_tab_students"
            >
              <Users className="w-4.5 h-4.5" /> Quản Lý Học Sinh
            </button>
            <button
              onClick={() => setActiveTab('tests')}
              className={`py-4 px-6 text-sm font-black border-b-4 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'tests' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
              id="admin_tab_tests"
            >
              <BookOpen className="w-4.5 h-4.5" /> Quản Lý Đề Thi
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`py-4 px-6 text-sm font-black border-b-4 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'questions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
              id="admin_tab_questions"
            >
              <HelpCircle className="w-4.5 h-4.5" /> Quản Lý Câu Hỏi
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`py-4 px-6 text-sm font-black border-b-4 flex items-center gap-2 transition-all whitespace-nowrap ${
                activeTab === 'reports' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
              id="admin_tab_reports"
            >
              <BarChart3 className="w-4.5 h-4.5" /> Thống Kê Báo Cáo
            </button>
          </div>
          <div className="flex items-center gap-2 pb-2 md:pb-0">
            <button
              onClick={handleInitializeDatabase}
              disabled={isSyncing || isInitializing}
              className={`px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-extrabold rounded-xl text-xs flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
              title="Khởi tạo cấu trúc các bảng trên Google Sheets (không có dữ liệu mẫu)"
            >
              <Settings className={`w-3.5 h-3.5 ${isInitializing ? 'animate-spin' : ''}`} />
              {isInitializing ? 'Đang khởi tạo...' : 'Khởi tạo CSDL'}
            </button>
            <button
              onClick={handleSyncFromGoogleSheets}
              disabled={isSyncing}
              className={`px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold rounded-xl text-xs flex items-center gap-1.5 border border-indigo-150 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ từ Google Sheets'}
            </button>
          </div>
        </div>
      </div>

      {/* NỘI DUNG TABS CHÍNH */}
      <main className="flex-grow py-8 px-6 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          
          {/* TAB 1: QUẢN LÝ HỌC SINH */}
          {activeTab === 'students' && (
            <motion.div
              key="students"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-3xl border shadow-sm">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    value={stSearch}
                    onChange={(e) => setStSearch(e.target.value)}
                    placeholder="Tìm theo tên, mã, hoặc lớp..."
                    className="w-full pl-9 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50/50 outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                  />
                </div>

                <button
                  onClick={() => handleOpenStudentModal()}
                  id="btn_add_student"
                  className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex justify-center items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" /> Thêm Học Sinh Mới
                </button>
              </div>

              {/* BẢNG DANH SÁCH HỌC SINH */}
              <div className="bg-white rounded-3xl border shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-slate-50 border-b text-slate-400 font-bold text-xs uppercase tracking-wider">
                        <th className="py-3 px-6">Học sinh</th>
                        <th className="py-3 px-6 text-center">Lớp</th>
                        <th className="py-3 px-6 text-center">Mật khẩu</th>
                        <th className="py-3 px-6 text-center">Cấp độ thi</th>
                        <th className="py-3 px-6 text-center">Đề đã vượt qua</th>
                        <th className="py-3 px-6 text-center">Điểm TB</th>
                        <th className="py-3 px-6 text-center">Trạng thái</th>
                        <th className="py-3 px-6 text-center">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700">
                      {filteredStudents.map((std) => (
                        <tr key={std.id} className="hover:bg-slate-50/50" id={`student_row_${std.code}`}>
                          <td className="py-3.5 px-6 font-semibold">
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl bg-slate-100 p-1 rounded-lg border">
                                {std.avatar === 'robot' ? '🤖' : std.avatar === 'fox' ? '🦊' : '🐼'}
                              </span>
                              <div>
                                <p className="font-extrabold text-slate-800 leading-none">{std.name}</p>
                                <p className="text-[10px] text-slate-400 mt-1">Mã: {std.code}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-6 text-center font-bold text-xs">{std.class}</td>
                          <td className="py-3.5 px-6 text-center font-mono text-xs text-slate-500">{std.password}</td>
                          <td className="py-3.5 px-6 text-center">
                            <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border">
                              Level {std.currentLevel}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-center text-xs font-semibold text-slate-500">
                            📁 {std.completedTests.length} đề
                          </td>
                          <td className="py-3.5 px-6 text-center font-bold text-sm text-indigo-600">
                            {std.averageScore} đ
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${std.isLocked ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'}`}>
                              {std.isLocked ? '🔒 Bị Khóa' : '✔ Hoạt Động'}
                            </span>
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleOpenStudentModal(std)}
                                className="p-1.5 rounded-lg border hover:bg-slate-50 text-slate-600"
                                title="Sửa"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleLockStudent(std.id)}
                                className={`p-1.5 rounded-lg border ${std.isLocked ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'}`}
                                title={std.isLocked ? "Mở khóa" : "Khóa"}
                              >
                                {std.isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                onClick={() => handleResetStudentResults(std.id)}
                                className="p-1.5 rounded-lg border hover:bg-blue-50 text-blue-600"
                                title="Reset kết quả làm bài"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(std.id)}
                                className="p-1.5 rounded-lg border hover:bg-rose-50 text-rose-600"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredStudents.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 italic">Không tìm thấy học sinh nào phù hợp!</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: QUẢN LÝ ĐỀ THI */}
          {activeTab === 'tests' && (
            <motion.div
              key="tests"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {unlistedSheets.length > 0 && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5 shadow-sm space-y-3 animate-fadeIn">
                  <div className="flex items-center gap-2 text-amber-800">
                    <Info className="w-5 h-5 text-amber-600 animate-pulse" />
                    <span className="font-extrabold text-sm">Phát hiện bộ đề mới trên Google Sheets</span>
                  </div>
                  <p className="text-xs text-amber-700">
                    Hệ thống phát hiện các tab bảng tính câu hỏi chưa được đăng ký vào Danh mục đề thi. Nhấp vào nút bên dưới để tự động thêm nhanh bộ đề thi này vào hệ thống mà không cần nhập lại!
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {unlistedSheets.map((sheet) => (
                      <div key={sheet} className="bg-white border border-amber-200 px-3 py-1.5 rounded-xl flex items-center gap-3 text-xs shadow-sm font-bold text-slate-700">
                        <span>📄 {sheet}</span>
                        <button
                          onClick={() => handleAddUnlistedSheet(sheet)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white font-extrabold rounded-lg text-[10px] shadow-sm transition-all cursor-pointer"
                        >
                          Đồng bộ đề thi
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end bg-white p-4 rounded-3xl border shadow-sm">
                <button
                  onClick={() => handleOpenTestModal()}
                  id="btn_add_test"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-4 h-4" /> Thêm Đề Thi Mới
                </button>
              </div>

              {/* LIST ĐỀ THI */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tests.map((test) => (
                  <div key={test.id} className="bg-white border rounded-3xl p-5 shadow-md flex flex-col justify-between hover:shadow-lg transition-shadow relative" id={`test_card_${test.code}`}>
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border">
                          {test.code}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">
                          Level {test.level}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-slate-800 text-sm md:text-base leading-snug pt-1">
                        {test.title}
                      </h3>
                      <p className="text-slate-500 text-xs line-clamp-2">{test.description}</p>
                    </div>

                    <div className="border-t mt-4 pt-4 flex justify-between items-center text-[10px] font-bold text-slate-500">
                      <span>⏱️ {test.timeLimit} phút</span>
                      <span>📝 {test.questionsCount} câu hỏi</span>
                      
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleOpenTestModal(test)}
                          className="p-1.5 border rounded-lg hover:bg-slate-50 text-slate-600"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDuplicateTest(test)}
                          className="p-1.5 border rounded-lg hover:bg-slate-50 text-indigo-600"
                          title="Sao chép đề"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteTest(test.code)}
                          className="p-1.5 border rounded-lg hover:bg-rose-50 text-rose-600"
                          title="Xóa đề"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 3: QUẢN LÝ CÂU HỎI */}
          {activeTab === 'questions' && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-3xl border shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Lọc Theo Bộ Đề:</span>
                  <select
                    value={qSearchTest}
                    onChange={(e) => setQSearchTest(e.target.value)}
                    className="p-1.5 border rounded-xl bg-slate-50 text-xs font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="All">Tất Cả Câu Hỏi</option>
                    {tests.map(t => (
                      <option key={t.id} value={t.code}>{t.code} - {t.title}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setParsedQuestions([]);
                      setAiRawText('');
                      setShowAiImportModal(true);
                    }}
                    id="btn_ai_import"
                    className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-xs flex justify-center items-center gap-1.5 shadow"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse" /> AI Import Question ✨
                  </button>

                  <button
                    onClick={() => handleOpenQuestionModal()}
                    id="btn_add_question"
                    className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex justify-center items-center gap-1.5 shadow"
                  >
                    <Plus className="w-4 h-4" /> Thêm Câu Hỏi Mới
                  </button>
                </div>
              </div>

              {/* LIST CÂU HỎI */}
              <div className="bg-white rounded-3xl border shadow-md overflow-hidden">
                <div className="divide-y">
                  {questions
                    .filter((q) => qSearchTest === 'All' || q.testId === qSearchTest)
                    .map((q, idx) => (
                      <div key={q.id} className="p-5 flex flex-col md:flex-row justify-between gap-4 hover:bg-slate-50/50" id={`q_row_${q.id}`}>
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border">
                              {q.testId}
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              Dạng: {q.type}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm md:text-base leading-snug">
                            {idx + 1}. {q.content}
                          </h4>
                          <p className="text-xs text-slate-400 italic">Mẹo Mascot: {q.tip}</p>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center">
                          <button
                            onClick={() => handleOpenQuestionModal(q)}
                            className="p-2 border rounded-xl hover:bg-slate-100 text-slate-600 flex items-center gap-1 text-xs font-bold"
                          >
                            <Edit2 className="w-3.5 h-3.5" /> Sửa / Xem trước
                          </button>
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-2 border rounded-xl hover:bg-rose-50 text-rose-600 flex items-center gap-1 text-xs font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Xóa
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 4: THỐNG KÊ BÁO CÁO */}
          {activeTab === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
              id="admin_reports_view"
            >
              {/* CÁC CHỈ SỐ CHÍNH */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-3xl border p-5 flex items-center gap-4 shadow">
                  <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl">
                    <Users className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Tổng Số Học Sinh</p>
                    <h3 className="text-2xl font-black text-slate-800">{students.length} em</h3>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border p-5 flex items-center gap-4 shadow">
                  <div className="p-3 bg-teal-100 text-teal-700 rounded-2xl">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Đang Hoạt Động</p>
                    <h3 className="text-2xl font-black text-slate-800">{reports.activeSt} em</h3>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border p-5 flex items-center gap-4 shadow">
                  <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
                    <Sparkles className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Điểm TB Toàn Trường</p>
                    <h3 className="text-2xl font-black text-slate-800">{reports.avgScore} đ</h3>
                  </div>
                </div>

                <div className="bg-white rounded-3xl border p-5 flex items-center gap-4 shadow">
                  <div className="p-3 bg-purple-100 text-purple-700 rounded-2xl">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Tỷ Lệ Đạt Chuẩn</p>
                    <h3 className="text-2xl font-black text-slate-800">{reports.passRate}%</h3>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Biểu đồ hoạt động của các đề thi */}
                <div className="bg-white rounded-3xl border p-6 shadow-md space-y-4">
                  <h3 className="font-extrabold text-slate-800 text-base border-b pb-3">Phân Bố Điểm TB Theo Bộ Đề</h3>
                  <div className="space-y-4 pt-2">
                    {tests.slice(0, 5).map((test) => {
                      const testResults = getTestResults().filter(r => r.testCode === test.code);
                      const avg = testResults.length > 0 ? Math.round(testResults.reduce((acc, r) => acc + r.score, 0) / testResults.length) : 0;
                      return (
                        <div key={test.id}>
                          <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                            <span>{test.code} - {test.title}</span>
                            <span>{avg} điểm ({testResults.length} lượt thi)</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${avg}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Vinh Danh Bảng Vàng (Top 5 Học Sinh) */}
                <div className="bg-white rounded-3xl border p-6 shadow-md space-y-4">
                  <h3 className="font-extrabold text-slate-800 text-base border-b pb-3">🏅 TOP 5 Học Sinh Có Điểm Cao Nhất</h3>
                  <div className="space-y-3.5">
                    {reports.topStudents.map((std, idx) => (
                      <div key={std.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-indigo-600 text-white font-black rounded-full flex items-center justify-center text-xs">
                            #{idx + 1}
                          </span>
                          <span className="text-2xl bg-white p-1 rounded-xl border">
                            {std.avatar === 'robot' ? '🤖' : std.avatar === 'fox' ? '🦊' : '🐼'}
                          </span>
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-sm leading-snug">{std.name}</h4>
                            <p className="text-[10px] text-slate-500">Mã: {std.code} • Lớp: {std.class}</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <h4 className="font-black text-indigo-600 text-sm">{std.averageScore} điểm</h4>
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                            Level {std.currentLevel}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* MODAL THÊM/SỬA HỌC SINH */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" id="student_editor_modal">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-100 shadow-2xl relative">
            <button
              onClick={() => setShowStudentModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full border bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-lg font-bold"
            >
              ×
            </button>

            <h3 className="font-black text-slate-800 text-lg mb-5 border-b pb-2">
              {editingStudent ? 'Cập Nhật Học Sinh' : 'Đăng Ký Học Sinh Mới'}
            </h3>

            <form onSubmit={handleSaveStudent} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mã Học Sinh (ID đăng nhập) *</label>
                <input
                  type="text"
                  value={stCode}
                  disabled={editingStudent !== null}
                  onChange={(e) => setStCode(e.target.value)}
                  placeholder="Ví dụ: HS005"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Họ và Tên *</label>
                <input
                  type="text"
                  value={stName}
                  onChange={(e) => setStName(e.target.value)}
                  placeholder="Ví dụ: Hoàng Đức Anh"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mật khẩu *</label>
                <input
                  type="text"
                  value={stPassword}
                  onChange={(e) => setStPassword(e.target.value)}
                  placeholder="Mật khẩu"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Trường Học *</label>
                  <input
                    type="text"
                    value={stSchool}
                    onChange={(e) => setStSchool(e.target.value)}
                    placeholder="Ví dụ: THCS Nguyễn Du"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Lớp Học *</label>
                  <input
                    type="text"
                    value={stClass}
                    onChange={(e) => setStClass(e.target.value)}
                    placeholder="Ví dụ: 8A1"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-bold"
                  />
                </div>
              </div>



              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Chọn Avatar Đại Diện</label>
                <div className="grid grid-cols-3 gap-2">
                  {['robot', 'fox', 'panda'].map((avatar) => (
                    <button
                      key={avatar}
                      type="button"
                      onClick={() => setStAvatar(avatar)}
                      className={`p-2 border rounded-xl text-center transition-all ${
                        stAvatar === avatar ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-300' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span className="text-3xl block">
                        {avatar === 'robot' ? '🤖' : avatar === 'fox' ? '🦊' : '🐼'}
                      </span>
                      <span className="text-[9px] font-bold capitalize text-slate-500">{avatar}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow mt-4 transition-all"
              >
                {editingStudent ? 'Lưu Thay Đổi' : 'Đăng Ký Học Sinh'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL THÊM/SỬA ĐỀ THI */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" id="test_editor_modal">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-slate-100 shadow-2xl relative">
            <button
              onClick={() => setShowTestModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full border bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-lg font-bold"
            >
              ×
            </button>

            <h3 className="font-black text-slate-800 text-lg mb-5 border-b pb-2">
              {editingTest ? 'Chỉnh Sửa Đề Thi' : 'Tạo Đề Thi Mới'}
            </h3>

            <form onSubmit={handleSaveTest} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mã Bộ Đề *</label>
                  <input
                    type="text"
                    value={tCode}
                    onChange={(e) => setTCode(e.target.value)}
                    placeholder="Ví dụ: OT3_LV1"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Thời Gian Làm (phút) *</label>
                  <input
                    type="number"
                    value={tTime}
                    onChange={(e) => setTTime(parseInt(e.target.value) || 15)}
                    placeholder="Thời gian"
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tiêu Đề Bộ Đề *</label>
                <input
                  type="text"
                  value={tTitle}
                  onChange={(e) => setTTitle(e.target.value)}
                  placeholder="Ví dụ: Đề số 3 - Thiết bị và Mạng nội bộ"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mô tả tóm tắt</label>
                <textarea
                  value={tDesc}
                  onChange={(e) => setTDesc(e.target.value)}
                  placeholder="Các nội dung chính có trong đề..."
                  rows={2}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cấp Độ Level</label>
                  <select
                    value={tLevel}
                    onChange={(e) => setTLevel(parseInt(e.target.value) as any)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none bg-slate-50 font-bold"
                  >
                    <option value={1}>Level 1</option>
                    <option value={2}>Level 2</option>
                    <option value={3}>Level 3</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Miền Kiến Thức</label>
                  <select
                    value={tCategory}
                    onChange={(e) => setTCategory(e.target.value as any)}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs outline-none bg-slate-50 font-bold"
                  >
                    <option value={IC3Category.COMPUTING_FUNDAMENTALS}>{IC3Category.COMPUTING_FUNDAMENTALS}</option>
                    <option value={IC3Category.KEY_APPLICATIONS}>{IC3Category.KEY_APPLICATIONS}</option>
                    <option value={IC3Category.LIVING_ONLINE}>{IC3Category.LIVING_ONLINE}</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs shadow mt-4 transition-all"
              >
                {editingTest ? 'Lưu Thay Đổi' : 'Tạo Đề Thi'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL THÊM/SỬA CÂU HỎI (CÓ LIVE PREVIEW!) */}
      {showQuestionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" id="question_editor_modal">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full border border-slate-100 shadow-2xl relative my-8">
            <button
              onClick={() => setShowQuestionModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full border bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-lg font-bold"
            >
              ×
            </button>

            <h3 className="font-black text-slate-800 text-lg mb-5 border-b pb-2">
              {editingQuestion ? 'Chỉnh Sửa Câu Hỏi IC3' : 'Tạo Câu Hỏi IC3 Mới'}
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form Soạn Thảo */}
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Bộ Đề Gán *</label>
                    <select
                      value={qTestCode}
                      onChange={(e) => setQTestCode(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50"
                    >
                      {tests.map(t => (
                        <option key={t.id} value={t.code}>{t.code}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Miền Kiến Thức *</label>
                    <select
                      value={qCategory}
                      onChange={(e) => setQCategory(e.target.value as any)}
                      className="w-full p-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50"
                    >
                      <option value={IC3Category.COMPUTING_FUNDAMENTALS}>{IC3Category.COMPUTING_FUNDAMENTALS}</option>
                      <option value={IC3Category.KEY_APPLICATIONS}>{IC3Category.KEY_APPLICATIONS}</option>
                      <option value={IC3Category.LIVING_ONLINE}>{IC3Category.LIVING_ONLINE}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Dạng Câu Hỏi *</label>
                    <select
                      value={qType}
                      onChange={(e) => setQType(e.target.value as any)}
                      className="w-full p-2 border border-slate-200 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-800"
                    >
                      <option value={QuestionType.MULTIPLE_CHOICE}>1. Multiple Choice</option>
                      <option value={QuestionType.MULTIPLE_RESPONSE}>2. Multiple Response</option>
                      <option value={QuestionType.TRUE_FALSE}>3. True / False</option>
                      <option value={QuestionType.MATCHING}>4. Matching</option>
                      <option value={QuestionType.SEQUENCE}>5. Sequence Ordering</option>
                      <option value={QuestionType.TRUE_FALSE_MULTIPLE}>6. True/False Multiple</option>
                      <option value={QuestionType.VIDEO_BASED}>7. Video Based</option>
                      <option value={QuestionType.CATEGORIZATION}>8. Categorization</option>
                      <option value={QuestionType.HOTSPOT}>9. Hotspot</option>
                      <option value={QuestionType.MATCH_IMAGE}>10. Match Image To Text</option>
                      <option value={QuestionType.MATRIX_SELECTION}>11. Matrix Selection</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Hình Ảnh Đính Kèm (Nếu có)</label>
                    <input
                      type="text"
                      value={qImage}
                      onChange={(e) => setQImage(e.target.value)}
                      placeholder="https://picsum.photos/seed/..."
                      className="w-full p-2 border border-slate-200 rounded-xl text-xs font-semibold bg-slate-50"
                    />
                  </div>
                </div>

                 <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Nội Dung Đề Bài *</label>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleAutoParseQuestion(qContent)}
                        className="text-[9px] px-2 py-0.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-extrabold rounded border border-amber-200 transition-all flex items-center gap-0.5"
                        title="Tự động phân tách câu hỏi, options & đáp án bằng thuật toán Regex"
                      >
                        ⚡ Tách Nhanh
                      </button>
                      <button
                        type="button"
                        disabled={isSingleAiLoading || !qContent.trim()}
                        onClick={handleSingleAiAnalyze}
                        className="text-[9px] px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 disabled:bg-slate-50 text-indigo-700 font-extrabold rounded border border-indigo-200 transition-all flex items-center gap-1"
                        title="Dùng Gemini AI bóc tách sâu rộng, giải thích và mẹo học tập"
                      >
                        {isSingleAiLoading ? (
                          <>
                            <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Đang bóc tách...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-2.5 h-2.5 text-amber-500 animate-pulse" /> Phân Tích AI ✨
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={qContent}
                    onChange={(e) => setQContent(e.target.value)}
                    onPaste={handleContentPaste}
                    placeholder="Dán câu hỏi thô kèm các đáp án (a, b, c, d) vào đây. Hệ thống sẽ tự động tách khi dán hoặc bấm 'Tách Nhanh'."
                    rows={4}
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-bold outline-none"
                  />
                  <p className="text-[9px] text-slate-400 font-medium mt-0.5">
                    * Mẹo: Dán trực tiếp văn bản thô dạng &quot;Câu hỏi... a. Lựa chọn (Đúng)...&quot; để tự động bóc tách các trường!
                  </p>

                  {parsingError && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-800 rounded-lg flex items-center gap-1">
                      <span>⚠️ {parsingError}</span>
                    </div>
                  )}
                </div>

                {/* HƯỚNG DẪN ĐỊNH DẠNG THEO TỪNG DẠNG */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border text-[10px] font-bold leading-normal text-slate-500 space-y-2">
                  <p className="text-indigo-600 font-extrabold flex items-center gap-1">
                    <Info className="w-3.5 h-3.5" /> Hướng Dẫn Soạn Thảo Cho Dạng này:
                  </p>
                  {qType === QuestionType.MULTIPLE_CHOICE && (
                    <p>• <strong>Lựa chọn:</strong> Gõ mỗi đáp án 1 dòng.<br />• <strong>Đáp án đúng:</strong> Gõ chỉ số của đáp án đúng (ví dụ: 0 cho đáp án thứ 1, 1 cho đáp án thứ 2...).</p>
                  )}
                  {qType === QuestionType.MULTIPLE_RESPONSE && (
                    <p>• <strong>Lựa chọn:</strong> Gõ mỗi đáp án 1 dòng.<br />• <strong>Đáp án đúng:</strong> Gõ các chỉ số đáp án đúng cách nhau bằng dấu phẩy (ví dụ: 0,2).</p>
                  )}
                  {qType === QuestionType.TRUE_FALSE && (
                    <p>• <strong>Đáp án đúng:</strong> Gõ &quot;Đúng&quot; hoặc &quot;Sai&quot; (không phân biệt chữ hoa/thường).</p>
                  )}
                  {qType === QuestionType.MATCHING && (
                    <p>• <strong>Lựa chọn:</strong> Mỗi dòng gồm 1 cặp ghép nối dạng &apos;Vế A|Vế B&apos;.<br />• <strong>Đáp án đúng:</strong> Các cặp ghép đúng sẽ tự động được đồng bộ và lưu trữ.</p>
                  )}
                  {qType === QuestionType.TRUE_FALSE_MULTIPLE && (
                    <p>• <strong>Phát biểu:</strong> Thêm các phát biểu và đánh dấu Đúng/Sai cho từng phát biểu.</p>
                  )}
                  {qType === QuestionType.VIDEO_BASED && (
                    <p>• <strong>Video:</strong> Nhập link video (YouTube) và điền câu hỏi. Hỗ trợ câu hỏi một hoặc nhiều đáp án.</p>
                  )}
                  {qType === QuestionType.SEQUENCE && (
                    <p>• <strong>Các bước:</strong> Nhập các bước theo đúng trình tự từ trước đến sau. Hệ thống sẽ tự động xáo trộn khi hiển thị.</p>
                  )}
                  {qType === QuestionType.CATEGORIZATION && (
                    <p>• <strong>Phân loại (Categorization):</strong> Định nghĩa các nhóm (ví dụ: Thiết bị nhập, Thiết bị xuất) và gán từng mục vào nhóm chính xác.</p>
                  )}
                  {qType === QuestionType.HOTSPOT && (
                    <p>• <strong>Vùng Chọn (Hotspot):</strong> Đảm bảo đã điền &quot;Hình Ảnh Đính Kèm&quot;. Sau đó tạo và vẽ trực tiếp các vùng chọn (Rounded Rectangle) trên ảnh, đánh dấu vùng Đúng.</p>
                  )}
                  {qType === QuestionType.MATCH_IMAGE && (
                    <p>• <strong>Ghép Ảnh với Chữ:</strong> Tạo các cặp nhãn chữ và link ảnh tương ứng. Người dùng sẽ kéo thả nhãn vào đúng ảnh.</p>
                  )}
                  {qType === QuestionType.MATRIX_SELECTION && (
                    <p>• <strong>Bảng Chọn Ma Trận (Matrix):</strong> Nhập danh sách Hàng (Rows) và Cột (Columns). Chọn radio tương ứng để xác định đáp án đúng cho từng hàng.</p>
                  )}
                
                {(qType === QuestionType.MULTIPLE_CHOICE || qType === QuestionType.MULTIPLE_RESPONSE) && (
                  <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-3xl shadow-sm">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <div>
                        <label className="block text-xs font-black text-indigo-700 uppercase">Cấu hình các lựa chọn</label>
                        <span className="text-[10px] text-slate-400 font-bold block">
                          Hãy tick vào nút {qType === QuestionType.MULTIPLE_RESPONSE ? 'ô vuông' : 'hình tròn'} ở trước đáp án để đánh dấu đáp án đúng.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newOpts = [...mcqOpts, ''];
                          setMcqOpts(newOpts);
                          setQOptionsText(newOpts.filter(Boolean).join('\n'));
                        }}
                        className="text-[10px] py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg shadow-sm hover:shadow-md transition-all flex items-center gap-1"
                      >
                        + Thêm Đáp Án
                      </button>
                    </div>

                    <div className="space-y-3">
                      {mcqOpts.map((opt, idx) => {
                        const letter = String.fromCharCode(65 + idx);
                        const isMultipleResponse = qType === QuestionType.MULTIPLE_RESPONSE;
                        
                        let isSelected = false;
                        if (isMultipleResponse) {
                          const selectedIndices = qCorrectAnsText.split(',').map(s => s.trim()).filter(Boolean);
                          isSelected = selectedIndices.includes(String(idx));
                        } else {
                          isSelected = qCorrectAnsText.trim() === String(idx);
                        }

                        return (
                          <div key={idx} className={`flex items-center gap-3 p-3 border rounded-2xl shadow-sm transition-all hover:shadow-md ${
                            isSelected 
                              ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-300' 
                              : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}>
                            {/* Nút chọn đáp án đúng */}
                            <button
                              type="button"
                              onClick={() => {
                                if (isMultipleResponse) {
                                  const selectedIndices = qCorrectAnsText.split(',').map(s => s.trim()).filter(Boolean);
                                  let newIndices;
                                  if (selectedIndices.includes(String(idx))) {
                                    newIndices = selectedIndices.filter(s => s !== String(idx));
                                  } else {
                                    newIndices = [...selectedIndices, String(idx)].sort();
                                  }
                                  setQCorrectAnsText(newIndices.join(','));
                                } else {
                                  setQCorrectAnsText(String(idx));
                                }
                                setTimeout(() => handlePreviewQuestion(), 50);
                              }}
                              className="flex items-center gap-2 flex-shrink-0 group cursor-pointer"
                              title={isMultipleResponse ? "Chọn làm một trong các đáp án đúng" : "Chọn làm đáp án đúng duy nhất"}
                            >
                              <div className={`w-5.5 h-5.5 flex items-center justify-center border-2 transition-all ${
                                isMultipleResponse ? 'rounded-lg' : 'rounded-full'
                              } ${
                                isSelected 
                                  ? 'border-emerald-600 bg-emerald-600 text-white' 
                                  : 'border-slate-300 bg-slate-50 group-hover:border-indigo-400'
                              }`}>
                                {isSelected ? (
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                ) : (
                                  <div className={`w-2 h-2 ${isMultipleResponse ? 'rounded-[2px]' : 'rounded-full'} bg-transparent`} />
                                )}
                              </div>
                              <span className={`text-xs font-black w-4 text-center ${
                                isSelected ? 'text-emerald-800' : 'text-slate-500'
                              }`}>
                                {letter}
                              </span>
                            </button>

                            {/* Ô nhập nội dung */}
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...mcqOpts];
                                newOpts[idx] = e.target.value;
                                setMcqOpts(newOpts);
                                setQOptionsText(newOpts.filter(Boolean).join('\n'));
                                setTimeout(() => handlePreviewQuestion(), 50);
                              }}
                              placeholder={
                                qType === QuestionType.MULTIPLE_CHOICE
                                  ? "Nhập đường dẫn ảnh hoặc mô tả..."
                                  : `Nội dung lựa chọn ${letter}...`
                              }
                              className={`flex-1 p-2 border rounded-xl text-xs font-bold outline-none transition-all ${
                                isSelected 
                                  ? 'bg-white border-emerald-200 focus:ring-1 focus:ring-emerald-400 text-emerald-900' 
                                  : 'bg-slate-50/50 border-slate-100 focus:bg-white focus:ring-1 focus:ring-indigo-500 text-slate-800'
                              }`}
                            />

                            {/* Nút xóa lựa chọn */}
                            {mcqOpts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newOpts = mcqOpts.filter((_, i) => i !== idx);
                                  setMcqOpts(newOpts);
                                  setQOptionsText(newOpts.filter(Boolean).join('\n'));
                                  
                                  if (isMultipleResponse) {
                                    const selectedIndices = qCorrectAnsText.split(',').map(s => s.trim()).filter(Boolean).map(Number);
                                    const adjusted = selectedIndices
                                      .filter(s => s !== idx)
                                      .map(s => s > idx ? s - 1 : s);
                                    setQCorrectAnsText(adjusted.join(','));
                                  } else {
                                    const currentCorrect = Number(qCorrectAnsText.trim());
                                    if (currentCorrect === idx) {
                                      setQCorrectAnsText('0');
                                    } else if (currentCorrect > idx) {
                                      setQCorrectAnsText(String(currentCorrect - 1));
                                    }
                                  }
                                  setTimeout(() => handlePreviewQuestion(), 50);
                                }}
                                className="w-7 h-7 rounded-lg border border-rose-100 bg-rose-50 hover:bg-rose-100 hover:border-rose-200 text-rose-500 flex items-center justify-center text-sm font-bold shadow-sm transition-all cursor-pointer"
                                title="Xóa đáp án này"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {qType === QuestionType.TRUE_FALSE && (
                  <div className="space-y-3 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                    <span className="block text-[10px] font-black text-indigo-800 uppercase mb-2">Đáp án đúng cho True/False:</span>
                    <div className="flex gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setQCorrectAnsText('Đúng');
                          setTimeout(() => handlePreviewQuestion(), 50);
                        }}
                        className={`flex-1 py-4 px-6 text-sm font-bold rounded-2xl border-2 transition-all text-center flex flex-col items-center gap-1 ${
                          qCorrectAnsText.trim().toLowerCase() === 'đúng' || qCorrectAnsText.trim() === 'true'
                            ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="text-lg">✔️</span>
                        <span>ĐÚNG</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setQCorrectAnsText('Sai');
                          setTimeout(() => handlePreviewQuestion(), 50);
                        }}
                        className={`flex-1 py-4 px-6 text-sm font-bold rounded-2xl border-2 transition-all text-center flex flex-col items-center gap-1 ${
                          qCorrectAnsText.trim().toLowerCase() === 'sai' || qCorrectAnsText.trim() === 'false'
                            ? 'bg-rose-600 border-rose-600 text-white shadow-lg'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="text-lg">❌</span>
                        <span>SAI</span>
                      </button>
                    </div>
                  </div>
                )}

                {qType === QuestionType.MATCHING && (
                  <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-3xl shadow-sm">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <div>
                        <label className="block text-[11px] font-black text-indigo-700 uppercase">Cấu hình Cặp Ghép Nối</label>
                        <span className="text-[10px] text-slate-400 font-bold block">
                          Mỗi cặp gồm một vế trái và một vế phải tương ứng đúng.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newLines = [...matchingLines, { left: '', right: '' }];
                          setMatchingLines(newLines);
                          const combined = newLines.map(l => `${l.left} || ${l.right}`).join('\n');
                          setQOptionsText(combined);
                          setQCorrectAnsText(newLines.map((_, i) => i).join(','));
                        }}
                        className="text-[11px] py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-sm transition-all flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Thêm cặp ghép
                      </button>
                    </div>

                    <div className="space-y-4">
                      {matchingLines.map((line, idx) => (
                        <div key={idx} className="flex flex-col gap-3 bg-white p-4 border-2 border-slate-200 hover:border-indigo-200 rounded-2xl shadow-sm transition-colors relative group">
                          <div className="flex justify-between items-center">
                            <span className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-slate-600">{idx + 1}</div>
                              Cặp ghép
                            </span>
                            {matchingLines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newLines = matchingLines.filter((_, i) => i !== idx);
                                  setMatchingLines(newLines);
                                  const combined = newLines.map(l => `${l.left} || ${l.right}`).join('\n');
                                  setQOptionsText(combined);
                                  setQCorrectAnsText(newLines.map((_, i) => i).join(','));
                                  setTimeout(() => handlePreviewQuestion(), 50);
                                }}
                                className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Xóa
                              </button>
                            )}
                          </div>
                          <div className="flex flex-col md:flex-row items-center gap-3">
                            <div className="w-full">
                              <input
                                type="text"
                                value={line.left}
                                onChange={(e) => {
                                  const newLines = [...matchingLines];
                                  newLines[idx].left = e.target.value;
                                  setMatchingLines(newLines);
                                  const combined = newLines.map(l => `${l.left} || ${l.right}`).join('\n');
                                  setQOptionsText(combined);
                                  setQCorrectAnsText(newLines.map((_, i) => i).join(','));
                                  setTimeout(() => handlePreviewQuestion(), 50);
                                }}
                                placeholder="Vế trái (Ví dụ: CPU)"
                                className="w-full p-2.5 border-2 border-slate-100 rounded-xl text-sm font-semibold bg-slate-50 focus:bg-white focus:border-indigo-300 outline-none transition-all"
                              />
                            </div>
                            <div className="flex-shrink-0 text-slate-300 md:rotate-0 rotate-90">
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4M7 4L3 8M7 4L11 8M17 8v12M17 20l-4-4M17 20l4-4"/></svg>
                            </div>
                            <div className="w-full">
                              <input
                                type="text"
                                value={line.right}
                                onChange={(e) => {
                                  const newLines = [...matchingLines];
                                  newLines[idx].right = e.target.value;
                                  setMatchingLines(newLines);
                                  const combined = newLines.map(l => `${l.left} || ${l.right}`).join('\n');
                                  setQOptionsText(combined);
                                  setQCorrectAnsText(newLines.map((_, i) => i).join(','));
                                  setTimeout(() => handlePreviewQuestion(), 50);
                                }}
                                placeholder="Vế phải (Ví dụ: Bộ xử lý trung tâm)"
                                className="w-full p-2.5 border-2 border-slate-100 rounded-xl text-sm font-semibold bg-slate-50 focus:bg-white focus:border-emerald-300 outline-none transition-all"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {qType === QuestionType.TRUE_FALSE_MULTIPLE && (
                  <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-3xl shadow-sm">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <div>
                        <label className="block text-[11px] font-black text-indigo-700 uppercase">Cấu hình các phát biểu (True/False Multiple)</label>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                          Thêm các phát biểu và chọn Đúng/Sai cho từng phát biểu.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTfmStatements([...tfmStatements, { text: '', isTrue: true }]);
                        }}
                        className="text-[11px] py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-sm transition-all flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Thêm Phát biểu
                      </button>
                    </div>
                    <div className="space-y-3">
                      {tfmStatements.map((stmt, idx) => (
                        <div key={idx} className="flex flex-col md:flex-row gap-3 bg-white p-4 border-2 border-slate-200 hover:border-indigo-200 rounded-2xl shadow-sm transition-colors relative group">
                          <div className="flex-1">
                            <input
                              type="text"
                              value={stmt.text}
                              onChange={(e) => {
                                const newStmts = [...tfmStatements];
                                newStmts[idx].text = e.target.value;
                                setTfmStatements(newStmts);
                                setTimeout(() => handlePreviewQuestion(), 50);
                              }}
                              placeholder={`Nội dung phát biểu ${idx + 1}...`}
                              className="w-full p-2.5 border-2 border-slate-100 rounded-xl text-sm font-semibold bg-slate-50 focus:bg-white focus:border-indigo-300 outline-none transition-all"
                            />
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex gap-2">
                              <label className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 cursor-pointer transition-colors ${stmt.isTrue ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                                <input
                                  type="radio"
                                  name={`tfm_${idx}`}
                                  checked={stmt.isTrue}
                                  onChange={() => {
                                    const newStmts = [...tfmStatements];
                                    newStmts[idx].isTrue = true;
                                    setTfmStatements(newStmts);
                                    setTimeout(() => handlePreviewQuestion(), 50);
                                  }}
                                  className="hidden"
                                />
                                Đúng
                              </label>
                              <label className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 cursor-pointer transition-colors ${!stmt.isTrue ? 'bg-indigo-50 border-indigo-400 text-indigo-700 font-bold' : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'}`}>
                                <input
                                  type="radio"
                                  name={`tfm_${idx}`}
                                  checked={!stmt.isTrue}
                                  onChange={() => {
                                    const newStmts = [...tfmStatements];
                                    newStmts[idx].isTrue = false;
                                    setTfmStatements(newStmts);
                                    setTimeout(() => handlePreviewQuestion(), 50);
                                  }}
                                  className="hidden"
                                />
                                Sai
                              </label>
                            </div>
                            {tfmStatements.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newStmts = tfmStatements.filter((_, i) => i !== idx);
                                  setTfmStatements(newStmts);
                                  setTimeout(() => handlePreviewQuestion(), 50);
                                }}
                                className="text-slate-400 hover:text-rose-500 p-1.5 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {qType === QuestionType.VIDEO_BASED && (
                  <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-3xl shadow-sm">
                    <div>
                      <label className="block text-[11px] font-black text-indigo-700 uppercase mb-2">Cấu hình Video</label>
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={videoUrl}
                          onChange={(e) => setVideoUrl(e.target.value)}
                          placeholder="Video URL (YouTube, MP4...)"
                          className="w-full p-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold bg-white outline-none"
                        />
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={videoTitle}
                            onChange={(e) => setVideoTitle(e.target.value)}
                            placeholder="Tiêu đề video (Tùy chọn)"
                            className="flex-1 p-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold bg-white outline-none"
                          />
                          <input
                            type="text"
                            value={videoDuration}
                            onChange={(e) => setVideoDuration(e.target.value)}
                            placeholder="Thời lượng (vd: 2:30)"
                            className="w-1/3 p-2.5 border-2 border-slate-200 rounded-xl text-sm font-semibold bg-white outline-none"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="pt-3 border-t border-slate-200">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isVideoMrq}
                          onChange={(e) => setIsVideoMrq(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        Cho phép chọn nhiều đáp án (Multiple Response)
                      </label>
                    </div>
                    <div className="pt-2">
                      <label className="block text-[11px] font-black text-indigo-700 uppercase mb-2">Các lựa chọn đáp án</label>
                      <div className="space-y-2">
                        {mcqOpts.map((opt, idx) => {
                          const letter = String.fromCharCode(65 + idx);
                          let isSelected = false;
                          if (isVideoMrq) {
                            const selectedIndices = qCorrectAnsText.split(',').map(s => s.trim()).filter(Boolean);
                            isSelected = selectedIndices.includes(String(idx));
                          } else {
                            isSelected = qCorrectAnsText.trim() === String(idx);
                          }

                          return (
                            <div key={idx} className="flex items-center gap-2 bg-white p-2 border-2 border-slate-200 rounded-xl shadow-sm transition-colors hover:border-indigo-200 group">
                              <button
                                type="button"
                                onClick={() => {
                                  if (isVideoMrq) {
                                    let selected = qCorrectAnsText.split(',').map(s => s.trim()).filter(Boolean);
                                    if (selected.includes(String(idx))) {
                                      selected = selected.filter(s => s !== String(idx));
                                    } else {
                                      selected.push(String(idx));
                                    }
                                    setQCorrectAnsText(selected.join(','));
                                  } else {
                                    setQCorrectAnsText(String(idx));
                                  }
                                  setTimeout(() => handlePreviewQuestion(), 50);
                                }}
                                className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs transition-colors shadow-inner flex-shrink-0
                                  ${isSelected 
                                    ? 'bg-indigo-600 text-white border border-indigo-700 ring-2 ring-indigo-200' 
                                    : 'bg-slate-100 text-slate-400 border border-slate-300 group-hover:bg-slate-200'
                                  }`}
                              >
                                {letter}
                              </button>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...mcqOpts];
                                  newOpts[idx] = e.target.value;
                                  setMcqOpts(newOpts);
                                  setTimeout(() => handlePreviewQuestion(), 50);
                                }}
                                placeholder={`Lựa chọn ${letter}...`}
                                className="flex-1 p-2 border border-transparent hover:border-slate-100 focus:border-indigo-200 rounded-lg text-sm font-bold bg-transparent outline-none transition-colors"
                              />
                              {mcqOpts.length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newOpts = mcqOpts.filter((_, i) => i !== idx);
                                    setMcqOpts(newOpts);
                                    setTimeout(() => handlePreviewQuestion(), 50);
                                  }}
                                  className="text-slate-300 hover:text-rose-500 p-1.5 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMcqOpts([...mcqOpts, '']);
                        }}
                        className="mt-3 text-[10px] py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg shadow-sm transition-all flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm Đáp Án
                      </button>
                    </div>
                  </div>
                )}

                {qType === QuestionType.SEQUENCE && (
                  <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-3xl shadow-sm">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <div>
                        <label className="block text-[11px] font-black text-indigo-700 uppercase">Sắp xếp các bước theo THỰ TỰ ĐÚNG</label>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                          Nhập các bước hành động đúng theo trình tự từ trước đến sau.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newSteps = [...sequenceSteps, ''];
                          setSequenceSteps(newSteps);
                          
                          const filtered = newSteps.filter(Boolean);
                          const indexed = filtered.map((text, idx) => ({ text, originalIdx: idx }));
                          const shuffled = [...indexed].sort(() => Math.random() - 0.5);
                          setQOptionsText(shuffled.map(s => s.text).join('\n'));
                          const correctMap = indexed.map(origItem => {
                            return shuffled.findIndex(shufItem => shufItem.originalIdx === origItem.originalIdx);
                          });
                          setQCorrectAnsText(correctMap.join(','));
                        }}
                        className="text-[11px] py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow-sm transition-all flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" /> Thêm Bước
                      </button>
                    </div>

                    <div className="space-y-2">
                      {sequenceSteps.map((step, idx) => (
                        <div 
                          key={idx}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', idx.toString());
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
                            const toIdx = idx;
                            if (fromIdx === toIdx || isNaN(fromIdx)) return;

                            const newSteps = [...sequenceSteps];
                            const [movedItem] = newSteps.splice(fromIdx, 1);
                            newSteps.splice(toIdx, 0, movedItem);

                            setSequenceSteps(newSteps);
                            const filtered = newSteps.filter(Boolean);
                            const indexed = filtered.map((text, sIdx) => ({ text, originalIdx: sIdx }));
                            const shuffled = [...indexed].sort(() => Math.random() - 0.5);
                            setQOptionsText(shuffled.map(s => s.text).join('\n'));
                            const correctMap = indexed.map(origItem => {
                              return shuffled.findIndex(shufItem => shufItem.originalIdx === origItem.originalIdx);
                            });
                            setQCorrectAnsText(correctMap.join(','));
                            setTimeout(() => handlePreviewQuestion(), 50);
                          }}
                          className="flex items-center gap-3 bg-white p-3 border-2 border-slate-200 hover:border-indigo-300 rounded-2xl shadow-sm transition-colors cursor-grab active:cursor-grabbing group"
                        >
                          <div className="text-slate-400 group-hover:text-indigo-500 transition-colors">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          <span className="w-6 h-6 rounded-md bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black flex-shrink-0">
                            {idx + 1}
                          </span>
                          <input
                            type="text"
                            value={step}
                            onChange={(e) => {
                              const newSteps = [...sequenceSteps];
                              newSteps[idx] = e.target.value;
                              setSequenceSteps(newSteps);
                              
                              const filtered = newSteps.filter(Boolean);
                              const indexed = filtered.map((text, sIdx) => ({ text, originalIdx: sIdx }));
                              const shuffled = [...indexed].sort(() => Math.random() - 0.5);
                              setQOptionsText(shuffled.map(s => s.text).join('\n'));
                              const correctMap = indexed.map(origItem => {
                                return shuffled.findIndex(shufItem => shufItem.originalIdx === origItem.originalIdx);
                              });
                              setQCorrectAnsText(correctMap.join(','));
                              setTimeout(() => handlePreviewQuestion(), 50);
                            }}
                            placeholder={`Nội dung bước ${idx + 1}...`}
                            className="flex-1 p-2 border-2 border-transparent hover:border-slate-100 focus:border-indigo-200 rounded-xl text-sm font-bold bg-transparent outline-none transition-colors"
                          />
                          {sequenceSteps.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newSteps = sequenceSteps.filter((_, i) => i !== idx);
                                setSequenceSteps(newSteps);
                                
                                const filtered = newSteps.filter(Boolean);
                                const indexed = filtered.map((text, sIdx) => ({ text, originalIdx: sIdx }));
                                const shuffled = [...indexed].sort(() => Math.random() - 0.5);
                                setQOptionsText(shuffled.map(s => s.text).join('\n'));
                                const correctMap = indexed.map(origItem => {
                                  return shuffled.findIndex(shufItem => shufItem.originalIdx === origItem.originalIdx);
                                });
                                setQCorrectAnsText(correctMap.join(','));
                                setTimeout(() => handlePreviewQuestion(), 50);
                              }}
                              className="text-slate-400 hover:text-rose-500 p-1.5 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {qType === QuestionType.CATEGORIZATION && (
                  <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-3xl shadow-sm">
                    {/* Categories section */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center pb-2 border-b">
                        <label className="block text-[11px] font-black text-indigo-700 uppercase">CÁC NHÓM PHÂN LOẠI</label>
                        <button
                          type="button"
                          onClick={() => {
                            setCatCategories([...catCategories, '']);
                            setTimeout(() => handlePreviewQuestion(), 50);
                          }}
                          className="text-[9px] py-1 px-2.5 bg-indigo-600 text-white font-extrabold rounded-lg shadow-sm"
                        >
                          + Thêm Nhóm
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {catCategories.map((cat, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 bg-white p-1.5 border border-slate-200 rounded-xl">
                            <input
                              type="text"
                              value={cat}
                              onChange={(e) => {
                                const next = [...catCategories];
                                next[idx] = e.target.value;
                                setCatCategories(next);
                                setTimeout(() => handlePreviewQuestion(), 50);
                              }}
                              placeholder={`Nhóm ${idx + 1}`}
                              className="flex-1 text-xs font-bold bg-transparent outline-none p-1"
                            />
                            {catCategories.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCatCategories(catCategories.filter((_, i) => i !== idx));
                                  setTimeout(() => handlePreviewQuestion(), 50);
                                }}
                                className="text-rose-500 hover:text-rose-700 p-1 text-xs font-bold"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Items section */}
                    <div className="space-y-2 mt-4">
                      <div className="flex justify-between items-center pb-2 border-b">
                        <label className="block text-[11px] font-black text-indigo-700 uppercase">DANH SÁCH MỤC CẦN PHÂN LOẠI</label>
                        <button
                          type="button"
                          onClick={() => {
                            setCatItems([...catItems, { text: '', categoryIdx: 0 }]);
                            setTimeout(() => handlePreviewQuestion(), 50);
                          }}
                          className="text-[9px] py-1 px-2.5 bg-indigo-600 text-white font-extrabold rounded-lg shadow-sm"
                        >
                          + Thêm Mục
                        </button>
                      </div>
                      <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {catItems.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-xl">
                            <input
                              type="text"
                              value={item.text}
                              onChange={(e) => {
                                const next = [...catItems];
                                if (next[idx]) {
                                  next[idx].text = e.target.value;
                                }
                                setCatItems(next);
                                setTimeout(() => handlePreviewQuestion(), 50);
                              }}
                              placeholder="Tên mục (Ví dụ: Bàn phím...)"
                              className="flex-1 text-xs font-bold bg-transparent outline-none p-1 border-b border-transparent focus:border-indigo-400"
                            />
                            <select
                              value={item.categoryIdx}
                              onChange={(e) => {
                                const next = [...catItems];
                                if (next[idx]) {
                                  next[idx].categoryIdx = parseInt(e.target.value);
                                }
                                setCatItems(next);
                                setTimeout(() => handlePreviewQuestion(), 50);
                              }}
                              className="p-1.5 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 bg-slate-50"
                            >
                              {catCategories.map((cat, cIdx) => (
                                <option key={cIdx} value={cIdx}>
                                  {cat || `Nhóm ${cIdx + 1}`}
                                </option>
                              ))}
                            </select>
                            {catItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCatItems(catItems.filter((_, i) => i !== idx));
                                  setTimeout(() => handlePreviewQuestion(), 50);
                                }}
                                className="text-rose-500 hover:text-rose-700 p-1 text-sm"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {qType === QuestionType.HOTSPOT && (
                  <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-3xl shadow-sm">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <div>
                        <label className="block text-[11px] font-black text-indigo-700 uppercase">DANH SÁCH VÙNG CHỌN (HOTSPOTS)</label>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                          Tạo vùng click và tick chọn vùng đúng làm đáp án.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setHotspotSpots([...hotspotSpots, { label: `Vùng ${hotspotSpots.length + 1}`, x: 30, y: 30, w: 20, h: 20, isCorrect: false }]);
                          setTimeout(() => handlePreviewQuestion(), 50);
                        }}
                        className="text-[9px] py-1 px-2.5 bg-indigo-600 text-white font-extrabold rounded-lg shadow-sm"
                      >
                        + Thêm Vùng
                      </button>
                    </div>

                    {!qImage.trim() ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-2xl">
                        ⚠️ Hãy nhập URL Hình Ảnh Đính Kèm ở phía trên để vẽ và xem trước các Vùng Chọn!
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-[10px] text-indigo-600 font-extrabold block">💡 Hướng dẫn: Nhấp và kéo vùng chọn để di chuyển trực tiếp; kéo góc dưới bên phải (↘) của vùng để thu phóng kích thước!</span>
                        <div 
                          ref={hotspotEditorContainerRef}
                          className="relative border-2 border-slate-200 rounded-2xl overflow-hidden bg-slate-150 aspect-video group"
                        >
                          <img src={qImage} alt="Hotspot preview" className="w-full h-full object-contain select-none pointer-events-none" />
                          {hotspotSpots.map((spot, idx) => (
                            <div
                              key={idx}
                              style={{
                                left: `${spot.x}%`,
                                top: `${spot.y}%`,
                                width: `${spot.w}%`,
                                height: `${spot.h}%`,
                              }}
                              onMouseDown={(e) => handleSpotMouseDown(e, idx)}
                              title={`${spot.label || idx + 1} (Giữ chuột để di chuyển)`}
                              className={`absolute border-2 flex items-center justify-center text-[10px] font-black text-white cursor-move select-none rounded-lg shadow-md transition-shadow active:shadow-lg
                                ${spot.isCorrect 
                                  ? 'bg-emerald-500/25 border-emerald-500 shadow-emerald-500/20' 
                                  : 'bg-indigo-500/20 border-indigo-500'
                                }`}
                            >
                              <span className="bg-black/60 px-1 py-0.5 rounded text-[8px] font-semibold pointer-events-none">{spot.label || idx + 1}</span>
                              
                              {/* Resize Handle */}
                              <div
                                onMouseDown={(e) => handleResizeMouseDown(e, idx)}
                                title="Kéo để đổi kích thước"
                                className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-white border border-slate-400 cursor-se-resize rounded-tl flex items-center justify-center z-10 shadow-sm"
                              >
                                <span className="text-[7px] text-slate-500 font-bold">↘</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {hotspotSpots.map((spot, idx) => (
                        <div key={idx} className="bg-white p-3 border border-slate-200 rounded-2xl space-y-2 shadow-sm">
                          <div className="flex items-center justify-between gap-2 border-b pb-2">
                            <div className="flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <input
                                type="text"
                                value={spot.label}
                                onChange={(e) => {
                                  const next = [...hotspotSpots];
                                  if (next[idx]) {
                                    next[idx].label = e.target.value;
                                  }
                                  setHotspotSpots(next);
                                  setTimeout(() => handlePreviewQuestion(), 50);
                                }}
                                placeholder="Nhãn vùng (vd: CPU...)"
                                className="text-xs font-black p-1 border-b border-transparent focus:border-indigo-400 outline-none w-32"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-1 text-[10px] font-bold text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={spot.isCorrect}
                                  onChange={(e) => {
                                    const next = [...hotspotSpots];
                                    if (next[idx]) {
                                      next[idx].isCorrect = e.target.checked;
                                    }
                                    setHotspotSpots(next);
                                    setTimeout(() => handlePreviewQuestion(), 50);
                                  }}
                                  className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                />
                                Đáp án đúng
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  setHotspotSpots(hotspotSpots.filter((_, i) => i !== idx));
                                  setTimeout(() => handlePreviewQuestion(), 50);
                                }}
                                className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                              >
                                Xóa
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-4 gap-2 text-[10px]">
                            <div>
                              <span className="block font-bold text-slate-400 mb-1">X (Trái): {spot.x}%</span>
                              <input
                                type="range" min="0" max="100" value={spot.x}
                                onChange={(e) => {
                                  const next = [...hotspotSpots];
                                  if (next[idx]) {
                                    next[idx].x = parseInt(e.target.value);
                                  }
                                  setHotspotSpots(next);
                                  setTimeout(() => handlePreviewQuestion(), 50);
                                }}
                                className="w-full accent-indigo-600"
                              />
                            </div>
                            <div>
                              <span className="block font-bold text-slate-400 mb-1">Y (Trên): {spot.y}%</span>
                              <input
                                type="range" min="0" max="100" value={spot.y}
                                onChange={(e) => {
                                  const next = [...hotspotSpots];
                                  if (next[idx]) {
                                    next[idx].y = parseInt(e.target.value);
                                  }
                                  setHotspotSpots(next);
                                  setTimeout(() => handlePreviewQuestion(), 50);
                                }}
                                className="w-full accent-indigo-600"
                              />
                            </div>
                            <div>
                              <span className="block font-bold text-slate-400 mb-1">Rộng: {spot.w}%</span>
                              <input
                                type="range" min="5" max="100" value={spot.w}
                                onChange={(e) => {
                                  const next = [...hotspotSpots];
                                  if (next[idx]) {
                                    next[idx].w = parseInt(e.target.value);
                                  }
                                  setHotspotSpots(next);
                                  setTimeout(() => handlePreviewQuestion(), 50);
                                }}
                                className="w-full accent-indigo-600"
                              />
                            </div>
                            <div>
                              <span className="block font-bold text-slate-400 mb-1">Cao: {spot.h}%</span>
                              <input
                                type="range" min="5" max="100" value={spot.h}
                                onChange={(e) => {
                                  const next = [...hotspotSpots];
                                  if (next[idx]) {
                                    next[idx].h = parseInt(e.target.value);
                                  }
                                  setHotspotSpots(next);
                                  setTimeout(() => handlePreviewQuestion(), 50);
                                }}
                                className="w-full accent-indigo-600"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {qType === QuestionType.MATCH_IMAGE && (
                  <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-3xl shadow-sm">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <div>
                        <label className="block text-[11px] font-black text-indigo-700 uppercase">DANH SÁCH CẶP GHÉP ẢNH & CHỮ</label>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                          Nhập tên nhãn chữ và liên kết hình ảnh tương ứng.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setMatchImgPairs([...matchImgPairs, { text: '', imageUrl: '' }]);
                          setTimeout(() => handlePreviewQuestion(), 50);
                        }}
                        className="text-[9px] py-1 px-2.5 bg-indigo-600 text-white font-extrabold rounded-lg shadow-sm"
                      >
                        + Thêm Cặp
                      </button>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto">
                      {matchImgPairs.map((pair, idx) => (
                        <div key={idx} className="bg-white p-3 border border-slate-200 rounded-2xl flex gap-3 items-start shadow-sm group">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center mt-1">
                            {idx + 1}
                          </span>
                          <div className="flex-1 space-y-2">
                            <input
                              type="text"
                              value={pair.text}
                              onChange={(e) => {
                                const next = [...matchImgPairs];
                                if (next[idx]) {
                                  next[idx].text = e.target.value;
                                }
                                setMatchImgPairs(next);
                                setTimeout(() => handlePreviewQuestion(), 50);
                              }}
                              placeholder="Tên nhãn chữ (vd: USB Port...)"
                              className="w-full text-xs font-bold p-1.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-400"
                            />
                            <input
                              type="text"
                              value={pair.imageUrl}
                              onChange={(e) => {
                                const next = [...matchImgPairs];
                                if (next[idx]) {
                                  next[idx].imageUrl = e.target.value;
                                }
                                setMatchImgPairs(next);
                                setTimeout(() => handlePreviewQuestion(), 50);
                              }}
                              placeholder="Link hình ảnh tương ứng..."
                              className="w-full text-xs p-1.5 border border-slate-200 rounded-lg outline-none focus:border-indigo-400 font-mono text-[10px]"
                            />
                          </div>
                          <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                              {pair.imageUrl ? (
                                <img src={pair.imageUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-[9px] text-slate-400">No image</span>
                              )}
                            </div>
                            {matchImgPairs.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMatchImgPairs(matchImgPairs.filter((_, i) => i !== idx));
                                  setTimeout(() => handlePreviewQuestion(), 50);
                                }}
                                className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                              >
                                Xóa
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {qType === QuestionType.MATRIX_SELECTION && (
                  <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-3xl shadow-sm">
                    {/* Rows */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center pb-1.5 border-b">
                        <label className="block text-[11px] font-black text-indigo-700 uppercase">DANH SÁCH CÁC HÀNG (ROWS)</label>
                        <button
                          type="button"
                          onClick={() => {
                            const nextRows = [...matrixRows, ''];
                            setMatrixRows(nextRows);
                            setMatrixCorrect([...matrixCorrect, 0]);
                            setTimeout(() => handlePreviewQuestion(), 50);
                          }}
                          className="text-[9px] py-1 px-2 bg-indigo-600 text-white font-bold rounded-lg"
                        >
                          + Thêm Hàng
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto">
                        {matrixRows.map((row, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 bg-white p-1 border border-slate-200 rounded-xl">
                            <input
                              type="text"
                              value={row}
                              onChange={(e) => {
                                const next = [...matrixRows];
                                next[idx] = e.target.value;
                                setMatrixRows(next);
                                setTimeout(() => handlePreviewQuestion(), 50);
                              }}
                              placeholder={`Hàng ${idx + 1}`}
                              className="flex-1 text-xs font-bold bg-transparent outline-none p-1"
                            />
                            {matrixRows.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMatrixRows(matrixRows.filter((_, i) => i !== idx));
                                  setMatrixCorrect(matrixCorrect.filter((_, i) => i !== idx));
                                  setTimeout(() => handlePreviewQuestion(), 50);
                                }}
                                className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Columns */}
                    <div className="space-y-2 mt-3">
                      <div className="flex justify-between items-center pb-1.5 border-b">
                        <label className="block text-[11px] font-black text-indigo-700 uppercase">DANH SÁCH CÁC CỘT (COLUMNS)</label>
                        <button
                          type="button"
                          onClick={() => {
                            setMatrixCols([...matrixCols, '']);
                            setTimeout(() => handlePreviewQuestion(), 50);
                          }}
                          className="text-[9px] py-1 px-2 bg-indigo-600 text-white font-bold rounded-lg"
                        >
                          + Thêm Cột
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-2 max-h-[120px] overflow-y-auto">
                        {matrixCols.map((col, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 bg-white p-1 border border-slate-200 rounded-xl">
                            <input
                              type="text"
                              value={col}
                              onChange={(e) => {
                                const next = [...matrixCols];
                                next[idx] = e.target.value;
                                setMatrixCols(next);
                                setTimeout(() => handlePreviewQuestion(), 50);
                              }}
                              placeholder={`Cột ${idx + 1}`}
                              className="flex-1 text-xs font-bold bg-transparent outline-none p-1"
                            />
                            {matrixCols.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMatrixCols(matrixCols.filter((_, i) => i !== idx));
                                  setTimeout(() => handlePreviewQuestion(), 50);
                                }}
                                className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                              >
                                &times;
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Matrix Answers Grid */}
                    <div className="space-y-2 mt-4">
                      <label className="block text-[11px] font-black text-indigo-700 uppercase">CẤU HÌNH ĐÁP ÁN ĐÚNG</label>
                      <div className="bg-white border rounded-2xl overflow-x-auto shadow-inner p-3">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr>
                              <th className="p-2 border-b text-[10px] font-black text-slate-400">Hàng / Cột</th>
                              {matrixCols.map((col, idx) => (
                                <th key={idx} className="p-2 border-b text-[10px] font-black text-slate-600 text-center">
                                  {col || `Cột ${idx + 1}`}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {matrixRows.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-slate-50">
                                <td className="p-2 border-b text-xs font-bold text-slate-700">
                                  {row || `Hàng ${rIdx + 1}`}
                                </td>
                                {matrixCols.map((_, cIdx) => (
                                  <td key={cIdx} className="p-2 border-b text-center">
                                    <input
                                      type="radio"
                                      name={`row_ans_${rIdx}`}
                                      checked={matrixCorrect[rIdx] === cIdx}
                                      onChange={() => {
                                        const next = [...matrixCorrect];
                                        next[rIdx] = cIdx;
                                        setMatrixCorrect(next);
                                        setTimeout(() => handlePreviewQuestion(), 50);
                                      }}
                                      className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                    />
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* Fallback field - only for unsupported types if any */}
                {!['multiple_choice', 'multiple_response', 'true_false', 'matching', 'sequence', 'true_false_multiple', 'video_based', 'categorization', 'hotspot', 'match_image', 'matrix_selection'].includes(qType) && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-slate-500 uppercase">Đáp án đúng cấu hình:</label>
                    <input
                      type="text"
                      value={qCorrectAnsText}
                      onChange={(e) => setQCorrectAnsText(e.target.value)}
                      placeholder="Gõ đáp án đúng..."
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-mono outline-none"
                    />
                  </div>
                )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handlePreviewQuestion}
                    className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold rounded-xl text-xs border border-indigo-200 flex items-center justify-center gap-1 shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" /> Xem trước hiển thị học sinh
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveQuestion}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1 shadow-md"
                  >
                    Lưu câu hỏi
                  </button>
                </div>
              </div>

              {/* KHU VỰC LIVE PREVIEW TRỰC QUAN */}
              <div className="border border-slate-200/80 rounded-3xl p-6 bg-slate-50/50 flex flex-col justify-between max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2 flex-wrap gap-2">
                    <span className="text-[9px] font-black uppercase text-teal-800 bg-teal-100 px-3 py-1 rounded-full border flex items-center gap-1 w-max">
                      <Sparkles className="w-3 h-3 text-amber-500 animate-spin" /> LIVE PREVIEW
                    </span>
                    <div className="flex bg-slate-200/60 p-0.5 rounded-lg border">
                      <button
                        type="button"
                        onClick={() => setPreviewTab('student')}
                        className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${
                          previewTab === 'student' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Học Sinh Xem
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewTab('parsed');
                          // Build preview instantly
                          handlePreviewQuestion();
                        }}
                        className={`px-2 py-1 text-[9px] font-bold rounded-md transition-all ${
                          previewTab === 'parsed' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                      >
                        Cấu trúc bóc tách (AI)
                      </button>
                    </div>
                  </div>

                  {previewTab === 'parsed' ? (
                    <div className="bg-slate-900 text-slate-100 p-5 rounded-2xl font-mono text-xs space-y-4 border border-slate-800 shadow-inner">
                      <div>
                        <span className="text-slate-400 font-bold block mb-1 text-[9px] uppercase">Question:</span>
                        <p className="text-slate-200 whitespace-pre-wrap bg-slate-950 p-2.5 rounded border border-slate-800 font-bold leading-normal">
                          {qContent || '(Trống)'}
                        </p>
                      </div>

                      <div>
                        <span className="text-slate-400 font-bold block mb-1 text-[9px] uppercase">Type:</span>
                        <span className="px-2 py-0.5 bg-indigo-950 text-indigo-300 rounded border border-indigo-900 font-black text-[9px]">
                          {qType === QuestionType.MULTIPLE_CHOICE ? 'SINGLE_CHOICE' : qType.toUpperCase()}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 font-bold block mb-1 text-[9px] uppercase">Options:</span>
                        <div className="space-y-1.5 bg-slate-950 p-2.5 rounded border border-slate-800">
                          {(() => {
                            if (qType === QuestionType.TRUE_FALSE) {
                              const isTrueCorrect = qCorrectAnsText === 'Đúng' || qCorrectAnsText === 'true';
                              return (
                                <>
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-slate-500">A.</span>
                                    <span>Đúng</span>
                                    {isTrueCorrect && <span className="text-emerald-400 font-bold ml-1">✅</span>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-slate-500">B.</span>
                                    <span>Sai</span>
                                    {!isTrueCorrect && <span className="text-emerald-400 font-bold ml-1">✅</span>}
                                  </div>
                                </>
                              );
                            }

                            const opts = qOptionsText.split('\n').filter(Boolean);
                            if (opts.length === 0) return <span className="text-slate-600">(Chưa có lựa chọn)</span>;

                            return opts.map((opt, idx) => {
                              const letter = String.fromCharCode(65 + idx); // A, B, C, D
                              let isCorrect = false;

                              if (qType === QuestionType.MULTIPLE_CHOICE) {
                                isCorrect = qCorrectAnsText.trim() === String(idx);
                              } else if (qType === QuestionType.MULTIPLE_RESPONSE) {
                                const correctIndices = qCorrectAnsText.split(',').map(s => s.trim());
                                isCorrect = correctIndices.includes(String(idx));
                              } else if (qType === QuestionType.SEQUENCE) {
                                const seqCorrect = qCorrectAnsText.split(',').map(s => s.trim());
                                isCorrect = seqCorrect.includes(String(idx));
                              }

                              return (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="font-extrabold text-slate-500">{letter}.</span>
                                  <span>{opt}</span>
                                  {isCorrect && <span className="text-emerald-400 font-bold ml-1">✅</span>}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-400 font-bold block mb-1 text-[9px] uppercase">Correct Answer:</span>
                        <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-900 font-black uppercase text-[9px]">
                          {(() => {
                            if (qType === QuestionType.TRUE_FALSE) {
                              return qCorrectAnsText === 'Đúng' ? 'A (Đúng)' : 'B (Sai)';
                            }
                            if (qType === QuestionType.MULTIPLE_CHOICE) {
                              const idx = parseInt(qCorrectAnsText);
                              return isNaN(idx) ? qCorrectAnsText : String.fromCharCode(65 + idx);
                            }
                            if (qType === QuestionType.MULTIPLE_RESPONSE) {
                              return qCorrectAnsText.split(',')
                                .map(s => parseInt(s.trim()))
                                .map(idx => isNaN(idx) ? '' : String.fromCharCode(65 + idx))
                                .filter(Boolean)
                                .join(', ');
                            }
                            return qCorrectAnsText || '(Chưa có)';
                          })()}
                        </span>
                      </div>
                    </div>
                  ) : (
                    previewingQuestionObj ? (
                      <div className="bg-white p-5 rounded-2xl border shadow-sm">
                        <QuestionRenderer
                          question={previewingQuestionObj}
                          userAnswer={null}
                          onChangeAnswer={() => {}}
                          isSubmitted={false}
                          mode="practice"
                        />
                      </div>
                    ) : (
                      <div className="text-center py-16 space-y-3.5 text-slate-400">
                        <LayoutGrid className="w-12 h-12 text-slate-300 mx-auto animate-pulse" />
                        <div>
                          <h4 className="font-extrabold text-xs text-slate-500">Chưa có gì để xem trước!</h4>
                          <p className="text-[10px] text-slate-400 mt-1">Hãy nhấp vào nút &quot;Xem trước hiển thị học sinh&quot; bên trái để kiểm tra bố cục hiển thị trực quan.</p>
                        </div>
                      </div>
                    )
                  )}
                </div>

                <p className="text-[9px] text-slate-400 font-bold text-center mt-6">
                  * Trình xem trước sẽ tự động biên dịch và tạo lập giao diện tương tác học tập của học sinh.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORT CÂU HỎI BẰNG AI INTERACTIVE */}
      {showAiImportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto" id="ai_import_modal">
          <div className="bg-slate-50 rounded-3xl p-6 md:p-8 max-w-6xl w-full border border-slate-100 shadow-2xl relative my-8 flex flex-col max-h-[90vh]">
            <button
              onClick={() => setShowAiImportModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full border bg-white hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center text-lg font-bold shadow-sm z-10"
            >
              ×
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-lg leading-none">
                  AI Import Question (Nhập Câu Hỏi IC3 Tự Động)
                </h3>
                <p className="text-[10px] text-slate-400 font-bold mt-1">
                  Phân tích câu hỏi tự động từ Word, PDF, Google Docs bằng mô hình Gemini 3.5 Flash
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 overflow-hidden flex-1">
              {/* PHÂN TRÁI: DÁN NỘI DUNG VÀ NHẬN DIỆN */}
              <div className="lg:col-span-5 flex flex-col gap-4 overflow-y-auto pr-1">
                <div className="bg-white rounded-2xl border p-4 shadow-sm space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Gán vào bộ đề mục tiêu *</label>
                    <select
                      value={aiTargetTestCode}
                      onChange={(e) => setAiTargetTestCode(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-xl text-xs font-bold bg-slate-50"
                    >
                      {tests.map(t => (
                        <option key={t.id} value={t.code}>{t.code} - {t.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Dán nội dung câu hỏi IC3 vào đây *</label>
                      <button 
                        type="button"
                        onClick={() => {
                          setAiRawText(`Bạn cần lưu danh sách các trang web để có thể dễ dàng quay trở lại vào lần sau. Bạn nên sử dụng tính năng nào của trình duyệt web?
a. Duyệt đa trang một lúc
b. Lịch sử hoặc dòng thời gian
c. Mục yêu thích hoặc dấu trang (Correct)
d. Hộp địa chỉ

Hãy nhấp vào biểu tượng Save trên thanh công cụ.`);
                        }}
                        className="text-[9px] text-indigo-600 hover:underline font-bold"
                      >
                        Dán văn bản mẫu
                      </button>
                    </div>
                    <textarea
                      value={aiRawText}
                      onChange={(e) => setAiRawText(e.target.value)}
                      placeholder="Dán văn bản câu hỏi từ đề thi của bạn vào đây..."
                      className="w-full h-[250px] p-3 border border-slate-200 rounded-xl text-xs bg-slate-50 font-medium outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAiAnalyze}
                    disabled={isAiLoading || !aiRawText.trim()}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:from-slate-200 disabled:to-slate-200 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
                  >
                    {isAiLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> Đang phân tích dữ liệu...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 animate-pulse" /> Phân Tích Bằng AI ✨
                      </>
                    )}
                  </button>
                </div>

                {isAiLoading && (
                  <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-2.5 animate-pulse">
                    <div className="flex items-center gap-1.5 text-xs text-indigo-800 font-extrabold">
                      💡 Mẹo Ghi Nhớ:
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold leading-relaxed">
                      AI đang tiến hành bóc tách nội dung, nhận diện dạng câu hỏi (Trắc nghiệm, Nối cột, Kéo thả, Hotspot...) và sinh lời giải thích chi tiết cùng mẹo ghi nhớ cho bạn đấy!
                    </p>
                  </div>
                )}
              </div>

              {/* PHÂN PHẢI: KẾT QUẢ PHÂN TÍCH VÀ PREVIEW CHỈNH SỬA */}
              <div className="lg:col-span-7 flex flex-col gap-4 overflow-hidden">
                {parsedQuestions.length > 0 ? (
                  <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-2xl border shadow-sm">
                    {/* Header kết quả */}
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                      <span className="text-xs font-black text-slate-700">
                        ĐÃ PHÂN TÍCH ({parsedQuestions.length} CÂU HỎI)
                      </span>
                      <button
                        type="button"
                        onClick={handleSaveAllAiQuestions}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1 shadow"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Lưu Tất Cả Vào Hệ Thống
                      </button>
                    </div>

                    {/* Chia cột dọc: Danh sách câu hỏi bên trái, Active preview bên phải */}
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
                      {/* Cột 1: Danh sách câu hỏi nhỏ */}
                      <div className="md:col-span-5 border-r overflow-y-auto divide-y divide-slate-100 max-h-[45vh] md:max-h-full">
                        {parsedQuestions.map((q, idx) => {
                          const isSelected = selectedPreviewParsedIdx === idx;
                          // Kiểm tra lỗi/warning
                          const hasWarning = q.correctAnswer === null || q.correctAnswer === undefined || (q.type === QuestionType.MULTIPLE_CHOICE && (!q.options || q.options.length < 2));
                          
                          return (
                            <div
                              key={q.id}
                              onClick={() => {
                                if (editingParsedIdx === null) {
                                  setSelectedPreviewParsedIdx(idx);
                                }
                              }}
                              className={`p-3 text-left cursor-pointer transition-colors relative ${
                                isSelected ? 'bg-indigo-50/50 border-l-4 border-indigo-600' : 'hover:bg-slate-50/50'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1 mb-1">
                                <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                                  Câu {idx + 1}
                                </span>
                                <div className="flex gap-1 items-center">
                                  {hasWarning && (
                                    <span className="text-[9px] font-bold px-1 bg-amber-100 text-amber-700 rounded" title="Thiếu đáp án đúng hoặc options">
                                      ⚠️ Lỗi
                                    </span>
                                  )}
                                  <span className="text-[8px] font-bold text-slate-500 bg-slate-100 px-1 py-0.5 rounded">
                                    {q.type}
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs font-bold text-slate-700 line-clamp-2 leading-tight">
                                {q.content}
                              </p>

                              {/* Hành động */}
                              <div className="flex justify-end gap-1.5 mt-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditParsedQuestion(idx);
                                  }}
                                  className="text-[9px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                                >
                                  Sửa
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteParsedQuestion(idx);
                                  }}
                                  className="text-[9px] font-bold text-rose-600 hover:underline flex items-center gap-0.5"
                                >
                                  Xóa
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Cột 2: Form chỉnh sửa nháp hoặc Live simulation */}
                      <div className="md:col-span-7 p-4 overflow-y-auto max-h-[45vh] md:max-h-full bg-slate-50/30">
                        {editingParsedIdx !== null && draftParsedQuestion ? (
                          // FORM SỬA NHÁP
                          <div className="space-y-3.5 bg-white p-4 rounded-xl border">
                            <h4 className="text-xs font-black text-slate-800 border-b pb-1.5 flex justify-between items-center">
                              <span>Chỉnh Sửa Câu Hỏi {editingParsedIdx + 1}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase">{draftParsedQuestion.type}</span>
                            </h4>

                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Nội dung đề bài</label>
                              <textarea
                                value={draftParsedQuestion.content}
                                onChange={(e) => setDraftParsedQuestion({ ...draftParsedQuestion, content: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs font-bold bg-slate-50"
                                rows={2}
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Miền kiến thức</label>
                              <select
                                value={draftParsedQuestion.category}
                                onChange={(e) => setDraftParsedQuestion({ ...draftParsedQuestion, category: e.target.value as any })}
                                className="w-full p-2 border rounded-lg text-xs font-bold bg-slate-50"
                              >
                                <option value={IC3Category.COMPUTING_FUNDAMENTALS}>{IC3Category.COMPUTING_FUNDAMENTALS}</option>
                                <option value={IC3Category.KEY_APPLICATIONS}>{IC3Category.KEY_APPLICATIONS}</option>
                                <option value={IC3Category.LIVING_ONLINE}>{IC3Category.LIVING_ONLINE}</option>
                              </select>
                            </div>

                            {/* CẤU HÌNH LỰA CHỌN MẢNG ĐỐI VỚI MCQ/MR/SEQUENCE */}
                            {(draftParsedQuestion.type === QuestionType.MULTIPLE_CHOICE || 
                              draftParsedQuestion.type === QuestionType.MULTIPLE_RESPONSE || 
                              draftParsedQuestion.type === QuestionType.SEQUENCE) && Array.isArray(draftParsedQuestion.options) && (
                              <div>
                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Các lựa chọn (Mỗi lựa chọn 1 dòng)</label>
                                <textarea
                                  value={draftParsedQuestion.options.join('\n')}
                                  onChange={(e) => setDraftParsedQuestion({ 
                                    ...draftParsedQuestion, 
                                    options: e.target.value.split('\n').map(o => o.trim()).filter(o => o) 
                                  })}
                                  className="w-full p-2 border rounded-lg text-xs font-mono bg-slate-50"
                                  rows={3}
                                />
                              </div>
                            )}

                            {/* CẤU HÌNH ĐÁP ÁN ĐÚNG THÔNG THƯỜNG */}
                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Đáp án đúng</label>
                              <input
                                type="text"
                                value={
                                  Array.isArray(draftParsedQuestion.correctAnswer) 
                                    ? draftParsedQuestion.correctAnswer.join(',') 
                                    : draftParsedQuestion.correctAnswer?.toString() || ''
                                }
                                onChange={(e) => {
                                  const val = e.target.value;
                                  let finalAns: any = val;
                                  if (draftParsedQuestion.type === QuestionType.MULTIPLE_CHOICE) {
                                    finalAns = parseInt(val);
                                  } else if (draftParsedQuestion.type === QuestionType.MULTIPLE_RESPONSE || draftParsedQuestion.type === QuestionType.SEQUENCE) {
                                    finalAns = val.split(',').map(n => parseInt(n.trim()));
                                  } else if (draftParsedQuestion.type === QuestionType.TRUE_FALSE) {
                                    finalAns = val.toLowerCase() === 'đúng' || val === 'true';
                                  }
                                  setDraftParsedQuestion({ ...draftParsedQuestion, correctAnswer: finalAns });
                                }}
                                placeholder="Nhập chỉ số hoặc từ khóa đáp án..."
                                className="w-full p-2 border rounded-lg text-xs font-mono bg-slate-50"
                              />
                              <span className="text-[8px] text-slate-400 font-bold mt-0.5 block">
                                MCQ: 0-indexed index (0,1,2...). MR/Sequence: mảng index (0,2). True/False: Đúng/Sai.
                              </span>
                            </div>

                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Hình ảnh minh họa URL</label>
                              <input
                                type="text"
                                value={draftParsedQuestion.imageUrl || ''}
                                onChange={(e) => setDraftParsedQuestion({ ...draftParsedQuestion, imageUrl: e.target.value })}
                                placeholder="Để trống nếu không dùng"
                                className="w-full p-2 border rounded-lg text-xs bg-slate-50 font-medium"
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Giải thích chi tiết</label>
                              <textarea
                                value={draftParsedQuestion.explanation}
                                onChange={(e) => setDraftParsedQuestion({ ...draftParsedQuestion, explanation: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs bg-slate-50"
                                rows={2}
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Mẹo học nhanh</label>
                              <input
                                type="text"
                                value={draftParsedQuestion.tip}
                                onChange={(e) => setDraftParsedQuestion({ ...draftParsedQuestion, tip: e.target.value })}
                                className="w-full p-2 border rounded-lg text-xs bg-slate-50 font-semibold"
                              />
                            </div>

                            <div className="flex gap-2 justify-end pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingParsedIdx(null);
                                  setDraftParsedQuestion(null);
                                }}
                                className="px-3 py-1.5 border rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                              >
                                Hủy bỏ
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveParsedDraft}
                                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs"
                              >
                                Cập nhật nháp
                              </button>
                            </div>
                          </div>
                        ) : (
                          // LIVE INTERACTIVE PLAYER / PREVIEW
                          <div className="space-y-4">
                            <div className="flex items-center gap-1 text-[10px] uppercase font-black text-indigo-700 bg-indigo-50 border px-3 py-1.5 rounded-xl w-max">
                              <Eye className="w-3.5 h-3.5 animate-pulse" /> Trình Chơi Thử / Kiểm Tra Câu Hỏi
                            </div>

                            {parsedQuestions[selectedPreviewParsedIdx] ? (
                              <div className="bg-white p-5 rounded-2xl border shadow-sm">
                                <QuestionRenderer
                                  question={parsedQuestions[selectedPreviewParsedIdx]}
                                  userAnswer={null}
                                  onChangeAnswer={() => {}}
                                  isSubmitted={false}
                                  mode="practice"
                                />

                                <div className="border-t border-dashed mt-5 pt-4 space-y-2 text-left">
                                  <p className="text-xs text-slate-700 font-extrabold leading-snug">
                                    🎯 <span className="text-emerald-700">Đáp án đúng:</span>{' '}
                                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                      {typeof parsedQuestions[selectedPreviewParsedIdx].correctAnswer === 'object'
                                        ? JSON.stringify(parsedQuestions[selectedPreviewParsedIdx].correctAnswer)
                                        : parsedQuestions[selectedPreviewParsedIdx].correctAnswer?.toString()}
                                    </span>
                                  </p>
                                  <p className="text-[11px] text-slate-500 leading-relaxed">
                                    💡 <strong>Giải thích:</strong> {parsedQuestions[selectedPreviewParsedIdx].explanation}
                                  </p>
                                  <p className="text-[11px] text-amber-600 italic font-bold">
                                    💡 <strong>Mẹo ghi nhớ:</strong> {parsedQuestions[selectedPreviewParsedIdx].tip}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 font-bold py-12 text-center">
                                Chọn một câu hỏi từ danh sách bên trái để thử tương tác.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col justify-center items-center p-8 text-center bg-slate-50/50">
                    <Sparkles className="w-12 h-12 text-slate-300 animate-pulse mb-3" />
                    <h4 className="font-extrabold text-xs text-slate-500">Chưa có dữ liệu xem trước</h4>
                    <p className="text-[10px] text-slate-400 max-w-xs mt-1 leading-normal">
                      Hãy dán văn bản thô đề thi của bạn ở khung bên trái rồi bấm nút &quot;Phân Tích Bằng AI&quot;. AI sẽ giải mã toàn bộ câu hỏi và hiện danh sách tại đây.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-sm w-full border border-slate-100 shadow-2xl relative animate-scaleIn">
            <h4 className="font-black text-slate-800 text-base mb-3 border-b pb-2 flex items-center gap-2">
              ⚠️ {confirmModal.title}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed font-semibold mb-6">
              {confirmModal.message}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 text-xs font-extrabold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow shadow-rose-200 cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
