import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Position } from '../../types/poker';
import { useLangStore } from '../../store/langStore';
import { useThemeStore, SUIT_COLORS } from '../../store/themeStore';

// Clockwise game order (BTN deals, then SB left of BTN, then BB, etc.)
const CLOCKWISE: Position[] = ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'];

// ─── Seat layout: hero always at S0 (bottom center) ───────────────────────
// cx/cy = blind-token / dealer-chip position.
// Tokens for S1/S5 (bottom-left/-right) are pushed DOWN (cy>60) to sit below
// the board-card row (~y 38-62%).  Tokens for S2/S3/S4 (upper arc) are pushed
// UP (cy<28) to sit above the board-card row.  This prevents any overlap with
// the community cards regardless of board size.
const SEAT_LAYOUT = [
  { sx: 50, sy: 78, cx: 50, cy: 65, side: 'bottom' },  // S0: hero (bottom center)
  { sx: 17, sy: 63, cx: 29, cy: 67, side: 'left'   },  // S1: bottom-left  ← SB  (below cards)
  { sx: 13, sy: 26, cx: 27, cy: 22, side: 'left'   },  // S2: left         ← BB  (above cards)
  { sx: 50, sy: 8,  cx: 50, cy: 19, side: 'top'    },  // S3: top          ← UTG (above cards)
  { sx: 87, sy: 26, cx: 73, cy: 22, side: 'right'  },  // S4: right        ← HJ  (above cards)
  { sx: 83, sy: 63, cx: 71, cy: 67, side: 'right'  },  // S5: bottom-right ← CO  (below cards)
] as const;

export const POSITION_COLORS: Record<Position, string> = {
  BTN: '#16a34a', SB: '#2563eb', BB: '#dc2626',
  UTG: '#b45309', HJ: '#7c3aed', CO: '#0891b2',
};

// ─── Mini card (for board + hero hand display on table) ──────────────────────

const SUIT_SYM: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };

