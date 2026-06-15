import { ReactNode, useEffect } from 'react';
import { Navbar } from './Navbar';
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

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ backgroundColor: BG_THEMES[bgTheme].bg }}>
      <Navbar />
      <main className="pt-14">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
