import React, { useState, useEffect, useRef } from 'react';
import { Test, Question, getQuestions, getStudents, saveStudents, TestResult, getTestResults, saveTestResults, BADGES, Badge, getTests } from '../lib/db';
import { fetchQuestionsFromGoogleSheet, saveResultToGoogleSheet, updateStudentInGoogleSheet } from '../lib/sheets';
import { motion, AnimatePresence } from 'motion/react';
import QuestionRenderer from './QuestionRenderer';
import Mascot from './Mascots';
import { Clock, ArrowLeft, ArrowRight, HelpCircle, Send, Award, CheckCircle2, XCircle, ChevronLeft, RefreshCw, Star, Sparkles } from 'lucide-react';

interface ExamRoomProps {
  test: Test;
  studentId: string;
  mode: 'practice' | 'exam';
  onBackToDashboard: () => void;
}

export default function ExamRoom({ test, studentId, mode, onBackToDashboard }: ExamRoomProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadQuestions() {
      setIsLoading(true);
      try {
        const sheetName = (test as any).sheetName || test.code;
        const fetched = await fetchQuestionsFromGoogleSheet(sheetName, test.code);
        if (fetched && fetched.length > 0) {
          setQuestions(fetched);
        } else {
          // Fallback to local questions if sheet fetching returns empty
          const fallback = getQuestions().filter(q => q.testId === test.code);
          setQuestions(fallback);
        }
      } catch (err) {
        console.warn('Error loading questions from Google Sheets:', err);
        const fallback = getQuestions().filter(q => q.testId === test.code);
        setQuestions(fallback);
      } finally {
        setIsLoading(false);
      }
    }
    loadQuestions();
  }, [test]);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<{ [qId: string]: any }>({});

  
  // Trạng thái nộp bài và xem kết quả
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0); // tính bằng giây
  const [timeLeft, setLeftTime] = useState(test.timeLimit * 60); // tính bằng giây
  const [unlockedBadges, setUnlockedBadges] = useState<Badge[]>([]);

  // Tự động lưu tiến độ làm bài (Tránh mất kết nối/reload)
  const saveKey = `ic3_session_${studentId}_${test.code}_${mode}`;

  // Xác minh tính chính xác của một câu trả lời
  const checkAnswerCorrectness = (q: Question, uAns: any) => {
    if (uAns === undefined || uAns === null) return false;

    if (q.type === 'multiple_choice' || q.type === 'image_based' || q.type === 'scenario') {
      return uAns === q.correctAnswer;
    }
    if (q.type === 'true_false') {
      return uAns === q.correctAnswer;
    }
    if (q.type === 'multiple_response') {
      const uArr = Array.isArray(uAns) ? uAns : [];
      const cArr = Array.isArray(q.correctAnswer) ? q.correctAnswer : [];
      if (uArr.length !== cArr.length) return false;
      return uArr.every((v: number) => cArr.includes(v));
    }
    if (q.type === 'fill_blank') {
      const cleanUser = uAns.toString().trim().toLowerCase();
      const possibleAnswers: string[] = Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer];
      return possibleAnswers.some((ans: string) => ans.trim().toLowerCase() === cleanUser);
    }
    if (q.type === 'matching' || q.type === 'sequence') {
      return JSON.stringify(uAns) === JSON.stringify(q.correctAnswer);
    }
    if (q.type === 'drag_drop' || q.type === 'dropdown') {
      return JSON.stringify(uAns) === JSON.stringify(q.correctAnswer);
    }
    return false;
  };

  // XỬ LÝ ĐIỂM SỐ, LƯU DỮ LIỆU & HUY HIỆU
  const processResults = (finalTimeSpent: number) => {
    let correct = 0;
    const answersList: any[] = [];

    questions.forEach(q => {
      const uAns = userAnswers[q.id];
      const isCorrect = checkAnswerCorrectness(q, uAns);
      if (isCorrect) correct++;

      answersList.push({
        questionId: q.id,
        userAnswer: uAns || null,
        isCorrect
      });
    });

    const score = Math.round((correct / questions.length) * 100);

    // Lấy dữ liệu học sinh hiện tại
    const students = getStudents();
    const studentIdx = students.findIndex(s => s.id === studentId);
    if (studentIdx === -1) return;

    const student = students[studentIdx];

    // Tạo bản ghi TestResult mới
    const newResult: TestResult = {
      id: `res_${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      studentClass: student.class,
      level: test.level,
      testCode: test.code,
      testTitle: test.title,
      date: new Date().toISOString(),
      score,
      timeSpent: finalTimeSpent,
      totalQuestions: questions.length,
      correctCount: correct,
      incorrectCount: questions.length - correct,
      categoryAnalysis: {
        computingFundamentals: test.level === 1 || test.level === 3 ? score : 0,
        keyApplications: test.level === 2 ? score : 0,
        livingOnline: test.level === 2 ? score : 0,
      },
      answers: answersList,
    };

    // Lưu kết quả thi vào kho kết quả
    const allResults = getTestResults();
    allResults.push(newResult);
    saveTestResults(allResults);

    // CẬP NHẬT THÀNH TÍCH HỌC SINH
    // Cập nhật danh sách đề đã làm
    if (!student.completedTests.includes(test.code)) {
      student.completedTests.push(test.code);
    }

    // Tính toán lại điểm trung bình
    const sResults = allResults.filter(r => r.studentId === student.id);
    const sumScores = sResults.reduce((acc, r) => acc + r.score, 0);
    student.averageScore = Math.round(sumScores / sResults.length);

    // Cập nhật số câu trả lời đúng/tổng
    student.totalQuestionsSolved += questions.length;
    student.correctQuestionsSolved += correct;

    // KIỂM TRA ĐIỀU KIỆN MỞ KHÓA HUY HIỆU (BADGES)
    const newUnlocked: Badge[] = [];

    // Badge 1: Tân Binh Công Nghệ - Đề đầu tiên đạt trên 50 điểm
    if (!student.badges.includes('badge_1') && score >= 50) {
      const b = BADGES.find(item => item.id === 'badge_1');
      if (b) {
        student.badges.push('badge_1');
        newUnlocked.push(b);
      }
    }

    // Badge 2: Thợ Săn Điểm Cao - Đạt điểm tuyệt đối 100/100 ở chế độ Exam
    if (!student.badges.includes('badge_2') && score === 100 && mode === 'exam') {
      const b = BADGES.find(item => item.id === 'badge_2');
      if (b) {
        student.badges.push('badge_2');
        newUnlocked.push(b);
      }
    }

    // Badge 4: Siêu Tốc - Hoàn thành kiểm tra dưới 5 phút (300s) đạt tối thiểu 80 điểm
    if (!student.badges.includes('badge_4') && finalTimeSpent < 300 && score >= 80 && mode === 'exam') {
      const b = BADGES.find(item => item.id === 'badge_4');
      if (b) {
        student.badges.push('badge_4');
        newUnlocked.push(b);
      }
    }

    // Badge 3: Bậc Thầy IC3 - Hoàn thành tất cả các đề của 1 Level
    if (!student.badges.includes('badge_3')) {
      const levelTests = getTests().filter(t => t.level === test.level);
      const isAllDone = levelTests.every(t => student.completedTests.includes(t.code));
      if (isAllDone) {
        const b = BADGES.find(item => item.id === 'badge_3');
        if (b) {
          student.badges.push('badge_3');
          newUnlocked.push(b);
        }
      }
    }

    // Badge 5: Não Bộ Số - Đạt tỷ lệ trả lời trung bình trên 90% sau tối thiểu 5 đề thi
    if (!student.badges.includes('badge_5') && student.completedTests.length >= 5 && student.averageScore >= 90) {
      const b = BADGES.find(item => item.id === 'badge_5');
      if (b) {
        student.badges.push('badge_5');
        newUnlocked.push(b);
      }
    }

    // Cập nhật cấp độ học của học sinh nếu hoàn thành xuất sắc level cũ
    const level1Tests = getTests().filter(t => t.level === 1);
    const completedLevel1Count = level1Tests.filter(t => student.completedTests.includes(t.code)).length;
    const l1DonePercent = (completedLevel1Count / level1Tests.length) * 100;

    const level2Tests = getTests().filter(t => t.level === 2);
    const completedLevel2Count = level2Tests.filter(t => student.completedTests.includes(t.code)).length;
    const l2DonePercent = (completedLevel2Count / level2Tests.length) * 100;

    if (student.currentLevel === 1 && l1DonePercent >= 100) {
      student.currentLevel = 2;
    } else if (student.currentLevel === 2 && l2DonePercent >= 100) {
      student.currentLevel = 3;
    }

    setUnlockedBadges(newUnlocked);

    // Lưu danh sách học sinh đã cập nhật vào LocalStorage
    students[studentIdx] = student;
    saveStudents(students);

    // Đồng bộ kết quả và thông tin học sinh lên Google Sheet
    try {
      saveResultToGoogleSheet(newResult);
      updateStudentInGoogleSheet({
        student_id: student.id,
        fullname: student.name,
        school: student.school || '',
        class: student.class,
        level: `LV${student.currentLevel}`,
        status: 'active'
      });
    } catch (e) {
      console.warn('Lỗi đồng bộ kết quả thi lên Google Sheet:', e);
    }

    // Xóa phiên làm bài cũ lưu tạm để bắt đầu mới lần sau
    localStorage.removeItem(saveKey);
  };

  // Tự động nộp bài khi hết giờ
  const handleAutoSubmitDirect = () => {
    setIsSubmitted(true);
    processResults(test.timeLimit * 60);
  };

  // Nộp bài chủ động
  const handleActiveSubmit = () => {
    const totalQuestions = questions.length;
    const answeredCount = Object.keys(userAnswers).length;

    if (answeredCount < totalQuestions && mode === 'exam') {
      const confirmSubmit = window.confirm(`Cảnh báo: Bạn mới làm được ${answeredCount} / ${totalQuestions} câu. Bạn có chắc chắn muốn nộp bài sớm không?`);
      if (!confirmSubmit) return;
    }

    setIsSubmitted(true);
    processResults(timeSpent);
  };

  // Tải câu hỏi và kiểm tra xem có phiên làm bài cũ không
  useEffect(() => {
    // Thử phục hồi phiên cũ bất đồng bộ để tránh setState đồng bộ trong effect
    const savedSession = localStorage.getItem(saveKey);
    if (savedSession) {
      try {
        const { answers, savedCurrentIdx, savedTimeSpent, savedTimeLeft, savedIsSubmitted } = JSON.parse(savedSession);
        const timer = setTimeout(() => {
          setUserAnswers(answers || {});
          setCurrentIdx(savedCurrentIdx || 0);
          setTimeSpent(savedTimeSpent || 0);
          setLeftTime(savedTimeLeft !== undefined ? savedTimeLeft : test.timeLimit * 60);
          setIsSubmitted(savedIsSubmitted || false);
        }, 0);
        return () => clearTimeout(timer);
      } catch (e) {
        console.warn("Lỗi phục hồi phiên cũ: ", e);
      }
    }
  }, [test.code, test.timeLimit, saveKey]);

  // Bộ đếm thời gian
  useEffect(() => {
    if (isSubmitted) return;

    const interval = setInterval(() => {
      setTimeSpent(prev => prev + 1);
      
      if (mode === 'exam') {
        setLeftTime(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsSubmitted(true);
            processResults(test.timeLimit * 60);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isSubmitted, mode, test.timeLimit, processResults]);

  // Đồng bộ lưu phiên liên tục vào localStorage
  useEffect(() => {
    if (questions.length === 0) return;
    const sessionData = {
      answers: userAnswers,
      savedCurrentIdx: currentIdx,
      savedTimeSpent: timeSpent,
      savedTimeLeft: timeLeft,
      savedIsSubmitted: isSubmitted,
    };
    localStorage.setItem(saveKey, JSON.stringify(sessionData));
  }, [userAnswers, currentIdx, timeSpent, timeLeft, isSubmitted, questions, saveKey]);

  // Xem kết quả ngay lập tức cho từng câu (Practice Mode)
  const [checkedAnswers, setCheckedAnswers] = useState<{ [qId: string]: boolean }>({});
  
  const handleAnswerChange = (qId: string, answer: any) => {
    setUserAnswers(prev => ({
      ...prev,
      [qId]: answer
    }));
  };

  const handleCheckCurrentAnswer = () => {
    const q = questions[currentIdx];
    setCheckedAnswers(prev => ({
      ...prev,
      [q.id]: true
    }));
  };

  // Quy đổi giây sang MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-10 h-10 animate-spin text-indigo-400" />
        <p className="text-slate-400 font-bold text-sm">Đang tải ngân hàng câu hỏi IC3 GS6...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const totalQuestions = questions.length;
  const currentAnswer = userAnswers[currentQuestion.id];
  const isQuestionChecked = checkedAnswers[currentQuestion.id] || isSubmitted;

  // Mascot động phản hồi tại chỗ trong phòng luyện tập
  const getPracticeMascotMood = () => {
    if (!isQuestionChecked) return 'thinking';
    const isCorrect = checkAnswerCorrectness(currentQuestion, currentAnswer);
    return isCorrect ? 'happy' : 'sad';
  };

  const getPracticeMascotSpeech = () => {
    if (!isQuestionChecked) {
      return `Câu ${currentIdx + 1} này thuộc khối kiến thức "${currentQuestion.category}". Bạn đã chọn đáp án chưa? Hãy phân tích kỹ rồi trả lời nhé!`;
    }
    const isCorrect = checkAnswerCorrectness(currentQuestion, currentAnswer);
    return isCorrect
      ? "Tuyệt vời ông mặt trời! Bạn đã trả lời đúng câu hỏi này rồi. Đọc thêm giải thích bên dưới để củng cố nhé! 🎉"
      : "Tiếc quá, chưa chính xác mất rồi! Nhưng không sao cả, sai một câu để nhớ lâu hơn. Hãy đọc mẹo ghi nhớ bên dưới nha! 💪";
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row relative" id="exam_room_layout">
      
      {/* 1. KHÔNG GIAN LÀM BÀI CHÍNH (Bên trái/Giữa) */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* TOP BAR PHÒNG THI */}
        <header className="bg-white border-b px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDashboard}
              id="btn_back_dashboard"
              className="p-2 border rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-all flex items-center gap-1 text-xs font-bold"
            >
              <ChevronLeft className="w-4 h-4" /> Rời Phòng
            </button>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-md border">
                {mode === 'practice' ? 'Chế độ: Luyện Tập 📚' : 'Chế độ: Kiểm Tra ⚡'}
              </span>
              <h2 className="font-extrabold text-slate-800 text-sm md:text-base leading-snug mt-1">
                {test.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* ĐỒNG HỒ ĐẾM NGƯỢC (EXAM MODE) */}
            {mode === 'exam' && !isSubmitted && (
              <div className={`flex items-center gap-2 font-mono font-bold text-sm md:text-base px-3.5 py-1.5 rounded-xl border ${timeLeft < 120 ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-800'}`} id="countdown_clock">
                <Clock className="w-4.5 h-4.5" />
                <span>{formatTime(timeLeft)}</span>
              </div>
            )}
            
            {/* THỜI GIAN ĐÃ QUA (PRACTICE MODE) */}
            {mode === 'practice' && !isSubmitted && (
              <div className="flex items-center gap-2 font-mono font-bold text-xs text-slate-500 px-3 py-1 rounded-lg bg-slate-50 border">
                <span>⏱️ {formatTime(timeSpent)}</span>
              </div>
            )}

            {!isSubmitted && (
              <button
                onClick={handleActiveSubmit}
                id="btn_submit_exam"
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold text-xs md:text-sm flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                Nộp Bài <Send className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        {/* HÀNH TRÌNH PHIÊU LƯU VŨ TRỤ (Mascot Adventure Trail) */}
        {!isSubmitted && (
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 py-3.5 px-6 border-b relative overflow-hidden" id="adventure_trail">
            <div className="max-w-4xl mx-auto flex items-center justify-between relative h-10">
              {/* Đường ray */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-slate-700/60 rounded-full"></div>
              
              {/* Thước kẻ chặn */}
              {Array.from({ length: totalQuestions }).map((_, idx) => {
                const isPassed = idx < currentIdx;
                const isActive = idx === currentIdx;
                return (
                  <div
                    key={idx}
                    className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] border-2 transition-all duration-300 ${isPassed ? 'bg-indigo-600 border-indigo-500 text-white' : isActive ? 'bg-cyan-400 border-cyan-300 text-slate-900 ring-4 ring-cyan-500/30' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                  >
                    {idx + 1}
                  </div>
                );
              })}

              {/* Phi thuyền Mascot bay lượn lơ lửng bám đuổi */}
              <motion.div
                className="absolute z-20 text-2xl pointer-events-none -mt-4.5"
                animate={{
                  left: `${(currentIdx / (totalQuestions - 1 || 1)) * 94}%`,
                  y: [0, -5, 0],
                }}
                transition={{
                  left: { type: 'spring', stiffness: 50, damping: 10 },
                  y: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
                }}
                id="mascot_rocket"
              >
                {test.level === 1 ? '🤖' : test.level === 2 ? '🦊' : '🐼'}🚀
              </motion.div>
            </div>
          </div>
        )}

        {/* PHẦN HIỂN THỊ NỘI DUNG CÂU HỎI HOẶC KẾT QUẢ */}
        <div className="flex-grow p-6 md:p-8 max-w-4xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              // BẢNG CÂU HỎI ĐANG LÀM
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-3xl p-6 md:p-8 border shadow-lg space-y-6"
              >
                {/* Thông số câu */}
                <div className="flex justify-between items-center border-b pb-4">
                  <span className="font-extrabold text-slate-800 text-base">
                    CÂU HỎI {currentIdx + 1} / {totalQuestions}
                  </span>
                  
                  {mode === 'practice' && (
                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${isQuestionChecked ? (checkAnswerCorrectness(currentQuestion, currentAnswer) ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800') : 'bg-amber-100 text-amber-800'}`}>
                      {isQuestionChecked ? (checkAnswerCorrectness(currentQuestion, currentAnswer) ? '✓ Trả lời đúng' : '✘ Chưa chính xác') : '🌱 Luyện tập tự do'}
                    </span>
                  )}
                </div>

                <QuestionRenderer
                  question={currentQuestion}
                  userAnswer={currentAnswer}
                  onChangeAnswer={(ans) => handleAnswerChange(currentQuestion.id, ans)}
                  isSubmitted={isQuestionChecked}
                  mode={mode}
                  onCheckAnswer={handleCheckCurrentAnswer}
                />

                {/* KHU VỰC MASCOT ĐỒNG HÀNH LUYỆN TẬP */}
                {mode === 'practice' && (
                  <div className="mt-8 border-t pt-5">
                    <Mascot
                      type={test.level === 1 ? 'robot' : test.level === 2 ? 'fox' : 'panda'}
                      mood={getPracticeMascotMood()}
                      speechBubble={getPracticeMascotSpeech()}
                    />
                  </div>
                )}

                {/* ĐIỀU HƯỚNG CÂU HỎI */}
                <div className="flex justify-between items-center border-t pt-5 mt-8">
                  <button
                    disabled={currentIdx === 0}
                    onClick={() => setCurrentIdx(prev => prev - 1)}
                    id="btn_prev_question"
                    className="px-4.5 py-2 rounded-xl border font-bold text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent flex items-center gap-1"
                  >
                    <ArrowLeft className="w-4 h-4" /> Câu trước
                  </button>

                  <button
                    disabled={currentIdx === totalQuestions - 1}
                    onClick={() => setCurrentIdx(prev => prev + 1)}
                    id="btn_next_question"
                    className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm disabled:opacity-30 flex items-center gap-1"
                  >
                    Câu tiếp <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ) : (
              // BÁO CÁO KẾT QUẢ THI HOÀNH TRÁNG
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-8"
                id="exam_result_view"
              >
                {/* 1. CARD ĐIỂM SỐ CHÍNH */}
                <div className="bg-white rounded-3xl border shadow-xl p-6 md:p-8 text-center space-y-6 relative overflow-hidden">
                  {/* Pháo hoa/Ngôi sao bay lượn nếu điểm cao */}
                  {Math.round((questions.filter(q => checkAnswerCorrectness(q, userAnswers[q.id])).length / questions.length) * 100) >= 50 && (
                    <div className="absolute inset-0 pointer-events-none opacity-25">
                      <div className="absolute top-10 left-10 text-3xl animate-bounce">✨</div>
                      <div className="absolute top-5 right-20 text-2xl animate-ping">🎉</div>
                      <div className="absolute bottom-10 left-1/4 text-4xl animate-bounce">🎈</div>
                      <div className="absolute bottom-5 right-10 text-3xl animate-ping">🌟</div>
                    </div>
                  )}

                  {(() => {
                    const correctCount = questions.filter(q => checkAnswerCorrectness(q, userAnswers[q.id])).length;
                    const finalScore = Math.round((correctCount / questions.length) * 100);
                    const isPass = finalScore >= 50;

                    return (
                      <>
                        <div className="space-y-1">
                          <h2 className="text-2xl font-black text-slate-800">
                            HÀNH TRÌNH THI KẾT THÚC!
                          </h2>
                          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                            Đề ôn tập: {test.title}
                          </p>
                        </div>

                        {/* Vòng tròn điểm số */}
                        <div className="relative w-36 h-36 mx-auto flex items-center justify-center rounded-full bg-slate-50 border-8 border-slate-100 shadow-inner">
                          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                            <circle
                              cx="72"
                              cy="72"
                              r="64"
                              fill="transparent"
                              stroke={isPass ? '#10b981' : '#f43f5e'}
                              strokeWidth="8"
                              strokeDasharray={`${(finalScore / 100) * 401} 401`}
                              className="transition-all duration-1000"
                            />
                          </svg>
                          <div className="text-center z-10">
                            <h3 className={`text-4xl font-black ${isPass ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {finalScore}
                            </h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Điểm số</p>
                          </div>
                        </div>

                        {/* Thống kê nhanh */}
                        <div className="grid grid-cols-3 gap-3 max-w-md mx-auto pt-4 border-t">
                          <div className="text-center">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Thời gian làm</p>
                            <h4 className="text-base font-extrabold text-slate-800 mt-0.5">{formatTime(timeSpent)}</h4>
                          </div>
                          <div className="text-center border-x">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Trả lời đúng</p>
                            <h4 className="text-base font-extrabold text-emerald-600 mt-0.5">{correctCount} câu</h4>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Trả lời sai</p>
                            <h4 className="text-base font-extrabold text-rose-600 mt-0.5">{questions.length - correctCount} câu</h4>
                          </div>
                        </div>

                        {/* Mascot chúc mừng hân hoan hoặc động viên chân thành */}
                        <div className="pt-4 max-w-xl mx-auto">
                          <Mascot
                            type={test.level === 1 ? 'robot' : test.level === 2 ? 'fox' : 'panda'}
                            mood={isPass ? 'excited' : 'sad'}
                            speechBubble={
                              isPass
                                ? `Yeeee! Chúc mừng bạn đã thi đỗ xuất sắc với ${finalScore} điểm! Bạn thực sự là một chiến binh dũng mãnh trên Đảo Level ${test.level}. Thầy cô và Mascot tự hào về bạn! 🏅`
                                : `Mascot rất tiếc vì bài thi lần này chưa đạt chuẩn (dưới 50 điểm). Nhưng không sao đâu nè, hãy nhấn "Làm lại đề này" và ôn luyện nhiều lần ở Chế độ Luyện Tập để nắm vững kiến thức nhé! Mascot luôn tin bạn làm được. 💖`
                            }
                          />
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* 2. CARD NHẬN HUY HIỆU MỚI (CHỈ XUẤT HIỆN NẾU ĐƯỢC THƯỞNG) */}
                {unlockedBadges.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-600 p-6 rounded-3xl text-white border border-transparent shadow-xl flex flex-col sm:flex-row items-center gap-6"
                    id="unlocked_badges_toast"
                  >
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl animate-bounce">
                      👑
                    </div>
                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <span className="text-[9px] font-black uppercase bg-yellow-400 text-slate-900 px-2.5 py-0.5 rounded-full">
                        Mở Khóa Kỳ Tích!
                      </span>
                      <h3 className="font-extrabold text-lg">Huy hiệu danh dự mới đã mở khóa!</h3>
                      <p className="text-xs text-amber-50 font-medium">
                        Chúc mừng chiến binh! Thành tích của bạn trong bài thi này đã đạt chuẩn mở khóa các huy hiệu:
                      </p>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {unlockedBadges.map((badge) => (
                          <span key={badge.id} className="text-xs bg-white/15 px-3 py-1 rounded-xl font-bold border border-white/20">
                            {badge.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* 3. BIỂU ĐỒ BÁO CÁO PHÂN TÍCH NHÓM KIẾN THỨC */}
                <div className="bg-white rounded-3xl border shadow-md p-6 space-y-4">
                  <h3 className="font-extrabold text-slate-800 text-base md:text-lg border-b pb-3">
                    Báo cáo Phân Tích Điểm Mạnh / Điểm Yếu
                  </h3>

                  {(() => {
                    const correctCount = questions.filter(q => checkAnswerCorrectness(q, userAnswers[q.id])).length;
                    const finalScore = Math.round((correctCount / questions.length) * 100);

                    return (
                      <div className="flex flex-col md:flex-row gap-6 items-center">
                        {/* Hình tam giác rực rỡ tượng trưng */}
                        <div className="w-28 h-28 bg-indigo-50 rounded-2xl border flex items-center justify-center text-4xl">
                          {finalScore >= 90 ? '🏆' : finalScore >= 70 ? '🥈' : finalScore >= 50 ? '🥉' : '📖'}
                        </div>

                        <div className="flex-1 space-y-3.5 w-full">
                          <div>
                            <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                              <span>Sự Am Hiểu Chuẩn Kiến Thức:</span>
                              <span className="text-indigo-600">{finalScore}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                              <div className={`h-3 rounded-full ${finalScore >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${finalScore}%` }}></div>
                            </div>
                          </div>

                          <div className="text-xs text-slate-600 space-y-1.5 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <p className="font-bold text-slate-800">📌 Gợi ý bài học tiếp theo dành cho bạn:</p>
                            {finalScore === 100 ? (
                              <p>Bàn tay vàng trong làng giải đề! Bạn đã nắm vững 100% kiến thức của bộ đề này. Hãy chuyển sang đề thi mới hoặc thám hiểm Đảo cấp độ cao hơn để săn thêm huy hiệu nhé!</p>
                            ) : finalScore >= 80 ? (
                              <p>Tuyệt vời! Kiến thức của bạn cực kỳ vững vàng. Hãy xem lại những câu làm sai để ghi nhớ kỹ hơn, tránh lỗi sai nhỏ khi thi thật.</p>
                            ) : finalScore >= 50 ? (
                              <p>Bạn đã vượt qua bài thi! Tuy nhiên vẫn còn một số điểm cần lưu ý. Hãy nhấn vào danh sách câu hỏi bên dưới để xem lại giải thích đáp án của các câu làm sai.</p>
                            ) : (
                              <p>Bạn cần rèn luyện chăm chỉ hơn. Mascot khuyên bạn nên làm lại đề này ở <strong>Chế độ Luyện Tập</strong> để được xem lời giải thích chi tiết ngay lập tức cho từng câu hỏi.</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* 4. KHU VỰC XEM LẠI CHI TIẾT TỪNG CÂU HỎI ĐÃ LÀM */}
                <div className="bg-white rounded-3xl border shadow-md p-6 space-y-6">
                  <div className="border-b pb-3">
                    <h3 className="font-extrabold text-slate-800 text-base md:text-lg">
                      Chi Tiết Đáp Án Từng Câu Hỏi
                    </h3>
                    <p className="text-xs text-slate-500">Đối chiếu trực quan câu trả lời của bạn với đáp án đúng của hội đồng chấm thi.</p>
                  </div>

                  <div className="space-y-10">
                    {questions.map((q, idx) => {
                      const uAns = userAnswers[q.id];
                      const isCorrect = checkAnswerCorrectness(q, uAns);

                      return (
                        <div key={q.id} className="border-b pb-8 last:border-0 last:pb-0 space-y-4">
                          <div className="flex items-center justify-between gap-2.5">
                            <span className="text-xs font-extrabold text-slate-800">
                              CÂU HỎI {idx + 1}
                            </span>
                            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {isCorrect ? (
                                <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Trả lời Đúng (+10đ)</>
                              ) : (
                                <><XCircle className="w-3.5 h-3.5 text-rose-600" /> Chưa Đúng (0đ)</>
                              )}
                            </span>
                          </div>

                          <QuestionRenderer
                            question={q}
                            userAnswer={uAns}
                            onChangeAnswer={() => {}} // Khóa không cho thay đổi đáp án
                            isSubmitted={true} // Bắt buộc show đáp án đúng và giải thích
                            mode="practice"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* CÁC NÚT ĐIỀU HƯỚNG KẾT THÚC */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t justify-end">
                    <button
                      onClick={() => {
                        // Reset lại trạng thái để làm lại
                        setIsSubmitted(false);
                        setTimeSpent(0);
                        setLeftTime(test.timeLimit * 60);
                        setUserAnswers({});
                        setCurrentIdx(0);
                        setCheckedAnswers({});
                      }}
                      id="btn_retry_test"
                      className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-sm transition-all text-center"
                    >
                      🔄 Làm lại đề này
                    </button>
                    <button
                      onClick={onBackToDashboard}
                      id="btn_return_dashboard"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-sm transition-all text-center shadow"
                    >
                      Quay Lại Dashboard 🏝️
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* 2. BẢNG ĐIỀU KHIỂN ĐIỀU HƯỚNG BÊN HÔNG (Chỉ hiển thị khi đang làm bài) */}
      {!isSubmitted && (
        <aside className="w-full md:w-80 bg-white border-t md:border-t-0 md:border-l p-6 flex flex-col justify-between sticky bottom-0 md:h-screen md:top-0 z-10 shadow-lg">
          <div className="space-y-5">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm">BẢNG CÂU HỎI</h3>
              <p className="text-[10px] text-slate-500">Nhấp chọn trực tiếp để di chuyển nhanh tới câu hỏi tương ứng.</p>
            </div>

            {/* Grid các ô câu hỏi */}
            <div className="grid grid-cols-5 gap-2.5">
              {Array.from({ length: totalQuestions }).map((_, idx) => {
                const q = questions[idx];
                const hasAnswer = userAnswers[q.id] !== undefined && userAnswers[q.id] !== null && (!Array.isArray(userAnswers[q.id]) || userAnswers[q.id].length > 0);
                const isCurrent = idx === currentIdx;

                let btnClass = 'border-slate-200 hover:border-slate-400 text-slate-600 bg-white';
                if (hasAnswer) {
                  btnClass = 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold';
                }
                if (isCurrent) {
                  btnClass = 'bg-indigo-600 border-indigo-600 text-white font-black scale-[1.05] ring-2 ring-indigo-300';
                }

                return (
                  <button
                    key={idx}
                    id={`btn_nav_q_${idx}`}
                    onClick={() => setCurrentIdx(idx)}
                    className={`w-full aspect-square rounded-xl border-2 text-xs md:text-sm font-semibold transition-all flex items-center justify-center ${btnClass}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Ghi chú ký hiệu */}
            <div className="pt-4 border-t space-y-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-white border-2 border-slate-200 rounded-md"></span>
                <span>Chưa trả lời</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-indigo-50 border-2 border-indigo-500 rounded-md"></span>
                <span>Đã trả lời</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-indigo-600 border-2 border-indigo-600 rounded-md"></span>
                <span>Đang làm hiện tại</span>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t pt-4 space-y-3.5">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/50 flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-xl">
                {test.level === 1 ? '🤖' : test.level === 2 ? '🦊' : '🐼'}
              </div>
              <div className="overflow-hidden">
                <h4 className="font-extrabold text-xs text-slate-800 truncate">Sát cánh thám hiểm!</h4>
                <p className="text-[10px] text-slate-500 leading-tight">Mascot đang đồng hành và hỗ trợ bạn đắc lực.</p>
              </div>
            </div>

            <button
              onClick={handleActiveSubmit}
              id="btn_nav_submit_bottom"
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex justify-center items-center gap-1.5 transition-all shadow active:scale-[0.98]"
            >
              Nộp Bài Thi <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