function MiniCard({ card, size = 'xs' }: { card: string; size?: 'xs' | 'sm' | 'md' | 'lg' }) {
  const cardStyle = useThemeStore(s => s.trainingCardStyle);
  const raw  = card[0];
  const suit = card[1];
  const rank = raw === 'T' ? '10' : raw;
  const sym  = SUIT_SYM[suit] ?? suit;
  const color = SUIT_COLORS[cardStyle][suit] ?? '#111827';

  const dims = size === 'lg' ? { w: 52, h: 72, r: 8, fs: 24 }
             : size === 'md' ? { w: 40, h: 55, r: 5, fs: 16 }
             : size === 'sm' ? { w: 28, h: 38, r: 4, fs: 12 }
             :                 { w: 20, h: 28, r: 3, fs:  9 };

  return (
    <div style={{
      width:          dims.w,
      height:         dims.h,
      borderRadius:   dims.r,
      background:     'linear-gradient(160deg, #ffffff 0%, #e8edf4 100%)',
      border:         '1.5px solid rgba(0,0,0,0.30)',
      boxShadow:      '0 3px 8px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.9)',
      display:        'flex',
      flexDirection:  'column',
      alignItems:     'center',
      justifyContent: 'center',
      color:          color,
      fontSize:       dims.fs,
      fontWeight:     900,
      lineHeight:     1.1,
      letterSpacing:  '-0.02em',
      userSelect:     'none',
      flexShrink:     0,
    }}>
      <span>{rank}</span>
      <span style={{ fontSize: dims.fs - 1 }}>{sym}</span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

/** Per-seat overlay info: stack size and/or a bet amount chip */
export interface SeatInfo {
  /** e.g. "93bb" — shown inside the seat circle below the position label */
  stack?: string;
  /** e.g. "3bb"  — shown as a small bet-chip on the felt, toward center */
  bet?: string;
}

export interface PokerTableProps {
  heroPosition: Position;
  onPositionChange?: (pos: Position) => void;
  interactive?: boolean;
  className?: string;
  compact?: boolean;
  /** Only these positions are shown as active — others are dimmed (folded) */
  activePlayers?: Position[];
  /** Text displayed in the pot area in the center of the table */
  potDisplay?: string;
  /** Hero's 2 hole cards shown at the bottom of the table */
  heroCards?: string[];
  /** Community cards (flop/turn/river) shown in the center of the felt */
  boardCards?: string[];
  /** Per-position stack / bet overlay rendered directly on the felt */
  seatInfos?: Partial<Record<Position, SeatInfo>>;
  /** Override the size of the board cards (defaults to 'md' on full table, 'sm' on compact) */
  boardCardSize?: 'sm' | 'md' | 'lg';
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PokerTable({
  heroPosition, onPositionChange, interactive = true, className = '', compact = false,
  activePlayers, potDisplay, heroCards, boardCards, seatInfos, boardCardSize,
}: PokerTableProps) {
  // Effective board-card size: explicit prop > compact default > full default
  const bCardSize = boardCardSize ?? (compact ? 'sm' : 'md');
  const isEn = useLangStore(s => s.lang) === 'en';

  const seatPositions = useMemo<Position[]>(() => {
    const heroIdx = CLOCKWISE.indexOf(heroPosition);
    return SEAT_LAYOUT.map((_, i) => CLOCKWISE[(heroIdx + i) % 6]);
  }, [heroPosition]);

  const btnSeat = seatPositions.indexOf('BTN');
  const sbSeat  = seatPositions.indexOf('SB');
  const bbSeat  = seatPositions.indexOf('BB');

  const handleClick = (seatIdx: number) => {
    if (!interactive || !onPositionChange || seatIdx === 0) return;
    onPositionChange(seatPositions[seatIdx]);
  };

  const seatSize = compact ? 34 : 52;

  const hasHeroCards = !!heroCards?.length;
  const heroPos      = seatPositions[0];
  const hasHeroStack = hasHeroCards && !!seatInfos?.[heroPos]?.stack;

  // On compact (mobile) mode, hero cards are NOT rendered inside the table —
  // the parent trainer is responsible for displaying them separately below.
  // On desktop (non-compact) mode, they appear in flow with a negative
  // margin-top to visually overlap the hero seat at the table edge.
  const heroCardsMarginTop = `calc(-10.12% + 26px)`;  // seatSize=52 → 26px

  return (
    <div className={`select-none w-full ${className}`}>
      {/* ── Table oval (fixed 46% aspect ratio regardless of hero cards) ── */}
      <div className="relative w-full" style={{ paddingBottom: '46%' }}>
        <div className="absolute inset-0">

        {/* ── Outer wood border ── */}
        <div
          className="absolute inset-0 rounded-[50%]"
          style={{
            background: 'radial-gradient(ellipse at 50% 35%, #7a4520 0%, #3d1f0a 55%, #1e0e04 100%)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.9), inset 0 2px 6px rgba(255,220,120,0.15)',
          }}
        />
        {/* Wood inner highlight ring */}
        <div
          className="absolute rounded-[50%]"
          style={{ inset: '1.5%', border: '1px solid rgba(255,180,60,0.12)', borderRadius: '50%' }}
        />

        {/* ── Felt surface ── */}
        <div
          className="absolute rounded-[50%] overflow-hidden"
          style={{
            inset: '6%',
            background: 'radial-gradient(ellipse at 50% 35%, var(--table-center, #22733f) 0%, var(--table-mid, #155530) 45%, var(--table-edge, #0a3520) 100%)',
            boxShadow: 'inset 0 6px 30px rgba(0,0,0,0.6), inset 0 -2px 10px rgba(0,0,0,0.3)',
          }}
        >
          {/* Inner stitching lines */}
          <div className="absolute rounded-[50%]" style={{ inset: '6%',  border: '1px solid rgba(255,255,255,0.08)' }} />
          <div className="absolute rounded-[50%]" style={{ inset: '8%',  border: '1px solid rgba(255,255,255,0.04)' }} />

          {/* ── Center: pot badge + board cards ── */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-1.5">

            {/* Pot badge */}
            {potDisplay && (
              <div style={{
                background:    'rgba(0,0,0,0.65)',
                border:        '1px solid rgba(212,175,55,0.55)',
                borderRadius:  7,
                padding:       compact ? '2px 7px' : '3px 10px',
                fontSize:      compact ? 9 : 12,
                fontWeight:    800,
                color:         '#d4af37',
                letterSpacing: '0.02em',
                boxShadow:     '0 2px 8px rgba(0,0,0,0.5)',
              }}>
                🪙 {potDisplay}
              </div>
            )}

            {/* Board cards (flop / turn / river) */}
            {boardCards && boardCards.length > 0 && (
              <div style={{ display: 'flex', gap: bCardSize === 'lg' ? 6 : compact ? 3 : 4, alignItems: 'center' }}>
                {boardCards.map((c, i) => (
                  <MiniCard key={i} card={c} size={bCardSize} />
                ))}
              </div>
            )}

            {/* Fallback logo when nothing to show */}
            {!potDisplay && (!boardCards || boardCards.length === 0) && (
              <div className="text-center opacity-10">
                <div className="text-white font-serif font-black" style={{ fontSize: compact ? 14 : 20 }}>🃏</div>
                {!compact && (
                  <div className="text-white font-serif tracking-[0.3em]" style={{ fontSize: 8 }}>POKER TRAINER</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Seats ── */}
        {SEAT_LAYOUT.map((seat, idx) => {
          const pos = seatPositions[idx];
          const isHero = idx === 0;
          const isClickable = interactive && !isHero && !!onPositionChange;
          const color = POSITION_COLORS[pos] || '#888';
          const isActive = !activePlayers || activePlayers.includes(pos);

          return (
            <SeatNode
              key={idx}
              seat={seat}
              position={pos}
              color={color}
              isHero={isHero}
              isClickable={isClickable && isActive}
              isActive={isActive}
              compact={compact}
              seatSize={seatSize}
              heroLabel={isEn ? 'YOU' : 'VOUS'}
              onClick={() => handleClick(idx)}
              info={seatInfos?.[pos]}
            />
          );
        })}

        {/* ── Dealer button ── */}
        <AnimatePresence mode="wait">
          <TokenChip
            key={`D-${btnSeat}`}
            x={SEAT_LAYOUT[btnSeat].cx}
            y={SEAT_LAYOUT[btnSeat].cy}
            label="D"
            bg="#dde4ee"
            fg="#1a202c"
            compact={compact}
            size={compact ? 13 : 19}
          />
        </AnimatePresence>

        {/* ── SB chip ── */}
        <AnimatePresence mode="wait">
          <TokenChip
            key={`SB-${sbSeat}`}
            x={SEAT_LAYOUT[sbSeat].cx}
            y={SEAT_LAYOUT[sbSeat].cy}
            label="SB"
            bg="#2563eb"
            fg="#fff"
            compact={compact}
            size={compact ? 12 : 17}
          />
        </AnimatePresence>

        {/* ── BB chip ── */}
        <AnimatePresence mode="wait">
          <TokenChip
            key={`BB-${bbSeat}`}
            x={SEAT_LAYOUT[bbSeat].cx}
            y={SEAT_LAYOUT[bbSeat].cy}
            label="BB"
            bg="#dc2626"
            fg="#fff"
            compact={compact}
            size={compact ? 12 : 17}
          />
        </AnimatePresence>

        {/* ── Direction arrow (subtle, full size only) ── */}
        {!compact && (
          <div
            className="absolute pointer-events-none opacity-10"
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            <svg width="60" height="60" viewBox="0 0 60 60">
              <path d="M 30 8 A 22 22 0 1 0 8 30" fill="none" stroke="white" strokeWidth="1.5" strokeDasharray="4 3" />
              <polygon points="8,22 3,33 14,31" fill="white" />
            </svg>
          </div>
        )}
        </div>{/* end absolute inset-0 */}
      </div>{/* end table oval (paddingBottom 46%) */}

      {/* ── Hero hole cards + stack — hidden on mobile via CSS, shown on sm+ ──
          Using Tailwind `hidden sm:flex` so this works regardless of JS state. */}
      {hasHeroCards && (
        <div
          className="hidden sm:flex flex-col items-center"
          style={{
            marginTop:  heroCardsMarginTop,
            position:   'relative',
            zIndex:     25,
            gap:        6,
          }}
        >
          {/* Cards row */}
          <div style={{ display: 'flex', gap: bCardSize === 'lg' ? 8 : 5 }}>
            {heroCards!.map((c, i) => (
              <MiniCard key={i} card={c} size={bCardSize} />
            ))}
          </div>

          {/* Hero stack badge */}
          {hasHeroStack && (
            <div
              style={{
                fontSize:      compact ? 9 : 12,
                fontWeight:    800,
                color:         '#d4af37',
                letterSpacing: '-0.02em',
                background:    'rgba(8, 14, 26, 0.85)',
                border:        '1px solid rgba(212,175,55,0.45)',
                borderRadius:  compact ? 4 : 6,
                padding:       compact ? '1px 6px' : '3px 10px',
                boxShadow:     '0 2px 8px rgba(0,0,0,0.75), 0 0 0 1px rgba(212,175,55,0.1)',
                whiteSpace:    'nowrap',
                pointerEvents: 'none',
              }}
            >
              {seatInfos![heroPos]!.stack}
            </div>
          )}
        </div>
      )}
    </div>{/* end outer wrapper */}
  );
}

// ─── Seat node ───────────────────────────────────────────────────────────────

interface SeatNodeProps {
  seat: typeof SEAT_LAYOUT[number];
  position: Position;
  color: string;
  isHero: boolean;
  isClickable: boolean;
  isActive: boolean;
  compact: boolean;
  seatSize: number;
  heroLabel: string;
  onClick: () => void;
  info?: SeatInfo;
}

function SeatNode({ seat, position, color, isHero, isClickable, isActive, compact, seatSize, heroLabel, onClick, info }: SeatNodeProps) {
  const posFontSize = compact ? 9 : 12;

  // Bet chips: midpoint between seat and chip-token position (chips pushed toward pot)
  const betX = (seat.sx + seat.cx) / 2;
  const betY = (seat.sy + seat.cy) / 2;

  // When the bet chip is vertically aligned with the stack badge (same x-axis),
  // the stack badge must be pushed below the bet chip to avoid overlap.
  // This happens when seat center and token position share the same x (e.g. top seat, sx=cx=50).
  const betAtSameX = Math.abs(betX - seat.sx) < 3;
  const stackBadgeTop = info?.bet && betAtSameX
    ? `calc(${betY}% + ${compact ? 14 : 22}px)`   // clear the bet chip stack + label
    : `calc(${seat.sy}% + ${seatSize / 2 + 5}px)`; // default: right below the seat circle

  return (
    <>
      <motion.button
        className="absolute rounded-full flex items-center justify-center focus:outline-none"
        style={{
          left:       `${seat.sx}%`,
          top:        `${seat.sy}%`,
          width:      seatSize,
          height:     seatSize,
          transform:  'translate(-50%, -50%)',
          background: !isActive
            ? 'radial-gradient(circle at 38% 32%, #181e28, #0d1117)'
            : isHero
              ? 'radial-gradient(circle at 38% 32%, #2e3a50, #161e2e)'
              : 'radial-gradient(circle at 38% 32%, #232d3d, #111827)',
          border: `2.5px solid ${!isActive ? '#1a2030' : isHero ? '#d4af37' : `${color}90`}`,
          boxShadow: !isActive
            ? 'none'
            : isHero
              ? `0 0 0 3px rgba(212,175,55,0.25), 0 4px 14px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)`
              : `0 0 8px ${color}30, 0 3px 10px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)`,
          opacity: isActive ? 1 : 0.22,
          zIndex:  10,
          cursor:  isClickable ? 'pointer' : 'default',
          filter:  isActive ? 'none' : 'grayscale(0.7)',
        }}
        whileHover={isClickable && isActive ? { borderColor: color, boxShadow: `0 0 16px ${color}66, 0 4px 14px rgba(0,0,0,0.5)` } : {}}
        onClick={onClick}
        tabIndex={isClickable ? 0 : -1}
      >
        <div className="flex flex-col items-center leading-none" style={{ gap: 1 }}>
          <span style={{ fontSize: posFontSize, fontWeight: 900, color: isHero ? '#d4af37' : '#e2e8f0', letterSpacing: '-0.02em' }}>
            {position}
          </span>
          {isHero && !compact && (
            <span style={{ fontSize: 7, color: '#d4af37aa', letterSpacing: '0.08em', fontWeight: 700 }}>
              {heroLabel}
            </span>
          )}
        </div>
        {isClickable && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            initial={{ opacity: 0 }}
            whileHover={{ opacity: 1 }}
            style={{ background: `radial-gradient(circle, ${color}30 0%, transparent 70%)` }}
          />
        )}
      </motion.button>

      {/* ── Stack badge — below the seat or below the bet chip when aligned on same x-axis ── */}
      {isActive && !isHero && info?.stack && (
        <div
          style={{
            position:      'absolute',
            left:          `${seat.sx}%`,
            top:           stackBadgeTop,
            transform:     'translateX(-50%)',
            fontSize:      compact ? 8 : 11,
            fontWeight:    800,
            color:         '#e2e8f0',
            letterSpacing: '-0.02em',
            background:    'rgba(8, 14, 26, 0.82)',
            border:        `1px solid ${color}55`,
            borderRadius:  compact ? 4 : 5,
            padding:       compact ? '1px 5px' : '2px 8px',
            boxShadow:     '0 2px 6px rgba(0,0,0,0.7)',
            zIndex:        15,
            whiteSpace:    'nowrap',
            pointerEvents: 'none',
          }}
        >
          {info.stack}
        </div>
      )}

      {/* ── Bet chips — visual chip stack on the felt, toward pot ── */}
      {info?.bet && isActive && (
        <div
          style={{
            position:      'absolute',
            left:          `${betX}%`,
            top:           `${betY}%`,
            transform:     'translate(-50%, -50%)',
            zIndex:        22,
            pointerEvents: 'none',
          }}
        >
          <BetChipStack amount={info.bet} compact={compact} />
        </div>
      )}
    </>
  );
}

// ─── Bet chip stack (visual poker chips + amount) ────────────────────────────

/** Renders N poker chips stacked (top view, slight perspective) + amount label */
function BetChipStack({ amount, compact }: { amount: string; compact: boolean }) {
  const chipW   = compact ? 13 : 17;
  const chipH   = compact ? 5  : 7;   // flat ellipse = "top-down with slight tilt"
  const vGap    = compact ? 3  : 4;   // vertical offset between chips
  const count   = compact ? 2  : 3;
  const totalH  = chipH + vGap * (count - 1);

  // Classic poker chip colours: blue → red → gold (bottom to top)
  const CHIPS = [
    { bg: '#1e40af', hi: '#60a5fa', lo: '#1e3a8a' },
    { bg: '#991b1b', hi: '#f87171', lo: '#7f1d1d' },
    { bg: '#92400e', hi: '#fbbf24', lo: '#78350f' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? 2 : 3 }}>
      {/* Stacked chips — drawn bottom-first so upper chips sit on top */}
      <div style={{ position: 'relative', width: chipW, height: totalH }}>
        {Array.from({ length: count }).map((_, i) => {
          const c = CHIPS[i % CHIPS.length];
          return (
            <div
              key={i}
              style={{
                position:     'absolute',
                left:         0,
                // Each chip is `vGap` px above the previous (i=0 = bottom)
                bottom:       i * vGap,
                width:        chipW,
                height:       chipH,
                borderRadius: '50%',
                background:   `radial-gradient(ellipse at 40% 35%, ${c.hi}cc 0%, ${c.bg} 55%, ${c.lo} 100%)`,
                border:       `1px solid ${c.hi}66`,
                boxShadow:    `0 2px 4px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.18)`,
              }}
            />
          );
        })}
      </div>
      {/* Amount */}
      <span style={{
        fontSize:      compact ? 7 : 9,
        fontWeight:    900,
        color:         '#fef3c7',
        letterSpacing: '-0.01em',
        textShadow:    '0 1px 3px rgba(0,0,0,0.95)',
        lineHeight:    1,
      }}>
        {amount}
      </span>
    </div>
  );
}

// ─── Token chip (D / SB / BB) ────────────────────────────────────────────────

function TokenChip({ x, y, label, bg, fg, compact, size }: {
  x: number; y: number; label: string; bg: string; fg: string; compact: boolean; size: number;
}) {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 500, damping: 28 }}
      style={{
        position:  'absolute',
        left:      `${x}%`,
        top:       `${y}%`,
        width:     size,
        height:    size,
        transform: 'translate(-50%, -50%)',
        background: `radial-gradient(circle at 35% 30%, ${bg}ee, ${bg}bb)`,
        color:      fg,
        fontSize:   Math.max(5, size * 0.42),
        fontWeight: 900,
        borderRadius: '50%',
        display:  'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 2px 8px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.35), 0 0 0 1.5px rgba(255,255,255,0.2)`,
        zIndex:   20,
        letterSpacing: '-0.03em',
      }}
    >
      {label}
    </motion.div>
  );
}
