// Concrete, situation-specific coaching hints (distinct from the generic
// "rules of the exercise" panels). These compute the actual numbers for the
// current spot so the player gets a real nudge toward the decision.

/** Minimum equity (%) needed to profitably call a bet, by direct pot odds.
 *  Call cost = bet; final pot = pot + bet + call. Matches the backend formula. */
export function requiredEquityPct(pot: number, bet: number): number {
  if (bet <= 0) return 0;
  return Math.round((bet / (pot + bet + bet)) * 1000) / 10;
}

/** Pot-odds coaching line: plugs the spot's numbers in and frames the compare. */
export function potOddsHint(pot: number, bet: number, equity: number, isEn: boolean): string {
  const req = requiredEquityPct(pot, bet);
  return isEn
    ? `You pay ${bet}bb to try to win a ${pot + bet}bb pot → you need about ${req}% equity for the call to break even. Yours is ${equity}%: if your equity ≥ ${req}% the call is profitable, otherwise fold.`
    : `Tu paies ${bet}bb pour tenter de gagner un pot de ${pot + bet}bb → il te faut environ ${req}% d'équité pour que le call soit rentable. La tienne est de ${equity}% : si ton équité ≥ ${req}% le call est rentable, sinon couche-toi.`;
}

/** Postflop/full-hand coaching line: actionable advice from equity + action. */
export function postflopHint(opts: {
  equity: number; facingBet: boolean; bet: number; pot: number; isEn: boolean;
}): string {
  const { equity, facingBet, bet, pot, isEn } = opts;
  if (facingBet) {
    const req = requiredEquityPct(pot, bet);
    return isEn
      ? `You hold ~${equity}% equity. Calling ${bet}bb needs about ${req}%: above it, continue — call, or raise when your hand is strong and the board favours you; below it, fold.`
      : `Tu as ~${equity}% d'équité. Payer ${bet}bb demande environ ${req}% : au-dessus, continue — call, ou relance si ta main est forte et le board t'avantage ; en-dessous, couche-toi.`;
  }
  return isEn
    ? `Nobody has bet. With a strong hand (~${equity}% equity) bet for value; with a weak hand, check to see a free card; a good draw can bet as a semi-bluff.`
    : `Personne n'a misé. Avec une main forte (~${equity}% d'équité), mise pour la valeur ; avec une main faible, checke pour une carte gratuite ; un bon tirage peut miser en semi-bluff.`;
}
