import React, { useState } from 'react';
import { Sparkles, Compass, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';
import { TriangleClass } from '../types';
import { useI18n } from '../i18n';

interface LearningGuideProps {
  currentClass: TriangleClass;
  onSelectPreset: (type: 'acute' | 'right' | 'obtuse') => void;
  mode: 'explore' | 'learn';
  onSetMode: (mode: 'explore' | 'learn') => void;
}

export const LearningGuide: React.FC<LearningGuideProps> = ({
  currentClass,
  onSelectPreset,
  mode,
  onSetMode,
}) => {
  const { t } = useI18n();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const learnSteps = [
    { step: 1, title: t('guide.step1.title'), text: t('guide.step1.text') },
    { step: 2, title: t('guide.step2.title'), text: t('guide.step2.text') },
    { step: 3, title: t('guide.step3.title'), text: t('guide.step3.text') },
    { step: 4, title: t('guide.step4.title'), text: t('guide.step4.text') },
    { step: 5, title: t('guide.step5.title'), text: t('guide.step5.text') },
    { step: 6, title: t('guide.step6.title'), text: t('guide.step6.text') },
    { step: 7, title: t('guide.step7.title'), text: t('guide.step7.text') },
  ];

  const activeStep = learnSteps[currentStepIndex];

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
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
              mode === 'explore'
                ? 'bg-slate-100 text-slate-800 border-slate-300 shadow-xs'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Compass className="w-3.5 h-3.5" /> {t('guide.exploreMode')}
          </button>
          <button
            id="modeLearnBtn"
            onClick={() => onSetMode('learn')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
              mode === 'learn'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-xs'
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> {t('guide.learnMode')}
          </button>
        </div>

        <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider hidden sm:inline">
          {t('guide.grade')}
        </span>
      </div>

      {/* Mode Content */}
      {mode === 'explore' ? (
        <div className="space-y-3.5">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
            <h4 className="text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
              <span>💡</span> {t('guide.exploreQuestion')}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {t('guide.exploreHint')}
            </p>
          </div>

          {/* Presets: ACUTE, RIGHT, OBTUSE */}
          <div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
              {t('guide.configurations')}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                id="presetAcuteBtn"
                onClick={() => onSelectPreset('acute')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition text-center flex flex-col items-center gap-0.5 cursor-pointer ${
                  currentClass === 'acute'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{t('guide.presetAcute')}</span>
                <span className="text-[10px] font-normal text-slate-500">{t('guide.presetAcuteDesc')}</span>
              </button>

              <button
                id="presetRightBtn"
                onClick={() => onSelectPreset('right')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition text-center flex flex-col items-center gap-0.5 cursor-pointer ${
                  currentClass === 'right'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{t('guide.presetRight')}</span>
                <span className="text-[10px] font-normal text-slate-500">{t('guide.presetRightDesc')}</span>
              </button>

              <button
                id="presetObtuseBtn"
                onClick={() => onSelectPreset('obtuse')}
                className={`p-2.5 rounded-xl text-xs font-bold border transition text-center flex flex-col items-center gap-0.5 cursor-pointer ${
                  currentClass === 'obtuse'
                    ? 'bg-amber-100 text-amber-800 border-amber-300 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{t('guide.presetObtuse')}</span>
                <span className="text-[10px] font-normal text-slate-500">{t('guide.presetObtuseDesc')}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-indigo-600" /> {t('guide.stepOf', {
                  step: activeStep.step,
                  total: learnSteps.length,
                  title: activeStep.title,
                })}
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
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 disabled:opacity-40 rounded-lg text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> {t('guide.prev')}
            </button>

            <div className="flex gap-1.5">
              {learnSteps.map((s, idx) => (
                <button
                  key={s.step}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`w-2.5 h-2.5 rounded-full transition cursor-pointer ${
                    idx === currentStepIndex ? 'bg-indigo-600 scale-125' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>

            <button
              id="nextStepBtn"
              disabled={currentStepIndex === learnSteps.length - 1}
              onClick={() => setCurrentStepIndex((prev) => Math.min(learnSteps.length - 1, prev + 1))}
              className="flex items-center gap-1 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 rounded-lg text-xs font-bold text-white transition shadow-sm shadow-indigo-200 cursor-pointer"
            >
              {t('guide.next')} <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
