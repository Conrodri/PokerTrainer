// Derives a SQLite Prisma schema for LOCAL development from the committed
// schema.prisma (which is PostgreSQL, for production on Render/Neon).
//
// This keeps schema.prisma as the single source of truth — we never hand-edit
// the provider line — and the derived prisma/dev.prisma is git-ignored, so the
// production provider can never be committed by accident.
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const out = path.join(__dirname, '..', 'prisma', 'dev.prisma');

let schema = fs.readFileSync(src, 'utf8');

if (!/provider\s*=\s*"postgresql"/.test(schema)) {
  console.warn('[gen-dev-schema] No postgresql provider found — copying schema as-is.');
}
schema = schema.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');

const banner = '// AUTO-GENERATED for local dev (SQLite) from schema.prisma — do NOT edit or commit.\n';
fs.writeFileSync(out, banner + schema);
console.log('[gen-dev-schema] Wrote prisma/dev.prisma (provider = sqlite)');
