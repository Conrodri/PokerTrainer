import { motion } from 'framer-motion';
import { GraduationCap, Zap, Flame, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useModeStore, TrainingMode } from '../../store/modeStore';
import { useLangStore } from '../../store/langStore';
import { useAuthStore } from '../../store/authStore';

/**
 * Global beginner / advanced / expert toggle — reads from and writes to modeStore.
 * The Expert option is locked unless the user has the premium-expert tier; a
 * locked click routes to /premium instead of switching mode.
 */
export function ModeToggle() {
  const { mode, setMode } = useModeStore();
  const isEn = useLangStore(s => s.lang) === 'en';
  const isExpert = !!useAuthStore(s => s.user?.isPremiumExpert);
  const navigate = useNavigate();

  const options: { value: TrainingMode; label: string; icon: React.ReactNode; active: string }[] = [
    { value: 'beginner', label: isEn ? 'Beginner' : 'Débutant', icon: <GraduationCap size={12} />, active: 'bg-blue-600 text-white shadow-sm' },
    { value: 'advanced', label: isEn ? 'Advanced' : 'Avancé',   icon: <Zap size={12} />,           active: 'bg-gold-600 text-gray-900 shadow-sm' },
    { value: 'expert',   label: 'Expert',                       icon: <Flame size={12} />,         active: 'bg-purple-600 text-white shadow-sm' },
  ];

  return (
    <div className="flex items-center gap-0.5 bg-gray-800/80 border border-gray-700 rounded-lg p-0.5">
      {options.map(opt => {
        const locked = opt.value === 'expert' && !isExpert;
        return (
          <motion.button
            key={opt.value}
            onClick={() => (locked ? navigate('/premium') : setMode(opt.value))}
            whileTap={{ scale: 0.93 }}
            title={locked ? (isEn ? 'Expert — premium tier' : 'Expert — offre premium') : undefined}
            className={`
              flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all
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
