/**
 * IndexedDB operations for PBE Practice Engine
 */

export const DB_NAME = 'PBEDatabase';
export const DB_VERSION = 4;
export const STORE_SETTINGS = 'settings';
export const STORE_SELECTIONS = 'selections';
export const STORE_CHAPTERS = 'chapters';
export const STORE_VERSES = 'verses';
export const STORE_PRESETS = 'presets';
export const LEGACY_STORE = 'appState';
export const STATE_KEY = 'currentState';
export const STORAGE_KEY = 'pbeSettings';
export const SELECTIONS_KEY = 'pbeSelections';
export const SETTINGS_KEY = 'userSettings';
export const SELECTIONS_STORE_KEY = 'currentSelections';

/**
 * Opens the IndexedDB database
 * @returns {Promise<IDBDatabase>} Database instance
 */
export const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onblocked = () => {
      console.warn('Database upgrade blocked - please close all other tabs with this app');
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      try {
        if (oldVersion < 2) {
          // Settings store - simple key-value
          if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
            db.createObjectStore(STORE_SETTINGS);
          }

          // Selections store - simple key-value
          if (!db.objectStoreNames.contains(STORE_SELECTIONS)) {
            db.createObjectStore(STORE_SELECTIONS);
          }

          // Chapters store - indexed by chapterKey
          if (!db.objectStoreNames.contains(STORE_CHAPTERS)) {
            const chapterStore = db.createObjectStore(STORE_CHAPTERS, { keyPath: 'chapterKey' });
            chapterStore.createIndex('bookId', 'bookId', { unique: false });
            chapterStore.createIndex('status', 'status', { unique: false });
            chapterStore.createIndex('lastUpdated', 'lastUpdated', { unique: false });
          }

          // Verses store - indexed by verseId
          if (!db.objectStoreNames.contains(STORE_VERSES)) {
            const verseStore = db.createObjectStore(STORE_VERSES, { keyPath: 'verseId' });
            verseStore.createIndex('chapterKey', 'chapterKey', { unique: false });
            verseStore.createIndex('bookId', 'bookId', { unique: false });
            verseStore.createIndex('bookChapter', ['bookId', 'chapter'], { unique: false });
          }
        }

        if (oldVersion < 4) {
          if (!db.objectStoreNames.contains(STORE_PRESETS)) {
            const presetStore = db.createObjectStore(STORE_PRESETS, { keyPath: 'id' });
            presetStore.createIndex('name', 'name', { unique: true });
            presetStore.createIndex('lastModified', 'lastModified', { unique: false });
            presetStore.createIndex('createdAt', 'createdAt', { unique: false });
          }
        }
      } catch (error) {
        console.error('Error during database upgrade:', error);
        throw error;
      }
    };
  });
};

export const checkDatabaseHealth = async () => {
  try {
    const db = await openDatabase();
    const stores = Array.from(db.objectStoreNames);
    db.close();

    const expectedStores = [STORE_SETTINGS, STORE_SELECTIONS, STORE_CHAPTERS, STORE_VERSES, STORE_PRESETS];
    const missingStores = expectedStores.filter(store => !stores.includes(store));

    if (missingStores.length > 0) {
      console.error('Database health check failed - missing stores:', missingStores);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Database health check error:', error);
    return false;
  }
};

export const resetDatabase = async () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => {
      console.warn('Database deletion blocked - please close all other tabs');
    };
  });
};

export const getFromIndexedDB = async (key) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([LEGACY_STORE], 'readonly');
      const store = transaction.objectStore(LEGACY_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('IndexedDB get error:', err);
    return null;
  }
};

export const setToIndexedDB = async (key, value) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([LEGACY_STORE], 'readwrite');
      const store = transaction.objectStore(LEGACY_STORE);
      const request = store.put(value, key);

      request.onsuccess = () => {
        db.close();
        resolve();
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('IndexedDB set error:', err);
    throw err;
  }
};

