import { describe, it, expect } from 'vitest';
import {
  checkDatabaseHealth,
  resetDatabase,
  getFromIndexedDB,
  setToIndexedDB,
  migrateFromLocalStorage,
  migrateToOptimizedSchema,
  checkAndMigrateSchema,
  getSettings,
  updateSettings,
  getSelections,
  getChapter,
  getVerse,
  DB_NAME,
  LEGACY_STORE,
  STATE_KEY,
  STORAGE_KEY,
  SELECTIONS_KEY,
} from '../src/database.js';

const createLegacyStore = async () => {
  await new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(LEGACY_STORE)) {
        db.createObjectStore(LEGACY_STORE);
      }
    };
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
};

const buildLegacyState = () => ({
  version: 2,
  year: '2024-2025',
  activeSelector: 'verse',
  minBlanks: 2,
  maxBlanks: 6,
  maxBlankPercentage: 75,
  useOnlyPercentage: true,
  fillInBlankPercentage: 80,
  activeChapters: ['1,1'],
  verseSelections: {
    '1,1': { allSelected: true, selectedVerses: [] },
  },
  chapterIndex: {
    '1,1': {
      status: undefined,
      lastUpdated: '2024-01-01T00:00:00.000Z',
      verseIds: ['1,1,1'],
    },
  },
  verseBank: {
    '1,1,1': {
      bookId: 1,
      chapter: 1,
      verse: 1,
      text: 'In the beginning.',
      source: 'test',
    },
  },
});

const createLocalStorage = () => {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
};

describe('Database migration helpers', () => {
  it('stores and retrieves legacy values', async () => {
    await createLegacyStore();
    const payload = { foo: 'bar' };
    await setToIndexedDB(STATE_KEY, payload);
    const restored = await getFromIndexedDB(STATE_KEY);
    expect(restored).toEqual(payload);
  });

  it('returns null when IndexedDB is unavailable', async () => {
    const originalIndexedDB = globalThis.indexedDB;
    globalThis.indexedDB = undefined;

    const result = await getFromIndexedDB('missing');

    expect(result).toBeNull();
    expect(console.warn).toHaveBeenCalled();
    globalThis.indexedDB = originalIndexedDB;
  });

  it('throws when IndexedDB is unavailable on set', async () => {
    const originalIndexedDB = globalThis.indexedDB;
    globalThis.indexedDB = undefined;

    await expect(setToIndexedDB('key', { value: true })).rejects.toBeDefined();

    globalThis.indexedDB = originalIndexedDB;
  });

  it('migrates localStorage data to IndexedDB', async () => {
    await createLegacyStore();
    const state = buildLegacyState();
    const originalLocalStorage = globalThis.localStorage;
    globalThis.localStorage = createLocalStorage();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStorage.setItem(SELECTIONS_KEY, JSON.stringify({ foo: 'bar' }));

    const migrated = await migrateFromLocalStorage();

    expect(migrated).toEqual(state);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(SELECTIONS_KEY)).toBeNull();

    const stored = await getFromIndexedDB(STATE_KEY);
    expect(stored).toEqual(state);

    globalThis.localStorage = originalLocalStorage;
  });

  it('migrates legacy state into optimized schema', async () => {
    await createLegacyStore();
    const legacy = buildLegacyState();
    await setToIndexedDB(STATE_KEY, { stale: true });

    const migrated = await migrateToOptimizedSchema(legacy, {
      stateVersion: 9,
      statusNotDownloaded: 'pending',
    });

    expect(migrated).toBe(true);

    const settings = await getSettings();
    expect(settings.version).toBe(9);
    expect(settings.year).toBe('2024-2025');
    expect(settings.fillInBlankPercentage).toBe(80);

    const selections = await getSelections();
    expect(selections.activeChapters).toEqual(['1,1']);

    const chapter = await getChapter('1,1');
    expect(chapter.status).toBe('pending');
    expect(chapter.verseCount).toBe(1);

    const verse = await getVerse('1,1,1');
    expect(verse.text).toBe('In the beginning.');

    const legacyValue = await getFromIndexedDB(STATE_KEY);
    expect(legacyValue).toBeUndefined();
  });

  it('skips migration when settings already exist', async () => {
    await updateSettings({ version: 1, year: '2024-2025' });
    const migrated = await checkAndMigrateSchema();
    expect(migrated).toBe(false);
  });

  it('migrates from legacy store when needed', async () => {
    await createLegacyStore();
    await setToIndexedDB(STATE_KEY, buildLegacyState());

    const migrated = await checkAndMigrateSchema({ stateVersion: 3 });

    expect(migrated).toBe(true);
    const settings = await getSettings();
    expect(settings.version).toBe(3);
  });

  it('migrates from localStorage when legacy store is empty', async () => {
    await createLegacyStore();
    const originalLocalStorage = globalThis.localStorage;
    globalThis.localStorage = createLocalStorage();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(buildLegacyState()));

    const migrated = await checkAndMigrateSchema({ stateVersion: 4 });

    expect(migrated).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    globalThis.localStorage = originalLocalStorage;
  });

  it('returns false when no migration sources are available', async () => {
    await createLegacyStore();
    const originalLocalStorage = globalThis.localStorage;
    globalThis.localStorage = createLocalStorage();

    const migrated = await checkAndMigrateSchema();

    expect(migrated).toBe(false);
    globalThis.localStorage = originalLocalStorage;
  });

  it('throws when migration receives an invalid state payload', async () => {
    await expect(migrateToOptimizedSchema(null)).rejects.toBeDefined();
  });

  it('handles health check failures', async () => {
    const originalIndexedDB = globalThis.indexedDB;
    globalThis.indexedDB = undefined;

    const healthy = await checkDatabaseHealth();

    expect(healthy).toBe(false);
    globalThis.indexedDB = originalIndexedDB;
  });

  it('detects missing stores in health check', async () => {
    await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 3);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      };
      request.onsuccess = () => {
        request.result.close();
        resolve();
      };
      request.onerror = () => reject(request.error);
    });

    const healthy = await checkDatabaseHealth();

    expect(healthy).toBe(false);
  });

  it('resets the database', async () => {
    await updateSettings({ version: 1, year: '2024-2025' });
    await resetDatabase();

    const settings = await getSettings();
    expect(settings).toBeNull();
  });
});
