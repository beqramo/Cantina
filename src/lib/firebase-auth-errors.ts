import { FirebaseError } from 'firebase/app';

/**
 * Maps Firebase Auth errors to short user-facing messages (English; callers can localize later).
 */
export function mapFirebaseAuthError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.';
      default:
        return err.message || 'Authentication failed.';
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Authentication failed.';
}
