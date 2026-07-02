import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Hand } from '../poker/Card';
import { RichLine } from '../ui/RichText';

// ─── Step data ────────────────────────────────────────────────────────────────

export const HAND_STEPS = [
  {
    labelFr: 'Préflop — Distribution',
    labelEn: 'Preflop — Cards dealt',
    color: 'text-blue-400 border-blue-700 bg-blue-900/20',
    heroCards: ['Ah', 'Kd'] as const,
    board: [] as const,
    contextFr: "Tu es au CO. Un joueur en UTG relance, et tout le monde fold jusqu'à toi. Tu regardes tes deux cartes.",
    contextEn: "You're in the CO. A player in UTG raises, and everyone folds to you. You look at your two cards.",
    actionFr: "💡 A-K est une main premium : une des plus fortes au départ. Tu décides de 3-bet pour prendre l'initiative. UTG call. Direction le flop !",
    actionEn: "💡 A-K is a premium hand: one of the strongest to start with. You 3-bet to take the initiative. UTG calls. On to the flop!",
  },
  {
    labelFr: 'Flop',
    labelEn: 'Flop',
    color: 'text-blue-400 border-blue-700 bg-blue-900/20',
    heroCards: ['Ah', 'Kd'] as const,
    board: ['As', 'Th', '5d'] as const,
    contextFr: 'Le flop arrive : A♠ T♥ 5♦. Tu touches une paire d\'As. UTG check (il ne mise rien).',
    contextEn: 'The flop comes: A♠ T♥ 5♦. You pair your Ace. UTG checks (bets nothing).',
    actionFr: "💡 Tu as top pair (la plus haute paire) avec un kicker Roi : une main forte. Tu mises un peu plus de la moitié du pot pour la faire payer. UTG call.",
    actionEn: "💡 You have top pair (the highest pair) with a King kicker: a strong hand. You bet a bit over half the pot to get paid. UTG calls.",
  },
  {
    labelFr: 'Turn',
    labelEn: 'Turn',
    color: 'text-yellow-400 border-yellow-700 bg-yellow-900/20',
    heroCards: ['Ah', 'Kd'] as const,
    board: ['As', 'Th', '5d', 'Kc'] as const,
    contextFr: 'La turn tombe : K♣. UTG check encore.',
    contextEn: 'The turn falls: K♣. UTG checks again.',
    actionFr: '💡 Tu touches maintenant two pair (As et Rois) — une très belle main ! Tu fais un value bet : tu mises pour faire payer une main plus faible. UTG call.',
    actionEn: '💡 You now have two pair (Aces and Kings) — a great hand! You make a value bet: betting to get paid by a weaker hand. UTG calls.',
  },
  {
    labelFr: 'River & Showdown',
    labelEn: 'River & Showdown',
    color: 'text-red-400 border-red-700 bg-red-900/20',
    heroCards: ['Ah', 'Kd'] as const,
    board: ['As', 'Th', '5d', 'Kc', '2h'] as const,
    contextFr: "Dernière carte, la river : 2♥. Elle ne change rien. UTG check une dernière fois.",
    contextEn: 'Last card, the river: 2♥. It changes nothing. UTG checks one last time.',
    actionFr: '🏆 Tu gardes two pair (As et Rois). Tu mises une dernière fois pour le maximum. UTG fold : tu remportes le pot, sans même aller au showdown !',
    actionEn: '🏆 You still have two pair (Aces and Kings). You bet one last time for maximum value. UTG folds: you win the pot, without even reaching showdown!',
  },
] as const;

// ─── Stepper content (used inline in Rules page) ──────────────────────────────

export function TutorialHand({ isEn, onClose }: { isEn: boolean; onClose?: () => void }) {
  const [step, setStep] = useState(0);
  const s = HAND_STEPS[step];

  return (
    <div className="flex flex-col gap-4">
      {/* Progress dots */}
      <div className="flex gap-2 justify-center">
        {HAND_STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`rounded-full transition-all ${i === step ? 'w-8 h-1.5 bg-gold-500' : 'w-4 h-1.5 bg-gray-700 hover:bg-gray-500'}`}
          />
        ))}
      </div>

      {/* Street badge */}
      <div className={`self-center px-3 py-1 rounded-full border text-xs font-bold ${s.color}`}>
        {isEn ? s.labelEn : s.labelFr}
      </div>

      {/* Cards */}
      <div className="flex flex-col items-center gap-3">
        {s.board.length > 0 && (
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-2">{isEn ? 'Board' : 'Board commun'}</p>
            <Hand cards={s.board as any} size="sm" animate={false} context="display" cardStyle="fourcolor" gap="gap-1.5" />
          </div>
        )}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2">{isEn ? 'Your hand (CO)' : 'Ta main (CO — toi)'}</p>
          <Hand cards={s.heroCards as any} size="sm" animate={false} context="display" cardStyle="fourcolor" gap="gap-2" />
        </div>
      </div>

      {/* Context */}
      <p className="text-sm text-gray-300 text-center leading-relaxed">
        <RichLine text={isEn ? s.contextEn : s.contextFr} />
      </p>

      {/* Action */}
      <div className="bg-gray-800/60 rounded-xl px-4 py-3 border border-gray-700 text-sm text-gray-200 leading-relaxed">
        <RichLine text={isEn ? s.actionEn : s.actionFr} />
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep(s => Math.max(0, s - 1))}
          disabled={step === 0}
          className="px-4 py-2 text-sm rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← {isEn ? 'Previous' : 'Précédent'}
        </button>
        <span className="text-xs text-gray-600">{step + 1} / {HAND_STEPS.length}</span>
        {step < HAND_STEPS.length - 1 ? (
          <button
            onClick={() => setStep(s => s + 1)}
            className="px-4 py-2 text-sm rounded-lg bg-gold-700 hover:bg-gold-600 text-white font-semibold transition-colors"
          >
            {isEn ? 'Next' : 'Suivant'} →
          </button>
        ) : (
          <Link
            to="/training?module=preflop"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-felt-700 hover:bg-felt-600 text-white font-semibold transition-colors"
          >
            {isEn ? "Train now →" : "S'entraîner →"}
          </Link>
        )}
      </div>
    </div>
  );
}
