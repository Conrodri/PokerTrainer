import { motion } from 'framer-motion';
import { useLangStore } from '../../store/langStore';
import { useShallow } from 'zustand/react/shallow';

export function LanguageToggle() {
  const { lang, setLang } = useLangStore(useShallow(s => ({ lang: s.lang, setLang: s.setLang })));

  return (
    <motion.button
      onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
      whileTap={{ scale: 0.93 }}
      title={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
      className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wide transition-all bg-gray-800/80 border border-gray-700 text-gold-400 hover:text-gold-300 hover:bg-gray-700"
    >
      {lang}
    </motion.button>
  );
}
