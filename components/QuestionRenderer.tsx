import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Question, QuestionType, IC3Category } from '../lib/db';
import Mascot from './Mascots';
import { Check, X, ArrowUp, ArrowDown, HelpCircle, Eye, AlertCircle } from 'lucide-react';

interface QuestionRendererProps {
  question: Question;
  userAnswer: any;
  onChangeAnswer: (answer: any) => void;
  isSubmitted: boolean; // Đã kiểm tra (ở chế độ Luyện tập) hoặc Đã nộp bài (ở chế độ Kiểm tra)
  mode: 'practice' | 'exam';
  onCheckAnswer?: () => void; // Cho chế độ Luyện tập
}

export default function QuestionRenderer({
  question,
  userAnswer,
  onChangeAnswer,
  isSubmitted,
  mode,
  onCheckAnswer,
}: QuestionRendererProps) {
  // Trạng thái cục bộ cho Matching
  const [matchingSelections, setMatchingSelections] = useState<number[]>(() => {
    if (question.type === QuestionType.MATCHING) {
      return userAnswer || Array(question.options?.itemsA?.length || 0).fill(-1);
    }
    return [];
  });

  // Trạng thái cho Drag & Drop (Click to place)
  const [selectedWordIndex, setSelectedWordIndex] = useState<number | null>(null);
  const [dragDropAnswers, setDragDropAnswers] = useState<string[]>(() => {
    if (question.type === QuestionType.DRAG_DROP) {
      const blanksCount = (question.options?.textWithBlanks?.match(/\[blank\d+\]/g) || []).length;
      return userAnswer || Array(blanksCount).fill('');
    }
    return [];
  });

  // Trạng thái cho Sequence Ordering
  const [sequenceItems, setSequenceItems] = useState<string[]>(() => {
    if (question.type === QuestionType.SEQUENCE) {
      if (userAnswer) {
        return userAnswer.map((idx: number) => question.options[idx]);
      }
      return [...(question.options || [])];
    }
    return [];
  });

  // Xác định mascot loại gì cho câu hỏi
  const getMascotType = (): 'robot' | 'fox' | 'panda' => {
    if (question.category === IC3Category.COMPUTING_FUNDAMENTALS) return 'robot';
    if (question.category === IC3Category.KEY_APPLICATIONS) return 'fox';
    return 'panda';
  };

  const mascotType = getMascotType();

  // --- 1. MULTIPLE CHOICE ---
  const renderMultipleChoice = () => {
    const options = question.options || [];
    return (
      <div className="space-y-3" id={`q_mcq_${question.id}`}>
        {options.map((opt: string, idx: number) => {
          const isSelected = userAnswer === idx;
          const isCorrectAnswer = question.correctAnswer === idx;
          let btnClass = 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/50';
          let icon = null;

          if (isSelected) {
            btnClass = 'border-blue-500 bg-blue-50 text-blue-900 font-medium';
          }

          if (isSubmitted) {
            if (isCorrectAnswer) {
              btnClass = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium';
              icon = <Check className="w-5 h-5 text-emerald-600" />;
            } else if (isSelected) {
              btnClass = 'border-rose-500 bg-rose-50 text-rose-900';
              icon = <X className="w-5 h-5 text-rose-600" />;
            } else {
              btnClass = 'border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed';
            }
          }

          return (
            <button
              key={idx}
              id={`opt_mcq_${idx}`}
              disabled={isSubmitted}
              onClick={() => onChangeAnswer(idx)}
              className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-3 text-sm md:text-base ${btnClass}`}
            >
              <div className="flex items-center gap-3">
                <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{opt}</span>
              </div>
              {icon}
            </button>
          );
        })}
      </div>
    );
  };

  // --- 2. MULTIPLE RESPONSE ---
  const renderMultipleResponse = () => {
    const options = question.options || [];
    const currentAnswers: number[] = userAnswer || [];

    const handleToggle = (idx: number) => {
      if (isSubmitted) return;
      if (currentAnswers.includes(idx)) {
        onChangeAnswer(currentAnswers.filter(i => i !== idx));
      } else {
        onChangeAnswer([...currentAnswers, idx].sort());
      }
    };

    return (
      <div className="space-y-3" id={`q_mr_${question.id}`}>
        <p className="text-xs text-amber-600 font-semibold flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg w-max mb-2">
          <AlertCircle className="w-4 h-4" /> Hãy chọn tất cả các đáp án đúng.
        </p>
        {options.map((opt: string, idx: number) => {
          const isSelected = currentAnswers.includes(idx);
          const isCorrectAnswer = (question.correctAnswer as number[]).includes(idx);
          let btnClass = 'border-slate-200 hover:border-purple-400 hover:bg-purple-50/50';
          let icon = null;

          if (isSelected) {
            btnClass = 'border-purple-500 bg-purple-50 text-purple-900 font-medium';
          }

          if (isSubmitted) {
            if (isCorrectAnswer) {
              btnClass = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium';
              icon = <Check className="w-5 h-5 text-emerald-600" />;
            } else if (isSelected) {
              btnClass = 'border-rose-500 bg-rose-50 text-rose-900';
              icon = <X className="w-5 h-5 text-rose-600" />;
            } else {
              btnClass = 'border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed';
            }
          }

          return (
            <button
              key={idx}
              id={`opt_mr_${idx}`}
              disabled={isSubmitted}
              onClick={() => handleToggle(idx)}
              className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-3 text-sm md:text-base ${btnClass}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-purple-500 border-purple-500 text-white' : 'border-slate-300'}`}>
                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>
                <span>{opt}</span>
              </div>
              {icon}
            </button>
          );
        })}
      </div>
    );
  };

  // --- 3. TRUE / FALSE ---
  const renderTrueFalse = () => {
    const handleSelect = (val: boolean) => {
      if (isSubmitted) return;
      onChangeAnswer(val);
    };

    const isSelectedTrue = userAnswer === true;
    const isSelectedFalse = userAnswer === false;

    return (
      <div className="grid grid-cols-2 gap-4" id={`q_tf_${question.id}`}>
        {/* Nút TRUE */}
        <button
          disabled={isSubmitted}
          onClick={() => handleSelect(true)}
          className={`p-6 rounded-2xl border-2 text-center transition-all ${
            isSelectedTrue
              ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold scale-[1.02]'
              : 'border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 text-slate-700'
          } ${isSubmitted && question.correctAnswer === true ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300' : ''} ${isSubmitted && isSelectedTrue && question.correctAnswer !== true ? 'border-rose-500 bg-rose-50' : ''}`}
        >
          <div className="text-3xl mb-2">👍</div>
          <span className="text-base font-bold">ĐÚNG (True)</span>
        </button>

        {/* Nút FALSE */}
        <button
          disabled={isSubmitted}
          onClick={() => handleSelect(false)}
          className={`p-6 rounded-2xl border-2 text-center transition-all ${
            isSelectedFalse
              ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold scale-[1.02]'
              : 'border-slate-200 hover:border-rose-400 hover:bg-rose-50/20 text-slate-700'
          } ${isSubmitted && question.correctAnswer === false ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-300' : ''} ${isSubmitted && isSelectedFalse && question.correctAnswer !== false ? 'border-rose-500 bg-rose-50' : ''}`}
        >
          <div className="text-3xl mb-2">👎</div>
          <span className="text-base font-bold">SAI (False)</span>
        </button>
      </div>
    );
  };

  // --- 4. MATCHING ---
  const renderMatching = () => {
    const itemsA: string[] = question.options?.itemsA || [];
    const itemsB: string[] = question.options?.itemsB || [];

    const handleSelectMatch = (aIdx: number, bIdxStr: string) => {
      if (isSubmitted) return;
      const bIdx = parseInt(bIdxStr);
      const newSelections = [...matchingSelections];
      newSelections[aIdx] = bIdx;
      setMatchingSelections(newSelections);
      onChangeAnswer(newSelections);
    };

    return (
      <div className="space-y-4" id={`q_matching_${question.id}`}>
        <p className="text-xs text-amber-600 font-semibold flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg w-max mb-2">
          <AlertCircle className="w-4 h-4" /> Hãy nối các mục ở Cột A với Cột B bằng cách chọn tương ứng.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          {/* Cột A */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-700 text-sm border-b pb-2">CỘT A</h4>
            {itemsA.map((item: string, aIdx: number) => {
              const selectedBIdx = matchingSelections[aIdx];
              const correctBIdx = question.correctAnswer[aIdx];
              const isMatchCorrect = selectedBIdx === correctBIdx;

              let borderClass = 'border-slate-200 bg-white';
              if (isSubmitted) {
                borderClass = isMatchCorrect ? 'border-emerald-400 bg-emerald-50/30' : 'border-rose-400 bg-rose-50/30';
              } else if (selectedBIdx !== -1) {
                borderClass = 'border-indigo-400 bg-indigo-50/10';
              }

              return (
                <div key={aIdx} className={`p-3 rounded-xl border flex items-center justify-between gap-3 shadow-sm ${borderClass}`}>
                  <span className="font-semibold text-slate-800 text-sm">{item}</span>

                  <select
                    disabled={isSubmitted}
                    value={selectedBIdx === -1 ? '' : selectedBIdx.toString()}
                    onChange={(e) => handleSelectMatch(aIdx, e.target.value)}
                    className="p-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 max-w-[150px] md:max-w-[200px]"
                  >
                    <option value="">-- Chọn nối với --</option>
                    {itemsB.map((itemB: string, bIdx: number) => {
                      // Kiểm tra xem option này có đang được chọn bởi dòng khác không để tránh gán trùng (tùy chọn)
                      return (
                        <option key={bIdx} value={bIdx.toString()}>
                          {itemB}
                        </option>
                      );
                    })}
                  </select>
                </div>
              );
            })}
          </div>

          {/* Cột B tham khảo */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-700 text-sm border-b pb-2">CỘT B (Danh sách lựa chọn)</h4>
            <div className="space-y-2">
              {itemsB.map((item: string, idx: number) => (
                <div key={idx} className="p-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-600 flex items-center gap-2">
                  <span className="w-5 h-5 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold text-[10px]">
                    {idx + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hiển thị đáp án đúng khi nộp bài */}
        {isSubmitted && (
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-800 mt-2">
            <p className="font-bold mb-1">🎯 Đáp án nối đúng:</p>
            <ul className="list-disc list-inside space-y-1">
              {itemsA.map((item: string, aIdx: number) => (
                <li key={aIdx}>
                  <span className="font-semibold">{item}</span> ➔ {itemsB[question.correctAnswer[aIdx]]}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // --- 5. DRAG AND DROP (Click to Place) ---
  const renderDragDrop = () => {
    const textWithBlanks: string = question.options?.textWithBlanks || '';
    const items: string[] = question.options?.items || [];

    // Chia văn bản thành các đoạn và chỗ trống
    const parts = textWithBlanks.split(/(\[blank\d+\])/g);

    const handleWordSelect = (idx: number) => {
      if (isSubmitted) return;
      setSelectedWordIndex(selectedWordIndex === idx ? null : idx);
    };

    const handleBlankClick = (blankIdx: number) => {
      if (isSubmitted || selectedWordIndex === null) return;
      const wordToPlace = items[selectedWordIndex];

      const newAnswers = [...dragDropAnswers];
      newAnswers[blankIdx] = wordToPlace;
      setDragDropAnswers(newAnswers);
      onChangeAnswer(newAnswers);

      setSelectedWordIndex(null); // Reset
    };

    const handleClearBlank = (blankIdx: number) => {
      if (isSubmitted) return;
      const newAnswers = [...dragDropAnswers];
      newAnswers[blankIdx] = '';
      setDragDropAnswers(newAnswers);
      onChangeAnswer(newAnswers);
    };

    // Tìm xem từ vựng đã được dùng chưa
    const isWordUsed = (word: string) => dragDropAnswers.includes(word);

    let blankCounter = 0;

    return (
      <div className="space-y-4" id={`q_dragdrop_${question.id}`}>
        <p className="text-xs text-indigo-600 font-semibold flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg w-max mb-1">
          <AlertCircle className="w-4 h-4" /> Hướng dẫn: Chọn từ ở dưới rồi nhấn vào [Chỗ trống] tương ứng để điền.
        </p>

        {/* Đoạn văn chứa chỗ trống */}
        <div className="p-5 bg-amber-50/30 rounded-2xl border border-amber-100 text-base leading-loose text-slate-800">
          {parts.map((part, index) => {
            if (part.match(/\[blank\d+\]/)) {
              const currentBlankIdx = blankCounter;
              blankCounter++;

              const filledWord = dragDropAnswers[currentBlankIdx];
              const isCorrect = filledWord === question.correctAnswer[currentBlankIdx];

              let blankClass = 'border-slate-300 bg-white text-slate-700 hover:border-indigo-400';
              if (filledWord) {
                blankClass = 'border-indigo-500 bg-indigo-50 text-indigo-900 font-bold';
              }
              if (isSubmitted) {
                blankClass = isCorrect
                  ? 'border-emerald-500 bg-emerald-100 text-emerald-900 font-bold'
                  : 'border-rose-500 bg-rose-100 text-rose-900 font-bold';
              }

              return (
                <button
                  key={index}
                  disabled={isSubmitted}
                  onClick={() => handleBlankClick(currentBlankIdx)}
                  className={`mx-1.5 px-3 py-1 rounded-lg border-2 border-dashed min-w-[100px] text-center inline-flex items-center justify-center gap-1 transition-all text-sm h-9 align-middle ${blankClass}`}
                >
                  <span>{filledWord || `[Chỗ trống ${currentBlankIdx + 1}]`}</span>
                  {filledWord && !isSubmitted && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClearBlank(currentBlankIdx);
                      }}
                      className="ml-1 text-slate-400 hover:text-slate-600 font-bold text-xs p-0.5 bg-slate-100 rounded-full w-4 h-4 flex items-center justify-center"
                    >
                      ×
                    </span>
                  )}
                  {isSubmitted && (
                    <span>
                      {isCorrect ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-rose-600" />}
                    </span>
                  )}
                </button>
              );
            }
            return <span key={index}>{part}</span>;
          })}
        </div>

        {/* Danh sách từ vựng */}
        <div className="flex flex-wrap gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
          {items.map((word: string, idx: number) => {
            const isSelected = selectedWordIndex === idx;
            const isUsed = isWordUsed(word);

            let chipClass = 'border-slate-200 bg-white hover:border-indigo-400 text-slate-700';
            if (isUsed) {
              chipClass = 'opacity-40 border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed';
            } else if (isSelected) {
              chipClass = 'border-indigo-600 bg-indigo-600 text-white font-bold ring-2 ring-indigo-300';
            }

            return (
              <button
                key={idx}
                id={`drag_word_${idx}`}
                disabled={isSubmitted || isUsed}
                onClick={() => handleWordSelect(idx)}
                className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all shadow-sm ${chipClass}`}
              >
                {word}
              </button>
            );
          })}
        </div>

        {/* Hiển thị kết quả đúng khi nộp bài */}
        {isSubmitted && (
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-800 mt-2">
            <p className="font-bold mb-1">🎯 Đáp án đúng:</p>
            <p className="italic">
              {question.correctAnswer.map((word: string, idx: number) => `(Chỗ trống ${idx + 1}): "${word}"`).join(', ')}
            </p>
          </div>
        )}
      </div>
    );
  };

  // --- 6. FILL IN THE BLANK ---
  const renderFillBlank = () => {
    const handleTextChange = (val: string) => {
      if (isSubmitted) return;
      onChangeAnswer(val);
    };

    const isAnswerCorrect = () => {
      if (!userAnswer) return false;
      const cleanUser = userAnswer.toString().trim().toLowerCase();
      const possibleAnswers: string[] = Array.isArray(question.correctAnswer)
        ? question.correctAnswer
        : [question.correctAnswer];
      return possibleAnswers.some((ans: string) => ans.trim().toLowerCase() === cleanUser);
    };

    let inputBorderClass = 'border-slate-200 focus:ring-blue-500';
    if (isSubmitted) {
      inputBorderClass = isAnswerCorrect()
        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-200'
        : 'border-rose-500 bg-rose-50 text-rose-900 ring-2 ring-rose-200';
    }

    return (
      <div className="space-y-3" id={`q_fillblank_${question.id}`}>
        <p className="text-sm font-semibold text-slate-700">Câu trả lời của bạn:</p>
        <div className="relative max-w-md">
          <input
            type="text"
            id={`input_fillblank_${question.id}`}
            disabled={isSubmitted}
            value={userAnswer || ''}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Gõ đáp án của bạn tại đây..."
            className={`w-full p-4 pr-12 rounded-xl border-2 text-base outline-none transition-all ${inputBorderClass}`}
          />
          {isSubmitted && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {isAnswerCorrect() ? <Check className="w-6 h-6 text-emerald-600" /> : <X className="w-6 h-6 text-rose-600" />}
            </div>
          )}
        </div>

        {isSubmitted && (
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-800 mt-2 max-w-md">
            <p className="font-bold">🎯 Đáp án đúng:</p>
            <p className="font-medium text-sm">
              {Array.isArray(question.correctAnswer) ? question.correctAnswer.join(' hoặc ') : question.correctAnswer}
            </p>
          </div>
        )}
      </div>
    );
  };

  // --- 7. DROPDOWN SELECTION ---
  const renderDropdown = () => {
    const textWithDropdowns: string = question.options?.textWithDropdowns || '';
    const dropdownOptions: string[][] = question.options?.dropdownOptions || [];

    const parts = textWithDropdowns.split(/(\[drop\d+\])/g);

    const handleSelectDropdown = (dropIdx: number, val: string) => {
      if (isSubmitted) return;
      const currentSelections = userAnswer || Array(dropdownOptions.length).fill('');
      const newSelections = [...currentSelections];
      newSelections[dropIdx] = val;
      onChangeAnswer(newSelections);
    };

    let dropCounter = 0;

    return (
      <div className="space-y-4" id={`q_dropdown_${question.id}`}>
        <div className="p-5 bg-blue-50/30 rounded-2xl border border-blue-100 text-base leading-loose text-slate-800">
          {parts.map((part, index) => {
            if (part.match(/\[drop\d+\]/)) {
              const currentDropIdx = dropCounter;
              dropCounter++;

              const options = dropdownOptions[currentDropIdx] || [];
              const currentVal = userAnswer ? userAnswer[currentDropIdx] : '';
              const isCorrect = currentVal === question.correctAnswer[currentDropIdx];

              let selectClass = 'border-slate-300 bg-white text-slate-700 focus:ring-blue-500';
              if (currentVal) {
                selectClass = 'border-blue-500 bg-blue-50 text-blue-900 font-bold';
              }
              if (isSubmitted) {
                selectClass = isCorrect
                  ? 'border-emerald-500 bg-emerald-100 text-emerald-900'
                  : 'border-rose-500 bg-rose-100 text-rose-900';
              }

              return (
                <select
                  key={index}
                  disabled={isSubmitted}
                  value={currentVal}
                  onChange={(e) => handleSelectDropdown(currentDropIdx, e.target.value)}
                  className={`mx-1.5 px-3 py-1.5 border-2 rounded-lg text-sm bg-white font-medium focus:outline-none transition-all ${selectClass}`}
                >
                  <option value="">-- Chọn --</option>
                  {options.map((opt, oIdx) => (
                    <option key={oIdx} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              );
            }
            return <span key={index}>{part}</span>;
          })}
        </div>

        {/* Hiển thị đáp án đúng khi nộp bài */}
        {isSubmitted && (
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-800 mt-2">
            <p className="font-bold mb-1">🎯 Lựa chọn đúng:</p>
            <p className="italic">
              {question.correctAnswer.map((word: string, idx: number) => `(Vị trí ${idx + 1}): "${word}"`).join(', ')}
            </p>
          </div>
        )}
      </div>
    );
  };

  // --- 8. IMAGE-BASED QUESTION ---
  const renderImageBased = () => {
    const options = question.options || [];
    return (
      <div className="space-y-4" id={`q_image_${question.id}`}>
        {question.imageUrl && (
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm max-w-2xl mx-auto">
            <img
              src={question.imageUrl}
              alt="Minh họa câu hỏi"
              className="w-full h-auto max-h-[250px] object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur text-white px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" /> Hình ảnh minh họa
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {options.map((opt: string, idx: number) => {
            const isSelected = userAnswer === idx;
            const isCorrectAnswer = question.correctAnswer === idx;
            let btnClass = 'border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 bg-white';
            let icon = null;

            if (isSelected) {
              btnClass = 'border-teal-500 bg-teal-50 text-teal-900 font-medium';
            }

            if (isSubmitted) {
              if (isCorrectAnswer) {
                btnClass = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium';
                icon = <Check className="w-5 h-5 text-emerald-600" />;
              } else if (isSelected) {
                btnClass = 'border-rose-500 bg-rose-50 text-rose-900';
                icon = <X className="w-5 h-5 text-rose-600" />;
              } else {
                btnClass = 'border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed';
              }
            }

            return (
              <button
                key={idx}
                id={`opt_img_${idx}`}
                disabled={isSubmitted}
                onClick={() => onChangeAnswer(idx)}
                className={`p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-3 text-sm md:text-base ${btnClass}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isSelected ? 'bg-teal-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{opt}</span>
                </div>
                {icon}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // --- 9. SCENARIO QUESTION ---
  const renderScenario = () => {
    const options = question.options || [];
    return (
      <div className="space-y-4" id={`q_scenario_${question.id}`}>
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 p-4 rounded-2xl border border-indigo-100 flex gap-4 items-start shadow-sm">
          <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600 font-bold text-xs flex items-center justify-center flex-shrink-0">
            🎬 Tình Huống
          </div>
          <p className="text-slate-700 font-semibold text-sm leading-relaxed">
            Hãy đặt mình vào vị trí nhân vật để xử lý tình huống thực tế bám sát chuẩn kiến thức IC3 GS6 này nhé!
          </p>
        </div>

        <div className="space-y-3">
          {options.map((opt: string, idx: number) => {
            const isSelected = userAnswer === idx;
            const isCorrectAnswer = question.correctAnswer === idx;
            let btnClass = 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 bg-white';
            let icon = null;

            if (isSelected) {
              btnClass = 'border-indigo-500 bg-indigo-50 text-indigo-900 font-medium';
            }

            if (isSubmitted) {
              if (isCorrectAnswer) {
                btnClass = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-medium';
                icon = <Check className="w-5 h-5 text-emerald-600" />;
              } else if (isSelected) {
                btnClass = 'border-rose-500 bg-rose-50 text-rose-900';
                icon = <X className="w-5 h-5 text-rose-600" />;
              } else {
                btnClass = 'border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed';
              }
            }

            return (
              <button
                key={idx}
                id={`opt_scen_${idx}`}
                disabled={isSubmitted}
                onClick={() => onChangeAnswer(idx)}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between gap-3 text-sm md:text-base ${btnClass}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isSelected ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{opt}</span>
                </div>
                {icon}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // --- 10. SEQUENCE ORDERING ---
  const renderSequence = () => {
    const handleMove = (idx: number, direction: 'up' | 'down') => {
      if (isSubmitted) return;
      const newItems = [...sequenceItems];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;

      // Swap
      const temp = newItems[idx];
      newItems[idx] = newItems[targetIdx];
      newItems[targetIdx] = temp;

      setSequenceItems(newItems);

      // Lưu câu trả lời dưới dạng mảng các chỉ số gốc của các mục trong question.options
      const answerIndices = newItems.map((item) => question.options.indexOf(item));
      onChangeAnswer(answerIndices);
    };

    const isOrderCorrect = () => {
      if (!userAnswer) return false;
      return JSON.stringify(userAnswer) === JSON.stringify(question.correctAnswer);
    };

    return (
      <div className="space-y-4" id={`q_sequence_${question.id}`}>
        <p className="text-xs text-orange-600 font-semibold flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-lg w-max mb-1">
          <AlertCircle className="w-4 h-4" /> Hướng dẫn: Nhấn các nút mũi tên (▲ ▼) để hoán đổi vị trí của các bước cho đúng quy trình.
        </p>

        <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-100">
          {sequenceItems.map((item: string, idx: number) => {
            const originalIdx = question.options.indexOf(item);
            const isCorrectSpot = question.correctAnswer[idx] === originalIdx;

            let borderClass = 'border-slate-200 bg-white text-slate-800';
            if (isSubmitted) {
              borderClass = isCorrectSpot ? 'border-emerald-400 bg-emerald-50/50' : 'border-rose-400 bg-rose-50/50';
            }

            return (
              <div
                key={idx}
                id={`seq_step_${idx}`}
                className={`p-3.5 rounded-xl border flex items-center justify-between gap-4 shadow-sm transition-all ${borderClass}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium">{item}</span>
                </div>

                {/* Các nút di chuyển */}
                {!isSubmitted && (
                  <div className="flex items-center gap-1">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'up')}
                      className={`p-1.5 rounded-lg border ${idx === 0 ? 'bg-slate-50 text-slate-300' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'}`}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      disabled={idx === sequenceItems.length - 1}
                      onClick={() => handleMove(idx, 'down')}
                      className={`p-1.5 rounded-lg border ${idx === sequenceItems.length - 1 ? 'bg-slate-50 text-slate-300' : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'}`}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {isSubmitted && (
                  <div>
                    {isCorrectSpot ? (
                      <Check className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full flex items-center gap-0.5">
                        <X className="w-3 h-3" /> Đúng: Bước {question.correctAnswer.indexOf(originalIdx) + 1}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Hiển thị đáp án đúng khi nộp bài */}
        {isSubmitted && (
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-800 mt-2">
            <p className="font-bold mb-1">🎯 Trật tự quy trình đúng chuẩn:</p>
            <ol className="list-decimal list-inside space-y-1">
              {question.correctAnswer.map((origIdx: number) => (
                <li key={origIdx} className="font-medium">
                  {question.options[origIdx]}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    );
  };

  // --- 11. HOTSPOT CLICK AREA ---
  const renderHotspot = () => {
    const imageUrl = question.imageUrl || "https://picsum.photos/seed/ic3screen/800/450";
    const corr = question.correctAnswer || { x: 50, y: 50, radius: 10 };
    
    const handleClickImage = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isSubmitted) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * 100;
      const clickY = ((e.clientY - rect.top) / rect.height) * 100;
      onChangeAnswer({ x: Math.round(clickX), y: Math.round(clickY) });
    };

    const isCorrect = () => {
      if (!userAnswer || typeof userAnswer !== 'object') return false;
      const dx = userAnswer.x - corr.x;
      const dy = userAnswer.y - corr.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= corr.radius;
    };

    return (
      <div className="space-y-4" id={`q_hotspot_${question.id}`}>
        <p className="text-xs text-indigo-600 font-semibold flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg w-max mb-1">
          <AlertCircle className="w-4 h-4" /> Hướng dẫn: Nhấp chuột trực tiếp vào vị trí/biểu tượng được yêu cầu trên hình ảnh dưới đây.
        </p>

        <div 
          className="relative overflow-hidden rounded-2xl border-2 border-slate-200 bg-slate-100 shadow-md max-w-2xl mx-auto cursor-crosshair select-none"
          onClick={handleClickImage}
        >
          <img
            src={imageUrl}
            alt="Hotspot Interface"
            className="w-full h-auto object-contain select-none pointer-events-none"
            referrerPolicy="no-referrer"
          />

          {/* User's click target */}
          {userAnswer && typeof userAnswer === 'object' && 'x' in userAnswer && (
            <div 
              className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full border-2 flex items-center justify-center animate-bounce shadow-lg ${
                isSubmitted 
                  ? (isCorrect() ? 'bg-emerald-500/40 border-emerald-500 text-white' : 'bg-rose-500/40 border-rose-500 text-white')
                  : 'bg-indigo-500/40 border-indigo-600 text-white'
              }`}
              style={{ left: `${userAnswer.x}%`, top: `${userAnswer.y}%` }}
            >
              <div className="w-2.5 h-2.5 bg-white rounded-full"></div>
            </div>
          )}

          {/* Correct target area (shown after submission) */}
          {isSubmitted && (
            <div 
              className="absolute border-4 border-dashed border-emerald-500 bg-emerald-500/20 rounded-full animate-pulse flex items-center justify-center"
              style={{ 
                left: `${corr.x}%`, 
                top: `${corr.y}%`, 
                width: `${corr.radius * 2}%`, 
                height: `${corr.radius * 2}%`,
                marginLeft: `-${corr.radius}%`,
                marginTop: `-${corr.radius}%`
              }}
              title="Khu vực đáp án đúng"
            >
              <span className="text-[10px] bg-emerald-600 text-white px-1 py-0.5 rounded shadow font-bold">ZÔN ĐÚNG</span>
            </div>
          )}
        </div>

        {isSubmitted && (
          <div className={`p-4 rounded-xl border text-sm ${isCorrect() ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
            <p className="font-extrabold flex items-center gap-1.5">
              {isCorrect() ? (
                <>
                  <Check className="w-5 h-5 text-emerald-600" />
                  Chúc mừng! Bạn đã click chính xác vào vùng yêu cầu.
                </>
              ) : (
                <>
                  <X className="w-5 h-5 text-rose-600" />
                  Chưa chính xác! Bạn đã nhấp lệch vị trí. Hãy xem vùng viền xanh lá đứt đoạn để biết vị trí đúng.
                </>
              )}
            </p>
          </div>
        )}
      </div>
    );
  };

  // --- RENDERING ROUTER ---
  const renderQuestionBody = () => {
    switch (question.type) {
      case QuestionType.MULTIPLE_CHOICE:
        return renderMultipleChoice();
      case QuestionType.MULTIPLE_RESPONSE:
        return renderMultipleResponse();
      case QuestionType.TRUE_FALSE:
        return renderTrueFalse();
      case QuestionType.MATCHING:
        return renderMatching();
      case QuestionType.DRAG_DROP:
        return renderDragDrop();
      case QuestionType.FILL_BLANK:
        return renderFillBlank();
      case QuestionType.DROPDOWN:
        return renderDropdown();
      case QuestionType.IMAGE_BASED:
        return renderImageBased();
      case QuestionType.SCENARIO:
        return renderScenario();
      case QuestionType.SEQUENCE:
        return renderSequence();
      case QuestionType.HOTSPOT:
        return renderHotspot();
      default:
        return <p className="text-slate-500">Dạng câu hỏi không hỗ trợ.</p>;
    }
  };

  return (
    <div className="space-y-6" id={`question_box_${question.id}`}>
      {/* Khối Đề Bài */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <span className="text-[10px] uppercase tracking-wider font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full border">
            {question.category}
          </span>
          <span className="text-xs font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 rounded-lg">
            Dạng: {question.type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </span>
        </div>

        <h3 className="text-base md:text-lg font-bold text-slate-800 leading-relaxed">
          {question.content}
        </h3>
      </div>

      {/* Thân câu hỏi theo kiểu tương tác */}
      <div className="py-2">{renderQuestionBody()}</div>

      {/* Hành động kiểm tra đáp án (Practice Mode) */}
      {mode === 'practice' && !isSubmitted && onCheckAnswer && (
        <div className="flex justify-end">
          <button
            id="btn_check_answer"
            disabled={userAnswer === undefined || userAnswer === null || (Array.isArray(userAnswer) && userAnswer.length === 0)}
            onClick={onCheckAnswer}
            className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-md disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
          >
            Kiểm tra đáp án
          </button>
        </div>
      )}

      {/* Hiển thị Mascot hỗ trợ, Giải thích & Mẹo của Mascot (Practice mode đã nộp hoặc Exam mode kết thúc và xem lại) */}
      {isSubmitted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 border-t pt-5 space-y-4"
        >
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-100 space-y-3">
            <h4 className="font-bold text-emerald-900 text-sm flex items-center gap-1.5">
              💡 Giải Thích Chi Tiết từ Ban Giám Khảo:
            </h4>
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
              {question.explanation}
            </p>
          </div>

          <Mascot
            type={mascotType}
            mood="happy"
            speechBubble={`🌟 Mẹo ghi nhớ cực hay: ${question.tip}`}
          />
        </motion.div>
      )}
    </div>
  );
}
