import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, BookOpen, EyeOff } from 'lucide-react';
import { useT } from '../../i18n';
import { Button } from '../ui/Button';
import { Link } from 'react-router-dom';
import { RichLine } from '../ui/RichText';
import { useLangStore } from '../../store/langStore';
import { useAuthStore } from '../../store/authStore';

// AnimatePresence removed — slide transitions are instant (faster, no jank)

const TOTAL_SLIDES = 4;

interface TutorialProps {
  onClose: () => void;
}

export function Tutorial({ onClose }: TutorialProps) {
  const t = useT();
  const [slide, setSlide] = useState(0);
  const lang = useLangStore(s => s.lang);
  const dismissTutorial = useAuthStore(s => s.dismissTutorial);
  const isEn = lang === 'en';

  const handleClose = () => {
    onClose();
  };

  const handleFinish = () => {
    localStorage.setItem('poker-tutorial-done', '1');
    onClose();
  };

  /** "Never show again" — saves to localStorage + DB */
  const handleNeverShow = () => {
    localStorage.setItem('poker-tutorial-done', '1');
    dismissTutorial(); // fire-and-forget, gracefully ignores errors
    onClose();
  };

  const isLast = slide === TOTAL_SLIDES - 1;

  return (
    // No backdrop-blur — it forces the browser to resample every pixel behind
    // the overlay on every frame, causing severe lag on mid-range hardware.
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <motion.div
        // Opacity-only: no scale, no y — avoids triggering expensive GPU layers
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.12 }}
        className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <div className="flex items-center gap-2 text-gold-400">
            <BookOpen size={18} />
            <span className="font-bold text-sm">{t.tutorial.reopen}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {slide + 1} {t.tutorial.step_of} {TOTAL_SLIDES}
            </span>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-800"
              title={t.tutorial.skip}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center pt-4 px-6 shrink-0">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`rounded-full transition-all ${i === slide ? 'w-6 h-2 bg-gold-500' : 'w-2 h-2 bg-gray-700 hover:bg-gray-500'}`}
            />
          ))}
        </div>

        {/* Slide content — instant switch, no AnimatePresence overhead */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {slide === 0 && <Slide1 isEn={isEn} />}
          {slide === 1 && <Slide2 isEn={isEn} />}
          {slide === 2 && <Slide3 isEn={isEn} />}
          {slide === 3 && <Slide4 isEn={isEn} onFinish={handleFinish} />}
        </div>

        {/* Footer nav */}
        <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between shrink-0">
          <button
            onClick={handleClose}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            {t.tutorial.skip}
          </button>

          <div className="flex items-center gap-2">
            {slide > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setSlide(s => s - 1)}>
                <ChevronLeft size={14} className="inline" /> {t.tutorial.prev.replace('← ', '')}
              </Button>
            )}
            {!isLast ? (
              <Button size="sm" variant="gold" onClick={() => setSlide(s => s + 1)}>
                {t.tutorial.next.replace(' →', '')} <ChevronRight size={14} className="inline" />
              </Button>
            ) : (
              <Button size="sm" variant="gold" onClick={handleFinish}>
                {t.tutorial.finish}
              </Button>
            )}
          </div>
        </div>

        {/* Never show again — visible on every slide */}
        <div className="px-6 pb-5 shrink-0 flex justify-center">
          <button
            onClick={handleNeverShow}
            className="flex items-center gap-1.5 text-xs text-gray-600 hover:text-gray-400 transition-colors group"
          >
            <EyeOff size={13} className="group-hover:text-gray-400 transition-colors" />
            {isEn ? 'Never show this again' : 'Ne plus jamais afficher'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Slides ───────────────────────────────────────────────────────────────────

function SlideTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold text-white mb-4">{children}</h2>;
}

function Slide1({ isEn }: { isEn: boolean }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center py-4">
      <div className="text-7xl">🏆</div>
      <SlideTitle>PokerTrainer</SlideTitle>
      <p className="text-gray-300 text-base leading-relaxed max-w-md">
        {isEn
          ? 'A practice tool to sharpen your poker decisions — not a real-money game. Train at your own pace, repeat as many times as you need.'
          : "Un outil d'entraînement pour améliorer tes décisions au poker — pas un vrai jeu. Entraîne-toi à ton rythme, autant de fois que tu veux."}
      </p>
      <div className="flex flex-wrap gap-3 justify-center mt-2">
        <span className="bg-blue-900/50 border border-blue-700 text-blue-300 font-semibold px-4 py-2 rounded-full text-sm">
          {isEn ? '📚 Learn' : '📚 Apprends'}
        </span>
        <span className="bg-gold-900/50 border border-gold-700 text-gold-300 font-semibold px-4 py-2 rounded-full text-sm">
          {isEn ? '🎯 Practice' : '🎯 Entraîne-toi'}
        </span>
        <span className="bg-green-900/50 border border-green-700 text-green-300 font-semibold px-4 py-2 rounded-full text-sm">
          {isEn ? '📈 Improve' : '📈 Progresse'}
        </span>
      </div>
    </div>
  );
}

