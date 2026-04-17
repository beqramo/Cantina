'use client';

import { auth } from '@/lib/firebase-client';
import { signInWithEmailAndPassword, signOut, User } from 'firebase/auth';

export { AuthProvider, useAuth } from '@/components/providers/AuthProvider';
export type { AuthContextValue } from '@/components/providers/AuthProvider';

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

  const token = await userCredential.user.getIdToken();
  const cookieValue = `firebase-auth-token=${token}; path=/; max-age=3600; SameSite=Lax`;
  document.cookie = cookieValue;

  return userCredential.user;
}

export async function logoutAdmin(): Promise<void> {
  if (!auth) throw new Error('Firebase Auth not initialized');
  await signOut(auth);
  document.cookie = 'firebase-auth-token=; path=/; max-age=0; SameSite=Lax';
}
