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
- `equity.ts` — Calcul d'équité par simulation Monte Carlo (postflop)
- `ranges.ts` — Représentation et manipulation des ranges (bitmask 169) pour tous les formats (6-max, 8-max, 3-max, HU) × (CG, MTT)
- `potOdds.ts` — Calcul des cotes et de l'EV
- `outs.ts` — Identification des outs (cartes utiles)
- `bbDefense.ts` — Ranges spécifiques (défense BB)
- `bluffService.ts` — Fréquences de bluff non-exploitables
- `preflopCanonical.ts` — Notation canonique des mains (Ax, KK, etc.)

**Contrôleurs & routes**
- `authController.ts` + `googleAuthController.ts` + `routes/auth.ts` — Register, login, Google OAuth, reset password, vérification email
- `trainingController.ts` + `routes/training.ts` — Génération d'exercices (pré-flop tous formats, équité, pot odds, outs, bluff, bet sizing, full hand)
- `postflopController.ts` + `routes/postflop.ts` — Exercices post-flop (premium)
- `statsController.ts` + `routes/stats.ts` — Classement, historique, progression, sprints par module
- `rangesController.ts` + `routes/ranges.ts` — Ranges simples personnalisées (169 mains) + presets
- `expertRangesController.ts` + `routes/expertRanges.ts` — Ranges multi-actions (expert tier)
- `profilesController.ts` + `routes/profiles.ts` — Profils de ranges sauvegardés
- `subscriptionController.ts` + `routes/subscription.ts` — Gestion des tiers premium
- `examController.ts` + `routes/exam.ts` — Mode sprint/examen (looped exercises, best score, 14 modules)
- `routes/feedback.ts` — Envoi de feedback utilisateur (rate-limited)

**Services & middleware**
- `trainingService.ts` — Logique de génération d'exercices (paires, position, difficulté, tableFormat, gameType)
- `quota.ts` — Gestion des quotas gratuits (5 exos/jour par module)
- `emailService.ts` — Envoi d'emails (Resend) : vérification email, reset password
- `auth.ts` (middleware) — Vérification JWT, refresh tokens, tiers premium/expert
- `secrets.ts` — Gestion des variables d'environnement

**Base de données** (`backend/prisma/schema.prisma`)
Modèles clés :
- `User` — Utilisateurs, tiers premium/expert, email verification, password reset
- `TrainingSession` — Sessions d'exercices (module, mode, temps)
- `SessionExercise` — Exercice individuel (type, correct, XP, temps)
- `PlayerStats` — XP, rang, achievements JSON, sprints, accuracy par module
- `ExamRecord` — Record (best score) par (user, module, mode) — couvre les 14 modules sprint
- `ExamRun` — Historique des runs sprint avec score et timestamp
- `CustomRange` — Range personnalisée par position (169 mains bitmask)
- `RangePreset` — Presets prédéfinis de ranges (GTO, tight, loose, etc.)
- `RangeProfile` — Profil nommé regroupant plusieurs CustomRanges
- `RangeStackRange` — Range par taille de stack (pour MTT)
- `ExpertRange` — Range multi-actions (Fold/Call/Raise/All-in %)
- `FreeUsage` — Quota gratuit (resets quotidien à minuit UTC+2)
- `DailyChallenge` + `Challenge` — Challenges personnalisés pour utilisateurs premium

---

### **Frontend : composants React + state Zustand**

**Pages** (`frontend/src/pages/`)
- `HomePage.tsx` — Accueil, présentation des modules, CTA
- `TrainingPage.tsx` — Hub d'entraînement (sélection module + format + game type)
- `StatsPage.tsx` — Progression, achievements, historique par jour, sprints par variant pré-flop
- `LeaderboardPage.tsx` — Classement global avec grille accuracy + sprints pré-flop par format
- `PremiumPage.tsx` — Pitch premium, gestion abonnement
- `ProfilePage.tsx` — Profil utilisateur, paramètres
- `TablePage.tsx` — Vue table de poker complète (premium feature)
- `LearningPathPage.tsx` — Chemins d'apprentissage guidés
- `GlossaryPage.tsx` — Glossaire des termes poker (avec `glossary.ts`)
- `LoginPage.tsx` — Connexion email/password + Google OAuth
- `ForgotPasswordPage.tsx` / `ResetPasswordPage.tsx` — Reset de mot de passe
- `VerifyEmailPage.tsx` — Vérification d'email post-inscription
- `AuthCallbackPage.tsx` — Callback OAuth Google
- `CGUPage.tsx` — Conditions générales d'utilisation
- `PrivacyPage.tsx` — Politique de confidentialité

