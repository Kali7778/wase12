import React from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { LoginScreen } from './LoginScreen';

/**
 * Entry gate for the application.
 *
 *   loading              → spinner
 *   not signed in        → LoginScreen
 *   signed in as viewer  → "awaiting access" (new users default to viewer)
 *   everything in order  → children
 *
 * This is presentation only. Real security lives in the database — RLS policies
 * and the role checks inside the RPC functions. Bypassing this gate grants no data.
 */
export const AuthGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, session, profile, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!session) return <LoginScreen />;

  // Signed in, but the profile is missing or the account has been deactivated.
  if (!profile?.isActive) {
    return (
      <AccessNotice
        title={profile ? 'Account Deactivated' : 'Profile Not Found'}
        message={
          profile
            ? 'Your account has been deactivated. Please contact your manager.'
            : 'Your user profile was not found in the database. Please contact your manager.'
        }
        onSignOut={signOut}
      />
    );
  }

  // New users are created as `viewer`, which carries no permissions.
  if (profile.role === 'viewer') {
    return (
      <AccessNotice
        title="Awaiting Access"
        message="Your account has been created but no role has been assigned yet. Please ask your manager to assign you a role."
        onSignOut={signOut}
      />
    );
  }

  return <>{children}</>;
};

const AccessNotice: React.FC<{
  title: string;
  message: string;
  onSignOut: () => void;
}> = ({ title, message, onSignOut }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 p-4">
    <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 text-center space-y-4">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <div>
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">{message}</p>
      </div>
      <button
        onClick={onSignOut}
        className="w-full px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
      >
        Sign Out
      </button>
    </div>
  </div>
);
