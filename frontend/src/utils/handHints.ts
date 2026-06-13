// Hand-specific preflop hints — a short, human tip about WHY a given hand is
// strong/weak and what it wants to do, keyed off the 169-hand notation
// (e.g. "AA", "AKs", "AKo", "T9s", "72o"). This is the kind of guidance a coach
// would whisper — distinct from the generic "rules of the exercise" panel.

const RV: Record<string, number> = {
  A: 14, K: 13, Q: 12, J: 11, T: 10, '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2,
};

/** A hand-specific coaching hint for the given 169-grid notation. */
export function handHint(notation: string, isEn = false): string {
  if (!notation) return '';

  // ── Pocket pair ─────────────────────────────────────────────────────────────
  if (notation.length === 2) {
    const v = RV[notation[0]] ?? 0;
    if (v >= 13) return isEn
      ? 'A premium pair (AA/KK) — one of the very best hands. Raise big, almost from anywhere.'
      : 'Une paire premium (AA/KK) — une des toutes meilleures mains. Relance fort, depuis presque partout.';
    if (v >= 10) return isEn
      ? 'A big pair (QQ/JJ/TT) — very strong. It already beats most hands; play it aggressively.'
      : 'Une grosse paire (QQ/JJ/TT) — très forte. Elle bat déjà la plupart des mains ; joue-la agressivement.';
    if (v >= 7) return isEn
      ? 'A medium pair — playable, but it mostly wants to flop a set (three of a kind). Careful if big cards come.'
      : 'Une paire moyenne — jouable, mais elle cherche surtout à toucher un brelan au flop. Prudence si de grosses cartes tombent.';
    return isEn
      ? 'A small pair — its value is hitting a set on the flop (~1 in 8). Otherwise it is fragile; play cheaply.'
      : 'Une petite paire — sa valeur, c\'est de toucher un brelan au flop (~1 fois sur 8). Sinon elle est fragile ; joue-la à bon prix.';
  }

  // ── Non-pair ────────────────────────────────────────────────────────────────
  const hi = RV[notation[0]] ?? 0;
  const lo = RV[notation[1]] ?? 0;
  const suited = notation[2] === 's';
  const gap = hi - lo;
  const bothBroadway = lo >= 10;       // both cards Ten or higher
  const connected = gap === 1;
  const oneGap = gap === 2;

  if (suited) {
    if (hi === 14 && lo <= 9) return isEn
      ? 'A suited ace — it can make the nut flush (the best flush), plus blocker value. Lots of upside.'
      : 'Un As assorti — il peut faire la couleur max (la meilleure couleur), avec en plus une valeur de bloqueur. Beaucoup de potentiel.';
    if (bothBroadway) return isEn
      ? 'Two high cards of the same suit — excellent: strong top-pair potential AND a flush draw. Plays great.'
      : 'Deux hautes cartes de la même couleur — excellent : gros potentiel de paire haute ET de tirage couleur. Se joue très bien.';
    if (connected) return isEn
      ? 'Two connected cards of the same suit — good chances to make a flush or a straight. A hand full of potential.'
      : 'Deux cartes qui se suivent et de la même couleur — de bonnes chances de faire une couleur ou une suite. Une main pleine de potentiel.';
    if (oneGap) return isEn
      ? 'Almost-connected and suited — real drawing potential (flush + straight), just a touch weaker than a true connector.'
      : 'Presque connectées et assorties — du vrai potentiel de tirage (couleur + suite), juste un cran sous un vrai connecteur.';
    return isEn
      ? 'Same suit gives some flush potential, but the cards are weak — playable only in late position / cheap spots.'
      : 'La même couleur donne un peu de potentiel de couleur, mais les cartes sont faibles — jouable surtout en fin de parole / à bon prix.';
  }

  // Offsuit
  if (hi === 14 && lo >= 12) return isEn
    ? 'Two big high cards (AK/AQ) — premium broadway. Great for making a strong top pair; plays well almost anywhere.'
    : 'Deux grosses cartes hautes (AK/AQ) — broadway premium. Excellent pour faire une paire haute forte ; se joue très bien un peu partout.';
  if (bothBroadway) return isEn
    ? 'Two high cards (offsuit) — decent broadway: can make top pair or two pair, but no flush help. Solid, not premium.'
    : 'Deux hautes cartes (dépareillées) — broadway correct : peut faire paire haute ou double paire, mais pas d\'aide couleur. Solide, sans plus.';
  if (hi >= 12 && connected) return isEn
    ? 'High and connected, but offsuit — some straight potential; play it carefully and prefer late position.'
    : 'Hautes et connectées, mais dépareillées — un peu de potentiel de suite ; joue prudemment, de préférence en fin de parole.';
  return isEn
    ? 'Offsuit, weak and disconnected — little potential. Most of the time this is a fold.'
    : 'Dépareillées, faibles et peu connectées — peu de potentiel. La plupart du temps, c\'est un fold.';
}
