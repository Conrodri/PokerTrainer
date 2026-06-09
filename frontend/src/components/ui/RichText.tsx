/**
 * RichText
 * ────────
 * Renders a plain string with:
 *  - `\n`          → line break (new paragraph)
 *  - `**bold**`    → bold span
 *  - Poker terms   → golden highlight + tooltip (auto-detected from the glossary)
 *
 * Usage: <RichText text="Your equity is 35%. Call or fold?" />
 */

import { PokerTerm } from './PokerTerm';

// ─── Term match table ──────────────────────────────────────────────────────────
// Ordered longest → shortest so multi-word / hyphenated phrases match before
// their sub-words (e.g. "pot odds" before "pot", "all-in" before "all").

type MatchEntry = { pattern: string; id: string; caseSensitive?: boolean };

const MATCHES: MatchEntry[] = [
  // ── Multi-word / hyphenated ─────────────────────────────────────────────────
  { pattern: 'continuation bet',  id: 'cbet'     },
  { pattern: 'out of position',   id: 'oop'      },
  { pattern: 'made hands',        id: 'madehand' },
  { pattern: 'made hand',         id: 'madehand' },
  { pattern: 'value bet',         id: 'valuebet' },
  { pattern: 'the nuts',          id: 'nuts'     },
  { pattern: 'pot odds',          id: 'potodds'  },
  { pattern: 'in position',       id: 'ip'       },
  { pattern: 'all-in',            id: 'allin'    },
  { pattern: 'all in',            id: 'allin'    },
  { pattern: 'pre-flop',          id: 'preflop'  },
  { pattern: 'pré-flop',          id: 'preflop'  },
  { pattern: 'c-bet',             id: 'cbet'     },
  { pattern: '3-bet',             id: '3bet'     },
  // ── Board textures (multi-word first) ──────────────────────────────────────
  { pattern: 'board sec',         id: 'dry'      },
  { pattern: 'board mouillé',     id: 'wet'      },
  { pattern: 'board statique',    id: 'static'   },
  { pattern: 'board dynamique',   id: 'dynamic'  },
  { pattern: 'board connecté',    id: 'connected'},
  { pattern: 'board bicolore',    id: 'twotone'  },
  { pattern: 'board monotone',    id: 'monotone' },
  { pattern: 'dry board',         id: 'dry'      },
  { pattern: 'wet board',         id: 'wet'      },
  { pattern: 'static board',      id: 'static'   },
  { pattern: 'dynamic board',     id: 'dynamic'  },
  { pattern: 'connected board',   id: 'connected'},
  { pattern: 'two-tone board',    id: 'twotone'  },
  { pattern: 'two tone board',    id: 'twotone'  },
  { pattern: 'monotone board',    id: 'monotone' },
  { pattern: 'rainbow board',     id: 'rainbow'  },
  { pattern: 'arc-en-ciel',       id: 'rainbow'  },
  // ── Single words ────────────────────────────────────────────────────────────
  { pattern: 'showdown',          id: 'showdown' },
  { pattern: 'monotone',          id: 'monotone' },
  { pattern: 'rainbow',           id: 'rainbow'  },
  { pattern: 'connecté',          id: 'connected'},
  { pattern: 'bicolore',          id: 'twotone'  },
  { pattern: 'statique',          id: 'static'   },
  { pattern: 'dynamique',         id: 'dynamic'  },
  { pattern: 'préflop',           id: 'preflop'  },
  { pattern: 'preflop',           id: 'preflop'  },
  { pattern: 'bluffing',          id: 'bluff'    },
  { pattern: 'bluffé',            id: 'bluff'    },
  { pattern: 'bluffs',            id: 'bluff'    },
  { pattern: 'bluff',             id: 'bluff'    },
  { pattern: 'raising',           id: 'raise'    },
  { pattern: 'relance',           id: 'raise'    },
  { pattern: 'raises',            id: 'raise'    },
  { pattern: 'raised',            id: 'raise'    },
  { pattern: 'raise',             id: 'raise'    },
  { pattern: 'calling',           id: 'call'     },
  { pattern: 'called',            id: 'call'     },
  { pattern: 'calls',             id: 'call'     },
  { pattern: 'call',              id: 'call'     },
  { pattern: 'folding',           id: 'fold'     },
  { pattern: 'folded',            id: 'fold'     },
  { pattern: 'folds',             id: 'fold'     },
  { pattern: 'fold',              id: 'fold'     },
  { pattern: 'checking',          id: 'check'    },
  { pattern: 'checked',           id: 'check'    },
  { pattern: 'checks',            id: 'check'    },
  { pattern: 'check',             id: 'check'    },
  { pattern: 'drawing',           id: 'draw'     },
  { pattern: 'draws',             id: 'draw'     },
  { pattern: 'draw',              id: 'draw'     },
  { pattern: 'equity',            id: 'equity'   },
  { pattern: 'équité',            id: 'equity'   },
  { pattern: 'equité',            id: 'equity'   },
  { pattern: 'ranges',            id: 'range'    },
  { pattern: 'range',             id: 'range'    },
  { pattern: 'stacks',            id: 'stack'    },
  { pattern: 'stack',             id: 'stack'    },
  { pattern: 'trips',             id: 'trips'    },
  { pattern: 'river',             id: 'river'    },
  { pattern: 'flop',              id: 'flop'     },
  { pattern: 'turn',              id: 'turn'     },
  { pattern: 'outs',              id: 'outs'     },
  { pattern: 'nuts',              id: 'nuts'     },
  // ── Abbreviations — exact case match required ────────────────────────────────
  { pattern: 'BTN', id: 'btn', caseSensitive: true },
  { pattern: 'OOP', id: 'oop', caseSensitive: true },
  { pattern: 'UTG', id: 'utg', caseSensitive: true },
  { pattern: 'GTO', id: 'gto', caseSensitive: true },
  { pattern: 'SPR', id: 'spr', caseSensitive: true },
  { pattern: 'SB',  id: 'sb',  caseSensitive: true },
  { pattern: 'BB',  id: 'bb',  caseSensitive: true },
  { pattern: 'HJ',  id: 'hj',  caseSensitive: true },
  { pattern: 'CO',  id: 'co',  caseSensitive: true },
  { pattern: 'IP',  id: 'ip',  caseSensitive: true },
  { pattern: 'EV',  id: 'ev',  caseSensitive: true },
];