export const migrateFromLocalStorage = async () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    console.log('Migrating data from localStorage to IndexedDB...');

    await setToIndexedDB(STATE_KEY, parsed);

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SELECTIONS_KEY);

    console.log('Migration complete!');
    return parsed;
  } catch (err) {
    console.warn('Migration from localStorage failed:', err);
    return null;
  }
};

/**
 * Gets settings from database
 * @returns {Promise<Object|null>} Settings object or null
 */
export const getSettings = async () => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_SETTINGS], 'readonly');
      const store = transaction.objectStore(STORE_SETTINGS);
      const request = store.get(SETTINGS_KEY);
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('Error getting settings:', err);
    return null;
  }
};

/**
 * Updates settings in database
 * @param {Object} settings - Settings to save
 * @returns {Promise<void>}
 */
export const updateSettings = async (settings) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_SETTINGS], 'readwrite');
      const store = transaction.objectStore(STORE_SETTINGS);
      const request = store.put(settings, SETTINGS_KEY);
      request.onsuccess = () => {
        db.close();
        resolve();
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('Error updating settings:', err);
    throw err;
  }
};

/**
 * Gets selections from database
 * @returns {Promise<Object|null>} Selections object or null
 */
export const getSelections = async () => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_SELECTIONS], 'readonly');
      const store = transaction.objectStore(STORE_SELECTIONS);
      const request = store.get(SELECTIONS_STORE_KEY);
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('Error getting selections:', err);
    return null;
  }
};

/**
 * Updates selections in database
 * @param {Object} selections - Selections to save
 * @returns {Promise<void>}
 */
export const updateSelections = async (selections) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_SELECTIONS], 'readwrite');
      const store = transaction.objectStore(STORE_SELECTIONS);
      const request = store.put(selections, SELECTIONS_STORE_KEY);
      request.onsuccess = () => {
        db.close();
        resolve();
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('Error updating selections:', err);
    throw err;
  }
};

/**
 * Gets a chapter from database
 * @param {string} chapterKey - Chapter key
 * @returns {Promise<Object|null>} Chapter data or null
 */
export const getChapter = async (chapterKey) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CHAPTERS], 'readonly');
      const store = transaction.objectStore(STORE_CHAPTERS);
      const request = store.get(chapterKey);
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('Error getting chapter:', err);
    return null;
  }
};

/**
 * Gets all chapters from database
 * @returns {Promise<Array>} Array of chapters
 */
export const getAllChapters = async () => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CHAPTERS], 'readonly');
      const store = transaction.objectStore(STORE_CHAPTERS);
      const request = store.getAll();
      request.onsuccess = () => {
        db.close();
        resolve(request.result || []);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('Error getting all chapters:', err);
    return [];
  }
};

/**
 * Saves a chapter to database
 * @param {Object} chapter - Chapter data
 * @returns {Promise<void>}
 */
export const saveChapter = async (chapter) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CHAPTERS], 'readwrite');
      const store = transaction.objectStore(STORE_CHAPTERS);
      const request = store.put(chapter);
      request.onsuccess = () => {
        db.close();
        resolve();
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('Error saving chapter:', err);
    throw err;
  }
};

/**
 * Deletes a chapter from database
 * @param {string} chapterKey - Chapter key
 * @returns {Promise<void>}
 */
export const deleteChapter = async (chapterKey) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CHAPTERS], 'readwrite');
      const store = transaction.objectStore(STORE_CHAPTERS);
      const request = store.delete(chapterKey);
      request.onsuccess = () => {
        db.close();
        resolve();
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('Error deleting chapter:', err);
    throw err;
  }
};

/**
 * Gets a verse from database
 * @param {string} verseId - Verse ID
 * @returns {Promise<Object|null>} Verse data or null
 */
export const getVerse = async (verseId) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_VERSES], 'readonly');
      const store = transaction.objectStore(STORE_VERSES);
      const request = store.get(verseId);
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('Error getting verse:', err);
    return null;
  }
};

/**
 * Gets verses by chapter
 * @param {string} chapterKey - Chapter key
 * @returns {Promise<Array>} Array of verses
 */
