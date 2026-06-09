import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import {
  BarChart2, Trophy, BookOpen, Home, LogOut, Crown,
  ChevronDown, Lock, Menu, X,
} from 'lucide-react';
import { LanguageToggle } from '../ui/LanguageToggle';
import { ModeToggle } from '../ui/ModeToggle';
import { Tutorial } from '../tutorial/Tutorial';
import { useT } from '../../i18n';
import { useLangStore } from '../../store/langStore';

// ─── Training modules listed in the dropdown ──────────────────────────────────
const MODULES = [
  { id: 'preflop',   icon: '🎯', labelFr: 'Pré-flop',      labelEn: 'Pre-flop',    premium: false },
  { id: 'outs',      icon: '🎲', labelFr: 'Outs',           labelEn: 'Outs',        premium: false },
  { id: 'equity',    icon: '⚖️', labelFr: 'Équité',         labelEn: 'Equity',      premium: false },
  { id: 'potodds',   icon: '📊', labelFr: 'Pot Odds',       labelEn: 'Pot Odds',    premium: false },
  { id: 'postflop',  icon: '🃏', labelFr: 'Post-flop',      labelEn: 'Post-flop',   premium: true  },
  { id: 'fullhand',  icon: '🎰', labelFr: 'Main complète',  labelEn: 'Full Hand',   premium: true  },
  { id: 'betsizing', icon: '📐', labelFr: 'Bet Sizing',     labelEn: 'Bet Sizing',  premium: true  },
] as const;

