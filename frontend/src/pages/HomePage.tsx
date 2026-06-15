import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calculator, BarChart2, Layers, ArrowRight, Star } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useT } from '../i18n';

export function HomePage() {
  const t = useT();

  const isEn = t.nav.home === 'Home';

  const FREE_MODULES = [
    {
      id: 'preflop',
      title: t.home.preflop_title,
      subtitle: t.home.preflop_sub,
      description: t.home.preflop_desc,
      icon: '🎯',
      color: 'from-green-900/50 to-felt-900/50 border-green-700',
      badge: t.home.badge_core,
      badgeColor: 'bg-green-900 text-green-300',
      href: '/training?module=preflop',
    },
    {
      id: 'potodds',
      title: t.home.potodds_title,
      subtitle: t.home.potodds_sub,
      description: t.home.potodds_desc,
      icon: '📐',
      color: 'from-blue-900/50 to-felt-900/50 border-blue-700',
      badge: t.home.badge_math,
      badgeColor: 'bg-blue-900 text-blue-300',
      href: '/training?module=potodds',
    },
    {
      id: 'equity',
      title: t.home.equity_title,
      subtitle: t.home.equity_sub,
      description: t.home.equity_desc,
      icon: '⚖️',
      color: 'from-purple-900/50 to-felt-900/50 border-purple-700',
      badge: t.home.badge_mid,
      badgeColor: 'bg-purple-900 text-purple-300',
      href: '/training?module=equity',
    },
    {
      id: 'table',
      title: isEn ? 'Poker Table' : 'Table Interactive',
      subtitle: isEn ? 'Positions & Roles' : 'Positions & Rôles',
      description: isEn
        ? "Visualize the 6-max table, understand each position's role, the dealer button, blinds, and range implications."
        : 'Visualise la table 6-max, comprends le rôle de chaque position, le jeton dealer, les blindes et les ranges.',
      icon: '🎲',
      color: 'from-teal-900/50 to-felt-900/50 border-teal-700',
      badge: isEn ? 'Visual' : 'Visuel',
      badgeColor: 'bg-teal-900 text-teal-300',
      href: '/table',
    },
  ];

  const PREMIUM_MODULES = [
    {
      id: 'postflop',
      title: t.home.postflop_title,
      subtitle: t.home.postflop_sub,
      description: t.home.postflop_desc,
      icon: '🃏',
      badge: t.home.badge_adv,
      href: '/training?module=postflop',
    },
    {
      id: 'fullhand',
      title: t.home.fullhand_title,
      subtitle: t.home.fullhand_sub,
      description: t.home.fullhand_desc,
      icon: '🎰',
      badge: isEn ? 'Full game' : 'Jeu complet',
      href: '/training?module=fullhand',
    },
    {
      id: 'betsize',
      title: t.home.betsize_title,
      subtitle: t.home.betsize_sub,
      description: t.home.betsize_desc,
      icon: '📏',
      badge: isEn ? 'Sizing' : 'Sizing',
      href: '#',
      comingSoon: true,
    },
    {
      id: 'bluff',
      title: t.home.bluff_title,
      subtitle: t.home.bluff_sub,
      description: t.home.bluff_desc,
      icon: '🎭',
      badge: isEn ? 'Psychology' : 'Psychologie',
      href: '#',
      comingSoon: true,
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
          <span className="text-white">Trainer</span>
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
                <div className={`bg-gradient-to-br ${module.color} border rounded-2xl p-4 h-full transition-all duration-200 group-hover:scale-[1.02] group-hover:shadow-2xl`}>
                  <FreeModuleCard module={module} startArrow={t.home.start_arrow} />
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
                <div className="relative bg-gradient-to-br from-gold-900/10 to-gray-900/80 border border-gold-700/30 rounded-2xl p-4 h-full opacity-70 cursor-default">
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 bg-gold-900/70 border border-gold-700/60 text-gold-300 text-[11px] font-bold px-2 py-0.5 rounded-full">
                      👑 {t.home.badge_premium}
                    </div>
                    <div className="text-[10px] text-gray-400 font-medium px-2 py-0.5 bg-gray-800/90 border border-gray-700 rounded-full">
                      {t.home.coming_soon}
                    </div>
                  </div>
                  <PremiumModuleCard module={module} startArrow={t.home.start_arrow} comingSoon />
                </div>
              ) : (
                <Link to={module.href} className="block group h-full">
                  <div className="relative bg-gradient-to-br from-gold-900/20 to-gray-900/80 border border-gold-700/50 rounded-2xl p-4 h-full transition-all duration-200 group-hover:scale-[1.02] group-hover:shadow-2xl group-hover:border-gold-600">
                    <div className="absolute top-3 right-3 flex items-center gap-1 bg-gold-900/70 border border-gold-700/60 text-gold-300 text-[11px] font-bold px-2 py-0.5 rounded-full">
                      👑 {t.home.badge_premium}
                    </div>
                    <PremiumModuleCard module={module} startArrow={t.home.start_arrow} />
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

function FreeModuleCard({ module, startArrow }: { module: any; startArrow: string }) {
  return (
    <>
      <div className="flex items-start gap-3 mb-2">
        <span className="text-3xl">{module.icon}</span>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-white">{module.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${module.badgeColor}`}>{module.badge}</span>
          </div>
          <p className="text-sm text-gray-400">{module.subtitle}</p>
        </div>
      </div>
      <p className="text-sm text-gray-300 leading-snug">{module.description}</p>
      <div className="flex items-center gap-1 mt-3 text-gold-400 text-sm font-medium">
        <span>{startArrow}</span>
      </div>
    </>
  );
}

function PremiumModuleCard({ module, startArrow, comingSoon }: { module: any; startArrow: string; comingSoon?: boolean }) {
  return (
    <>
      <div className="flex items-start gap-3 mb-2 pr-20">
        <span className="text-3xl">{module.icon}</span>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-bold text-white">{module.title}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400">{module.badge}</span>
          </div>
          <p className="text-sm text-gold-400/70">{module.subtitle}</p>
        </div>
      </div>
      <p className="text-sm text-gray-300 leading-relaxed">{module.description}</p>
      <div className={`flex items-center gap-1 mt-4 text-sm font-medium ${comingSoon ? 'text-gray-600' : 'text-gold-400'}`}>
        <span>{comingSoon ? '— ' : startArrow}</span>
      </div>
    </>
  );
}
