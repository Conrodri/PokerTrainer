import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Trophy, Zap, Flame, Target, Calendar, Clock } from 'lucide-react';
import { AchievementsGrid } from '../components/stats/AchievementsGrid';
import { Achievement, AchievementTier } from '../types/poker';
import { useAuthStore } from '../store/authStore';
import { statsApi, examApi } from '../services/api';
import { useLangStore } from '../store/langStore';
import { Button } from '../components/ui/Button';

// ─── Sprint modules catalogue ─────────────────────────────────────────────────

const SPRINT_MODULES: { key: string; labelFr: string; labelEn: string; icon: string }[] = [
  { key: 'preflop',          labelFr: 'Préflop 6-max',    labelEn: 'Preflop 6-max',    icon: '🎯' },
  { key: 'preflop-mtt',      labelFr: 'Préflop 6-max MTT',labelEn: 'Preflop 6-max MTT',icon: '🎯' },
  { key: 'preflop8',         labelFr: 'Préflop 8-max',    labelEn: 'Preflop 8-max',    icon: '🎯' },
  { key: 'preflop8-mtt',     labelFr: 'Préflop 8-max MTT',labelEn: 'Preflop 8-max MTT',icon: '🎯' },
  { key: 'preflop-3max',     labelFr: 'Préflop 3-max',    labelEn: 'Preflop 3-max',    icon: '🎯' },
  { key: 'preflop-mtt-3max', labelFr: 'Préflop 3-max MTT',labelEn: 'Preflop 3-max MTT',icon: '🎯' },
  { key: 'preflop-hu',       labelFr: 'Préflop HU',       labelEn: 'Preflop HU',       icon: '🎯' },
  { key: 'preflop-mtt-hu',   labelFr: 'Préflop HU MTT',   labelEn: 'Preflop HU MTT',   icon: '🎯' },
  { key: 'potodds',          labelFr: 'Pot Odds',         labelEn: 'Pot Odds',         icon: '📊' },
  { key: 'equity',           labelFr: 'Équité',           labelEn: 'Equity',           icon: '⚖️' },
  { key: 'outs',             labelFr: 'Outs',             labelEn: 'Outs',             icon: '🎲' },
  { key: 'postflop',         labelFr: 'Post-flop',        labelEn: 'Post-flop',        icon: '🃏' },
  { key: 'fullhand',         labelFr: 'Main complète',    labelEn: 'Full Hand',        icon: '🎰' },
  { key: 'betsizing',        labelFr: 'Bet Sizing',       labelEn: 'Bet Sizing',       icon: '📐' },
];

// ─── Tier styles ──────────────────────────────────────────────────────────────

const TIER_STYLES: Record<AchievementTier, { ring: string; bg: string; text: string; label: string }> = {
  bronze:   { ring: 'border-amber-700/60',  bg: 'bg-amber-900/20',  text: 'text-amber-500',  label: 'Bronze'  },
  silver:   { ring: 'border-gray-500/60',   bg: 'bg-gray-700/20',   text: 'text-gray-300',   label: 'Argent'  },
  gold:     { ring: 'border-yellow-600/60', bg: 'bg-yellow-900/20', text: 'text-yellow-400', label: 'Or'      },
  platinum: { ring: 'border-purple-600/60', bg: 'bg-purple-900/20', text: 'text-purple-400', label: 'Platine' },
};

// ─── Title hero card ──────────────────────────────────────────────────────────