**Composants d'entraînement** (`frontend/src/components/training/`)
Un composant par module :
- `PreflopTrainer.tsx` — Fold/raise pré-flop avec range visuelle, 4 formats (6-max/8-max/3-max/HU) × 2 game types (CG/MTT), 8 clés de sprint
- `EquityTrainer.tsx` — Quelle main domine ? (Débutant/Avancé/Expert)
- `OutsTrainer.tsx` — Compte les outs, règle de 2&4
- `PotOddsTrainer.tsx` — Call/fold selon EV
- `PostflopTrainer.tsx` — Texture de board, continuation bet (premium)
- `BetSizingTrainer.tsx` — Sélection de sizing optimal
- `BluffTrainer.tsx` — Fréquences de bluff et sélection de mains
- `FullHandTrainer.tsx` — Main complète pré-flop à river (premium)
- `ExamMode.tsx` — Composants sprint : `<ExamLauncher>`, `<ExamHud>`, `<ExamResult>`
- `CustomRangePanel.tsx` — Panneau de range personnalisée pendant l'entraînement
- `PokerRulesPage.tsx` — Page de règles/modules intégrée (affiché comme page)

**Composants poker** (`frontend/src/components/poker/`)
- `Card.tsx` — Affichage d'une carte
- `RangeMatrix.tsx` — Matrice 13×13 interactive (sélection/visualisation de mains)
- `RangeEditor.tsx` — Éditeur simple de range (169 mains, drag-to-select)
- `ExpertRangeEditor.tsx` — Éditeur multi-actions (Fold/Call/Raise/All-in %)
- `PokerTable.tsx` — Table de jeu stylisée (positions dynamiques selon format)
- `MyRangesPanel.tsx` — Ranges personnalisées de l'utilisateur (tous formats)

**Composants stats** (`frontend/src/components/stats/`)
- `AchievementsGrid.tsx` — Grille des badges débloqués / en cours
- `DayDetailPanel.tsx` — Détail d'une journée dans le calendrier de progression

**Composants onboarding** (`frontend/src/components/onboarding/`)
- `OnboardingModal.tsx` — Modal de bienvenue et sélection de profil
- `GuidedHand.tsx` — Main guidée interactive pour débutants

**Composants tutorial** (`frontend/src/components/tutorial/`)
- `HandTutorialModal.tsx` — `TutorialHand`, main guidée pas-à-pas (utilisée dans la page de règles)

**UI réutilisable** (`frontend/src/components/ui/`)
- `ModeToggle.tsx` — Sélecteur Débutant / Avancé / Expert
- `ModeBadge.tsx` — Badge coloré indiquant le mode actif
- `SpoilableHint.tsx` — Indice révélable (réinitialise le streak en avancé)
- `VerdictBanner.tsx` — Verdict correct/incorrect/partiel avec explication
- `ExplanationPanel.tsx` — Explication détaillée (GTO ranges, équité, EV, etc.)
- `QuotaLockPanel.tsx` — Paywall quota gratuit
- `TrainerIntro.tsx` — Intro du module (objectif, conseils, bouton sprint)
- `SprintTimer.tsx` — Compte à rebours du sprint (10 s avancé / 5 s expert)
- `SessionStatsBar.tsx` — Barre de stats en cours de session (streak, correct, XP)
- `ProgressBar.tsx` — Barre de progression générique
- `StatChip.tsx` — Chip de statistique réutilisable
- `BeginnerGuide.tsx` — Guide rapide pour nouveaux utilisateurs
- `HoverTip.tsx` — Tooltip au survol
- `PokerTerm.tsx` — Terme poker cliquable → définition dans le glossaire
- `RichText.tsx` — Rendu de texte enrichi avec termes poker
- `SourcesFooter.tsx` — Footer des sources académiques/GTO
- `Button.tsx` — Bouton générique (variants: primary, secondary, ghost, gold)
- `Spinner.tsx` — Indicateur de chargement
- `ErrorBoundary.tsx` — Capture d'erreurs React
- `CookieBanner.tsx` — Bandeau RGPD cookies
- `FeedbackButton.tsx` — Bouton flottant d'envoi de feedback
- `LanguageToggle.tsx` — Bascule FR / EN

