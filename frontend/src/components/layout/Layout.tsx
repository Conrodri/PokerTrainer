import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Navbar } from './Navbar';
import { Footer } from './Footer';
import { useThemeStore, BG_THEMES, TABLE_COLORS } from '../../store/themeStore';
import { useShallow } from 'zustand/react/shallow';

export function Layout({ children }: { children: ReactNode }) {
  const { bgTheme, tableColor } = useThemeStore(useShallow(s => ({ bgTheme: s.bgTheme, tableColor: s.tableColor })));

  // Sync CSS custom properties whenever theme changes
  useEffect(() => {
    const bg    = BG_THEMES[bgTheme];
    const table = TABLE_COLORS[tableColor];
    const root  = document.documentElement;
    root.style.setProperty('--app-bg',       bg.bg);
    root.style.setProperty('--table-center', table.center);
    root.style.setProperty('--table-mid',    table.mid);
    root.style.setProperty('--table-edge',   table.edge);
  }, [bgTheme, tableColor]);

  const navigate  = useNavigate();
  const { pathname } = useLocation();
  // /training manages its own back button (placed below the module tabs)
  const showBack = pathname !== '/' && pathname !== '/training';

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ backgroundColor: BG_THEMES[bgTheme].bg }}>
      <Navbar />
      {showBack && (
        <div className="fixed top-14 left-0 right-0 z-30 bg-felt-dark/95 backdrop-blur-sm border-b border-felt-900/60">
          <div className="max-w-7xl mx-auto px-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors py-1.5 group"
            >
              <ChevronLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>Retour</span>
            </button>
          </div>
        </div>
      )}
      <main className={showBack ? 'pt-[84px]' : 'pt-14'}>
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}