function TitleHero({ title }: {
  title: { fr: string; en: string; tier: AchievementTier; icon: string } | null;
}) {
  const isEn = useLangStore(s => s.lang) === 'en';
  if (!title) return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <span className="text-4xl opacity-30">🏅</span>
      <p className="text-sm text-gray-500">
        {isEn ? 'No title yet — complete achievements to unlock one.' : 'Pas encore de titre — complète des succès pour en débloquer un.'}
      </p>
    </div>
  );

  const s = TIER_STYLES[title.tier];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex flex-col items-center gap-3 rounded-2xl border ${s.ring} ${s.bg} px-6 py-5 text-center`}
    >
      <span className="text-5xl leading-none">{title.icon}</span>
      <div className="flex flex-col gap-1">
        <span className={`text-2xl font-black ${s.text}`}>
          {isEn ? title.en : title.fr}
        </span>
        <span className={`text-xs font-bold uppercase tracking-widest ${s.text} opacity-70`}>
          {s.label}
        </span>
      </div>
      <p className="text-xs text-gray-400">
        {isEn
          ? 'Your current title — shown on the leaderboard'
          : 'Ton titre actuel — affiché dans le classement'}
      </p>
    </motion.div>
  );
}

// ─── Sprint records grid ──────────────────────────────────────────────────────

function SprintRecords({ records, isEn }: {
  records: Record<string, { advanced: number; expert: number }>;
  isEn: boolean;
}) {
  const active = SPRINT_MODULES.filter(m => {
    const r = records[m.key];
    return r && (r.advanced > 0 || r.expert > 0);
  });

  if (!active.length) return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <span className="text-3xl opacity-30">⚡</span>
      <p className="text-sm text-gray-500">
        {isEn
          ? 'No sprint completed yet. Start a sprint in Advanced or Expert mode.'
          : 'Aucun sprint effectué. Lance un sprint en mode Avancé ou Expert.'}
      </p>
      <Link to="/training">
        <Button variant="secondary" size="sm" className="mt-1">
          {isEn ? 'Go to training' : 'Aller à l\'entraînement'}
        </Button>
      </Link>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {active.map(m => {
        const r = records[m.key] ?? { advanced: 0, expert: 0 };
        return (
          <div
            key={m.key}
            className="flex items-center gap-3 bg-gray-800/50 rounded-xl border border-gray-700/50 px-3 py-2.5"
          >
            <span className="text-lg leading-none shrink-0">{m.icon}</span>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-semibold text-gray-300 truncate">
                {isEn ? m.labelEn : m.labelFr}
              </span>
              <div className="flex items-center gap-3 mt-0.5">
                {r.advanced > 0 && (
                  <span className="flex items-center gap-1 text-xs text-yellow-400 font-bold">
                    <Zap size={11} className="shrink-0" />{r.advanced}
                  </span>
                )}
                {r.expert > 0 && (
                  <span className="flex items-center gap-1 text-xs text-purple-400 font-bold">
                    <Flame size={11} className="shrink-0" />{r.expert}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs text-gray-600">{isEn ? 'best' : 'record'}</span>
              <p className="text-sm font-black text-white leading-tight">
                {Math.max(r.advanced, r.expert)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Daily Challenge placeholder ──────────────────────────────────────────────

function DailyChallengePlaceholder({ isEn }: { isEn: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-dashed border-gray-700 bg-gray-900/40 px-5 py-6">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-800 shrink-0">
        <Calendar size={22} className="text-gray-500" />
      </div>
      <div className="text-center sm:text-left">
        <p className="text-sm font-bold text-gray-300">
          {isEn ? 'Daily Challenge' : 'Challenge du jour'}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {isEn
            ? 'Coming soon — daily objectives with exclusive rewards for Premium members.'
            : 'Bientôt disponible — objectifs quotidiens avec récompenses exclusives pour les membres Premium.'}
        </p>
      </div>
      <span className="shrink-0 px-2.5 py-1 rounded-full border border-gray-700 text-[10px] font-bold text-gray-500 uppercase tracking-wide whitespace-nowrap">
        {isEn ? 'Coming soon' : 'Bientôt'}
      </span>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center gap-2">
        <span className="text-gray-400">{icon}</span>
        <h2 className="text-sm font-bold text-gray-200 uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </motion.section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function AchievementsPage() {
  const isEn = useLangStore(s => s.lang) === 'en';
  const user = useAuthStore(s => s.user);

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [records, setRecords]           = useState<Record<string, { advanced: number; expert: number }>>({});
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    Promise.all([
      statsApi.getUserStats(user.username),
      examApi.records(),
    ])
      .then(([ud, rec]) => {
        setAchievements(ud.achievements ?? []);
        setRecords(rec ?? {});
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // Derive best title from unlocked achievements (same logic as backend getBestTitle)
  const bestTitle = (() => {
    if (!achievements.length) return null;
    const TIER_W: Record<string, number> = { platinum: 40, gold: 30, silver: 20, bronze: 10 };
    const CAT_W: Record<string, number>  = {
      accuracy: 6, sprint_expert: 5, daily_acc: 4,
      sprint_advanced: 3, daily_correct: 2, daily_ex: 1, days: 0, exercises: 0,
    };
    const unlocked = achievements.filter(a => a.unlocked);
    if (!unlocked.length) return null;
    const best = unlocked.reduce((a, b) =>
      (TIER_W[b.tier] + CAT_W[b.category]) > (TIER_W[a.tier] + CAT_W[a.category]) ? b : a
    );
    return {
      fr:   best.title_fr,
      en:   best.title_en,
      tier: best.tier,
      icon: best.icon,
    };
  })();

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount    = achievements.length;

  if (!user) return (
    <div className="max-w-lg mx-auto px-4 py-16 text-center flex flex-col items-center gap-4">
      <Trophy size={32} className="text-gray-500" />
      <p className="text-gray-400 text-sm">
        {isEn ? 'Log in to see your achievements.' : 'Connecte-toi pour voir tes succès.'}
      </p>
      <Link to="/login"><Button variant="gold">{isEn ? 'Log in' : 'Se connecter'}</Button></Link>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-gold-500/40 border-t-gold-400 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-8">

      {/* ── Header ── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <Trophy size={20} className="text-gold-400" />
          {isEn ? 'Achievements' : 'Succès & Récompenses'}
        </h1>
        {totalCount > 0 && (
          <p className="text-sm text-gray-400">
            {unlockedCount}/{totalCount} {isEn ? 'unlocked' : 'débloqués'}
            {unlockedCount > 0 && (
              <span className="ml-2 text-gold-400 font-semibold">
                · {Math.round((unlockedCount / totalCount) * 100)} %
              </span>
            )}
          </p>
        )}
      </div>

      {/* ── Titre actif ── */}
      <Section icon={<Trophy size={15} />} title={isEn ? 'Current title' : 'Titre actuel'}>
        <TitleHero title={bestTitle} />
      </Section>

      {/* ── Sprints ── */}
      <Section icon={<Target size={15} />} title={isEn ? 'Sprint records' : 'Records de sprints'}>
        <div className="flex items-center gap-4 mb-1 text-xs text-gray-500">
          <span className="flex items-center gap-1"><Zap size={11} className="text-yellow-400" />{isEn ? 'Advanced' : 'Avancé'}</span>
          <span className="flex items-center gap-1"><Flame size={11} className="text-purple-400" />{isEn ? 'Expert' : 'Expert'}</span>
        </div>
        <SprintRecords records={records} isEn={isEn} />
      </Section>

      {/* ── Achievements grid ── */}
      <Section icon={<Clock size={15} />} title={isEn ? 'All achievements' : 'Tous les succès'}>
        {achievements.length > 0
          ? <AchievementsGrid achievements={achievements} />
          : (
            <p className="text-sm text-gray-500 py-4 text-center">
              {isEn ? 'Play exercises to unlock your first achievement.' : 'Fais des exercices pour débloquer ton premier succès.'}
            </p>
          )
        }
      </Section>

      {/* ── Daily Challenge ── */}
      <Section icon={<Calendar size={15} />} title={isEn ? 'Daily challenge' : 'Challenge du jour'}>
        <DailyChallengePlaceholder isEn={isEn} />
      </Section>

    </div>
  );
}
