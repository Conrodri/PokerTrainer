# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🎯 PokerPeak — Application d'entraînement au poker

**PokerPeak** est une plateforme SaaS d'entraînement au Texas Hold'em avec modules calibrés GTO, progression personnalisée, et trois tiers d'accès (gratuit, premium, expert).

**Frontend :** React 18 + TypeScript + Vite + Tailwind CSS  
**Backend :** Node.js + Express + Prisma ORM (PostgreSQL prod, SQLite dev)  
**Auth :** JWT + Google OAuth 2.0  
**Déploiement :** Vercel (front) + Render (API) + Neon (Postgres)

---

## 🚀 Commandes courantes

### Démarrage (Windows PowerShell)
```powershell
# Setup initial (une seule fois)
.\setup.ps1

# Lancer l'application (frontend + backend)
.\start.ps1
```

### Manuellement (deux terminaux)
```bash
# Terminal 1 — Backend (port 3001, auto-génère schéma SQLite dev)
cd backend
npm install
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm install
npm run dev
```

### Backend (dans `backend/`)
```bash
npm run dev                  # Dev avec ts-node-dev (SQLite)
npm run build               # Compilation TypeScript
npm start                   # Lancer depuis dist/server.js
npm run db:push:dev        # Push Prisma sur SQLite dev
npm run db:studio          # Ouvrir Prisma Studio (DB visuelle)
npm run db:seed            # Seeder les données initiales
npm run gen:preflop-equity # Régénérer les tables d'équité pré-flop
```

### Frontend (dans `frontend/`)
```bash
npm run dev                # Dev server Vite (HMR activé)
npm run build              # Build Vite pour prod
npm run typecheck          # Vérifier les types sans émettre
```

---

## 🏗️ Architecture de haut niveau

### **Backend : moteur poker + API REST**

**Services poker** (`backend/src/services/poker/`)  
- `cards.ts` — Représentation des cartes et mains
- `handEvaluator.ts` — Évaluation des combinaisons (quinte, couleur, etc.)
- `equityAnalyzer.ts` — Calcul des équités (simulation ou lookup pré-flop)
- `preflopEquity.generated.ts` — Tables pré-flop précalculées (169 mains)
- `ranges.ts` — Représentation et manipulation des ranges (bits 169)
- `potOdds.ts` — Calcul des cotes et de l'EV
- `outs.ts` — Identification des outs (cartes utiles)
- `bbDefense.ts` — Ranges spécifiques (défense BB)
- `bluffService.ts` — Fréquences de bluff non-exploitables
- `preflopCanonical.ts` — Notation canonique des mains (Ax, KK, etc.)

**Contrôleurs & routes**  
- `authController.ts` + `routes/auth.ts` — Register, login, Google OAuth, reset password
- `trainingController.ts` + `routes/training.ts` — Génération d'exercices pré-flop, équité, pot odds, outs
- `postflopController.ts` + `routes/postflop.ts` — Exercices post-flop (premium)
- `statsController.ts` + `routes/stats.ts` — Classement, historique, progression utilisateur
- `rangesController.ts` + `routes/ranges.ts` — Ranges simples personnalisées (169 mains)
- `expertRangesController.ts` + `routes/expertRanges.ts` — Ranges multi-actions (expert tier)
- `profilesController.ts` + `routes/profiles.ts` — Profils de ranges sauvegardés
- `subscriptionController.ts` + `routes/subscription.ts` — Gestion des tiers premium
- `examController.ts` + `routes/exam.ts` — Mode examen (looped exercises, best score)

**Services & middleware**  
- `trainingService.ts` — Logique de génération d'exercices (paires, position, difficulté)
- `quota.ts` — Gestion des quotas gratuits (5 exos/jour par module)
- `emailService.ts` — Envoi d'emails (Resend)
- `auth.ts` (middleware) — Vérification JWT, refresh tokens, tiers premium/expert
- `secrets.ts` — Gestion des variables d'environnement

