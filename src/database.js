/**
 * IndexedDB operations for PBE Practice Engine
 */

export const DB_NAME = 'PBEDatabase';
export const DB_VERSION = 2;
export const STORE_SETTINGS = 'settings';
export const STORE_SELECTIONS = 'selections';
export const STORE_CHAPTERS = 'chapters';
export const STORE_VERSES = 'verses';
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

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

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
    };
  });
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
        resolve(request.result || []);
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
