import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Crown, Check, X, Zap, Target, BookOpen,
  BarChart2, Lock, Star, ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useLangStore } from '../store/langStore';

// ─── Feature list ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: '🎯',
    labelFr: 'Pré-flop',
    labelEn: 'Pre-flop',
    descFr: 'Toutes les positions, toutes les situations',
    descEn: 'All positions, all situations',
    free: true,
  },
  {
    icon: '🎲',
    labelFr: 'Outs',
    labelEn: 'Outs',
    descFr: 'Calculer vos outs et votre équité',
    descEn: 'Calculate your outs and equity',
    free: true,
  },
  {
    icon: '⚖️',
    labelFr: 'Équité',
    labelEn: 'Equity',
    descFr: "Comprendre l'équité main vs main",
    descEn: 'Understand hand vs hand equity',
    free: true,
  },
  {
    icon: '📊',
    labelFr: 'Pot Odds',
    labelEn: 'Pot Odds',
    descFr: 'Maîtriser les décisions mathématiques',
    descEn: 'Master mathematical decisions',
    free: true,
  },
  {
    icon: '🃏',
    labelFr: 'Post-flop',
    labelEn: 'Post-flop',
    descFr: 'Décisions sur flop, turn et river',
    descEn: 'Decisions on flop, turn and river',
    free: false,
  },
  {
    icon: '🎰',
    labelFr: 'Main complète',
    labelEn: 'Full Hand',
    descFr: 'Simuler une main entière du début à la fin',
    descEn: 'Simulate a full hand from start to finish',
    free: false,
  },
  {
    icon: '📐',
    labelFr: 'Bet Sizing',
    labelEn: 'Bet Sizing',
    descFr: 'Optimiser la taille de vos mises',
    descEn: 'Optimise your bet sizes',
    free: false,
  },
] as const;

const PERKS = [
  {
    icon: <Zap size={18} className="text-gold-400" />,
    fr: 'Accès à tous les modules d\'entraînement',
    en: 'Access to all training modules',
  },
  {
    icon: <Star size={18} className="text-gold-400" />,
    fr: 'Badge Premium sur le classement',
    en: 'Premium badge on the leaderboard',
  },
  {
    icon: <BarChart2 size={18} className="text-gold-400" />,
    fr: 'Statistiques détaillées par module',
    en: 'Detailed stats per module',
  },
  {
    icon: <BookOpen size={18} className="text-gold-400" />,
    fr: 'Nouvelles fonctionnalités en priorité',
    en: 'New features first',
  },
] as const;

// ─── PremiumPage ──────────────────────────────────────────────────────────────