**Base de données** (`backend/prisma/schema.prisma`)  
Modèles clés :
- `User` — Utilisateurs, tiers premium/expert, email verification, password reset
- `TrainingSession` — Historique des exercices (module, réponse, correcte, temps)
- `PlayerStats` — XP, rang, achievements, sprints
- `ExamRecord` — Record (best score) par (user, module, mode)
- `ExamRun` — Historique des runs exam
- `CustomRange`, `RangeProfile`, `ExpertRange` — Ranges utilisateur
- `FreeUsage` — Quota gratuit (resets quotidien à minuit UTC+2)
- `DailyChallenge` — Challenges personnalisés pour utilisateurs premium

---

### **Frontend : composants React + state Zustand**

**Pages principales** (`frontend/src/pages/`)  
- `HomePage.tsx` — Accueil, intro modules
- `TrainingPage.tsx` — Entraînement (dispatch vers module choisi)
- `StatsPage.tsx` — Progression, historique, achievements
- `LeaderboardPage.tsx` — Classement global
- `PremiumPage.tsx` — Pitch premium, gestion abonnement
- `ProfilePage.tsx` — Profil utilisateur, paramètres
- `TablePage.tsx` — Vue full-hand simulée (premium feature)
- `LearningPathPage.tsx` — Chemins d'apprentissage guidés

**Composants d'entraînement** (`frontend/src/components/training/`)  
Un composant par module :
- `PreflopTrainer.tsx` — Fold/raise pré-flop avec range visuelle
- `EquityTrainer.tsx` — Quelle main domine ?
- `OutsTrainer.tsx` — Compte les outs, règle de 2&4
- `PotOddsTrainer.tsx` — Call/fold selon EV
- `PostflopTrainer.tsx` — Texture, continuation bet
- `BetSizingTrainer.tsx` — Sélection de sizing
- `BluffTrainer.tsx` — Fréquences de bluff
- `FullHandTrainer.tsx` — Main complète (pré à river)
- `ExamMode.tsx` — Mode examen (looped, streak mode)

**Composants poker** (`frontend/src/components/poker/`)  
- `Card.tsx`, `Hand.tsx` — Affichage des cartes
- `RangeMatrix.tsx` — Matrice 13×13 interactive (sélection de mains)
- `RangeEditor.tsx` — Éditeur simple (169 mains)
- `ExpertRangeEditor.tsx` — Éditeur multi-actions (Fold/Call/Raise/All-in %)
- `PokerTable.tsx` — Table de jeu stylisée
- `RangePresetsPanel.tsx`, `RangeProfilesPanel.tsx`, `MyRangesPanel.tsx` — Panneaux de ranges

**UI réutilisable** (`frontend/src/components/ui/`)  
- `ModeToggle.tsx` — Sélecteur Débutant / Avancé / Expert
- `SpoilableHint.tsx` — Indices révélables (réinitialise streaks en avancé)
- `VerdictBanner.tsx` — Verdict correct/incorrect avec explication
- `ExplanationPanel.tsx` — Explication détaillée (GTO ranges, équité, etc.)
- `PremiumGate.tsx`, `QuotaLockPanel.tsx` — Paywalls
- `TrainerIntro.tsx` — Intro du module (objectif, conseils)

**État global** (`frontend/src/store/`)  
Zustand stores :
- `authStore` — User connecté, token JWT, tiers premium/expert
- `trainingStore` — Module en cours, exercice, réponses, streak
- `uiStore` — Mode (Débutant/Avancé/Expert), langue, thème
- `quotaStore` — Quota gratuit reste (5/jour par module)

**Services API** (`frontend/src/services/`)  
Client Axios centralisé pour appels :
- `POST /api/auth/*` — Login, register, OAuth
- `GET /api/training/:module/exercise` — Générer un exercice
- `POST /api/training/:module/check` — Vérifier la réponse
- `GET /api/stats/*` — Récupérer stats/classement
- `GET/POST /api/ranges`, `/api/expert-ranges` — Ranges perso

**i18n** (`frontend/src/i18n/`)  
Traductions FR / EN pour tous les modules et messages.

---

## ⚙️ Points clés à comprendre

