import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, GraduationCap, Zap, Flame, Star, Calculator, BarChart2, Layers } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useT } from '../i18n';
import type { TrainingMode } from '../store/modeStore';

// ─── Data ─────────────────────────────────────────────────────────────────────

type ModeDetail = {
  mode: TrainingMode;
  icon: React.ReactNode;
  label: { fr: string; en: string };
  color: { border: string; bg: string; text: string; btn: string };
  desc: { fr: string; en: string };
};

type ModuleEntry = {
  id: string;
  icon: string;
  title: { fr: string; en: string };
  subtitle: { fr: string; en: string };
  badge: { fr: string; en: string };
  badgeColor: string;
  href: string;
  premium?: boolean;
  modes: ModeDetail[];
};

const BEGINNER_STYLE = {
  border: 'border-blue-700/50',
  bg: 'bg-blue-950/30',
  text: 'text-blue-300',
  btn: 'bg-blue-700 hover:bg-blue-600 text-white',
};
const ADVANCED_STYLE = {
  border: 'border-amber-700/40',
  bg: 'bg-amber-950/20',
  text: 'text-amber-300',
  btn: 'bg-amber-700 hover:bg-amber-600 text-white',
};
const EXPERT_STYLE = {
  border: 'border-purple-700/40',
  bg: 'bg-purple-950/20',
  text: 'text-purple-300',
  btn: 'bg-purple-700 hover:bg-purple-600 text-white',
};

