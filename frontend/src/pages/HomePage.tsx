import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calculator, BarChart2, Layers, ArrowRight, Star, GraduationCap, Zap, Flame } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useT } from '../i18n';

// ─── Tier row helpers ──────────────────────────────────────────────────────────

type Tier = { icon: React.ReactNode; label: string; desc: string; color: string };

function TierRow({ tier }: { tier: Tier }) {
  return (
    <div className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg border text-xs ${tier.color}`}>
      <span className="shrink-0 flex items-center mt-px">{tier.icon}</span>
      <span className="font-semibold shrink-0">{tier.label}</span>
      <span className="text-gray-400 leading-snug">{tier.desc}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function HomePage() {
  const t = useT();
  const isEn = t.nav.home === 'Home';

  // Shared tier definitions
  const T_FREE = (desc: string): Tier => ({
    icon: <GraduationCap size={11} />,
    label: isEn ? 'Free' : 'Gratuit',
    desc,
    color: 'border-blue-800/50 bg-blue-950/30 text-blue-300',
  });
  const T_ADV = (desc: string): Tier => ({
    icon: <Zap size={11} />,
    label: isEn ? 'Advanced' : 'Avancé',
    desc,
    color: 'border-gold-700/40 bg-gold-950/20 text-gold-300',
  });
  const T_EXP = (desc: string): Tier => ({
    icon: <Flame size={11} />,
    label: 'Expert',
    desc,
    color: 'border-purple-700/40 bg-purple-950/20 text-purple-300',
  });
  const T_EXP_SOON: Tier = {
    icon: <Flame size={11} />,
    label: 'Expert',
    desc: isEn ? '— coming soon' : '— à venir',
    color: 'border-purple-700/40 bg-purple-950/20 text-purple-300',
  };

  const FREE_MODULES = [
    {
      id: 'preflop',
      title: t.home.preflop_title,
      subtitle: t.home.preflop_sub,
      icon: '🎯',
      color: 'from-green-900/50 to-felt-900/50 border-green-700',
      badge: t.home.badge_core,
      badgeColor: 'bg-green-900 text-green-300',
      href: '/training?module=preflop',
      tiers: [
        T_FREE(isEn ? 'GTO ranges — fold / raise by position' : 'Ranges GTO — fold / raise par position'),
        { ...T_ADV(isEn ? 'Custom simple ranges (169 hands, saveable profiles)' : 'Ranges simples perso (169 mains, profils sauvegardables)'), label: isEn ? 'Advanced 👑' : 'Avancé 👑' },
        { ...T_EXP(isEn ? 'Multi-action frequency mixes (Fold / Call / Raise / All-in)' : 'Fréquences multi-actions (Fold / Call / Raise / All-in)'), label: 'Expert 👑' },
      ] as Tier[],
    },
    {
      id: 'outs',
      title: t.home.outs_title,
      subtitle: t.home.outs_sub,
      icon: '🎲',
      color: 'from-amber-900/50 to-felt-900/50 border-amber-700',
      badge: t.home.badge_math,
      badgeColor: 'bg-amber-900 text-amber-300',
      href: '/training?module=outs',
      tiers: [
        T_FREE(isEn ? 'Count outs — draws shown + rule of 2 & 4' : 'Compte les outs — tirages affichés + règle de 2 & 4'),
        T_ADV(isEn ? 'Hints hidden — estimate equity from your outs' : 'Indice caché — estime l\'équité depuis tes outs'),
        T_EXP_SOON,
      ] as Tier[],
    },
    {
      id: 'equity',
      title: t.home.equity_title,
      subtitle: t.home.equity_sub,
      icon: '⚖️',
      color: 'from-purple-900/50 to-felt-900/50 border-purple-700',
      badge: t.home.badge_mid,
      badgeColor: 'bg-purple-900 text-purple-300',
      href: '/training?module=equity',
      tiers: [
        T_FREE(isEn ? 'Compare two hands, guided result' : 'Comparer deux mains, résultat guidé'),
        T_ADV(isEn ? 'Hidden hints — estimate equity on your own' : 'Indice caché — estime l\'équité sans aide'),
        T_EXP_SOON,
      ] as Tier[],
    },
    {
      id: 'potodds',
      title: t.home.potodds_title,
      subtitle: t.home.potodds_sub,
      icon: '📐',
      color: 'from-blue-900/50 to-felt-900/50 border-blue-700',
      badge: t.home.badge_math,
      badgeColor: 'bg-blue-900 text-blue-300',
      href: '/training?module=potodds',
      tiers: [
        T_FREE(isEn ? 'Pot odds + call/fold decision with guidance' : 'Cote du pot + décision call/fold guidée'),
        T_ADV(isEn ? 'EV shown, hints hidden — reveal resets streak' : 'EV affiché, indice caché — révéler remet la série à 0'),
        T_EXP_SOON,
      ] as Tier[],
    },
  ];

  const PREMIUM_MODULES = [
    {
      id: 'postflop',
      title: t.home.postflop_title,
      subtitle: t.home.postflop_sub,
      icon: '🃏',
      badge: t.home.badge_adv,
      href: '/training?module=postflop',
      tiers: [
        T_FREE(isEn ? 'Hand, equity, texture & hint always visible' : 'Main, équité, texture et indice toujours visibles'),
        T_ADV(isEn ? 'Hint hidden — reveal breaks your streak' : 'Indice caché — révéler casse la série'),
        T_EXP_SOON,
      ] as Tier[],
    },
    {
      id: 'fullhand',
      title: t.home.fullhand_title,
      subtitle: t.home.fullhand_sub,
      icon: '🎰',
      badge: isEn ? 'Full game' : 'Jeu complet',
      href: '/training?module=fullhand',
      tiers: [
        T_FREE(isEn ? 'Guided at each street with hints' : 'Guidé à chaque rue avec indices'),
        T_ADV(isEn ? 'No hints — decisions judged globally at showdown' : 'Sans indice — décisions jugées au showdown'),
        T_EXP_SOON,
      ] as Tier[],
    },
    {
      id: 'betsize',
      title: t.home.betsize_title,
      subtitle: t.home.betsize_sub,
      icon: '📏',
      badge: isEn ? 'Sizing' : 'Sizing',
      href: '/training?module=betsizing',
      tiers: [
        T_FREE(isEn ? 'Optimal size shown with justification' : 'Taille optimale affichée avec justification'),
        T_ADV(isEn ? 'Choose the right size without help' : 'Choisir la bonne taille sans aide'),
        T_EXP_SOON,
      ] as Tier[],
    },
    {
      id: 'bluff',
      title: t.home.bluff_title,
      subtitle: t.home.bluff_sub,
      icon: '🎭',
      badge: isEn ? 'Psychology' : 'Psychologie',
      href: '#',
      comingSoon: true,
      tiers: [] as Tier[],
    },
  ];

  const FEATURES = [
    { icon: <Star size={20} />, text: t.home.feature1 },
    { icon: <Calculator size={20} />, text: t.home.feature2 },
    { icon: <BarChart2 size={20} />, text: t.home.feature3 },
    { icon: <Layers size={20} />, text: t.home.feature4 },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center pt-2"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          className="text-6xl mb-2"
        >
          🃏
        </motion.div>
        <h1 className="text-4xl font-bold mb-2 font-serif">
          <span className="text-gold-400">Poker</span>
          <span className="text-white">Peak</span>
        </h1>
        <p className="text-base text-gray-300 max-w-2xl mx-auto mb-4 leading-relaxed">
          {t.home.subtitle}
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link to="/training?module=preflop">
            <Button size="lg" variant="gold">
              {t.home.start_btn} <ArrowRight size={20} className="inline ml-1" />
            </Button>
          </Link>
          <Link to="/stats">
            <Button size="lg" variant="ghost">
              {t.home.stats_btn}
            </Button>
          </Link>
        </div>
      </motion.section>

      {/* Free modules */}
      <section>
        <h2 className="text-2xl font-bold text-white mb-3 text-center">{t.home.modules_title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FREE_MODULES.map((module, i) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
            >
              <Link to={module.href} className="block group h-full">
                <div className={`bg-gradient-to-br ${module.color} border rounded-2xl p-4 h-full transition-all duration-200 group-hover:scale-[1.02] group-hover:shadow-2xl flex flex-col`}>
                  <ModuleCard
                    icon={module.icon}
                    title={module.title}
                    subtitle={module.subtitle}
                    badge={module.badge}
                    badgeColor={module.badgeColor}
                    tiers={module.tiers}
                    startArrow={t.home.start_arrow}
                  />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Premium modules */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px bg-gold-700/30" />
          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold-900/30 border border-gold-700/50">
            <span className="text-lg leading-none">👑</span>
            <span className="text-gold-300 font-bold text-sm">
              {isEn ? 'Premium modules' : 'Modules Premium'}
            </span>
          </div>
          <div className="flex-1 h-px bg-gold-700/30" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PREMIUM_MODULES.map((module, i) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + i * 0.08 }}
            >
              {module.comingSoon ? (
                <div className="bg-gradient-to-br from-gold-900/10 to-gray-900/80 border border-gold-700/30 rounded-2xl p-4 h-full opacity-60 cursor-default flex flex-col">
                  <div className="flex items-center justify-end gap-1 mb-2 flex-wrap">
                    <span className="flex items-center gap-1 bg-gold-900/70 border border-gold-700/60 text-gold-300 text-[11px] font-bold px-2 py-0.5 rounded-full">
                      👑 {t.home.badge_premium}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium px-2 py-0.5 bg-gray-800/90 border border-gray-700 rounded-full">
                      {t.home.coming_soon}
                    </span>
                  </div>
                  <ModuleCard
                    icon={module.icon}
                    title={module.title}
                    subtitle={module.subtitle}
                    badge={module.badge}
                    badgeColor="bg-gray-800 text-gray-400"
                    tiers={[]}
                    startArrow="—"
                    subtitleColor="text-gold-400/70"
                    arrowColor="text-gray-600"
                    description={module.id === 'bluff'
                      ? (isEn ? 'Bluff frequency, hand selection, and unexploitable strategies.' : 'Fréquence de bluff, sélection de mains et stratégies non-exploitables.')
                      : undefined}
                  />
                </div>
              ) : (
                <Link to={module.href} className="block group h-full">
                  <div className="bg-gradient-to-br from-gold-900/20 to-gray-900/80 border border-gold-700/50 rounded-2xl p-4 h-full transition-all duration-200 group-hover:scale-[1.02] group-hover:shadow-2xl group-hover:border-gold-600 flex flex-col">
                    <div className="flex items-center justify-end mb-2">
                      <span className="flex items-center gap-1 bg-gold-900/70 border border-gold-700/60 text-gold-300 text-[11px] font-bold px-2 py-0.5 rounded-full">
                        👑 {t.home.badge_premium}
                      </span>
                    </div>
                    <ModuleCard
                      icon={module.icon}
                      title={module.title}
                      subtitle={module.subtitle}
                      badge={module.badge}
                      badgeColor="bg-gray-800 text-gray-400"
                      tiers={module.tiers}
                      startArrow={t.home.start_arrow}
                      subtitleColor="text-gold-400/70"
                    />
                  </div>
                </Link>
              )}
            </motion.div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-600 mt-4">
          {t.home.premium_label}
        </p>
      </section>

      {/* Features */}
      <section className="bg-gray-900/40 rounded-2xl p-5 border border-gray-800">
        <h2 className="text-lg font-bold text-white mb-4">{t.home.features_title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              className="flex items-start gap-3 text-gray-300"
            >
              <span className="text-gold-400 shrink-0 mt-0.5">{f.icon}</span>
              <span className="text-sm">{f.text}</span>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Shared card body ─────────────────────────────────────────────────────────

function ModuleCard({
  icon, title, subtitle, badge, badgeColor, tiers, startArrow,
  subtitleColor = 'text-gray-400',
  arrowColor = 'text-gold-400',
  description,
}: {
  icon: string;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  tiers: Tier[];
  startArrow: string;
  subtitleColor?: string;
  arrowColor?: string;
  description?: string;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-3xl leading-none">{icon}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h3 className="text-lg font-bold text-white leading-tight">{title}</h3>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${badgeColor}`}>{badge}</span>
          </div>
          <p className={`text-xs ${subtitleColor}`}>{subtitle}</p>
        </div>
      </div>

      {/* Tier rows or description */}
      <div className="flex flex-col gap-1 flex-1">
        {tiers.length > 0
          ? tiers.map((tier, i) => <TierRow key={i} tier={tier} />)
          : description
            ? <p className="text-sm text-gray-400 leading-snug">{description}</p>
            : null}
      </div>

      {/* CTA */}
      <div className={`flex items-center gap-1 mt-3 text-sm font-medium ${arrowColor}`}>
        <span>{startArrow}</span>
      </div>
    </>
  );
}