### **Schéma SQLite en dev, PostgreSQL en prod**
- `prisma/schema.prisma` est défini en `provider = "postgresql"`
- `npm run dev:schema` génère `prisma/dev.prisma` (SQLite) depuis le schéma prod
- `npm run dev` exécute ce script **automatiquement** au lancement
- **Ne jamais** lancer `prisma db push` brut en local sans le flag `--schema=prisma/dev.prisma`
- En prod (Render), `prisma db push` cible la vraie DB Postgres (Neon)

### **Quota gratuit et sessions**
- 5 exercices/jour par module par utilisateur connecté (gratuit ou trial premium)
- Le quota resets à minuit `Europe/Paris` (stocké en `FreeUsage.resetAt`)
- Les sessions enregistrent : correcte/incorrecte, temps, XP gagné, mode
- Vérification du quota dans le middleware : `checkQuota` refusal si quota épuisé

### **Équité pré-flop**
- `preflopEquity.generated.ts` contient des tables précalculées (169 mains, situations courantes)
- Régénération : `npm run gen:preflop-equity` (ts-node sur `scripts/gen-preflop-equity.ts`)
- Pour les autres boards, `equityAnalyzer.ts` utilise simulation Monte Carlo (plus lent)

### **Ranges en bitmask 13×13**
- Chaque main = bit dans un int64 (JS BigInt)
- Utile pour opérations rapides (union, intersection, etc.)
- Conversion : `ranges.ts` fournit `encodeBitmask()`, `decodeBitmask()`, `getCanonical()`

### **Tiers d'accès**
- **Gratuit** — modules gratuits illimités, quota 5/jour/module premium, pas d'expert
- **Premium** 👑 — accès illimité, éditeur ranges simple, badge classement, pas d'expert
- **Premium Expert** 🔥 — tout Premium + mode Expert + éditeur ranges multi-actions
- Accordés en DB manuellement (pas de facturation en ligne actuellement)
- Vérification : middleware `requireTier('premium')`, `requireTier('expert')`

### **Modes d'entraînement**
> **Vocation : application à but éducatif.** L'objectif premier est l'apprentissage progressif du poker. Les 3 modes structurent une montée en difficulté graduelle.
- **Débutant** 🎓 — vocation pédagogique maximale : plus d'explications, indices visibles, exercices plus faciles, compte rendu complet.
- **Avancé** ⚡ — indices cachés (bouton « Révéler », révéler = réinitialise le streak), exercices plus complexes. Contient les **sprints** d'exercices (**10 s** de délai par exo).
- **Expert** 🔥 — exercices plus difficiles que l'Avancé : soit en **ajoutant des étapes** à l'exercice, soit en rendant les **réponses proposées plus complexes**. Aucun indice, mode examen looped (3 erreurs = fin). Contient aussi les **sprints** (**5 s** de délai par exo).

### **Mode examen**
- Looped exercises, ajoute une correct, erreur remet streak à 0
- Après 3 erreurs, exam termine, score enregistré dans `ExamRun`
- `ExamRecord` stocke le record (best score atteint) par (user, module, mode)

### **Achievements et progression**
- `utils/achievements.ts` définit les achievements (badges) et les conditions
- `PlayerStats.achievements` JSON array de titre d'achievements débloqués
- XP = progression (1pt/correct en débutant, 2pts/correct en avancé, 3pts/correct en expert)

