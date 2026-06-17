import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Crown, GraduationCap, Lightbulb } from 'lucide-react';
import { useLangStore } from '../store/langStore';

// ─── Section wrapper (matches the Rules page look) ────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900/60 rounded-2xl p-5 border border-gray-700">
      <h2 className="text-lg font-bold text-white mb-4">{title}</h2>
      {children}
    </div>
  );
}

// ─── Recommended learning order ───────────────────────────────────────────────
// Each step links straight to where you practise it. Premium steps are flagged.
const STEPS = [
  {
    n: 0, icon: '📚', to: '/rules', premium: false,
    titleFr: 'Les règles & le vocabulaire', titleEn: 'Rules & vocabulary',
    tagFr: 'Base', tagEn: 'Basics',
    whyFr: 'Avant toute décision : connaître les combinaisons, le déroulé d’une main (préflop → river) et les positions.',
    whyEn: 'Before any decision: learn the hand rankings, how a hand plays out (preflop → river) and the positions.',
  },
  {
    n: 1, icon: '🎯', to: '/training?module=preflop', premium: false,
    titleFr: 'Préflop', titleEn: 'Preflop',
    tagFr: 'Fondamental', tagEn: 'Fundamental',
    whyFr: 'La décision la plus fréquente du poker : quelles mains jouer selon ta position. Maîtrise ça en premier.',
    whyEn: 'The most frequent decision in poker: which hands to play by position. Master this first.',
  },
  {
    n: 2, icon: '🎲', to: '/training?module=outs', premium: false,
    titleFr: 'Outs', titleEn: 'Outs',
    tagFr: 'Maths simples', tagEn: 'Simple math',
    whyFr: 'Compter les cartes qui améliorent ta main. La brique de base pour évaluer un tirage au flop/turn.',
    whyEn: 'Count the cards that improve your hand. The building block for evaluating a draw on the flop/turn.',
  },
  {
    n: 3, icon: '⚖️', to: '/training?module=equity', premium: false,
    titleFr: 'Équité', titleEn: 'Equity',
    tagFr: 'Intermédiaire', tagEn: 'Intermediate',
    whyFr: 'Transformer tes outs en pourcentage de chances de gagner (règle de 2 et 4).',
    whyEn: 'Turn your outs into a win percentage (rule of 2 and 4).',
  },
  {
    n: 4, icon: '📊', to: '/training?module=potodds', premium: false,
    titleFr: 'Pot Odds', titleEn: 'Pot Odds',
    tagFr: 'Décision clé', tagEn: 'Key decision',
    whyFr: 'Comparer ton équité à la cote du pot : savoir QUAND payer est rentable. Réunit Outs + Équité.',
    whyEn: 'Compare your equity to the pot odds: know WHEN calling is profitable. Ties Outs + Equity together.',
  },
  {
    n: 5, icon: '🃏', to: '/training?module=postflop', premium: true,
    titleFr: 'Post-flop', titleEn: 'Post-flop',
    tagFr: 'Avancé', tagEn: 'Advanced',
    whyFr: 'Jouer le flop, le turn et la river : lecture du board, value et bluff.',
    whyEn: 'Play the flop, turn and river: board reading, value and bluffs.',
  },
  {
    n: 6, icon: '📐', to: '/training?module=betsizing', premium: true,
    titleFr: 'Bet Sizing', titleEn: 'Bet Sizing',
    tagFr: 'Avancé', tagEn: 'Advanced',
    whyFr: 'Combien miser selon ton objectif (value ou bluff) et la texture du board.',
    whyEn: 'How much to bet depending on your goal (value or bluff) and the board texture.',
  },
  {
    n: 7, icon: '🎰', to: '/training?module=fullhand', premium: true,
    titleFr: 'Main complète', titleEn: 'Full hand',
    tagFr: 'Synthèse', tagEn: 'Putting it together',
    whyFr: 'Enchaîner toutes les décisions d’une main réelle, de la préflop à la river.',
    whyEn: 'Chain every decision of a real hand, from preflop to the river.',
  },
] as const;

// ─── When decisions happen, street by street ──────────────────────────────────
const STREETS = [
  {
    color: 'bg-blue-500', labelFr: 'Préflop', labelEn: 'Preflop',
    qFr: 'Quelle main jouer depuis ma position ?', qEn: 'Which hand to play from my position?',
    skillFr: 'Préflop', skillEn: 'Preflop',
  },
  {
    color: 'bg-green-500', labelFr: 'Flop', labelEn: 'Flop',
    qFr: 'Ai-je un tirage ? Combien de cartes m’améliorent ?', qEn: 'Do I have a draw? How many cards improve me?',
    skillFr: 'Outs · Équité', skillEn: 'Outs · Equity',
  },
  {
    color: 'bg-yellow-500', labelFr: 'Turn', labelEn: 'Turn',
    qFr: 'Est-ce rentable de payer la mise adverse ?', qEn: 'Is it profitable to call the bet?',
    skillFr: 'Pot Odds', skillEn: 'Pot Odds',
  },
  {
    color: 'bg-red-500', labelFr: 'River', labelEn: 'River',
    qFr: 'Value bet ou bluff ? Et combien miser ?', qEn: 'Value bet or bluff? And how much to bet?',
    skillFr: 'Post-flop · Bet Sizing', skillEn: 'Post-flop · Bet Sizing',
  },
] as const;

