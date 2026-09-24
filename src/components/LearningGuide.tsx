import React, { useState } from 'react';
import { Sparkles, Compass, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { TriangleClass } from '../types';

interface LearningGuideProps {
  currentClass: TriangleClass;
  onSelectPreset: (type: 'acute' | 'right' | 'obtuse') => void;
  mode: 'explore' | 'learn';
  onSetMode: (mode: 'explore' | 'learn') => void;
}

const LEARN_STEPS = [
  {
    step: 1,
    title: 'Три точки на окружности',
    text: 'Вершины A, B, C всегда находятся на одной замкнутой окружности. Попробуйте переместить любую из них.',
  },
  {
    step: 2,
    title: 'Стороны треугольника — это хорды',
    text: 'Отрезки AB, BC и CA соединяют точки окружности. В геометрии такие отрезки называются хордами.',
  },
  {
    step: 3,
    title: 'Три дуги окружности',
    text: 'Три вершины делят окружность ровно на три дуги: Дуга AB, Дуга BC, Дуга CA. Их сумма всегда равна целому кругу (360°)!',
  },
  {
    step: 4,
    title: 'Связь: Дуга ➔ Хорда',
    text: 'Каждая сторона стягивает свою дугу. Чем больше дуга, тем длиннее хорда (вплоть до диаметра).',
  },
  {
    step: 5,
    title: 'Противоположная вершина',
    text: 'Угол при вершине смотрит на противоположную сторону и дугу! Вписанный угол равен половине противоположной дуги (например, ∠A = ½ дуги BC).',
  },
  {
    step: 6,
    title: 'Центр O и три радиуса',
    text: 'Точка O — общий центр. Отрезки OA = OB = OC = R равны радиусу. Все три вершины равноудалены от центра.',
  },
  {
    step: 7,
    title: 'Положение центра O',
    text: 'Центр внутри — треугольник остроугольный. Центр лежит на стороне — прямоугольный (диаметр!). Центр снаружи — тупоугольный.',
  },
];

export const LearningGuide: React.FC<LearningGuideProps> = ({
  currentClass,
  onSelectPreset,
  mode,
  onSetMode,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const activeStep = LEARN_STEPS[currentStepIndex];

  return (
    <div
      id="learningGuideCard"
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col gap-3.5"
    >
      {/* Mode Switcher Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <button
            id="modeExploreBtn"
            onClick={() => onSetMode('explore')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition ${
              mode === 'explore'
                ? 'bg-slate-100 text-slate-800 border-slate-300 shadow-xs'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" /> EXPLORE (Исследование)
          </button>
          <button
            id="modeLearnBtn"
            onClick={() => onSetMode('learn')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition ${
              mode === 'learn'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> LEARN MODE (Обучение)
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider hidden sm:inline">
          5–8 класс
        </span>
      </div>

      {/* Mode Content */}
      {mode === 'explore' ? (
        <div className="space-y-3.5">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <h4 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <span>💡</span> Что изменится, если передвинуть одну вершину?
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Потяните любую точку <strong>A, B или C</strong>. Обратите внимание: меняется не одна сторона, а <strong>сразу вся система</strong> — две прилегающие дуги, противоположный угол и расстояние до центра O.
            </p>
          </div>

          {/* Presets: ACUTE, RIGHT, OBTUSE */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              Учебные конфигурации:
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                id="presetAcuteBtn"
                onClick={() => onSelectPreset('acute')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition text-center flex flex-col items-center gap-0.5 ${
                  currentClass === 'acute'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>ОСТРЫЙ</span>
                <span className="text-[10px] font-normal text-slate-500">O внутри</span>
              </button>

              <button
                id="presetRightBtn"
                onClick={() => onSelectPreset('right')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition text-center flex flex-col items-center gap-0.5 ${
                  currentClass === 'right'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>ПРЯМОЙ (90°)</span>
                <span className="text-[10px] font-normal text-slate-500">O на стороне</span>
              </button>

              <button
                id="presetObtuseBtn"
                onClick={() => onSelectPreset('obtuse')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition text-center flex flex-col items-center gap-0.5 ${
                  currentClass === 'obtuse'
                    ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>ТУПОЙ</span>
                <span className="text-[10px] font-normal text-slate-500">O снаружи</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-600" /> Шаг {activeStep.step} из {LEARN_STEPS.length}: {activeStep.title}
              </span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed pt-1">
              {activeStep.text}
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              id="prevStepBtn"
              disabled={currentStepIndex === 0}
              onClick={() => setCurrentStepIndex((prev) => Math.max(0, prev - 1))}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-40 rounded-lg text-xs font-semibold text-slate-700 transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Назад
            </button>

            <div className="flex gap-1.5">
              {LEARN_STEPS.map((s, idx) => (
                <button
                  key={s.step}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition ${
                    idx === currentStepIndex ? 'bg-indigo-600 scale-125' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>

            <button
              id="nextStepBtn"
              disabled={currentStepIndex === LEARN_STEPS.length - 1}
              onClick={() => setCurrentStepIndex((prev) => Math.min(LEARN_STEPS.length - 1, prev + 1))}
              className="flex items-center gap-1 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg text-xs font-bold text-white transition shadow-sm shadow-indigo-200"
            >
              Далее <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
