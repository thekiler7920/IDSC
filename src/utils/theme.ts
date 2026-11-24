export type ThemeMode = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'campusconnect_theme_v1';

export interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark';
}

export function resolveInitialTheme(storage?: StorageLike | null): ThemeMode {
  if (!storage) {
    return 'light';
  }
  try {
    const stored = storage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : 'light';
  } catch {
    return 'light';
  }
}

export function getNextTheme(current: ThemeMode): ThemeMode {
  return current === 'dark' ? 'light' : 'dark';
}

export function persistTheme(theme: ThemeMode, storage?: StorageLike | null): boolean {
  if (!storage) {
    return false;
  }
  try {
    storage.setItem(THEME_STORAGE_KEY, theme);
    return true;
  } catch {
    return false;
  }
}

export function applyThemeToDocument(theme: ThemeMode, root?: HTMLElement | null): void {
  const target =
    root ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!target) {
    return;
  }
  target.classList.toggle('dark', theme === 'dark');
  target.style.colorScheme = theme;
}

export function getBrowserStorage(): StorageLike | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