**Hooks** (`frontend/src/hooks/`)
- `useExamRunner.ts` — Logique d'exécution d'un sprint (start, check, forfeit, record)
- `useExerciseLock.ts` — Verrouillage de l'exercice après réponse (évite double-submit)
- `useIsMobile.ts` — Détecte si l'écran est mobile (breakpoint 768px)

**État global** (`frontend/src/store/`)
Zustand stores (persistés en localStorage sauf `examStore`) :
- `authStore` — User connecté, token JWT, tiers premium/expert
- `trainingStore` — Module en cours, exercice, format (6max/8max/3max/HU), game type (CG/MTT), réponses, streak
- `examStore` — État en cours de sprint (correct, errors, isNewRecord, history, records par module)
- `modeStore` — Mode actif : `'beginner' | 'advanced' | 'expert'`
- `langStore` — Langue active : `'fr' | 'en'`
- `themeStore` — Thème : `'dark' | 'light'`
- `quotaStore` — Quota gratuit restant (5/jour par module)
- `customRangeStore` — Ranges personnalisées de l'utilisateur (cache local)
- `zoomStore` — Niveau de zoom de la matrice de range

**Services API** (`frontend/src/services/api.ts`)
Client Axios centralisé. Appels couverts :
- Auth : register, login, OAuth, logout, forgot/reset password, vérification email
- Training : générer exercice, vérifier réponse, récupérer range GTO
- Stats : leaderboard (avec sprints par variant), stats perso, historique
- Exam/Sprint : records, start, check
- Ranges : custom ranges, presets, profils, expert ranges
- Quota : état du quota journalier
- Feedback : envoi de feedback utilisateur

**i18n** (`frontend/src/i18n/`)
- `fr.ts` / `en.ts` — Traductions statiques typées (tous les modules et messages)
- `index.ts` — Hook `useTranslation()` + sélecteur de langue

**Utils** (`frontend/src/utils/`)
- `pokerUtils.ts` — Helpers poker génériques (notation, combinaisons, etc.)
- `rangeImportValidator.ts` — Validation et import de ranges (format texte → bitmask)
- `coachHints.ts` — Hints contextuels du coach (selon position, main, mode)
- `handHints.ts` — Conseils spécifiques aux mains (AK, pocket pairs, etc.)

**Data** (`frontend/src/data/`)
- `glossary.ts` — Dictionnaire de termes poker (FR/EN, avec définitions)

**Analytics** (`frontend/src/lib/analytics.ts`)
- Tracking events (page views, exercices, sprints) — désactivé si pas de consentement cookie

---

## ⚙️ Points clés à comprendre

### **Schéma SQLite en dev, PostgreSQL en prod**
- `prisma/schema.prisma` est défini en `provider = "postgresql"`
- `npm run dev:schema` génère `prisma/dev.prisma` (SQLite) depuis le schéma prod
- `npm run dev` exécute ce script **automatiquement** au lancement
- **Ne jamais** lancer `prisma db push` brut en local sans le flag `--schema=prisma/dev.prisma`
- En prod (Render), `prisma db push` cible la vraie DB Postgres (Neon)

### **Formats et game types pré-flop**
- `TableFormat = '6max' | '8max' | '3max' | 'hu'` — positions et ranges différentes
- `GameType = 'cashgame' | 'mtt'` — antes MTT changent les ranges d'ouverture
- Clés de sprint pré-flop (8 combinaisons) :
  - `preflop` (6-max CG), `preflop-mtt` (6-max MTT)
  - `preflop8` (8-max CG), `preflop8-mtt` (8-max MTT)
  - `preflop-3max` (3-max CG), `preflop-mtt-3max` (3-max MTT)
  - `preflop-hu` (HU CG), `preflop-mtt-hu` (HU MTT)
- Positions par format : 6-max (UTG/HJ/CO/BTN/SB/BB), 8-max (+ UTG1/LJ), 3-max (BTN/SB/BB), HU (BTN/BB)