export function PremiumPage() {
  const user = useAuthStore(s => s.user);
  const isEn = useLangStore(s => s.lang) === 'en';

  const isPremium = user?.isPremium;

  return (
    <div className="flex flex-col gap-8 max-w-2xl mx-auto pb-8">

      {/* ── Hero ── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-yellow-900/60 via-gold-900/40 to-gray-900 border border-gold-700/40 px-6 py-10 text-center"
      >
        {/* Glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-gold-500/10 blur-3xl rounded-full" />
        </div>

        <Crown size={48} className="text-gold-400 mx-auto mb-4" fill="currentColor" />
        <h1 className="text-3xl font-black text-white mb-2">
          {isEn ? 'Go Premium' : 'Passer Premium'}
        </h1>
        <p className="text-gray-300 text-base max-w-md mx-auto">
          {isEn
            ? 'Unlock all training modules and take your poker game to the next level.'
            : 'Débloquez tous les modules d\'entraînement et passez au niveau supérieur.'}
        </p>

        {isPremium && (
          <div className="mt-5 inline-flex items-center gap-2 bg-gold-600/20 border border-gold-600/40 text-gold-300 text-sm font-semibold px-4 py-2 rounded-full">
            <Crown size={14} fill="currentColor" />
            {isEn ? 'You already have Premium — enjoy!' : 'Vous êtes déjà Premium — profitez-en !'}
          </div>
        )}
      </motion.div>

      {/* ── Feature comparison ── */}
      <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] text-xs font-bold uppercase tracking-wider text-gray-500 px-4 py-3 border-b border-gray-800">
          <span>{isEn ? 'Module' : 'Module'}</span>
          <span className="text-center px-3">{isEn ? 'Free' : 'Gratuit'}</span>
          <span className="text-center px-3 text-gold-500">Premium</span>
        </div>

        {FEATURES.map((feat, i) => {
          const label = isEn ? feat.labelEn : feat.labelFr;
          const desc  = isEn ? feat.descEn  : feat.descFr;
          return (
            <motion.div
              key={feat.icon}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`grid grid-cols-[1fr_auto_auto] items-center px-4 py-3 ${
                i < FEATURES.length - 1 ? 'border-b border-gray-800/60' : ''
              } ${!feat.free ? 'bg-gold-900/10' : ''}`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xl leading-none shrink-0">{feat.icon}</span>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${feat.free ? 'text-white' : 'text-gold-300'}`}>
                    {label}
                  </p>
                  <p className="text-[11px] text-gray-500 truncate">{desc}</p>
                </div>
              </div>
              <div className="flex justify-center px-3">
                {feat.free
                  ? <Check size={16} className="text-green-400" />
                  : <X size={16} className="text-gray-600" />}
              </div>
              <div className="flex justify-center px-3">
                <Check size={16} className="text-gold-400" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* ── Pricing card ── */}
      <div className="grid sm:grid-cols-2 gap-4">

        {/* Free */}
        <div className="rounded-2xl border border-gray-700 bg-gray-900/40 p-5 flex flex-col gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              {isEn ? 'Free' : 'Gratuit'}
            </p>
            <p className="text-3xl font-black text-white">0€</p>
            <p className="text-xs text-gray-500 mt-0.5">{isEn ? 'Forever' : 'Pour toujours'}</p>
          </div>
          <ul className="flex flex-col gap-2">
            {['Pré-flop', 'Outs', 'Équité', 'Pot Odds'].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                <Check size={13} className="text-green-400 shrink-0" />{f}
              </li>
            ))}
            {['Post-flop', 'Main complète', 'Bet Sizing'].map(f => (
              <li key={f} className="flex items-center gap-2 text-sm text-gray-500">
                <Lock size={13} className="text-gray-700 shrink-0" />{f}
              </li>
            ))}
          </ul>
          {!user && (
            <Link
              to="/login"
              className="mt-auto text-center py-2 rounded-xl border border-gray-700 text-gray-300 hover:bg-gray-800 text-sm font-semibold transition-colors"
            >
              {isEn ? 'Sign up free' : 'Inscription gratuite'}
            </Link>
          )}
        </div>

        {/* Premium */}
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="rounded-2xl border border-gold-600/60 bg-gradient-to-br from-gold-900/30 to-gray-900/80 p-5 flex flex-col gap-4 relative overflow-hidden"
        >
          <div className="absolute top-3 right-3 bg-gold-600 text-gray-900 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
            {isEn ? 'Best value' : 'Meilleure offre'}
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gold-500 mb-1 flex items-center gap-1">
              <Crown size={11} fill="currentColor" /> Premium
            </p>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-black text-white">4,99€</p>
              <p className="text-xs text-gray-400 mb-1">/ {isEn ? 'month' : 'mois'}</p>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {isEn ? 'or 39,99€ / year (save 33%)' : 'ou 39,99€ / an (économisez 33%)'}
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {PERKS.map((p, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-gray-200">
                {p.icon}
                <span>{isEn ? p.en : p.fr}</span>
              </li>
            ))}
          </ul>
          {isPremium ? (
            <div className="mt-auto text-center py-2 rounded-xl bg-gold-600/20 border border-gold-600/40 text-gold-300 text-sm font-semibold">
              {isEn ? '✓ Active' : '✓ Actif'}
            </div>
          ) : (
            <a
              href="mailto:contact@pokertrainer.app?subject=Abonnement Premium"
              className="mt-auto text-center py-2.5 rounded-xl bg-gold-600 hover:bg-gold-500 text-gray-900 text-sm font-black transition-colors flex items-center justify-center gap-1.5"
            >
              {isEn ? 'Get Premium' : 'Obtenir Premium'}
              <ChevronRight size={15} />
            </a>
          )}
        </motion.div>
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
              q: isEn ? 'How do I activate Premium?' : 'Comment activer le Premium ?',
              a: isEn
                ? 'Send us an email via the button above. We\'ll manually activate your account within 24h.'
                : 'Envoyez-nous un email via le bouton ci-dessus. Nous activerons manuellement votre compte sous 24h.',
            },
            {
              q: isEn ? 'Can I cancel anytime?' : 'Puis-je annuler à tout moment ?',
              a: isEn
                ? 'Yes, no commitment. Contact us and we\'ll cancel your subscription immediately.'
                : 'Oui, sans engagement. Contactez-nous et nous annulerons votre abonnement immédiatement.',
            },
            {
              q: isEn ? 'What payment methods are accepted?' : 'Quels moyens de paiement sont acceptés ?',
              a: isEn
                ? 'PayPal, bank transfer or any other method by arrangement.'
                : 'PayPal, virement bancaire ou tout autre moyen par arrangement.',
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
