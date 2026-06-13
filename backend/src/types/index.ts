export type Suit = 'h' | 'd' | 'c' | 's';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | 'T' | 'J' | 'Q' | 'K' | 'A';
export type Card = `${Rank}${Suit}`;

// 6-max positions only: UTG, HJ, CO, BTN, SB, BB.
// UTG1 does not exist in 6-max (it's a 9-max concept).
export type Position = 'UTG' | 'HJ' | 'CO' | 'BTN' | 'SB' | 'BB';
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
  position: Position;
  heroStack: number;   // in big blinds
  potSize: number;     // in big blinds
  facing: 'none' | 'limp' | 'raise' | '3bet' | '4bet';
  raiseSize?: number;  // in big blinds, if facing raise
  tableType: '6max' | 'fullring' | 'heads_up';
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
  hand1: [Card, Card];
  hand2: [Card, Card];
  board: Card[];
  hand1Equity: number; // 0-100
  hand2Equity: number; // 0-100
  question: 'which_better' | 'estimate_equity';
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
