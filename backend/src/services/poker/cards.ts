import { Card, Rank, Suit } from '../../types';

export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const SUITS: Suit[] = ['h', 'd', 'c', 's'];

export const RANK_VALUE: Record<Rank, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

// Display names for suits
export const SUIT_SYMBOL: Record<Suit, string> = {
  h: '♥', d: '♦', c: '♣', s: '♠',
};

export function parseCard(str: string): { rank: Rank; suit: Suit; value: number } {
  const rank = str[0] as Rank;
  const suit = str[1] as Suit;
  return { rank, suit, value: RANK_VALUE[rank] };
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push(`${rank}${suit}` as Card);
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function removeCards(deck: Card[], toRemove: Card[]): Card[] {
  const removeSet = new Set(toRemove);
  return deck.filter(c => !removeSet.has(c));
}

// Convert hole cards to hand notation (e.g. [Ah, Kd] -> 'AKo')
export function toHandNotation(card1: Card, card2: Card): string {
  const c1 = parseCard(card1);
  const c2 = parseCard(card2);

  const higher = c1.value >= c2.value ? c1 : c2;
  const lower = c1.value >= c2.value ? c2 : c1;

  if (higher.rank === lower.rank) {
    return `${higher.rank}${lower.rank}`; // pair: AA, KK, etc.
  }

  const suited = c1.suit === c2.suit ? 's' : 'o';
  return `${higher.rank}${lower.rank}${suited}`;
}

// Deal random hand from deck excluding known cards
export function dealHand(exclude: Card[] = []): [Card, Card] {
  const deck = shuffleDeck(removeCards(createDeck(), exclude));
  return [deck[0], deck[1]];
}

// Combinations: pick k items from array
export function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (k > arr.length) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}
