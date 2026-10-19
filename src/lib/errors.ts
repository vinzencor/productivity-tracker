import { FirebaseError } from 'firebase/app'

/** Turns Firebase/unknown errors into a short message that is safe to show in a toast. */
export function errorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'permission-denied':
        return 'You do not have permission to do that.'
      case 'unavailable':
        return 'Network error. Check your connection and try again.'
      default:
        return 'Something went wrong. Please try again.'
    }
  }
  return 'Something went wrong. Please try again.'
}

/** Messages for the HR sign-in form, keyed by Firebase Auth error code. */
export function authErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/invalid-email':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Incorrect email or password.'
      case 'auth/user-disabled':
        return 'This account has been disabled.'
      case 'auth/too-many-requests':
        return 'Too many attempts. Please wait a few minutes and try again.'
      case 'auth/network-request-failed':
        return 'Network error. Check your connection and try again.'
      default:
        return 'Unable to sign in. Please try again.'
    }
  }
  return error instanceof Error ? error.message : 'Unable to sign in. Please try again.'
}
