export type GlossaryCategory = 'action' | 'position' | 'concept' | 'strength' | 'street' | 'board';

export interface GlossaryEntry {
  id: string;
  fr: string;            // display name FR
  en: string;            // display name EN
  definitionFr: string;
  definitionEn: string;
  category: GlossaryCategory;
}

export const GLOSSARY: GlossaryEntry[] = [

  // ── Actions ──────────────────────────────────────────────────────────────────
  {
    id: 'fold',
    fr: 'Fold (se coucher)', en: 'Fold',
    definitionFr: 'Abandonner sa main. Tu perds la mise déjà investie mais n\'en mets pas plus. Obligatoire face à une mise qu\'on ne peut pas justifier.',
    definitionEn: 'Discard your hand. You lose what you already put in but risk nothing more. Mandatory when facing a bet you can\'t justify calling.',
    category: 'action',
  },
  {
    id: 'call',
    fr: 'Call (suivre)', en: 'Call',
    definitionFr: 'Égaler la mise du joueur précédent pour rester dans la main. Rentable si ton équité dépasse les pot odds requis.',
    definitionEn: 'Match the previous player\'s bet to stay in the hand. Profitable when your equity exceeds the required pot odds.',
    category: 'action',
  },
  {
    id: 'raise',
    fr: 'Raise (relancer)', en: 'Raise',
    definitionFr: 'Miser plus que le joueur précédent. Force les autres à payer plus ou à se coucher. Utilisé pour du value ou du bluff.',
    definitionEn: 'Bet more than the previous player. Forces others to pay more or fold. Used for value or as a bluff.',
    category: 'action',
  },
  {
    id: 'check',
    fr: 'Check', en: 'Check',
    definitionFr: 'Passer sans miser. Possible seulement si personne n\'a misé avant toi sur cette street. Permet de voir la carte suivante gratuitement.',
    definitionEn: 'Pass without betting. Only possible if no one has bet before you on this street. Lets you see the next card for free.',
    category: 'action',
  },
  {
    id: '3bet',
    fr: '3-Bet', en: '3-Bet',
    definitionFr: 'Re-relancer après une première relance. La 3ème mise de la séquence : blind → raise → 3-bet. Très polarisant (value ou bluff fort).',
    definitionEn: 'Re-raise after an initial raise. The 3rd bet in the sequence: blind → raise → 3-bet. Very polarising (value or strong bluff).',
    category: 'action',
  },
  {
    id: 'allin',
    fr: 'All-in', en: 'All-in',
    definitionFr: 'Miser l\'intégralité de son stack. On ne peut plus perdre plus que ce qu\'on a misé — les mises supplémentaires forment des side pots.',
    definitionEn: 'Bet all your chips. You can\'t lose more than what you put in — extra bets form side pots.',
    category: 'action',
  },
  {
    id: 'cbet',
    fr: 'C-bet (continuation bet)', en: 'C-bet',
    definitionFr: 'Miser au flop (ou turn) après avoir été l\'agresseur pré-flop, que la board t\'aide ou non. Continuité de la représentation pré-flop.',
    definitionEn: 'Betting the flop (or turn) after being the pre-flop aggressor, whether or not the board helps you. Continuation of pre-flop aggression.',
    category: 'action',
  },
  {
    id: 'valuebet',
    fr: 'Value bet', en: 'Value bet',
    definitionFr: 'Miser avec une bonne main dans l\'espoir que l\'adversaire suive avec une main plus faible. L\'objectif est d\'extraire un maximum de jetons.',
    definitionEn: 'Betting with a strong hand hoping your opponent calls with a weaker one. The goal is to extract maximum chips.',
    category: 'action',
  },
  {
    id: 'bluff',
    fr: 'Bluff', en: 'Bluff',
    definitionFr: 'Miser ou relancer avec une main faible pour forcer l\'adversaire à se coucher. Doit être calibré : trop de bluffs = exploitable.',
    definitionEn: 'Betting or raising with a weak hand to force your opponent to fold. Must be calibrated: too many bluffs = exploitable.',
    category: 'action',
  },

  // ── Positions ─────────────────────────────────────────────────────────────────
  {
    id: 'btn',
    fr: 'BTN (Button)', en: 'BTN (Button)',
    definitionFr: 'La meilleure position. Le donneur (D) parle en DERNIER post-flop et voit toutes les actions avant de décider. Range d\'ouverture la plus large (~45%).',
    definitionEn: 'The best position. The dealer (D) acts LAST post-flop and sees all actions before deciding. Widest opening range (~45%).',
    category: 'position',
  },
  {
    id: 'sb',
    fr: 'SB (Small Blind)', en: 'SB (Small Blind)',
    definitionFr: 'Poste 0.5 BB obligatoire avant de voir ses cartes. Parle en premier post-flop (hors position) — position difficile malgré la blind déjà investie.',
    definitionEn: 'Posts 0.5 BB forced before seeing cards. Acts first post-flop (out of position) — a tough spot despite the blind already invested.',
    category: 'position',
  },
  {
    id: 'bb',
    fr: 'BB (Big Blind)', en: 'BB (Big Blind)',
    definitionFr: 'Poste 1 BB obligatoire. Ferme l\'action pré-flop (dernier à parler). Post-flop, généralement OOP sauf face au SB.',
    definitionEn: 'Posts 1 BB forced. Closes the pre-flop action (last to act). Post-flop, usually OOP except vs. SB.',
    category: 'position',
  },
  {
    id: 'utg',
    fr: 'UTG (Under the Gun)', en: 'UTG (Under the Gun)',
    definitionFr: 'La pire position. Parle en PREMIER pré-flop sans aucune information. Range très serrée (~15%) — tous les adversaires actent encore après toi.',
    definitionEn: 'The worst position. Acts FIRST pre-flop with no information. Very tight range (~15%) — every opponent still has to act.',
    category: 'position',
  },
  {
    id: 'hj',
    fr: 'HJ (Hijack)', en: 'HJ (Hijack)',
    definitionFr: '2 places avant le BTN. Position intermédiaire — légèrement meilleure qu\'UTG (~20% de range).',
    definitionEn: '2 seats before BTN. Middle position — slightly better than UTG (~20% range).',
    category: 'position',
  },
  {
    id: 'co',
    fr: 'CO (Cutoff)', en: 'CO (Cutoff)',
    definitionFr: 'Juste avant le BTN. Bonne position avec une range assez large (~26%). Vol de blindes fréquent.',
    definitionEn: 'Right before BTN. Good position with a fairly wide range (~26%). Frequent blind stealing.',
    category: 'position',
  },
  {
    id: 'ip',
    fr: 'IP (In Position)', en: 'IP (In Position)',
    definitionFr: 'Parler APRÈS son adversaire post-flop. Gros avantage informationnel : tu vois son action avant de décider.',
    definitionEn: 'Acting AFTER your opponent post-flop. Huge informational edge: you see their action before deciding.',
    category: 'position',
  },
  {
    id: 'oop',
    fr: 'OOP (Out of Position)', en: 'OOP (Out of Position)',
    definitionFr: 'Parler AVANT son adversaire post-flop. Désavantage — tu décides sans information sur l\'intention de l\'autre.',
    definitionEn: 'Acting BEFORE your opponent post-flop. Disadvantage — you decide without information on the other\'s intentions.',
    category: 'position',
  },

  // ── Concepts ──────────────────────────────────────────────────────────────────
  {
    id: 'equity',
    fr: 'Équité (Equity)', en: 'Equity',
    definitionFr: 'Le % de chance de gagner le pot si toutes les cartes sont retournées maintenant. Ex : paire d\'As pré-flop ≈ 85% contre une main aléatoire.',
    definitionEn: 'The % chance of winning the pot if all cards were revealed now. E.g.: pocket Aces pre-flop ≈ 85% against a random hand.',
    category: 'concept',
  },
  {
    id: 'potodds',
    fr: 'Pot Odds', en: 'Pot Odds',
    definitionFr: 'Le rapport entre la mise à payer et le pot total. Pot = 100, mise = 25 → Pot Odds = 25/125 = 20%. Si ton équité > 20%, call est profitable.',
    definitionEn: 'The ratio between the bet to call and the total pot. Pot = 100, bet = 25 → Pot Odds = 25/125 = 20%. If equity > 20%, calling is profitable.',
    category: 'concept',
  },
  {
    id: 'outs',
    fr: 'Outs', en: 'Outs',
    definitionFr: 'Cartes qui amélioreront ta main. 4 cartes de couleur = 9 outs (9 cartes restantes de cette couleur). Règle des 4 et 2 pour estimer l\'équité.',
    definitionEn: 'Cards that will improve your hand. 4 flush cards = 9 outs. Use the rule of 4 and 2 to estimate equity from outs.',
    category: 'concept',
  },
  {
    id: 'range',
    fr: 'Range', en: 'Range',
    definitionFr: 'L\'ensemble des mains possibles qu\'un joueur peut avoir dans une situation. On joue contre une range, pas contre des cartes précises qu\'on ne connaît pas.',
    definitionEn: 'The set of possible hands a player can have in a situation. We play against a range, not specific unknown cards.',
    category: 'concept',
  },
  {
    id: 'gto',
    fr: 'GTO (Game Theory Optimal)', en: 'GTO',
    definitionFr: 'Stratégie mathématiquement équilibrée et non-exploitable. Mix optimal de value bets et bluffs dans les bonnes fréquences. Référence théorique du poker moderne.',
    definitionEn: 'Mathematically balanced and unexploitable strategy. Optimal mix of value bets and bluffs at the right frequencies. The theoretical benchmark of modern poker.',
    category: 'concept',
  },
  {
    id: 'ev',
    fr: 'EV (Expected Value)', en: 'EV (Expected Value)',
    definitionFr: 'Gain moyen espéré d\'une décision sur le long terme. EV+ = rentable, EV- = perd des chips en moyenne. Toute décision de poker peut être évaluée en EV.',
    definitionEn: 'Average expected gain of a decision over the long run. EV+ = profitable, EV- = loses chips on average. Every poker decision can be evaluated in EV.',
    category: 'concept',
  },
  {
    id: 'stack',
    fr: 'Stack', en: 'Stack',
    definitionFr: 'Montant de jetons qu\'un joueur possède, exprimé en big blinds (bb). Un stack de 100bb est standard en cash game.',
    definitionEn: 'Amount of chips a player has, expressed in big blinds (bb). A 100bb stack is standard in cash games.',
    category: 'concept',
  },
  {
    id: 'spr',
    fr: 'SPR (Stack-to-Pot Ratio)', en: 'SPR',
    definitionFr: 'Stack effectif divisé par la taille du pot. SPR bas (< 3) = situation de commitment/all-in. SPR élevé = jeu post-flop profond et complexe.',
    definitionEn: 'Effective stack divided by pot size. Low SPR (< 3) = commitment/all-in situations. High SPR = deep, complex post-flop play.',
    category: 'concept',
  },
  {
    id: 'polarise',
    fr: 'Range polarisée', en: 'Polarised range',
    definitionFr: 'Range composée des très bonnes mains (nuts) ET des bluffs — sans les mains intermédiaires. Typique des grosses mises (river, 3-bet).',
    definitionEn: 'Range made of very strong hands (nuts) AND bluffs — without medium hands. Typical of large bets (river, 3-bet).',
    category: 'concept',
  },

  // ── Force des mains ───────────────────────────────────────────────────────────
  {
    id: 'nuts',
    fr: 'Nuts (la meilleure main)', en: 'Nuts',
    definitionFr: 'La meilleure main POSSIBLE étant donné les cartes communes. Avoir les nuts = impossible de perdre à ce stade.',
    definitionEn: 'The BEST POSSIBLE hand given the community cards. Having the nuts = impossible to lose at this point.',
    category: 'strength',
  },
  {
    id: 'draw',
    fr: 'Draw (tirage)', en: 'Draw',
    definitionFr: 'Main incomplète nécessitant une carte de plus pour être forte. Flush draw = 4 cartes de couleur. Straight draw = 4 cartes consécutives.',
    definitionEn: 'Incomplete hand needing one more card to be strong. Flush draw = 4 flush cards. Straight draw = 4 consecutive cards.',
    category: 'strength',
  },
  {
    id: 'madehand',
    fr: 'Main made (main complète)', en: 'Made hand',
    definitionFr: 'Main déjà complète qui n\'a pas besoin d\'aide. Opposée au draw. Ex : paire, brelan, full, etc.',
    definitionEn: 'A complete hand that doesn\'t need improvement. Opposite of a draw. E.g.: pair, set, full house, etc.',
    category: 'strength',
  },
  {
    id: 'set',
    fr: 'Set (brelan de poche)', en: 'Set',
    definitionFr: 'Brelan formé avec une paire en main + une carte de la board. Très puissant et difficile à détecter par l\'adversaire.',
    definitionEn: 'Three of a kind formed with a pocket pair + one board card. Very strong and hard for opponents to detect.',
    category: 'strength',
  },
  {
    id: 'trips',
    fr: 'Trips', en: 'Trips',
    definitionFr: 'Brelan formé avec une seule carte en main + une paire sur la board. Moins camouflé qu\'un set.',
    definitionEn: 'Three of a kind formed with one hole card + a pair on the board. Less disguised than a set.',
    category: 'strength',
  },

  // ── Textures de board ─────────────────────────────────────────────────────────
  {
    id: 'dry',
    fr: 'Board sec (dry)', en: 'Dry board',
    definitionFr: 'Board qui offre peu de tirages possibles. Ex : K♠ 7♦ 2♣. Peu de draws flush ou quinte. Les mains faites dominent et les bluffs sont plus risqués.',
    definitionEn: 'Board that offers few possible draws. E.g.: K♠ 7♦ 2♣. Few flush or straight draws. Made hands dominate; bluffs are riskier.',
    category: 'board',
  },
  {
    id: 'wet',
    fr: 'Board mouillé (wet)', en: 'Wet board',
    definitionFr: 'Board avec de nombreux tirages possibles (flush draw, straight draw). Ex : 9♠ 8♥ 7♦. Les adversaires ont souvent des draws, les protections de mains sont importantes.',
    definitionEn: 'Board with many possible draws (flush draw, straight draw). E.g.: 9♠ 8♥ 7♦. Opponents often have draws; hand protection becomes important.',
    category: 'board',
  },
  {
    id: 'static',
    fr: 'Board statique', en: 'Static board',
    definitionFr: 'Board dont le classement des mains ne changera probablement pas avec les prochaines cartes. Typiquement sec et non-connecté. Les mains dominantes restent dominantes.',
    definitionEn: 'Board where hand rankings are unlikely to change with future cards. Typically dry and unconnected. Dominant hands stay dominant.',
    category: 'board',
  },
  {
    id: 'dynamic',
    fr: 'Board dynamique', en: 'Dynamic board',
    definitionFr: 'Board dont la hiérarchie des mains peut radicalement changer avec la turn ou la river. Beaucoup de draws = board dynamique. Nécessite de jouer plus vite (bet/raise pour protection).',
    definitionEn: 'Board where hand rankings can change dramatically with the turn or river. Many draws = dynamic board. Requires playing faster (bet/raise for protection).',
    category: 'board',
  },
  {
    id: 'rainbow',
    fr: 'Board arc-en-ciel (rainbow)', en: 'Rainbow board',
    definitionFr: 'Les 3 cartes du flop ont des couleurs différentes. Aucun flush draw possible immédiatement. Ex : K♠ 9♥ 3♦.',
    definitionEn: 'The 3 flop cards have different suits. No immediate flush draw possible. E.g.: K♠ 9♥ 3♦.',
    category: 'board',
  },
  {
    id: 'monotone',
    fr: 'Board monotone', en: 'Monotone board',
    definitionFr: 'Les 3 cartes du flop (ou plus) ont la même couleur. Flush déjà possible avec 2 cartes en main de cette couleur. Board très dangereux pour les mains sans couleur.',
    definitionEn: 'All 3 flop cards (or more) share the same suit. A flush is immediately possible with 2 matching hole cards. Very dangerous board for non-flush hands.',
    category: 'board',
  },
  {
    id: 'twotone',
    fr: 'Board bicolore (two-tone)', en: 'Two-tone board',
    definitionFr: 'Deux cartes du flop ont la même couleur. Un flush draw est possible. Ni trop sec ni trop mouillé — la turn déterminera si le tirage se complète.',
    definitionEn: 'Two flop cards share the same suit. A flush draw is possible. Neither too dry nor too wet — the turn will determine if the draw completes.',
    category: 'board',
  },
  {
    id: 'connected',
    fr: 'Board connecté', en: 'Connected board',
    definitionFr: 'Les cartes du board sont proches en valeur, permettant des tirages quinte. Ex : 8-9-T. Plus le board est connecté, plus il est dynamique et dangereux.',
    definitionEn: 'Board cards are close in rank, enabling straight draws. E.g.: 8-9-T. The more connected the board, the more dynamic and dangerous it is.',
    category: 'board',
  },

  // ── Streets ───────────────────────────────────────────────────────────────────
  {
    id: 'preflop',
    fr: 'Préflop', en: 'Pre-flop',
    definitionFr: 'Première phase du jeu. Chaque joueur reçoit 2 cartes secrètes (hole cards). On décide d\'ouvrir, suivre ou se coucher avant les cartes communes.',
    definitionEn: 'First phase of play. Each player receives 2 secret cards (hole cards). Decide to open, call or fold before community cards.',
    category: 'street',
  },
  {
    id: 'flop',
    fr: 'Flop', en: 'Flop',
    definitionFr: 'Les 3 premières cartes communes posées face visible. Elles appartiennent à tous les joueurs pour former la meilleure combinaison.',
    definitionEn: 'The first 3 community cards placed face up. They belong to all players to form the best combination.',
    category: 'street',
  },
  {
    id: 'turn',
    fr: 'Turn', en: 'Turn',
    definitionFr: 'La 4ème carte commune. Posée après un premier tour de mises sur le flop. Les pots s\'intensifient.',
    definitionEn: 'The 4th community card. Dealt after the first flop betting round. Pots intensify.',
    category: 'street',
  },
  {
    id: 'river',
    fr: 'River', en: 'River',
    definitionFr: 'La 5ème et dernière carte commune. Dernier tour de mises. Les mains sont figées — il n\'y a plus de draw possible.',
    definitionEn: 'The 5th and last community card. Final betting round. Hands are locked — no more draws possible.',
    category: 'street',
  },
  {
    id: 'showdown',
    fr: 'Showdown (abattage)', en: 'Showdown',
    definitionFr: 'Révélation des cartes à la fin de la main. Le joueur avec la meilleure combinaison (5 cartes parmi les 7 disponibles) remporte le pot.',
    definitionEn: 'Card reveal at the end of the hand. The player with the best 5-card combination (out of 7 available) wins the pot.',
    category: 'street',
  },
];
