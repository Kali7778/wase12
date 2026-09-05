import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { userService } from '../services/MasterDataService';
import { atLeast, hasRole, type UserRole } from '../models/base';
import type { AppUser } from '../models/masterData';

interface AuthContextValue {
  session: Session | null;
  profile: AppUser | null;
  role: UserRole | null;
  loading: boolean;
  /** Signed in, profile loaded, and the account is active. */
  isReady: boolean;
  signIn(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  refreshProfile(): Promise<void>;
  /** UI-only helper for showing or hiding controls. Real security lives in the database. */
  can(...allowed: UserRole[]): boolean;
  canAtLeast(minimum: UserRole): boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string | undefined) => {
    if (!userId) {
      setProfile(null);
      return;
    }
    try {
      setProfile(await userService.findById(userId));
    } catch {
      // Blocked by RLS or a network failure — treat the user as signed out.
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      if (active) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!active) return;
      // The profile lookup is a second round trip. Hold the loading state until
      // it settles, or the gate sees a session with no profile and reports the
      // account as missing.
      setLoading(true);
      setSession(next);
      await loadProfile(next?.user.id);
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user.id);
  }, [loadProfile, session?.user.id]);

  const value = useMemo<AuthContextValue>(() => {
    const role = profile?.isActive ? profile.role : null;
    return {
      session,
      profile,
      role,
      loading,
      isReady: Boolean(session && profile?.isActive),
      signIn,
      signOut,
      refreshProfile,
      can: (...allowed: UserRole[]) => hasRole(role, ...allowed),
      canAtLeast: (minimum: UserRole) => atLeast(role, minimum),
    };
  }, [session, profile, loading, signIn, signOut, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
