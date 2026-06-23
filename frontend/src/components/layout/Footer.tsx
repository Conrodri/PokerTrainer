import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-gray-800/60 mt-16 py-6">
      <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600">
        <span>© {new Date().getFullYear()} PokerPeak — Formation au poker</span>
        <div className="flex gap-4">
          <Link to="/cgu"     className="hover:text-gray-400 transition-colors">CGU</Link>
          <Link to="/privacy" className="hover:text-gray-400 transition-colors">Confidentialité</Link>
          <a href="mailto:contact@pokerpeak.fr" className="hover:text-gray-400 transition-colors">Contact</a>
        </div>
      </div>
    </footer>
  );
}
