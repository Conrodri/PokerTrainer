export interface PotOddsResult {
  potOdds: number;
  potOddsPct: number;
  requiredEquity: number;
  isProfitable: boolean;
  ev: number;
  reasoning: string;
}

export function calculatePotOdds(
  potSize: number,
  betSize: number,
  heroEquity: number,
  lang: 'fr' | 'en' = 'fr'
): PotOddsResult {
  const callAmount = betSize;
  const totalPot = potSize + betSize + callAmount;
  const potOddsRatio = (potSize + betSize) / callAmount;
  const potOddsPct = (callAmount / totalPot) * 100;
  const requiredEquity = potOddsPct;
  const isProfitable = heroEquity >= requiredEquity;
  const equityDecimal = heroEquity / 100;
  const ev = equityDecimal * (potSize + betSize) - (1 - equityDecimal) * callAmount;
  const reasoning = buildReasoning(potSize, betSize, callAmount, potOddsPct, heroEquity, requiredEquity, isProfitable, ev, lang);

  return {
    potOdds: potOddsRatio,
    potOddsPct: Math.round(potOddsPct * 10) / 10,
    requiredEquity: Math.round(requiredEquity * 10) / 10,
    isProfitable,
    ev: Math.round(ev * 100) / 100,
    reasoning,
  };
}

function buildReasoning(
  pot: number, bet: number, call: number,
  potOddsPct: number, equity: number, required: number,
  profitable: boolean, ev: number,
  lang: 'fr' | 'en'
): string {
  if (lang === 'en') {
    return [
      `Pot: ${pot}bb, Bet: ${bet}bb → you must call ${call}bb.`,
      `Total pot if you call: ${pot + bet + call}bb.`,
      `Pot odds: ${call}bb to win ${pot + bet}bb = ${potOddsPct.toFixed(1)}% equity required.`,
      `Your equity: ${equity}% → minimum required: ${required.toFixed(1)}%.`,
      profitable
        ? `✓ CALL is profitable! EV = +${Math.abs(ev).toFixed(2)}bb per hand.`
        : `✗ FOLD is correct. EV = -${Math.abs(ev).toFixed(2)}bb if you call.`,
    ].join('\n');
  }
  return [
    `Pot : ${pot}bb, Mise : ${bet}bb → tu dois suivre ${call}bb.`,
    `Pot total si tu suis : ${pot + bet + call}bb.`,
    `Pot odds : ${call}bb pour gagner ${pot + bet}bb = ${potOddsPct.toFixed(1)}% d'équité requise.`,
    `Ton équité : ${equity}% → minimum requis : ${required.toFixed(1)}%.`,
    profitable
      ? `✓ CALL rentable ! EV = +${Math.abs(ev).toFixed(2)}bb par main.`
      : `✗ FOLD correct. EV = -${Math.abs(ev).toFixed(2)}bb si tu suis.`,
  ].join('\n');
}

export interface PotOddsScenario {
  potSize: number;
  betSize: number;
  heroEquity: number;
  correctAction: 'call' | 'fold';
  difficulty: 'easy' | 'medium' | 'hard';
  context: string;
  contextEn: string;
  heroCards: [string, string];
  board: string[];
  street: 'flop' | 'turn';
  outs: number;
  drawType: { fr: string; en: string };
}

