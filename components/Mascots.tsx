import React from 'react';
import { motion } from 'motion/react';
import { Bot, HelpCircle, Sparkles } from 'lucide-react';

export type MascotType = 'robot' | 'fox' | 'panda';
export type MascotMood = 'happy' | 'thinking' | 'sad' | 'excited' | 'idle';

interface MascotProps {
  type: MascotType;
  mood?: MascotMood;
  speechBubble?: string;
  className?: string;
  animate?: boolean;
}

export const MASCOT_DETAILS = {
  robot: {
    name: 'Robot IC3 🤖',
    color: 'bg-cyan-500',
    borderColor: 'border-cyan-400',
    textColor: 'text-cyan-800',
    lightBg: 'bg-cyan-50',
    accentColor: 'text-cyan-500',
    description: 'Bậc thầy về Phần cứng, Hệ điều hành và An ninh mạng (Computing Fundamentals).',
    emoji: '🤖',
  },
  fox: {
    name: 'Cáo Công Nghệ 🦊',
    color: 'bg-amber-500',
    borderColor: 'border-amber-400',
    textColor: 'text-amber-800',
    lightBg: 'bg-amber-50',
    accentColor: 'text-amber-500',
    description: 'Chuyên gia về ứng dụng văn phòng Excel, Word, PowerPoint (Key Applications).',
    emoji: '🦊',
  },
  panda: {
    name: 'Panda IT 🐼',
    color: 'bg-teal-500',
    borderColor: 'border-teal-400',
    textColor: 'text-teal-800',
    lightBg: 'bg-teal-50',
    accentColor: 'text-teal-500',
    description: 'Đại sứ về mạng máy tính, làm việc cộng tác và an toàn trực tuyến (Living Online).',
    emoji: '🐼',
  },
};

export default function Mascot({ type, mood = 'idle', speechBubble, className = '', animate = true }: MascotProps) {
  const details = MASCOT_DETAILS[type] || MASCOT_DETAILS.robot;

  // Lấy ra hình thù/emoji tương ứng
  const getMascotIcon = () => {
    switch (type) {
      case 'robot':
        return (
          <div className="relative w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
            <Bot className="w-10 h-10 text-white animate-pulse" />
            <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1 shadow">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        );
      case 'fox':
        return (
          <div className="relative w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
            <span className="text-4xl md:text-5xl select-none">🦊</span>
            <div className="absolute -top-1 -right-1 bg-pink-500 rounded-full p-1 shadow">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        );
      case 'panda':
        return (
          <div className="relative w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
            <span className="text-4xl md:text-5xl select-none">🐼</span>
            <div className="absolute -top-1 -right-1 bg-purple-500 rounded-full p-1 shadow">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
        );
    }
  };

  // Trạng thái nhảy hoạt hình của mascot
  const getAnimationVariants = (): any => {
    if (!animate) return {};
    switch (mood) {
      case 'happy':
      case 'excited':
        return {
          animate: {
            y: [0, -15, 0, -8, 0],
            rotate: [0, -5, 5, -5, 0],
            transition: { duration: 0.8, repeat: Infinity, repeatDelay: 1 },
          },
        };
      case 'thinking':
        return {
          animate: {
            rotate: [0, -3, 3, 0],
            scale: [1, 1.03, 1],
            transition: { duration: 1.5, repeat: Infinity },
          },
        };
      case 'sad':
        return {
          animate: {
            y: [0, 3, 0],
            scaleY: [1, 0.95, 1],
            transition: { duration: 2, repeat: Infinity },
          },
        };
      case 'idle':
      default:
        return {
          animate: {
            y: [0, -5, 0],
            transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
          },
        };
    }
  };

  return (
    <div className={`flex items-start gap-4 ${className}`} id={`mascot_${type}`}>
      <motion.div
        variants={getAnimationVariants()}
        animate="animate"
        className="flex-shrink-0"
      >
        {getMascotIcon()}
        <div className="text-center mt-1">
          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${details.color} text-white shadow-sm`}>
            {details.name}
          </span>
        </div>
      </motion.div>

      {speechBubble && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: -10 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          className="relative flex-1"
        >
          <div className="absolute top-5 -left-2 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-white border-b-8 border-b-transparent drop-shadow-md"></div>
          <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-100">
            <p className="text-slate-700 text-sm font-medium leading-relaxed">
              {speechBubble}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
