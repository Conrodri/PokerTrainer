import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Crown, Check, Minus, Zap, Target, BookOpen,
  BarChart2, Star, ChevronRight, Sliders, Flame,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useLangStore } from '../store/langStore';
import { analytics } from '../lib/analytics';

// ─── Tiered comparison ────────────────────────────────────────────────────────
// Each row lists availability per tier: [free, premium, expert].
type Row = { icon: string; fr: string; en: string; tiers: [boolean, boolean, boolean] };

const MODULE_ROWS: Row[] = [
  { icon: '🎯', fr: 'Pré-flop',      en: 'Pre-flop',  tiers: [true,  true, true] },
  { icon: '🎲', fr: 'Outs',          en: 'Outs',      tiers: [true,  true, true] },
  { icon: '⚖️', fr: 'Équité',        en: 'Equity',    tiers: [true,  true, true] },
  { icon: '📊', fr: 'Pot Odds',      en: 'Pot Odds',  tiers: [true,  true, true] },
  { icon: '🃏', fr: 'Post-flop',     en: 'Post-flop', tiers: [false, true, true] },
  { icon: '🎰', fr: 'Main complète', en: 'Full Hand', tiers: [false, true, true] },
  { icon: '📐', fr: 'Bet Sizing',    en: 'Bet Sizing',tiers: [false, true, true] },
];

const FEATURE_ROWS: Row[] = [
  { icon: '🎓', fr: 'Modes Débutant & Avancé',               en: 'Beginner & Advanced modes',          tiers: [true,  true,  true ] },
  { icon: '📈', fr: 'Statistiques & classement',              en: 'Stats & leaderboard',                tiers: [false, true,  true ] },
  { icon: '🗂️', fr: 'Ranges personnalisées',                  en: 'Custom ranges',                     tiers: [false, true,  true ] },
  { icon: '🔥', fr: 'Mode Expert (exercices difficiles)',      en: 'Expert mode (harder exercises)',     tiers: [false, false, true ] },
  { icon: '🎚️', fr: 'Ranges multi-actions (Fold/Call/Raise/AI)', en: 'Multi-action ranges (Fold/Call/Raise/AI)', tiers: [false, false, true ] },
  { icon: '🏁', fr: 'Préflop sur tes propres ranges',         en: 'Pre-flop on your own ranges',        tiers: [false, false, true ] },
];

const PERKS = [
  { icon: <Zap size={14} className="text-gold-400" />,       fr: 'Tous les modules d\'entraînement', en: 'All training modules' },
  { icon: <BarChart2 size={14} className="text-gold-400" />, fr: 'Statistiques détaillées par module', en: 'Detailed stats per module' },
  { icon: <Star size={14} className="text-gold-400" />,      fr: 'Badge Premium sur le classement', en: 'Premium badge on the leaderboard' },
  { icon: <Sliders size={14} className="text-gold-400" />,   fr: 'Éditeur de ranges personnalisées', en: 'Custom range editor' },
] as const;

const EXPERT_PERKS = [
  { icon: <Crown size={16} className="text-purple-400 shrink-0" />, fr: 'Tout Premium inclus', en: 'Everything in Premium' },
  { icon: <Flame size={16} className="text-purple-400 shrink-0" />, fr: 'Mode Expert sur chaque module — zéro indice, scénarios durs', en: 'Expert mode on every module — zero hints, harder scenarios' },
  { icon: <Sliders size={16} className="text-purple-400 shrink-0" />, fr: 'Ranges multi-actions : mix Fold / Call / Raise / All-in par main', en: 'Multi-action ranges: Fold / Call / Raise / All-in mix per hand' },
  { icon: <Target size={16} className="text-purple-400 shrink-0" />, fr: 'Sprints préflop sur TES propres ranges', en: 'Pre-flop sprints on YOUR own ranges' },
] as const;

// ─── PremiumPage ──────────────────────────────────────────────────────────────