// ─── Regex & tokenizer ─────────────────────────────────────────────────────────

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Single combined regex — case-insensitive; we enforce case for abbreviations manually.
const TERM_RE = new RegExp(`(${MATCHES.map(m => escRe(m.pattern)).join('|')})`, 'gi');

/** Characters considered part of a "word" for boundary detection (includes accented). */
const WORD_CHAR = /[a-zA-ZÀ-ÿ0-9]/;

type Chunk = { text: string; termId?: string };

/**
 * Splits a plain-text segment into chunks, tagging poker-term matches with
 * their glossary id. Respects Unicode word boundaries.
 */
function tokenize(text: string): Chunk[] {
  const chunks: Chunk[] = [];
  let lastIndex = 0;
  TERM_RE.lastIndex = 0; // always reset before use (global regex is stateful)

  let m: RegExpExecArray | null;
  while ((m = TERM_RE.exec(text)) !== null) {
    const raw   = m[0];
    const start = m.index;
    const end   = start + raw.length;

    // Manual word-boundary check (handles accented/hyphenated chars correctly).
    const before = start > 0           ? text[start - 1] : null;
    const after  = end < text.length   ? text[end]       : null;
    if ((before && WORD_CHAR.test(before)) || (after && WORD_CHAR.test(after))) continue;

    // Resolve to a MATCHES entry — honour caseSensitive flag.
    const entry = MATCHES.find(e =>
      e.caseSensitive
        ? e.pattern === raw
        : e.pattern.toLowerCase() === raw.toLowerCase()
    );
    if (!entry) continue;

    // Flush plain text before this match.
    if (start > lastIndex) chunks.push({ text: text.slice(lastIndex, start) });
    chunks.push({ text: raw, termId: entry.id });
    lastIndex = end;
  }

  if (lastIndex < text.length) chunks.push({ text: text.slice(lastIndex) });
  return chunks;
}

// ─── RichLine — inline variant ────────────────────────────────────────────────

/**
 * Inline variant of RichText.
 * Renders poker terms as <PokerTerm> spans inside a React fragment
 * (no wrapping <div> or <p>). Use this inside existing <p> / <li> / <span>
 * elements where you can't introduce block-level wrappers.
 *
 * Usage: <p className="text-sm text-gray-400"><RichLine text="..." /></p>
 */
export function RichLine({ text }: { text: string }) {
  return (
    <>
      {tokenize(text).map((chunk, i) =>
        chunk.termId
          ? <PokerTerm key={i} id={chunk.termId}>{chunk.text}</PokerTerm>
          : chunk.text
      )}
    </>
  );
}

// ─── RichText — block variant ──────────────────────────────────────────────────

interface RichTextProps {
  text: string;
  /** Extra class applied to every paragraph element. */
  className?: string;
}

export function RichText({ text, className }: RichTextProps) {
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.trim() === '') return <div key={i} className="h-1" />;

        // Split on **bold** markers, then tokenize plain segments for poker terms.
        const boldParts = line.split(/(\*\*[^*]+\*\*)/g);

        return (
          <p key={i} className={`text-sm text-gray-300 leading-relaxed ${className ?? ''}`}>
            {boldParts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                // Bold span — still tokenize for poker terms inside.
                const inner = part.slice(2, -2);
                return (
                  <strong key={j} className="text-white font-semibold">
                    {tokenize(inner).map((chunk, k) =>
                      chunk.termId
                        ? <PokerTerm key={k} id={chunk.termId}>{chunk.text}</PokerTerm>
                        : chunk.text
                    )}
                  </strong>
                );
              }
              // Plain text — tokenize for poker terms.
              return tokenize(part).map((chunk, k) =>
                chunk.termId
                  ? <PokerTerm key={`${j}-${k}`} id={chunk.termId}>{chunk.text}</PokerTerm>
                  : chunk.text
              );
            })}
          </p>
        );
      })}
    </div>
  );
}
