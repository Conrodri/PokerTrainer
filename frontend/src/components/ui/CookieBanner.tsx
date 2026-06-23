import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

const STORAGE_KEY = 'cookie_consent';

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(t);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <Cookie size={18} className="text-gold-400 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-300 leading-relaxed">
              Ce site utilise uniquement des cookies techniques nécessaires à son fonctionnement
              (session, préférences). Aucun cookie publicitaire.{' '}
              <Link to="/privacy" className="text-blue-400 hover:underline">
                En savoir plus
              </Link>
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={accept}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition-colors"
              >
                OK, j'ai compris
              </button>
            </div>
          </div>
          <button onClick={accept} className="text-gray-500 hover:text-gray-300 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