// Every scenario is built so that heroEquity matches the Rule of 2 & 4
// (outs × 4 on the flop, outs × 2 on the turn). That keeps the whole chain
// — outs → equity → threshold → decision — fully consistent and explainable.
export const POT_ODDS_SCENARIOS: PotOddsScenario[] = [
  // ── Easy ──────────────────────────────────────────────────────────────────
  {
    potSize: 10, betSize: 5, heroEquity: 36, outs: 9,
    correctAction: 'call', difficulty: 'easy', street: 'flop',
    context: 'Tu as un tirage couleur au flop. Une demi-mise du pot à payer.',
    contextEn: 'You have a flush draw on the flop. A half-pot bet to call.',
    heroCards: ['Ah', 'Kh'], board: ['2h', '9h', 'Jc'],
    drawType: { fr: 'un tirage couleur (cœur) — 9 cartes restantes pour compléter',
                en: 'a flush draw (hearts) — 9 cards left to complete it' },
  },
  {
    potSize: 12, betSize: 6, heroEquity: 32, outs: 8,
    correctAction: 'call', difficulty: 'easy', street: 'flop',
    context: 'Tirage quinte par les deux bouts au flop face à une demi-mise.',
    contextEn: 'Open-ended straight draw on the flop facing a half-pot bet.',
    heroCards: ['9d', '8c'], board: ['7h', '6s', '2c'],
    drawType: { fr: 'un tirage quinte par les deux bouts — 8 cartes (un 5 ou un 10)',
                en: 'an open-ended straight draw — 8 cards (a 5 or a 10)' },
  },
  {
    potSize: 15, betSize: 5, heroEquity: 8, outs: 2,
    correctAction: 'fold', difficulty: 'easy', street: 'flop',
    context: 'Petite paire servie : tu ne gagnes que si tu touches ton brelan.',
    contextEn: 'Small pocket pair: you only win if you hit your set.',
    heroCards: ['7c', '7d'], board: ['Ah', 'Kc', '2s'],
    drawType: { fr: 'une petite paire cherchant le brelan — seulement 2 cartes',
                en: 'a small pair drawing to a set — only 2 cards' },
  },
  // ── Medium ────────────────────────────────────────────────────────────────
  {
    potSize: 10, betSize: 10, heroEquity: 48, outs: 12,
    correctAction: 'call', difficulty: 'medium', street: 'flop',
    context: 'Énorme tirage combiné (couleur + quinte ventre) face à une mise pot.',
    contextEn: 'Huge combo draw (flush + gutshot) facing a pot-sized bet.',
    heroCards: ['Ah', 'Qh'], board: ['Kh', 'Jc', '2h'],
    drawType: { fr: 'un tirage couleur + un tirage quinte par le ventre — 12 cartes',
                en: 'a flush draw + a gutshot straight draw — 12 cards' },
  },
  {
    potSize: 10, betSize: 8, heroEquity: 24, outs: 6,
    correctAction: 'fold', difficulty: 'medium', street: 'flop',
    context: 'Deux surcartes seulement, face à une grosse mise. Pas assez d\'équité.',
    contextEn: 'Only two overcards, facing a big bet. Not enough equity.',
    heroCards: ['As', 'Ks'], board: ['7d', '8c', '2h'],
    drawType: { fr: 'deux surcartes — 6 cartes (un as ou un roi pour la paire)',
                en: 'two overcards — 6 cards (an ace or a king to pair)' },
  },
  {
    potSize: 20, betSize: 4, heroEquity: 16, outs: 8,
    correctAction: 'call', difficulty: 'medium', street: 'turn',
    context: 'Tirage quinte bilatéral à la turn, mais la mise est minuscule.',
    contextEn: 'Open-ended straight draw on the turn, but the bet is tiny.',
    heroCards: ['Jc', 'Td'], board: ['9h', '8s', '3c', '2d'],
    drawType: { fr: 'un tirage quinte bilatéral — 8 cartes, une seule à venir (river)',
                en: 'an open-ended straight draw — 8 cards, one to come (river)' },
  },
  {
    potSize: 10, betSize: 5, heroEquity: 18, outs: 9,
    correctAction: 'fold', difficulty: 'medium', street: 'turn',
    context: 'Tirage couleur à la turn : il ne reste qu\'une carte, l\'équité chute.',
    contextEn: 'Flush draw on the turn: only one card left, equity drops.',
    heroCards: ['Ad', 'Kd'], board: ['5d', '9d', 'Jc', '2s'],
    drawType: { fr: 'un tirage couleur (carreau) — 9 cartes, une seule à venir (river)',
                en: 'a flush draw (diamonds) — 9 cards, one to come (river)' },
  },
  // ── Hard ──────────────────────────────────────────────────────────────────
  {
    potSize: 6, betSize: 12, heroEquity: 60, outs: 15,
    correctAction: 'call', difficulty: 'hard', street: 'flop',
    context: 'Monstre à 15 outs face à un surbet (overbet). Tu es même favori !',
    contextEn: '15-out monster facing an overbet. You are even a favorite!',
    heroCards: ['9h', '8h'], board: ['7c', 'Th', '2h'],
    drawType: { fr: 'un gros tirage couleur + quinte bilatérale — 15 cartes',
                en: 'a big flush draw + open-ended straight draw — 15 cards' },
  },
  {
    potSize: 30, betSize: 5, heroEquity: 18, outs: 9,
    correctAction: 'call', difficulty: 'hard', street: 'turn',
    context: 'Tirage couleur à la turn mais la mise est si petite que c\'est rentable.',
    contextEn: 'Flush draw on the turn, but the bet is so small it is profitable.',
    heroCards: ['Kd', 'Qd'], board: ['3d', '8d', '9c', '2h'],
    drawType: { fr: 'un tirage couleur (carreau) — 9 cartes, une seule à venir (river)',
                en: 'a flush draw (diamonds) — 9 cards, one to come (river)' },
  },
  {
    potSize: 12, betSize: 6, heroEquity: 8, outs: 4,
    correctAction: 'fold', difficulty: 'hard', street: 'turn',
    context: 'Tirage par le ventre à la turn : trop peu d\'outs, une seule carte.',
    contextEn: 'Gutshot on the turn: too few outs, only one card to come.',
    heroCards: ['9d', '8d'], board: ['Qh', 'Jc', '2s', '5h'],
    drawType: { fr: 'un tirage quinte par le ventre — 4 cartes, une seule à venir (river)',
                en: 'a gutshot straight draw — 4 cards, one to come (river)' },
  },
  {
    potSize: 9, betSize: 9, heroEquity: 32, outs: 8,
    correctAction: 'fold', difficulty: 'hard', street: 'flop',
    context: 'Décision limite : tirage bilatéral face à une mise pot, juste sous le seuil.',
    contextEn: 'Borderline spot: open-ended draw facing a pot bet, just under the threshold.',
    heroCards: ['Tc', '9c'], board: ['8h', '7d', '2s'],
    drawType: { fr: 'un tirage quinte bilatéral — 8 cartes (un 6 ou un valet)',
                en: 'an open-ended straight draw — 8 cards (a 6 or a jack)' },
  },
  {
    potSize: 20, betSize: 4, heroEquity: 16, outs: 4,
    correctAction: 'call', difficulty: 'medium', street: 'flop',
    context: 'Petit tirage par le ventre, mais la mise minuscule rend le call correct.',
    contextEn: 'Small gutshot, but the tiny bet makes the call correct.',
    heroCards: ['9d', '8d'], board: ['Qh', 'Jc', '2s'],
    drawType: { fr: 'un tirage quinte par le ventre — 4 cartes (un 10)',
                en: 'a gutshot straight draw — 4 cards (a 10)' },
  },
];