export function PremiumPage() {
  const user = useAuthStore(s => s.user);
  const isEn = useLangStore(s => s.lang) === 'en';

  const isPremium = !!user?.isPremium;
  const isExpert  = !!user?.isPremiumExpert;

  // Manual activation for now (swapped for the checkout call once billing is wired).
  const subscribeHref = (tier: 'Premium' | 'Expert') =>
    `mailto:contact@pokerpeak.app?subject=${encodeURIComponent(`Abonnement ${tier}`)}`;

  const handleSubscribeClick = (tier: 'Premium' | 'Expert') =>
    analytics.premiumCtaClicked(tier.toLowerCase());

  const cell = (on: boolean) =>
    on
      ? <Check size={16} className="text-gold-400 mx-auto" />
      : <Minus size={15} className="text-gray-700 mx-auto" />;

  return (
    <div className="flex flex-col gap-8 max-w-3xl mx-auto pb-8">

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-yellow-900/60 via-gold-900/40 to-gray-900 border border-gold-700/40 px-6 py-10 text-center"
      >
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gold-500/10 blur-3xl rounded-full" />
        </div>

        <Crown size={48} className="text-gold-400 mx-auto mb-4" fill="currentColor" />
        <h1 className="text-3xl font-black text-white mb-2">
          {isEn ? 'Choose your plan' : 'Choisis ton offre'}
        </h1>
        <p className="text-gray-300 text-base max-w-md mx-auto">
          {isEn
            ? 'Unlock every module — or go Expert to train on your own custom ranges.'
            : 'Débloque tous les modules — ou passe Expert pour t\'entraîner sur tes propres ranges.'}
        </p>

        {(isPremium || isExpert) && (
          <div className="mt-5 inline-flex items-center gap-2 bg-gold-600/20 border border-gold-600/40 text-gold-300 text-sm font-semibold px-4 py-2 rounded-full">
            <Crown size={14} fill="currentColor" />
            {isExpert
              ? (isEn ? 'You have Expert — enjoy!' : 'Tu as l\'offre Expert — profites-en !')
              : (isEn ? 'You have Premium — enjoy!' : 'Tu as Premium — profites-en !')}
          </div>
        )}
      </motion.div>

      {/* ── Pricing cards ── */}
      <div className="grid sm:grid-cols-3 gap-4">

        {/* Free */}
        <div className="rounded-2xl border border-gray-700 bg-gray-900/40 p-4 flex flex-col gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">
              {isEn ? 'Free' : 'Gratuit'}
            </p>
            <div className="flex items-end gap-1">
              <p className="text-2xl font-black text-white">0€</p>
              <p className="text-xs text-gray-500 mb-0.5">/ {isEn ? 'forever' : 'toujours'}</p>
            </div>
          </div>
          <ul className="flex flex-col gap-1.5 text-xs">
            {['Pré-flop', 'Outs', 'Équité', 'Pot Odds'].map(f => (
              <li key={f} className="flex items-center gap-2 text-gray-300">
                <Check size={12} className="text-green-400 shrink-0" />{f}
              </li>
            ))}
            <li className="flex items-center gap-2 text-gray-500">
              <Minus size={12} className="text-gray-700 shrink-0" />
              {isEn ? 'Premium modules limited' : 'Modules premium limités'}
            </li>
          </ul>
          {!user && (
            <Link
              to="/login"
              className="mt-auto text-center py-1.5 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 text-xs font-semibold transition-colors"
            >
              {isEn ? 'Sign up free' : 'Inscription gratuite'}
            </Link>
          )}
        </div>

        {/* Premium */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="rounded-2xl border border-gold-600/60 bg-gradient-to-br from-gold-900/30 to-gray-900/80 p-4 flex flex-col gap-3 relative overflow-hidden"
        >
          <div className="absolute top-2.5 right-2.5 bg-gold-600 text-gray-900 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            {isEn ? 'Popular' : 'Populaire'}
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-gold-500 mb-0.5 flex items-center gap-1">
              <Crown size={10} fill="currentColor" /> Premium
            </p>
            <div className="flex items-end gap-1.5">
              <p className="text-2xl font-black text-white">9,99€</p>
              <p className="text-xs text-gray-400 mb-0.5">/ {isEn ? 'month' : 'mois'}</p>
            </div>
            <p className="text-[11px] text-gray-500">{isEn ? 'No commitment' : 'Sans engagement'}</p>
          </div>
          <ul className="flex flex-col gap-1.5">
            {PERKS.map((p, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-gray-200">
                {p.icon}<span>{isEn ? p.en : p.fr}</span>
              </li>
            ))}
          </ul>
          {isPremium ? (
            <div className="mt-auto text-center py-1.5 rounded-xl bg-gold-600/20 border border-gold-600/40 text-gold-300 text-xs font-semibold">
              {isExpert ? (isEn ? '✓ Included' : '✓ Inclus') : (isEn ? '✓ Active' : '✓ Actif')}
            </div>
          ) : (
            <a
              href={subscribeHref('Premium')}
              onClick={() => handleSubscribeClick('Premium')}
              className="mt-auto text-center py-2 rounded-xl bg-gold-600 hover:bg-gold-500 text-gray-900 text-xs font-black transition-colors flex items-center justify-center gap-1.5"
            >
              {isEn ? 'Choose Premium' : 'Choisir Premium'}
              <ChevronRight size={13} />
            </a>
          )}
        </motion.div>

        {/* Expert */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="rounded-2xl border border-purple-600/60 bg-gradient-to-br from-purple-900/30 to-gray-900/80 p-4 flex flex-col gap-3 relative overflow-hidden"
        >
          <div className="absolute top-2.5 right-2.5 bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            Pro
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-purple-400 mb-0.5 flex items-center gap-1">
              <Flame size={10} fill="currentColor" /> Expert
            </p>
            <div className="flex items-end gap-1.5">
              <p className="text-2xl font-black text-white">24,99€</p>
              <p className="text-xs text-gray-400 mb-0.5">/ {isEn ? 'month' : 'mois'}</p>
            </div>
            <p className="text-[11px] text-gray-500">{isEn ? 'No commitment' : 'Sans engagement'}</p>
          </div>
          <ul className="flex flex-col gap-1.5">
            {EXPERT_PERKS.map((p, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-gray-200">
                {p.icon}<span className={i === 0 ? 'font-semibold text-purple-200' : ''}>{isEn ? p.en : p.fr}</span>
              </li>
            ))}
          </ul>
          {isExpert ? (
            <div className="mt-auto text-center py-1.5 rounded-xl bg-purple-600/20 border border-purple-600/40 text-purple-200 text-xs font-semibold">
              {isEn ? '✓ Active' : '✓ Actif'}
            </div>
          ) : (
            <a
              href={subscribeHref('Expert')}
              onClick={() => handleSubscribeClick('Expert')}
              className="mt-auto text-center py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black transition-colors flex items-center justify-center gap-1.5"
            >
              {isPremium ? (isEn ? 'Upgrade to Expert' : 'Passer à Expert') : (isEn ? 'Choose Expert' : 'Choisir Expert')}
              <ChevronRight size={13} />
            </a>
          )}
        </motion.div>
      </div>

      {/* ── Full comparison ── */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_3rem_3.5rem_3.5rem] sm:grid-cols-[1fr_4rem_5rem_5rem] text-[11px] sm:text-xs font-bold uppercase tracking-wider text-gray-500 px-3 sm:px-4 py-3 border-b border-gray-800">
          <span>{isEn ? 'Module / feature' : 'Module / fonction'}</span>
          <span className="text-center">{isEn ? 'Free' : 'Gratuit'}</span>
          <span className="text-center text-gold-500">Premium</span>
          <span className="text-center text-purple-400">Expert</span>
        </div>

        {[...MODULE_ROWS, ...FEATURE_ROWS].map((row, i, arr) => (
          <motion.div
            key={row.fr}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i, 8) * 0.03 }}
            className={`grid grid-cols-[1fr_3rem_3.5rem_3.5rem] sm:grid-cols-[1fr_4rem_5rem_5rem] items-center px-3 sm:px-4 py-2.5 ${
              i < arr.length - 1 ? 'border-b border-gray-800/60' : ''
            } ${i === MODULE_ROWS.length ? 'border-t-2 border-gray-800' : ''}`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-base leading-none shrink-0">{row.icon}</span>
              <span className="text-xs sm:text-sm text-gray-200 leading-snug">{isEn ? row.en : row.fr}</span>
            </div>
            <div>{cell(row.tiers[0])}</div>
            <div className={!row.tiers[0] && row.tiers[1] ? 'bg-gold-900/10 rounded' : ''}>{cell(row.tiers[1])}</div>
            <div className={!row.tiers[1] && row.tiers[2] ? 'bg-purple-900/10 rounded' : ''}>{cell(row.tiers[2])}</div>
          </motion.div>
        ))}
      </div>

      {/* ── FAQ ── */}
      <div className="bg-gray-900/40 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-white font-bold mb-4 flex items-center gap-2">
          <Target size={16} className="text-gold-400" />
          {isEn ? 'Questions' : 'Questions fréquentes'}
        </h2>
        <div className="flex flex-col gap-4">
          {[
            {
              q: isEn ? 'What\'s the difference between Premium and Expert?' : 'Quelle différence entre Premium et Expert ?',
              a: isEn
                ? 'Premium unlocks all 7 training modules. Expert goes further: every module gets a harder Expert mode (hidden equity, reduced timer on Equity; equity % estimation on Outs; full EV breakdown on Pot Odds; weighted hard spots on Bet Sizing & Post-flop), plus complex multi-action ranges (Fold/Call/Raise/All-in per hand) and pre-flop sprints on your own ranges.'
                : 'Premium débloque les 7 modules d\'entraînement. Expert va plus loin : chaque module passe en mode Expert difficile (équité masquée + chrono réduit sur Équité ; estimation équité % sur Outs ; décomposition EV complète sur Pot Odds ; spots durs pondérés sur Bet Sizing & Post-flop), plus les ranges complexes multi-actions (Fold/Call/Raise/All-in par main) et les sprints préflop sur tes propres ranges.',
            },
            {
              q: isEn ? 'How do I activate it?' : 'Comment l\'activer ?',
              a: isEn
                ? 'For now, contact us via the button and we activate your account manually within 24h. Online checkout is coming soon.'
                : 'Pour l\'instant, contacte-nous via le bouton et nous activons ton compte manuellement sous 24h. Le paiement en ligne arrive bientôt.',
            },
            {
              q: isEn ? 'Can I cancel anytime?' : 'Puis-je annuler à tout moment ?',
              a: isEn
                ? 'Yes — monthly, no commitment. You keep access until the end of the paid period.'
                : 'Oui — mensuel, sans engagement. Tu gardes l\'accès jusqu\'à la fin de la période payée.',
            },
          ].map((item, i) => (
            <div key={i} className={i > 0 ? 'border-t border-gray-800 pt-4' : ''}>
              <p className="text-sm font-semibold text-white mb-1">{item.q}</p>
              <p className="text-sm text-gray-400">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
