export type Suit = 'h' | 'd' | 'c' | 's';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type CardStr = `${Rank}${Suit}`;

// 6-max positions only. UTG1 does not exist in 6-max (9-max concept).
export type Position = 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';
export type Action = 'fold' | 'call' | 'raise' | 'check' | '3bet' | '4bet';
export type TrainingModule = 'preflop' | 'potodds' | 'equity' | 'outs' | 'bbdefense' | 'postflop' | 'fullhand' | 'rules' | 'betsizing' | 'bluff';

export const SUIT_SYMBOL: Record<Suit, string> = {
  h: '♥', d: '♦', c: '♣', s: '♠',
};

export const SUIT_COLOR: Record<Suit, string> = {
  h: 'text-red-500', d: 'text-red-500', c: 'text-gray-900', s: 'text-gray-900',
};

export const POSITION_LABELS: Record<Position, string> = {
  UTG: 'Under the Gun', HJ: 'Hijack',
  CO: 'Cutoff', BTN: 'Button', SB: 'Small Blind', BB: 'Big Blind',
};

export const POSITION_SHORT: Record<Position, string> = {
  UTG: 'UTG', HJ: 'HJ', CO: 'CO', BTN: 'BTN', SB: 'SB', BB: 'BB',
};

export const POSITION_DESCRIPTIONS: Record<Position, string> = {
  UTG: 'Premier à parler — range la plus serrée',
  HJ: 'Position intermédiaire — range modérée',
  CO: 'Bonne position — range assez large',
  BTN: 'Meilleure position — range très large',
  SB: 'Forced bet, désavantage post-flop',
  BB: 'Forced bet, dernier à parler pré-flop',
};

export interface PreflopExercise {
  hand: [CardStr, CardStr];
  notation: string;
  position: Position;
  correctAction: 'raise' | 'fold';
  correctFrequency: number;
  explanation: string;
  isMixed?: boolean;
}

export interface PotOddsExercise {
  potSize: number;
  betSize: number;
  heroEquity: number;
  correctAction: 'call' | 'fold';
  potOdds: number;
  requiredEquity: number;
  explanation: string;
  difficulty: string;
  context: string;
  heroCards: [CardStr, CardStr];
  board: CardStr[];
  street: 'flop' | 'turn' | 'river';
  outs: number;
  equityExplanation: string;
  equityExplanationAdvanced: string;
  thresholdExplanation: string;
  thresholdExplanationAdvanced: string;
  // Expert implied odds fields
  impliedWinnings?: number;
  villainStackBehind?: number;
  impliedRequiredEquity?: number;
  impliedExplanation?: string;
}

export interface EquityExercise {
  street: 'flop' | 'turn' | 'river';
  potBB: number;
  betBB: number;
  villainPosition: Position;
  heroPosition: Position;
  betFractionLabel: string;
  requiredEquity: number;
  options: number[];
  explanation: string;
  explanationAdvanced: string;
  hasBounty: boolean;
  bountyBB: number;
  requiredEquityBounty: number;
}

export interface OutsExercise {
  heroCards: [CardStr, CardStr];
  board: CardStr[];
  street: 'flop' | 'turn';
  difficulty: string;
  outs: number;
  options: number[];
  equityEstimate: number;
  draws: string[];
  explanation: string;
}

export interface BBDefenseExercise {
  hand: [CardStr, CardStr];
  notation: string;
  opener: string;
  openSize: number;
  correctAction: 'fold' | 'call' | '3bet';
  altAction: 'fold' | 'call' | '3bet';
  isMixed: boolean;
  kind: 'value3bet' | 'bluff3bet' | 'call' | 'fold';
  explanation: string;
}

export type BluffAction = 'check-fold' | 'bluff-small' | 'bluff-medium' | 'bluff-large';
export type BluffFactorScore = 'positive' | 'neutral' | 'negative';

interface BluffFactor { score: BluffFactorScore; fr: string; en: string }
interface BluffBi { fr: string; en: string }

export interface BluffExercise {
  heroHand:         CardStr[];
  board:            CardStr[];
  street:           'flop' | 'turn' | 'river';
  heroPosition:     string;
  villainPosition:  string;
  heroIsIP:         boolean;
  potBB:            number;
  stackBB:          number;
  preflopNarrative: BluffBi;
  streetNarrative:  BluffBi[];
  correctAction:    BluffAction;
  bluffAmountBB:    number;
  factors: {
    position:     BluffFactor;
    board:        BluffFactor;
    villainRange: BluffFactor;
    heroHand:     BluffFactor;
  };
  explanation: BluffBi;
}

export interface ExerciseResult {
  isCorrect: boolean;
  /** Expert quiz: right action but wrong frequency → orange "almost" verdict. */
  partial?: boolean;
  correctAction: string;
  explanation: string;
  xpEarned: number;
  frequency?: number;
  isMixed?: boolean;
  potOdds?: number;
  potOddsPct?: number;
  requiredEquity?: number;
  ev?: number;
  reasoning?: string;
}

export interface PlayerStats {
  totalExercises: number;
  totalCorrect: number;
  streak: number;
  longestStreak: number;
  xp: number;
  level: number;
  preflopAccuracy: number;
  potOddsAccuracy: number;
  equityAccuracy: number;
}

export interface LeaderboardModuleStat {
  accuracy: number | null;   // null = no exercises done yet
  total: number;
  sprintBest?: number;
  advanced?: number;
  expert?: number;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  isPremiumExpert: boolean;
  xp: number;
  level: number;
  totalExercises: number;
  accuracy: number;
  modules?: {
    preflop:  LeaderboardModuleStat;
    potodds:  LeaderboardModuleStat;
    equity:   LeaderboardModuleStat;
    outs:     LeaderboardModuleStat;
    postflop: LeaderboardModuleStat;
    fullhand: LeaderboardModuleStat;
  };
}