export const getVersesByChapter = async (chapterKey) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_VERSES], 'readonly');
      const store = transaction.objectStore(STORE_VERSES);
      const index = store.index('chapterKey');
      const request = index.getAll(chapterKey);
      request.onsuccess = () => {
        db.close();
        const verses = request.result || [];
        // Sort verses numerically by verse number
        verses.sort((a, b) => a.verse - b.verse);
        resolve(verses);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('Error getting verses by chapter:', err);
    return [];
  }
};

export const getVersesByChapters = async (chapterKeys) => {
  try {
    const db = await openDatabase();
    const allVerses = [];

    for (const chapterKey of chapterKeys) {
      const verses = await new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_VERSES], 'readonly');
        const store = transaction.objectStore(STORE_VERSES);
        const index = store.index('chapterKey');
        const request = index.getAll(chapterKey);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
      allVerses.push(...verses);
    }

    db.close();
    return allVerses;
  } catch (err) {
    console.warn('Error getting verses by chapters:', err);
    return [];
  }
};

/**
 * Saves a verse to database
 * @param {Object} verse - Verse data
 * @returns {Promise<void>}
 */
export const saveVerse = async (verse) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_VERSES], 'readwrite');
      const store = transaction.objectStore(STORE_VERSES);
      const request = store.put(verse);
      request.onsuccess = () => {
        db.close();
        resolve();
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('Error saving verse:', err);
    throw err;
  }
};

/**
 * Saves multiple verses to database
 * @param {Array} verses - Array of verse data
 * @returns {Promise<void>}
 */
export const saveVerses = async (verses) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_VERSES], 'readwrite');
      const store = transaction.objectStore(STORE_VERSES);

      let completed = 0;
      const total = verses.length;

      if (total === 0) {
        db.close();
        resolve();
        return;
      }

      verses.forEach((verse) => {
        const request = store.put(verse);
        request.onsuccess = () => {
          completed++;
          if (completed === total) {
            db.close();
            resolve();
          }
        };
        request.onerror = () => {
          db.close();
          reject(request.error);
        };
      });
    });
  } catch (err) {
    console.warn('Error saving verses:', err);
    throw err;
  }
};

/**
 * Deletes verses by chapter
 * @param {string} chapterKey - Chapter key
 * @returns {Promise<void>}
 */
export const deleteVersesByChapter = async (chapterKey) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_VERSES], 'readwrite');
      const store = transaction.objectStore(STORE_VERSES);
      const index = store.index('chapterKey');
      const request = index.openCursor(chapterKey);

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          db.close();
          resolve();
        }
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('Error deleting verses by chapter:', err);
    throw err;
  }
};

/**
 * Gets all presets sorted by last modified
 * @returns {Promise<Array>} Array of presets
 */
export const getAllPresets = async () => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_PRESETS], 'readonly');
      const store = transaction.objectStore(STORE_PRESETS);
      const request = store.getAll();
      request.onsuccess = () => {
        db.close();
        const presets = request.result || [];
        // Sort by explicit order or createdAt ascending
        presets.sort((a, b) => {
          const aOrder = Number.isFinite(a.order) ? a.order : new Date(a.createdAt || 0).getTime();
          const bOrder = Number.isFinite(b.order) ? b.order : new Date(b.createdAt || 0).getTime();
          return aOrder - bOrder;
        });
        resolve(presets);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('Error getting all presets:', err);
    return [];
  }
};

/**
 * Gets a single preset by ID
 * @param {string} id - Preset ID
 * @returns {Promise<Object|null>} Preset or null
 */
export const getPreset = async (id) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_PRESETS], 'readonly');
      const store = transaction.objectStore(STORE_PRESETS);
      const request = store.get(id);
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('Error getting preset:', err);
    return null;
  }
};

/**
 * Gets a preset by name
 * @param {string} name - Preset name
 * @returns {Promise<Object|null>} Preset or null
 */
export const getPresetByName = async (name) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_PRESETS], 'readonly');
      const store = transaction.objectStore(STORE_PRESETS);
      const index = store.index('name');
      const request = index.get(name);
      request.onsuccess = () => {
        db.close();
        resolve(request.result || null);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('Error getting preset by name:', err);
    return null;
  }
};