### **Quota gratuit et sessions**
- 5 exercices/jour par module par utilisateur connecté (gratuit ou trial premium)
- Le quota resets à minuit `Europe/Paris` (stocké en `FreeUsage.resetAt`)
- Les sessions enregistrent : correcte/incorrecte, temps, XP gagné, mode
- Vérification du quota dans le middleware : `checkQuota` refusal si quota épuisé

### **Équité (module Training)**
- Le module Équité ne compare pas des mains entre elles : il génère des scénarios pot/mise (bitBB, potBB) dont l'équité requise est calculée algébriquement (`buildEquityPool` dans `trainingService.ts`), pas de simulation ni de table précalculée.
- Pour l'évaluation postflop réelle (Postflop, Main complète), `equity.ts` utilise une simulation Monte Carlo (`calculateEquity`).

### **Ranges en bitmask 13×13**
- Chaque main = bit dans un int64 (JS BigInt)
- Utile pour opérations rapides (union, intersection, etc.)
- Conversion : `ranges.ts` fournit `encodeBitmask()`, `decodeBitmask()`, `getCanonical()`

### **Tiers d'accès**
- **Gratuit** — modules de base illimités, quota 5/jour/module premium, pas d'expert
- **Premium** 👑 — accès illimité, éditeur ranges simple, badge classement, pas d'expert
- **Premium Expert** 🔥 — tout Premium + mode Expert + éditeur ranges multi-actions
- Accordés en DB manuellement (pas de facturation en ligne actuellement)
- Les routes premium ne sont plus gatées par middleware (accès ouvert) ; le quota gratuit reste suivi côté client via `quotaApi.consume()` avant chaque exercice premium

### **Modes d'entraînement**
> **Vocation : application à but éducatif.** L'objectif premier est l'apprentissage progressif du poker. Les 3 modes structurent une montée en difficulté graduelle.
- **Débutant** 🎓 — pédagogie maximale : explications complètes, indices visibles, exercices plus faciles, compte rendu détaillé.
- **Avancé** ⚡ — indices cachés (bouton « Révéler », révéler = réinitialise le streak), exercices plus complexes. Contient les **sprints** (**10 s** de délai par exo).
- **Expert** 🔥 — exercices plus difficiles (étapes supplémentaires ou réponses plus complexes). Aucun indice, mode sprint looped (3 erreurs = fin). Sprints à **5 s** de délai par exo.

### **Mode sprint (ExamMode)**
- Enchaîne les exercices en boucle jusqu'à 3 erreurs → score = bonnes réponses
- `ExamRecord` stocke le record (best score) par `(userId, module, mode)`
- `ExamRun` conserve l'historique de chaque run (score, date)
- 14 modules sprint au total : 8 préflop variants + `potodds`, `equity`, `outs`, `postflop`, `fullhand`, `betsizing`
- `ExamLauncher` → bouton de lancement dans le header de chaque trainer
- `ExamHud` → vies + score live pendant le run
- `ExamResult` → carte récap avec score, record, historique des runs, mains ratées
- Un run abandonné (forfeit) n'est pas sauvegardé

### **Achievements et titres débloquables**
- `backend/src/utils/achievements.ts` (et miroir frontend) définit badges et conditions
- Catégories : `exercises`, `accuracy`, `days`, `sprint_advanced`, `sprint_expert`, `daily_ex`, `daily_correct`, `daily_acc`
- Tiers : `bronze` → `silver` → `gold` → `platinum`
- Titres débloquables (affichés dans le leaderboard) : attribués au meilleur achievement débloqué
- XP gagné : 1 pt/correct en débutant, 2 pts en avancé, 3 pts en expert

