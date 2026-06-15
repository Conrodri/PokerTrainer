import { motion } from 'framer-motion';
import { GraduationCap, Zap, Flame, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useModeStore, TrainingMode } from '../../store/modeStore';
import { useShallow } from 'zustand/react/shallow';
import { useLangStore } from '../../store/langStore';
import { useAuthStore } from '../../store/authStore';
import { useTrainingStore } from '../../store/trainingStore';

/**
 * Global beginner / advanced / expert toggle — reads from and writes to modeStore.
 * The Expert option is locked unless the user has the premium-expert tier; a
 * locked click routes to /premium instead of switching mode.
 */
export function ModeToggle() {
  const { mode, setMode } = useModeStore(useShallow(s => ({ mode: s.mode, setMode: s.setMode })));
  const isEn = useLangStore(s => s.lang) === 'en';
  const isExpert = !!useAuthStore(s => s.user?.isPremiumExpert);
  // Lock the toggle while a question is on screen — no mid-exercise mode switching.
  const isExercising = useTrainingStore(s => s.isExercising);
  const navigate = useNavigate();

  const options: { value: TrainingMode; label: string; icon: React.ReactNode; active: string }[] = [
    { value: 'beginner', label: isEn ? 'Beginner' : 'Débutant', icon: <GraduationCap size={12} />, active: 'bg-blue-600 text-white shadow-sm' },
    { value: 'advanced', label: isEn ? 'Advanced' : 'Avancé',   icon: <Zap size={12} />,           active: 'bg-gold-600 text-gray-900 shadow-sm' },
    { value: 'expert',   label: 'Expert',                       icon: <Flame size={12} />,         active: 'bg-purple-600 text-white shadow-sm' },
  ];

  return (
    <div className={`flex items-center gap-0.5 bg-gray-800/80 border border-gray-700 rounded-lg p-0.5 ${isExercising ? 'opacity-50' : ''}`}>
      {options.map(opt => {
        const locked = opt.value === 'expert' && !isExpert;
        return (
          <motion.button
            key={opt.value}
            disabled={isExercising}
            onClick={() => {
              if (isExercising) return;
              locked ? navigate('/premium') : setMode(opt.value);
            }}
            whileTap={isExercising ? undefined : { scale: 0.93 }}
            title={isExercising
              ? (isEn ? 'Finish the exercise to change mode' : "Termine l'exercice pour changer de mode")
              : locked ? (isEn ? 'Expert — premium tier' : 'Expert — offre premium') : undefined}
            className={`
              flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all
              ${isExercising ? 'cursor-not-allowed' : ''}
              ${mode === opt.value ? opt.active : 'text-gray-400 hover:text-white'}
            `}
          >
            {locked ? <Lock size={11} /> : opt.icon}
            <span className="hidden 2xl:block">{opt.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
}
