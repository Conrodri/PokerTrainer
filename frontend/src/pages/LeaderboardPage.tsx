import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Zap, Target, ChevronDown } from 'lucide-react';
import { statsApi } from '../services/api';
import { LeaderboardEntry, LeaderboardModuleStat } from '../types/poker';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { HoverTip } from '../components/ui/HoverTip';
import { useT } from '../i18n';
import { useLangStore } from '../store/langStore';

// ─── Module definitions ───────────────────────────────────────────────────────

const MODULES: {
  key: keyof NonNullable<LeaderboardEntry['modules']>;
  icon: string;
  labelFr: string;
  labelEn: string;
}[] = [
  { key: 'preflop',  icon: '🎯', labelFr: 'Pré-flop',     labelEn: 'Pre-flop'   },
  { key: 'outs',     icon: '🎲', labelFr: 'Outs',          labelEn: 'Outs'       },
  { key: 'equity',   icon: '⚖️', labelFr: 'Équité',        labelEn: 'Equity'     },
  { key: 'potodds',  icon: '📊', labelFr: 'Pot Odds',      labelEn: 'Pot Odds'   },
  { key: 'postflop', icon: '🃏', labelFr: 'Post-flop',     labelEn: 'Post-flop'  },
  { key: 'fullhand', icon: '🎰', labelFr: 'Main complète', labelEn: 'Full Hand'  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function accColor(pct: number | null) {
  if (pct === null) return 'text-gray-600';
  if (pct >= 75)   return 'text-green-400';
  if (pct >= 50)   return 'text-yellow-400';
  return 'text-red-400';
}

function accBarColor(pct: number) {
  if (pct >= 75) return 'bg-green-500';
  if (pct >= 50) return 'bg-yellow-500';
  return 'bg-red-500';
}

// ─── Module grid shown when a row is expanded ─────────────────────────────────

function ModuleGrid({ modules, isEn }: {
  modules: NonNullable<LeaderboardEntry['modules']>;
  isEn: boolean;
}) {
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3 pb-1 border-t border-gray-800/70 mt-3">
        {MODULES.map(mod => {
          const stat: LeaderboardModuleStat = modules[mod.key];
          const label = isEn ? mod.labelEn : mod.labelFr;
          const pct   = stat.accuracy;
          return (
            <div key={mod.key} className="flex flex-col gap-1 bg-gray-900/60 rounded-xl px-3 py-2">
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <span>{mod.icon}</span>
                  <span className="truncate">{label}</span>
                </span>
                <span className={`text-xs font-bold tabular-nums ${accColor(pct)}`}>
                  {pct !== null ? `${pct}%` : '—'}
                </span>
              </div>
              {/* Progress bar */}
              <div className="h-1 rounded-full bg-gray-800 overflow-hidden">
                {pct !== null && (
                  <div
                    className={`h-full rounded-full transition-all ${accBarColor(pct)}`}
                    style={{ width: `${pct}%` }}
                  />
                )}
              </div>
              <div className="flex items-center justify-between mt-0.5">
                {stat.total > 0 ? (
                  <span className="text-[10px] text-gray-600">{stat.total} ex.</span>
                ) : (
                  <span />
                )}
                {(stat.bestStreak ?? 0) > 0 && (
                  <HoverTip
                    title={isEn ? 'Best streak' : 'Meilleure série'}
                    text={isEn
                      ? `${stat.bestStreak} correct answers in a row (free exercise mode)`
                      : `${stat.bestStreak} bonnes réponses consécutives (mode exercice libre)`}
                    className="flex items-center gap-0.5 text-[10px] text-orange-400 font-semibold border-none"
                  >
                    <Zap size={9} className="fill-orange-400" />
                    {stat.bestStreak}
                  </HoverTip>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LeaderboardPage() {
  const t       = useT();
  const isEn    = useLangStore(s => s.lang) === 'en';
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (!user) return;
    statsApi.getLeaderboard(20)
      .then(setLeaders)
      .catch(() => setLeaders([]))
      .finally(() => setLoading(false));
  }, [user]);

  const toggleExpand = (username: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(username) ? next.delete(username) : next.add(username);
      return next;
    });
  };

  const rankEmoji  = ['🥇', '🥈', '🥉'];
  const rankBg     = [
    'bg-gold-900/30 border-gold-700',
    'bg-gray-800/60 border-gray-600',
    'bg-amber-900/20 border-amber-800',
  ];
  const rankColors = ['text-gold-400', 'text-gray-300', 'text-amber-600'];

  // ── Login gate — leaderboard requires an account (like Stats) ──
  if (!user) return (
    <div className="flex flex-col items-center gap-6 py-20 text-center">
      <div className="text-6xl">🏆</div>
      <h2 className="text-2xl font-bold text-white">
        {isEn ? 'Sign in to see the leaderboard' : 'Connecte-toi pour voir le classement'}
      </h2>
      <p className="text-gray-400 max-w-sm">
        {isEn
          ? 'Create a free account or log in to compare your progress with other players.'
          : 'Crée un compte gratuit ou connecte-toi pour comparer ta progression avec les autres joueurs.'}
      </p>
      <Link to="/login">
        <Button size="lg" variant="gold">
          {isEn ? 'Log in / Sign up' : 'Connexion / Inscription'}
        </Button>
      </Link>
    </div>
  );

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">

      {/* Header */}
      <div className="text-center">
        <Trophy size={40} className="text-gold-400 mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-white mb-2">{t.leaderboard.title}</h1>
        <p className="text-gray-400">{t.leaderboard.subtitle}</p>
      </div>

      {loading ? (
        <div className="flex justify-center h-40 items-center">
          <div className="animate-spin h-8 w-8 border-2 border-gold-500 border-t-transparent rounded-full" />
        </div>
      ) : leaders.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>{t.leaderboard.empty}</p>
          <p className="text-sm mt-2">{t.leaderboard.empty_sub}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {leaders.map((entry, i) => {
            const isTop3   = i < 3;
            const isMe     = user?.username === entry.username;
            const isOpen   = expanded.has(entry.username);
            const hasMods  = !!entry.modules;

            return (
              <motion.div
                key={entry.username}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`rounded-xl border transition-all ${
                  isTop3 ? rankBg[i] : 'bg-gray-900/40 border-gray-800'
                } ${isMe ? 'ring-2 ring-felt-500' : ''}`}
              >
                {/* ── Main row ── */}
                <div className="flex items-center gap-4 p-4">

                  {/* Rank */}
                  <div className={`w-10 text-center font-black text-xl shrink-0 ${isTop3 ? rankColors[i] : 'text-gray-500'}`}>
                    {isTop3 ? rankEmoji[i] : `#${entry.rank}`}
                  </div>

                  {/* Name + level */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-bold truncate ${isMe ? 'text-felt-300' : 'text-white'}`}>
                        {entry.username}
                      </span>
                      {isMe && (
                        <span className="text-xs bg-felt-800 text-felt-300 px-1.5 py-0.5 rounded shrink-0">
                          {t.leaderboard.you}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      <span>{t.stats.level} {entry.level}</span>
                      <span>{entry.totalExercises} ex.</span>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 shrink-0">
                    {/* Global accuracy */}
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Target size={12} className="text-green-400" />
                        <span className={`text-sm font-bold ${accColor(entry.accuracy)}`}>
                          {entry.accuracy}%
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-600">{t.leaderboard.accuracy}</p>
                    </div>

                    {/* XP */}
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Zap size={12} className="text-blue-400" />
                        <span className="text-sm font-bold text-blue-400">{entry.xp}</span>
                      </div>
                      <p className="text-[10px] text-gray-600">XP</p>
                    </div>

                    {/* Expand toggle */}
                    {hasMods && (
                      <button
                        onClick={() => toggleExpand(entry.username)}
                        className="text-gray-500 hover:text-gray-300 transition-colors p-1 -mr-1"
                        title={isEn ? 'Module breakdown' : 'Détail par module'}
                      >
                        <ChevronDown
                          size={15}
                          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Module detail (collapsible) ── */}
                <AnimatePresence initial={false}>
                  {isOpen && hasMods && (
                    <div className="px-4 pb-3">
                      <ModuleGrid modules={entry.modules!} isEn={isEn} />
                    </div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Footer note */}
      <div className="text-center text-xs text-gray-600 py-4 flex flex-col gap-1">
        <p className="flex items-center justify-center gap-1.5">
          <ChevronDown size={11} />
          {isEn
            ? 'Click any row to see accuracy & best streaks per module'
            : 'Cliquez sur une ligne pour voir la précision & séries max par module'}
        </p>
        <p>{t.leaderboard.updated}</p>
        <p>{t.leaderboard.coming_soon} 🃏</p>
      </div>
    </div>
  );
}