### **🔴 Principes non négociables (perf, responsive, qualité)**
- **🚨 PRIORITÉ 1 — Responsive mobile obligatoire** — l'application **doit** être parfaitement utilisable sur téléphone. Tout nouveau composant ou page est conçu *mobile-first*, **testé sur petits écrans avant tout** (zones tactiles ≥ 44px, lisibilité, aucun débordement horizontal, textes lisibles sans zoom). Si un composant ne passe pas le test mobile, il **ne part pas en production**.
- **Structure adaptative** — privilégier au maximum les layouts fluides/adaptatifs (flex, grid, unités relatives, breakpoints Tailwind `sm`/`md`/`lg`) plutôt que des dimensions fixes. La mise en page doit s'adapter à tous les viewports sans casser. **Toujours tester à 375px de large (iPhone SE) comme breakpoint minimal.**
- **Précompute maximum** — précalculer un **maximum d'exercices** (et tables d'équité, ranges, etc.) en amont pour gagner en performances runtime. Préférer le lookup de données générées plutôt que le calcul à la volée côté serveur/client.
- **Génération via le CPU de l'utilisateur en priorité** — pour générer/précalculer ces exercices, **utiliser en priorité le CPU local de l'utilisateur** (scripts de génération exécutés sur sa machine) plutôt que la puissance de calcul de l'assistant. Proposer/écrire des scripts à lancer localement pour produire les données.
- **Optimisation continue du code** — l'optimisation est un **point central** à revoir en permanence. Chercher activement à améliorer les performances et la clarté à chaque passage.
- **Zéro doublon** — éviter la duplication de code (DRY) ; factoriser la logique partagée dans des helpers/services réutilisables.
- **Vérifier l'existant avant de développer** — avant d'ajouter du code, **toujours inspecter l'existant** : peut-on **réutiliser ou améliorer** un composant/service/util déjà présent plutôt que d'en créer un nouveau ? L'ajout de code neuf est un dernier recours.
- **Modularité** — travailler de la manière la plus modulable possible : composants/fonctions petits, découplés et réutilisables.
- **🚨 PRIORITÉ 1 — Politique « non-scroll » sur PC** — pendant les exercices, l'affichage **doit tenir dans le viewport sans aucun scroll** sur ordinateur. C'est une contrainte ferme, pas un objectif. Exceptions autorisées : écrans de **récap/résultats** et listes longues explicitement paginées. Pour chaque layout d'exercice, vérifier qu'il tient sur un écran 1280×800 px avant de valider. Si un composant dépasse, compresser les espacements (`gap`, `py`, `px`) ou réduire les tailles de texte — ne **jamais** laisser passer un layout scrollable en exercice.
- **Direction artistique cohérente** — garder la **même direction artistique partout** (couleurs, typographie, composants, espacements). Pas d'incohérences visuelles entre pages/modules.
- **Échelle visuelle standard (à respecter sur toute nouvelle page/module)** — s'aligner sur la densité de `TrainerIntro` / `PokerRulesPage`. Tableau de référence :

  | Élément | Classe Tailwind |
  |---|---|
  | Conteneur max-width | `max-w-xl mx-auto` |
  | Gap entre sections | `gap-2.5` |
  | Encart / card | `bg-gray-900/50 rounded-xl px-3 py-2.5 border border-gray-800` |
  | Titre de section (h2/h3) | `text-sm font-bold text-white mb-2` |
  | Texte corps principal | `text-xs text-gray-400` |
  | Texte secondaire / caption | `text-[11px] text-gray-400` |
  | Très petite note | `text-[10px] text-gray-500` |
  | Badge / pill inline | `px-1.5 py-0.5 rounded text-[10px] font-bold` |
  | Bouton onglet inactif | `bg-gray-800 border border-gray-700 text-gray-400 px-2.5 py-1.5 rounded-lg text-xs font-semibold` |
  | Bouton onglet actif | `bg-yellow-600 border-yellow-500 text-white` (même padding/radius) |
  | Bouton CTA principal | `py-2 rounded-lg bg-yellow-600 text-white font-bold text-xs` |
  | Bouton CTA grand | `py-2.5 rounded-lg bg-yellow-600 text-white font-bold text-sm` |
  | Gap interne dans un encart | `gap-1.5` à `gap-2` |
  | Icône dans titre | `w-4 h-4 rounded bg-gray-800 text-[10px]` |
  | Spacing `mb` entre blocs | `mb-2` (jamais `mb-4` sauf titre de page) |

  > Ces valeurs sont extraites de `TrainerIntro.tsx` et `PokerRulesPage.tsx` — référence visuelle de toute l'app.
