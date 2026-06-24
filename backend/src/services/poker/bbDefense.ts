// ─── Big Blind defense vs a Button open ──────────────────────────────────────
// Unlike the open-raise (RFI) ranges, the BB is never first to act: when the
// action reaches the BB, someone has already opened. The decision is therefore
// a 3-way DEFENSE: fold / call / 3-bet — not the binary fold/raise of an open.
//
// This is a simplified, teachable BB-vs-BTN strategy (100bb, ~2.5x open).

export type BBAction = 'fold' | 'call' | '3bet';

export interface BBDefenseClass {
  action: BBAction;   // primary recommended action
  alt: BBAction;      // acceptable alternative when the hand is a mix
  isMixed: boolean;   // true when both `action` and `alt` are fine
  kind: 'value3bet' | 'bluff3bet' | 'call' | 'fold';
}

const RV: Record<string, number> = {
  A: 14, K: 13, Q: 12, J: 11, T: 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2,
};

export function getBBDefenseAction(notation: string): BBDefenseClass {
  // ── Pocket pairs ──────────────────────────────────────────────────────────
  if (notation.length === 2) {
    const r = RV[notation[0]];
    if (r >= 12) return mk('3bet', '3bet', false, 'value3bet');  // QQ+
    if (r === 11) return mk('3bet', 'call', true, 'value3bet'); // JJ: mixed, lean 3-bet
    return mk('call', 'call', false, 'call');                    // TT–22
  }

  const hi = RV[notation[0]];
  const lo = RV[notation[1]];
  const suited = notation[2] === 's';
  const gap = hi - lo;

  if (suited) {
    if (hi === 14) {                                   // Ax suited
      if (lo === 13) return mk('3bet', '3bet', false, 'value3bet'); // AKs
      if (lo === 12) return mk('3bet', 'call', true, 'value3bet'); // AQs: mixed
      if (lo >= 6)   return mk('call', 'call', false, 'call');     // AJs–A6s
      return mk('3bet', 'call', true, 'bluff3bet');               // A5s–A2s (bluff)
    }
    if (hi === 13) {                                   // Kx suited
      if (lo >= 9) return mk('call', 'call', false, 'call');       // KQs–K9s
      if (lo >= 5) return mk('call', 'fold', true, 'call');         // K8s–K5s
      return mk('fold', 'fold', false, 'fold');
    }
    if (hi === 12) {                                   // Qx suited
      if (lo >= 8) return mk('call', 'call', false, 'call');       // QJs–Q8s
      return mk('fold', 'fold', false, 'fold');
    }
    if (hi === 11) {                                   // Jx suited
      if (lo >= 8) return mk('call', 'call', false, 'call');       // JTs–J8s
      return mk('fold', 'fold', false, 'fold');
    }
    if (hi === 10) {                                   // Tx suited
      if (lo >= 7) return mk('call', 'call', false, 'call');       // T9s–T7s
      return mk('fold', 'fold', false, 'fold');
    }
    if (gap <= 1 && lo >= 4) return mk('call', 'call', false, 'call');     // 98s–54s connectors
    if (gap === 2 && lo >= 5) return mk('call', 'fold', true, 'call');    // 97s–75s one-gappers
    return mk('fold', 'fold', false, 'fold');
  }

  // ── Offsuit ────────────────────────────────────────────────────────────────
  if (hi === 14) {                                     // Ax offsuit
    if (lo === 13) return mk('3bet', '3bet', false, 'value3bet'); // AKo
    if (lo >= 10)  return mk('call', 'call', false, 'call');      // AQo, AJo, ATo
    return mk('fold', 'fold', false, 'fold');
  }
  if (hi === 13) {                                     // Kx offsuit
    if (lo >= 10) return mk('call', 'call', false, 'call');       // KQo, KJo, KTo
    return mk('fold', 'fold', false, 'fold');
  }
  if (hi === 12) {                                     // Qx offsuit
    if (lo >= 10) return mk('call', 'call', false, 'call');       // QJo, QTo
    return mk('fold', 'fold', false, 'fold');
  }
  if (hi === 11 && lo === 10) return mk('call', 'call', false, 'call'); // JTo
  if (hi === 10 && lo === 9)  return mk('call', 'fold', true, 'call');    // T9o
  return mk('fold', 'fold', false, 'fold');
}

