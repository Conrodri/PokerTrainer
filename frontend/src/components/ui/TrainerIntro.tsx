import { motion } from 'framer-motion';
import { GraduationCap, Play, Zap, Check } from 'lucide-react';
import { Button } from './Button';
import { RichText } from './RichText';
import { useLangStore } from '../../store/langStore';
import { useModeStore } from '../../store/modeStore';

interface TrainerIntroProps {
  emoji: string;
  title: string;            // already localized by caller
  description: string;      // already localized by caller
  whatTitle: string;        // already localized by caller
  whatContent: React.ReactNode;  // the inner content of the "What is X?" section — varies
  steps: string[];          // already localized bullet items (emoji + text combined)
  beginnerHint: string;     // already localized
  advancedHint: string;     // already localized
  startLabel: string;       // already localized
  onStart: () => void;
  mode: 'beginner' | 'advanced';
}

export function TrainerIntro({
  emoji, title, description, whatTitle, whatContent,
  steps, beginnerHint, advancedHint, startLabel, onStart, mode,
}: TrainerIntroProps) {
  const isEn = useLangStore(s => s.lang) === 'en';
  const setMode = useModeStore(s => s.setMode);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 max-w-xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex items-center justify-center text-3xl shadow-lg shadow-black/30">
          {emoji}
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white">{title}</h2>
        <div className="text-gray-400 text-xs sm:text-sm leading-snug max-w-lg">
          <RichText text={description} />
        </div>
      </div>

      {/* Info sections — stacked vertically, compact */}
      <div className="flex flex-col gap-2.5">
        {/* What is X? */}
        <section className="bg-gray-900/50 rounded-2xl px-4 py-3 border border-gray-800">
          <h3 className="text-gray-200 font-bold text-sm mb-2.5 flex items-center gap-2">
            <span className="grid place-items-center w-6 h-6 rounded-lg bg-blue-900/40 text-blue-300 text-xs">📖</span>
            {whatTitle}
          </h3>
          {whatContent}
        </section>

        {/* How it works */}
        <section className="bg-gray-900/50 rounded-2xl px-4 py-3 border border-gray-800">
          <h3 className="text-gray-200 font-bold text-sm mb-2.5 flex items-center gap-2">
            <span className="grid place-items-center w-6 h-6 rounded-lg bg-gold-900/40 text-gold-300 text-xs">⚡</span>
            {isEn ? 'How the exercises work' : 'Comment ça marche ?'}
          </h3>
          <ul className="space-y-1.5 text-xs sm:text-sm text-gray-400">
            {steps.map((item, i) => {
              const spaceIdx = item.indexOf(' ');
              return (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="grid place-items-center w-5 h-5 rounded-md bg-gray-800 text-[11px] shrink-0 mt-px">
                    {item.slice(0, spaceIdx)}
                  </span>
                  <div className="flex-1 leading-snug"><RichText text={item.slice(spaceIdx + 1)} /></div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      {/* Mode selector — segmented control + both modes explained in a compact box */}
      <div className="flex flex-col items-center gap-2">
        <div className="inline-flex p-1 rounded-2xl bg-gray-900/70 border border-gray-700 gap-1">
          <button
            type="button"
            onClick={() => setMode('beginner')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${
              mode === 'beginner' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <GraduationCap size={15} />
            {isEn ? 'Beginner' : 'Débutant'}
            {mode === 'beginner' && <Check size={13} />}
          </button>
          <button
            type="button"
            onClick={() => setMode('advanced')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-bold transition-all ${
              mode === 'advanced' ? 'bg-gold-600 text-gray-900 shadow' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Zap size={15} />
            {isEn ? 'Advanced' : 'Avancé'}
            {mode === 'advanced' && <Check size={13} />}
          </button>
        </div>

        {/* Both modes explained — active one highlighted */}
        <div className="w-full max-w-md rounded-xl border border-gray-800 bg-gray-900/40 px-3 py-2 flex flex-col gap-1 text-[11px] leading-snug">
          <div className={`flex items-start gap-1.5 transition-opacity ${mode === 'beginner' ? 'opacity-100' : 'opacity-50'}`}>
            <GraduationCap size={12} className="text-blue-400 mt-0.5 shrink-0" />
            <span className="text-gray-400">
              <span className="font-bold text-blue-300">{isEn ? 'Beginner' : 'Débutant'}</span> — {beginnerHint}
            </span>
          </div>
          <div className={`flex items-start gap-1.5 transition-opacity ${mode === 'advanced' ? 'opacity-100' : 'opacity-50'}`}>
            <Zap size={12} className="text-gold-400 mt-0.5 shrink-0" />
            <span className="text-gray-400">
              <span className="font-bold text-gold-300">{isEn ? 'Advanced' : 'Avancé'}</span> — {advancedHint}
            </span>
          </div>
        </div>
      </div>

      {/* Start button */}
      <Button size="lg" variant="gold" onClick={onStart} fullWidth>
        <Play size={16} className="inline mr-2" />
        {startLabel}
      </Button>
    </motion.div>
  );
}
