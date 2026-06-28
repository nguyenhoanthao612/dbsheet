import React, { useState, useEffect, useRef } from 'react';
import { motion, Reorder } from 'motion/react';
import { Question, QuestionType, IC3Category } from '../lib/db';
import { Check, X, ArrowUp, ArrowDown, HelpCircle, Eye, AlertCircle, GripVertical, MapPin } from 'lucide-react';

interface QuestionRendererProps {
  question: Question;
  userAnswer: any;
  onChangeAnswer: (answer: any) => void;
  isSubmitted: boolean; // Đã kiểm tra (ở chế độ Luyện tập) hoặc Đã nộp bài (ở chế độ Kiểm tra)
  mode: 'practice' | 'exam' | 'race';
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
  const hotspotContainerRef = useRef<HTMLDivElement>(null);

  // Trạng thái cục bộ cho Matching
  const [matchingSelections, setMatchingSelections] = useState<number[]>(() => {
    if (question.type === QuestionType.MATCHING) {
      return userAnswer || Array(question.options?.itemsA?.length || 0).fill(-1);
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

  // Touch/Click source selection for drag & match / categorization / match image
  const [selectedSourceIdx, setSelectedSourceIdx] = useState<number | null>(null);



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

  // --- 4. MATCHING (Drag & Match) ---
  const renderMatching = () => {
    const itemsA: string[] = question.options?.itemsA || [];
    const itemsB: string[] = question.options?.itemsB || [];

    const handleDrop = (aIdx: number, bIdx: number) => {
      if (isSubmitted) return;
      const newSelections = [...matchingSelections];

      // Find if bIdx is already assigned to some other slot (existingAIdx)
      const existingAIdx = newSelections.findIndex(sel => sel === bIdx);
      const oldBIdx = newSelections[aIdx] ?? -1;

      if (existingAIdx !== -1) {
        // If the target slot already had an item, swap them!
        if (oldBIdx !== -1) {
          newSelections[existingAIdx] = oldBIdx;
        } else {
          newSelections[existingAIdx] = -1;
        }
      }

      newSelections[aIdx] = bIdx;
      setMatchingSelections(newSelections);
      onChangeAnswer(newSelections);
      setSelectedSourceIdx(null);
    };

    const handleRemoveMatch = (aIdx: number) => {
      if (isSubmitted) return;
      const newSelections = [...matchingSelections];
      newSelections[aIdx] = -1;
      setMatchingSelections(newSelections);
      onChangeAnswer(newSelections);
      setSelectedSourceIdx(null);
    };

    const handleSelectSource = (bIdx: number) => {
      if (isSubmitted) return;
      if (selectedSourceIdx === bIdx) {
        setSelectedSourceIdx(null);
      } else {
        setSelectedSourceIdx(bIdx);
      }
    };

    const handleSelectTarget = (aIdx: number) => {
      if (isSubmitted) return;
      if (selectedSourceIdx !== null) {
        handleDrop(aIdx, selectedSourceIdx);
      } else {
        const assignedBIdx = matchingSelections[aIdx] ?? -1;
        if (assignedBIdx !== -1) {
          setSelectedSourceIdx(assignedBIdx);
        }
      }
    };

    return (
      <div className="space-y-4" id={`q_matching_${question.id}`}>
        <p className="text-xs text-indigo-600 font-semibold flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg w-max mb-2">
          <AlertCircle className="w-4 h-4 text-indigo-500 animate-pulse" /> 
          Hướng dẫn: Kéo thẻ từ danh sách bên phải thả vào ô trống bên trái. Hoặc Chạm một thẻ rồi Chạm ô tương ứng để ghép đôi. Có thể kéo thẻ đã ghép sang ô khác hoặc kéo ngược lại danh sách để huỷ ghép.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-5 rounded-3xl border border-slate-100">
          {/* CỘT A (Các vế ghép + Ô drop) */}
          <div className="space-y-4">
            <h4 className="font-extrabold text-slate-700 text-xs tracking-wider uppercase border-b pb-2">CỘT GHÉP (CỘT A)</h4>
            <div className="space-y-3">
              {itemsA.map((item: string, aIdx: number) => {
                const assignedBIdx = matchingSelections[aIdx] ?? -1;
                const hasAssigned = assignedBIdx !== -1;
                const correctBIdx = question.correctAnswer && question.correctAnswer[aIdx] !== undefined ? question.correctAnswer[aIdx] : -1;
                const isMatchCorrect = assignedBIdx === correctBIdx;

                let borderClass = 'border-dashed border-slate-300 hover:border-indigo-400 bg-white/50';
                if (hasAssigned) {
                  borderClass = 'border-solid border-indigo-400 bg-indigo-50/10 shadow-sm';
                }
                if (isSubmitted) {
                  borderClass = isMatchCorrect 
                    ? 'border-solid border-emerald-500 bg-emerald-50/40 shadow-sm shadow-emerald-50' 
                    : 'border-solid border-rose-500 bg-rose-50/40 shadow-sm shadow-rose-50';
                }

                return (
                  <div key={aIdx} className="flex flex-col gap-1 bg-white p-3.5 rounded-2xl border shadow-sm">
                    <span className="font-bold text-slate-800 text-xs block mb-1">Mục {aIdx + 1}: {item}</span>
                    
                    <div
                      draggable={!isSubmitted && hasAssigned}
                      onDragStart={(e: React.DragEvent) => {
                        if (isSubmitted) return;
                        e.dataTransfer.setData('text/plain', assignedBIdx.toString());
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (!isSubmitted) {
                          e.currentTarget.classList.add('bg-indigo-50', 'border-indigo-500');
                        }
                      }}
                      onDragLeave={(e) => {
                        e.currentTarget.classList.remove('bg-indigo-50', 'border-indigo-500');
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('bg-indigo-50', 'border-indigo-500');
                        const bIdxStr = e.dataTransfer.getData('text/plain');
                        const bIdx = parseInt(bIdxStr);
                        if (!isNaN(bIdx)) {
                          handleDrop(aIdx, bIdx);
                        }
                      }}
                      onClick={() => handleSelectTarget(aIdx)}
                      className={`min-h-[44px] px-3 py-2 rounded-xl border-2 flex items-center justify-between gap-2 transition-all cursor-pointer ${borderClass} ${hasAssigned && !isSubmitted ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                      {hasAssigned ? (
                        <>
                          <span className="text-xs font-semibold text-slate-800">{itemsB[assignedBIdx]}</span>
                          {!isSubmitted && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveMatch(aIdx);
                              }}
                              className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center text-xs font-bold shrink-0 transition-colors"
                            >
                              &times;
                            </button>
                          )}
                          {isSubmitted && (
                            isMatchCorrect 
                              ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> 
                              : <X className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium select-none italic">
                          {selectedSourceIdx !== null ? '⚡ Click vào đây để ghép nối...' : 'Kéo thả đáp án vào đây...'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CỘT B (Các lựa chọn kéo thả) */}
          <div 
            className="space-y-4"
            onDragOver={(e) => {
              if (!isSubmitted) e.preventDefault();
            }}
            onDrop={(e) => {
              if (isSubmitted) return;
              e.preventDefault();
              const bIdxStr = e.dataTransfer.getData('text/plain');
              const bIdx = parseInt(bIdxStr);
              if (!isNaN(bIdx)) {
                const aIdx = matchingSelections.findIndex(sel => sel === bIdx);
                if (aIdx !== -1) {
                  handleRemoveMatch(aIdx);
                }
              }
            }}
          >
            <h4 className="font-extrabold text-slate-700 text-xs tracking-wider uppercase border-b pb-2">ĐÁP ÁN ĐỂ CHỌN (CỘT B)</h4>
            <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
              {itemsB.map((item: string, bIdx: number) => {
                const isAssigned = matchingSelections.includes(bIdx);
                const isSelected = selectedSourceIdx === bIdx;

                if (isAssigned && !isSubmitted) {
                  return (
                    <div
                      key={bIdx}
                      draggable={!isSubmitted}
                      onDragStart={(e: React.DragEvent) => {
                        if (isSubmitted) return;
                        e.dataTransfer.setData('text/plain', bIdx.toString());
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onClick={() => handleSelectSource(bIdx)}
                      className="p-3 bg-slate-100 border border-slate-200 text-slate-400 rounded-xl text-xs font-medium italic select-none opacity-50 flex items-center gap-2 cursor-grab"
                    >
                      <span>(Đã ghép) {item}</span>
                    </div>
                  );
                }

                let cardClass = 'border-slate-200 hover:border-indigo-400 hover:shadow-md cursor-grab active:cursor-grabbing';
                if (isSelected) {
                  cardClass = 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200 animate-pulse';
                }
                if (isSubmitted) {
                  cardClass = 'border-slate-100 bg-slate-50/50 text-slate-400 cursor-not-allowed';
                }

                return (
                  <div
                    key={bIdx}
                    draggable={!isSubmitted}
                    onDragStart={(e: React.DragEvent) => {
                      if (isSubmitted) return;
                      e.dataTransfer.setData('text/plain', bIdx.toString());
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onClick={() => handleSelectSource(bIdx)}
                    className={`p-3 bg-white border-2 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-sm transition-all duration-150 transform hover:scale-[1.01] ${cardClass}`}
                  >
                    {!isSubmitted && (
                      <GripVertical className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors cursor-grab" />
                    )}
                    <span className="text-slate-700 text-xs leading-normal">{item}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hiển thị đáp án đúng khi nộp bài */}
        {isSubmitted && (
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-xs text-emerald-800 mt-2 shadow-sm">
            <p className="font-bold mb-2 flex items-center gap-1.5"><Check className="w-5 h-5"/> Đáp án ghép nối chính xác:</p>
            <ul className="space-y-1.5">
              {itemsA.map((item: string, aIdx: number) => (
                <li key={aIdx} className="flex items-start gap-1 bg-white/70 p-2 rounded-lg border border-emerald-100">
                  <span className="font-bold text-slate-500">{aIdx + 1}.</span>
                  <span className="font-medium text-slate-700">{item}</span>
                  <span className="text-emerald-500 font-bold px-1.5">➔</span>
                  <span className="font-bold text-slate-800">{itemsB[question.correctAnswer[aIdx]]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // --- 8. CATEGORIZATION (Phân Loại) ---
  const renderCategorization = () => {
    const categories: string[] = question.options?.categories || [];
    const items: string[] = question.options?.items || [];
    const currentAns = Array.isArray(userAnswer) ? userAnswer : Array(items.length).fill(-1);

    const handleCategorize = (itemIdx: number, catIdx: number) => {
      if (isSubmitted) return;
      const next = [...currentAns];
      next[itemIdx] = catIdx;
      onChangeAnswer(next);
      setSelectedSourceIdx(null);
    };

    const handleSelectSource = (idx: number) => {
      if (isSubmitted) return;
      setSelectedSourceIdx(selectedSourceIdx === idx ? null : idx);
    };

    return (
      <div className="space-y-4" id={`q_cat_${question.id}`}>
        <p className="text-xs text-indigo-600 font-semibold flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg w-max mb-1">
          <AlertCircle className="w-4 h-4 text-indigo-500" />
          Hướng dẫn: Kéo các mục ở dưới thả vào đúng nhóm phân loại. Hoặc Chạm chọn 1 mục rồi Chạm nhóm đích.
        </p>

        {/* Categories Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map((catName, catIdx) => {
            const assignedItems = items.map((text, idx) => ({ text, idx })).filter(item => currentAns[item.idx] === catIdx);

            return (
              <div
                key={catIdx}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isSubmitted) e.currentTarget.classList.add('bg-indigo-50/50', 'border-indigo-400');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('bg-indigo-50/50', 'border-indigo-400');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('bg-indigo-50/50', 'border-indigo-400');
                  const itemIdx = parseInt(e.dataTransfer.getData('text/plain'));
                  if (!isNaN(itemIdx)) {
                    handleCategorize(itemIdx, catIdx);
                  }
                }}
                onClick={() => {
                  if (selectedSourceIdx !== null) {
                    handleCategorize(selectedSourceIdx, catIdx);
                  }
                }}
                className="bg-white p-4 rounded-3xl border-2 border-slate-200 transition-all shadow-sm flex flex-col min-h-[160px]"
              >
                <h5 className="font-black text-slate-700 text-xs uppercase tracking-wider border-b pb-2 mb-3 text-indigo-700">
                  📂 {catName || `Nhóm ${catIdx + 1}`}
                </h5>
                <div className="flex-1 flex flex-wrap gap-2 items-start content-start">
                  {assignedItems.length === 0 ? (
                    <span className="text-xs text-slate-300 italic select-none py-4 w-full text-center">
                      {selectedSourceIdx !== null ? '⚡ Click vào đây để xếp vào nhóm này...' : 'Kéo thả các mục vào đây...'}
                    </span>
                  ) : (
                    assignedItems.map(item => {
                      const isCorrect = question.correctAnswer && question.correctAnswer[item.idx] === catIdx;
                      let itemBorder = 'border-slate-200 bg-slate-50';
                      if (isSubmitted) {
                        itemBorder = isCorrect ? 'border-emerald-400 bg-emerald-50 text-emerald-900' : 'border-rose-400 bg-rose-50 text-rose-900';
                      }
                      return (
                        <div
                          key={item.idx}
                          className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-sm ${itemBorder}`}
                        >
                          <span>{item.text}</span>
                          {!isSubmitted && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCategorize(item.idx, -1);
                              }}
                              className="w-4 h-4 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-500 hover:text-slate-800 text-[10px] flex items-center justify-center font-bold"
                            >
                              &times;
                            </button>
                          )}
                          {isSubmitted && (
                            isCorrect ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <X className="w-3.5 h-3.5 text-rose-600" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Unassigned items list */}
        {!isSubmitted && (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-4 mt-3">
            <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Các mục chưa phân loại:</h6>
            <div className="flex flex-wrap gap-2">
              {items.map((item, idx) => {
                const isAssigned = currentAns[idx] !== -1;
                if (isAssigned) return null;

                const isSelected = selectedSourceIdx === idx;

                return (
                  <div
                    key={idx}
                    draggable={!isSubmitted}
                    onDragStart={(e: React.DragEvent) => {
                      e.dataTransfer.setData('text/plain', idx.toString());
                    }}
                    onClick={() => handleSelectSource(idx)}
                    className={`px-3.5 py-2 rounded-xl border bg-white font-bold text-xs shadow-sm cursor-grab active:cursor-grabbing flex items-center gap-1.5 select-none transition-all duration-150 transform hover:scale-[1.02]
                      ${isSelected ? 'border-indigo-500 bg-indigo-50 shadow-md ring-2 ring-indigo-200 animate-pulse' : 'border-slate-200 hover:border-indigo-400'}`}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-slate-300" />
                    <span>{item}</span>
                  </div>
                );
              })}
              {items.every((_, idx) => currentAns[idx] !== -1) && (
                <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100 flex items-center gap-1">
                  🎉 Hoàn thành phân loại tất cả các mục!
                </span>
              )}
            </div>
          </div>
        )}

        {/* Correct Answers Key */}
        {isSubmitted && (
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-xs text-emerald-800 mt-2 shadow-sm">
            <p className="font-bold mb-2 flex items-center gap-1.5"><Check className="w-5 h-5"/> Đáp án phân loại chính xác:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1.5">
              {categories.map((cat, catIdx) => {
                const correctItems = items.filter((_, idx) => question.correctAnswer && question.correctAnswer[idx] === catIdx);
                return (
                  <div key={catIdx} className="bg-white/60 p-2.5 rounded-xl border border-emerald-100">
                    <span className="font-bold block border-b border-emerald-100 pb-1 text-slate-800 mb-1.5">📁 {cat}</span>
                    <div className="flex flex-wrap gap-1">
                      {correctItems.map((itemText, i) => (
                        <span key={i} className="px-2 py-0.5 bg-emerald-100/50 text-emerald-800 border border-emerald-200/50 rounded-lg font-semibold text-[10px]">{itemText}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- 9. HOTSPOT (Điểm Nóng) ---
  const renderHotspot = () => {
    const spots: any[] = question.options?.spots || [];

    const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isSubmitted) return;
      if (!hotspotContainerRef.current) return;
      
      const rect = hotspotContainerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      onChangeAnswer({ 
        x: Math.round(x * 100) / 100, 
        y: Math.round(y * 100) / 100 
      });
    };

    const hasSelection = userAnswer && typeof userAnswer === 'object' && 'x' in userAnswer && 'y' in userAnswer;

    const isCorrectClick = hasSelection && spots.some((spot, idx) => {
      const isCorr = spot.isCorrect || (Array.isArray(question.correctAnswer) ? question.correctAnswer.includes(idx) : question.correctAnswer === idx);
      if (!isCorr) return false;
      return (
        userAnswer.x >= spot.x &&
        userAnswer.x <= spot.x + spot.w &&
        userAnswer.y >= spot.y &&
        userAnswer.y <= spot.y + spot.h
      );
    });

    return (
      <div className="space-y-4" id={`q_hotspot_${question.id}`}>
        <p className="text-xs text-indigo-600 font-semibold flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg w-max mb-1">
          <AlertCircle className="w-4 h-4 text-indigo-500 animate-pulse" />
          Hướng dẫn: Hãy chạm/nhấp chuột trực tiếp vào đúng vị trí cần tìm trên hình ảnh dưới đây để đặt ghim định vị.
        </p>

        <div 
          ref={hotspotContainerRef}
          onClick={handleImageClick}
          className={`relative border-2 border-slate-200 rounded-3xl overflow-hidden bg-white max-w-xl mx-auto shadow-md ${!isSubmitted ? 'cursor-crosshair active:scale-[0.99] transition-transform' : 'cursor-default'}`}
        >
          {question.imageUrl ? (
            <img 
              src={question.imageUrl} 
              alt="Hotspot exam" 
              className="w-full h-auto select-none block pointer-events-none" 
            />
          ) : (
            <div className="aspect-video bg-slate-100 flex items-center justify-center text-slate-400 italic font-bold">
              Không tải được hình ảnh đề bài.
            </div>
          )}

          {/* Render User Pin */}
          {hasSelection && (
            <div
              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 transition-all duration-300"
              style={{ left: `${userAnswer.x}%`, top: `${userAnswer.y}%` }}
            >
              <div className="relative flex items-center justify-center">
                <span className={`animate-ping absolute inline-flex h-8 w-8 rounded-full ${isSubmitted ? (isCorrectClick ? 'bg-emerald-400' : 'bg-rose-400') : 'bg-indigo-400'} opacity-75`}></span>
                <div className={`relative rounded-full ${isSubmitted ? (isCorrectClick ? 'bg-emerald-600' : 'bg-rose-600') : 'bg-indigo-600'} p-2 shadow-lg border-2 border-white`}>
                  <MapPin className="w-4 h-4 text-white fill-white" />
                </div>
              </div>
            </div>
          )}

          {/* Render Correct Zones ON SUBMISSION */}
          {isSubmitted && spots.map((spot, idx) => {
            const isCorr = spot.isCorrect || (Array.isArray(question.correctAnswer) ? question.correctAnswer.includes(idx) : question.correctAnswer === idx);
            if (!isCorr) return null;
            return (
              <div
                key={idx}
                style={{
                  left: `${spot.x}%`,
                  top: `${spot.y}%`,
                  width: `${spot.w}%`,
                  height: `${spot.h}%`,
                }}
                className="absolute border-2 border-dashed border-emerald-500 bg-emerald-500/15 rounded-xl flex items-center justify-center animate-fadeIn pointer-events-none z-0"
              >
                <span className="bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded shadow-sm opacity-90">
                  🎯 {spot.label || `Vùng đúng ${idx + 1}`}
                </span>
              </div>
            );
          })}
        </div>

        {/* Selected Coordinates Status */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trạng thái ghim:</span>
          {hasSelection ? (
            <span className={`px-3 py-1 font-bold text-xs rounded-lg flex items-center gap-1.5 animate-fadeIn ${isSubmitted ? (isCorrectClick ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-rose-50 border border-rose-200 text-rose-700') : 'bg-indigo-50 border border-indigo-200 text-indigo-700'}`}>
              📍 Đã ghim tại (X: {userAnswer.x}%, Y: {userAnswer.y}%)
              {isSubmitted && (isCorrectClick ? '✓ Đúng vùng đáp án' : '✘ Ngoài vùng đáp án')}
            </span>
          ) : (
            <span className="text-xs font-semibold text-slate-400 italic">Chưa chạm chọn vị trí nào.</span>
          )}
        </div>

        {/* Hotspot Answer Key */}
        {isSubmitted && (
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-xs text-emerald-800 mt-2 shadow-sm max-w-xl mx-auto">
            <p className="font-bold flex items-center gap-1.5"><Check className="w-5 h-5"/> Khu vực đáp án chính xác gồm:</p>
            <div className="mt-1.5 space-y-1 font-semibold text-slate-700">
              {spots.map((spot, idx) => {
                const isCorr = spot.isCorrect || (Array.isArray(question.correctAnswer) ? question.correctAnswer.includes(idx) : question.correctAnswer === idx);
                if (isCorr) {
                  return <p key={idx}>• {spot.label || `Vùng số ${idx + 1}`} (Khoảng X: {spot.x}% đến {spot.x + spot.w}%, Y: {spot.y}% đến {spot.y + spot.h}%)</p>;
                }
                return null;
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- 10. MATCH IMAGE TO TEXT (Ghép Ảnh Với Chữ) ---
  const renderMatchImage = () => {
    const texts: string[] = question.options?.texts || [];
    const images: string[] = question.options?.images || [];
    const currentAns = Array.isArray(userAnswer) ? userAnswer : Array(texts.length).fill(-1);

    const handleMatch = (textIdx: number, imgIdx: number) => {
      if (isSubmitted) return;
      const next = [...currentAns];

      const existingTextIdx = next.findIndex(sel => sel === imgIdx);
      if (existingTextIdx !== -1) {
        next[existingTextIdx] = -1;
      }

      next[textIdx] = imgIdx;
      onChangeAnswer(next);
      setSelectedSourceIdx(null);
    };

    const handleRemove = (textIdx: number) => {
      if (isSubmitted) return;
      const next = [...currentAns];
      next[textIdx] = -1;
      onChangeAnswer(next);
    };

    const handleSelectSource = (imgIdx: number) => {
      if (isSubmitted) return;
      setSelectedSourceIdx(selectedSourceIdx === imgIdx ? null : imgIdx);
    };

    const handleSelectTarget = (textIdx: number) => {
      if (isSubmitted) return;
      if (selectedSourceIdx !== null) {
        handleMatch(textIdx, selectedSourceIdx);
      }
    };

    return (
      <div className="space-y-4" id={`q_match_img_${question.id}`}>
        <p className="text-xs text-indigo-600 font-semibold flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg w-max mb-1">
          <AlertCircle className="w-4 h-4 text-indigo-500" />
          Hướng dẫn: Kéo các hình ảnh ở dưới và thả vào đúng ô chữ tương ứng ở trên. Hoặc Chạm chọn ảnh rồi Chạm ô đích.
        </p>

        {/* Text Target Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {texts.map((textLabel, textIdx) => {
            const matchedImgIdx = currentAns[textIdx] ?? -1;
            const hasMatched = matchedImgIdx !== -1;
            const isMatchCorrect = matchedImgIdx === (question.correctAnswer && question.correctAnswer[textIdx]);

            let borderStyle = 'border-dashed border-slate-300 hover:border-indigo-400 bg-white';
            if (hasMatched) {
              borderStyle = 'border-solid border-indigo-400 bg-indigo-50/5 shadow-sm';
            }
            if (isSubmitted) {
              borderStyle = isMatchCorrect 
                ? 'border-solid border-emerald-500 bg-emerald-50/20 shadow-emerald-50' 
                : 'border-solid border-rose-500 bg-rose-50/20 shadow-rose-50';
            }

            return (
              <div
                key={textIdx}
                onClick={() => handleSelectTarget(textIdx)}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!isSubmitted) e.currentTarget.classList.add('bg-indigo-50/50', 'border-indigo-400');
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('bg-indigo-50/50', 'border-indigo-400');
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('bg-indigo-50/50', 'border-indigo-400');
                  const imgIdx = parseInt(e.dataTransfer.getData('text/plain'));
                  if (!isNaN(imgIdx)) {
                    handleMatch(textIdx, imgIdx);
                  }
                }}
                className={`p-3 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all cursor-pointer shadow-sm ${borderStyle}`}
              >
                <span className="font-extrabold text-xs text-slate-800 text-center uppercase tracking-wide leading-tight min-h-[30px] flex items-center justify-center">
                  {textLabel}
                </span>

                <div className="w-full aspect-square rounded-xl bg-slate-50 border border-slate-150 overflow-hidden flex items-center justify-center relative shadow-inner">
                  {hasMatched ? (
                    <>
                      <img src={images[matchedImgIdx]} alt="Matched" className="w-full h-full object-cover" />
                      {!isSubmitted && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(textIdx);
                          }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center text-xs font-bold transition-colors"
                        >
                          &times;
                        </button>
                      )}
                      {isSubmitted && (
                        <div className={`absolute bottom-1 right-1 rounded-full p-0.5 text-white shadow-md
                          ${isMatchCorrect ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        >
                          {isMatchCorrect ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold select-none text-center px-2 italic">
                      {selectedSourceIdx !== null ? '⚡ Ghép vào đây...' : 'Thả hình vào...'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Draggable images library */}
        {!isSubmitted && (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-3xl p-4 mt-3">
            <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Thư viện hình ảnh để kéo thả:</h6>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {images.map((imgUrl, imgIdx) => {
                const isMatched = currentAns.includes(imgIdx);
                if (isMatched) {
                  return (
                    <div key={imgIdx} className="aspect-square bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center opacity-40 select-none">
                      <span className="text-[9px] text-slate-400 font-bold">Đã ghép</span>
                    </div>
                  );
                }

                const isSelected = selectedSourceIdx === imgIdx;

                return (
                  <div
                    key={imgIdx}
                    draggable={!isSubmitted}
                    onDragStart={(e: React.DragEvent) => {
                      e.dataTransfer.setData('text/plain', imgIdx.toString());
                    }}
                    onClick={() => handleSelectSource(imgIdx)}
                    className={`aspect-square rounded-xl bg-white border-2 overflow-hidden cursor-grab active:cursor-grabbing relative shadow-sm group transition-all duration-150 transform hover:scale-[1.03] hover:rotate-1
                      ${isSelected ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-md animate-pulse' : 'border-slate-200 hover:border-indigo-400'}`}
                  >
                    <img src={imgUrl} alt={`Option ${imgIdx + 1}`} className="w-full h-full object-cover pointer-events-none" />
                    <div className="absolute top-1 left-1 bg-black/60 rounded-full w-4.5 h-4.5 flex items-center justify-center text-[8px] text-white font-extrabold shadow">
                      {imgIdx + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Correct Answers summary */}
        {isSubmitted && (
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-xs text-emerald-800 mt-2 shadow-sm">
            <p className="font-bold mb-2 flex items-center gap-1.5"><Check className="w-5 h-5"/> Đáp án ghép hình chuẩn xác:</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-1.5">
              {texts.map((textLabel, textIdx) => (
                <div key={textIdx} className="bg-white/60 p-2 rounded-xl border border-emerald-100 flex flex-col items-center gap-1.5">
                  <span className="font-bold text-[11px] text-slate-700 text-center block">{textLabel}</span>
                  <div className="w-16 h-16 rounded-lg bg-white border border-emerald-200 overflow-hidden shrink-0 shadow-sm">
                    <img src={images[question.correctAnswer[textIdx]]} alt="Correct match" className="w-full h-full object-cover" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- 11. MATRIX SELECTION (Ma Trận Có/Không hoặc Tùy Chọn) ---
  const renderMatrixSelection = () => {
    const rows: string[] = question.options?.rows || [];
    const cols: string[] = question.options?.columns || [];
    const currentAns = Array.isArray(userAnswer) ? userAnswer : Array(rows.length).fill(-1);

    const handleSelectCell = (rowIdx: number, colIdx: number) => {
      if (isSubmitted) return;
      const next = [...currentAns];
      next[rowIdx] = colIdx;
      onChangeAnswer(next);
    };

    return (
      <div className="space-y-4" id={`q_matrix_${question.id}`}>
        <p className="text-xs text-indigo-600 font-semibold flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-lg w-max mb-1">
          <AlertCircle className="w-4 h-4 text-indigo-500" />
          Hướng dẫn: Chọn nút tròn đáp án đúng tương ứng với mỗi hàng.
        </p>

        <div className="bg-white border rounded-3xl overflow-x-auto shadow-sm p-4 border-slate-200">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">Hàng / Lựa chọn</th>
                {cols.map((col, idx) => (
                  <th key={idx} className="p-3 text-center text-[10px] font-black text-slate-600 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((rowText, rIdx) => {
                const selectedColIdx = currentAns[rIdx];
                const correctColIdx = question.correctAnswer && question.correctAnswer[rIdx];

                return (
                  <tr key={rIdx} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                    <td className="p-3 font-bold text-slate-700 leading-normal max-w-xs">
                      {rowText}
                    </td>
                    {cols.map((_, cIdx) => {
                      const isSel = selectedColIdx === cIdx;
                      const isCorr = correctColIdx === cIdx;

                      let cellClass = '';
                      if (isSubmitted) {
                        if (isCorr) {
                          cellClass = 'bg-emerald-50/50 text-emerald-600';
                        } else if (isSel) {
                          cellClass = 'bg-rose-50/50 text-rose-600';
                        }
                      }

                      return (
                        <td key={cIdx} className={`p-3 text-center transition-colors ${cellClass}`}>
                          <div className="flex justify-center items-center relative">
                            <input
                              type="radio"
                              disabled={isSubmitted}
                              name={`mat_row_ans_${question.id}_${rIdx}`}
                              checked={isSel}
                              onChange={() => handleSelectCell(rIdx, cIdx)}
                              className="w-4.5 h-4.5 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
                            />
                            {isSubmitted && isCorr && (
                              <Check className="w-3.5 h-3.5 text-emerald-600 absolute ml-6" />
                            )}
                            {isSubmitted && isSel && !isCorr && (
                              <X className="w-3.5 h-3.5 text-rose-600 absolute ml-6" />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Unanswered rows check warning */}
        {!isSubmitted && rows.some((_, idx) => currentAns[idx] === -1) && (
          <span className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-block">
            ⚠️ Hãy tích chọn đầy đủ đáp án cho tất cả các hàng ở phía trên!
          </span>
        )}

        {/* Matrix correct summary key */}
        {isSubmitted && (
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-xs text-emerald-800 mt-2 shadow-sm">
            <p className="font-bold mb-2 flex items-center gap-1.5"><Check className="w-5 h-5"/> Bảng đáp án ma trận chuẩn:</p>
            <ul className="space-y-1 mt-1.5 font-semibold text-slate-700">
              {rows.map((row, rIdx) => (
                <li key={rIdx} className="flex items-center gap-1">
                  • <span>{row}:</span>
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-200/50 rounded-md px-1.5 py-0.5 text-[10px] ml-1">
                    {cols[question.correctAnswer[rIdx]]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const idxToLetter = (idx: number) => String.fromCharCode(65 + idx);


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
      const answerIndices = newItems.map((item) => question.options.indexOf(item));
      onChangeAnswer(answerIndices);
    };

    const handleReorder = (newItems: string[]) => {
      if (isSubmitted) return;
      setSequenceItems(newItems);
      const answerIndices = newItems.map((item) => question.options.indexOf(item));
      onChangeAnswer(answerIndices);
    };

    return (
      <div className="space-y-4" id={`q_sequence_${question.id}`}>
        <p className="text-xs text-orange-600 font-semibold flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 rounded-lg w-max mb-1">
          <AlertCircle className="w-4 h-4" /> Hướng dẫn: Kéo thả các bước bên dưới hoặc dùng nút (▲ ▼) để sắp xếp đúng thứ tự.
        </p>

        {isSubmitted ? (
          <div className="space-y-3 bg-white p-5 rounded-3xl border shadow-sm">
            {sequenceItems.map((item: string, idx: number) => {
              const originalIdx = question.options.indexOf(item);
              const isCorrectSpot = question.correctAnswer[idx] === originalIdx;
              const borderClass = isCorrectSpot ? 'border-emerald-400 bg-emerald-50/50' : 'border-rose-400 bg-rose-50/50';

              return (
                <div key={item} className={`p-4 rounded-xl border-2 flex items-center justify-between gap-4 shadow-sm ${borderClass}`}>
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isCorrectSpot ? 'bg-emerald-200 text-emerald-800' : 'bg-rose-200 text-rose-800'}`}>
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-800">{item}</span>
                  </div>
                  <div>
                    {isCorrectSpot ? (
                      <Check className="w-6 h-6 text-emerald-500" />
                    ) : (
                      <div className="flex flex-col items-end">
                         <X className="w-6 h-6 text-rose-500 mb-1" />
                         <span className="text-xs font-bold px-2 py-0.5 bg-rose-100 text-rose-700 rounded-lg">Đúng: Bước {question.correctAnswer.indexOf(originalIdx) + 1}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Reorder.Group axis="y" values={sequenceItems} onReorder={handleReorder} className="space-y-3 bg-white p-5 rounded-3xl border shadow-sm">
            {sequenceItems.map((item: string, idx: number) => {
              return (
                <Reorder.Item
                  key={item}
                  value={item}
                  id={`seq_step_${idx}`}
                  whileDrag={{ scale: 1.02, boxShadow: "0px 15px 30px rgba(0,0,0,0.1)", zIndex: 50, rotate: 1 }}
                  transition={{ duration: 0.15 }}
                  className={`p-4 rounded-xl border-2 border-slate-200 bg-white flex items-center justify-between gap-4 shadow-sm transition-colors hover:border-orange-300 hover:shadow-md cursor-grab active:cursor-grabbing relative group`}
                >
                  <div className="flex items-center gap-3 w-full">
                    <GripVertical className="w-5 h-5 text-slate-300 group-hover:text-orange-400 transition-colors cursor-grab" />
                    <span className="w-8 h-8 bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold text-sm shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-800 select-none flex-1">{item}</span>
                  </div>

                  {/* Các nút di chuyển */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      disabled={idx === 0}
                      onClick={() => handleMove(idx, 'up')}
                      className={`p-2 rounded-lg border transition-colors ${idx === 0 ? 'bg-slate-50 text-slate-300 border-slate-100' : 'bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 border-slate-200'}`}
                      title="Chuyển lên"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      disabled={idx === sequenceItems.length - 1}
                      onClick={() => handleMove(idx, 'down')}
                      className={`p-2 rounded-lg border transition-colors ${idx === sequenceItems.length - 1 ? 'bg-slate-50 text-slate-300 border-slate-100' : 'bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 border-slate-200'}`}
                      title="Chuyển xuống"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        )}

        {/* Hiển thị đáp án đúng khi nộp bài */}
        {isSubmitted && (
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-sm text-emerald-800 mt-2 shadow-sm">
            <p className="font-bold mb-2 flex items-center gap-1.5"><Check className="w-5 h-5"/> Trật tự quy trình đúng chuẩn:</p>
            <ol className="list-decimal list-inside space-y-2">
              {question.correctAnswer.map((origIdx: number) => (
                <li key={origIdx} className="font-medium bg-white/60 p-2 rounded-lg border border-emerald-100">
                  {question.options[origIdx]}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    );
  };


  // --- TRUE/FALSE MULTIPLE ---
  const renderTrueFalseMultiple = () => {
    const statements: string[] = question.options || [];
    const userAnswerArray: boolean[] = Array.isArray(userAnswer) ? userAnswer : [];

    return (
      <div className="space-y-4">
        {statements.map((stmt, idx) => {
          const isSelectedTrue = userAnswerArray[idx] === true;
          const isSelectedFalse = userAnswerArray[idx] === false;
          
          let trueStyle = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100';
          let falseStyle = 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100';
          
          if (!isSubmitted) {
            if (isSelectedTrue) trueStyle = 'bg-indigo-50 border-indigo-400 text-indigo-700 ring-2 ring-indigo-200';
            if (isSelectedFalse) falseStyle = 'bg-indigo-50 border-indigo-400 text-indigo-700 ring-2 ring-indigo-200';
          } else {
            const isCorrect = Array.isArray(question.correctAnswer) ? question.correctAnswer[idx] : true;
            
            if (isCorrect === true) {
               trueStyle = 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold shadow-inner ring-2 ring-emerald-200/50';
               if (isSelectedFalse) falseStyle = 'bg-rose-50 border-rose-300 text-rose-700 line-through opacity-70';
            } else {
               falseStyle = 'bg-emerald-50 border-emerald-400 text-emerald-800 font-bold shadow-inner ring-2 ring-emerald-200/50';
               if (isSelectedTrue) trueStyle = 'bg-rose-50 border-rose-300 text-rose-700 line-through opacity-70';
            }
          }

          return (
            <div key={idx} className="flex flex-col sm:flex-row gap-3 sm:items-center bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
              <div className="flex-1 text-sm font-semibold text-slate-800">
                {stmt}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => {
                    const newAns = [...userAnswerArray];
                    newAns[idx] = true;
                    onChangeAnswer(newAns);
                  }}
                  className={`px-4 py-2 text-sm font-bold rounded-xl border-2 transition-all flex-1 sm:flex-none ${trueStyle}`}
                >
                  Đúng
                </button>
                <button
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => {
                    const newAns = [...userAnswerArray];
                    newAns[idx] = false;
                    onChangeAnswer(newAns);
                  }}
                  className={`px-4 py-2 text-sm font-bold rounded-xl border-2 transition-all flex-1 sm:flex-none ${falseStyle}`}
                >
                  Sai
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // --- VIDEO BASED ---
  const renderVideoBased = () => {
    const opts = question.options?.options || [];
    const videoUrl = question.options?.videoUrl || '';
    const isMrq = question.options?.isMultipleResponse || false;
    const userAnswerArr = isMrq ? (Array.isArray(userAnswer) ? userAnswer : []) : (typeof userAnswer === 'number' ? [userAnswer] : []);

    const isOptionSelected = (idx: number) => {
      return userAnswerArr.includes(idx);
    };

    const isOptionCorrect = (idx: number) => {
      if (isMrq) {
        const corrAns = Array.isArray(question.correctAnswer) ? question.correctAnswer : [];
        return corrAns.includes(idx);
      } else {
        return question.correctAnswer === idx;
      }
    };

    const getEmbedUrl = (url: string) => {
      if (!url) return '';
      if (url.includes('youtube.com/watch?v=')) {
        return url.replace('watch?v=', 'embed/').split('&')[0];
      }
      if (url.includes('youtu.be/')) {
        return url.replace('youtu.be/', 'youtube.com/embed/');
      }
      return url;
    };

    return (
      <div className="space-y-6">
        {videoUrl && (
          <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black border-2 border-slate-200 shadow-md">
            <iframe 
              src={getEmbedUrl(videoUrl)}
              title="Video"
              className="w-full h-full"
              allowFullScreen
            ></iframe>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {opts.map((opt: string, idx: number) => {
            const letter = String.fromCharCode(65 + idx);
            let stateClass = 'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:shadow-md';
            let letterClass = 'bg-slate-100 text-slate-500 border-slate-200';

            if (!isSubmitted) {
              if (isOptionSelected(idx)) {
                stateClass = 'bg-indigo-50 border-indigo-400 text-indigo-900 shadow-inner ring-2 ring-indigo-200 ring-offset-1';
                letterClass = 'bg-indigo-600 text-white border-indigo-700 shadow-sm';
              }
            } else {
              const selected = isOptionSelected(idx);
              const correct = isOptionCorrect(idx);

              if (correct) {
                stateClass = 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-inner ring-2 ring-emerald-200/50';
                letterClass = 'bg-emerald-500 text-white border-emerald-600 shadow-sm';
              } else if (selected && !correct) {
                stateClass = 'bg-rose-50 border-rose-300 text-rose-800 opacity-80';
                letterClass = 'bg-rose-500 text-white border-rose-600';
              } else {
                stateClass = 'bg-slate-50 border-slate-200 text-slate-400 opacity-60';
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={isSubmitted}
                onClick={() => {
                  if (isMrq) {
                    const newAns = [...userAnswerArr];
                    if (newAns.includes(idx)) {
                      onChangeAnswer(newAns.filter(i => i !== idx));
                    } else {
                      onChangeAnswer([...newAns, idx]);
                    }
                  } else {
                    onChangeAnswer(idx);
                  }
                }}
                className={`flex items-start text-left p-4 rounded-2xl border-2 transition-all ${stateClass}`}
              >
                <span className={`flex-shrink-0 w-8 h-8 rounded-lg border flex items-center justify-center font-black text-sm mr-3 transition-colors ${letterClass}`}>
                  {letter}
                </span>
                <span className="font-semibold text-sm leading-relaxed mt-1">
                  {opt}
                </span>
              </button>
            );
          })}
        </div>
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
      case QuestionType.TRUE_FALSE_MULTIPLE:
        return renderTrueFalseMultiple();
      case QuestionType.VIDEO_BASED:
        return renderVideoBased();
      case QuestionType.SEQUENCE:
        return renderSequence();
      case QuestionType.CATEGORIZATION:
        return renderCategorization();
      case QuestionType.HOTSPOT:
        return renderHotspot();
      case QuestionType.MATCH_IMAGE:
        return renderMatchImage();
      case QuestionType.MATRIX_SELECTION:
        return renderMatrixSelection();
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
      {mode !== 'exam' && !isSubmitted && onCheckAnswer && (
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

    </div>
  );
}