export function LearningPathPage() {
  const isEn = useLangStore(s => s.lang) === 'en';

  return (
    <div className="flex flex-col gap-5 max-w-2xl mx-auto">
      {/* Title */}
      <div className="text-center mb-2">
        <h1 className="text-2xl font-bold text-white">
          🧭 {isEn ? 'How to learn' : 'Comment apprendre'}
        </h1>
        <p className="text-gray-400 mt-1 text-sm">
          {isEn
            ? 'A recommended order to understand poker step by step.'
            : 'Un ordre d’apprentissage recommandé pour comprendre le poker, étape par étape.'}
        </p>
      </div>

      {/* Intro tip */}
      <div className="flex items-start gap-2.5 rounded-xl border border-blue-800/50 bg-blue-900/20 px-4 py-3">
        <Lightbulb size={16} className="text-blue-300 mt-0.5 shrink-0" />
        <p className="text-sm text-blue-100/90 leading-relaxed">
          {isEn
            ? 'Each skill builds on the previous one. Follow the order, take the time to be comfortable with one module before moving to the next.'
            : 'Chaque compétence s’appuie sur la précédente. Suis l’ordre et prends le temps d’être à l’aise sur un module avant de passer au suivant.'}
        </p>
      </div>

      {/* ── Recommended path ── */}
      <Section title={`🪜 ${isEn ? 'Recommended order' : 'Ordre recommandé'}`}>
        <div className="flex flex-col gap-2.5">
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Link
                to={s.to}
                className="group flex items-start gap-3 rounded-xl border border-gray-700 bg-gray-800/40 px-3 py-3 hover:border-gold-600/60 hover:bg-gray-800/70 transition-colors"
              >
                {/* Step number */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-500 to-gold-700 text-gray-900 font-black text-sm flex items-center justify-center shadow">
                    {s.n}
                  </div>
                  {i < STEPS.length - 1 && <div className="w-px flex-1 mt-1 bg-gray-700/70 min-h-[10px]" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base leading-none">{s.icon}</span>
                    <span className="font-bold text-white text-sm">{isEn ? s.titleEn : s.titleFr}</span>
                    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-gray-700 text-gray-300">
                      {isEn ? s.tagEn : s.tagFr}
                    </span>
                    {s.premium && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-600/40 text-yellow-400">
                        <Crown size={9} fill="currentColor" /> Premium
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1 leading-snug">{isEn ? s.whyEn : s.whyFr}</p>
                </div>

                <ArrowRight size={15} className="text-gray-600 group-hover:text-gold-400 transition-colors shrink-0 mt-1" />
              </Link>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* ── When do decisions happen ── */}
      <Section title={`⏱️ ${isEn ? 'When decisions happen' : 'Quand surviennent les décisions'}`}>
        <p className="text-sm text-gray-400 mb-4">
          {isEn
            ? 'During a hand, each street raises a different question — and a different skill answers it.'
            : 'Pendant une main, chaque street pose une question différente — et une compétence différente y répond.'}
        </p>
        <div className="flex flex-col gap-3">
          {STREETS.map(st => (
            <div key={st.labelFr} className="flex items-start gap-3">
              <span className={`${st.color} text-white text-[11px] font-bold rounded-lg px-2 py-1 shrink-0 w-16 text-center`}>
                {isEn ? st.labelEn : st.labelFr}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-200 leading-snug">{isEn ? st.qEn : st.qFr}</p>
                <p className="text-xs text-gold-400/90 font-semibold mt-0.5">
                  → {isEn ? st.skillEn : st.skillFr}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/rules" className="flex-1">
          <button className="w-full py-3 rounded-xl border border-gray-600 bg-gray-800/60 hover:bg-gray-800 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
            <GraduationCap size={16} />
            {isEn ? 'Review the rules' : 'Revoir les règles'}
          </button>
        </Link>
        <Link to="/training?module=preflop" className="flex-1">
          <button className="w-full py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2">
            {isEn ? 'Start with Preflop' : 'Commencer par le Préflop'}
            <ArrowRight size={15} />
          </button>
        </Link>
      </div>
    </div>
  );
}
