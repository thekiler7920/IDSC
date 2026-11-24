import { BLUEPRINT_CONSTRAINTS } from './validation';

export interface SignInFormErrors {
  email?: string;
  password?: string;
}

export interface RegisterFormInput {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterFormErrors {
  fullName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

export interface MappedAuthError {
  message: string;
  isProviderDisabled: boolean;
}

export function validateSignInForm(
  email: string,
  password: string,
): { valid: boolean; errors: SignInFormErrors } {
  const errors: SignInFormErrors = {};
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    errors.email = 'College email address is required.';
  } else if (
    trimmedEmail.length < BLUEPRINT_CONSTRAINTS.email.min ||
    trimmedEmail.length > BLUEPRINT_CONSTRAINTS.email.max ||
    !BLUEPRINT_CONSTRAINTS.email.pattern.test(trimmedEmail)
  ) {
    errors.email = 'Enter a valid email address (e.g. student@college.edu).';
  }

  if (!password) {
    errors.password = 'Password is required.';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateRegisterForm(
  input: RegisterFormInput,
): { valid: boolean; errors: RegisterFormErrors } {
  const errors: RegisterFormErrors = {};
  const trimmedName = input.fullName.trim();
  const trimmedEmail = input.email.trim();

  if (!trimmedName) {
    errors.fullName = 'Full name is required.';
  } else if (trimmedName.length < 2 || trimmedName.length > 80) {
    errors.fullName = 'Full name must be between 2 and 80 characters.';
  }

  if (!trimmedEmail) {
    errors.email = 'College email address is required.';
  } else if (
    trimmedEmail.length < BLUEPRINT_CONSTRAINTS.email.min ||
    trimmedEmail.length > BLUEPRINT_CONSTRAINTS.email.max ||
    !BLUEPRINT_CONSTRAINTS.email.pattern.test(trimmedEmail)
  ) {
    errors.email = 'Enter a valid email address (e.g. student@college.edu).';
  }

  if (!input.password) {
    errors.password = 'Password is required.';
  } else if (input.password.length < 6) {
    errors.password = 'Password must be at least 6 characters.';
  } else if (input.password.length > 128) {
    errors.password = 'Password must be 128 characters or fewer.';
  }

  if (!input.confirmPassword) {
    errors.confirmPassword = 'Please confirm your password.';
  } else if (input.confirmPassword !== input.password) {
    errors.confirmPassword = 'Passwords do not match.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function mapFirebaseAuthError(error: unknown): MappedAuthError {
  const rawCode =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
  const rawMessage = error instanceof Error ? error.message : String(error ?? '');
  const combined = `${rawCode} ${rawMessage}`.toLowerCase();

  if (combined.includes('auth/operation-not-allowed')) {
    return {
      isProviderDisabled: true,
      message:
        'Email/Password sign-in is not yet enabled in Firebase Console. Enable it under Authentication → Sign-in method → Email/Password, or use Google Sign-In / Demo Mode below.',
    };
  }
  if (combined.includes('auth/email-already-in-use')) {
    return {
      isProviderDisabled: false,
      message: 'An account with this email already exists. Switch to Sign In to access your account.',
    };
  }
  if (
    combined.includes('auth/invalid-credential') ||
    combined.includes('auth/wrong-password') ||
    combined.includes('auth/user-not-found')
  ) {
    return {
      isProviderDisabled: false,
      message: 'Incorrect email or password. Please check your credentials and try again.',
    };
  }
  if (combined.includes('auth/weak-password')) {
    return {
      isProviderDisabled: false,
      message: 'Password is too weak. Choose at least 6 characters.',
    };
  }
  if (combined.includes('auth/invalid-email')) {
    return {
      isProviderDisabled: false,
      message: 'Please enter a valid college email address.',
    };
  }
  if (combined.includes('auth/too-many-requests')) {
    return {
      isProviderDisabled: false,
      message: 'Too many attempts. Please wait a moment before trying again.',
    };
  }
  if (combined.includes('auth/popup-closed-by-user')) {
    return {
      isProviderDisabled: false,
      message: 'Google sign-in popup was closed before completing authentication.',
    };
  }
  if (combined.includes('auth/popup-blocked')) {
    return {
      isProviderDisabled: false,
      message: 'Sign-in popup was blocked by your browser. Allow popups or use Email/Password.',
    };
  }
  if (combined.includes('auth/network-request-failed')) {
    return {
      isProviderDisabled: false,
      message: 'Network error while contacting Firebase Authentication. Check your connection.',
    };
  }

  return {
    isProviderDisabled: false,
    message: rawMessage || 'Authentication failed. Please try again.',
  };
}

export function shouldAutoEnterDemoMode(search: string): boolean {
  try {
    const params = new URLSearchParams(search);
    return params.get('autostart') === '1' || params.get('demo') === '1';
  } catch {
    return false;
  }
}