export function getRandomScenario(difficulty?: 'easy' | 'medium' | 'hard'): PotOddsScenario {
  const pool = difficulty
    ? POT_ODDS_SCENARIOS.filter(s => s.difficulty === difficulty)
    : POT_ODDS_SCENARIOS;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ─── Expert: borderline decisions ────────────────────────────────────────────
// Real draws whose Rule-of-2&4 equity sits in the "close-able" range (you can't
// just eyeball call/fold). The generator wraps an ugly pot/bet around them so
// the required equity lands within a few points of the hero's equity.

const ri = (n: number) => Math.floor(Math.random() * n);
const pick = <T,>(a: T[]): T => a[ri(a.length)];

interface CloseDraw {
  heroCards: [string, string]; board: string[]; street: 'flop' | 'turn'; outs: number;
  drawType: { fr: string; en: string };
}
const CLOSE_DRAWS: CloseDraw[] = [
  { heroCards: ['9d', '8c'], board: ['7h', '6s', '2c'], street: 'flop', outs: 8,
    drawType: { fr: 'un tirage quinte bilatéral — 8 outs (≈32%)', en: 'an open-ended straight draw — 8 outs (≈32%)' } },
  { heroCards: ['Ah', 'Kh'], board: ['2h', '9h', 'Jc'], street: 'flop', outs: 9,
    drawType: { fr: 'un tirage couleur — 9 outs (≈36%)', en: 'a flush draw — 9 outs (≈36%)' } },
  { heroCards: ['As', 'Ks'], board: ['7d', '8c', '2h'], street: 'flop', outs: 6,
    drawType: { fr: 'deux surcartes — 6 outs (≈24%)', en: 'two overcards — 6 outs (≈24%)' } },
  { heroCards: ['Ah', 'Qh'], board: ['Kh', 'Jc', '2h'], street: 'flop', outs: 12,
    drawType: { fr: 'un tirage combiné couleur + ventre — 12 outs (≈48%)', en: 'a combo flush + gutshot draw — 12 outs (≈48%)' } },
  { heroCards: ['Ad', 'Kd'], board: ['5d', '9d', 'Jc', '2s'], street: 'turn', outs: 9,
    drawType: { fr: 'un tirage couleur à la turn — 9 outs (≈18%, une carte)', en: 'a flush draw on the turn — 9 outs (≈18%, one card)' } },
  { heroCards: ['Jc', 'Td'], board: ['9h', '8s', '3c', '2d'], street: 'turn', outs: 8,
    drawType: { fr: 'un tirage bilatéral à la turn — 8 outs (≈16%, une carte)', en: 'an open-ended draw on the turn — 8 outs (≈16%, one card)' } },
  { heroCards: ['9d', '8d'], board: ['Qh', 'Jc', '2s'], street: 'flop', outs: 4,
    drawType: { fr: 'un tirage par le ventre — 4 outs (≈16%)', en: 'a gutshot — 4 outs (≈16%)' } },
];

/** Build a borderline call/fold spot: required equity within ~3.5% of the
 *  hero's equity, with "ugly" pot/bet so it can't be eyeballed. */
export function generateClosePotOddsScenario(lang: 'fr' | 'en' = 'fr'): PotOddsScenario {
  const UGLY_POTS = [13, 17, 19, 23, 27, 31];
  for (;;) {
    const d = pick(CLOSE_DRAWS);
    const E = d.outs * (d.street === 'flop' ? 4 : 2);     // Rule of 2 & 4 (%)
    const pot = pick(UGLY_POTS);
    const target = (E + (Math.random() * 7 - 3.5)) / 100; // aim just around the threshold
    const R = Math.max(0.08, Math.min(0.46, target));
    const bet = Math.max(2, Math.round((R * pot) / (1 - 2 * R)));
    if (bet > pot * 2.5) continue;
    const required = (bet / (pot + 2 * bet)) * 100;
    if (Math.abs(E - required) > 3.5) continue;           // must stay borderline
    const correctAction: 'call' | 'fold' = E >= required ? 'call' : 'fold';
    return {
      potSize: pot, betSize: bet, heroEquity: E, outs: d.outs,
      correctAction, difficulty: 'hard', street: d.street,
      heroCards: d.heroCards, board: d.board,
      context: `Décision limite : tu as ${d.drawType.fr}, face à une mise de ${bet}bb dans un pot de ${pot}bb. Calcule précisément — c'est très serré.`,
      contextEn: `Borderline decision: you have ${d.drawType.en}, facing a ${bet}bb bet into a ${pot}bb pot. Compute precisely — it's very close.`,
      drawType: d.drawType,
    };
  }
}

// ─── Equity explanation (where does our equity come from?) ────────────────────

export function buildEquityExplanation(
  scenario: PotOddsScenario,
  lang: 'fr' | 'en' = 'fr',
  mode: 'beginner' | 'advanced' = 'beginner'
): string {
  const { outs, heroEquity, street, drawType } = scenario;
  const mult = street === 'flop' ? 4 : 2;
  const comeFr = street === 'flop' ? 'deux cartes à venir (turn + river)' : 'une seule carte à venir (la river)';
  const comeEn = street === 'flop' ? 'two cards to come (turn + river)' : 'one card to come (the river)';

  if (lang === 'en') {
    if (mode === 'advanced') {
      return [
        `Equity ≈ Rule of 2 & 4: **${outs} × ${mult} = ${heroEquity}%** (${comeEn}).`,
        `This is an approximation. True (simulated) equity differs slightly: **discount "dirty" outs** that also improve villain, and value your **redraws**. Above ~8 outs on the flop, ×4 slightly overestimates.`,
      ].join('\n\n');
    }
    return [
      `**Your equity = your chance to win the hand** if you go all the way to the river.`,
      `Here you hold ${drawType.en}. The cards that improve you are your **outs**.`,
      `To estimate your chance, use the **Rule of 2 & 4**: multiply outs by 4 on the flop, by 2 on the turn (because there are ${comeEn}).`,
      `Calculation: **${outs} outs × ${mult} ≈ ${heroEquity}%**.`,
      `So you will win the hand about **${heroEquity}%** of the time.`,
    ].join('\n\n');
  }

  if (mode === 'advanced') {
    return [
      `Équité ≈ règle de 2 et 4 : **${outs} × ${mult} = ${heroEquity}%** (${comeFr}).`,
      `C'est une approximation. La vraie équité (par simulation) diffère un peu : **décompte les outs « sales »** qui améliorent aussi l'adversaire, et valorise tes **redraws**. Au-delà de ~8 outs au flop, la règle de 4 surestime légèrement.`,
    ].join('\n\n');
  }
  return [
    `**Ton équité = ta chance de gagner le coup** si on va jusqu'à la river.`,
    `Ici tu as ${drawType.fr}. Les cartes qui t'améliorent s'appellent tes **outs**.`,
    `Pour estimer ta chance, on utilise la **règle de 2 et 4** : on multiplie les outs par 4 au flop, par 2 à la turn (car il y a ${comeFr}).`,
    `Calcul : **${outs} outs × ${mult} ≈ ${heroEquity}%**.`,
    `Tu gagneras donc le coup environ **${heroEquity}%** du temps.`,
  ].join('\n\n');
}

// ─── Threshold explanation (the minimum equity needed) ────────────────────────

function formatRatio(pot: number, bet: number): string {
  const r = (pot + bet) / bet;
  return Number.isInteger(r) ? `${r}:1` : `${r.toFixed(1)}:1`;
}

export function buildThresholdExplanation(
  pot: number,
  bet: number,
  requiredEquity: number,
  heroEquity: number,
  lang: 'fr' | 'en' = 'fr',
  mode: 'beginner' | 'advanced' = 'beginner'
): string {
  const call = bet;
  const total = pot + bet + call;
  const req = requiredEquity.toFixed(1).replace(/\.0$/, '');
  const ratio = formatRatio(pot, bet);
  const profitable = heroEquity >= requiredEquity;

  if (lang === 'en') {
    if (mode === 'advanced') {
      return [
        `Break-even threshold = amount to call ÷ final pot = ${call} ÷ (${pot}+${bet}+${call}) = **${req}%**.`,
        `As odds: you are getting **${ratio}** on your call. Continue whenever your equity (${heroEquity}%) beats ${req}%.`,
        `⚠️ This is **direct odds** only. With **implied odds** (extra money won when you hit) the real threshold drops; with **reverse implied odds** it rises. Also factor in **fold equity** if you can raise instead.`,
      ].join('\n\n');
    }
    return [
      `The **minimum threshold** (the "pot odds") is the smallest equity that makes calling profitable in the long run.`,
      `• Step 1 — **amount you must pay**: ${call}bb.`,
      `• Step 2 — **total pot if you call**: existing pot (${pot}bb) + villain's bet (${bet}bb) + your call (${call}bb) = **${total}bb**.`,
      `• Step 3 — formula:\n**( amount to pay / total pot if call ) × 100 = ( ${call} / ${total} ) × 100 = ${req}%**`,
      `In plain words: you must win at least **${req}%** of the time. Your equity is **${heroEquity}%** → ${profitable ? `that is **above** the threshold, so **calling is profitable** ✅` : `that is **below** the threshold, so you should **fold** ❌`}.`,
    ].join('\n\n');
  }

  if (mode === 'advanced') {
    return [
      `Seuil break-even = mise à payer ÷ pot final = ${call} ÷ (${pot}+${bet}+${call}) = **${req}%**.`,
      `En cote : tu reçois **${ratio}** sur ton call. Tu continues dès que ton équité (${heroEquity}%) dépasse ${req}%.`,
      `⚠️ Ce ne sont que les **cotes directes**. Avec des **implied odds** (gains futurs quand tu touches) le seuil réel baisse ; avec des **reverse implied odds** il monte. Pense aussi à ta **fold equity** si tu peux relancer.`,
    ].join('\n\n');
  }
  return [
    `Le **seuil minimum** (les « pot odds ») est l'équité la plus basse qui rend le call rentable sur le long terme.`,
    `• Étape 1 — **montant à payer** : ${call}bb.`,
    `• Étape 2 — **pot total si tu suis** : pot existant (${pot}bb) + mise adverse (${bet}bb) + ta mise (${call}bb) = **${total}bb**.`,
    `• Étape 3 — formule :\n**( montant à payer / pot total si call ) × 100 = ( ${call} / ${total} ) × 100 = ${req}%**`,
    `En clair : il faut gagner au moins **${req}%** du temps. Ton équité est de **${heroEquity}%** → ${profitable ? `c'est **au-dessus** du seuil, donc **suivre est rentable** ✅` : `c'est **en-dessous** du seuil, donc il faut **se coucher** ❌`}.`,
  ].join('\n\n');
}
