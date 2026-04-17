'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { auth } from '@/lib/firebase-client';
import { onAuthStateChanged, type User } from 'firebase/auth';

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  authError: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthError(null);

      void (async () => {
        try {
          if (nextUser) {
            const token = await nextUser.getIdToken();
            const cookieValue = `firebase-auth-token=${token}; path=/; max-age=3600; SameSite=Lax`;
            document.cookie = cookieValue;
          } else {
            document.cookie =
              'firebase-auth-token=; path=/; max-age=0; SameSite=Lax';
          }
        } catch (e) {
          console.error('[Auth] Token/cookie sync failed:', e);
          setAuthError(
            e instanceof Error ? e.message : 'Could not refresh session',
          );
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => unsubscribe();
  }, []);

  const value = useMemo(
    (): AuthContextValue => ({ user, loading, authError }),
    [user, loading, authError],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
