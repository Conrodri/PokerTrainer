import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Target, Flame, Zap } from 'lucide-react';
import { Achievement } from '../types/poker';
import { DayDetailPanel } from '../components/stats/DayDetailPanel';
import { useAuthStore } from '../store/authStore';
import { statsApi, examApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Link, useParams } from 'react-router-dom';
import { xpToLevel } from '../utils/pokerUtils';
import { useT } from '../i18n';
import { useLangStore } from '../store/langStore';

// ─── Types ────────────────────────────────────────────────────────────────────


interface DayData    { correct: number; total: number }
interface ModuleDay  { correct: number; total: number; bestStreak: number }


// ─── Constants ──────────────────────────────���─────────────────────────────────

const MONTH_FR   = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
const MONTH_EN   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAILY_GOAL = 10;



// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function cellColor(correct: number, total: number): string {
  if (total === 0) return '#111827';
  const p = correct / total;
  if (p >= 0.8) return '#14532d';
  if (p >= 0.6) return '#15803d';
  if (p >= 0.4) return '#92400e';
  return '#7f1d1d';
}


function buildCalendar(year: number, byDay: Record<string, DayData>) {
  const jan1  = new Date(year, 0, 1);
  const start = new Date(jan1);
  const dow   = jan1.getDay();
  start.setDate(start.getDate() - (dow === 0 ? 6 : dow - 1));

  const todayStr = toDateStr(new Date());
  const weeks: Array<Array<{ dateStr: string; correct: number; total: number; inYear: boolean; isToday: boolean }>> = [];
  const cur = new Date(start);

  while (true) {
    const week: typeof weeks[0] = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = toDateStr(cur);
      const data    = byDay[dateStr];
      week.push({ dateStr, correct: data?.correct ?? 0, total: data?.total ?? 0,
                  inYear: cur.getFullYear() === year, isToday: dateStr === todayStr });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
    if (cur.getFullYear() > year) break;
  }
  return weeks;
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────


// ─── Day strip cell ────────────────────────────────────────────────────────────

function DayCell({ dayLabel, dayNum, total, acc, isToday, isSelected, onClick }: {
  dayLabel: string; dayNum: number; total: number; acc: number | null;
  isToday: boolean; isSelected?: boolean; onClick?: () => void;
}) {
  const hasData  = total > 0;
  const bgClass  = !hasData
    ? 'bg-gray-800/40 border-gray-700/40'
    : acc! >= 80 ? 'bg-green-900/50 border-green-700/50'
    : acc! >= 65 ? 'bg-felt-900/50 border-felt-700/50'
    : acc! >= 50 ? 'bg-yellow-900/50 border-yellow-700/50'
    :              'bg-red-900/50 border-red-700/50';

  const accColor = !hasData ? 'text-gray-600'
    : acc! >= 80 ? 'text-green-400'
    : acc! >= 65 ? 'text-felt-300'
    : acc! >= 50 ? 'text-yellow-400'
    :              'text-red-400';

  return (
    <motion.button
      onClick={onClick}
      whileHover={hasData ? { scale: 1.06 } : {}}
      whileTap={hasData   ? { scale: 0.96 } : {}}
      className={`flex flex-col items-center gap-1 rounded-xl border py-2 px-1 transition-all w-full
        ${bgClass}
        ${isToday    ? 'ring-2 ring-gold-500/60 ring-offset-1 ring-offset-gray-950' : ''}
        ${isSelected ? 'ring-2 ring-white/40 ring-offset-1 ring-offset-gray-950 brightness-125' : ''}
        ${hasData    ? 'cursor-pointer hover:brightness-125' : 'cursor-default'}
      `}
    >
      <span className={`text-[10px] font-semibold uppercase ${isToday ? 'text-gold-400' : 'text-gray-500'}`}>
        {dayLabel}
      </span>
      <span className={`text-xs font-black ${isToday ? 'text-gold-300' : 'text-gray-400'}`}>
        {dayNum}
      </span>
      <div className="border-t border-white/5 w-full my-0.5" />
      {hasData ? (
        <>
          <span className="text-[11px] font-bold text-white">{total}</span>
          <span className={`text-[10px] font-semibold ${accColor}`}>{acc}%</span>
        </>
      ) : (
        <span className="text-gray-700 text-sm mt-0.5">—</span>
      )}
    </motion.button>
  );
}

// ─── Day detail panel ─────────────────────────────────────────────────────────


// ─── Main component ───────────────────────────────────────────────────────────

export function StatsPage() {
  const t        = useT();
  const isEn     = useLangStore(s => s.lang) === 'en';
  const user = useAuthStore(s => s.user);
  const { username: paramUsername } = useParams<{ username?: string }>();
  const isPublicView = !!paramUsername && paramUsername !== user?.username;

  const [stats,        setStats]        = useState<any>(null);
  const [history,      setHistory]      = useState<any>(null);
  const [examRecords,  setExamRecords]  = useState<Record<string, { advanced: number; expert: number }>>({});
  const [publicByDay,  setPublicByDay]  = useState<Record<string, { total: number; correct: number }> | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [selectedDay,  setSelectedDay]  = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPublicView) {
      setLoading(true);
      statsApi.getUserStats(paramUsername!)
        .then(data => {
          setStats({ stats: data.stats });
          setExamRecords(data.sprintRecords ?? {});
          setPublicByDay(data.byDay ?? {});
          setAchievements(data.achievements ?? []);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
      return;
    }
    if (!user) return;
    setLoading(true);
    Promise.all([
      statsApi.getMyStats(),
      statsApi.getHistory(730),
      statsApi.getUserStats(user.username),
    ])
      .then(([s, h, ud]) => {
        setStats(s);
        setHistory(h);
        setAchievements(ud.achievements ?? []);
      })
      .finally(() => setLoading(false));
    examApi.records().then(setExamRecords).catch(() => {});
  }, [user, isPublicView, paramUsername]);

  // ── byDay map — recomputed from raw exercises in LOCAL timezone (own view)
  //             — or from the public endpoint's pre-computed map (public view)
  const byDay: Record<string, DayData> = useMemo(() => {
    if (isPublicView && publicByDay) return publicByDay;
    const exs: Array<{ isCorrect: boolean; createdAt: string }> = history?.exercises ?? [];
    const result: Record<string, DayData> = {};
    for (const ex of exs) {
      const day = toDateStr(new Date(ex.createdAt));
      if (!result[day]) result[day] = { correct: 0, total: 0 };
      result[day].total++;
      if (ex.isCorrect) result[day].correct++;
    }
    return result;
  }, [history, isPublicView, publicByDay]);

  // ── per-day / per-module breakdown from raw exercises ────────────────────
  const byDayModule = useMemo<Record<string, Record<string, ModuleDay>>>(() => {
    const exs: Array<{ exerciseType: string; isCorrect: boolean; createdAt: string }> =
      history?.exercises ?? [];
    const result: Record<string, Record<string, ModuleDay>> = {};
    const curStreak: Record<string, Record<string, number>> = {};
    for (const ex of exs) {
      const day = toDateStr(new Date(ex.createdAt));
      const mod = ex.exerciseType;
      if (!result[day])    { result[day]    = {}; curStreak[day] = {}; }
      if (!result[day][mod]) { result[day][mod] = { correct: 0, total: 0, bestStreak: 0 }; curStreak[day][mod] = 0; }
      result[day][mod].total++;
      if (ex.isCorrect) {
        result[day][mod].correct++;
        curStreak[day][mod]++;
        if (curStreak[day][mod] > result[day][mod].bestStreak)
          result[day][mod].bestStreak = curStreak[day][mod];
      } else {
        curStreak[day][mod] = 0;
      }
    }
    return result;
  }, [history]);

  // ── Day selection ─────────────────────────────────────────────────────────
  const handleDayClick = (dateStr: string) => {
    if (!byDay[dateStr] || byDay[dateStr].total === 0) return;
    const next = selectedDay === dateStr ? null : dateStr;
    setSelectedDay(next);
    if (next) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    }
  };

  // ── Daily stats ───────────────────────────────────────────────────────────
  const todayStr     = toDateStr(new Date());
  const yesterdayStr = toDateStr(new Date(Date.now() - 86_400_000));

  const todayData     = byDay[todayStr]     ?? { correct: 0, total: 0 };
  const yesterdayData = byDay[yesterdayStr] ?? { correct: 0, total: 0 };
  const todayAcc      = todayData.total     > 0 ? Math.round(todayData.correct     / todayData.total     * 100) : null;
  const yesterdayAcc  = yesterdayData.total > 0 ? Math.round(yesterdayData.correct / yesterdayData.total * 100) : null;
  const accDelta      = todayAcc !== null && yesterdayAcc !== null ? todayAcc - yesterdayAcc : null;
  const goalProgress  = Math.min(100, (todayData.total / DAILY_GOAL) * 100);
  const goalDone      = todayData.total >= DAILY_GOAL;

  const localStreak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = toDateStr(d);
      if (!byDay[key] || byDay[key].total === 0) { if (i === 0) continue; break; }
      s++;
    }
    return s;
  }, [byDay]);

  const last7Days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = toDateStr(d);
      const data    = byDay[dateStr] ?? { correct: 0, total: 0 };
      const acc     = data.total > 0 ? Math.round(data.correct / data.total * 100) : null;
      const dayLabel = d.toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { weekday: 'short' }).slice(0, 2);
      return { dateStr, total: data.total, correct: data.correct, acc, dayLabel, dayNum: d.getDate(), isToday: i === 6 };
    });
  }, [byDay, isEn]);

  const week7Acc = useMemo(() => {
    const days = last7Days.filter(d => d.total > 0);
    if (!days.length) return null;
    return Math.round(days.reduce((s, d) => s + d.acc!, 0) / days.length);
  }, [last7Days]);


  // ── Calendar ──────────────────────────────────────────────────────────────
  const calendarYear  = new Date().getFullYear();
  const calendarWeeks = useMemo(() => buildCalendar(calendarYear, byDay), [calendarYear, byDay]);
  const monthNames    = isEn ? MONTH_EN : MONTH_FR;
  const monthLabels   = useMemo(() => {
    const labels: { weekIdx: number; label: string }[] = [];
    calendarWeeks.forEach((week, wi) => {
      const first = week.find(d => d.inYear);
      if (!first) return;
      const month = new Date(first.dateStr).getMonth();
      const prev  = wi > 0 ? calendarWeeks[wi - 1].find(d => d.inYear) : null;
      if (!prev || new Date(prev.dateStr).getMonth() !== month)
        labels.push({ weekIdx: wi, label: monthNames[month] });
    });
    return labels;
  }, [calendarWeeks, monthNames]);

  // ── Global stats ──────────────────────────────────────────────────────────
  const playerStats = stats?.stats;
  const { level, progressPct, nextLevelXp } = playerStats
    ? xpToLevel(playerStats.xp) : { level: 1, progressPct: 0, nextLevelXp: 100 };
  const overallAcc = playerStats?.totalExercises > 0
    ? Math.round((playerStats.totalCorrect / playerStats.totalExercises) * 100) : 0;
  // Best exam run across all modules (advanced or expert).
  const bestExam = Object.values(examRecords).reduce((m, v) => Math.max(m, v.advanced, v.expert), 0);

  const pct = (c: number, tot: number) => tot > 0 ? Math.round(c / tot * 100) : 0;
  const moduleData = [
    { key: 'preflop',  name: t.training.tab_preflop,               correct: playerStats?.preflopCorrect  || 0, total: playerStats?.preflopTotal  || 0 },
    { key: 'potodds',  name: t.training.tab_potodds,               correct: playerStats?.potoddsCorrect  || 0, total: playerStats?.potoddsTotal  || 0 },
    { key: 'equity',   name: t.training.tab_equity,                correct: playerStats?.equityCorrect   || 0, total: playerStats?.equityTotal   || 0 },
    { key: 'outs',     name: t.training.tab_outs,                  correct: playerStats?.outsCorrect     || 0, total: playerStats?.outsTotal     || 0 },
    { key: 'postflop', name: isEn ? 'Post-flop' : 'Post-flop',    correct: playerStats?.postflopCorrect || 0, total: playerStats?.postflopTotal || 0 },
    { key: 'fullhand', name: isEn ? 'Full Hand' : 'Main Complète', correct: playerStats?.fullhandCorrect || 0, total: playerStats?.fullhandTotal || 0 },
  ].map(m => ({
    ...m,
    accuracy: pct(m.correct, m.total),
    advancedBest: examRecords[m.key]?.advanced ?? 0,
    expertBest:   examRecords[m.key]?.expert   ?? 0,
  }));

  // Sprint records for all preflop format/gameType variants (only those with at least one record).
  const preflopSprintVariants = [
    { key: 'preflop',          fr: '6-max CG',    en: '6-max CG'    },
    { key: 'preflop-mtt',      fr: '6-max MTT',   en: '6-max MTT'   },
    { key: 'preflop8',         fr: '8-max CG',    en: '8-max CG'    },
    { key: 'preflop8-mtt',     fr: '8-max MTT',   en: '8-max MTT'   },
    { key: 'preflop-3max',     fr: '3-max CG',    en: '3-max CG'    },
    { key: 'preflop-mtt-3max', fr: '3-max MTT',   en: '3-max MTT'   },
    { key: 'preflop-hu',       fr: 'HU CG',       en: 'HU CG'       },
    { key: 'preflop-mtt-hu',   fr: 'HU MTT',      en: 'HU MTT'      },
  ].map(v => ({
    ...v,
    advanced: examRecords[v.key]?.advanced ?? 0,
    expert:   examRecords[v.key]?.expert   ?? 0,
  })).filter(v => v.advanced > 0 || v.expert > 0);

  const positionData = [
    { key: 'UTG', label: 'UTG', correct: playerStats?.utgCorrect       || 0, total: playerStats?.utgTotal       || 0 },
    { key: 'HJ',  label: 'HJ',  correct: playerStats?.hjCorrect        || 0, total: playerStats?.hjTotal        || 0 },
    { key: 'CO',  label: 'CO',  correct: playerStats?.coCorrect        || 0, total: playerStats?.coTotal        || 0 },
    { key: 'BTN', label: 'BTN', correct: playerStats?.btnCorrect       || 0, total: playerStats?.btnTotal       || 0 },
    { key: 'SB',  label: 'SB',  correct: playerStats?.sbCorrect        || 0, total: playerStats?.sbTotal        || 0 },
    { key: 'BB',  label: 'BB',  correct: playerStats?.bbdefenseCorrect || 0, total: playerStats?.bbdefenseTotal || 0 },
  ].map(p => ({ ...p, accuracy: pct(p.correct, p.total) }));

  const postflopStreetData = [
    { key: 'flop',  label: 'Flop',  icon: '🃏', correct: playerStats?.postflopFlopCorrect  || 0, total: playerStats?.postflopFlopTotal  || 0 },
    { key: 'turn',  label: 'Turn',  icon: '🔄', correct: playerStats?.postflopTurnCorrect  || 0, total: playerStats?.postflopTurnTotal  || 0 },
    { key: 'river', label: 'River', icon: '🌊', correct: playerStats?.postflopRiverCorrect || 0, total: playerStats?.postflopRiverTotal || 0 },
  ].map(s => ({ ...s, accuracy: pct(s.correct, s.total) }));

  const fullhandStreetData = [
    { key: 'preflop', label: isEn ? 'Pre-flop' : 'Pré-flop', icon: '🎯',
      correct: playerStats?.fullhandPreflopCorrect || 0, total: playerStats?.fullhandPreflopTotal || 0 },
    { key: 'flop',    label: 'Flop',                          icon: '🃏',
      correct: playerStats?.fullhandFlopCorrect    || 0, total: playerStats?.fullhandFlopTotal    || 0 },
    { key: 'turn',    label: 'Turn',                          icon: '🔄',
      correct: playerStats?.fullhandTurnCorrect    || 0, total: playerStats?.fullhandTurnTotal    || 0 },
    { key: 'river',   label: 'River',                         icon: '🌊',
      correct: playerStats?.fullhandRiverCorrect   || 0, total: playerStats?.fullhandRiverTotal   || 0 },
  ].map(s => ({ ...s, accuracy: pct(s.correct, s.total) }));
  const hasFullhandData = true;



  const dayLabels = isEn ? ['M','','W','','F','','S'] : ['L','','M','','V','','D'];

  // ── Guards ────────────────────────────────────────────────────────────────

  if (!user && !isPublicView) return (
    <div className="flex flex-col items-center gap-6 py-20 text-center">
      <div className="text-6xl">📊</div>
      <h2 className="text-2xl font-bold text-white">{t.stats.login_prompt}</h2>
      <p className="text-gray-400">{t.stats.login_sub}</p>
      <Link to="/login"><Button size="lg" variant="gold">{t.stats.login_btn}</Button></Link>
    </div>
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin h-10 w-10 border-2 border-felt-500 border-t-transparent rounded-full" />
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white">
        {isPublicView ? (paramUsername ?? t.stats.title) : t.stats.title}
      </h1>

      {/* ── Level & XP ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-gray-900 to-felt-900/50 rounded-2xl p-6 border border-gray-700"
      >
        <div className="flex items-center gap-6 mb-4">
          <div className="text-5xl font-black text-gold-400">{t.stats.level}{level}</div>
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-white font-semibold">{isPublicView ? paramUsername : user?.username}</span>
              <span className="text-gray-400 text-sm">
                {playerStats?.xp || 0} XP · {nextLevelXp} {t.stats.xp_for} {level + 1}
              </span>
            </div>
            <ProgressBar value={progressPct} color="gold" size="lg" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatBox label={t.stats.exercises}   value={playerStats?.totalExercises || 0} />
          <StatBox label={t.stats.accuracy}
            value={`${playerStats?.totalCorrect || 0}/${playerStats?.totalExercises || 0}`}
            sub={`${overallAcc}%`} color={overallAcc >= 70 ? 'text-green-400' : 'text-yellow-400'} />
          <StatBox label={isEn ? 'Best sprint' : 'Meilleur sprint'} value={bestExam} suffix="🎯" color="text-gold-400" />
        </div>
      </motion.div>

      {/* ── Annual calendar heatmap ── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="bg-gray-900/60 rounded-2xl p-5 border border-gray-800"
      >
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-base font-bold text-white">
            {isEn ? `Activity ${calendarYear}` : `Activité ${calendarYear}`}
          </h2>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>{isEn ? 'Less' : 'Moins'}</span>
            {['#111827','#7f1d1d','#92400e','#15803d','#14532d'].map((c, i) => (
              <div key={i} className="w-3 h-3 rounded-sm border border-white/5" style={{ background: c }} />
            ))}
            <span>{isEn ? 'More' : 'Plus'}</span>
          </div>
        </div>

        <div className="flex gap-2 w-full">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-[3px] pt-5 pr-1 shrink-0">
            {dayLabels.map((d, i) => (
              <div key={i} className="h-[11px] flex items-center text-gray-600 font-medium"
                style={{ fontSize: 9, lineHeight: 1 }}>{d}</div>
            ))}
          </div>

          {/* Grid area — fills all remaining width */}
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            {/* Month labels — percentage positioned */}
            <div className="relative h-4">
              {monthLabels.map(({ weekIdx, label }) => (
                <span key={label} className="absolute text-gray-500 font-medium select-none"
                  style={{ left: `${(weekIdx / calendarWeeks.length) * 100}%`, fontSize: 10, top: 0 }}>
                  {label}
                </span>
              ))}
            </div>

            {/* Weeks — CSS grid, 1fr per column */}
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${calendarWeeks.length}, 1fr)`, gap: '3px' }}>
              {calendarWeeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day, di) => {
                    if (!day.inYear) return <div key={di} className="aspect-square" />;
                    const future   = day.dateStr > todayStr;
                    const bg       = future ? '#111827' : cellColor(day.correct, day.total);
                    const hasData  = !future && day.total > 0;
                    const isSelCal = selectedDay === day.dateStr;
                    return (
                      <div
                        key={di}
                        title={future ? '' : day.total > 0
                          ? `${day.dateStr} · ${day.correct}/${day.total} (${Math.round(day.correct/day.total*100)}%)`
                          : `${day.dateStr} · ${isEn ? 'No exercises' : 'Aucun exercice'}`}
                        onClick={() => hasData && handleDayClick(day.dateStr)}
                        className={`aspect-square rounded-sm border border-white/5 transition-transform hover:scale-125
                          ${hasData  ? 'cursor-pointer' : 'cursor-default'}
                          ${isSelCal ? 'ring-1 ring-white/60 ring-offset-[1px] ring-offset-gray-900' : ''}
                          ${day.isToday ? 'ring-1 ring-white ring-offset-[1px] ring-offset-gray-900' : ''}
                          ${future ? 'opacity-20' : ''}
                        `}
                        style={{ background: bg }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detail panel below calendar (for calendar clicks) */}
        <AnimatePresence>
          {selectedDay && byDayModule[selectedDay] && !last7Days.some(d => d.dateStr === selectedDay) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden mt-4"
            >
              <DayDetailPanel
                key={`cal-${selectedDay}`}
                dateStr={selectedDay}
                dayData={byDay[selectedDay] ?? { correct: 0, total: 0 }}
                moduleMap={byDayModule[selectedDay] ?? {}}
                isEn={isEn}
                onClose={() => setSelectedDay(null)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>



      {/* ── Daily stats ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="rounded-2xl border border-gold-700/30 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1a1408 0%, #0f1a0e 100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/5">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span className="text-lg">📅</span>
            {isEn ? "Today" : "Aujourd'hui"}
          </h2>
          <span className="text-xs text-gray-400 font-medium">
            {new Date().toLocaleDateString(isEn ? 'en-US' : 'fr-FR', {
              weekday: 'long', day: 'numeric', month: 'long',
            })}
          </span>
        </div>

        <div className="p-5 flex flex-col gap-5">

          {/* 4-chip row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/5 rounded-xl p-3 border border-white/8 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Zap size={11} className="text-blue-400" />
                {isEn ? 'Exercises' : 'Exercices'}
              </div>
              <p className="text-2xl font-black text-white leading-none">{todayData.total}</p>
              <p className="text-xs text-gray-500">/ {DAILY_GOAL} {isEn ? 'goal' : 'objectif'}</p>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/8 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Target size={11} className="text-purple-400" />
                {isEn ? 'Accuracy' : 'Précision'}
              </div>
              <p className={`text-2xl font-black leading-none ${
                todayAcc === null ? 'text-gray-600' : todayAcc >= 75 ? 'text-green-400'
                : todayAcc >= 55 ? 'text-yellow-400' : 'text-red-400'}`}>
                {todayAcc !== null ? `${todayAcc}%` : '—'}
              </p>
              <p className="text-xs text-gray-500">
                {todayData.total > 0 ? `${todayData.correct}/${todayData.total}`
                  : (isEn ? 'No exercises yet' : 'Aucun exercice')}
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/8 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                {accDelta === null ? <Minus size={11} className="text-gray-500" />
                  : accDelta > 0  ? <TrendingUp size={11} className="text-green-400" />
                  : accDelta < 0  ? <TrendingDown size={11} className="text-red-400" />
                  :                 <Minus size={11} className="text-gray-400" />}
                {isEn ? 'vs Yesterday' : 'vs Hier'}
              </div>
              <p className={`text-2xl font-black leading-none ${
                accDelta === null ? 'text-gray-600' : accDelta > 0 ? 'text-green-400'
                : accDelta < 0 ? 'text-red-400' : 'text-gray-300'}`}>
                {accDelta === null ? '—' : accDelta > 0 ? `+${accDelta}%` : accDelta < 0 ? `${accDelta}%` : '='}
              </p>
              <p className="text-xs text-gray-500">
                {yesterdayAcc !== null
                  ? `${isEn ? 'Yesterday' : 'Hier'} ${yesterdayAcc}%`
                  : (isEn ? 'No data yesterday' : 'Pas de données hier')}
              </p>
            </div>

            <div className="bg-white/5 rounded-xl p-3 border border-white/8 flex flex-col gap-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <Flame size={11} className="text-orange-400" />
                {isEn ? 'Streak' : 'Série'}
              </div>
              <p className="text-2xl font-black text-orange-400 leading-none">
                {localStreak > 0 ? `${localStreak}j` : '0'}
              </p>
              <p className="text-xs text-gray-500">
                {localStreak >= 7 ? (isEn ? '🔥 On fire!' : '🔥 En feu !')
                  : localStreak >= 3 ? (isEn ? 'Keep going!' : 'Continue !')
                  : (isEn ? 'consecutive days' : 'jours consécutifs')}
              </p>
            </div>
          </div>

          {/* Daily goal progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                <Target size={11} className="text-gold-400" />
                {isEn ? 'Daily goal' : 'Objectif quotidien'}
                <span className="text-gray-600">— {DAILY_GOAL} {isEn ? 'exercises' : 'exercices'}</span>
              </p>
              <span className={`text-xs font-bold ${goalDone ? 'text-green-400' : 'text-gray-400'}`}>
                {todayData.total}/{DAILY_GOAL}{goalDone && ' ✓'}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-800 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${goalDone ? 'bg-green-500' : 'bg-gold-500'}`}
                initial={{ width: 0 }}
                animate={{ width: `${goalProgress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              />
            </div>
          </div>

          {/* 7-day strip */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {isEn ? 'Last 7 days' : '7 derniers jours'}
                <span className="ml-2 normal-case font-normal text-gray-600">
                  {isEn ? '— click a day for details' : '— cliquez sur un jour pour les détails'}
                </span>
              </p>
              {week7Acc !== null && (
                <span className={`text-xs font-bold font-mono ${
                  week7Acc >= 75 ? 'text-green-400' : week7Acc >= 55 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  ⌀ {week7Acc}%
                </span>
              )}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {last7Days.map(day => (
                <DayCell
                  key={day.dateStr}
                  dayLabel={day.dayLabel}
                  dayNum={day.dayNum}
                  total={day.total}
                  acc={day.acc}
                  isToday={day.isToday}
                  isSelected={selectedDay === day.dateStr}
                  onClick={() => handleDayClick(day.dateStr)}
                />
              ))}
            </div>

            {/* Color legend */}
            {last7Days.some(d => d.total > 0) && (
              <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-600 justify-end">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-900/80 inline-block border border-green-700/50" />≥80%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-felt-900/80 inline-block border border-felt-700/50" />65–79%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-yellow-900/80 inline-block border border-yellow-700/50" />50–64%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-900/80 inline-block border border-red-700/50" />&lt;50%</span>
              </div>
            )}
          </div>

          {/* Day detail panel — 7-day strip */}
          <div ref={detailRef}>
            <AnimatePresence>
              {selectedDay && byDayModule[selectedDay] && (
                <DayDetailPanel
                  key={selectedDay}
                  dateStr={selectedDay}
                  dayData={byDay[selectedDay] ?? { correct: 0, total: 0 }}
                  moduleMap={byDayModule[selectedDay] ?? {}}
                  isEn={isEn}
                  onClose={() => setSelectedDay(null)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* CTA if no activity today */}
          {todayData.total === 0 && (
            <div className="text-center py-2 border-t border-white/5">
              <p className="text-sm text-gray-500 mb-2">
                {isEn ? "You haven't trained yet today." : "Vous n'avez pas encore entraîné aujourd'hui."}
              </p>
              <Link to="/training">
                <Button size="sm" variant="gold">{isEn ? 'Start training →' : 'Commencer →'}</Button>
              </Link>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Module accuracy ── */}
      {playerStats && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="bg-gray-900/60 rounded-2xl p-6 border border-gray-800"
        >
          <h2 className="text-base font-bold text-white mb-4">{t.stats.by_module}</h2>
          <div className="space-y-4">
            {moduleData.map(m => (
              <div key={m.key}>
                {/* Module row */}
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <ProgressBar value={m.accuracy} label={m.name}
                      color={m.accuracy >= 70 ? 'green' : m.accuracy >= 50 ? 'gold' : 'red'} showValue />
                  </div>
                  <span className="text-xs text-gray-400 font-mono shrink-0 w-16 text-right">
                    {m.correct}/{m.total}
                  </span>
                </div>
                {/* Sprint records — preflop: breakdown by format/gameType; others: single best */}
                {m.key === 'preflop' ? (
                  preflopSprintVariants.length > 0 && (
                    <div className="mt-1.5 ml-1 pl-2.5 border-l-2 border-gray-700/50 space-y-0.5">
                      {preflopSprintVariants.map(v => (
                        <div key={v.key} className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-semibold text-gray-600 w-16 shrink-0">
                            {isEn ? v.en : v.fr}
                          </span>
                          {v.advanced > 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-gray-500">
                              <Zap size={9} className="text-gold-400 shrink-0" />
                              <span className="text-gold-400 font-bold">{v.advanced}</span>
                              &nbsp;{isEn ? 'adv.' : 'avancé'}
                            </span>
                          )}
                          {v.expert > 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-gray-500">
                              <Flame size={9} className="text-purple-400 shrink-0" />
                              <span className="text-purple-400 font-bold">{v.expert}</span>
                              &nbsp;{isEn ? 'exp.' : 'expert'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )
                ) : (m.advancedBest > 0 || m.expertBest > 0) && (
                  <div className="mt-0.5 ml-1 flex items-center gap-3 flex-wrap">
                    {m.advancedBest > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-500">
                        <Zap size={9} className="text-gold-400 shrink-0" />
                        {isEn ? 'Adv.' : 'Avancé'}&nbsp;
                        <span className="text-gold-400 font-bold">{m.advancedBest}</span>
                        &nbsp;{isEn ? 'correct' : 'réussis'}
                      </span>
                    )}
                    {m.expertBest > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-gray-500">
                        <Flame size={9} className="text-purple-400 shrink-0" />
                        {isEn ? 'Expert' : 'Expert'}&nbsp;
                        <span className="text-purple-400 font-bold">{m.expertBest}</span>
                        &nbsp;{isEn ? 'correct' : 'réussis'}
                      </span>
                    )}
                  </div>
                )}

                {/* Post-flop — détail par rue */}
                {m.key === 'postflop' && (
                  <div className="mt-2.5 ml-2 pl-3 border-l-2 border-gray-700/50 space-y-1.5">
                    {postflopStreetData.map(s => (
                      <div key={s.key} className="flex items-center gap-2">
                        <span className="text-[10px] leading-none w-4 shrink-0">{s.icon}</span>
                        <span className="text-[10px] font-bold text-gray-500 w-8 shrink-0">{s.label}</span>
                        <div className="flex-1 h-1 rounded-full bg-gray-800 overflow-hidden">
                          {s.total > 0 && (
                            <motion.div
                              className={`h-full rounded-full ${s.accuracy >= 70 ? 'bg-green-500/70' : s.accuracy >= 50 ? 'bg-yellow-500/70' : 'bg-red-500/70'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${s.accuracy}%` }}
                              transition={{ duration: 0.5, delay: 0.1 }}
                            />
                          )}
                        </div>
                        <span className={`text-[10px] font-bold font-mono w-8 text-right ${
                          s.total === 0 ? 'text-gray-600'
                          : s.accuracy >= 70 ? 'text-green-400'
                          : s.accuracy >= 50 ? 'text-yellow-400'
                          : 'text-red-400'
                        }`}>
                          {s.total > 0 ? `${s.accuracy}%` : '—'}
                        </span>
                        <span className="text-[10px] text-gray-600 font-mono w-11 text-right">
                          {s.correct}/{s.total}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Full Hand — détail par rue */}
                {m.key === 'fullhand' && (
                  <div className="mt-2.5 ml-2 pl-3 border-l-2 border-gray-700/50 space-y-1.5">
                    {fullhandStreetData.map(s => (
                      <div key={s.key} className="flex items-center gap-2">
                        <span className="text-[10px] leading-none w-4 shrink-0">{s.icon}</span>
                        <span className="text-[10px] font-bold text-gray-500 w-8 shrink-0">{s.label}</span>
                        <div className="flex-1 h-1 rounded-full bg-gray-800 overflow-hidden">
                          {s.total > 0 && (
                            <motion.div
                              className={`h-full rounded-full ${s.accuracy >= 70 ? 'bg-green-500/70' : s.accuracy >= 50 ? 'bg-yellow-500/70' : 'bg-red-500/70'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${s.accuracy}%` }}
                              transition={{ duration: 0.5, delay: 0.1 }}
                            />
                          )}
                        </div>
                        <span className={`text-[10px] font-bold font-mono w-8 text-right ${
                          s.total === 0 ? 'text-gray-600'
                          : s.accuracy >= 70 ? 'text-green-400'
                          : s.accuracy >= 50 ? 'text-yellow-400'
                          : 'text-red-400'
                        }`}>
                          {s.total > 0 ? `${s.accuracy}%` : '—'}
                        </span>
                        <span className="text-[10px] text-gray-600 font-mono w-11 text-right">
                          {s.correct}/{s.total}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pré-flop — détail par position */}
                {m.key === 'preflop' && (
                  <div className="mt-2.5 ml-2 pl-3 border-l-2 border-gray-700/50 space-y-1.5">
                    {positionData.map(p => (
                      <div key={p.key} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-500 w-7 shrink-0">{p.label}</span>
                        <div className="flex-1 h-1 rounded-full bg-gray-800 overflow-hidden">
                          {p.total > 0 && (
                            <motion.div
                              className={`h-full rounded-full ${p.accuracy >= 70 ? 'bg-green-500/70' : p.accuracy >= 50 ? 'bg-yellow-500/70' : 'bg-red-500/70'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${p.accuracy}%` }}
                              transition={{ duration: 0.5, delay: 0.1 }}
                            />
                          )}
                        </div>
                        <span className={`text-[10px] font-bold font-mono w-8 text-right ${
                          p.total === 0 ? 'text-gray-600'
                          : p.accuracy >= 70 ? 'text-green-400'
                          : p.accuracy >= 50 ? 'text-yellow-400'
                          : 'text-red-400'
                        }`}>
                          {p.total > 0 ? `${p.accuracy}%` : '—'}
                        </span>
                        <span className="text-[10px] text-gray-600 font-mono w-11 text-right">
                          {p.correct}/{p.total}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      )}



      {/* ── Achievements shortcut ── */}
      {achievements.length > 0 && (
        <Link
          to="/achievements"
          className="flex items-center justify-between gap-3 rounded-xl border border-gray-700 bg-gray-800/50 hover:bg-gray-800 hover:border-gray-600 px-4 py-3 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🏅</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white">
                {isEn ? 'Achievements & Rewards' : 'Succès & Récompenses'}
              </span>
              <span className="text-xs text-gray-400">
                {achievements.filter(a => a.unlocked).length}/{achievements.length} {isEn ? 'unlocked' : 'débloqués'}
              </span>
            </div>
          </div>
          <span className="text-gray-500 group-hover:text-gray-300 transition-colors text-lg leading-none">›</span>
        </Link>
      )}

      {/* ── No data CTA ── */}
      {(!playerStats || playerStats.totalExercises === 0) && (
        <div className="text-center py-10 text-gray-400">
          <p className="text-lg mb-4">{t.stats.no_stats}</p>
          <Link to="/training"><Button variant="gold">{t.stats.start_training}</Button></Link>
        </div>
      )}
    </div>
  );
}

// ─── StatBox ─────────────────────────────────────────────────────────────────

function StatBox({ label, value, sub, color = 'text-white', suffix }: {
  label: string; value: number | string; sub?: string; color?: string; suffix?: string;
}) {
  return (
    <div className="text-center bg-gray-800/60 rounded-xl p-3">
      <p className={`text-lg font-bold leading-none ${color}`}>{value}{suffix}</p>
      {sub && <p className="text-sm font-semibold text-gray-300 mt-0.5">{sub}</p>}
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