- **Textes utilisateur clairs et concis** — toute string affichée à l'utilisateur doit être la plus **claire et concise** possible. Pas de jargon inutile, pas de phrases longues : aller à l'essentiel.
- **Cohérence des modules (icônes / couleurs / patterns)** — chaque module a son **icône** et sa **couleur** attitrées : les **réutiliser systématiquement** partout où le module apparaît (cartes, menus, stats, etc.). **Un nouveau module doit reprendre exactement les mêmes principes** : même convention d'icône (lib Lucide), même logique de couleur, et **mêmes patterns de code** que les modules existants (structure du trainer, props, i18n, etc.). On clone le modèle existant, on n'invente pas une nouvelle façon de faire.
- **UX optimisée** — l'expérience utilisateur doit être soignée et fluide partout ; minimiser les frictions et les étapes inutiles.
- **Workflow : dev mode exclusivement** — on travaille **exclusivement en dev mode** (SQLite local). On ne **push** qu'une fois que **tout est clean** (testé, sans erreur, sans code mort) — pas de push intermédiaire d'un état cassé.
- **🚨 Jamais de push en prod sans accord explicite** — ne jamais déclencher un déploiement en production (push vers Render, Vercel, ou toute commande de déploiement) sans une confirmation explicite de l'utilisateur dans la conversation. Le push sur `main` (git) est autorisé en dev local ; tout ce qui touche l'environnement de production (variables d'env, migrations DB Neon, déploiements) **exige un accord préalable**.

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
POST   /api/auth/register              { username, email, password }
POST   /api/auth/login                 { email, password }
GET    /api/auth/me                    (JWT auth) → User
POST   /api/auth/logout
POST   /api/auth/forgot-password       { email }
POST   /api/auth/reset-password        { token, newPassword }
GET    /api/auth/verify-email/:token   → confirmation email
GET    /api/auth/google                → redirection OAuth
GET    /api/auth/google/callback       → JWT token, redir frontend
```

### Training
```
GET    /api/training/:module/exercise?position=BTN&tableFormat=6max&gameType=cashgame
POST   /api/training/:module/check     { answer, time }  → { correct, explanation, xp }
GET    /api/training/:module/range/:position              (ranges GTO pré-flop)
GET    /api/health
```

### Stats & Progression
```
GET    /api/stats/leaderboard          (top 50, inclut sprints par variant préflop)
GET    /api/stats/me                   (JWT auth)
GET    /api/stats/:username            (profil public)
GET    /api/stats/history              (JWT auth, paginated)
GET    /api/quota                      (JWT auth, reste quota)
```

### Ranges
```
GET    /api/ranges                     (JWT auth)
POST   /api/ranges                     { position, mains, tableFormat }
GET    /api/profiles                   (JWT auth, saved profiles)
POST   /api/profiles                   { name, ranges }
GET    /api/expert-ranges              (JWT auth, premium expert)
POST   /api/expert-ranges              { position, mix }
```

### Exam / Sprint
```
GET    /api/exam/records               (JWT auth) → { [module]: { advanced, expert } }
POST   /api/exam/start                 { module, mode } → exercise
POST   /api/exam/check                 { answer } → { correct, streak, score, ended }
GET    /api/exam/history/:module       (JWT auth, runs récents)
```

### Feedback
```
POST   /api/feedback                   { message, page? } (rate-limited)
```

---

## 🎨 Conventions et patterns

### **Nommage des positions**
- **6-max** : `UTG`, `HJ`, `CO`, `BTN`, `SB`, `BB`
- **8-max** : + `UTG1`, `LJ` (ordre : UTG → UTG1 → LJ → HJ → CO → BTN → SB → BB)
- **3-max** : `BTN`, `SB`, `BB`
- **HU** : `BTN` (= SB), `BB`

### **Notation des mains**
- `AK` (As-Roi), `AA` (paire d'As), `T5s` (Dix-Cinq assortis), `T5o` (dépareillés)
- Canonique : `AA`, `KK`, ..., `22`, `AK`, `AQ`, etc. (169 mains uniques)

### **Clés de module sprint**
Format : `preflop[-mtt][-3max|-8|-hu]` — exemples : `preflop`, `preflop8-mtt`, `preflop-mtt-hu`

### **Traductions**
- Toutes les strings UI en `frontend/src/i18n/fr.ts` et `en.ts` (typées)
- Utiliser `useTranslation()` hook et `useLangStore` pour interpoler en composants

### **Erreurs**
- Backend retourne `{ error: "message", code: "ERROR_CODE" }` en JSON
- Frontend affiche via `ExplanationPanel` ou `VerdictBanner`
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
git add <fichiers>
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

### Sprint record non sauvegardé
- Un run forfeit (abandonné) ne sauvegarde pas le score — comportement voulu
- Vérifier que `examController.ts` inclut bien la clé de module dans `MODULES`
