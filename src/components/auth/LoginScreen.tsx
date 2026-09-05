import React, { useState } from 'react';
import { AlertCircle, Loader2, LogIn, Truck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(
        err instanceof Error && err.message.toLowerCase().includes('invalid')
          ? 'Incorrect email or password.'
          : 'Sign in failed. Please try again.',
      );
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <Truck className="w-7 h-7" />
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            LogiFlow
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Logistics &amp; Inventory Management
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 space-y-4"
        >
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/30 transition-colors cursor-pointer"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            <span>{busy ? 'Signing in…' : 'Sign In'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