const MODULES: ModuleEntry[] = [
  {
    id: 'preflop',
    icon: '🎯',
    title: { fr: 'Pré-flop', en: 'Pre-flop' },
    subtitle: { fr: 'Ranges & Positions', en: 'Ranges & Positions' },
    badge: { fr: 'Fondamental', en: 'Fundamental' },
    badgeColor: 'bg-green-900 text-green-300',
    href: '/training?module=preflop',
    modes: [
      {
        mode: 'beginner',
        icon: <GraduationCap size={13} />,
        label: { fr: 'Débutant', en: 'Beginner' },
        color: BEGINNER_STYLE,
        desc: {
          fr: 'Les ranges GTO sont affichées visuellement sur la matrice 13×13. Tu vois quelles mains jouer (ou coucher) selon ta position, avec une explication complète à chaque réponse. Idéal pour mémoriser les patterns de base et comprendre pourquoi chaque main est jouée ou non.',
          en: 'GTO ranges are shown visually on the 13×13 matrix. You see which hands to play (or fold) by position, with a full explanation on each answer. Perfect for memorising the basic patterns and understanding why each hand is played.',
        },
      },
      {
        mode: 'advanced',
        icon: <Zap size={13} />,
        label: { fr: 'Avancé', en: 'Advanced' },
        color: ADVANCED_STYLE,
        desc: {
          fr: 'Les indices sont cachés — tu réponds sans support visuel. Tu peux configurer tes propres ranges (169 mains) et les sauvegarder en profils réutilisables. Le mode sprint te chronomètre à 10 secondes par décision. 4 formats de table (6-max, 8-max, 3-max, HU) × Cash-game et MTT.',
          en: 'Hints are hidden — you answer without visual support. Configure your own ranges (169 hands) and save them as reusable profiles. Sprint mode times you at 10 seconds per decision. 4 table formats (6-max, 8-max, 3-max, HU) × Cash-game and MTT.',
        },
      },
      {
        mode: 'expert',
        icon: <Flame size={13} />,
        label: { fr: 'Expert', en: 'Expert' },
        color: EXPERT_STYLE,
        desc: {
          fr: 'Fréquences multi-actions pour chaque main : Fold / Call / Raise / All-in en pourcentages exacts. Ranges personnalisées avancées avec mélanges de stratégies. Sprint à 5 secondes, 3 erreurs = fin de run. Le niveau le plus exigeant, proche du jeu en ligne compétitif.',
          en: 'Multi-action frequencies per hand: Fold / Call / Raise / All-in in exact percentages. Advanced custom ranges with strategy mixes. Sprint at 5 seconds, 3 errors = run over. The most demanding level, close to competitive online play.',
        },
      },
    ],
  },
  {
    id: 'outs',
    icon: '🎲',
    title: { fr: 'Outs', en: 'Outs' },
    subtitle: { fr: 'Cartes qui améliorent', en: 'Cards that improve' },
    badge: { fr: 'Mathématiques', en: 'Mathematics' },
    badgeColor: 'bg-amber-900 text-amber-300',
    href: '/training?module=outs',
    modes: [
      {
        mode: 'beginner',
        icon: <GraduationCap size={13} />,
        label: { fr: 'Débutant', en: 'Beginner' },
        color: BEGINNER_STYLE,
        desc: {
          fr: 'Les tirages possibles sont listés visuellement. Tu comptes tes outs avec l\'aide de l\'interface, puis tu appliques la règle de 2 & 4 guidée pas à pas. Une explication complète te rappelle pourquoi chaque carte compte comme out.',
          en: 'Possible draws are listed visually. You count your outs with interface help, then apply the 2 & 4 rule step by step. A full explanation reminds you why each card counts as an out.',
        },
      },
      {
        mode: 'advanced',
        icon: <Zap size={13} />,
        label: { fr: 'Avancé', en: 'Advanced' },
        color: ADVANCED_STYLE,
        desc: {
          fr: 'Les outs sont masqués après ton estimation. Tu dois évaluer l\'équité de tête, sans support visuel. Révéler l\'indice réinitialise ton streak. Les scénarios incluent des tirages combinés (flush draw + straight draw).',
          en: 'Outs are hidden after your estimate. You must assess equity mentally without visual support. Revealing the hint resets your streak. Scenarios include combined draws (flush draw + straight draw).',
        },
      },
      {
        mode: 'expert',
        icon: <Flame size={13} />,
        label: { fr: 'Expert', en: 'Expert' },
        color: EXPERT_STYLE,
        desc: {
          fr: 'Tu sautes directement au % d\'équité sans étape intermédiaire. Les scénarios sont plus complexes (outs pollués, tirages adverses à déduire). La règle de 2 & 4 doit être appliquée mentalement en 5 secondes.',
          en: 'You jump straight to the equity % without intermediate steps. Scenarios are more complex (dirty outs, opponent draws to factor in). The 2 & 4 rule must be applied mentally in 5 seconds.',
        },
      },
    ],
  },
  {
    id: 'equity',
    icon: '⚖️',
    title: { fr: 'Équité', en: 'Equity' },
    subtitle: { fr: 'Comparaison de mains', en: 'Hand comparison' },
    badge: { fr: 'Intermédiaire', en: 'Intermediate' },
    badgeColor: 'bg-purple-900 text-purple-300',
    href: '/training?module=equity',
    modes: [
      {
        mode: 'beginner',
        icon: <GraduationCap size={13} />,
        label: { fr: 'Débutant', en: 'Beginner' },
        color: BEGINNER_STYLE,
        desc: {
          fr: 'L\'équité minimum pour appeler est calculée étape par étape avec la formule affichée. Tu valides chaque étape avant d\'avancer. Parfait pour comprendre la logique mathématique derrière chaque call.',
          en: 'The minimum equity to call is calculated step by step with the formula shown. You validate each step before moving forward. Perfect for understanding the mathematical logic behind every call.',
        },
      },
      {
        mode: 'advanced',
        icon: <Zap size={13} />,
        label: { fr: 'Avancé', en: 'Advanced' },
        color: ADVANCED_STYLE,
        desc: {
          fr: 'Les indices sont masqués. Tu dois calculer les cotes du pot mentalement et estimer ton équité avant de décider. Révéler l\'indice casse la série. Les affrontements sont variés (suited connectors, paires contre surpaires).',
          en: 'Hints are hidden. You must mentally calculate pot odds and estimate your equity before deciding. Revealing the hint breaks the streak. Matchups are varied (suited connectors, pairs vs overpairs).',
        },
      },
      {
        mode: 'expert',
        icon: <Flame size={13} />,
        label: { fr: 'Expert', en: 'Expert' },
        color: EXPERT_STYLE,
        desc: {
          fr: 'Calculs de bounty tournoi : l\'équité effective prend en compte la prime du villain. Tu dois intégrer la valeur ICM pour évaluer si un call est rentable en contexte MTT. Le niveau le plus proche du jeu tournoi réel.',
          en: 'Tournament bounty calculations: effective equity accounts for the villain\'s bounty. You must factor in ICM value to assess call profitability in MTT context. The closest level to real tournament play.',
        },
      },
    ],
  },
  {
    id: 'potodds',
    icon: '📐',
    title: { fr: 'Pot Odds', en: 'Pot Odds' },
    subtitle: { fr: 'Calcul de rentabilité', en: 'Profitability calculation' },
    badge: { fr: 'Mathématiques', en: 'Mathematics' },
    badgeColor: 'bg-blue-900 text-blue-300',
    href: '/training?module=potodds',
    modes: [
      {
        mode: 'beginner',
        icon: <GraduationCap size={13} />,
        label: { fr: 'Débutant', en: 'Beginner' },
        color: BEGINNER_STYLE,
        desc: {
          fr: 'La cote du pot est calculée visuellement. Tu vois le ratio call/pot, l\'équité requise, et si le call est EV+ ou EV−. L\'app décompose chaque étape pour que tu comprennes la logique avant de répondre.',
          en: 'Pot odds are calculated visually. You see the call/pot ratio, required equity, and whether the call is EV+ or EV−. The app breaks down each step so you understand the logic before answering.',
        },
      },
      {
        mode: 'advanced',
        icon: <Zap size={13} />,
        label: { fr: 'Avancé', en: 'Advanced' },
        color: ADVANCED_STYLE,
        desc: {
          fr: 'L\'EV est affiché mais l\'indice de calcul est caché. Tu dois estimer les pot odds mentalement. Révéler l\'indice remet ton streak à zéro. Les scénarios incluent des tailles de mise variées (33 %, 67 %, pot, overbet).',
          en: 'EV is shown but the calculation hint is hidden. You must estimate pot odds mentally. Revealing the hint resets your streak. Scenarios include varied bet sizes (33%, 67%, pot, overbet).',
        },
      },
      {
        mode: 'expert',
        icon: <Flame size={13} />,
        label: { fr: 'Expert', en: 'Expert' },
        color: EXPERT_STYLE,
        desc: {
          fr: 'L\'équité est masquée. Tu pars des tailles brutes pour calculer les pot odds de zéro, puis décides. La décomposition EV complète (EV call vs fold, fréquences) t\'est révélée seulement après ta réponse.',
          en: 'Equity is hidden. You start from raw bet sizes to calculate pot odds from scratch, then decide. The full EV breakdown (EV call vs fold, frequencies) is revealed only after your answer.',
        },
      },
    ],
  },
  {
    id: 'postflop',
    icon: '🃏',
    title: { fr: 'Post-flop', en: 'Post-flop' },
    subtitle: { fr: 'Jeu après le flop', en: 'Play after the flop' },
    badge: { fr: 'Premium', en: 'Premium' },
    badgeColor: 'bg-gold-900/70 text-gold-300 border border-gold-700/40',
    href: '/training?module=postflop',
    premium: true,
    modes: [
      {
        mode: 'beginner',
        icon: <GraduationCap size={13} />,
        label: { fr: 'Débutant', en: 'Beginner' },
        color: BEGINNER_STYLE,
        desc: {
          fr: 'La main, l\'équité, la texture du board et l\'indice de continuation bet sont toujours visibles. Tu t\'habitues à lire les boards secs, humides et à tirages. Une explication te guide après chaque décision.',
          en: 'Your hand, equity, board texture and c-bet hint are always visible. You get used to reading dry, wet, and draw-heavy boards. An explanation guides you after each decision.',
        },
      },
      {
        mode: 'advanced',
        icon: <Zap size={13} />,
        label: { fr: 'Avancé', en: 'Advanced' },
        color: ADVANCED_STYLE,
        desc: {
          fr: 'L\'indice est caché. Tu dois analyser la texture du board et la range adverse pour décider seul de bet ou check. Révéler l\'indice casse la série. Les scénarios incluent des boards à double tirage et des situations multi-way.',
          en: 'The hint is hidden. You must analyse board texture and villain range to decide alone whether to bet or check. Revealing the hint breaks the streak. Scenarios include double-draw boards and multi-way situations.',
        },
      },
      {
        mode: 'expert',
        icon: <Flame size={13} />,
        label: { fr: 'Expert', en: 'Expert' },
        color: EXPERT_STYLE,
        desc: {
          fr: 'En plus de la décision bet/check, tu choisis la taille de mise optimale parmi 33 %, 67 % ou 100 % du pot. La lecture de main adverse est indispensable. Les spots incluent des turn et river avec action multi-rue.',
          en: 'Beyond the bet/check decision, you choose the optimal bet size from 33%, 67% or 100% of the pot. Reading the villain\'s hand is essential. Spots include turn and river with multi-street action.',
        },
      },
    ],
  },
  {
    id: 'fullhand',
    icon: '🎰',
    title: { fr: 'Main complète', en: 'Full Hand' },
    subtitle: { fr: 'Du pré-flop à la river', en: 'Pre-flop to river' },
    badge: { fr: 'Premium', en: 'Premium' },
    badgeColor: 'bg-gold-900/70 text-gold-300 border border-gold-700/40',
    href: '/training?module=fullhand',
    premium: true,
    modes: [
      {
        mode: 'beginner',
        icon: <GraduationCap size={13} />,
        label: { fr: 'Débutant', en: 'Beginner' },
        color: BEGINNER_STYLE,
        desc: {
          fr: 'Tu joues une main complète face à un villain IA, guidé à chaque rue avec des indices contextuels. Pré-flop → Flop → Turn → River. Chaque décision est commentée pour que tu comprennes la stratégie globale.',
          en: 'You play a full hand against an AI villain, guided at each street with contextual hints. Pre-flop → Flop → Turn → River. Each decision is commented so you understand the overall strategy.',
        },
      },
      {
        mode: 'advanced',
        icon: <Zap size={13} />,
        label: { fr: 'Avancé', en: 'Advanced' },
        color: ADVANCED_STYLE,
        desc: {
          fr: 'Aucun indice pendant la main. Toutes tes décisions (pré-flop → river) sont jugées globalement au showdown. L\'analyse post-main te montre où tu as perdu de l\'EV et comment corriger.',
          en: 'No hints during the hand. All your decisions (pre-flop → river) are judged globally at showdown. The post-hand analysis shows where you lost EV and how to correct it.',
        },
      },
      {
        mode: 'expert',
        icon: <Flame size={13} />,
        label: { fr: 'Expert', en: 'Expert' },
        color: EXPERT_STYLE,
        desc: {
          fr: 'Les pot odds et outs sont dévoilés après chaque rue — jamais pendant le jeu. Le standard de précision est maximal : chaque décision est évaluée individuellement avec une décomposition EV complète.',
          en: 'Pot odds and outs are revealed after each street — never during play. Precision standard is maximum: each decision is evaluated individually with a full EV breakdown.',
        },
      },
    ],
  },
  {
    id: 'betsizing',
    icon: '📏',
    title: { fr: 'Bet Sizing', en: 'Bet Sizing' },
    subtitle: { fr: 'Taille de mise optimale', en: 'Optimal bet size' },
    badge: { fr: 'Premium', en: 'Premium' },
    badgeColor: 'bg-gold-900/70 text-gold-300 border border-gold-700/40',
    href: '/training?module=betsizing',
    premium: true,
    modes: [
      {
        mode: 'beginner',
        icon: <GraduationCap size={13} />,
        label: { fr: 'Débutant', en: 'Beginner' },
        color: BEGINNER_STYLE,
        desc: {
          fr: 'La taille optimale est affichée avec une explication complète : pourquoi ce sizing sur ce board, avec cette main, dans cette position. Tu comprends les objectifs (valeur, protection, bluff) avant de jouer.',
          en: 'The optimal size is shown with a full explanation: why this sizing on this board, with this hand, in this position. You understand the goals (value, protection, bluff) before playing.',
        },
      },
      {
        mode: 'advanced',
        icon: <Zap size={13} />,
        label: { fr: 'Avancé', en: 'Advanced' },
        color: ADVANCED_STYLE,
        desc: {
          fr: 'Tu choisis la bonne taille parmi plusieurs options (33 %, 67 %, pot, overbet) sans aide. L\'explication arrive après ta réponse. Les spots couvrent pré-flop, flop, turn et river.',
          en: 'You choose the right size from several options (33%, 67%, pot, overbet) without help. The explanation arrives after your answer. Spots cover pre-flop, flop, turn and river.',
        },
      },
      {
        mode: 'expert',
        icon: <Flame size={13} />,
        label: { fr: 'Expert', en: 'Expert' },
        color: EXPERT_STYLE,
        desc: {
          fr: 'Pool pondéré de spots difficiles : pots 3-bet, décisions river avec polarisation de range, spots OOP (hors position). Les marges d\'erreur sont plus serrées — le bon sizing est précis.',
          en: 'Weighted pool of hard spots: 3-bet pots, river decisions with range polarisation, OOP plays. Error margins are tighter — the right sizing is precise.',
        },
      },
    ],
  },
  {
    id: 'bluff',
    icon: '🎭',
    title: { fr: 'Bluff', en: 'Bluff' },
    subtitle: { fr: 'Fréquence & sélection', en: 'Frequency & selection' },
    badge: { fr: 'Premium', en: 'Premium' },
    badgeColor: 'bg-gold-900/70 text-gold-300 border border-gold-700/40',
    href: '/training?module=bluff',
    premium: true,
    modes: [
      {
        mode: 'beginner',
        icon: <GraduationCap size={13} />,
        label: { fr: 'Débutant', en: 'Beginner' },
        color: BEGINNER_STYLE,
        desc: {
          fr: 'La grille de facteurs favorables au bluff (position, texture du board, range adverse, historique de la main) est toujours affichée. Une explication détaillée accompagne chaque réponse. Idéal pour apprendre à identifier les bonnes situations.',
          en: 'The grid of bluff-favourable factors (position, board texture, villain range, hand history) is always shown. A detailed explanation accompanies each answer. Ideal for learning to spot the right situations.',
        },
      },
      {
        mode: 'advanced',
        icon: <Zap size={13} />,
        label: { fr: 'Avancé', en: 'Advanced' },
        color: ADVANCED_STYLE,
        desc: {
          fr: 'Les facteurs et l\'explication sont révélés seulement après ta réponse. Tu dois te forger une intuition sur la fréquence de bluff non-exploitable et la sélection des mains candidates.',
          en: 'Factors and explanation are revealed only after your answer. You must build intuition on unexploitable bluff frequency and candidate hand selection.',
        },
      },
      {
        mode: 'expert',
        icon: <Flame size={13} />,
        label: { fr: 'Expert', en: 'Expert' },
        color: EXPERT_STYLE,
        desc: {
          fr: 'Aucun indice. Lecture pure : position, dynamique de la range sur plusieurs rues, texture du board, fréquence de fold adverse estimée. Les scénarios sont plus ambigus et les bonnes réponses moins évidentes.',
          en: 'No hints. Pure read: position, multi-street range dynamics, board texture, estimated villain fold frequency. Scenarios are more ambiguous and correct answers less obvious.',
        },
      },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function HomePage() {
  const t = useT();
  const isEn = t.nav.home === 'Home';
  const [selectedId, setSelectedId] = useState<string>('preflop');

  const selected = MODULES.find(m => m.id === selectedId) ?? MODULES[0];

  const FEATURES = [
    { Icon: Star, text: t.home.feature1 },
    { Icon: Calculator, text: t.home.feature2 },
    { Icon: BarChart2, text: t.home.feature3 },
    { Icon: Layers, text: t.home.feature4 },
  ];

  return (
    <div className="flex flex-col gap-2.5 max-w-xl mx-auto">

      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-2"
      >
        <div className="text-3xl mb-1">🃏</div>
        <h1 className="text-xl font-bold mb-1 font-serif">
          <span className="text-gold-400">Poker</span>
          <span className="text-white">Peak</span>
        </h1>
        <p className="text-xs text-gray-400 mb-2">{t.home.subtitle}</p>
        <div className="flex gap-2 justify-center flex-wrap">
          <Link to="/training?module=preflop">
            <Button size="sm" variant="gold">
              {t.home.start_btn} <ArrowRight size={14} className="inline ml-1" />
            </Button>
          </Link>
          <Link to="/stats">
            <Button size="sm" variant="ghost">{t.home.stats_btn}</Button>
          </Link>
        </div>
      </motion.section>

      {/* Module selector */}
      <section>
        <h2 className="text-sm font-bold text-white mb-2 text-center">{t.home.modules_title}</h2>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-1.5 justify-center mb-2.5">
          {MODULES.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedId(m.id)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                selectedId === m.id
                  ? 'bg-felt-700 border-felt-500 text-white shadow-glow-green'
                  : 'bg-gray-900/60 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              <span>{m.icon}</span>
              <span>{isEn ? m.title.en : m.title.fr}</span>
              {m.premium && <span className="text-gold-400 text-[10px] leading-none">👑</span>}
            </button>
          ))}
        </div>

        {/* Detail panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="bg-gray-900/50 border border-gray-800 rounded-xl px-3 py-2.5"
          >
            {/* Module header */}
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-2xl leading-none">{selected.icon}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-sm font-bold text-white leading-tight">
                    {isEn ? selected.title.en : selected.title.fr}
                  </h3>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${selected.badgeColor}`}>
                    {isEn ? selected.badge.en : selected.badge.fr}
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  {isEn ? selected.subtitle.en : selected.subtitle.fr}
                </p>
              </div>
            </div>

            {/* Mode cards */}
            <div className="flex flex-col gap-2">
              {selected.modes.map(m => (
                <div
                  key={m.mode}
                  className={`rounded-lg border px-2.5 py-2 ${m.color.border} ${m.color.bg}`}
                >
                  <div className={`flex items-center gap-1.5 mb-1 ${m.color.text}`}>
                    {m.icon}
                    <span className="text-xs font-bold">{isEn ? m.label.en : m.label.fr}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-snug mb-2">
                    {isEn ? m.desc.en : m.desc.fr}
                  </p>
                  <Link to={`${selected.href}&mode=${m.mode}`}>
                    <button className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${m.color.btn}`}>
                      {isEn
                        ? `Train — ${m.label.en}`
                        : `S'entraîner — ${m.label.fr}`}
                      <ArrowRight size={11} />
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </section>

      {/* Features */}
      <section className="bg-gray-900/50 rounded-xl px-3 py-2.5 border border-gray-800">
        <h2 className="text-sm font-bold text-white mb-2">{t.home.features_title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-start gap-2 text-gray-300">
              <span className="text-gold-400 shrink-0 mt-0.5"><f.Icon size={14} /></span>
              <span className="text-xs">{f.text}</span>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