function Slide2({ isEn }: { isEn: boolean }) {
  const modules = [
    { icon: '🎯', name: isEn ? 'Pre-flop'      : 'Pré-flop',       desc: isEn ? 'Which hands to play by position'        : 'Quelles mains jouer selon ta position',          premium: false },
    { icon: '📐', name: 'Pot Odds',              desc: isEn ? 'Is it profitable to call?'           : 'Est-ce rentable de suivre ?',                    premium: false },
    { icon: '⚖️', name: isEn ? 'Equity'         : 'Équité',         desc: isEn ? 'Which hand has better odds?'            : 'Quelle main a plus de chances de gagner ?',      premium: false },
    { icon: '🔢', name: 'Outs',                  desc: isEn ? 'How many cards improve your hand?'   : 'Combien de cartes améliorent ta main ?',          premium: false },
    { icon: '🃏', name: 'Post-flop',             desc: isEn ? 'Bet, check, or fold after the flop'  : 'Miser, checker, ou folder après le flop',        premium: true  },
    { icon: '🎰', name: isEn ? 'Full hand'       : 'Main complète',  desc: isEn ? 'Play a hand from start to finish'      : 'Joue une main du début à la fin',                premium: true  },
  ];

  return (
    <div className="flex flex-col gap-4">
      <SlideTitle>{isEn ? '6 training modules' : "Les 6 modules d'entraînement"}</SlideTitle>
      <div className="grid grid-cols-2 gap-3">
        {modules.map(mod => (
          <div key={mod.name} className="bg-gray-900/60 rounded-xl p-3 flex items-start gap-3">
            <span className="text-2xl mt-0.5">{mod.icon}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-white font-semibold text-sm">{mod.name}</span>
                {mod.premium && (
                  <span className="text-[10px] bg-gold-800/60 text-gold-300 border border-gold-700 px-1.5 py-0.5 rounded-full font-semibold">👑</span>
                )}
              </div>
              <p className="text-gray-400 text-xs mt-0.5 leading-snug"><RichLine text={mod.desc} /></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Slide3({ isEn }: { isEn: boolean }) {
  return (
    <div className="flex flex-col gap-5">
      <SlideTitle>{isEn ? 'Choose your level' : 'Choisis ton niveau'}</SlideTitle>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-blue-950/40 border border-blue-700 rounded-xl p-4 flex flex-col gap-3">
          <div className="text-3xl text-center">🎓</div>
          <p className="text-white font-bold text-center text-base">{isEn ? 'Beginner' : 'Débutant'}</p>
          <ul className="text-sm text-blue-200 space-y-1.5">
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span>{isEn ? 'Hints shown' : 'Indices affichés'}</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span>{isEn ? 'Explanations' : 'Explications'}</li>
            <li className="flex items-center gap-2"><span className="text-green-400">✓</span><RichLine text={isEn ? 'Hand ranges' : 'Ranges de mains'} /></li>
          </ul>
          <p className="text-xs text-blue-300 text-center italic">{isEn ? 'For people learning' : 'Pour ceux qui apprennent'}</p>
        </div>
        <div className="bg-gold-950/30 border border-gold-700 rounded-xl p-4 flex flex-col gap-3">
          <div className="text-3xl text-center">⚡</div>
          <p className="text-white font-bold text-center text-base">{isEn ? 'Advanced' : 'Avancé'}</p>
          <ul className="text-sm text-gold-200 space-y-1.5">
            <li className="flex items-center gap-2"><span className="text-red-400">✗</span>{isEn ? 'No hints' : "Pas d'indices"}</li>
            <li className="flex items-center gap-2"><span className="text-red-400">✗</span>{isEn ? 'No explanations' : "Pas d'explications"}</li>
            <li className="flex items-center gap-2"><span className="text-gold-400">✓</span>{isEn ? 'Train your memory' : 'Entraîne ta mémoire'}</li>
          </ul>
          <p className="text-xs text-gold-300 text-center italic">{isEn ? 'No hand-holding' : 'Sans filet de sécurité'}</p>
        </div>
      </div>
      <div className="bg-gray-900/60 border border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-400 text-center">
        💡 {isEn ? 'You can switch mode at any time from the top bar' : "Tu peux changer le mode à tout moment depuis la barre en haut"}
      </div>
    </div>
  );
}

function Slide4({ isEn, onFinish }: { isEn: boolean; onFinish: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6 text-center py-4">
      <div className="text-7xl">🎯</div>
      <SlideTitle>{isEn ? 'Ready to play?' : 'Prêt à jouer ?'}</SlideTitle>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link to="/training?module=preflop" onClick={onFinish} className="w-full">
          <Button size="lg" variant="gold" className="w-full">
            {isEn ? 'Start training →' : "Commencer l'entraînement →"}
          </Button>
        </Link>
        <Link to="/training?module=rules" onClick={onFinish} className="w-full">
          <Button size="lg" variant="ghost" className="w-full">
            {isEn ? 'See poker rules' : 'Voir les règles du poker'}
          </Button>
        </Link>
      </div>
      <p className="text-xs text-gray-500 max-w-sm leading-relaxed">
        {isEn
          ? 'Complete rules are available in the "Rules" tab on the Training page'
          : 'Les règles complètes sont disponibles dans l\'onglet « Règles » de la page Entraînement'}
      </p>
    </div>
  );
}

