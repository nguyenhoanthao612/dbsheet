import React, { useState, useEffect } from 'react';
import { motion, Reorder } from 'motion/react';
import { Question, QuestionType, IC3Category } from '../lib/db';
import { Check, X, ArrowUp, ArrowDown, HelpCircle, Eye, AlertCircle, GripVertical } from 'lucide-react';

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
      const bIdx = bIdxStr === '' ? -1 : parseInt(bIdxStr);
      const newSelections = [...matchingSelections];

      // Đảm bảo tính duy nhất: 1 đáp án cột B chỉ được chọn cho 1 đáp án cột A
      if (bIdx !== -1) {
        const existingAIdx = newSelections.findIndex(sel => sel === bIdx);
        if (existingAIdx !== -1 && existingAIdx !== aIdx) {
          newSelections[existingAIdx] = -1; // Hủy chọn ở mục cũ
        }
      }

      newSelections[aIdx] = bIdx;
      setMatchingSelections(newSelections);
      onChangeAnswer(newSelections);
    };

    return (
      <div className="space-y-4" id={`q_matching_${question.id}`}>
        <p className="text-xs text-amber-600 font-semibold flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg w-max mb-2">
          <AlertCircle className="w-4 h-4" /> Hãy nối các mục ở Cột A với Cột B bằng cách chọn tương ứng. (Mỗi đáp án chỉ được dùng 1 lần)
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
                <div key={aIdx} className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm transition-all hover:shadow-md ${borderClass}`}>
                  <span className="font-semibold text-slate-800 text-sm flex-1">{item}</span>

                  <select
                    disabled={isSubmitted}
                    value={selectedBIdx === -1 ? '' : selectedBIdx.toString()}
                    onChange={(e) => handleSelectMatch(aIdx, e.target.value)}
                    className="p-2 border-2 border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:border-indigo-500 focus:ring-indigo-200 outline-none w-full sm:w-auto"
                  >
                    <option value="">-- Chọn đáp án --</option>
                    {itemsB.map((itemB: string, bIdx: number) => {
                      return (
                        <option key={bIdx} value={bIdx.toString()}>
                          {idxToLetter(bIdx)}. {itemB}
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
            <h4 className="font-bold text-slate-700 text-sm border-b pb-2">CỘT B (Danh sách đáp án)</h4>
            <div className="space-y-2">
              {itemsB.map((item: string, idx: number) => {
                const isSelectedBySomeone = matchingSelections.includes(idx);
                return (
                  <div key={idx} className={`p-3 bg-white border-2 rounded-xl text-xs font-medium flex items-center gap-3 shadow-sm transition-all ${isSelectedBySomeone && !isSubmitted ? 'border-indigo-200 bg-indigo-50/30 opacity-70' : 'border-slate-200 hover:border-indigo-300'}`}>
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${isSelectedBySomeone && !isSubmitted ? 'bg-indigo-200 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                      {idxToLetter(idx)}
                    </span>
                    <span className="text-sm">{item}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Hiển thị đáp án đúng khi nộp bài */}
        {isSubmitted && (
          <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 text-sm text-emerald-800 mt-2 shadow-sm">
            <p className="font-bold mb-2 flex items-center gap-1.5"><Check className="w-5 h-5"/> Đáp án nối đúng:</p>
            <ul className="space-y-2">
              {itemsA.map((item: string, aIdx: number) => (
                <li key={aIdx} className="flex items-start gap-2 bg-white/60 p-2 rounded-lg border border-emerald-100">
                  <span className="font-bold min-w-[30px]">{aIdx + 1}.</span>
                  <span className="font-medium text-slate-700 flex-1">{item}</span>
                  <span className="text-emerald-500 font-bold px-2">➔</span>
                  <span className="font-semibold">{itemsB[question.correctAnswer[aIdx]]}</span>
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
