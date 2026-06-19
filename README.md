# 🃏 PokerPeak

> Application d'entraînement au poker Texas Hold'em — interactive, pédagogique, et calibrée GTO. Des ranges pré-flop à la lecture de board, avec suivi de progression, classement et trois niveaux de difficulté.

Joue en ligne : **[poker-trainer-beta-puce.vercel.app](https://poker-trainer-beta-puce.vercel.app)**

---

## ✨ Aperçu

PokerPeak transforme l'apprentissage du poker en exercices courts et corrigés instantanément. Chaque module isole une compétence (ranges, cotes, équité, jeu post-flop…) et s'adapte à ton niveau via trois modes :

| Mode | Icône | Pour qui | Comportement |
|------|:----:|----------|--------------|
| **Débutant** | 🎓 | On découvre | Indices visibles, explications pas à pas, compte rendu détaillé |
| **Avancé** | ⚡ | On progresse | Indices cachés derrière un bouton « Révéler » qui remet la série à 0 |
| **Expert** | 🔥 | On maîtrise | Aucun indice, exercices poussés sur tes propres ranges *(offre premium)* |

---

## 🎮 Modules d'entraînement

### Gratuits
- **🎯 Pré-flop** — Fold ou Raise selon la position ? Correction à la fréquence GTO exacte, range complète en matrice 13×13, gestion des stratégies mixtes.
- **🎲 Outs** — Compte les cartes qui améliorent ta main, tirages identifiés, règle de 2 & 4.
- **⚖️ Équité** — Quelle main domine ? Pourcentages réels par simulation Monte Carlo.
- **📐 Pot Odds** — Call ou Fold ? Calcul de l'équité requise et de l'EV, raisonnement détaillé.
- **🛡️ Défense BB** — Défendre ou se coucher face à une ouverture du bouton.

### Premium 👑
- **🃏 Post-flop** — Texture de board, tirages, continuation bet.
- **🎰 Main complète** — Une main entière du pré-flop à la river contre un villain IA ; chaque décision compte.
- **📏 Bet Sizing** — Choisir la bonne taille de mise (valeur, protection, bluff).
- **🎭 Bluff** *(à venir)* — Fréquences et sélection de mains non-exploitables.

### Éditeur de ranges « Mes ranges »
- Ranges simples personnalisées (169 mains), profils sauvegardables, import/export JSON.
- Ranges **Expert** : mix de fréquences multi-actions par main (Fold / Call / Raise / All-in).

---

## 🧱 Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS |
| State | Zustand |
| Animations | Framer Motion |
| Charts | Recharts |
| Backend | Node.js · Express · TypeScript |
| ORM | Prisma (SQLite en dev, PostgreSQL en prod) |
| Auth | JWT (bcrypt) + Google OAuth 2.0 |
| Déploiement | Vercel (front) · Render (API) · Neon (Postgres) |

---

## 🚀 Installation & démarrage

**Prérequis :** [Node.js 18+](https://nodejs.org) (LTS).

```powershell
# Windows — scripts fournis
.\setup.ps1   # une seule fois (install + génération du schéma dev)
.\start.ps1   # lance backend + frontend
```

Ou manuellement, dans deux terminaux :

```bash
# Terminal 1 — Backend (port 3001)
cd backend
npm install
npm run dev          # génère le schéma SQLite dev puis démarre

# Terminal 2 — Frontend (port 5173)
cd frontend
npm install
npm run dev
```

Ouvrir **http://localhost:5173**

> En dev, le backend tourne sur **SQLite** : `schema.prisma` reste en `postgresql` (prod), et `backend/scripts/gen-dev-schema.js` en dérive automatiquement un schéma SQLite (`prisma/dev.prisma`, git-ignoré). `npm run dev` s'en occupe seul — ne pas lancer `prisma db push` brut en local (mismatch de provider).

---

## 🗂️ Architecture

```
PokerTrainerApp/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          ← Modèles DB (User, PlayerStats, ranges, quotas…)
│   └── src/
│       ├── config/                ← Client Prisma
│       ├── controllers/           ← Handlers HTTP (auth, google, training, stats, postflop, ranges…)
│       ├── middleware/            ← JWT auth, tiers premium/expert, quota, rate limiting
│       ├── routes/                ← /api/auth · /training · /stats · /ranges · /postflop · /profiles · /quota · /expert-ranges · /exam
│       ├── services/
│       │   ├── poker/             ← Moteur poker (cartes, évaluateur, ranges, équité, pot odds)
│       │   ├── trainingService.ts ← Génération d'exercices
│       │   └── quota.ts           ← Quota gratuit journalier
│       ├── types/                 ← Types partagés
│       └── server.ts              ← Point d'entrée Express
│
└── frontend/
    └── src/
        ├── components/
        │   ├── layout/            ← Navbar, Layout
        │   ├── poker/             ← Card, Hand, RangeMatrix, éditeurs de ranges, table
        │   ├── training/          ← Un composant par module d'entraînement
        │   ├── tutorial/          ← Tutoriels & onboarding
        │   └── ui/                ← Button, ModeToggle, TrainerIntro, SpoilableHint…
        ├── pages/                 ← Home, Training, Stats, Leaderboard, Premium, Profile…
        ├── services/              ← Client API (axios)
        ├── store/                 ← Zustand (auth, training, mode, quota, langue)
        ├── i18n/                  ← Traductions FR / EN
        ├── types/                 ← Types TypeScript
        └── utils/                 ← Notations, couleurs, XP, indices de coaching
```

---

## 🔌 API (principaux endpoints)

```
# Auth
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me                 (auth)
GET  /api/auth/google             → redirection OAuth
GET  /api/auth/google/callback

# Entraînement
GET  /api/training/preflop/exercise?position=BTN
POST /api/training/preflop/check
GET  /api/training/preflop/range/:position
GET  /api/training/potodds/exercise
POST /api/training/potodds/check
GET  /api/training/equity/exercise
GET  /api/postflop/exercise       (quota / premium)

# Ranges
GET/POST   /api/ranges            (ranges simples)
GET/POST   /api/profiles          (profils de ranges)
GET/POST   /api/expert-ranges     (mix multi-actions — premium expert)

# Stats & progression
GET  /api/stats/leaderboard
GET  /api/stats/me                (auth)
GET  /api/stats/history           (auth)
GET  /api/quota                   (auth)

GET  /api/health
```

---

## 💳 Niveaux d'accès

- **Invité / gratuit** — modules gratuits illimités ; modules premium accessibles avec un quota de **5 exercices/jour par module** (compte connecté), réinitialisé à minuit (Europe/Paris).
- **Premium** 👑 — accès illimité à tous les modules + éditeur de ranges + badge sur le classement.
- **Premium Expert** 🔥 — tout Premium, plus le mode Expert et l'éditeur de ranges multi-actions.

> Les tiers sont accordés manuellement en base de données (pas encore de facturation en ligne).

---

## 🌍 Déploiement

| Service | Plateforme |
|---------|------------|
| Frontend | **Vercel** — build Vite, fallback SPA via `frontend/vercel.json` |
| API | **Render** — `render.yaml`, `prisma db push` au build |
| Base de données | **Neon** (PostgreSQL) |

La connexion Google OAuth redirige vers `${FRONTEND_URL}/auth/callback` : `FRONTEND_URL` (sur Render) doit pointer vers l'URL Vercel de production.

---

## 🗺️ Roadmap

- [ ] Contenu Expert dédié sur les modules post-flop / bet sizing / bluff
- [ ] Hand reading (réduire la range adverse depuis les actions)
- [ ] Problème du jour (type puzzles Chess.com)
- [ ] Facturation en ligne des offres Premium
- [ ] Export PDF des statistiques

---

<p align="center"><sub>Fait avec ♠️ ♥️ ♦️ ♣️ — PokerPeak</sub></p>
