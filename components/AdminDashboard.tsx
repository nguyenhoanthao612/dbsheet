import React, { useState, useEffect } from 'react';
import {
  Student, Test, Question, TestResult, getStudents, saveStudents, getTests, saveTests,
  getQuestions, saveQuestions, getTestResults, saveTestResults, QuestionType, IC3Category, BADGES
} from '../lib/db';
import {
  updateStudentInGoogleSheet,
  updateExamInGoogleSheet,
  updateQuestionInGoogleSheet,
  saveQuestionsBatchToGoogleSheet,
  deleteRowInGoogleSheet
} from '../lib/sheets';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, BookOpen, HelpCircle, BarChart3, Plus, Edit2, Trash2, Copy, Search, Lock, Unlock,
  ShieldCheck, RefreshCw, Eye, Sparkles, CheckCircle2, ChevronRight, X, LayoutGrid, Info, ArrowLeft, Check
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
  const [hotspotCoords, setHotspotCoords] = useState<{ x: number; y: number; r: number }>({ x: 50, y: 50, r: 10 });

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
    if (!window.confirm('Cảnh báo: Bạn có chắc chắn muốn xóa tài khoản học sinh này vĩnh viễn không?')) return;
    const allStudents = getStudents();
    const studentToDelete = allStudents.find((s) => s.id === sId);
    const updated = allStudents.filter((s) => s.id !== sId);
    saveStudents(updated);
    setStudents(updated);

    if (studentToDelete) {
      deleteRowInGoogleSheet('students', 'student_id', studentToDelete.code);
    }
  };

  // Reset kết quả làm bài của học sinh (đưa điểm số, streak, lịch sử thi về 0)
  const handleResetStudentResults = (sId: string) => {
    if (!window.confirm('Xác nhận: Bạn có chắc chắn muốn reset toàn bộ điểm trung bình, lịch sử thi, số ngày streak và huy hiệu của học sinh này không?')) return;
    
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
  };


  // --- HÀNH ĐỘNG ĐỀ THI ---
  const handleOpenTestModal = (test: Test | null = null) => {
    if (test) {
      setEditingTest(test);
      setTCode(test.code);
      setTLevel(test.level);
      setTTitle(test.title);
      setTDesc(test.description);
      setTCategory(test.category);
      setTTime(test.timeLimit);
    } else {
      setEditingTest(null);
      setTCode('');
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
      const updated = allTests.map((t) => {
        if (t.id === editingTest.id) {
          return {
            ...t,
            code: tCode.trim().toUpperCase(),
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
          active: true
        });
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
    if (!window.confirm(`Xác nhận: Bạn có muốn xóa đề thi ${testCode} và tất cả các câu hỏi thuộc đề này không?`)) return;
    
    const allTests = getTests().filter((t) => t.code !== testCode);
    saveTests(allTests);
    setTests(allTests);

    const allQuestions = getQuestions().filter((q) => q.testId !== testCode);
    saveQuestions(allQuestions);
    setQuestions(allQuestions);

    deleteRowInGoogleSheet('exam_catalog', 'exam_id', testCode);
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
    const optionPrefixRegex = /^\s*([a-d1-4])\s*[\.\)-:\s]\s*/i;
    
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
    const bottomAnsMatch = text.match(/(?:answer|correct\s*answer|right\s*answer|đáp\s*án\s*đúng)\s*:\s*([a-d1-4])/i);
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
      const prefixMatch = line.match(/^\s*([a-d1-4])\s*[\.\)-:\s]\s*(.*)$/i);
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
      if (q.type === QuestionType.MULTIPLE_CHOICE || q.type === QuestionType.IMAGE_BASED || q.type === QuestionType.SCENARIO) {
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
      } else if (q.type === QuestionType.DRAG_DROP) {
        if (q.options && q.options.textWithBlanks) {
          const optText = `VĂN BẢN: ${q.options.textWithBlanks}\nLỰA CHỌN:\n${Array.isArray(q.options.items) ? q.options.items.join('\n') : ''}`;
          setQOptionsText(optText);
        }
        if (Array.isArray(q.correctAnswer)) {
          setQCorrectAnsText(q.correctAnswer.join(','));
        }
      } else if (q.type === QuestionType.DROPDOWN) {
        if (q.options && q.options.textWithDropdowns) {
          const lines = Array.isArray(q.options.dropdownOptions) 
            ? q.options.dropdownOptions.map((arr: string[]) => arr.join(', ')).join('\n')
            : '';
          const optText = `VĂN BẢN: ${q.options.textWithDropdowns}\nLỰA CHỌN:\n${lines}`;
          setQOptionsText(optText);
        }
        if (Array.isArray(q.correctAnswer)) {
          setQCorrectAnsText(q.correctAnswer.join(','));
        }
      } else if (q.type === QuestionType.FILL_BLANK) {
        setQOptionsText('');
        if (Array.isArray(q.correctAnswer)) {
          setQCorrectAnsText(q.correctAnswer.join(','));
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
      const prefixMatch = line.match(/^\s*([a-d1-4])\s*[\.\)-:\s]\s*(.*)$/i);
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
      if (q.type === QuestionType.MULTIPLE_CHOICE || q.type === QuestionType.MULTIPLE_RESPONSE || q.type === QuestionType.IMAGE_BASED || q.type === QuestionType.SCENARIO) {
        const opts = q.options || [];
        setQOptionsText(opts.join('\n'));
        const ansText = Array.isArray(q.correctAnswer) ? q.correctAnswer.join(',') : q.correctAnswer.toString();
        setQCorrectAnsText(ansText);
        
        const extendedOpts = [...opts];
        while (extendedOpts.length < 4) extendedOpts.push('');
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
      } else if (q.type === QuestionType.DRAG_DROP || q.type === QuestionType.DROPDOWN) {
        const txt = q.type === QuestionType.DRAG_DROP ? q.options?.textWithBlanks : q.options?.textWithDropdowns;
        const itemsList = q.type === QuestionType.DRAG_DROP ? q.options?.items : q.options?.dropdownOptions;
        
        let optStr = `VĂN BẢN:\n${txt}\n\nLỰA CHỌN:\n`;
        if (q.type === QuestionType.DRAG_DROP) {
          optStr += (itemsList || []).join('\n');
        } else {
          optStr += (itemsList || []).map((arr: string[]) => arr.join(', ')).join('\n');
        }

        setQOptionsText(optStr);
        setQCorrectAnsText((q.correctAnswer || []).join(','));
      } else if (q.type === QuestionType.FILL_BLANK) {
        setQOptionsText('');
        setQCorrectAnsText(Array.isArray(q.correctAnswer) ? q.correctAnswer.join(',') : q.correctAnswer.toString());
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
      } else if (q.type === QuestionType.HOTSPOT) {
        setQOptionsText('Vị trí hợp lệ');
        const corr = q.correctAnswer as { x: number; y: number; radius?: number; r?: number } || { x: 50, y: 50, radius: 10 };
        const rVal = corr.radius !== undefined ? corr.radius : (corr.r !== undefined ? corr.r : 10);
        setQCorrectAnsText(`${corr.x},${corr.y},${rVal}`);
        setHotspotCoords({ x: corr.x, y: corr.y, r: rVal });
      }
    } else {
      setEditingQuestion(null);
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
      setHotspotCoords({ x: 50, y: 50, r: 10 });
    }
    setPreviewingQuestionObj(null);
    setShowQuestionModal(true);
  };

  // Parse các trường của câu hỏi trước khi Lưu hoặc Preview
  const buildQuestionObjectFromForm = (): Question | null => {
    if (!qContent || !qTestCode) {
      return null;
    }

    let parsedOptions: any = null;
    let parsedCorrectAnswer: any = null;

    try {
      if (qType === QuestionType.MULTIPLE_CHOICE || qType === QuestionType.IMAGE_BASED || qType === QuestionType.SCENARIO) {
        parsedOptions = qOptionsText.split('\n').map((o) => o.trim()).filter((o) => o);
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
      } else if (qType === QuestionType.MULTIPLE_RESPONSE) {
        parsedOptions = qOptionsText.split('\n').map((o) => o.trim()).filter((o) => o);
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
      } else if (qType === QuestionType.TRUE_FALSE) {
        parsedOptions = ['Đúng', 'Sai'];
        parsedCorrectAnswer = qCorrectAnsText.trim().toLowerCase() === 'đúng' || qCorrectAnsText.trim() === 'true';
      } else if (qType === QuestionType.MATCHING) {
        const lines = qOptionsText.split('\n').filter((l) => l.includes('||'));
        const itemsA = lines.map((l) => l.split('||')[0].trim());
        const itemsB = lines.map((l) => l.split('||')[1].trim());
        parsedOptions = { itemsA, itemsB };
        parsedCorrectAnswer = qCorrectAnsText.split(',').map((n) => parseInt(n.trim()));
      } else if (qType === QuestionType.DRAG_DROP) {
        const sections = qOptionsText.split('LỰA CHỌN:');
        const textWithBlanks = sections[0].replace('VĂN BẢN:', '').trim();
        const items = sections[1] ? sections[1].split('\n').map((w) => w.trim()).filter((w) => w) : [];
        parsedOptions = { textWithBlanks, items };
        parsedCorrectAnswer = qCorrectAnsText.split(',').map((s) => s.trim());
      } else if (qType === QuestionType.DROPDOWN) {
        const sections = qOptionsText.split('LỰA CHỌN:');
        const textWithDropdowns = sections[0].replace('VĂN BẢN:', '').trim();
        const dropdownOptions = sections[1]
          ? sections[1].split('\n').map((line) => line.split(',').map((word) => word.trim())).filter((arr) => arr.length > 0 && arr[0] !== '')
          : [];
        parsedOptions = { textWithDropdowns, dropdownOptions };
        parsedCorrectAnswer = qCorrectAnsText.split(',').map((s) => s.trim());
      } else if (qType === QuestionType.FILL_BLANK) {
        parsedOptions = [];
        parsedCorrectAnswer = qCorrectAnsText.split(',').map((s) => s.trim());
      } else if (qType === QuestionType.SEQUENCE) {
        parsedOptions = qOptionsText.split('\n').map((o) => o.trim()).filter((o) => o);
        parsedCorrectAnswer = qCorrectAnsText.split(',').map((n) => parseInt(n.trim()));
      } else if (qType === QuestionType.HOTSPOT) {
        parsedOptions = ["Vị trí hợp lệ"];
        const parts = qCorrectAnsText.split(',').map(p => parseInt(p.trim()));
        parsedCorrectAnswer = { 
          x: parts[0] !== undefined && !isNaN(parts[0]) ? parts[0] : 50, 
          y: parts[1] !== undefined && !isNaN(parts[1]) ? parts[1] : 50, 
          radius: parts[2] !== undefined && !isNaN(parts[2]) ? parts[2] : 10 
        };
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

  const handleSaveQuestion = () => {
    const qObj = buildQuestionObjectFromForm();
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

  const handleDeleteQuestion = async (qId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa câu hỏi này không?')) return;
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
        <div className="max-w-7xl mx-auto px-6 flex overflow-x-auto">
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
                    disabled={editingTest !== null}
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
                      <option value={QuestionType.DRAG_DROP}>5. Drag and Drop</option>
                      <option value={QuestionType.FILL_BLANK}>6. Fill in the Blank</option>
                      <option value={QuestionType.DROPDOWN}>7. Dropdown Selection</option>
                      <option value={QuestionType.IMAGE_BASED}>8. Image-based</option>
                      <option value={QuestionType.SCENARIO}>9. Scenario Question</option>
                      <option value={QuestionType.SEQUENCE}>10. Sequence Ordering</option>
                      <option value={QuestionType.HOTSPOT}>11. Interactive Hotspot</option>
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
                  {qType === QuestionType.DRAG_DROP && (
                    <p>• <strong>Nội dung:</strong> Chèn <strong>[blank0]</strong>, <strong>[blank1]</strong>... vào chỗ trống.<br />• <strong>Đáp án đúng:</strong> Các từ đúng tương ứng cách nhau bằng dấu phẩy.</p>
                  )}
                  {qType === QuestionType.FILL_BLANK && (
                    <p>• <strong>Đáp án đúng:</strong> Gõ các từ khóa đúng được chấp nhận, ngăn cách nhau bằng dấu phẩy.</p>
                  )}
                  {qType === QuestionType.DROPDOWN && (
                    <p>• <strong>Nội dung:</strong> Chèn <strong>[drop0]</strong>, <strong>[drop1]</strong>... vào ô lựa chọn.<br />• <strong>Đáp án đúng:</strong> Các từ đúng tương ứng cách nhau bằng dấu phẩy.</p>
                  )}
                  {qType === QuestionType.HOTSPOT && (
                    <p>• <strong>Đáp án đúng:</strong> Bấm chuột lên ảnh demo phía dưới để xác định tọa độ vùng đúng.</p>
                  )}
                  {qType === QuestionType.SEQUENCE && (
                    <p>• <strong>Các bước:</strong> Nhập các bước theo đúng trình tự từ trước đến sau. Hệ thống sẽ tự động xáo trộn khi hiển thị.</p>
                  )}
                
                {(qType === QuestionType.MULTIPLE_CHOICE || qType === QuestionType.MULTIPLE_RESPONSE || qType === QuestionType.IMAGE_BASED || qType === QuestionType.SCENARIO) && (
                  <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-black text-indigo-700 uppercase">Cấu hình các lựa chọn trực quan</label>
                      <button
                        type="button"
                        onClick={() => {
                          const newOpts = [...mcqOpts, ''];
                          setMcqOpts(newOpts);
                          setQOptionsText(newOpts.filter(Boolean).join('\n'));
                        }}
                        className="text-[10px] py-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg shadow transition-all flex items-center gap-1"
                      >
                        + Thêm Lựa Chọn
                      </button>
                    </div>

                    <div className="space-y-2">
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
                          <div key={idx} className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-all">
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
                              className={`w-7 h-7 rounded-lg flex items-center justify-center border-2 transition-all font-black text-xs ${
                                isSelected
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow'
                                  : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-350'
                              }`}
                              title={isMultipleResponse ? "Chọn làm một trong các đáp án đúng" : "Chọn làm đáp án đúng duy nhất"}
                            >
                              {isSelected ? <Check className="w-3.5 h-3.5" /> : letter}
                            </button>

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
                                qType === QuestionType.IMAGE_BASED
                                  ? "Nhập đường dẫn ảnh hoặc mô tả..."
                                  : `Nội dung lựa chọn ${letter}...`
                              }
                              className="flex-1 p-2 border border-slate-100 rounded-lg text-xs font-bold bg-slate-50/50 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                            />

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
                                className="w-7 h-7 rounded-lg border bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center text-sm font-bold shadow-sm transition-all"
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
                  <div className="space-y-3 p-4 bg-slate-50 border border-slate-250 rounded-2xl">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-black text-indigo-700 uppercase">Cấu hình Cặp Ghép Nối (Cột A ↔ Cột B tương ứng ghép đúng)</label>
                      <button
                        type="button"
                        onClick={() => {
                          const newLines = [...matchingLines, { left: '', right: '' }];
                          setMatchingLines(newLines);
                          const combined = newLines.map(l => `${l.left} || ${l.right}`).join('\n');
                          setQOptionsText(combined);
                          setQCorrectAnsText(newLines.map((_, i) => i).join(','));
                        }}
                        className="text-[10px] py-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg shadow transition-all flex items-center gap-1"
                      >
                        + Thêm Cặp
                      </button>
                    </div>

                    <div className="space-y-2">
                      {matchingLines.map((line, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-xl shadow-sm">
                          <span className="w-5 h-5 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-500">
                            {idx + 1}
                          </span>
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
                            placeholder="Cột Trái A..."
                            className="flex-1 p-2 border border-slate-100 rounded-lg text-xs font-bold bg-slate-50 focus:bg-white outline-none"
                          />
                          <span className="text-slate-400 font-extrabold text-sm px-1">↔</span>
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
                            placeholder="Cột Phải B (đúng)..."
                            className="flex-1 p-2 border border-slate-100 rounded-lg text-xs font-bold bg-slate-50 focus:bg-white outline-none"
                          />
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
                              className="w-7 h-7 rounded-lg border bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center text-sm font-bold shadow-sm transition-all"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(qType === QuestionType.DRAG_DROP || qType === QuestionType.DROPDOWN || qType === QuestionType.FILL_BLANK) && (
                  <div className="space-y-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm">
                    <span className="block text-[10px] font-black text-indigo-700 uppercase">Cấu hình chỗ trống & Lựa chọn</span>
                    
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-[10px] leading-normal font-semibold text-indigo-800">
                      {qType === QuestionType.DRAG_DROP && (
                        <p>💡 Hãy chèn các ký tự <strong>[blank0]</strong>, <strong>[blank1]</strong>... vào nội dung đề bài phía trên để làm chỗ trống kéo thả.</p>
                      )}
                      {qType === QuestionType.DROPDOWN && (
                        <p>💡 Hãy chèn các ký tự <strong>[drop0]</strong>, <strong>[drop1]</strong>... vào nội dung đề bài phía trên để làm ô lựa chọn thả xuống.</p>
                      )}
                      {qType === QuestionType.FILL_BLANK && (
                        <p>💡 Gõ từ khóa đáp án đúng được chấp nhận bên dưới (nhiều đáp án cách nhau bằng dấu phẩy).</p>
                      )}
                    </div>

                    {qType === QuestionType.DRAG_DROP && (() => {
                      const blankMatches = Array.from(qContent.matchAll(/\[blank\d+\]/g)).map(m => m[0]);
                      const correctAnswers = qCorrectAnsText.split(',').map(s => s.trim());
                      
                      return (
                        <div className="space-y-3">
                          {blankMatches.length === 0 ? (
                            <p className="text-[10px] font-bold text-amber-600 italic">⚠️ Đề bài chưa chứa ký tự [blank0]. Hãy chèn vào nội dung đề bài phía trên!</p>
                          ) : (
                            <div className="space-y-2">
                              <span className="block text-[9px] font-bold text-slate-500 uppercase">Đáp án đúng cho từng chỗ trống:</span>
                              {blankMatches.map((blank, bIdx) => (
                                <div key={bIdx} className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-xl">
                                  <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{blank}</span>
                                  <input
                                    type="text"
                                    value={correctAnswers[bIdx] || ''}
                                    onChange={(e) => {
                                      const newAnswers = [...correctAnswers];
                                      while (newAnswers.length < blankMatches.length) newAnswers.push('');
                                      newAnswers[bIdx] = e.target.value;
                                      
                                      setQCorrectAnsText(newAnswers.slice(0, blankMatches.length).join(','));
                                      const sections = qOptionsText.split('LỰA CHỌN:');
                                      const choices = sections[1] ? sections[1].trim() : '';
                                      setQOptionsText(`VĂN BẢN:\n${qContent}\n\nLỰA CHỌN:\n${choices}`);
                                      setTimeout(() => handlePreviewQuestion(), 50);
                                    }}
                                    placeholder="Nhập chữ/từ đúng cho vị trí này..."
                                    className="flex-1 p-1.5 border border-slate-200 rounded text-xs font-bold bg-slate-50 outline-none"
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="space-y-1">
                            <label className="block text-[9px] font-black text-slate-500 uppercase">Danh sách tất cả các từ lựa chọn hiển thị (bao gồm cả đáp án đúng và gây nhiễu, mỗi từ một dòng):</label>
                            <textarea
                              value={(() => {
                                const sections = qOptionsText.split('LỰA CHỌN:');
                                return sections[1] ? sections[1].trim() : '';
                              })()}
                              onChange={(e) => {
                                setQOptionsText(`VĂN BẢN:\n${qContent}\n\nLỰA CHỌN:\n${e.target.value}`);
                                setTimeout(() => handlePreviewQuestion(), 50);
                              }}
                              placeholder="Gõ mỗi từ lựa chọn 1 dòng..."
                              rows={3}
                              className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-white font-mono outline-none"
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {qType === QuestionType.DROPDOWN && (() => {
                      const dropMatches = Array.from(qContent.matchAll(/\[drop\d+\]/g)).map(m => m[0]);
                      const correctAnswers = qCorrectAnsText.split(',').map(s => s.trim());
                      
                      const sections = qOptionsText.split('LỰA CHỌN:');
                      const choicesLines = sections[1] ? sections[1].trim().split('\n') : [];

                      return (
                        <div className="space-y-3">
                          {dropMatches.length === 0 ? (
                            <p className="text-[10px] font-bold text-amber-600 italic">⚠️ Đề bài chưa chứa ký tự [drop0]. Hãy chèn vào nội dung đề bài phía trên!</p>
                          ) : (
                            <div className="space-y-3">
                              {dropMatches.map((drop, dIdx) => (
                                <div key={dIdx} className="bg-white p-3 border border-slate-200 rounded-xl space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{drop}</span>
                                    <span className="text-[9px] font-bold text-slate-400">Dropdown số {dIdx + 1}</span>
                                  </div>
                                  
                                  <div>
                                    <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Các lựa chọn ngăn cách bởi dấu phẩy:</label>
                                    <input
                                      type="text"
                                      value={choicesLines[dIdx] || ''}
                                      onChange={(e) => {
                                        const newLines = [...choicesLines];
                                        while (newLines.length < dropMatches.length) newLines.push('');
                                        newLines[dIdx] = e.target.value;
                                        
                                        setQOptionsText(`VĂN BẢN:\n${qContent}\n\nLỰA CHỌN:\n${newLines.slice(0, dropMatches.length).join('\n')}`);
                                        setTimeout(() => handlePreviewQuestion(), 50);
                                      }}
                                      placeholder="Ví dụ: Táo, Cam, Chuối"
                                      className="w-full p-1.5 border border-slate-200 rounded text-xs font-bold bg-slate-50 outline-none"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Đáp án đúng tương ứng:</label>
                                    <input
                                      type="text"
                                      value={correctAnswers[dIdx] || ''}
                                      onChange={(e) => {
                                        const newAnswers = [...correctAnswers];
                                        while (newAnswers.length < dropMatches.length) newAnswers.push('');
                                        newAnswers[dIdx] = e.target.value;
                                        
                                        setQCorrectAnsText(newAnswers.slice(0, dropMatches.length).join(','));
                                        setQOptionsText(`VĂN BẢN:\n${qContent}\n\nLỰA CHỌN:\n${choicesLines.slice(0, dropMatches.length).join('\n')}`);
                                        setTimeout(() => handlePreviewQuestion(), 50);
                                      }}
                                      placeholder="Phải khớp hoàn toàn với một trong các lựa chọn trên..."
                                      className="w-full p-1.5 border border-slate-200 rounded text-xs font-bold bg-slate-50 outline-none"
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {qType === QuestionType.FILL_BLANK && (
                      <div className="space-y-1">
                        <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Các từ khóa đáp án đúng được chấp nhận (cách nhau bởi dấu phẩy):</label>
                        <input
                          type="text"
                          value={qCorrectAnsText}
                          onChange={(e) => {
                            setQCorrectAnsText(e.target.value);
                            setTimeout(() => handlePreviewQuestion(), 50);
                          }}
                          placeholder="Ví dụ: CPU, bộ xử lý trung tâm, vi xử lý"
                          className="w-full p-2 border border-slate-200 rounded-lg text-xs font-bold bg-white outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                {qType === QuestionType.SEQUENCE && (
                  <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm">
                    <div className="flex justify-between items-center">
                      <label className="block text-[10px] font-black text-indigo-700 uppercase">Sắp xếp các bước theo THỰ TỰ ĐÚNG</label>
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
                        className="text-[10px] py-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg shadow transition-all flex items-center gap-1"
                      >
                        + Thêm Bước
                      </button>
                    </div>
                    <p className="text-[9px] font-semibold text-indigo-800 leading-normal bg-indigo-50 p-2 rounded-lg">
                      💡 Nhập các bước hành động đúng theo trình tự từ trước đến sau. Hệ thống sẽ tự động xáo trộn ngẫu nhiên khi lưu và tính toán bộ đáp án đúng để phân tích.
                    </p>

                    <div className="space-y-2">
                      {sequenceSteps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 bg-white p-2 border border-slate-200 rounded-xl shadow-sm">
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">
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
                            className="flex-1 p-2 border border-slate-100 rounded-lg text-xs font-bold bg-slate-50 focus:bg-white outline-none"
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
                              className="w-7 h-7 rounded-lg border bg-rose-50 hover:bg-rose-100 text-rose-500 flex items-center justify-center text-sm font-bold shadow-sm transition-all"
                            >
                              &times;
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {qType === QuestionType.HOTSPOT && (
                  <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm">
                    <span className="block text-[10px] font-black text-indigo-700 uppercase">Cấu hình Hotspot trực quan</span>
                    <p className="text-[10px] text-slate-500 leading-normal font-bold">
                      ⚡ <strong>Hướng dẫn:</strong> Bấm chuột trực tiếp lên vị trí bất kỳ trên ảnh demo phía dưới để đặt làm tọa độ đáp án đúng, sau đó dùng thanh trượt để chỉnh độ rộng khu vực đúng (bán kính R).
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400">Tọa độ X (%)</label>
                        <input
                          type="number"
                          value={hotspotCoords.x}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                            const newCoords = { ...hotspotCoords, x: val };
                            setHotspotCoords(newCoords);
                            setQCorrectAnsText(`${val},${hotspotCoords.y},${hotspotCoords.r}`);
                            setTimeout(() => handlePreviewQuestion(), 50);
                          }}
                          className="w-full p-1.5 border border-slate-200 rounded text-xs font-extrabold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400">Tọa độ Y (%)</label>
                        <input
                          type="number"
                          value={hotspotCoords.y}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                            const newCoords = { ...hotspotCoords, y: val };
                            setHotspotCoords(newCoords);
                            setQCorrectAnsText(`${hotspotCoords.x},${val},${hotspotCoords.r}`);
                            setTimeout(() => handlePreviewQuestion(), 50);
                          }}
                          className="w-full p-1.5 border border-slate-200 rounded text-xs font-extrabold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400">Bán kính R (%)</label>
                        <input
                          type="number"
                          value={hotspotCoords.r}
                          onChange={(e) => {
                            const val = Math.min(50, Math.max(2, parseInt(e.target.value) || 10));
                            const newCoords = { ...hotspotCoords, r: val };
                            setHotspotCoords(newCoords);
                            setQCorrectAnsText(`${hotspotCoords.x},${hotspotCoords.y},${val}`);
                            setTimeout(() => handlePreviewQuestion(), 50);
                          }}
                          className="w-full p-1.5 border border-slate-200 rounded text-xs font-extrabold"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black text-slate-500">Bán kính:</span>
                      <input
                        type="range"
                        min="3"
                        max="30"
                        value={hotspotCoords.r}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          const newCoords = { ...hotspotCoords, r: val };
                          setHotspotCoords(newCoords);
                          setQCorrectAnsText(`${hotspotCoords.x},${hotspotCoords.y},${val}`);
                          setTimeout(() => handlePreviewQuestion(), 50);
                        }}
                        className="flex-1 accent-indigo-600 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    <div 
                      className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100 max-w-full h-auto cursor-crosshair shadow"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                        const clickY = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                        const newCoords = { ...hotspotCoords, x: clickX, y: clickY };
                        setHotspotCoords(newCoords);
                        setQCorrectAnsText(`${clickX},${clickY},${hotspotCoords.r}`);
                        setTimeout(() => handlePreviewQuestion(), 50);
                      }}
                    >
                      <img
                        src={qImage || "https://picsum.photos/seed/ic3screen/800/450"}
                        alt="Preview area"
                        className="w-full h-auto object-contain select-none pointer-events-none"
                        referrerPolicy="no-referrer"
                      />
                      <div 
                        className="absolute border-4 border-dashed border-rose-500 bg-rose-500/20 rounded-full flex items-center justify-center pointer-events-none"
                        style={{ 
                          left: `${hotspotCoords.x}%`, 
                          top: `${hotspotCoords.y}%`, 
                          width: `${hotspotCoords.r * 2}%`, 
                          height: `${hotspotCoords.r * 2}%`,
                          marginLeft: `-${hotspotCoords.r}%`,
                          marginTop: `-${hotspotCoords.r}%`
                        }}
                      >
                        <span className="text-[8px] bg-rose-600 text-white px-1 py-0.5 rounded shadow font-bold">MỤC TIÊU</span>
                      </div>
                    </div>
                  </div>
                )}

                  <input
                    type="text"
                    value={qCorrectAnsText}
                    onChange={(e) => setQCorrectAnsText(e.target.value)}
                    placeholder="Gõ đáp án đúng..."
                    className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 font-mono outline-none"
                  />
                  
                  <span className="block text-[9px] text-slate-400 font-medium mt-1">
                    {qType === QuestionType.MULTIPLE_CHOICE || qType === QuestionType.IMAGE_BASED || qType === QuestionType.SCENARIO
                      ? "* Chỉ số đáp án đúng (0 cho A, 1 cho B, 2 cho C, 3 cho D... hoặc gõ hẳn chữ/letter)"
                      : qType === QuestionType.MULTIPLE_RESPONSE
                        ? "* Các chỉ số đáp án đúng cách nhau bằng dấu phẩy (ví dụ: 0,2)"
                        : ""
                    }
                  </span>
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

                            {/* CẤU HÌNH ĐÁP ÁN ĐỐI VỚI HOTSPOT */}
                            {draftParsedQuestion.type === QuestionType.HOTSPOT && (
                              <div className="space-y-2 border-t pt-2 mt-2">
                                <label className="block text-[9px] font-bold text-slate-400 uppercase">Cấu hình tọa độ Hotspot mục tiêu</label>
                                <div className="text-[9px] text-indigo-600 font-bold bg-indigo-50 p-2 rounded">
                                  Mẹo: Click chuột trực tiếp vào đúng vị trí mong muốn trên ảnh xem trước bên dưới để tự động lấy tọa độ x, y!
                                </div>
                                <div 
                                  className="relative overflow-hidden rounded-lg border-2 border-dashed bg-slate-100 cursor-crosshair max-w-xs mx-auto"
                                  onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const clickX = Math.round(((e.clientX - rect.left) / rect.width) * 100);
                                    const clickY = Math.round(((e.clientY - rect.top) / rect.height) * 100);
                                    const curCorr = draftParsedQuestion.correctAnswer || { x: 50, y: 50, radius: 10 };
                                    setDraftParsedQuestion({
                                      ...draftParsedQuestion,
                                      correctAnswer: { ...curCorr, x: clickX, y: clickY }
                                    });
                                  }}
                                >
                                  <img 
                                    src={draftParsedQuestion.imageUrl || "https://picsum.photos/seed/ic3screen/800/450"} 
                                    className="w-full h-auto object-contain pointer-events-none select-none"
                                    alt="Hotspot preview"
                                  />
                                  {draftParsedQuestion.correctAnswer && (
                                    <div 
                                      className="absolute border-2 border-indigo-600 bg-indigo-500/30 rounded-full flex items-center justify-center pointer-events-none"
                                      style={{
                                        left: `${draftParsedQuestion.correctAnswer.x}%`,
                                        top: `${draftParsedQuestion.correctAnswer.y}%`,
                                        width: `${(draftParsedQuestion.correctAnswer.radius || 10) * 2}%`,
                                        height: `${(draftParsedQuestion.correctAnswer.radius || 10) * 2}%`,
                                        marginLeft: `-${draftParsedQuestion.correctAnswer.radius || 10}%`,
                                        marginTop: `-${draftParsedQuestion.correctAnswer.radius || 10}%`,
                                      }}
                                    />
                                  )}
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="block text-[8px] font-bold text-slate-400 uppercase">Tọa độ X (%)</label>
                                    <input 
                                      type="number" 
                                      value={draftParsedQuestion.correctAnswer?.x || 50} 
                                      onChange={(e) => setDraftParsedQuestion({
                                        ...draftParsedQuestion,
                                        correctAnswer: { ...(draftParsedQuestion.correctAnswer || { x: 50, y: 50, radius: 10 }), x: parseInt(e.target.value) }
                                      })}
                                      className="w-full p-1.5 border rounded text-xs bg-slate-50 font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[8px] font-bold text-slate-400 uppercase">Tọa độ Y (%)</label>
                                    <input 
                                      type="number" 
                                      value={draftParsedQuestion.correctAnswer?.y || 50} 
                                      onChange={(e) => setDraftParsedQuestion({
                                        ...draftParsedQuestion,
                                        correctAnswer: { ...(draftParsedQuestion.correctAnswer || { x: 50, y: 50, radius: 10 }), y: parseInt(e.target.value) }
                                      })}
                                      className="w-full p-1.5 border rounded text-xs bg-slate-50 font-bold"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[8px] font-bold text-slate-400 uppercase">Bán kính R (%)</label>
                                    <input 
                                      type="number" 
                                      value={draftParsedQuestion.correctAnswer?.radius || 10} 
                                      onChange={(e) => setDraftParsedQuestion({
                                        ...draftParsedQuestion,
                                        correctAnswer: { ...(draftParsedQuestion.correctAnswer || { x: 50, y: 50, radius: 10 }), radius: parseInt(e.target.value) }
                                      })}
                                      className="w-full p-1.5 border rounded text-xs bg-slate-50 font-bold"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}

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
                            {draftParsedQuestion.type !== QuestionType.HOTSPOT && (
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
                                    } else if (draftParsedQuestion.type === QuestionType.DRAG_DROP || draftParsedQuestion.type === QuestionType.FILL_BLANK || draftParsedQuestion.type === QuestionType.DROPDOWN) {
                                      finalAns = val.split(',').map(s => s.trim());
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
                            )}

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
    </div>
  );
}
