export type Suit = 'h' | 'd' | 'c' | 's';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type Card = `${Rank}${Suit}`;

// 6-max positions only: UTG, HJ, CO, BTN, SB, BB.
// UTG1 does not exist in 6-max (it's a 9-max concept).
export type Position = 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';
// 8-max adds the two earliest seats (UTG+1, LJ) before the 6-max core.
// Full 8-max action order: UTG → UTG1 → LJ → HJ → CO → BTN → SB → BB.
export type Position8 = Position | 'UTG1' | 'LJ';
// Table format selector — drives which open-raise range table is used.
export type TableFormat = '6max' | '8max' | '3max' | 'hu';
// Game type — cash game (no antes, pure chip EV) vs tournament (antes, ICM).
export type GameType = 'cashgame' | 'mtt';
export type Action = 'fold' | 'call' | 'raise' | 'check' | '3bet' | '4bet';
export type TrainingModule = 'preflop' | 'potodds' | 'equity' | 'postflop';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface HandNotation {
  rank1: Rank;
  rank2: Rank;
  suited: boolean;
  notation: string; // e.g. 'AKs', 'QJo', 'AA'
}

export interface PreflopExercise {
  hand: [Card, Card];
  position: Position8;
  heroStack: number;   // in big blinds
  potSize: number;     // in big blinds
  facing: 'none' | 'limp' | 'raise' | '3bet' | '4bet';
  raiseSize?: number;  // in big blinds, if facing raise
  tableType: '6max' | '8max' | '3max' | 'hu' | 'fullring' | 'heads_up';
  correctAction: Action;
  correctFrequency: number; // 0-1, for mixed strategies
  explanation: string;
}

export interface PotOddsExercise {
  potSize: number;     // in big blinds
  betSize: number;     // in big blinds
  heroEquity: number;  // 0-100%
  correctAction: 'call' | 'fold';
  potOdds: number;     // calculated
  requiredEquity: number; // calculated
  explanation: string;
}

export interface EquityExercise {
  street: 'flop' | 'turn' | 'river';
  potBB: number;
  betBB: number;
  villainPosition: Position;
  heroPosition: Position;
  betFractionLabel: string; // e.g. "1/2 pot"
  requiredEquity: number;   // correct answer, 1-decimal %
  options: number[];        // 4 integer MC choices (always includes round(requiredEquity))
  explanation: string;
  explanationAdvanced: string;
  // Expert: tournament bounty
  hasBounty: boolean;
  bountyBB: number;
  requiredEquityBounty: number; // adjusted required equity when bounty is counted
}

export interface PostflopExercise {
  heroHand: [Card, Card];
  board: Card[];
  position: Position;
  potSize: number;
  betSize: number;
  heroHandStrength: string;
  correctAction: Action;
  explanation: string;
}

export interface HandEvalResult {
  rank: HandRank;
  score: number;
  description: string;
  bestCards: Card[];
}

export enum HandRank {
  HIGH_CARD = 0,
  PAIR = 1,
  TWO_PAIR = 2,
  THREE_OF_A_KIND = 3,
  STRAIGHT = 4,
  FLUSH = 5,
  FULL_HOUSE = 6,
  FOUR_OF_A_KIND = 7,
  STRAIGHT_FLUSH = 8,
  ROYAL_FLUSH = 9,
}

export interface JwtPayload {
  userId: string;
  username: string;
  isPremium?: boolean;
  isPremiumExpert?: boolean;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
