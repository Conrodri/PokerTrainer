import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, LogOut, ChevronDown, ChevronUp,
  Eye, EyeOff, Check, AlertTriangle, Palette,
  User, Shield, Settings, ZoomIn, CreditCard, Flame, ArrowDownCircle, XCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useShallow } from 'zustand/react/shallow';
import { authApi, subscriptionApi, type SubscriptionInfo } from '../services/api';
import {
  useThemeStore,
  BG_THEMES, TABLE_COLORS, CARD_STYLES,
  BgTheme, TableColor, CardStyle,
} from '../store/themeStore';
import { Hand } from '../components/poker/Card';
import { useLangStore } from '../store/langStore';
import { useModeStore } from '../store/modeStore';
import { useZoomStore, ZOOM_LEVELS } from '../store/zoomStore';
import { Button } from '../components/ui/Button';

// ─── helpers ─────────────────────────────────────────────────────────────────

function SectionCard({ title, icon, children }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5">
      <h2 className="text-white font-bold text-base flex items-center gap-2 mb-4">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── CardStylePicker ─────────────────────────────────────────────────────────

const CARD_PREVIEW_CARDS = ['As', 'Kh'] as const;

function CardStylePicker({
  label, sublabel, value, onChange, isEn,
}: {
  label: string;
  sublabel: string;
  value: CardStyle;
  onChange: (s: CardStyle) => void;
  isEn: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-[11px] text-gray-600 mb-2.5">{sublabel}</p>
      <div className="flex gap-2">
        {(Object.keys(CARD_STYLES) as CardStyle[]).map(key => {
          const def = CARD_STYLES[key];
          const isActive = value === key;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`flex-1 flex flex-col items-center gap-2 px-3 py-2.5 rounded-xl border text-center transition-all ${
                isActive
                  ? 'bg-white/5 border-white/30 text-white ring-1 ring-white/20'
                  : 'bg-gray-800/40 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
              }`}
            >
              {/* Live preview on a felt-like backdrop so every style — including
                  the dark one — stays legible against the dark settings panel */}
              <div className="rounded-lg px-2 py-1.5 bg-gradient-to-br from-emerald-800/50 to-emerald-950/60 border border-black/30 shadow-inner">
                <Hand
                  cards={CARD_PREVIEW_CARDS as any}
                  size="xs"
                  animate={false}
                  gap="gap-1"
                  cardStyle={key}
                />
              </div>
              <p className="font-bold text-[11px]">{isEn ? def.name : def.nameFr}</p>
              {isActive && (
                <span className="inline-flex items-center gap-1 text-[10px] text-green-400 font-semibold">
                  <Check size={9} /> {isEn ? 'Active' : 'Actif'}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── ProfilePage ──────────────────────────────────────────────────────────────

export function ProfilePage() {
  const navigate    = useNavigate();
  const { user, logout, deleteAccount } = useAuthStore(useShallow(s => ({ user: s.user, logout: s.logout, deleteAccount: s.deleteAccount })));
  const { lang, setLang } = useLangStore(useShallow(s => ({ lang: s.lang, setLang: s.setLang })));
  const { mode, setMode } = useModeStore(useShallow(s => ({ mode: s.mode, setMode: s.setMode })));
  const { zoom, setZoom } = useZoomStore(useShallow(s => ({ zoom: s.zoom, setZoom: s.setZoom })));
  const {
    bgTheme, tableColor, trainingCardStyle, displayCardStyle,
    setBgTheme, setTableColor, setTrainingCardStyle, setDisplayCardStyle,
  } = useThemeStore(useShallow(s => ({
    bgTheme: s.bgTheme, tableColor: s.tableColor, trainingCardStyle: s.trainingCardStyle, displayCardStyle: s.displayCardStyle,
    setBgTheme: s.setBgTheme, setTableColor: s.setTableColor, setTrainingCardStyle: s.setTrainingCardStyle, setDisplayCardStyle: s.setDisplayCardStyle,
  })));

  const isEn = lang === 'en';

  // ── Change password state ─────────────────────────────────────────────────
  const [showChangePw,  setShowChangePw]  = useState(false);
  const [curPw,         setCurPw]         = useState('');
  const [newPw,         setNewPw]         = useState('');
  const [confPw,        setConfPw]        = useState('');
  const [showCurPw,     setShowCurPw]     = useState(false);
  const [showNewPw,     setShowNewPw]     = useState(false);
  const [pwLoading,     setPwLoading]     = useState(false);
  const [pwError,       setPwError]       = useState('');
  const [pwSuccess,     setPwSuccess]     = useState(false);

  // ── Delete account state ─────────────────────────────────────────────────
  const [showDelete,    setShowDelete]    = useState(false);
  const [deletePw,      setDeletePw]      = useState('');
  const [showDeletePw,  setShowDeletePw]  = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError,   setDeleteError]   = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // ── Subscription state ────────────────────────────────────────────────────
  const [subInfo,          setSubInfo]          = useState<SubscriptionInfo | null>(null);
  const [subLoading,       setSubLoading]       = useState(false);
  const [cancelConfirm,    setCancelConfirm]    = useState(false);
  const [downgradeConfirm, setDowngradeConfirm] = useState(false);
  const [subActionLoading, setSubActionLoading] = useState(false);
  const [subActionMsg,     setSubActionMsg]     = useState('');

  useEffect(() => {
    if (!user) return;
    setSubLoading(true);
    subscriptionApi.get().then(d => setSubInfo(d)).catch(() => {}).finally(() => setSubLoading(false));
  }, [user?.id]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-gray-400">
          {isEn ? 'You must be logged in to view your profile.' : 'Vous devez être connecté pour voir votre profil.'}
        </p>
        <Button variant="gold" onClick={() => navigate('/login')}>
          {isEn ? 'Sign in' : 'Se connecter'}
        </Button>
      </div>
    );
  }

  const avatarLetter = user.username?.[0]?.toUpperCase() ?? '?';

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChangePassword = async () => {
    setPwError('');
    if (newPw.length < 6) {
      setPwError(isEn ? 'New password must be at least 6 characters.' : 'Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    if (newPw !== confPw) {
      setPwError(isEn ? 'Passwords do not match.' : 'Les mots de passe ne correspondent pas.');
      return;
    }
    setPwLoading(true);
    try {
      await authApi.changePassword({ currentPassword: curPw, newPassword: newPw });
      setPwSuccess(true);
      setCurPw(''); setNewPw(''); setConfPw('');
      setTimeout(() => { setPwSuccess(false); setShowChangePw(false); }, 2500);
    } catch (err: any) {
      setPwError(err.response?.data?.error || (isEn ? 'Incorrect current password.' : 'Mot de passe actuel incorrect.'));
    }
    setPwLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) { setDeleteConfirm(true); return; }
    setDeleteError('');
    setDeleteLoading(true);
    try {
      await deleteAccount(deletePw);
      navigate('/login');
    } catch (err: any) {
      setDeleteError(err.response?.data?.error || (isEn ? 'Incorrect password.' : 'Mot de passe incorrect.'));
    }
    setDeleteLoading(false);
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">

      {/* ── Hero card ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl p-6 flex items-center gap-5"
      >
        {/* Avatar */}
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center text-2xl font-black text-gray-900 shadow-glow-gold">
            {user.avatarUrl
              ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              : avatarLetter}
          </div>
          {user.isPremium && (
            <div className="absolute -top-2 -right-1 bg-yellow-400 rounded-full p-0.5 shadow">
              <Crown size={12} className="text-gray-900" fill="currentColor" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-black text-white truncate">{user.username}</h1>
          <p className="text-sm text-gray-400 truncate mt-0.5">{user.email}</p>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {user.isPremium ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-yellow-900/30 border border-yellow-700/60 text-yellow-300 text-xs font-bold rounded-full">
                <Crown size={11} fill="currentColor" />
                Premium
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-800 border border-gray-700 text-gray-400 text-xs font-bold rounded-full">
                {isEn ? 'Free plan' : 'Gratuit'}
              </span>
            )}
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="shrink-0 p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-xl transition-all"
          title={isEn ? 'Sign out' : 'Déconnexion'}
        >
          <LogOut size={18} />
        </button>
      </motion.div>

      {/* ── Apparence ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <SectionCard title={isEn ? 'Appearance' : 'Apparence'} icon={<Palette size={16} className="text-purple-400" />}>

          {/* Background theme */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
              {isEn ? 'Background' : 'Fond'}
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(BG_THEMES) as BgTheme[]).map(key => {
                const t = BG_THEMES[key];
                const isActive = bgTheme === key;
                return (
                  <button
                    key={key}
                    onClick={() => setBgTheme(key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      isActive
                        ? 'border-white/30 text-white shadow-lg scale-105'
                        : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                    }`}
                    style={{ background: isActive ? t.bg + 'dd' : t.bg + '88' }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                      style={{ background: t.bg }}
                    />
                    {isEn ? t.name : t.nameFr}
                    {isActive && <Check size={11} className="text-green-400 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table color */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5">
              {isEn ? 'Table felt' : 'Tapis de table'}
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(TABLE_COLORS) as TableColor[]).map(key => {
                const t = TABLE_COLORS[key];
                const isActive = tableColor === key;
                return (
                  <button
                    key={key}
                    onClick={() => setTableColor(key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      isActive
                        ? 'border-white/40 text-white scale-105'
                        : 'border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
                    }`}
                    style={{
                      background: `radial-gradient(circle at 40% 40%, ${t.center}cc, ${t.edge}cc)`,
                    }}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-white/30 shrink-0"
                      style={{ background: t.center }}
                    />
                    {isEn ? t.name : t.nameFr}
                    {isActive && <Check size={11} className="text-white/80 ml-1" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Card presets */}
          <CardStylePicker
            label={isEn ? '🃏 Training cards' : '🃏 Cartes d\'exercices'}
            sublabel={isEn ? 'Used during exercises on the table' : 'Utilisées pendant les exercices sur la table'}
            value={trainingCardStyle}
            onChange={setTrainingCardStyle}
            isEn={isEn}
          />
          <CardStylePicker
            label={isEn ? '📚 Display cards' : '📚 Cartes d\'affichage'}
            sublabel={isEn ? 'Used in rules, explanations & examples' : 'Utilisées dans les règles, explications et exemples'}
            value={displayCardStyle}
            onChange={setDisplayCardStyle}
            isEn={isEn}
          />
        </SectionCard>
      </motion.div>

      {/* ── Préférences ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <SectionCard title={isEn ? 'Preferences' : 'Préférences'} icon={<Settings size={16} className="text-blue-400" />}>

          {/* Language */}
          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-800">
            <div>
              <p className="text-sm font-semibold text-white">{isEn ? 'Language' : 'Langue'}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isEn ? 'Interface language' : 'Langue de l\'interface'}
              </p>
            </div>
            <div className="flex gap-2">
              {(['fr', 'en'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${
                    lang === l
                      ? 'bg-blue-900/40 border-blue-600 text-blue-300'
                      : 'border-gray-700 text-gray-500 hover:text-white hover:border-gray-500'
                  }`}
                >
                  {l === 'fr' ? '🇫🇷 FR' : '🇬🇧 EN'}
                </button>
              ))}
            </div>
          </div>

          {/* Zoom / text size */}
          <div className="mb-4 pb-4 border-b border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <ZoomIn size={14} className="text-teal-400" />
              <div>
                <p className="text-sm font-semibold text-white">{isEn ? 'Text size' : 'Taille du texte'}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {isEn ? 'Adjust the interface zoom for better readability' : 'Ajuste le zoom de l\'interface pour une meilleure lisibilité'}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {ZOOM_LEVELS.map(({ value, labelFr, labelEn, hint }) => (
                <button
                  key={value}
                  onClick={() => setZoom(value)}
                  className={`flex-1 min-w-[60px] flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl border text-center transition-all ${
                    zoom === value
                      ? 'bg-teal-900/40 border-teal-600 text-teal-300'
                      : 'border-gray-700 text-gray-500 hover:text-white hover:border-gray-500'
                  }`}
                >
                  <span style={{ fontSize: `${Math.max(10, value * 0.13)}px` }} className="font-black leading-none">A</span>
                  <span className="text-[10px] font-semibold">{isEn ? labelEn : labelFr}</span>
                  <span className="text-[9px] opacity-60">{hint}</span>
                  {zoom === value && (
                    <span className="inline-flex items-center gap-0.5 text-[9px] text-teal-400 font-semibold">
                      <Check size={8} /> {isEn ? 'Active' : 'Actif'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Training mode */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">
                {isEn ? 'Training mode' : 'Mode d\'entraînement'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {isEn
                  ? 'Beginner shows hints & explanations'
                  : 'Débutant affiche les indices et explications'}
              </p>
            </div>
            <div className="flex gap-2">
              {([
                { key: 'beginner', label: isEn ? '🎓 Beginner' : '🎓 Débutant' },
                { key: 'advanced', label: isEn ? '⚡ Advanced' : '⚡ Avancé' },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setMode(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    mode === key
                      ? 'bg-felt-900/40 border-felt-600 text-felt-300'
                      : 'border-gray-700 text-gray-500 hover:text-white hover:border-gray-500'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>
      </motion.div>

      {/* ── Abonnement ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
        <SectionCard title={isEn ? 'Subscription' : 'Abonnement'} icon={<CreditCard size={16} className="text-gold-400" />}>
          {subLoading ? (
            <p className="text-sm text-gray-500">{isEn ? 'Loading…' : 'Chargement…'}</p>
          ) : subInfo ? (
            <div className="flex flex-col gap-4">

              {/* Current tier badge + price */}
              <div className="flex items-center gap-3 flex-wrap">
                {subInfo.tier === 'expert' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-900/40 border border-purple-700/60 text-purple-300 text-sm font-bold rounded-full">
                    <Flame size={13} /> Expert 👑
                  </span>
                ) : subInfo.tier === 'premium' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-yellow-900/30 border border-yellow-700/60 text-yellow-300 text-sm font-bold rounded-full">
                    <Crown size={13} fill="currentColor" /> Premium
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 text-sm font-bold rounded-full">
                    {isEn ? 'Free plan' : 'Plan Gratuit'}
                  </span>
                )}
                {subInfo.tier === 'expert' && (
                  <span className="text-sm text-purple-400 font-semibold">24,99 € / {isEn ? 'month' : 'mois'}</span>
                )}
                {subInfo.tier === 'premium' && (
                  <span className="text-sm text-yellow-400 font-semibold">9,99 € / {isEn ? 'month' : 'mois'}</span>
                )}
                {subActionMsg && (
                  <span className="text-xs text-green-400 flex items-center gap-1"><Check size={12} />{subActionMsg}</span>
                )}
              </div>

              {/* Date details */}
              {subInfo.tier !== 'free' && (() => {
                const since = subInfo.tier === 'expert'
                  ? (subInfo.premiumExpertSince ?? subInfo.premiumSince)
                  : subInfo.premiumSince;
                const until = subInfo.tier === 'expert'
                  ? subInfo.premiumExpertUntil
                  : subInfo.premiumUntil;
                const sinceDate  = since ? new Date(since) : null;
                const untilDate  = until ? new Date(until) : null;
                const daysLeft   = untilDate ? Math.max(0, Math.ceil((untilDate.getTime() - Date.now()) / 86400000)) : null;
                const fmt = (d: Date) => d.toLocaleDateString(isEn ? 'en-GB' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
                return (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {sinceDate && (
                      <div className="bg-gray-800/50 rounded-xl px-4 py-3 border border-gray-700">
                        <p className="text-gray-500 mb-0.5">{isEn ? 'Member since' : 'Membre depuis'}</p>
                        <p className="text-white font-semibold">{fmt(sinceDate)}</p>
                      </div>
                    )}
                    <div className="bg-gray-800/50 rounded-xl px-4 py-3 border border-gray-700">
                      <p className="text-gray-500 mb-0.5">{isEn ? 'Valid until' : 'Valide jusqu\'au'}</p>
                      {untilDate ? (
                        <>
                          <p className="text-white font-semibold">{fmt(untilDate)}</p>
                          <p className={`mt-0.5 font-medium ${daysLeft! <= 7 ? 'text-red-400' : daysLeft! <= 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {daysLeft === 0
                              ? (isEn ? 'Expires today' : 'Expire aujourd\'hui')
                              : isEn ? `${daysLeft} days remaining` : `${daysLeft} jours restants`}
                          </p>
                        </>
                      ) : (
                        <p className="text-green-400 font-semibold">{isEn ? 'No expiry (manual)' : 'Sans expiration (manuel)'}</p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-1 border-t border-gray-800">
                {/* Upgrade to expert — always shown if not expert, opens mailto */}
                {subInfo.tier !== 'expert' && (
                  <a
                    href={`mailto:contact@pokerpeak.fr?subject=${encodeURIComponent(isEn ? 'Upgrade to Expert' : 'Passer en Expert')}&body=${encodeURIComponent(isEn ? `Hi, I'd like to upgrade my account (${user?.email}) to Expert.` : `Bonjour, je souhaite passer mon compte (${user?.email}) en Expert.`)}`}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-900/30 border border-purple-700/50 text-purple-300 text-sm font-semibold hover:bg-purple-900/50 transition-all"
                  >
                    <Flame size={14} />
                    {isEn ? 'Upgrade to Expert 👑' : 'Passer en Expert 👑'}
                    <span className="text-xs text-purple-500 ml-auto">{isEn ? 'contact us →' : 'nous contacter →'}</span>
                  </a>
                )}

                {/* Downgrade expert → premium */}
                {subInfo.tier === 'expert' && (
                  downgradeConfirm ? (
                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-yellow-900/20 border border-yellow-700/40 text-sm">
                      <p className="text-yellow-300 font-semibold">
                        {isEn ? 'Switch to Premium at next renewal?' : 'Passer en Premium au prochain renouvellement ?'}
                      </p>
                      <p className="text-yellow-500/80 text-xs">
                        {isEn
                          ? 'Your Expert access remains active until expiry. At renewal, you will be billed 9.99 €/month instead of 24.99 €/month.'
                          : "Ton accès Expert reste actif jusqu'à expiration. Au renouvellement, tu seras facturé 9,99 €/mois au lieu de 24,99 €/mois."}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <button
                          disabled={subActionLoading}
                          onClick={async () => {
                            setSubActionLoading(true);
                            try {
                              await subscriptionApi.downgrade();
                              setSubInfo(await subscriptionApi.get());
                              setSubActionMsg(isEn ? 'Scheduled switch to Premium.' : 'Passage en Premium planifié.');
                              setTimeout(() => setSubActionMsg(''), 3000);
                            } catch {}
                            setSubActionLoading(false);
                            setDowngradeConfirm(false);
                          }}
                          className="px-3 py-1.5 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg text-xs font-bold transition-colors"
                        >
                          {isEn ? 'Confirm' : 'Confirmer'}
                        </button>
                        <button onClick={() => setDowngradeConfirm(false)} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-bold transition-colors">
                          {isEn ? 'Cancel' : 'Annuler'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDowngradeConfirm(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700 text-gray-300 text-sm font-semibold hover:border-yellow-700/50 hover:text-yellow-300 transition-all"
                    >
                      <ArrowDownCircle size={14} />
                      <span className="flex-1 text-left">
                        {isEn ? 'Switch to Premium at renewal' : 'Passer en Premium au renouvellement'}
                        <span className="block text-xs font-normal text-gray-500 mt-0.5">
                          {isEn ? '9.99 €/month instead of 24.99 €/month' : '9,99 €/mois au lieu de 24,99 €/mois'}
                        </span>
                      </span>
                    </button>
                  )
                )}

                {/* Cancel subscription */}
                {subInfo.tier !== 'free' && (
                  cancelConfirm ? (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-900/20 border border-red-700/40 text-sm">
                      <AlertTriangle size={14} className="text-red-400 shrink-0" />
                      <span className="text-red-300 flex-1 text-xs">
                        {isEn ? 'Cancel subscription immediately? Access ends now.' : 'Résilier immédiatement ? L\'accès se termine maintenant.'}
                      </span>
                      <button
                        disabled={subActionLoading}
                        onClick={async () => {
                          setSubActionLoading(true);
                          try {
                            await subscriptionApi.cancel();
                            setSubInfo(await subscriptionApi.get());
                            setSubActionMsg(isEn ? 'Subscription cancelled.' : 'Abonnement résilié.');
                            setTimeout(() => setSubActionMsg(''), 3000);
                          } catch {}
                          setSubActionLoading(false);
                          setCancelConfirm(false);
                        }}
                        className="px-3 py-1 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs font-bold transition-colors shrink-0"
                      >
                        {isEn ? 'Confirm' : 'Confirmer'}
                      </button>
                      <button onClick={() => setCancelConfirm(false)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-bold transition-colors shrink-0">
                        {isEn ? 'Cancel' : 'Annuler'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setCancelConfirm(true)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-800/60 border border-gray-700 text-gray-500 text-sm hover:border-red-700/50 hover:text-red-400 transition-all"
                    >
                      <XCircle size={14} />
                      {isEn ? 'Cancel subscription' : 'Résilier l\'abonnement'}
                    </button>
                  )
                )}

                {/* Free plan — contact to subscribe */}
                {subInfo.tier === 'free' && (
                  <a
                    href={`mailto:contact@pokerpeak.fr?subject=${encodeURIComponent(isEn ? 'Subscribe to Premium' : 'S\'abonner en Premium')}&body=${encodeURIComponent(isEn ? `Hi, I'd like to subscribe to Premium (${user?.email}).` : `Bonjour, je souhaite m'abonner en Premium (${user?.email}).`)}`}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-900/20 border border-yellow-700/40 text-yellow-300 text-sm font-semibold hover:bg-yellow-900/40 transition-all"
                  >
                    <Crown size={14} fill="currentColor" />
                    {isEn ? 'Subscribe to Premium' : 'S\'abonner en Premium'}
                    <span className="text-xs text-yellow-600 ml-auto">{isEn ? 'contact us →' : 'nous contacter →'}</span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-600">{isEn ? 'Could not load subscription info.' : 'Impossible de charger les infos d\'abonnement.'}</p>
          )}
        </SectionCard>
      </motion.div>

      {/* ── Compte ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <SectionCard title={isEn ? 'Account' : 'Compte'} icon={<Shield size={16} className="text-gold-400" />}>

          {/* Change password */}
          <div className="mb-3">
            <button
              onClick={() => { setShowChangePw(v => !v); setPwError(''); setPwSuccess(false); }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-gray-800/60 border border-gray-700 hover:border-gray-500 text-sm font-semibold text-white transition-all"
            >
              <span className="flex items-center gap-2">
                <Shield size={14} className="text-blue-400" />
                {isEn ? 'Change password' : 'Changer le mot de passe'}
              </span>
              {showChangePw ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>

            <AnimatePresence initial={false}>
              {showChangePw && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-3 pt-3 px-1">

                    {/* Current password */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        {isEn ? 'Current password' : 'Mot de passe actuel'}
                      </label>
                      <div className="relative">
                        <input
                          type={showCurPw ? 'text' : 'password'}
                          value={curPw}
                          onChange={e => setCurPw(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurPw(v => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        >
                          {showCurPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* New password */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        {isEn ? 'New password' : 'Nouveau mot de passe'}
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPw ? 'text' : 'password'}
                          value={newPw}
                          onChange={e => setNewPw(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(v => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        >
                          {showNewPw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm new */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        {isEn ? 'Confirm new password' : 'Confirmer le nouveau mot de passe'}
                      </label>
                      <input
                        type="password"
                        value={confPw}
                        onChange={e => setConfPw(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleChangePassword(); }}
                        placeholder="••••••••"
                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {pwError && (
                      <p className="text-xs text-red-400 flex items-center gap-1.5">
                        <AlertTriangle size={12} /> {pwError}
                      </p>
                    )}
                    {pwSuccess && (
                      <p className="text-xs text-green-400 flex items-center gap-1.5">
                        <Check size={12} /> {isEn ? 'Password updated!' : 'Mot de passe mis à jour !'}
                      </p>
                    )}

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleChangePassword}
                      disabled={pwLoading || !curPw || !newPw || !confPw}
                    >
                      {pwLoading
                        ? (isEn ? 'Saving…' : 'Sauvegarde…')
                        : (isEn ? 'Update password' : 'Mettre à jour')
                      }
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Delete account */}
          <div>
            <button
              onClick={() => { setShowDelete(v => !v); setDeleteError(''); setDeleteConfirm(false); setDeletePw(''); }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-red-950/30 border border-red-900/50 hover:border-red-700/60 text-sm font-semibold text-red-400 transition-all"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle size={14} />
                {isEn ? 'Delete account' : 'Supprimer le compte'}
              </span>
              {showDelete ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            <AnimatePresence initial={false}>
              {showDelete && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-3 pt-3 px-1">
                    <div className="bg-red-950/40 border border-red-900/50 rounded-xl p-3 text-xs text-red-300 leading-relaxed">
                      ⚠️{' '}
                      {isEn
                        ? 'This action is irreversible. All your data (stats, ranges, history) will be permanently deleted.'
                        : 'Cette action est irréversible. Toutes vos données (stats, ranges, historique) seront définitivement supprimées.'}
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1">
                        {isEn ? 'Enter your password to confirm' : 'Entrez votre mot de passe pour confirmer'}
                      </label>
                      <div className="relative">
                        <input
                          type={showDeletePw ? 'text' : 'password'}
                          value={deletePw}
                          onChange={e => setDeletePw(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-gray-800 border border-red-900/60 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500 pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowDeletePw(v => !v)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                        >
                          {showDeletePw ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>

                    {deleteError && (
                      <p className="text-xs text-red-400 flex items-center gap-1.5">
                        <AlertTriangle size={12} /> {deleteError}
                      </p>
                    )}

                    {!deleteConfirm ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setDeleteConfirm(true)}
                        disabled={!deletePw}
                      >
                        {isEn ? 'Continue' : 'Continuer'}
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs text-red-300 font-semibold text-center">
                          {isEn
                            ? '⚠️ Are you absolutely sure? This cannot be undone.'
                            : '⚠️ Êtes-vous absolument sûr(e) ? Ceci est irréversible.'}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setDeleteConfirm(false); }}
                            className="flex-1"
                          >
                            {isEn ? 'Cancel' : 'Annuler'}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={handleDeleteAccount}
                            disabled={deleteLoading}
                            className="flex-1"
                          >
                            {deleteLoading
                              ? (isEn ? 'Deleting…' : 'Suppression…')
                              : (isEn ? 'Delete permanently' : 'Supprimer définitivement')
                            }
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </SectionCard>
      </motion.div>

      {/* ── Account info ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <SectionCard title={isEn ? 'Account info' : 'Informations du compte'} icon={<User size={16} className="text-gray-400" />}>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <span className="text-gray-400">{isEn ? 'Username' : 'Pseudo'}</span>
              <span className="text-white font-semibold">{user.username}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-800">
              <span className="text-gray-400">Email</span>
              <span className="text-white font-mono text-xs">{user.email}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-400">{isEn ? 'Plan' : 'Abonnement'}</span>
              {user.isPremium ? (
                <span className="inline-flex items-center gap-1 text-yellow-300 font-semibold">
                  <Crown size={12} fill="currentColor" /> Premium
                </span>
              ) : (
                <span className="text-gray-400">
                  {isEn ? 'Free' : 'Gratuit'}{' '}
                  <span className="text-xs text-yellow-600 ml-1">
                    {isEn ? '— upgrade coming soon' : '— upgrade bientôt disponible'}
                  </span>
                </span>
              )}
            </div>
          </div>
        </SectionCard>
      </motion.div>

    </div>
  );
}
