'use client';

import React, { useState, useEffect } from 'react';
import { Student, Test, getStudents, initDB } from '../lib/db';
import { syncDatabaseFromGoogleSheets, saveLogToGoogleSheet } from '../lib/sheets';
import LoginScreen from '../components/LoginScreen';
import StudentDashboard from '../components/StudentDashboard';
import ExamRoom from '../components/ExamRoom';
import AdminDashboard from '../components/AdminDashboard';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw } from 'lucide-react';

export default function Home() {
  const [isDbReady, setIsDbReady] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<'student' | 'admin' | null>(null);
  const [activeTest, setActiveTest] = useState<{ test: Test; mode: 'practice' | 'exam' | 'race' } | null>(null);

  // Khởi tạo cơ sở dữ liệu và đồng bộ từ Google Sheets trên Client-side
  useEffect(() => {
    async function initAndSync() {
      // Đảm bảo dữ liệu local luôn có sẵn để tránh rỗng dropdown khi đồng bộ lỗi
      if (typeof window !== 'undefined') {
        initDB();
      }
      try {
        // Tải dữ liệu thực từ Google Sheets trước
        await syncDatabaseFromGoogleSheets();
      } catch (err) {
        console.warn('Failed to sync from Google Sheets on load, using offline storage:', err);
      } finally {
        setIsDbReady(true);
      }

      // Kiểm tra xem đã có phiên đăng nhập lưu trước đó chưa
      const savedUser = localStorage.getItem('ic3_current_user');
      const savedRole = localStorage.getItem('ic3_current_role');

      if (savedUser && savedRole) {
        try {
          const parsedUser = JSON.parse(savedUser);
          if (savedRole === 'student') {
            const freshStudents = getStudents();
            const fresh = freshStudents.find(s => s.id === parsedUser.id);
            if (fresh) {
              setCurrentUser(fresh);
              setUserRole('student');
            } else {
              setCurrentUser(parsedUser);
              setUserRole('student');
            }
          } else {
            setCurrentUser(parsedUser);
            setUserRole('admin');
          }
        } catch (e) {
          console.warn("Lỗi phục hồi phiên đăng nhập: ", e);
        }
      }
    }
    
    initAndSync();
  }, []);

  // Xử lý khi Đăng nhập thành công
  const handleLoginSuccess = (payload: { role: 'student' | 'admin'; data: any }) => {
    setCurrentUser(payload.data);
    setUserRole(payload.role);
    localStorage.setItem('ic3_current_user', JSON.stringify(payload.data));
    localStorage.setItem('ic3_current_role', payload.role);
  };

  // Xử lý Đăng xuất
  const handleLogout = () => {
    if (currentUser && userRole === 'student') {
      try {
        saveLogToGoogleSheet({
          student_id: currentUser.id,
          fullname: currentUser.name,
          school: currentUser.school || '',
          class: currentUser.class || '',
          status: 'Logout'
        });
      } catch (e) {
        console.warn('Lỗi lưu nhật ký đăng xuất:', e);
      }
    }
    setCurrentUser(null);
    setUserRole(null);
    setActiveTest(null);
    localStorage.removeItem('ic3_current_user');
    localStorage.removeItem('ic3_current_role');
  };


  // Khi học sinh chọn một bộ đề
  const handleSelectTest = (test: Test, mode: 'practice' | 'exam' | 'race') => {
    setActiveTest({ test, mode });
  };

  // Trở lại Dashboard học sinh từ phòng thi
  const handleBackToDashboard = () => {
    setActiveTest(null);
    
    // Đồng bộ lại dữ liệu học sinh mới nhất (do kết quả thi làm thay đổi điểm trung bình, streak, huy hiệu...)
    if (currentUser && userRole === 'student') {
      const freshStudents = getStudents();
      const fresh = freshStudents.find(s => s.id === currentUser.id);
      if (fresh) {
        setCurrentUser(fresh);
      }
    }
  };

  if (!isDbReady) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4">
        <RefreshCw className="w-10 h-10 animate-spin text-indigo-400" />
        <p className="text-slate-400 font-bold text-sm">Đang tải vũ trụ kiến thức IC3 GS6...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      <AnimatePresence mode="wait">
        {/* 1. MÀN HÌNH ĐĂNG NHẬP (Chưa đăng nhập) */}
        {!currentUser && (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <LoginScreen onLoginSuccess={handleLoginSuccess} />
          </motion.div>
        )}

        {/* 2. GIAO DIỆN HỌC SINH */}
        {currentUser && userRole === 'student' && (
          <motion.div
            key="student_space"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {activeTest ? (
              // Phòng thi / Luyện tập
              <ExamRoom
                test={activeTest.test}
                studentId={currentUser.id}
                mode={activeTest.mode}
                onBackToDashboard={handleBackToDashboard}
              />
            ) : (
              // Bảng điều khiển học sinh
              <StudentDashboard
                student={currentUser}
                onLogout={handleLogout}
                onSelectTest={handleSelectTest}
              />
            )}
          </motion.div>
        )}

        {/* 3. GIAO DIỆN GIÁO VIÊN / ADMIN */}
        {currentUser && userRole === 'admin' && (
          <motion.div
            key="admin_space"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AdminDashboard
              adminData={currentUser}
              onLogout={handleLogout}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
