import React, { useState, useEffect } from 'react';
import { Student, Test, getTests, getTestResults, BADGES, TestResult } from '../lib/db';
import { motion, AnimatePresence } from 'motion/react';
import { Award, BookOpen, Clock, Trophy, Target, Zap, ShieldAlert, Sparkles, Filter, ChevronRight, LogOut, CheckCircle2, RefreshCw } from 'lucide-react';

interface StudentDashboardProps {
  student: Student;
  onLogout: () => void;
  onSelectTest: (test: Test, mode: 'practice' | 'exam' | 'race') => void;
}

export default function StudentDashboard({ student, onLogout, onSelectTest }: StudentDashboardProps) {
  const [activeTab, setActiveTab] = useState<'adventure' | 'achievements' | 'leaderboard'>('adventure');
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  
  // Trạng thái cho Leaderboard
  const [lbClassFilter, setLbClassFilter] = useState<string>('All');
  const [lbLevelFilter, setLbLevelFilter] = useState<string>('All');
  const [lbSortBy, setLbSortBy] = useState<'score' | 'streak' | 'completed'>('score');

  const allTests = getTests();
  const allResults = getTestResults();

  // Danh sách các bộ đề học sinh đã làm
  const studentResults = allResults.filter(r => r.studentId === student.id);

  // Tính toán thời gian ôn tập (giả định khoảng 5 phút rèn luyện mỗi ngày ngoài thời gian thi thực tế, cộng với thời gian làm bài thực tế)
  const totalTestTimeSpent = studentResults.reduce((acc, r) => acc + r.timeSpent, 0); // giây
  const testMinutes = Math.round(totalTestTimeSpent / 60);
  const totalStudyMinutes = (student.streak * 10) + testMinutes; // Giả lập thêm 10 phút/ngày streak

  // Thống kê đúng/sai
  const totalCorrect = student.correctQuestionsSolved;
  const totalSolved = student.totalQuestionsSolved;
  const accuracyRate = totalSolved > 0 ? Math.round((totalCorrect / totalSolved) * 100) : 0;

  // Lọc các kết quả thi cao nhất cho mỗi đề của học sinh
  const getBestScoreForTest = (testCode: string) => {
    const scores = studentResults.filter(r => r.testCode === testCode).map(r => r.score);
    return scores.length > 0 ? Math.max(...scores) : null;
  };

  // Tính % hoàn thành của từng Level
  const getLevelCompletionPercent = (level: 1 | 2 | 3) => {
    const levelTests = allTests.filter(t => t.level === level);
    if (levelTests.length === 0) return 0;
    const completedCount = levelTests.filter(t => {
      const best = getBestScoreForTest(t.code);
      return best !== null && best >= 50; // Đạt trên 50 điểm coi là hoàn thành
    }).length;
    return Math.round((completedCount / levelTests.length) * 100);
  };

  const lv1Percent = getLevelCompletionPercent(1);
  const lv2Percent = getLevelCompletionPercent(2);
  const lv3Percent = getLevelCompletionPercent(3);
  const isL2Locked = false;
  const isL3Locked = false;

  // Tính điểm trung bình các miền nội dung của học sinh
  // Các miền: Computing Fundamentals, Key Applications, Living Online
  const getCategoryStrengths = () => {
    if (studentResults.length === 0) {
      return { cf: 0, ka: 0, lo: 0 };
    }

    let cfSum = 0, cfCount = 0;
    let kaSum = 0, kaCount = 0;
    let loSum = 0, loCount = 0;

    studentResults.forEach(r => {
      if (r.categoryAnalysis.computingFundamentals > 0 || r.testCode.includes('LV1') || r.testCode.includes('LV3')) {
        cfSum += r.score;
        cfCount++;
      }
      if (r.categoryAnalysis.keyApplications > 0 || r.testCode.includes('LV2')) {
        kaSum += r.score;
        kaCount++;
      }
      if (r.categoryAnalysis.livingOnline > 0 || r.testCode.includes('LV2')) {
        loSum += r.score;
        loCount++;
      }
    });

    return {
      cf: cfCount > 0 ? Math.round(cfSum / cfCount) : 0,
      ka: kaCount > 0 ? Math.round(kaSum / kaCount) : 0,
      lo: loCount > 0 ? Math.round(loSum / loCount) : 0,
    };
  };

  const strengths = getCategoryStrengths();



  // Tạo dữ liệu cho bảng xếp hạng từ localStorage học sinh
  const getLeaderboardData = () => {
    const allStudents = JSON.parse(localStorage.getItem('ic3_students') || '[]');
    let filtered = [...allStudents];

    // Lọc theo lớp
    if (lbClassFilter !== 'All') {
      filtered = filtered.filter(s => s.class === lbClassFilter);
    }

    // Lọc theo level
    if (lbLevelFilter !== 'All') {
      filtered = filtered.filter(s => s.currentLevel === parseInt(lbLevelFilter));
    }

    // Sắp xếp
    filtered.sort((a, b) => {
      if (lbSortBy === 'score') {
        return b.averageScore - a.averageScore;
      }
      if (lbSortBy === 'streak') {
        return b.streak - a.streak;
      }
      if (lbSortBy === 'completed') {
        return b.completedTests.length - a.completedTests.length;
      }
      return 0;
    });

    return filtered;
  };

  const leaderboard = getLeaderboardData();

  // Lấy danh sách tất cả các Lớp duy nhất để làm bộ lọc
  const allClasses = Array.from(new Set(JSON.parse(localStorage.getItem('ic3_students') || '[]').map((s: any) => s.class))) as string[];

  return (
    <div className="min-h-screen bg-[#FFF9E6] text-[#2D3436] flex flex-col font-sans" id="student_dashboard">
      {/* HEADER BAR */}
      <header className="h-20 bg-white border-b-4 border-[#FDCB6E] flex items-center justify-between px-6 md:px-8 shadow-sm relative z-20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#6C5CE7] rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow-lg animate-bounce select-none">
            🚀
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-black text-[#6C5CE7] tracking-tight">
              IC3 GS6 EXPLORER
            </h1>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Lớp Học Kỹ Năng Số • Học Viện Phổ Thông
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Streak badge */}
          <div className="hidden sm:flex items-center gap-2 bg-[#E1F5FE] px-4 py-2 rounded-full border-2 border-[#03A9F4]">
            <span className="text-base select-none">🔥</span>
            <span className="text-xs font-black text-[#0288D1]">{student.streak} Ngày Liên Tiếp</span>
          </div>

          <div className="flex items-center gap-3 pl-4 border-l-2 border-slate-100">
            <div className="hidden md:flex flex-col text-right">
              <span className="font-black text-sm text-[#2D3436]">{student.name}</span>
              <span className="text-[10px] font-black text-[#00B894] px-2 py-0.5 bg-[#55EFC444] rounded self-end">
                LỚP {student.class} • LEVEL 1-2-3
              </span>
            </div>

            <div className="w-12 h-12 bg-[#FAB1A0] rounded-full border-4 border-white shadow-md overflow-hidden flex items-center justify-center text-2xl relative select-none">
              {student.avatar === 'robot' ? '🤖' : student.avatar === 'fox' ? '🦊' : '🐼'}
            </div>
          </div>

          <button
            onClick={onLogout}
            id="btn_logout"
            className="p-2.5 bg-red-50 hover:bg-red-100 text-rose-600 rounded-xl border-2 border-rose-200 transition-colors cursor-pointer"
            title="Đăng xuất"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </header>

      {/* CHỈ SỐ DASHBOARD NHANH */}
      <section className="py-6 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
          {/* Card 1 */}
          <div className="bg-[#F0F2FF] border-b-4 border-r-4 border-[#D6DAFF] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm text-[#2D3436]">
            <div className="p-3 bg-[#6C5CE7]/10 rounded-xl text-[#6C5CE7]">
              <Trophy className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Điểm Trung Bình</p>
              <h3 className="text-xl md:text-2xl font-black text-[#6C5CE7]">{student.averageScore} <span className="text-xs text-gray-500">/100</span></h3>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-[#FFF4E5] border-b-4 border-r-4 border-[#FFE0B2] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm text-[#2D3436]">
            <div className="p-3 bg-[#E67E22]/10 rounded-xl text-[#E67E22]">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Ngày Học Liên Tiếp</p>
              <h3 className="text-xl md:text-2xl font-black text-[#E67E22]">🔥 {student.streak} <span className="text-xs text-gray-500">ngày</span></h3>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-[#E1F5FE] border-b-4 border-r-4 border-[#03A9F4] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm text-[#2D3436]">
            <div className="p-3 bg-[#0288D1]/10 rounded-xl text-[#0288D1]">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Câu Đúng / Đã Giải</p>
              <h3 className="text-xl md:text-2xl font-black text-[#0288D1]">{totalCorrect} <span className="text-xs text-gray-500">/ {totalSolved}</span></h3>
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-[#FF767511] border-b-4 border-r-4 border-[#FF767533] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm text-[#2D3436]">
            <div className="p-3 bg-[#D63031]/10 rounded-xl text-[#D63031]">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black text-gray-500 tracking-wider">Thời Gian Học</p>
              <h3 className="text-xl md:text-2xl font-black text-[#D63031]">⏱️ {totalStudyMinutes} <span className="text-xs text-gray-500">phút</span></h3>
            </div>
          </div>
        </div>
      </section>



      {/* MENU CHUYỂN TABS CHÍNH */}
      <div className="border-b-4 border-slate-200 bg-white sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 flex">
          <button
            onClick={() => setActiveTab('adventure')}
            className={`py-4 px-6 text-sm font-black border-b-4 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'adventure'
                ? 'border-[#6C5CE7] text-[#6C5CE7]'
                : 'border-transparent text-slate-500 hover:text-[#2D3436]'
            }`}
            id="tab_adventure_map"
          >
            <BookOpen className="w-4 h-4" /> Bản Đồ Phiêu Lưu
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={`py-4 px-6 text-sm font-black border-b-4 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'achievements'
                ? 'border-[#6C5CE7] text-[#6C5CE7]'
                : 'border-transparent text-slate-500 hover:text-[#2D3436]'
            }`}
            id="tab_achievements"
          >
            <Award className="w-4 h-4" /> Thành Tích Cá Nhân & Kỹ Năng
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`py-4 px-6 text-sm font-black border-b-4 flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'leaderboard'
                ? 'border-[#6C5CE7] text-[#6C5CE7]'
                : 'border-transparent text-slate-500 hover:text-[#2D3436]'
            }`}
            id="tab_leaderboard"
          >
            <Trophy className="w-4 h-4" /> Bảng Xếp Hạng Toàn Trường
          </button>
        </div>
      </div>

      {/* NỘI DUNG TABS CHÍNH */}
      <main className="flex-grow py-8 px-6 max-w-7xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {/* TAP 1: BẢN ĐỒ PHIÊU LƯU (3 LEVEL) */}
          {activeTab === 'adventure' && (
            <motion.div
              key="adventure"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-12"
            >
              {/* LEVEL 1 CARD */}
              <div className="bg-white rounded-[32px] border-4 border-[#2D3436] shadow-[8px_8px_0px_0px_rgba(45,52,54,0.15)] overflow-hidden" id="level1_island">
                <div className="bg-[#00B894] border-b-4 border-[#2D3436] p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl bg-white/20 p-2.5 rounded-2xl border-2 border-white/40 select-none">🌴</span>
                    <div>
                      <h2 className="text-xl font-black flex items-center gap-2">
                        LEVEL 1: ĐẢO TÂN BINH SỐ
                        <span className="text-xs bg-[#FDCB6E] text-[#2D3436] px-2 py-0.5 rounded-full font-black border-2 border-[#2D3436]">Cơ bản</span>
                      </h2>
                      <p className="text-xs text-emerald-100 font-medium">Làm quen với cấu trúc máy tính, hệ điều hành Windows và tệp tin mở rộng.</p>
                    </div>
                  </div>

                  <div className="w-full md:w-64">
                    <div className="flex justify-between text-xs font-black mb-1">
                      <span>Đảo Hoàn Thành</span>
                      <span className="font-black">{lv1Percent}%</span>
                    </div>
                    <div className="w-full bg-[#2D3436]/25 rounded-full h-3 border border-[#2D3436]/20">
                      <div className="bg-[#FDCB6E] h-full rounded-full transition-all duration-1000 border-r-2 border-[#2D3436]" style={{ width: `${lv1Percent}%` }}></div>
                    </div>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-[#FAF9F6]">
                  {allTests.filter(t => t.level === 1).map((test) => {
                    const bestScore = getBestScoreForTest(test.code);
                    const isDone = bestScore !== null;
                    return (
                      <div
                        key={test.id}
                        id={`test_card_${test.code}`}
                        className={`border-2 border-[#2D3436] rounded-2xl p-5 hover:shadow-lg transition-all relative flex flex-col justify-between hover:-translate-y-1 ${isDone ? 'bg-[#E8F8F5] shadow-[4px_4px_0px_0px_rgba(45,52,54,0.1)]' : 'bg-white shadow-[4px_4px_0px_0px_rgba(45,52,54,0.1)]'}`}
                      >
                        {isDone && (
                          <div className="absolute top-4 right-4 bg-[#55EFC444] text-[#00B894] text-[10px] font-black px-2 py-1 rounded-full border border-[#00B894] flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#00B894]" /> Đã làm: {bestScore}/100 đ
                          </div>
                        )}

                        <div className="space-y-2">
                          <span className="text-[10px] font-black text-[#00B894] uppercase bg-[#E8F8F5] px-2.5 py-1 rounded-md border-2 border-[#00B894] inline-block">
                            {test.code}
                          </span>
                          <h3 className="font-black text-[#2D3436] text-sm md:text-base leading-snug pt-1">
                            {test.title}
                          </h3>
                          <p className="text-gray-500 text-xs line-clamp-2">
                            {test.description}
                          </p>
                        </div>

                        <div className="border-t-2 border-slate-100 mt-4 pt-4 flex justify-between items-center text-xs text-gray-500">
                          <span className="flex items-center gap-1 font-bold">⏱️ {test.timeLimit} phút</span>
                          <span className="flex items-center gap-1 font-bold">📝 {test.questionsCount} câu hỏi</span>

                          <button
                            onClick={() => setSelectedTest(test)}
                            id={`btn_open_test_${test.code}`}
                            className="px-3.5 py-1.5 bg-[#6C5CE7] hover:bg-[#5849C4] text-white font-black rounded-xl border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(45,52,54,1)] transition-all text-xs cursor-pointer"
                          >
                            Mở Đề
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LEVEL 2 CARD */}
              {true && (
                <div className={`bg-white rounded-[32px] border-4 border-[#2D3436] shadow-[8px_8px_0px_0px_rgba(45,52,54,0.15)] overflow-hidden animate-fadeIn ${isL2Locked ? 'select-none' : ''}`} id="level2_island">
                  <div className={`${isL2Locked ? 'bg-slate-500' : 'bg-[#0984E3]'} border-b-4 border-[#2D3436] p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
                    <div className="flex items-center gap-4">
                      <span className="text-4xl bg-white/20 p-2.5 rounded-2xl border-2 border-white/40 select-none">🏔️</span>
                      <div>
                        <h2 className="text-xl font-black flex items-center gap-2">
                          LEVEL 2: ĐẢO TRUNG SĨ SỐ
                          <span className={`text-xs px-2 py-0.5 rounded-full font-black border-2 border-[#2D3436] ${isL2Locked ? 'bg-slate-300 text-slate-800' : 'bg-[#FDCB6E] text-[#2D3436]'}`}>
                            {isL2Locked ? '🔒 ĐÃ KHÓA' : 'Trung cấp'}
                          </span>
                        </h2>
                        <p className={`text-xs font-medium ${isL2Locked ? 'text-slate-200' : 'text-blue-100'}`}>Bảo mật thiết bị di động, đồng bộ dữ liệu đám mây, làm việc nhóm trực tuyến qua Google Drive.</p>
                      </div>
                    </div>

                    <div className="w-full md:w-64">
                      <div className="flex justify-between text-xs font-black mb-1">
                        <span>Đảo Hoàn Thành</span>
                        <span className="font-black">{isL2Locked ? '🔒 Đang Khóa' : `${lv2Percent}%`}</span>
                      </div>
                      <div className="w-full bg-[#2D3436]/25 rounded-full h-3 border border-[#2D3436]/20">
                        <div className={`h-full rounded-full transition-all duration-1000 border-r-2 border-[#2D3436] ${isL2Locked ? 'bg-slate-400' : 'bg-[#FDCB6E]'}`} style={{ width: `${isL2Locked ? 0 : lv2Percent}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-[#FAF9F6]">
                    {allTests.filter(t => t.level === 2).map((test) => {
                      const bestScore = getBestScoreForTest(test.code);
                      const isDone = bestScore !== null;
                      return (
                        <div
                          key={test.id}
                          id={`test_card_${test.code}`}
                          className={`border-2 border-[#2D3436] rounded-2xl p-5 hover:shadow-lg transition-all relative flex flex-col justify-between hover:-translate-y-1 ${isL2Locked ? 'bg-slate-100/70 border-slate-300 opacity-80 shadow-sm' : isDone ? 'bg-[#EBF5FB] shadow-[4px_4px_0px_0px_rgba(45,52,54,0.1)]' : 'bg-white shadow-[4px_4px_0px_0px_rgba(45,52,54,0.1)]'}`}
                        >
                          {isDone && !isL2Locked && (
                            <div className="absolute top-4 right-4 bg-[#74B9FF44] text-[#0984E3] text-[10px] font-black px-2 py-1 rounded-full border border-[#0984E3] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#0984E3]" /> Đã làm: {bestScore}/100 đ
                            </div>
                          )}

                          <div className="space-y-2">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border-2 inline-block ${isL2Locked ? 'text-slate-400 bg-slate-200 border-slate-300' : 'text-[#0984E3] bg-[#EBF5FB] border-[#0984E3]'}`}>
                              {test.code} {isL2Locked && '🔒'}
                            </span>
                            <h3 className={`font-black text-sm md:text-base leading-snug pt-1 ${isL2Locked ? 'text-slate-400 line-through' : 'text-[#2D3436]'}`}>
                              {test.title}
                            </h3>
                            <p className="text-gray-400 text-xs line-clamp-2">
                              {test.description}
                            </p>
                          </div>

                          <div className="border-t-2 border-slate-100 mt-4 pt-4 flex justify-between items-center text-xs text-gray-400">
                            <span className="flex items-center gap-1 font-bold">⏱️ {test.timeLimit} phút</span>
                            <span className="flex items-center gap-1 font-bold">📝 {test.questionsCount} câu hỏi</span>

                            <button
                              onClick={() => {
                                if (isL2Locked) {
                                  alert("🔒 ĐỀ THI ĐANG KHÓA\n\nBạn cần hoàn thành Đảo Level 1 đạt 100% (hoặc nhờ Thầy Cô đặt cấp độ tài khoản của bạn lên Level 2 tại Trang Quản trị) để mở khóa bộ đề này!");
                                } else {
                                  setSelectedTest(test);
                                }
                              }}
                              id={`btn_open_test_${test.code}`}
                              className={`px-3.5 py-1.5 font-black rounded-xl border-2 border-[#2D3436] transition-all text-xs cursor-pointer ${isL2Locked ? 'bg-slate-300 text-slate-500 shadow-[1px_1px_0px_0px_rgba(45,52,54,1)]' : 'bg-[#6C5CE7] hover:bg-[#5849C4] text-white shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(45,52,54,1)]'}`}
                            >
                              {isL2Locked ? '🔒 Khóa' : 'Mở Đề'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* LEVEL 3 CARD */}
              {true && (
                <div className={`bg-white rounded-[32px] border-4 border-[#2D3436] shadow-[8px_8px_0px_0px_rgba(45,52,54,0.15)] overflow-hidden animate-fadeIn ${isL3Locked ? 'select-none' : ''}`} id="level3_island">
                  <div className={`${isL3Locked ? 'bg-slate-500' : 'bg-[#6C5CE7]'} border-b-4 border-[#2D3436] p-6 text-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
                    <div className="flex items-center gap-4">
                      <span className="text-4xl bg-white/20 p-2.5 rounded-2xl border-2 border-white/40 select-none">👑</span>
                      <div>
                        <h2 className="text-xl font-black flex items-center gap-2">
                          LEVEL 3: ĐẢO VUA CÔNG NGHỆ
                          <span className={`text-xs px-2 py-0.5 rounded-full font-black border-2 border-[#2D3436] ${isL3Locked ? 'bg-slate-300 text-slate-800' : 'bg-[#FDCB6E] text-[#2D3436]'}`}>
                            {isL3Locked ? '🔒 ĐÃ KHÓA' : 'Nâng cao'}
                          </span>
                        </h2>
                        <p className={`text-xs font-medium ${isL3Locked ? 'text-slate-200' : 'text-purple-100'}`}>Luyện tập tư duy thuật toán, an ninh mạng nâng cao, mã hóa dữ liệu doanh nghiệp.</p>
                      </div>
                    </div>

                    <div className="w-full md:w-64">
                      <div className="flex justify-between text-xs font-black mb-1">
                        <span>Đảo Hoàn Thành</span>
                        <span className="font-black">{isL3Locked ? '🔒 Đang Khóa' : `${lv3Percent}%`}</span>
                      </div>
                      <div className="w-full bg-[#2D3436]/25 rounded-full h-3 border border-[#2D3436]/20">
                        <div className={`h-full rounded-full transition-all duration-1000 border-r-2 border-[#2D3436] ${isL3Locked ? 'bg-slate-400' : 'bg-[#FDCB6E]'}`} style={{ width: `${isL3Locked ? 0 : lv3Percent}%` }}></div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 bg-[#FAF9F6]">
                    {allTests.filter(t => t.level === 3).map((test) => {
                      const bestScore = getBestScoreForTest(test.code);
                      const isDone = bestScore !== null;
                      return (
                        <div
                          key={test.id}
                          id={`test_card_${test.code}`}
                          className={`border-2 border-[#2D3436] rounded-2xl p-5 hover:shadow-lg transition-all relative flex flex-col justify-between hover:-translate-y-1 ${isL3Locked ? 'bg-slate-100/70 border-slate-300 opacity-80 shadow-sm' : isDone ? 'bg-[#F4ECF7] shadow-[4px_4px_0px_0px_rgba(45,52,54,0.15)]' : 'bg-white shadow-[4px_4px_0px_0px_rgba(45,52,54,0.15)]'}`}
                        >
                          {isDone && !isL3Locked && (
                            <div className="absolute top-4 right-4 bg-[#a29bfe44] text-[#6C5CE7] text-[10px] font-black px-2 py-1 rounded-full border border-[#6C5CE7] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#6C5CE7]" /> Đã làm: {bestScore}/100 đ
                            </div>
                          )}

                          <div className="space-y-2">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-md border-2 inline-block ${isL3Locked ? 'text-slate-400 bg-slate-200 border-slate-300' : 'text-[#6C5CE7] bg-[#F4ECF7] border-[#6C5CE7]'}`}>
                              {test.code} {isL3Locked && '🔒'}
                            </span>
                            <h3 className={`font-black text-sm md:text-base leading-snug pt-1 ${isL3Locked ? 'text-slate-400 line-through' : 'text-[#2D3436]'}`}>
                              {test.title}
                            </h3>
                            <p className="text-gray-400 text-xs line-clamp-2">
                              {test.description}
                            </p>
                          </div>

                          <div className="border-t-2 border-slate-100 mt-4 pt-4 flex justify-between items-center text-xs text-gray-400">
                            <span className="flex items-center gap-1 font-bold">⏱️ {test.timeLimit} phút</span>
                            <span className="flex items-center gap-1 font-bold">📝 {test.questionsCount} câu hỏi</span>

                            <button
                              onClick={() => {
                                if (isL3Locked) {
                                  alert("🔒 ĐỀ THI ĐANG KHÓA\n\nBạn cần hoàn thành Đảo Level 2 đạt 100% (hoặc nhờ Thầy Cô đặt cấp độ tài khoản của bạn lên Level 3 tại Trang Quản trị) để mở khóa bộ đề này!");
                                } else {
                                  setSelectedTest(test);
                                }
                              }}
                              id={`btn_open_test_${test.code}`}
                              className={`px-3.5 py-1.5 font-black rounded-xl border-2 border-[#2D3436] transition-all text-xs cursor-pointer ${isL3Locked ? 'bg-slate-300 text-slate-500 shadow-[1px_1px_0px_0px_rgba(45,52,54,1)]' : 'bg-[#6C5CE7] hover:bg-[#5849C4] text-white shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] hover:translate-y-0.5 hover:shadow-[1px_1px_0px_0px_rgba(45,52,54,1)]'}`}
                            >
                              {isL3Locked ? '🔒 Khóa' : 'Mở Đề'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* POPUP CHỌN CHẾ ĐỘ THI */}
              {selectedTest && (
                <div className="fixed inset-0 bg-[#2D3436]/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" id="mode_selector_modal">
                  <div className="bg-white rounded-[32px] p-6 md:p-8 max-w-4xl w-full border-4 border-[#2D3436] shadow-[8px_8px_0px_0px_rgba(45,52,54,1)] relative">
                    <button
                      onClick={() => setSelectedTest(null)}
                      className="absolute top-4 right-4 w-8 h-8 rounded-full border-2 border-[#2D3436] bg-slate-50 hover:bg-slate-100 text-[#2D3436] flex items-center justify-center text-lg font-black cursor-pointer shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]"
                    >
                      ×
                    </button>

                    <div className="text-center space-y-4">
                      <span className="text-4xl">🔑</span>
                      <div>
                        <span className="text-[10px] font-black uppercase text-[#6C5CE7] px-3 py-1 rounded-full border-2 border-[#6C5CE7] bg-[#F4ECF7]">
                          Đề {selectedTest.code}
                        </span>
                        <h3 className="font-black text-[#2D3436] text-xl mt-2.5 leading-snug">
                          {selectedTest.title}
                        </h3>
                        <p className="text-gray-500 text-xs mt-1 md:px-6 leading-relaxed">
                          {selectedTest.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                        {/* CHẾ ĐỘ LUYỆN TẬP */}
                        <button
                          onClick={() => onSelectTest(selectedTest, 'practice')}
                          id="select_mode_practice"
                          className="border-4 border-[#2D3436] bg-[#E8F8F5] p-5 rounded-2xl text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-44 group shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] cursor-pointer"
                        >
                          <div className="p-2 bg-teal-100 text-[#00B894] border-2 border-[#2D3436] font-black text-[10px] rounded-lg w-max group-hover:animate-bounce">
                            🌱 PRACTICE
                          </div>
                          <div>
                            <h4 className="font-black text-[#2D3436] text-sm">CHẾ ĐỘ LUYỆN TẬP</h4>
                            <p className="text-[10px] text-slate-600 leading-tight mt-1 font-bold">
                              • Xem đáp án & giải thích ngay lập tức.<br />
                              • Không tính áp lực thời gian.<br />
                              • Nhận mẹo hay ghi nhớ bài học.
                            </p>
                          </div>
                        </button>

                        {/* CHẾ ĐỘ KIỂM TRA */}
                        <button
                          onClick={() => onSelectTest(selectedTest, 'exam')}
                          id="select_mode_exam"
                          className="border-4 border-[#2D3436] bg-[#FDEDEC] p-5 rounded-2xl text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-44 group shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] cursor-pointer"
                        >
                          <div className="p-2 bg-rose-100 text-[#FF7675] border-2 border-[#2D3436] font-black text-[10px] rounded-lg w-max group-hover:animate-ping">
                            ⚡ EXAM
                          </div>
                          <div>
                            <h4 className="font-black text-[#2D3436] text-sm">CHẾ ĐỘ KIỂM TRA</h4>
                            <p className="text-[10px] text-slate-600 leading-tight mt-1 font-bold">
                              • Đồng hồ tính giờ bám sát thi thật.<br />
                              • Chấm điểm & phân tích kỹ năng cuối bài.<br />
                              • Cơ hội nhận huy hiệu quý hiếm!
                            </p>
                          </div>
                        </button>

                        {/* CHẾ ĐỘ ĐƯỜNG ĐUA */}
                        <button
                          onClick={() => onSelectTest(selectedTest, 'race')}
                          id="select_mode_race"
                          className="border-4 border-[#2D3436] bg-[#FFF9E6] p-5 rounded-2xl text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-44 group shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] cursor-pointer"
                        >
                          <div className="p-2 bg-amber-100 text-[#D97706] border-2 border-[#2D3436] font-black text-[10px] rounded-lg w-max group-hover:rotate-12">
                            🏎️ RACE
                          </div>
                          <div>
                            <h4 className="font-black text-[#2D3436] text-sm">CHẾ ĐỘ ĐƯỜNG ĐUA</h4>
                            <p className="text-[10px] text-slate-600 leading-tight mt-1 font-bold">
                              • Làm sai lập tức quay về câu đầu tiên.<br />
                              • Thách thức sự chuẩn xác tuyệt đối.<br />
                              • Rèn luyện phản xạ và nhớ lâu cực đỉnh!
                            </p>
                          </div>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: THÀNH TÍCH CÁ NHÂN & KỸ NĂNG */}
          {activeTab === 'achievements' && (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-8 animate-fadeIn"
              id="student_achievements_view"
            >
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. Biểu đồ kỹ năng 3 miền tự vẽ SVG cực kì an toàn và mượt mà */}
                <div className="bg-white rounded-[32px] border-4 border-[#2D3436] p-6 shadow-[8px_8px_0px_0px_rgba(45,52,54,0.15)] lg:col-span-2 space-y-6">
                  <div className="border-b-2 border-slate-100 pb-3 flex justify-between items-center">
                    <div>
                      <h3 className="font-black text-[#2D3436] text-base md:text-lg">
                        Bản Đồ Kỹ Năng IC3 GS6
                      </h3>
                      <p className="text-xs text-slate-500">Phân tích kết quả trung bình dựa trên 3 khối kiến thức trọng tâm.</p>
                    </div>
                    <span className="text-xs font-black bg-[#F4ECF7] text-[#6C5CE7] px-3 py-1 rounded-full border-2 border-[#6C5CE7]">
                      Trung bình: {student.averageScore} đ
                    </span>
                  </div>

                  {/* SVG vẽ Biểu đồ Tam giác Kỹ năng */}
                  <div className="flex flex-col md:flex-row gap-6 items-center justify-center p-4">
                    <div className="relative w-48 h-48 flex items-center justify-center bg-[#FFF9E6] rounded-full border-4 border-dashed border-[#FDCB6E]">
                      <svg width="180" height="180" viewBox="0 0 100 100" className="overflow-visible">
                        {/* Lưới tam giác */}
                        <polygon points="50,10 90,80 10,80" fill="none" stroke="#2D3436" strokeWidth="0.75" strokeDasharray="1 1" />
                        <polygon points="50,27.5 80,80 20,80" fill="none" stroke="#2D3436" strokeWidth="0.5" strokeDasharray="2 2" />
                        <polygon points="50,45 70,80 30,80" fill="none" stroke="#2D3436" strokeWidth="0.5" strokeDasharray="2 2" />
                        
                        {/* Đường trục */}
                        <line x1="50" y1="80" x2="50" y2="10" stroke="#2D3436" strokeWidth="0.5" strokeDasharray="3" />
                        <line x1="50" y1="80" x2="90" y2="80" stroke="#2D3436" strokeWidth="0.5" strokeDasharray="3" />
                        <line x1="50" y1="80" x2="10" y2="80" stroke="#2D3436" strokeWidth="0.5" strokeDasharray="3" />

                        {/* Tính toán tọa độ điểm dựa vào điểm số (tối đa 100) */}
                        {(() => {
                          const cf_val = strengths.cf || 50;
                          const ka_val = strengths.ka || 50;
                          const lo_val = strengths.lo || 50;

                          // Quy đổi giá trị ra tọa độ SVG
                          const yA = 80 - (cf_val / 100) * 70;
                          const xB = 50 + (ka_val / 100) * 40;
                          const xC = 50 - (lo_val / 100) * 40;

                          return (
                            <>
                              {/* Vùng phủ kỹ năng */}
                              <polygon
                                points={`50,${yA} ${xB},80 ${xC},80`}
                                fill="rgba(108, 92, 231, 0.35)"
                                stroke="#6C5CE7"
                                strokeWidth="2.5"
                                className="transition-all duration-1000"
                              />
                              {/* Các điểm mốc */}
                              <circle cx="50" cy={yA} r="4" fill="#00B894" stroke="#2D3436" strokeWidth="1" />
                              <circle cx={xB} cy="80" r="4" fill="#FDCB6E" stroke="#2D3436" strokeWidth="1" />
                              <circle cx={xC} cy="80" r="4" fill="#0984E3" stroke="#2D3436" strokeWidth="1" />
                            </>
                          );
                        })()}

                        {/* Labels */}
                        <text x="50" y="5" textAnchor="middle" fontSize="5.5" fontWeight="900" fill="#2D3436">🤖 CF</text>
                        <text x="104" y="83" textAnchor="start" fontSize="5.5" fontWeight="900" fill="#2D3436">🦊 KA</text>
                        <text x="-4" y="83" textAnchor="end" fontSize="5.5" fontWeight="900" fill="#2D3436">🐼 LO</text>
                      </svg>
                    </div>

                    {/* Danh sách phân tích bằng thanh Bar rực rỡ */}
                    <div className="flex-1 w-full space-y-4">
                      <div>
                        <div className="flex justify-between text-xs font-black mb-1">
                          <span className="text-[#00B894]">💻 Computing Fundamentals</span>
                          <span className="text-[#2D3436] font-black">{strengths.cf}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border-2 border-[#2D3436]">
                          <div className="bg-[#00B894] h-full rounded-full transition-all border-r-2 border-[#2D3436]" style={{ width: `${strengths.cf}%` }}></div>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 font-bold">Phần cứng máy tính, hệ điều hành Windows, cài đặt và sự cố cơ bản.</p>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-black mb-1">
                          <span className="text-[#D63031]">📊 Key Applications (Sử dụng Ứng dụng)</span>
                          <span className="text-[#2D3436] font-black">{strengths.ka}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border-2 border-[#2D3436]">
                          <div className="bg-[#FDCB6E] h-full rounded-full transition-all border-r-2 border-[#2D3436]" style={{ width: `${strengths.ka}%` }}></div>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 font-bold">Soạn thảo văn bản Word, bảng tính số liệu Excel, trình bày PowerPoint.</p>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-black mb-1">
                          <span className="text-[#0984E3]">🌐 Living Online (Cuộc sống mạng trực tuyến)</span>
                          <span className="text-[#2D3436] font-black">{strengths.lo}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border-2 border-[#2D3436]">
                          <div className="bg-[#0984E3] h-full rounded-full transition-all border-r-2 border-[#2D3436]" style={{ width: `${strengths.lo}%` }}></div>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 font-bold">Sử dụng Internet, an toàn Wi-Fi công cộng, lưu trữ Google Drive, làm việc nhóm.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Kho lưu trữ thành tích cá nhân */}
                <div className="bg-white rounded-[32px] border-4 border-[#2D3436] p-6 shadow-[8px_8px_0px_0px_rgba(45,52,54,0.15)] space-y-6">
                  <h3 className="font-black text-[#2D3436] text-base md:text-lg border-b-2 border-slate-100 pb-3">
                    Thống Kê Thử Thách
                  </h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#F0F2FF] rounded-2xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] text-center space-y-1">
                      <p className="text-[10px] uppercase font-black text-[#6C5CE7] tracking-wider">Tỷ lệ chính xác</p>
                      <h4 className="text-3xl font-black text-[#2D3436]">{accuracyRate}%</h4>
                      <p className="text-[9px] text-slate-500 font-bold">Độ chuẩn xác đáp án</p>
                    </div>

                    <div className="p-4 bg-[#E8F8F5] rounded-2xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] text-center space-y-1">
                      <p className="text-[10px] uppercase font-black text-[#00B894] tracking-wider">Đề đã vượt qua</p>
                      <h4 className="text-3xl font-black text-[#2D3436]">{studentResults.filter(r => r.score === 100).length} đề</h4>
                      <p className="text-[9px] text-slate-500 font-bold">Đúng hết tất cả câu</p>
                    </div>

                    <div className="p-4 bg-[#FFF4E5] rounded-2xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] text-center space-y-1">
                      <p className="text-[10px] uppercase font-black text-[#E67E22] tracking-wider">Điểm cao nhất</p>
                      <h4 className="text-3xl font-black text-[#2D3436]">{studentResults.length > 0 ? Math.max(...studentResults.map(r => r.score)) : 0} đ</h4>
                      <p className="text-[9px] text-slate-500 font-bold">Thành tích xuất sắc</p>
                    </div>

                    <div className="p-4 bg-[#F4ECF7] rounded-2xl border-2 border-[#2D3436] shadow-[3px_3px_0px_0px_rgba(45,52,54,1)] text-center space-y-1">
                      <p className="text-[10px] uppercase font-black text-[#8E44AD] tracking-wider">Lượt làm bài</p>
                      <h4 className="text-3xl font-black text-[#2D3436]">{studentResults.length} lượt</h4>
                      <p className="text-[9px] text-slate-500 font-bold">Chăm chỉ rèn luyện</p>
                    </div>
                  </div>

                  <div className="p-4.5 bg-[#FFF9E6] rounded-2xl border-2 border-[#2D3436] text-center shadow-[3px_3px_0px_0px_rgba(45,52,54,1)]">
                    <p className="text-xs font-black text-[#2D3436] mb-2">Đồng hồ đo mức chuyên cần 🔥</p>
                    <div className="flex items-center justify-center gap-2">
                      <span className="text-4xl animate-bounce">🔥</span>
                      <div className="text-left">
                        <h4 className="font-black text-[#2D3436] text-sm">Chuỗi {student.streak} ngày liên tiếp</h4>
                        <p className="text-[10px] text-gray-500 font-bold">Hãy vào ôn luyện mỗi ngày để không bị nguội lửa nhé!</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* HỆ THỐNG HUY HIỆU */}
              <div className="bg-white rounded-[32px] border-4 border-[#2D3436] p-6 shadow-[8px_8px_0px_0px_rgba(45,52,54,0.15)] space-y-6">
                <div>
                  <h3 className="font-black text-[#2D3436] text-base md:text-lg">
                    Tủ Trưng Bày Huy Hiệu Danh Dự
                  </h3>
                  <p className="text-xs text-slate-500">Vượt qua các cột mốc thử thách quan trọng để kích hoạt toàn bộ 6 huy hiệu siêu xịn này!</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {BADGES.map((badge) => {
                    const hasBadge = student.badges.includes(badge.id);
                    return (
                      <div
                        key={badge.id}
                        className={`p-4 rounded-2xl border-4 border-[#2D3436] flex gap-4 items-center transition-all ${
                          hasBadge
                            ? `bg-white text-[#2D3436] shadow-[4px_4px_0px_0px_rgba(45,52,54,1)] scale-[1.01]`
                            : 'bg-slate-100 text-slate-400 opacity-60 border-dashed'
                        }`}
                      >
                        <div className={`w-12 h-12 shrink-0 rounded-full border-2 border-[#2D3436] flex items-center justify-center text-2xl ${hasBadge ? 'bg-[#FFF9E6]' : 'bg-slate-200'}`}>
                          {badge.id === 'badge_1' && '🥉'}
                          {badge.id === 'badge_2' && '🥈'}
                          {badge.id === 'badge_3' && '🥇'}
                          {badge.id === 'badge_4' && '🚀'}
                          {badge.id === 'badge_5' && '🧠'}
                          {badge.id === 'badge_6' && '👑'}
                        </div>

                        <div className="overflow-hidden">
                          <h4 className="font-black text-sm text-[#2D3436] truncate">{badge.title}</h4>
                          <p className="text-[10px] leading-snug mt-0.5 text-gray-500 font-bold">
                            {badge.description}
                          </p>
                          <span className={`inline-block text-[8px] font-black px-2 py-0.5 rounded-full mt-2 uppercase border ${hasBadge ? 'bg-[#E8F8F5] text-[#00B894] border-[#00B894]' : 'bg-slate-200 text-slate-500 border-slate-300'}`}>
                            {hasBadge ? '✓ Đã sở hữu' : '🔒 Đang khóa'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* LỊCH SỬ THI CHI TIẾT */}
              <div className="bg-white rounded-[32px] border-4 border-[#2D3436] p-6 shadow-[8px_8px_0px_0px_rgba(45,52,54,0.15)] space-y-4">
                <h3 className="font-black text-[#2D3436] text-base md:text-lg border-b-2 border-slate-100 pb-3">
                  Nhật Ký Phiêu Lưu Gần Đây
                </h3>

                {studentResults.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-6 font-bold">Bạn chưa tham gia bài thi nào. Hãy quay lại Đảo Phiêu lưu để bắt đầu!</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                      <thead>
                        <tr className="border-b-2 border-[#2D3436] text-[#2D3436] font-black text-xs uppercase tracking-wider">
                          <th className="py-3 px-4">Tên bộ đề</th>
                          <th className="py-3 px-4">Ngày thi</th>
                          <th className="py-3 px-4 text-center">Thời gian làm</th>
                          <th className="py-3 px-4 text-center">Đúng/Tổng</th>
                          <th className="py-3 px-4 text-center">Điểm số</th>
                          <th className="py-3 px-4 text-center">Đánh giá</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {[...studentResults].reverse().map((res) => {
                          const isPass = res.score === 100;
                          return (
                            <tr key={res.id} className="hover:bg-[#FFF9E6]/30 transition-colors">
                              <td className="py-3.5 px-4">
                                <p className="font-black text-[#2D3436] leading-snug">{res.testTitle}</p>
                                <span className="text-[10px] font-black text-[#6C5CE7] bg-[#F4ECF7] px-1.5 py-0.5 rounded border-2 border-[#6C5CE7] mt-1 inline-block">
                                  {res.testCode} (Lvl {res.level})
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-xs text-slate-500 font-semibold">
                                {new Date(res.date).toLocaleDateString('vi-VN')} {new Date(res.date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-3.5 px-4 text-center text-xs font-semibold">
                                {Math.floor(res.timeSpent / 60)}p {res.timeSpent % 60}s
                              </td>
                              <td className="py-3.5 px-4 text-center font-bold text-xs">
                                {res.correctCount} / {res.totalQuestions}
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`font-black text-sm ${isPass ? 'text-[#00B894]' : 'text-[#D63031]'}`}>
                                  {res.score} đ
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${isPass ? 'bg-[#E8F8F5] text-[#00B894] border-[#00B894]' : 'bg-[#FDEDEC] text-[#FF7675] border-[#FF7675]'}`}>
                                  {isPass ? 'Đúng hết ✔' : 'Chưa đúng hết ✘'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* TAB 3: BẢNG XẾP HẠNG TOÀN TRƯỜNG */}
          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="space-y-6"
            >
              {/* BỘ LỌC BẢNG XẾP HẠNG */}
              <div className="bg-white p-5 rounded-[32px] border-4 border-[#2D3436] shadow-[8px_8px_0px_0px_rgba(45,52,54,0.15)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2 text-[#2D3436]">
                  <Filter className="w-5 h-5 text-[#6C5CE7]" />
                  <h3 className="font-black text-base">Bộ Lọc Bảng Danh Dự</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto">
                  {/* Lọc Lớp */}
                  <div>
                    <label className="block text-[10px] font-black text-[#2D3436] uppercase tracking-wider mb-1">Lớp</label>
                    <select
                      value={lbClassFilter}
                      onChange={(e) => setLbClassFilter(e.target.value)}
                      className="w-full p-2 border-2 border-[#2D3436] rounded-xl text-xs bg-[#FFF9E6] text-[#2D3436] font-bold focus:ring-2 focus:ring-[#6C5CE7] outline-none shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] cursor-pointer"
                    >
                      <option value="All">Tất Cả Các Lớp</option>
                      {allClasses.map(cls => (
                        <option key={cls} value={cls}>Lớp {cls}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tiêu chí sắp xếp */}
                  <div>
                    <label className="block text-[10px] font-black text-[#2D3436] uppercase tracking-wider mb-1">Sắp Xếp Theo</label>
                    <select
                      value={lbSortBy}
                      onChange={(e) => setLbSortBy(e.target.value as any)}
                      className="w-full p-2 border-2 border-[#2D3436] rounded-xl text-xs bg-[#F4ECF7] text-[#6C5CE7] font-black focus:ring-2 focus:ring-[#6C5CE7] outline-none shadow-[2px_2px_0px_0px_rgba(45,52,54,1)] cursor-pointer"
                    >
                      <option value="score">Điểm số trung bình</option>
                      <option value="streak">Chuỗi ngày học (Chăm chỉ)</option>
                      <option value="completed">Số lượng đề hoàn thành</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* BẢNG DANH SÁCH XẾP HẠNG */}
              <div className="bg-white rounded-[32px] border-4 border-[#2D3436] shadow-[8px_8px_0px_0px_rgba(45,52,54,0.15)] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#FFF9E6] border-b-4 border-[#2D3436] text-[#2D3436] font-black text-xs uppercase tracking-wider">
                        <th className="py-4 px-6 text-center w-20">Hạng</th>
                        <th className="py-4 px-6">Học sinh</th>
                        <th className="py-4 px-6 text-center">Lớp</th>
                        <th className="py-4 px-6 text-center">Cấp độ học</th>
                        <th className="py-4 px-6 text-center">Đề đã làm</th>
                        <th className="py-4 px-6 text-center">Huy hiệu đạt được</th>
                        <th className="py-4 px-6 text-center font-black text-[#6C5CE7]">
                          {lbSortBy === 'score' && 'Điểm trung bình'}
                          {lbSortBy === 'streak' && 'Chuỗi học tập'}
                          {lbSortBy === 'completed' && 'Đề hoàn thành'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[#2D3436]">
                      {leaderboard.map((std: Student, index) => {
                        const isMe = std.id === student.id;
                        const rank = index + 1;

                        return (
                          <tr
                            key={std.id}
                            className={`transition-colors ${isMe ? 'bg-[#FFF4E5] hover:bg-[#FFF4E5] font-black border-l-4 border-l-[#FDCB6E]' : 'hover:bg-[#FFF9E6]/20'}`}
                          >
                            <td className="py-4 px-6 text-center font-black">
                              {rank === 1 && <span className="text-2xl" title="Hạng Nhất">👑</span>}
                              {rank === 2 && <span className="text-xl" title="Hạng Nhì">🥈</span>}
                              {rank === 3 && <span className="text-xl" title="Hạng Ba">🥉</span>}
                              {rank > 3 && <span className="text-slate-400 font-extrabold">#{rank}</span>}
                            </td>

                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <span className="text-2xl bg-[#FFF9E6] p-1.5 rounded-xl border-2 border-[#2D3436] shadow-[2px_2px_0px_0px_rgba(45,52,54,1)]">
                                  {std.avatar === 'robot' ? '🤖' : std.avatar === 'fox' ? '🦊' : '🐼'}
                                </span>
                                <div>
                                  <p className="font-black text-[#2D3436] leading-snug">
                                    {std.name} {isMe && <span className="text-[9px] bg-[#6C5CE7] text-white font-black px-1.5 py-0.5 rounded ml-1 uppercase tracking-wider border border-[#2D3436]">Bạn</span>}
                                  </p>
                                  <p className="text-[10px] text-gray-500 font-bold">Mã: {std.code}</p>
                                </div>
                              </div>
                            </td>

                            <td className="py-4 px-6 text-center font-black text-xs">{std.class}</td>

                            <td className="py-4 px-6 text-center">
                              <span className="text-xs font-black px-2 py-0.5 bg-[#F4ECF7] border-2 border-[#6C5CE7] text-[#6C5CE7] rounded-full">
                                Level 1-2-3
                              </span>
                            </td>

                            <td className="py-4 px-6 text-center text-xs font-black text-slate-600">
                              📁 {std.completedTests.length} đề
                            </td>

                            <td className="py-4 px-6 text-center">
                              <div className="flex justify-center gap-1.5 overflow-hidden max-w-[200px] mx-auto">
                                {std.badges.slice(0, 3).map((badgeId, bIdx) => {
                                  const b = BADGES.find(item => item.id === badgeId);
                                  return (
                                    <span key={bIdx} className="text-lg" title={b?.title}>
                                      {badgeId === 'badge_1' && '🥉'}
                                      {badgeId === 'badge_2' && '🥈'}
                                      {badgeId === 'badge_3' && '🥇'}
                                      {badgeId === 'badge_4' && '🚀'}
                                      {badgeId === 'badge_5' && '🧠'}
                                      {badgeId === 'badge_6' && '👑'}
                                    </span>
                                  );
                                })}
                                {std.badges.length > 3 && (
                                  <span className="text-[10px] bg-[#FFF9E6] border border-[#2D3436] text-[#2D3436] font-black px-1.5 py-0.5 rounded-full">
                                    +{std.badges.length - 3}
                                  </span>
                                )}
                                {std.badges.length === 0 && <span className="text-xs text-slate-400 italic font-bold">Chưa có</span>}
                              </div>
                            </td>

                            <td className="py-4 px-6 text-center font-black">
                              {lbSortBy === 'score' && (
                                <span className="text-[#6C5CE7] text-sm">{std.averageScore} điểm</span>
                              )}
                              {lbSortBy === 'streak' && (
                                <span className="text-amber-600 text-sm">🔥 {std.streak} ngày</span>
                              )}
                              {lbSortBy === 'completed' && (
                                <span className="text-[#00B894] text-sm">📁 {std.completedTests.length} đề</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