### **🔴 Principes non négociables (perf, responsive, qualité)**
- **Responsive mobile obligatoire** — l'application **doit** être parfaitement utilisable sur téléphone. Tout nouveau composant ou page est conçu *mobile-first*, testé sur petits écrans (zones tactiles, lisibilité, pas de débordement horizontal).
- **Structure adaptative** — privilégier au maximum les layouts fluides/adaptatifs (flex, grid, unités relatives, breakpoints Tailwind) plutôt que des dimensions fixes. La mise en page doit s'adapter à tous les viewports sans casser.
- **Précompute maximum** — précalculer un **maximum d'exercices** (et tables d'équité, ranges, etc.) en amont pour gagner en performances runtime. Préférer le lookup de données générées plutôt que le calcul à la volée côté serveur/client.
- **Génération via le CPU de l'utilisateur en priorité** — pour générer/précalculer ces exercices, **utiliser en priorité le CPU local de l'utilisateur** (scripts de génération exécutés sur sa machine) plutôt que la puissance de calcul de l'assistant. Proposer/écrire des scripts à lancer localement pour produire les données.
- **Optimisation continue du code** — l'optimisation est un **point central** à revoir en permanence. Chercher activement à améliorer les performances et la clarté à chaque passage.
- **Zéro doublon** — éviter la duplication de code (DRY) ; factoriser la logique partagée dans des helpers/services réutilisables.
- **Vérifier l'existant avant de développer** — avant d'ajouter du code, **toujours inspecter l'existant** : peut-on **réutiliser ou améliorer** un composant/service/util déjà présent plutôt que d'en créer un nouveau ? L'ajout de code neuf est un dernier recours.
- **Modularité** — travailler de la manière la plus modulable possible : composants/fonctions petits, découplés et réutilisables.
- **Politique « non-scroll » sur PC** — pendant les exercices, viser un affichage qui tient dans le viewport sans scroll sur ordinateur (l'exception étant les écrans de **récap**). Concevoir les layouts d'exercices pour rester contenus à l'écran.
- **Direction artistique cohérente** — garder la **même direction artistique partout** (couleurs, typographie, composants, espacements). Pas d'incohérences visuelles entre pages/modules.
- **Textes utilisateur clairs et concis** — toute string affichée à l'utilisateur doit être la plus **claire et concise** possible. Pas de jargon inutile, pas de phrases longues : aller à l'essentiel.
- **Cohérence des modules (icônes / couleurs / patterns)** — chaque module a son **icône** et sa **couleur** attitrées : les **réutiliser systématiquement** partout où le module apparaît (cartes, menus, stats, etc.). **Un nouveau module doit reprendre exactement les mêmes principes** : même convention d'icône (lib Lucide), même logique de couleur, et **mêmes patterns de code** que les modules existants (structure du trainer, props, i18n, etc.). On clone le modèle existant, on n'invente pas une nouvelle façon de faire.
- **UX optimisée** — l'expérience utilisateur doit être soignée et fluide partout ; minimiser les frictions et les étapes inutiles.
- **Workflow : dev mode exclusivement** — on travaille **exclusivement en dev mode** (SQLite local). On ne **push** qu'une fois que **tout est clean** (testé, sans erreur, sans code mort) — pas de push intermédiaire d'un état cassé.

### **🧭 Protocole : choix du mode de travail à chaque tâche**
À **chaque création de tâche**, commencer par **identifier le meilleur mode** parmi les 5 ci-dessous, **annoncer le rôle choisi**, puis **définir explicitement ce qui sera fait et ce qui ne le sera pas** (scope in / scope out) avant d'agir.

| Mode | Quand l'utiliser | Rôle / posture | Fait | Ne fait PAS |
|------|------------------|----------------|------|-------------|
| **Planning** 🗺️ | Tâche floue, multi-étapes, choix d'archi | Architecte | Découpe, séquence, identifie fichiers/risques, propose une approche | N'écrit pas de code de prod |
| **Building** 🔨 | Spéc claire, feature/refactor à implémenter | Développeur | **Vérifie d'abord l'existant** (réutiliser/améliorer plutôt qu'ajouter), écrit le code, factorise, suit les principes (responsive, DRY, modularité, perf) | N'élargit pas le scope, pas de refactor hors sujet, ne duplique pas du code déjà présent |
| **Reviewing** 🔍 | Relire un diff/PR, vérifier qualité | Relecteur | Cherche bugs, doublons, incohérences DA/UX, opportunités d'optimisation | Ne réécrit pas tout sans accord |
| **Debugging** 🐛 | Bug, comportement inattendu, erreur | Enquêteur | Reproduit, isole la cause racine, corrige au plus juste | Ne patche pas en surface, n'ajoute pas de feature |
| **Testing** ✅ | Valider qu'une feature/fix marche | Testeur | Lance l'app/tests en dev mode, vérifie le comportement réel | Ne déclare pas « fait » sans preuve d'exécution |

> Toujours **annoncer le mode + le périmètre (in/out)** en début de tâche. Un même travail peut enchaîner plusieurs modes (ex. Planning → Building → Testing).

---

## 🔗 API endpoints clés

### Auth
```
POST   /api/auth/register           { username, email, password }
POST   /api/auth/login              { email, password }
GET    /api/auth/me                 (JWT auth) → User
GET    /api/auth/google             → redirection OAuth
GET    /api/auth/google/callback    → JWT token, redir frontend
POST   /api/auth/logout
POST   /api/auth/forgot-password    { email }
POST   /api/auth/reset-password     { token, newPassword }
```

### Training
```
GET    /api/training/:module/exercise?position=BTN   (position optionnel)
POST   /api/training/:module/check   { answer, time }  → { correct, explanation, xp }
GET    /api/training/:module/range/:position        (ranges GTO pré-flop)
GET    /api/health
```

### Stats & Progression
```
GET    /api/stats/leaderboard       (top 100)
GET    /api/stats/me                (JWT auth)
GET    /api/stats/history           (JWT auth, paginated)
GET    /api/quota                   (JWT auth, reste quota)
```

### Ranges
```
GET    /api/ranges                  (JWT auth)
POST   /api/ranges                  { position, mains, }
GET    /api/profiles                (JWT auth, saved profiles)
POST   /api/profiles                { name, ranges }
GET    /api/expert-ranges           (JWT auth, premium expert)
POST   /api/expert-ranges           { position, mix }
```

### Exam
```
POST   /api/exam/start              { module, mode } → exercise
POST   /api/exam/check              { answer } → { correct, streak, score, ended }
```

---

## 🎨 Conventions et patterns

### **Nommage des positions**
- `BTN`, `CO`, `HJ`, `LJ`, `UTG` (Button, Cutoff, Hijack, Lojack, Under-the-gun)
- Utilisé dans les paramètres d'exercices pré-flop

### **Notation des mains**
- `AK` (As-Roi), `AA` (paire d'As), `T5s` (Dix-Cinq assortis), `T5o` (dépareillés)
- Canonique : `AA`, `KK`, ..., `22`, `AK`, `AQ`, etc. (169 mains uniques)

### **Traductions**
- Toutes les strings UI en `frontend/src/i18n/fr.json` et `en.json`
- Utiliser `useTranslation()` hook pour interpoler en composants

### **Erreurs**
- Backend retourne `{ error: "message", code: "ERROR_CODE" }` en JSON
- Frontend affiche via `ExplanationPanel` ou toast (si implémenté)
- Toujours valider input avec Zod côté serveur

---

## 📝 Commandes git courantes

```bash
# Voir les commits récents
git log --oneline -10

# Status
git status

# Branch actuelle
git rev-parse --abbrev-ref HEAD

# Créer une branche
git checkout -b feature/my-feature

# Commit simple
git add .
git commit -m "feat: description courte"

# Push
git push -u origin feature/my-feature
```

---

## 🐛 Troubleshooting

### "Module not found" en dev backend
- Vérifier que `npm install` a été exécuté dans `backend/`
- Vérifier que `npm run dev:schema` a généré `prisma/dev.prisma`

### "EADDRINUSE" (port 3001 ou 5173 déjà utilisé)
- Fermer les autres instances du backend/frontend
- Ou changer le port dans `vite.config.ts` (frontend) ou `server.ts` (backend)

### Prisma "schema mismatch" ou migration error
- Toujours utiliser `--schema=prisma/dev.prisma` en local
- En prod sur Render, la DB est Postgres et utilisera `prisma/schema.prisma`

### Quota non décrémenté
- Vérifier que la requête passe le middleware `checkQuota` avant le contrôleur
- Vérifier que `trainingService.addSession()` est appelé après la réponse

### Google OAuth "Invalid redirect URI"
- S'assurer que `FRONTEND_URL` (sur Render) pointe vers l'URL Vercel
- Le callback OAuth devrait rediriger vers `${FRONTEND_URL}/auth/callback`
