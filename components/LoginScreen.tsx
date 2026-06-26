import React, { useState, useEffect } from 'react';
import { getStudents, getAdmins, Student } from '../lib/db';
import { saveLogToGoogleSheet, getGoogleSheetUrl, setGoogleSheetUrl, syncDatabaseFromGoogleSheets } from '../lib/sheets';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, User, Key, Play, Sparkles, School, Users, CheckCircle, RefreshCw, Settings, HelpCircle, Check, AlertTriangle } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: { role: 'student' | 'admin'; data: any }) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [role, setRole] = useState<'student' | 'admin'>('student');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States for student drop-down selector login
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [password, setPassword] = useState('');

  // States for admin input login
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  // Google Sheet URL Configuration states
  const [showConfig, setShowConfig] = useState(false);
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [configStatus, setConfigStatus] = useState<'idle' | 'success' | 'error' | 'testing'>('idle');
  const [configMessage, setConfigMessage] = useState('');

  // Load students and admins from local cache on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      setAllStudents(getStudents());
      setSheetUrlInput(getGoogleSheetUrl());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigStatus('testing');
    setConfigMessage('Đang kết nối thử nghiệm đến Google Sheets...');

    const trimmedUrl = sheetUrlInput.trim();

    // Kiểm tra định dạng sai phổ biến: nhập link Google Spreadsheet thay vì Web App
    if (trimmedUrl.includes('docs.google.com/spreadsheets')) {
      setConfigStatus('error');
      setConfigMessage('CẢNH BÁO: Bạn vừa nhập liên kết của file Bảng tính (Spreadsheet). Bạn cần nhập đúng URL Web App của Google Apps Script (phải bắt đầu bằng https://script.google.com/macros/s/... và kết thúc bằng /exec). Vui lòng xem hướng dẫn!');
      return;
    }

    if (trimmedUrl && (!trimmedUrl.startsWith('https://script.google.com') || !trimmedUrl.endsWith('/exec'))) {
      if (!confirm('Lưu ý: URL này không bắt đầu bằng script.google.com hoặc không kết thúc bằng /exec. Đây có thể không phải là Apps Script Web App hợp lệ. Bạn vẫn muốn tiếp tục lưu chứ?')) {
        setConfigStatus('idle');
        setConfigMessage('');
        return;
      }
    }

    try {
      // Thiết lập URL mới để thử nghiệm kết nối
      setGoogleSheetUrl(trimmedUrl);
      
      const res = await syncDatabaseFromGoogleSheets();
      
      // Thành công! Cập nhật danh sách học sinh hiển thị trong giao diện
      const freshStudents = getStudents();
      setAllStudents(freshStudents);
      
      // Reset các trường đã chọn trước đó
      setSelectedSchool('');
      setSelectedClass('');
      setSelectedStudentId('');
      
      setConfigStatus('success');
      setConfigMessage('Kết nối & đồng bộ thành công! Đã kết nối tới Google Sheets và tải được ' + freshStudents.length + ' học sinh từ trang tính.');
    } catch (err: any) {
      setConfigStatus('error');
      setConfigMessage('Không thể kết nối đến Google Sheets Apps Script này! Vui lòng kiểm tra lại URL và đảm bảo bạn đã triển khai Apps Script dưới dạng ứng dụng Web cho "Bất kỳ ai" (Anyone). Chi tiết lỗi: ' + (err.message || err));
    }
  };

  // Filter dynamic lists from sheet data
  const schools = Array.from(new Set(allStudents.map((s) => s.school || '').filter(Boolean))).sort();

  const classes = selectedSchool
    ? Array.from(new Set(allStudents.filter((s) => s.school === selectedSchool).map((s) => s.class || '').filter(Boolean))).sort()
    : [];

  const studentsList = (selectedSchool && selectedClass)
    ? allStudents.filter((s) => s.school === selectedSchool && s.class === selectedClass && !s.isLocked)
    : [];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (role === 'student') {
        if (!selectedSchool || !selectedClass || !selectedStudentId || !password.trim()) {
          setError('Vui lòng hoàn thành tất cả các bước chọn và nhập mật khẩu!');
          setIsSubmitting(false);
          return;
        }

        const student = allStudents.find((s) => s.id === selectedStudentId);
        if (!student) {
          setError('Học sinh không tồn tại trong hệ thống!');
          setIsSubmitting(false);
          return;
        }

        if (student.password !== password.trim()) {
          // Log login failure to Google Sheets
          await saveLogToGoogleSheet({
            student_id: student.id,
            fullname: student.name,
            school: student.school || '',
            class: student.class,
            status: 'Login Failed'
          });
          setError('Mật khẩu không chính xác!');
          setIsSubmitting(false);
          return;
        }

        if (student.isLocked) {
          setError('Tài khoản này đã bị khóa!');
          setIsSubmitting(false);
          return;
        }

        // Log login success to Google Sheets
        await saveLogToGoogleSheet({
          student_id: student.id,
          fullname: student.name,
          school: student.school || '',
          class: student.class,
          status: 'Login Success'
        });

        onLoginSuccess({ role: 'student', data: student });
      } else {
        // Admin Login
        if (!adminUsername.trim() || !adminPassword.trim()) {
          setError('Vui lòng nhập đầy đủ tên tài khoản và mật khẩu admin!');
          setIsSubmitting(false);
          return;
        }

        const admins = getAdmins();
        const admin = admins.find(
          (a) => a.username.toLowerCase() === adminUsername.trim().toLowerCase() && a.password === adminPassword
        );

        if (!admin) {
          setError('Tài khoản quản trị hoặc mật khẩu không chính xác!');
          setIsSubmitting(false);
          return;
        }

        onLoginSuccess({ role: 'admin', data: admin });
      }
    } catch (err: any) {
      console.warn('Error during login:', err);
      setError('Đã xảy ra lỗi trong quá trình xác thực. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF9E6] text-[#2D3436] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden" id="login_screen">
      {/* Background elements */}
      <div className="absolute inset-0 opacity-40 pointer-events-none">
        <div className="absolute top-10 left-10 w-3 h-3 bg-[#6C5CE7] rounded-full animate-ping"></div>
        <div className="absolute top-1/4 right-20 w-4 h-4 bg-[#FD79A8] rounded-full animate-pulse"></div>
        <div className="absolute bottom-1/3 left-1/4 w-2 h-2 bg-[#FDCB6E] rounded-full"></div>
        <div className="absolute bottom-10 right-1/3 w-3.5 h-3.5 bg-[#00B894] rounded-full animate-ping"></div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-4">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            className="bg-white p-4 rounded-3xl border-b-4 border-r-4 border-slate-200 shadow-md"
          >
            <span className="text-6xl select-none">🚀</span>
          </motion.div>
        </div>

        <h2 className="text-center text-3xl font-black text-[#6C5CE7] tracking-tight flex flex-col gap-1">
          <span className="font-sans uppercase">IC3 GS6 EXPLORER</span>
          <span className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">
            Vũ trụ ôn thi kỹ năng số 3 Level từ Google Sheet
          </span>
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10" id="login_card">
        <div className="bg-white py-8 px-6 shadow-lg rounded-[30px] border-b-8 border-r-8 border-[#DFE6E9] sm:px-10">
          {/* Role selection tabs */}
          <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6">
            <button
              onClick={() => {
                setRole('student');
                setError('');
              }}
              type="button"
              className={`flex-1 py-2.5 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                role === 'student'
                  ? 'bg-[#6C5CE7] text-white border-b-4 border-[#4834D4] shadow-sm'
                  : 'text-slate-500 hover:text-[#2D3436]'
              }`}
              id="tab_student_login"
            >
              <User className="w-4 h-4" /> Học Sinh Ôn Thi
            </button>
            <button
              onClick={() => {
                setRole('admin');
                setError('');
              }}
              type="button"
              className={`flex-1 py-2.5 text-sm font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                role === 'admin'
                  ? 'bg-[#6C5CE7] text-white border-b-4 border-[#4834D4] shadow-sm'
                  : 'text-slate-500 hover:text-[#2D3436]'
              }`}
              id="tab_admin_login"
            >
              <ShieldCheck className="w-4 h-4" /> Quản Trị Viên
            </button>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            {error && (
              <div className="p-3 bg-red-50 border-2 border-[#FF7675] text-[#D63031] rounded-xl text-xs font-bold flex items-center gap-2 animate-shake" id="login_error">
                <span className="w-2 h-2 bg-[#D63031] rounded-full animate-ping"></span>
                {error}
              </div>
            )}

            {role === 'student' ? (
              // STEPPED STUDENT SELECTION LOGIN
              <div className="space-y-4">
                {/* Step 1: Chọn trường */}
                <div>
                  <label className="block text-xs font-black text-[#2D3436] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <School className="w-3.5 h-3.5 text-[#6C5CE7]" /> Bước 1: Chọn Trường học
                  </label>
                  <select
                    value={selectedSchool}
                    onChange={(e) => {
                      setSelectedSchool(e.target.value);
                      setSelectedClass('');
                      setSelectedStudentId('');
                    }}
                    className="block w-full px-4 py-3 border-2 border-slate-200 focus:border-[#6C5CE7] rounded-xl bg-slate-50 text-[#2D3436] font-bold focus:outline-none text-sm transition-all"
                  >
                    <option value="">-- Chọn trường học của bạn --</option>
                    {schools.map((sch) => (
                      <option key={sch} value={sch}>
                        {sch}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Step 2: Chọn lớp */}
                {selectedSchool && (
                  <div>
                    <label className="block text-xs font-black text-[#2D3436] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#6C5CE7]" /> Bước 2: Chọn Lớp học
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => {
                        setSelectedClass(e.target.value);
                        setSelectedStudentId('');
                      }}
                      className="block w-full px-4 py-3 border-2 border-slate-200 focus:border-[#6C5CE7] rounded-xl bg-slate-50 text-[#2D3436] font-bold focus:outline-none text-sm transition-all animate-fadeIn"
                    >
                      <option value="">-- Chọn lớp học --</option>
                      {classes.map((cls) => (
                        <option key={cls} value={cls}>
                          Lớp {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Step 3: Chọn học sinh */}
                {selectedSchool && selectedClass && (
                  <div>
                    <label className="block text-xs font-black text-[#2D3436] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#6C5CE7]" /> Bước 3: Chọn Họ và tên học sinh
                    </label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="block w-full px-4 py-3 border-2 border-slate-200 focus:border-[#6C5CE7] rounded-xl bg-slate-50 text-[#2D3436] font-bold focus:outline-none text-sm transition-all animate-fadeIn"
                    >
                      <option value="">-- Chọn tên học sinh --</option>
                      {studentsList.map((stud) => (
                        <option key={stud.id} value={stud.id}>
                          {stud.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Step 4: Nhập mật khẩu */}
                {selectedSchool && selectedClass && selectedStudentId && (
                  <div className="animate-fadeIn">
                    <label className="block text-xs font-black text-[#2D3436] uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-[#6C5CE7]" /> Bước 4: Nhập mật khẩu tài khoản
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#2D3436] opacity-60">
                        <Key className="h-5 w-5" />
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Nhập mật khẩu..."
                        className="block w-full pl-10 pr-4 py-3 border-2 border-slate-200 focus:border-[#6C5CE7] rounded-xl bg-slate-50 text-[#2D3436] placeholder-slate-400 font-bold focus:outline-none text-sm transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // ADMIN LOGIN INPUTS
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-black text-[#2D3436] uppercase tracking-wider mb-1">
                    Tên tài khoản admin
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#2D3436] opacity-60">
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="Ví dụ: admin"
                      className="block w-full pl-10 pr-4 py-3 border-2 border-slate-200 focus:border-[#6C5CE7] rounded-xl bg-slate-50 text-[#2D3436] placeholder-slate-400 font-bold focus:outline-none text-sm transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-[#2D3436] uppercase tracking-wider mb-1">
                    Mật khẩu admin
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#2D3436] opacity-60">
                      <Key className="h-5 w-5" />
                    </div>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Mật khẩu quản trị..."
                      className="block w-full pl-10 pr-4 py-3 border-2 border-slate-200 focus:border-[#6C5CE7] rounded-xl bg-slate-50 text-[#2D3436] placeholder-slate-400 font-bold focus:outline-none text-sm transition-all"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              id="btn_login_submit"
              className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-2xl shadow-md text-sm font-black text-white bg-[#6C5CE7] border-b-4 border-[#4834D4] hover:bg-[#4834D4] transition-all scale-100 active:scale-95 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  ĐANG XÁC THỰC... <RefreshCw className="w-4 h-4 animate-spin" />
                </>
              ) : (
                <>
                  VÀO THÁM HIỂM NGAY <Play className="w-4 h-4 fill-white" />
                </>
              )}
            </button>
          </form>

          {/* GOOGLE SHEETS CONFIGURATION PANEL */}
          <div className="border-t border-slate-100 mt-4 pt-4 flex flex-col items-center">
            <button
              type="button"
              onClick={() => setShowConfig(!showConfig)}
              className="text-xs text-slate-500 hover:text-[#6C5CE7] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Settings className={`w-3.5 h-3.5 ${showConfig ? 'animate-spin' : ''}`} /> {showConfig ? 'Ẩn Cấu Hình Google Sheets' : 'Cấu hình Google Sheets (Đồng bộ)'}
            </button>
          </div>

          <AnimatePresence>
            {showConfig && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-slate-100 overflow-hidden"
              >
                <form onSubmit={handleSaveConfig} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-[#2D3436] uppercase tracking-wider flex items-center gap-1.5">
                      <Settings className="w-3.5 h-3.5 text-[#6C5CE7]" /> Thiết Lập Apps Script
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowConfig(false)}
                      className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                    >
                      Đóng
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Dán URL ứng dụng web của Google Apps Script của bạn vào đây để đồng bộ học sinh, đề thi, câu hỏi và lưu trữ kết quả thi trực tiếp lên Google Sheets của bạn.
                  </p>

                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={sheetUrlInput}
                      onChange={(e) => {
                        setSheetUrlInput(e.target.value);
                        if (configStatus !== 'idle') setConfigStatus('idle');
                      }}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="block w-full px-3 py-2 border-2 border-slate-200 focus:border-[#6C5CE7] rounded-xl bg-slate-50 text-xs font-semibold text-[#2D3436] focus:outline-none transition-all"
                    />
                  </div>

                  {configStatus === 'testing' && (
                    <div className="p-2.5 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-[11px] font-bold flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {configMessage}
                    </div>
                  )}

                  {configStatus === 'success' && (
                    <div className="p-2.5 bg-green-50 border-2 border-green-400 text-green-700 rounded-xl text-[11px] font-bold flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                      <div>{configMessage}</div>
                    </div>
                  )}

                  {configStatus === 'error' && (
                    <div className="p-2.5 bg-red-50 border-2 border-red-400 text-red-700 rounded-xl text-[11px] font-bold flex flex-col gap-1.5">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>{configMessage}</div>
                      </div>
                      <div className="bg-white p-2.5 rounded border border-red-200 text-[10px] text-slate-600 font-normal leading-relaxed space-y-1">
                        <p className="font-bold text-[#D63031]">HƯỚNG DẪN SỬA LỖI ĐĂNG NHẬP / KẾT NỐI:</p>
                        <p><strong>1. Tránh copy nhầm link file Sheets:</strong> Không dán link <code>https://docs.google.com/spreadsheets/...</code>. Link này chỉ là link xem file, không chạy được API.</p>
                        <p><strong>2. Cách lấy URL đúng từ Apps Script:</strong></p>
                        <ul className="list-disc pl-4 space-y-0.5 text-slate-500">
                          <li>Mở file Trang tính của bạn &rarr; Chọn <strong>Tiện ích mở rộng (Extensions)</strong> &rarr; <strong>Apps Script</strong>.</li>
                          <li>Bấm nút <strong>Triển khai (Deploy)</strong> &rarr; <strong>Tập lệnh triển khai mới (New deployment)</strong>.</li>
                          <li>Chọn loại là <strong>Ứng dụng web (Web app)</strong>.</li>
                          <li>Mục <strong>Who has access (Ai có quyền truy cập)</strong>: Bắt buộc chọn <strong>Anyone (Bất kỳ ai)</strong>.</li>
                          <li>Bấm <strong>Triển khai (Deploy)</strong> và cấp quyền &rarr; Sao chép <strong>URL Ứng dụng web (Web App URL)</strong> có đuôi là <code>/exec</code> và dán vào đây!</li>
                        </ul>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={configStatus === 'testing'}
                      className="flex-1 py-2 px-3 bg-[#6C5CE7] hover:bg-[#5849C4] text-white text-xs font-black rounded-xl border-b-2 border-[#4834D4] hover:border-b-0 transition-all cursor-pointer disabled:opacity-50 text-center"
                    >
                      {configStatus === 'testing' ? 'ĐANG KẾT NỐI...' : 'LƯU & ĐỒNG BỘ'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSheetUrlInput('');
                        setGoogleSheetUrl('');
                        const freshStudents = getStudents();
                        setAllStudents(freshStudents);
                        setSelectedSchool('');
                        setSelectedClass('');
                        setSelectedStudentId('');
                        setConfigStatus('success');
                        setConfigMessage('Đã xóa cấu hình Apps Script tùy chỉnh. Hệ thống đã khôi phục sử dụng Cơ sở dữ liệu Ngoại tuyến (Offline Local Storage).');
                      }}
                      className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer text-center"
                    >
                      DÙNG OFFLINE
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Support instructions bubble */}
        <div className="mt-6 bg-indigo-50/70 p-4.5 rounded-2xl border border-indigo-100 text-center text-indigo-950 font-semibold text-xs leading-relaxed max-w-lg mx-auto">
          {role === 'student'
            ? '💡 Bạn chỉ cần chọn Trường, Lớp và tên của mình rồi nhập mật khẩu là có thể thám hiểm ngay. Không cần gõ tay mã học sinh nữa đâu nhé! 🌟'
            : '💡 Chào thầy cô giáo! Hãy đăng nhập bằng tài khoản quản trị để xem thống kê học lực toàn trường và quản lý đề thi linh hoạt nhé!'}
        </div>
      </div>
    </div>
  );
}
