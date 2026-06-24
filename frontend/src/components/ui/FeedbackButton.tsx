import { useState, useRef, useEffect } from 'react';
import { MessageSquarePlus, X, Send, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import api from '../../services/api';

type Status = 'idle' | 'sending' | 'success' | 'error';

export function FeedbackButton() {
  const user = useAuthStore(s => s.user);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && textareaRef.current) textareaRef.current.focus();
    if (!open) { setStatus('idle'); setMessage(''); setErrorMsg(''); }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || status === 'sending') return;
    setStatus('sending');
    setErrorMsg('');
    try {
      await api.post('/feedback', {
        message,
        email: user?.email || email,
        name: user?.username || name,
      });
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMsg(err?.response?.data?.error || 'Erreur lors de l\'envoi.');
    }
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg shadow-blue-900/40 transition-all hover:scale-105 active:scale-95"
        aria-label="Donner un retour"
      >
        <MessageSquarePlus size={16} />
        <span>Retour</span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          {/* Modal */}
          <div className="w-full max-w-md bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <div>
                <h2 className="text-white font-semibold text-base">Donner un retour</h2>
                <p className="text-gray-400 text-xs mt-0.5">Ton avis nous aide à améliorer PokerPeak</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-gray-300 transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>

            {status === 'success' ? (
              <div className="flex flex-col items-center gap-3 py-10 px-6 text-center">
                <CheckCircle size={40} className="text-green-400" />
                <p className="text-white font-medium">Merci pour ton retour !</p>
                <p className="text-gray-400 text-sm">On en prend bonne note 🙏</p>
                <button
                  onClick={() => setOpen(false)}
                  className="mt-2 px-5 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                >
                  Fermer
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
                {/* Name + email only if not logged in */}
                {!user && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Prénom</label>
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Optionnel"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Email</label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="Optionnel"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                )}

                {/* Message */}
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Message *</label>
                  <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Un bug, une suggestion, une idée… tout est le bienvenu !"
                    rows={5}
                    maxLength={2000}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <div className="text-right text-xs text-gray-600 mt-0.5">{message.length}/2000</div>
                </div>

                {errorMsg && (
                  <p className="text-red-400 text-sm">{errorMsg}</p>
                )}

                <button
                  type="submit"
                  disabled={!message.trim() || status === 'sending'}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
                >
                  {status === 'sending' ? (
                    <span className="animate-pulse">Envoi…</span>
                  ) : (
                    <>
                      <Send size={14} />
                      Envoyer
                    </>
                  )}
                </button>

                {user && (
                  <p className="text-center text-xs text-gray-600">
                    Envoyé en tant que <span className="text-gray-400">{user.username}</span>
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
