import { motion } from 'framer-motion';
import { Target, TrendingUp } from 'lucide-react';
import { StatChip } from './StatChip';
import { ProgressBar } from './ProgressBar';
import { useT } from '../../i18n';

interface Props {
  total:    number;
  correct:  number;
  /** @deprecated streak is no longer shown — replaced by exam mode. Kept for call-site compatibility. */
  streak?:  number;
  xp:       number;
  /** i18n labels — optional; defaults to t.training values */
  labels?: {
    accuracy: string;
    streak?:  string;
    xp:       string;
  };
}

/** Session progress bar shown at the top of every trainer once ≥1 answer given. */
export function SessionStatsBar({ total, correct, xp, labels }: Props) {
  const t = useT();
  if (total === 0) return null;
  const accuracy = Math.round((correct / total) * 100);
  const resolvedLabels = labels ?? {
    accuracy: t.training.accuracy_lbl,
    xp:       t.training.xp_lbl,
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 bg-gray-900/60 rounded-xl px-5 py-3 border border-gray-700"
    >
      <StatChip
        icon={<Target size={14} />}
        label={resolvedLabels.accuracy}
        value={`${accuracy}%`}
        color={accuracy >= 70 ? 'text-green-400' : 'text-yellow-400'}
      />
      <StatChip
        icon={<TrendingUp size={14} />}
        label={resolvedLabels.xp}
        value={`+${xp}`}
        color="text-blue-400"
      />
      <div className="flex-1">
        <ProgressBar value={accuracy} color="green" size="sm" />
      </div>
      <span className="text-xs text-gray-500 shrink-0">{correct}/{total}</span>
    </motion.div>
  );
}
