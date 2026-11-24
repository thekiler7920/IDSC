import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyThemeToDocument,
  getNextTheme,
  persistTheme,
  resolveInitialTheme,
  THEME_STORAGE_KEY,
  type StorageLike,
} from './theme';

function createMemoryStorage(initial: Record<string, string> = {}): StorageLike {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}

test('resolveInitialTheme defaults to light when storage is empty or missing', () => {
  assert.equal(resolveInitialTheme(null), 'light');
  assert.equal(resolveInitialTheme(createMemoryStorage()), 'light');
});

test('resolveInitialTheme ignores invalid stored values and falls back to light', () => {
  const storage = createMemoryStorage({ [THEME_STORAGE_KEY]: 'solarized' });
  assert.equal(resolveInitialTheme(storage), 'light');
});

test('resolveInitialTheme restores valid light or dark preference', () => {
  assert.equal(
    resolveInitialTheme(createMemoryStorage({ [THEME_STORAGE_KEY]: 'dark' })),
    'dark',
  );
  assert.equal(
    resolveInitialTheme(createMemoryStorage({ [THEME_STORAGE_KEY]: 'light' })),
    'light',
  );
});

test('resolveInitialTheme handles storage read errors safely', () => {
  const brokenStorage: StorageLike = {
    getItem: () => {
      throw new Error('SecurityError');
    },
    setItem: () => {},
  };
  assert.equal(resolveInitialTheme(brokenStorage), 'light');
});

test('getNextTheme alternates cleanly between light and dark', () => {
  assert.equal(getNextTheme('light'), 'dark');
  assert.equal(getNextTheme('dark'), 'light');
});

test('persistTheme stores choice and handles write errors safely', () => {
  const storage = createMemoryStorage();
  assert.equal(persistTheme('dark', storage), true);
  assert.equal(resolveInitialTheme(storage), 'dark');

  const brokenStorage: StorageLike = {
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceededError');
    },
  };
  assert.equal(persistTheme('dark', brokenStorage), false);
});

test('applyThemeToDocument toggles dark class and colorScheme on target element', () => {
  const classes = new Set<string>();
  const mockRoot = {
    classList: {
      toggle: (token: string, force?: boolean) => {
        if (force) {
          classes.add(token);
          return true;
        }
        classes.delete(token);
        return false;
      },
    },
    style: { colorScheme: '' },
  } as unknown as HTMLElement;

  applyThemeToDocument('dark', mockRoot);
  assert.equal(classes.has('dark'), true);
  assert.equal(mockRoot.style.colorScheme, 'dark');

  applyThemeToDocument('light', mockRoot);
  assert.equal(classes.has('dark'), false);
  assert.equal(mockRoot.style.colorScheme, 'light');
});
