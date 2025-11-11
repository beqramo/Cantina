'use client';

import { auth } from '@/lib/firebase-client';
import {
  signInWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import { useEffect, useState } from 'react';

export async function loginAdmin(
  email: string,
  password: string,
): Promise<User> {
  if (!auth) throw new Error('Firebase Auth not initialized');

  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password,
  );

  // Set auth token cookie for server-side verification
  const token = await userCredential.user.getIdToken();
  const cookieValue = `firebase-auth-token=${token}; path=/; max-age=3600; SameSite=Lax`;
  document.cookie = cookieValue;

  console.log('[Auth] Login successful - cookie set:', {
    userId: userCredential.user.uid,
    tokenLength: token.length,
    tokenPreview: `${token.substring(0, 20)}...`,
    cookieSet: true,
  });

  return userCredential.user;
}

export async function logoutAdmin(): Promise<void> {
  if (!auth) throw new Error('Firebase Auth not initialized');
  await signOut(auth);
  // Clear auth token cookie
  document.cookie = 'firebase-auth-token=; path=/; max-age=0; SameSite=Lax';
  console.log('[Auth] Logout successful - cookie cleared');
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        // Update auth token cookie when user is authenticated
        const token = await user.getIdToken();
        const cookieValue = `firebase-auth-token=${token}; path=/; max-age=3600; SameSite=Lax`;
        document.cookie = cookieValue;

        console.log('[Auth] Auth state changed - user authenticated:', {
          userId: user.uid,
          tokenLength: token.length,
          tokenPreview: `${token.substring(0, 20)}...`,
          cookieUpdated: true,
        });
      } else {
        // Clear auth token cookie when user is logged out
        document.cookie =
          'firebase-auth-token=; path=/; max-age=0; SameSite=Lax';
        console.log(
          '[Auth] Auth state changed - user logged out, cookie cleared',
        );
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}