/**
 * Saves or updates a preset
 * @param {Object} preset - Preset data
 * @returns {Promise<void>}
 */
export const savePreset = async (preset) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_PRESETS], 'readwrite');
      const store = transaction.objectStore(STORE_PRESETS);
      const request = store.put(preset);
      request.onsuccess = () => {
        db.close();
        resolve();
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('Error saving preset:', err);
    throw err;
  }
};

/**
 * Deletes a preset
 * @param {string} id - Preset ID
 * @returns {Promise<void>}
 */
export const deletePreset = async (id) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_PRESETS], 'readwrite');
      const store = transaction.objectStore(STORE_PRESETS);
      const request = store.delete(id);
      request.onsuccess = () => {
        db.close();
        resolve();
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (err) {
    console.warn('Error deleting preset:', err);
    throw err;
  }
};

export const migrateToOptimizedSchema = async (oldState, options = {}) => {
  const stateVersion = options.stateVersion ?? oldState?.version ?? 1;
  const statusNotDownloaded = options.statusNotDownloaded ?? 'not-downloaded';

  console.log('Starting migration to optimized IndexedDB schema...');

  try {
    const settings = {
      version: stateVersion,
      year: oldState.year || '',
      activeSelector: oldState.activeSelector || 'chapter',
      minBlanks: oldState.minBlanks || 1,
      maxBlanks: oldState.maxBlanks || 1,
      maxBlankPercentage: oldState.maxBlankPercentage || 100,
      useOnlyPercentage: oldState.useOnlyPercentage || false,
      fillInBlankPercentage: oldState.fillInBlankPercentage || 100,
      lastUpdated: new Date().toISOString(),
    };
    await updateSettings(settings);
    console.log('✓ Settings migrated');

    const selections = {
      activeChapters: oldState.activeChapters || [],
      verseSelections: oldState.verseSelections || {},
    };
    await updateSelections(selections);
    console.log('✓ Selections migrated');

    const chapters = Object.entries(oldState.chapterIndex || {}).map(([key, data]) => {
      const [bookId, chapter] = key.split(',').map(Number);
      return {
        chapterKey: key,
        bookId,
        chapter,
        status: data.status || statusNotDownloaded,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        verseCount: data.verseIds?.length || 0,
      };
    });

    for (const chapter of chapters) {
      await saveChapter(chapter);
    }
    console.log(`✓ ${chapters.length} chapters migrated`);

    const verses = Object.entries(oldState.verseBank || {}).map(([id, verse]) => ({
      verseId: id,
      chapterKey: `${verse.bookId},${verse.chapter}`,
      bookId: verse.bookId,
      chapter: verse.chapter,
      verse: verse.verse,
      text: verse.text,
      source: verse.source,
      downloadedAt: new Date().toISOString(),
    }));

    await saveVerses(verses);
    console.log(`✓ ${verses.length} verses migrated`);

    const db = await openDatabase();
    if (db.objectStoreNames.contains(LEGACY_STORE)) {
      await new Promise((resolve, reject) => {
        const transaction = db.transaction([LEGACY_STORE], 'readwrite');
        const store = transaction.objectStore(LEGACY_STORE);
        const request = store.delete(STATE_KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
    db.close();

    console.log('✓ Migration to optimized schema complete!');
    return true;
  } catch (err) {
    console.error('Migration to optimized schema failed:', err);
    throw err;
  }
};

export const checkAndMigrateSchema = async (options = {}) => {
  try {
    const settings = await getSettings();
    if (settings) {
      return false;
    }

    const oldData = await getFromIndexedDB(STATE_KEY);
    if (oldData) {
      await migrateToOptimizedSchema(oldData, options);
      return true;
    }

    const localStorageData = await migrateFromLocalStorage();
    if (localStorageData) {
      await migrateToOptimizedSchema(localStorageData, options);
      return true;
    }

    return false;
  } catch (err) {
    console.warn('Schema migration check failed:', err);
    return false;
  }
};