export function Navbar() {
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const t      = useT();
  const isEn   = useLangStore(s => s.lang) === 'en';

  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [dropOpen,     setDropOpen]     = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);

  const dropRef   = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
      if (mobileRef.current && !mobileRef.current.contains(e.target as Node)) setMobileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on route change
  useEffect(() => { setDropOpen(false); setMobileOpen(false); }, [location.pathname, location.search]);

  const isTrainingActive = location.pathname.startsWith('/training');
  const avatarLetter = user?.username?.[0]?.toUpperCase() ?? '?';

  // Shared link style helper
  const linkCls = (active: boolean) =>
    `relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
    ${active ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'}`;

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-felt-dark/95 backdrop-blur-sm border-b border-felt-900">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">

          {/* ── Logo ── */}
          <Link to="/" className="flex items-center gap-2 font-bold text-xl shrink-0">
            <span className="text-2xl">🃏</span>
            <span className="text-gold-400 font-serif hidden sm:block">PokerTrainer</span>
          </Link>

          {/* ── Desktop nav (hidden below lg) ── */}
          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center">

            {/* Home */}
            <Link to="/" className={linkCls(location.pathname === '/')}>
              <Home size={16} /><span>{t.nav.home}</span>
            </Link>

            {/* Rules */}
            <Link to="/rules" className={linkCls(location.pathname.startsWith('/rules'))}>
              <span className="text-sm">📚</span>
              <span>{isEn ? 'Rules' : 'Règles'}</span>
            </Link>

            {/* Glossary */}
            <Link to="/glossary" className={linkCls(location.pathname.startsWith('/glossary'))}>
              <span className="text-sm">📖</span>
              <span>{isEn ? 'Glossary' : 'Lexique'}</span>
            </Link>

            {/* Training dropdown */}
            <div className="relative" ref={dropRef}>
              <button
                onClick={() => setDropOpen(v => !v)}
                className={linkCls(isTrainingActive)}
              >
                <BookOpen size={16} />
                <span>{t.nav.training}</span>
                <ChevronDown size={12} className={`transition-transform duration-200 ${dropOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {dropOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0,  scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.14 }}
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden py-2"
                  >
                    <ModuleList user={user} isEn={isEn} location={location} isTrainingActive={isTrainingActive} onClose={() => setDropOpen(false)} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Stats */}
            <Link to="/stats" className={linkCls(location.pathname.startsWith('/stats'))}>
              <BarChart2 size={16} /><span>{t.nav.stats}</span>
            </Link>

            {/* Leaderboard */}
            <Link to="/leaderboard" className={linkCls(location.pathname.startsWith('/leaderboard'))}>
              <Trophy size={16} /><span>{t.nav.leaderboard}</span>
            </Link>
          </nav>

          {/* ── Right side ── */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Tutorial — desktop only */}
            <button
              onClick={() => setTutorialOpen(true)}
              className="hidden lg:flex items-center gap-1 text-xs text-gray-500 hover:text-gold-400 transition-colors px-2 py-1 rounded-lg hover:bg-gray-800"
              title={t.nav.tutorial}
            >
              <BookOpen size={13} /><span>{t.nav.tutorial}</span>
            </button>

            <ModeToggle />
            <LanguageToggle />

            {/* User avatar — always visible */}
            {user ? (
              <>
                <Link to="/profile" className="flex items-center gap-1.5 group ml-1" title={isEn ? 'My profile' : 'Mon profil'}>
                  <div className="relative">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gold-500 to-gold-700 flex items-center justify-center text-xs font-black text-gray-900 shadow group-hover:ring-2 group-hover:ring-gold-400 transition-all">
                      {avatarLetter}
                    </div>
                    {user.isPremium && (
                      <div className="absolute -top-2 -right-1 text-yellow-400" style={{ fontSize: 11, lineHeight: 1 }}>
                        <Crown size={11} fill="currentColor" />
                      </div>
                    )}
                  </div>
                  <span className="hidden xl:block text-sm font-medium text-gold-400 group-hover:text-gold-300 transition-colors">
                    {user.username}
                  </span>
                </Link>
                {/* Logout — desktop only */}
                <button
                  onClick={logout}
                  className="hidden lg:flex p-1.5 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                  title={isEn ? 'Sign out' : 'Déconnexion'}
                >
                  <LogOut size={16} />
                </button>
              </>
            ) : (
              <Link to="/login" className="hidden lg:flex text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors ml-1">
                {t.nav.login}
              </Link>
            )}

            {/* ── Hamburger (shown below lg) ── */}
            <div className="lg:hidden relative ml-1" ref={mobileRef}>
              <button
                onClick={() => setMobileOpen(v => !v)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Menu"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>

              <AnimatePresence>
                {mobileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0,  scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-2 w-64 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden py-2"
                  >
                    {/* Main nav links */}
                    <MobileNavLink to="/" icon={<Home size={15} />} label={t.nav.home} active={location.pathname === '/'} />
                    <MobileNavLink to="/rules" icon={<span>📚</span>} label={isEn ? 'Rules' : 'Règles'} active={location.pathname.startsWith('/rules')} />
                    <MobileNavLink to="/glossary" icon={<span>📖</span>} label={isEn ? 'Glossary' : 'Lexique'} active={location.pathname.startsWith('/glossary')} />
                    <MobileNavLink to="/stats" icon={<BarChart2 size={15} />} label={t.nav.stats} active={location.pathname.startsWith('/stats')} />
                    <MobileNavLink to="/leaderboard" icon={<Trophy size={15} />} label={t.nav.leaderboard} active={location.pathname.startsWith('/leaderboard')} />

                    {/* Training section */}
                    <div className="mx-3 my-1.5 border-t border-gray-800" />
                    <p className="px-3 py-1 text-[10px] font-bold text-gray-600 uppercase tracking-wider flex items-center gap-1">
                      <BookOpen size={9} /> {t.nav.training}
                    </p>
                    <ModuleList user={user} isEn={isEn} location={location} isTrainingActive={isTrainingActive} onClose={() => setMobileOpen(false)} />

                    {/* Bottom actions */}
                    <div className="mx-3 my-1.5 border-t border-gray-800" />
                    <button
                      onClick={() => { setTutorialOpen(true); setMobileOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                    >
                      <BookOpen size={15} />{t.nav.tutorial}
                    </button>

                    {user ? (
                      <button
                        onClick={() => { logout(); setMobileOpen(false); }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-gray-800 transition-colors"
                      >
                        <LogOut size={15} />{isEn ? 'Sign out' : 'Déconnexion'}
                      </button>
                    ) : (
                      <Link
                        to="/login"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 text-sm text-gold-400 hover:text-gold-300 hover:bg-gray-800 transition-colors"
                      >
                        {t.nav.login}
                      </Link>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Tutorial modal */}
      <AnimatePresence>
        {tutorialOpen && <Tutorial onClose={() => setTutorialOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

// ─── Shared module list (used in both desktop dropdown + mobile menu) ─────────
function ModuleList({ user, isEn, location, isTrainingActive, onClose }: {
  user: any; isEn: boolean; location: any; isTrainingActive: boolean; onClose: () => void;
}) {
  return (
    <>
      <p className="px-3 pt-1 pb-1.5 text-[10px] font-bold text-gray-600 uppercase tracking-wider">
        {isEn ? 'Free' : 'Gratuit'}
      </p>
      {MODULES.filter(m => !m.premium).map(mod => {
        const label    = isEn ? mod.labelEn : mod.labelFr;
        const isActive = location.search.includes(`module=${mod.id}`) && isTrainingActive;
        return (
          <Link
            key={mod.id}
            to={`/training?module=${mod.id}`}
            onClick={onClose}
            className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
              isActive ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="text-base leading-none">{mod.icon}</span>
            <span className="flex-1">{label}</span>
          </Link>
        );
      })}

      <div className="mx-3 my-1.5 border-t border-gray-800" />

      <p className="px-3 pb-1.5 text-[10px] font-bold text-yellow-700 uppercase tracking-wider flex items-center gap-1">
        <Crown size={9} className="text-yellow-600" /> Premium
      </p>
      {MODULES.filter(m => m.premium).map(mod => {
        const label    = isEn ? mod.labelEn : mod.labelFr;
        const isLocked = !user?.isPremium;
        const isActive = location.search.includes(`module=${mod.id}`) && isTrainingActive;
        return (
          <Link
            key={mod.id}
            to={`/training?module=${mod.id}`}
            onClick={onClose}
            className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-white/10 text-white'
                : isLocked
                  ? 'text-gray-500 hover:bg-gray-800/60 hover:text-gray-400'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="text-base leading-none">{mod.icon}</span>
            <span className="flex-1">{label}</span>
            {isLocked
              ? <Lock size={11} className="text-yellow-700 shrink-0" />
              : <Crown size={10} className="text-yellow-500 shrink-0 opacity-60" />
            }
          </Link>
        );
      })}

      {!user && (
        <>
          <div className="mx-3 my-1.5 border-t border-gray-800" />
          <Link
            to="/login"
            onClick={onClose}
            className="flex items-center justify-center gap-1.5 mx-2 mb-1 py-1.5 rounded-lg bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 text-xs font-semibold transition-colors"
          >
            {isEn ? 'Log in for Premium' : 'Connexion pour le Premium'}
          </Link>
        </>
      )}
    </>
  );
}

// ─── Mobile nav link helper ───────────────────────────────────────────────────
function MobileNavLink({ to, icon, label, active }: {
  to: string; icon: React.ReactNode; label: string; active: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
        active ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
      }`}
    >
      <span className="w-4 flex items-center justify-center shrink-0">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