function mk(action: BBAction, alt: BBAction, isMixed: boolean, kind: BBDefenseClass['kind']): BBDefenseClass {
  return { action, alt, isMixed, kind };
}

// ─── Full 13×13 range grid (for display) ─────────────────────────────────────
// Cell code: 0=fold, 1=call, 3=value 3-bet, 4=bluff 3-bet.
// Indexing matches the frontend getNotationFromIndices() convention.

const GRID_RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

function notationFromIndices(row: number, col: number): string {
  const r1 = GRID_RANKS[row];
  const r2 = GRID_RANKS[col];
  if (row === col) return `${r1}${r2}`;        // pair
  if (row < col) return `${r1}${r2}s`;         // suited (upper triangle)
  return `${r2}${r1}o`;                         // offsuit (lower triangle)
}

const KIND_CODE: Record<BBDefenseClass['kind'], number> = {
  fold: 0, call: 1, value3bet: 3, bluff3bet: 4,
};

export function buildBBDefenseGrid(): number[][] {
  const grid: number[][] = [];
  for (let row = 0; row < 13; row++) {
    const rowArr: number[] = [];
    for (let col = 0; col < 13; col++) {
      const cls = getBBDefenseAction(notationFromIndices(row, col));
      rowArr.push(KIND_CODE[cls.kind]);
    }
    grid.push(rowArr);
  }
  return grid;
}

// ─── Explanation ─────────────────────────────────────────────────────────────

export function buildBBDefenseExplanation(
  notation: string,
  cls: BBDefenseClass,
  opener: string,
  openSize: number,
  lang: 'fr' | 'en' = 'fr'
): string {
  const hand = describeHand(notation, lang);

  if (lang === 'en') {
    const intro = `In the big blind you already posted 1bb and you **close the action**, so you get a great price to call and defend a **very wide** range against the ${opener}'s ${openSize}bb open.`;
    const verdict: Record<BBDefenseClass['kind'], string> = {
      value3bet: `**${hand}** is strong enough to **3-bet for value**: you want to build the pot with a hand that dominates the ${opener}'s wide opening range.`,
      bluff3bet: `**${hand}** is a **3-bet bluff (semi-bluff)**: the ace blocker reduces villain's strong hands, and the suit gives playability. Raising or just calling are both fine here.`,
      call: `**${hand}** is good enough to **defend by calling** — playable and well ahead of the bottom of villain's range — but not strong enough to 3-bet.`,
      fold: `**${hand}** is **too weak to defend**, even closing the action in the BB. It plays poorly out of position against an open — **fold**.`,
    };
    return [intro, verdict[cls.kind]].join('\n\n');
  }

  const intro = `En grosse blinde, tu as déjà posté 1bb et tu **clôtures l'action** : ta cote pour payer est excellente, donc tu défends une range **très large** face à l'ouverture de ${openSize}bb du ${opener}.`;
  const verdict: Record<BBDefenseClass['kind'], string> = {
    value3bet: `**${hand}** est assez forte pour **3-bet à la valeur** : tu veux gonfler le pot avec une main qui domine la range d'ouverture large du ${opener}.`,
    bluff3bet: `**${hand}** est un **3-bet bluff (semi-bluff)** : l'as bloque les grosses mains adverses et la couleur assure la jouabilité. Relancer ou simplement payer sont tous deux corrects.`,
    call: `**${hand}** est assez bonne pour **défendre en payant** — jouable et devant le bas de la range adverse — mais pas assez pour 3-bet.`,
    fold: `**${hand}** est **trop faible pour défendre**, même en clôturant l'action en BB. Elle se joue mal hors de position face à une ouverture — **fold**.`,
  };
  return [intro, verdict[cls.kind]].join('\n\n');
}

function describeHand(notation: string, lang: 'fr' | 'en'): string {
  if (notation.length === 2) {
    return lang === 'en' ? `pocket ${notation[0]}${notation[0]}` : `paire de ${notation[0]}`;
  }
  const suited = notation[2] === 's';
  const suffix = lang === 'en'
    ? (suited ? ' suited' : ' offsuit')
    : (suited ? ' assorti' : ' dépareillé');
  return `${notation[0]}${notation[1]}${suffix}`;
}
