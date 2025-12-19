const seasonSelect = document.getElementById('year');
const chapterSelector = document.getElementById('chapter-selector');
const optionsContainer = document.getElementById('chapter-options');
const verseOptionsContainer = document.getElementById('verse-options');
const verseSelector = document.getElementById('verse-selector');
const toggleToVerseLink = document.getElementById('toggle-to-verse');
const toggleToChapterLink = document.getElementById('toggle-to-chapter');
const startButton = document.getElementById('start-button');
const selectorsContainer = document.getElementById('selectors-container');
const selectorsContent = document.getElementById('selectors-content');
const selectorsToggle = document.getElementById('selectors-toggle');
const questionArea = document.getElementById('question-area');
const questionTitle = document.getElementById('question-title');
const questionReference = document.getElementById('question-reference');
const questionText = document.getElementById('question-text');
const questionPointsEl = document.getElementById('question-points');
const prevButton = document.getElementById('prev-button');
const nextButton = document.getElementById('next-button');
const answerArea = document.getElementById('answer-area');
const answerTitle = document.getElementById('answer-title');
const answerReference = document.getElementById('answer-reference');
const answerText = document.getElementById('answer-text');
const answerPointsEl = document.getElementById('answer-points');
const answerPrevButton = document.getElementById('answer-prev-button');
const answerNextButton = document.getElementById('answer-next-button');
const hintButton = document.getElementById('hint-button');
const minBlanksInput = document.getElementById('min-blanks');
const maxBlanksInput = document.getElementById('max-blanks');
const maxBlankPercentageInput = document.getElementById('max-blank-percentage');
const blankLimitHint = document.getElementById('blank-limit');

const STORAGE_KEY = 'pbeSettings';
const SELECTIONS_KEY = 'pbeSelections';
const STATE_VERSION = 1;
const STATUS = {
  READY: 'ready',
  DOWNLOADING: 'downloading',
  ERROR: 'error',
  NOT_DOWNLOADED: 'not-downloaded',
  PARTIAL: 'partial', // Some verses downloaded, but not the full chapter
};
const STATE_OF_BEING_WORDS = ['am', 'is', 'are', 'was', 'were', 'be', 'being', 'been'];
const TFIDF_CONFIG = {
  verseWeight: 0.6,        // How much to weight verse-level TF-IDF
  chapterWeight: 0.4,      // How much to weight chapter-level TF-IDF
  tfidfWeight: 0.3,        // How much TF-IDF influences final score
  priorityWeight: 0.7,     // How much priority influences final score
  minWordLength: 2,        // Ignore very short words in TF-IDF
};
const FULL_BIBLE_KEY = 'custom-all';
let storageWritable = true;

// IndexedDB Configuration
const DB_NAME = 'PBEDatabase';
const DB_VERSION = 2; // Incremented for schema change
const STORE_SETTINGS = 'settings';
const STORE_SELECTIONS = 'selections';
const STORE_CHAPTERS = 'chapters';
const STORE_VERSES = 'verses';
const LEGACY_STORE = 'appState'; // Old store for migration
const STATE_KEY = 'currentState'; // Legacy key
const SETTINGS_KEY = 'userSettings';
const SELECTIONS_STORE_KEY = 'currentSelections';

// IndexedDB Helper Functions
const openDatabase = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      const oldVersion = event.oldVersion;

      // Migration from version 1 to version 2
      if (oldVersion < 2) {
        // Create new object stores

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

        // Keep legacy store for migration, will be deleted after migration completes
      }
    };
  });
};

const getFromIndexedDB = async (key) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([LEGACY_STORE], 'readonly');
      const store = transaction.objectStore(LEGACY_STORE);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB get error:', err);
    return null;
  }
};

const setToIndexedDB = async (key, value) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([LEGACY_STORE], 'readwrite');
      const store = transaction.objectStore(LEGACY_STORE);
      const request = store.put(value, key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('IndexedDB set error:', err);
    throw err;
  }
};

const migrateFromLocalStorage = async () => {
  try {
    // Check if we have data in localStorage
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    console.log('Migrating data from localStorage to IndexedDB...');

    // Save to IndexedDB (legacy format, will be migrated to new schema)
    await setToIndexedDB(STATE_KEY, parsed);

    // Clear localStorage after successful migration
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SELECTIONS_KEY);

    console.log('Migration complete!');
    return parsed;
  } catch (err) {
    console.warn('Migration from localStorage failed:', err);
    return null;
  }
};

// New Granular API Functions for Optimized Schema

// Settings API
const getSettings = async () => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_SETTINGS], 'readonly');
      const store = transaction.objectStore(STORE_SETTINGS);
      const request = store.get(SETTINGS_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error getting settings:', err);
    return null;
  }
};

const updateSettings = async (settings) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_SETTINGS], 'readwrite');
      const store = transaction.objectStore(STORE_SETTINGS);
      const request = store.put(settings, SETTINGS_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error updating settings:', err);
    throw err;
  }
};

// Selections API
const getSelections = async () => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_SELECTIONS], 'readonly');
      const store = transaction.objectStore(STORE_SELECTIONS);
      const request = store.get(SELECTIONS_STORE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error getting selections:', err);
    return null;
  }
};

const updateSelections = async (selections) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_SELECTIONS], 'readwrite');
      const store = transaction.objectStore(STORE_SELECTIONS);
      const request = store.put(selections, SELECTIONS_STORE_KEY);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error updating selections:', err);
    throw err;
  }
};

// Chapters API
const getChapter = async (chapterKey) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CHAPTERS], 'readonly');
      const store = transaction.objectStore(STORE_CHAPTERS);
      const request = store.get(chapterKey);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error getting chapter:', err);
    return null;
  }
};

const getAllChapters = async () => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CHAPTERS], 'readonly');
      const store = transaction.objectStore(STORE_CHAPTERS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error getting all chapters:', err);
    return [];
  }
};

const saveChapter = async (chapter) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CHAPTERS], 'readwrite');
      const store = transaction.objectStore(STORE_CHAPTERS);
      const request = store.put(chapter);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error saving chapter:', err);
    throw err;
  }
};

const deleteChapter = async (chapterKey) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_CHAPTERS], 'readwrite');
      const store = transaction.objectStore(STORE_CHAPTERS);
      const request = store.delete(chapterKey);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error deleting chapter:', err);
    throw err;
  }
};

// Verses API
const getVerse = async (verseId) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_VERSES], 'readonly');
      const store = transaction.objectStore(STORE_VERSES);
      const request = store.get(verseId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error getting verse:', err);
    return null;
  }
};

const getVersesByChapter = async (chapterKey) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_VERSES], 'readonly');
      const store = transaction.objectStore(STORE_VERSES);
      const index = store.index('chapterKey');
      const request = index.getAll(chapterKey);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error getting verses by chapter:', err);
    return [];
  }
};

const getVersesByChapters = async (chapterKeys) => {
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

    return allVerses;
  } catch (err) {
    console.warn('Error getting verses by chapters:', err);
    return [];
  }
};

const saveVerse = async (verse) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_VERSES], 'readwrite');
      const store = transaction.objectStore(STORE_VERSES);
      const request = store.put(verse);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error saving verse:', err);
    throw err;
  }
};

const saveVerses = async (verses) => {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_VERSES], 'readwrite');
      const store = transaction.objectStore(STORE_VERSES);

      let completed = 0;
      const total = verses.length;

      verses.forEach(verse => {
        const request = store.put(verse);
        request.onsuccess = () => {
          completed++;
          if (completed === total) resolve();
        };
        request.onerror = () => reject(request.error);
      });

      if (total === 0) resolve();
    });
  } catch (err) {
    console.warn('Error saving verses:', err);
    throw err;
  }
};

const deleteVersesByChapter = async (chapterKey) => {
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
          resolve();
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Error deleting verses by chapter:', err);
    throw err;
  }
};

// Big Bang Migration from Old Schema to New Schema
const migrateToOptimizedSchema = async (oldState) => {
  console.log('Starting migration to optimized IndexedDB schema...');

  try {
    // 1. Migrate settings
    const settings = {
      version: oldState.version || STATE_VERSION,
      year: oldState.year || '',
      activeSelector: oldState.activeSelector || 'chapter',
      minBlanks: oldState.minBlanks || 1,
      maxBlanks: oldState.maxBlanks || 1,
      maxBlankPercentage: oldState.maxBlankPercentage || 100,
      lastUpdated: new Date().toISOString()
    };
    await updateSettings(settings);
    console.log('✓ Settings migrated');

    // 2. Migrate selections
    const selections = {
      activeChapters: oldState.activeChapters || [],
      verseSelections: oldState.verseSelections || {}
    };
    await updateSelections(selections);
    console.log('✓ Selections migrated');

    // 3. Migrate chapters
    const chapters = Object.entries(oldState.chapterIndex || {}).map(([key, data]) => {
      const [bookId, chapter] = key.split(',').map(Number);
      return {
        chapterKey: key,
        bookId: bookId,
        chapter: chapter,
        status: data.status || STATUS.NOT_DOWNLOADED,
        lastUpdated: data.lastUpdated || new Date().toISOString(),
        verseCount: data.verseIds?.length || 0
      };
    });

    for (const chapter of chapters) {
      await saveChapter(chapter);
    }
    console.log(`✓ ${chapters.length} chapters migrated`);

    // 4. Migrate verses
    const verses = Object.entries(oldState.verseBank || {}).map(([id, verse]) => ({
      verseId: id,
      chapterKey: `${verse.bookId},${verse.chapter}`,
      bookId: verse.bookId,
      chapter: verse.chapter,
      verse: verse.verse,
      text: verse.text,
      source: verse.source,
      downloadedAt: new Date().toISOString()
    }));

    // Save verses in batches for better performance
    await saveVerses(verses);
    console.log(`✓ ${verses.length} verses migrated`);

    // 5. Mark migration as complete by deleting old data
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

    console.log('✓ Migration to optimized schema complete!');
    return true;
  } catch (err) {
    console.error('Migration to optimized schema failed:', err);
    throw err;
  }
};

// Check if migration to new schema is needed
const checkAndMigrateSchema = async () => {
  try {
    // Check if we already have data in the new schema
    const settings = await getSettings();
    if (settings) {
      // Already migrated
      return false;
    }

    // Check if we have data in the old schema
    const oldData = await getFromIndexedDB(STATE_KEY);
    if (oldData) {
      // Migrate from old schema
      await migrateToOptimizedSchema(oldData);
      return true;
    }

    // Check if we need to migrate from localStorage
    const localStorageData = await migrateFromLocalStorage();
    if (localStorageData) {
      // Migrate localStorage data to new schema
      await migrateToOptimizedSchema(localStorageData);
      return true;
    }

    // No data to migrate
    return false;
  } catch (err) {
    console.warn('Schema migration check failed:', err);
    return false;
  }
};

const buildPersistableState = (includeVerses = true) => {
  const chapterIndex = {};
  const verseBank = {};
  const allowedChapters = new Set([
    ...(appState.activeChapters || []),
    ...Object.keys(appState.verseSelections || {}),
  ]);

  Object.entries(appState.chapterIndex || {}).forEach(([key, entry]) => {
    if (!entry) return;
    const hasVerses = includeVerses && entry.verseIds?.length && allowedChapters.has(key);
    chapterIndex[key] = {
      status: hasVerses ? entry.status : STATUS.NOT_DOWNLOADED,
      lastUpdated: entry.lastUpdated,
      verseIds: hasVerses ? entry.verseIds : undefined,
    };
    if (hasVerses) {
      allowedChapters.add(key);
    }
  });

  if (includeVerses) {
    Object.entries(appState.verseBank || {}).forEach(([id, verse]) => {
      const chapterKey = `${verse.bookId},${verse.chapter}`;
      if (allowedChapters.has(chapterKey)) {
        verseBank[id] = verse;
      }
    });
  }

  return {
    version: STATE_VERSION,
    year: appState.year,
    activeChapters: appState.activeChapters,
    activeVerseIds: [], // force recompute on load
    verseSelections: appState.verseSelections,
    chapterVerseCounts: appState.chapterVerseCounts,
    activeSelector: appState.activeSelector,
    chapterIndex,
    verseBank: includeVerses ? verseBank : {},
    minBlanks: appState.minBlanks,
    maxBlanks: appState.maxBlanks,
    maxBlankPercentage: appState.maxBlankPercentage,
  };
};

let books = {};

const loadBooksData = async () => {
  if (Object.keys(books).length) return books;
  try {
    const response = await fetch('books.json');
    if (!response.ok && response.status !== 0) {
      throw new Error(`Failed to load books.json: ${response.status}`);
    }
    const text = await response.text();
    books = JSON.parse(text);
  } catch (err) {
    console.error('Unable to load books.json', err);
    throw err;
  }
  return books;
};

let chaptersByYear = {};

const loadChaptersByYear = async () => {
  if (Object.keys(chaptersByYear).length) return chaptersByYear;
  try {
    const response = await fetch('chaptersByYear.json');
    if (!response.ok && response.status !== 0) {
      throw new Error(`Failed to load chaptersByYear.json: ${response.status}`);
    }
    const text = await response.text();
    chaptersByYear = JSON.parse(text);
  } catch (err) {
    console.error('Unable to load chaptersByYear.json', err);
    throw err;
  }
  return chaptersByYear;
};



/**
 * Sorts chapter keys numerically by book ID and chapter number
 * Chapter keys are in format "bookId,chapter" (e.g., "23,1", "23,10", "23,2")
 * Without this, string sorting would put "23,10" before "23,2"
 */
const sortChapterKeys = (chapterKeys) => {
  return chapterKeys.sort((a, b) => {
    const [bookIdA, chapterA] = a.split(',').map(Number);
    const [bookIdB, chapterB] = b.split(',').map(Number);

    // First compare by book ID
    if (bookIdA !== bookIdB) {
      return bookIdA - bookIdB;
    }

    // If same book, compare by chapter number
    return chapterA - chapterB;
  });
};

/**
 * Sorts verse IDs numerically by book ID, chapter, and verse number
 * Verse IDs are in format "bookId,chapter,verse" (e.g., "23,1,1", "23,1,10", "23,1,2")
 * Without this, string sorting would put "23,1,10" before "23,1,2"
 */
const sortVerseIds = (verseIds) => {
  return verseIds.sort((a, b) => {
    const [bookIdA, chapterA, verseA] = a.split(',').map(Number);
    const [bookIdB, chapterB, verseB] = b.split(',').map(Number);

    // First compare by book ID
    if (bookIdA !== bookIdB) {
      return bookIdA - bookIdB;
    }

    // If same book, compare by chapter number
    if (chapterA !== chapterB) {
      return chapterA - chapterB;
    }

    // If same chapter, compare by verse number
    return verseA - verseB;
  });
};

const buildFullBibleSelections = () =>
  Object.keys(books)
    .map((bookKey) => ({
      bookKey,
      bookId: books[bookKey].id,
      start: 1,
      end: books[bookKey].totalChapters,
    }))
    .sort((a, b) => a.bookId - b.bookId);

const getSelectionsForYear = (year) => {
  if (year === FULL_BIBLE_KEY) return buildFullBibleSelections();
  const selections = chaptersByYear[year] || [];
  // Sort selections by book ID to ensure chapters appear in numerical order
  const normalized = selections
    .map((sel) => ({
      ...sel,
      bookId: books[sel.bookKey]?.id || 0,
    }))
    .sort((a, b) => a.bookId - b.bookId);

  // Collapse duplicate chapter entries (partial chapters) into a single entry for chapter view
  const seen = new Set();
  return normalized.filter((sel) => {
    const { bookId, start, end } = sel;
    for (let c = start; c <= end; c += 1) {
      const key = `${bookId},${c}`;
      if (!seen.has(key)) {
        seen.add(key);
        return true;
      }
    }
    return false;
  });
};

// Returns chapters to render, including intro (0) when commentary exists and range includes chapter 1
const chaptersToRender = (meta, start, end) => {
  const chapters = [];
  if (meta?.commentary?.length && start <= 1) {
    chapters.push(0);
  }
  for (let c = start; c <= end; c += 1) {
    chapters.push(c);
  }
  return chapters;
};

const defaultState = {
  version: STATE_VERSION,
  year: '',
  activeChapters: [],
  activeVerseIds: [],
  verseSelections: {},
  chapterVerseCounts: {},
  chapterExclusions: {},
  activeSelector: 'chapter',
  chapterIndex: {},
  verseBank: {},
  verseErrors: {},
  minBlanks: 1,
  maxBlanks: 1,
  tfidfCache: {
    verseLevel: {},
    chapterLevel: {},
  },
  maxBlankPercentage: 100,
};

let appState = { ...defaultState };
let chapterOptions = [];
let bookToggleMap = new Map();
let verseBookToggleMap = new Map();
let verseChapterToggleMap = new Map();
const verseChapterToBook = new Map();
const downloadsInFlight = new Map();
let questionOrder = [];
let questionIndex = 0;
let sessionActive = false;
let questionPointsList = [];
let questionBlanksList = [];
let questionAnswersList = [];
let questionBlankedWordsList = [];
let hintsRevealedList = [];
let compromiseReady = false;
let activeSelector = defaultState.activeSelector; // 'chapter' or 'verse'

const requestPersistentStorage = async () => {
  if (navigator.storage && navigator.storage.persist) {
    try {
      await navigator.storage.persist();
    } catch (err) {
      console.warn('Persistent storage request failed', err);
    }
  }
};

const migrateTFIDFData = (state) => {
  // Migrate verses that were downloaded before TF-IDF system was added
  let migrated = false;
  Object.entries(state.verseBank || {}).forEach(([id, verse]) => {
    if (!verse.termFrequency || !verse.wordList) {
      // This verse needs migration
      const plainText = stripHtml(verse.text || '');
      const words = tokenizeText(plainText);
      verse.termFrequency = calculateTermFrequency(words);
      verse.wordList = Array.from(new Set(words));
      migrated = true;
    }
  });
  if (migrated) {
    console.log('Migrated verse data to include TF-IDF calculations');
  }
  return state;
};

const loadState = async () => {
  try {
    // Check and perform migration if needed
    await checkAndMigrateSchema();

    // Load settings from new schema
    const settings = await getSettings();
    if (!settings) {
      // No data found, return null for fresh start
      return null;
    }

    // Load selections
    const selections = await getSelections();

    // Load all chapters
    const chapters = await getAllChapters();

    // Build chapterIndex from chapters
    const chapterIndex = {};
    const chapterVerseCounts = {};

    chapters.forEach(chapter => {
      chapterIndex[chapter.chapterKey] = {
        status: chapter.status,
        lastUpdated: chapter.lastUpdated,
        verseIds: [] // Will be populated when verses are loaded
      };
      chapterVerseCounts[chapter.chapterKey] = chapter.verseCount;
    });

    // Load verses for all downloaded chapters (not just active ones)
    // This ensures that downloaded chapters remain downloaded even when unselected
    const verseBank = {};
    const downloadedChapters = Object.keys(chapterIndex);
    if (downloadedChapters.length > 0) {
      const verses = await getVersesByChapters(downloadedChapters);
      verses.forEach(verse => {
        verseBank[verse.verseId] = {
          bookId: verse.bookId,
          chapter: verse.chapter,
          verse: verse.verse,
          text: verse.text,
          source: verse.source,
          termFrequency: verse.termFrequency || {},
          wordList: verse.wordList || []
        };

        // Populate verseIds in chapterIndex
        const chapterKey = verse.chapterKey;
        if (chapterIndex[chapterKey] && !chapterIndex[chapterKey].verseIds.includes(verse.verseId)) {
          chapterIndex[chapterKey].verseIds.push(verse.verseId);
        }
      });
    }

    // Sort verseIds numerically for each chapter
    Object.values(chapterIndex).forEach((entry) => {
      if (entry.verseIds?.length) {
        entry.verseIds = sortVerseIds(entry.verseIds);
      }
    });

    // Clear transient/error statuses on load
    Object.entries(chapterIndex).forEach(([key, entry]) => {
      if (entry.status === STATUS.ERROR || entry.status === STATUS.DOWNLOADING) {
        entry.status = undefined;
      }
      if (entry.verseIds?.length) {
        chapterVerseCounts[key] = entry.verseIds.length;
      } else if (entry.status === STATUS.READY) {
        entry.status = STATUS.NOT_DOWNLOADED;
      }
    });

    // Build state object
    const state = {
      ...defaultState,
      version: settings.version || STATE_VERSION,
      year: settings.year || '',
      activeSelector: settings.activeSelector || 'chapter',
      minBlanks: settings.minBlanks || 1,
      maxBlanks: settings.maxBlanks || 1,
      maxBlankPercentage: settings.maxBlankPercentage || 100,
      // Sort activeChapters numerically when loading from database
      activeChapters: sortChapterKeys(selections?.activeChapters || []),
      verseSelections: selections?.verseSelections || {},
      chapterIndex,
      chapterVerseCounts,
      verseBank,
      activeVerseIds: [], // Will be recomputed
      tfidfCache: {
        verseLevel: {},
        chapterLevel: {}
      }
    };

    // Migrate old verses to include TF-IDF data if needed
    migrateTFIDFData(state);

    return state;
  } catch (err) {
    console.warn('Unable to load saved settings', err);
    return null;
  }
};

const saveState = async () => {
  if (!storageWritable) return;
  try {
    // Save settings (small, fast)
    const settings = {
      version: appState.version || STATE_VERSION,
      year: appState.year,
      activeSelector: appState.activeSelector,
      minBlanks: appState.minBlanks,
      maxBlanks: appState.maxBlanks,
      maxBlankPercentage: appState.maxBlankPercentage,
      lastUpdated: new Date().toISOString()
    };
    await updateSettings(settings);

    // Save selections (small, fast)
    const selections = {
      activeChapters: appState.activeChapters,
      verseSelections: appState.verseSelections
    };
    await updateSelections(selections);

    // Note: Chapters and verses are saved individually when they're downloaded/updated
    // This keeps saveState lightweight for frequent operations
  } catch (err) {
    console.warn('Unable to save settings to IndexedDB', err);
    if (err.name === 'QuotaExceededError') {
      storageWritable = false;
      console.warn('Storage quota exceeded; further saves disabled');
    }
  }
};

// Save a downloaded chapter and its verses
const saveChapterData = async (chapterKey, verses, source) => {
  try {
    const [bookId, chapter] = chapterKey.split(',').map(Number);

    // Save chapter metadata
    const chapterData = {
      chapterKey,
      bookId,
      chapter,
      status: STATUS.READY,
      lastUpdated: new Date().toISOString(),
      verseCount: verses.length
    };
    await saveChapter(chapterData);

    // Save all verses
    const verseData = verses.map(verse => ({
      verseId: verse.verseId,
      chapterKey,
      bookId,
      chapter,
      verse: verse.verse,
      text: verse.text,
      source,
      downloadedAt: new Date().toISOString()
    }));
    await saveVerses(verseData);

    return { chapter: chapterData, verses: verseData };
  } catch (err) {
    console.error('Error saving chapter data:', err);
    throw err;
  }
};
const recomputeActiveVerseIds = () => {
  const ids = [];
  appState.activeChapters.forEach((chapterKey) => {
    const entry = appState.chapterIndex[chapterKey];
    if (!entry || !entry.verseIds?.length) return;

    const selection = appState.verseSelections?.[chapterKey];
    const ready = isSelectionComplete(selection, entry);
    if (!ready) return;

    const exclusionSet = getChapterExclusions(chapterKey);
    if (!selection || selection.allSelected) {
      entry.verseIds.forEach((id) => {
        const verseNumber = Number(id.split(',')[2]);
        if (!exclusionSet.has(verseNumber)) ids.push(id);
      });
      return;
    }

    const selectedSet = new Set(selection.selectedVerses || selection.verses || []);
    entry.verseIds.forEach((id) => {
      const verseNumber = Number(id.split(',')[2]);
      if (selectedSet.has(verseNumber) && !exclusionSet.has(verseNumber)) {
        ids.push(id);
      }
    });
  });
  appState.activeVerseIds = ids;
};

const stripHtml = (html) => html.replace(/<[^>]*>/g, ' ');

const tokenizeText = (text) => {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length >= TFIDF_CONFIG.minWordLength);
};

const calculateTermFrequency = (words) => {
  if (!words || words.length === 0) return {};
  const tf = {};
  const totalWords = words.length;
  words.forEach(word => {
    tf[word] = (tf[word] || 0) + 1;
  });
  Object.keys(tf).forEach(word => {
    tf[word] = tf[word] / totalWords;
  });
  return tf;
};

const calculateIDF = (verseIds, verseBank) => {
  const documentFrequency = {};
  const totalDocuments = verseIds.length;

  if (totalDocuments === 0) return {};

  verseIds.forEach(id => {
    const verse = verseBank[id];
    if (!verse || !verse.wordList) return;
    const uniqueWords = new Set(verse.wordList);
    uniqueWords.forEach(word => {
      documentFrequency[word] = (documentFrequency[word] || 0) + 1;
    });
  });

  const idf = {};
  Object.keys(documentFrequency).forEach(word => {
    idf[word] = Math.log(totalDocuments / documentFrequency[word]);
  });
  return idf;
};

const combineTfIdf = (tf, idf) => {
  const tfidf = {};
  Object.keys(tf).forEach(word => {
    tfidf[word] = tf[word] * (idf[word] || 0);
  });
  return tfidf;
};

const normalizeScores = (scores) => {
  const values = Object.values(scores);
  if (values.length === 0) return {};

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range === 0) {
    const normalized = {};
    Object.keys(scores).forEach(key => {
      normalized[key] = 0.5;
    });
    return normalized;
  }

  const normalized = {};
  Object.keys(scores).forEach(key => {
    normalized[key] = (scores[key] - min) / range;
  });
  return normalized;
};

const toInt = (value, fallback = 1) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? n : fallback;
};

const installCompromisePlugin = () => {
  if (compromiseReady || typeof nlp === 'undefined') return;
  nlp.plugin(() => ({
    tags: {
      StatesofBeingVerbs: {
        isA: null, // do not inherit Verb so they are only in the custom category
      },
    },
    words: STATE_OF_BEING_WORDS.reduce((acc, word) => {
      acc[word] = 'StatesofBeingVerbs';
      return acc;
    }, {}),
  }));
  compromiseReady = true;
};

const computeMinWordsInActiveSelection = () => {
  let minWords = Infinity;
  appState.activeVerseIds.forEach((id) => {
    const verse = appState.verseBank[id];
    if (!verse || !verse.text) return;
    const plain = stripHtml(verse.text).trim();
    if (!plain) return;
    const words = plain.split(/\s+/).filter(Boolean).length;
    if (words < minWords) minWords = words;
  });
  return Number.isFinite(minWords) ? minWords : 1;
};

const computeMaxWordsInActiveSelection = () => {
  let maxWords = 1;
  appState.activeVerseIds.forEach((id) => {
    const verse = appState.verseBank[id];
    if (!verse || !verse.text) return;
    const plain = stripHtml(verse.text).trim();
    if (!plain) return;
    const words = plain.split(/\s+/).filter(Boolean).length;
    if (words > maxWords) maxWords = words;
  });
  return maxWords;
};

const updateBlankInputs = () => {
  const maxWords = computeMaxWordsInActiveSelection();
  const percentVal = Math.max(1, Math.min(toInt(appState.maxBlankPercentage, 100), 100));
  const percentCap = Math.max(1, Math.floor((percentVal / 100) * maxWords));
  const allowedMax = Math.min(maxWords, percentCap);

  let maxVal = Math.max(1, Math.min(toInt(appState.maxBlanks, 1), allowedMax));
  let minVal = Math.max(1, toInt(appState.minBlanks, 1));

  // Only adjust min down if it exceeds the constrained max value
  // Don't try to lift max up - respect what the user typed
  if (minVal > maxVal) {
    minVal = maxVal;
  }

  appState.minBlanks = minVal;
  appState.maxBlanks = maxVal;
  appState.maxBlankPercentage = percentVal;

  minBlanksInput.min = 1;
  minBlanksInput.max = allowedMax;
  maxBlanksInput.min = 1;
  maxBlanksInput.max = allowedMax;
  maxBlankPercentageInput.min = 1;
  maxBlankPercentageInput.max = 100;

  minBlanksInput.value = appState.minBlanks;
  maxBlanksInput.value = appState.maxBlanks;
  maxBlankPercentageInput.value = appState.maxBlankPercentage;

  blankLimitHint.textContent = `Max allowed is ${allowedMax} based on selected verses and ${appState.maxBlankPercentage}% cap.`;
  saveState();
};

const updateStartState = () => {
  recomputeActiveVerseIds();
  updateBlankInputs();
  const anySelected = appState.activeChapters.length > 0;
  const anyDownloads = downloadsInFlight.size > 0;
  const allReady =
    appState.activeChapters.length > 0 &&
    appState.activeChapters.every((chapterKey) => {
      const entry = appState.chapterIndex[chapterKey];
      const selection = appState.verseSelections?.[chapterKey];
      return entry && isSelectionComplete(selection, entry);
    });
  const hasVerses = appState.activeVerseIds.length > 0;
  startButton.disabled = !anySelected || anyDownloads || !allReady || !hasVerses;
};

const updateBookToggleStates = () => {
  bookToggleMap.forEach(({ checkbox, chapters }) => {
    const total = chapters.length;
    const checkedCount = chapters.filter((option) => option.checked).length;
    checkbox.checked = total > 0 && checkedCount === total;
    checkbox.indeterminate = checkedCount > 0 && checkedCount < total;
  });
};

const statusLabelFor = (status) => {
  if (status === STATUS.DOWNLOADING) return '🔄';
  if (status === STATUS.ERROR) return '⚠️';
  if (status === STATUS.READY) return '';
  return '☁️';
};

const toggleSelectors = (forceState) => {
  const shouldCollapse =
    typeof forceState === 'boolean'
      ? forceState
      : selectorsContainer.classList.contains('collapsed') === false;
  selectorsContainer.classList.toggle('collapsed', shouldCollapse);
  selectorsToggle.textContent = shouldCollapse ? 'Settings ▸' : 'Settings ▾';
  startButton.style.display = shouldCollapse ? 'none' : 'inline-flex';

  // Hide question and answer areas when settings are visible
  if (!shouldCollapse) {
    questionArea.style.display = 'none';
    answerArea.style.display = 'none';
  } else if (sessionActive) {
    // Show the appropriate area when settings are collapsed during a session
    updateQuestionView();
  }
};

const updateChapterIndicators = () => {
  chapterOptions.forEach((option) => {
    const chapterKey = option.value;
    const entry = appState.chapterIndex[chapterKey];
    const status = entry?.status || STATUS.NOT_DOWNLOADED;
    const indicator = option.parentElement.querySelector('.chapter-status');
    if (indicator) {
      indicator.textContent = statusLabelFor(status);
      indicator.className = `chapter-status${status ? ` ${status}` : ''}`;
    }
  });
  updateVerseIndicators();
};

const formatYearSelectionDescription = (yearKey, yearSelections, bookMetaMap) => {
  const selections = yearSelections[yearKey] || [];
  const grouped = new Map();

  const addPart = (bookLabel, part, isFullBook = false) => {
    const entry = grouped.get(bookLabel) || { full: false, parts: [] };
    if (entry.full) return;
    if (isFullBook) {
      entry.full = true;
      entry.parts = [];
    } else {
      entry.parts.push(part);
    }
    grouped.set(bookLabel, entry);
  };

  selections.forEach((sel) => {
    const bookMeta = bookMetaMap[sel.bookKey];
    if (!bookMeta) return;
    const bookLabel = bookMeta.label || sel.bookKey;
    const totalChapters = bookMeta.totalChapters;
    const { start, end } = sel;
    const include = Array.isArray(sel.include) ? sel.include : null;

    const coversWholeBook = !include && start === 1 && end === totalChapters;
    if (coversWholeBook) {
      addPart(bookLabel, '', true);
      return;
    }

    if (include && start === end) {
      const chapter = start;
      const parts = include.map(([vStart, vEnd]) => {
        if (vStart === vEnd) return `${chapter}:${vStart}`;
        return `${chapter}:${vStart}-${vEnd}`;
      });
      addPart(bookLabel, parts.join(', '));
      return;
    }

    if (start === end) {
      addPart(bookLabel, `${start}`);
    } else {
      addPart(bookLabel, `${start}-${end}`);
    }
  });

  const parts = [];
  grouped.forEach((entry, bookLabel) => {
    if (entry.full || entry.parts.length === 0) {
      parts.push(`${bookLabel}`);
    } else {
      parts.push(`${bookLabel} ${entry.parts.join(', ')}`);
    }
  });

  return parts.join('; ');
};

const renderYearOptions = (selectedYear = '') => {
  seasonSelect.innerHTML = '';

  const yearKeys = Object.keys(chaptersByYear);
  const currentYearKey = computeCurrentYearKey(yearKeys);

  yearKeys.forEach((yearKey) => {
    const option = document.createElement('option');
    option.value = yearKey;
    const description = formatYearSelectionDescription(yearKey, chaptersByYear, books);
    const descriptionSuffix = description ? ` - ${description}` : '';
    const isCurrent = currentYearKey === yearKey;
    option.textContent = `${isCurrent ? '★ ' : ''}${yearKey}${descriptionSuffix}`;
    if (isCurrent) {
      option.classList.add('current-year-option');
    }
    option.selected = selectedYear === yearKey;
    seasonSelect.appendChild(option);
  });

  const customOption = document.createElement('option');
  customOption.value = FULL_BIBLE_KEY;
  customOption.textContent = 'Custom - Entire Bible';
  customOption.selected = selectedYear === FULL_BIBLE_KEY;
  seasonSelect.appendChild(customOption);
};

const renderChapterOptions = (year, selectedValues = new Set()) => {
  optionsContainer.innerHTML = '';
  bookToggleMap = new Map();
  const selections = getSelectionsForYear(year);

  selections.forEach(({ bookKey, start, end }) => {
    const meta = books[bookKey];
    if (!meta) return;
    const cappedEnd = Math.min(end, meta.totalChapters);
    const chapterList = chaptersToRender(meta, start, cappedEnd);

    const group = document.createElement('div');
    group.className = 'book-group';

    const bookLabel = document.createElement('label');
    bookLabel.className = 'book-header';
    const bookCheckbox = document.createElement('input');
    bookCheckbox.type = 'checkbox';
    bookCheckbox.className = 'book-checkbox';
    bookCheckbox.dataset.bookKey = bookKey;
    const bookName = document.createElement('span');
    bookName.className = 'book-name';
    bookName.textContent = meta.label;
    bookLabel.appendChild(bookCheckbox);
    bookLabel.appendChild(bookName);
    group.appendChild(bookLabel);

    const grid = document.createElement('div');
    grid.className = 'chapter-grid';

    const chapterCheckboxes = [];

    chapterList.forEach((chapter) => {
      const chapterKey = `${meta.id},${chapter}`;
      const label = document.createElement('label');
      label.className = 'chapter-check';

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'chapter-option';
      input.value = chapterKey;
      input.checked = selectedValues.has(input.value);

      const numberSpan = document.createElement('span');
      numberSpan.className = 'chapter-number';
      numberSpan.textContent = chapter === 0 ? 'Intro (ABC)' : chapter;

      const status = appState.chapterIndex[chapterKey]?.status || STATUS.NOT_DOWNLOADED;
      const statusSpan = document.createElement('span');
      statusSpan.className = `chapter-status${status ? ` ${status}` : ''}`;
      statusSpan.textContent = statusLabelFor(status);

      label.appendChild(input);
      label.appendChild(numberSpan);
      label.appendChild(statusSpan);
      grid.appendChild(label);
      chapterCheckboxes.push(input);
    });

    group.appendChild(grid);
    optionsContainer.appendChild(group);
    bookToggleMap.set(bookKey, { checkbox: bookCheckbox, chapters: chapterCheckboxes });
  });

  chapterOptions = Array.from(optionsContainer.querySelectorAll('.chapter-option'));
  chapterOptions.forEach((option) => {
    option.addEventListener('change', () => {
      handleChapterSelectionChange();
    });
  });

  bookToggleMap.forEach(({ checkbox, chapters }) => {
    checkbox.addEventListener('change', (event) => {
      const shouldCheck = event.target.checked;
      chapters.forEach((chapterOption) => {
        chapterOption.checked = shouldCheck;
      });
      handleChapterSelectionChange();
    });
  });

  updateBookToggleStates();
  updateChapterIndicators();
  updateStartState();
};

const ensureVerseSelectionEntry = (chapterKey) => {
  if (!appState.verseSelections[chapterKey]) {
    appState.verseSelections[chapterKey] = { allSelected: false, selectedVerses: [] };
  }
  return appState.verseSelections[chapterKey];
};

const selectionHasAny = (chapterKey) => {
  const selection = appState.verseSelections?.[chapterKey];
  return hasVerseSelection(selection);
};

const buildExclusionSetFromInclusions = (totalVerses, includeRanges = []) => {
  const allowed = new Set();
  includeRanges.forEach(([start, end]) => {
    for (let v = start; v <= end; v += 1) {
      if (v >= 1 && v <= totalVerses) allowed.add(v);
    }
  });
  const excluded = new Set();
  for (let v = 1; v <= totalVerses; v += 1) {
    if (!allowed.has(v)) excluded.add(v);
  }
  return excluded;
};

const applyYearExclusions = (yearKey) => {
  const exclusions = {};
  const selections = chaptersByYear[yearKey] || [];
  selections.forEach((sel) => {
    if (!Array.isArray(sel.include)) return;
    if (sel.start !== sel.end) return; // include ranges only supported for single-chapter entries
    const bookMeta = books[sel.bookKey];
    if (!bookMeta) return;
    const chapter = sel.start;
    const total = bookMeta.verseCounts?.[chapter - 1];
    if (!Number.isFinite(total)) return;
    const chapterKey = `${bookMeta.id},${chapter}`;
    exclusions[chapterKey] = Array.from(buildExclusionSetFromInclusions(total, sel.include));
  });
  appState.chapterExclusions = exclusions;
};

const seedCommentaryContent = async () => {
  const savePromises = [];

  Object.values(books).forEach((book) => {
    if (!book.commentary || book.commentary.length === 0) return;
    const chapterKey = `${book.id},0`;
    if (appState.chapterIndex[chapterKey]?.verseIds?.length) return;

    const verseIds = [];
    const versesToSave = [];
    let idx = 1;
    book.commentary.forEach((section) => {
      (section.parts || []).forEach((part) => {
        const verseId = `${book.id},0,${idx}`;
        const plainText = `${section.title}. ${part}`;
        const words = tokenizeText(stripHtml(plainText));
        const termFrequency = calculateTermFrequency(words);
        const wordList = Array.from(new Set(words));
        const text = `<strong>${section.title}.</strong> ${part}`;

        // Update in-memory state
        appState.verseBank[verseId] = {
          bookId: book.id,
          chapter: 0,
          verse: idx,
          text,
          source: 'ABC',
          termFrequency,
          wordList,
        };

        // Prepare verse for IndexedDB
        versesToSave.push({
          verseId,
          chapterKey,
          bookId: book.id,
          chapter: 0,
          verse: idx,
          text,
          source: 'ABC',
          termFrequency,
          wordList,
          downloadedAt: new Date().toISOString()
        });

        verseIds.push(verseId);
        idx += 1;
      });
    });

    appState.chapterIndex[chapterKey] = {
      verseIds: sortVerseIds(verseIds),
      lastUpdated: new Date().toISOString(),
      status: STATUS.READY,
      verseCount: verseIds.length,
      chapter: 0,
    };
    appState.chapterVerseCounts[chapterKey] = verseIds.length;

    // Save to IndexedDB
    const saveTask = (async () => {
      try {
        await saveChapter({
          chapterKey,
          bookId: book.id,
          chapter: 0,
          status: STATUS.READY,
          lastUpdated: new Date().toISOString(),
          verseCount: verseIds.length
        });
        await saveVerses(versesToSave);
      } catch (err) {
        console.warn(`Failed to save ABC content for ${book.label} to IndexedDB:`, err);
      }
    })();

    savePromises.push(saveTask);
  });

  // Wait for all saves to complete
  await Promise.all(savePromises);
};

const buildVerseDownloadPlan = (activeChapters = [], verseSelections = {}) => {
  const chapterDownloads = [];
  const verseDownloads = [];

  activeChapters.forEach((chapterKey) => {
    const selection = verseSelections[chapterKey];
    if (selection?.allSelected) {
      chapterDownloads.push(chapterKey);
      return;
    }

    if (hasVerseSelection(selection)) {
      (selection.selectedVerses || []).forEach((verseNumber) => {
        verseDownloads.push(`${chapterKey},${verseNumber}`);
      });
    }
  });

  return { chapterDownloads, verseDownloads };
};

const verseStatusFor = (chapterKey, verseId) => {
  const chapterStatus = getChapterStatus(chapterKey);
  if (appState.verseErrors[verseId]) return STATUS.ERROR;
  const inFlight = downloadsInFlight.has(verseId) || downloadsInFlight.has(chapterKey);
  if (inFlight) return STATUS.DOWNLOADING;
  if (appState.verseBank[verseId]) return STATUS.READY;
  return chapterStatus;
};

const isSelectionComplete = (selection, entry) => {
  const verseIds = entry?.verseIds || [];
  const status = entry?.status;
  const verseCount = entry?.verseCount;

  const downloaded = new Set(
    verseIds
      .map((id) => Number(id?.split?.(',')?.[2]))
      .filter((n) => Number.isFinite(n))
  );

  if (!selection || selection.allSelected === true || selection.all === true) {
    if (status !== STATUS.READY) return false;
    if (downloaded.size === 0) return false;
    if (Number.isFinite(verseCount)) {
      return downloaded.size >= verseCount;
    }
    return true;
  }

  const selected = selection.selectedVerses || selection.verses || [];
  if (!selected.length) return false;
  return selected.every((v) => downloaded.has(v));
};

const renderVerseOptions = (year, selectedValues = new Set()) => {
  verseOptionsContainer.innerHTML = '';
  verseBookToggleMap = new Map();
  verseChapterToggleMap = new Map();
  verseChapterToBook.clear();

  if (!year) {
    verseOptionsContainer.innerHTML = '<div class="hint">Select a season to choose verses.</div>';
    return;
  }

  const selections = getSelectionsForYear(year);

  selections.forEach(({ bookKey, start, end }) => {
    const meta = books[bookKey];
    if (!meta) return;
    const cappedEnd = Math.min(end, meta.totalChapters);
    const chapterList = chaptersToRender(meta, start, cappedEnd);

    const group = document.createElement('div');
    group.className = 'book-group';

    const bookLabel = document.createElement('label');
    bookLabel.className = 'book-header';
    const bookCheckbox = document.createElement('input');
    bookCheckbox.type = 'checkbox';
    bookCheckbox.className = 'book-checkbox';
    bookCheckbox.dataset.bookKey = bookKey;
    const bookName = document.createElement('span');
    bookName.className = 'book-name';
    bookName.textContent = meta.label;
    bookLabel.appendChild(bookCheckbox);
    bookLabel.appendChild(bookName);
    group.appendChild(bookLabel);

    const bookChapters = [];

    chapterList.forEach((chapter) => {
      const chapterKey = `${meta.id},${chapter}`;
      const selection = appState.verseSelections?.[chapterKey];
      const chapterSelected = selectedValues.has(chapterKey);
      const allSelected = selection?.allSelected || (!selection && chapterSelected);
      const selectedVerses = new Set(selection?.selectedVerses || []);
      const status = getChapterStatus(chapterKey);
      const verseNumbers = getVerseNumbersForChapter(chapterKey);

      const wrapper = document.createElement('div');
      wrapper.className = 'chapter-with-verses';

      const header = document.createElement('label');
      header.className = 'chapter-check chapter-header';
      const chapterCheckbox = document.createElement('input');
      chapterCheckbox.type = 'checkbox';
      chapterCheckbox.className = 'chapter-verse-option';
      chapterCheckbox.value = chapterKey;
      chapterCheckbox.checked = allSelected || (verseNumbers.length > 0 && verseNumbers.every((v) => selectedVerses.has(v)));
      const numberSpan = document.createElement('span');
      numberSpan.className = 'chapter-number';
      numberSpan.textContent = chapter === 0 ? 'Intro (ABC)' : `Chapter ${chapter}`;
      const statusSpan = document.createElement('span');
      statusSpan.className = `chapter-status${status ? ` ${status}` : ''}`;
      statusSpan.textContent = statusLabelFor(status);

      header.appendChild(chapterCheckbox);
      header.appendChild(numberSpan);
      header.appendChild(statusSpan);
      wrapper.appendChild(header);

      const grid = document.createElement('div');
      grid.className = 'chapter-grid verse-grid';

      const verseCheckboxes = [];
      const verseStatusEls = [];

      if (verseNumbers.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'verse-placeholder hint';
        placeholder.textContent = 'Verses will appear after this chapter is downloaded.';
        grid.appendChild(placeholder);
      } else {
        verseNumbers.forEach((verseNum) => {
          const verseId = `${chapterKey},${verseNum}`;
          const verseLabel = document.createElement('label');
          verseLabel.className = 'chapter-check verse-check';
          if (chapter === 0) {
            verseLabel.classList.add('commentary-entry');
          }

          const input = document.createElement('input');
          input.type = 'checkbox';
          input.className = 'verse-option';
          input.value = verseId;
          input.checked = allSelected || selectedVerses.has(verseNum);

          const number = document.createElement('span');
          number.className = 'chapter-number';
          const commentaryLabel = getCommentaryLabelForPart(chapterKey, verseNum);
          if (commentaryLabel) {
            number.classList.add('commentary-label');
          }
          number.textContent = commentaryLabel || verseNum;

          const verseStatus = document.createElement('span');
          const currentStatus = verseStatusFor(chapterKey, verseId);
          verseStatus.className = `chapter-status${currentStatus ? ` ${currentStatus}` : ''}`;
          verseStatus.textContent = statusLabelFor(currentStatus);

          verseLabel.appendChild(input);
          verseLabel.appendChild(number);
          verseLabel.appendChild(verseStatus);
          grid.appendChild(verseLabel);

          verseCheckboxes.push({ input, verseNum });
          verseStatusEls.push(verseStatus);

          input.addEventListener('change', () => {
            ensureVerseSelectionEntry(chapterKey);
            const selectionEntry = appState.verseSelections[chapterKey];
            const set = new Set(selectionEntry.selectedVerses || []);
            if (input.checked) {
              set.add(verseNum);
            } else {
              set.delete(verseNum);
            }
            const totalVerses = verseNumbers.length;
            const chapterStatus = getChapterStatus(chapterKey);
            const hasCompleteSelection =
              totalVerses > 0 && set.size === totalVerses && chapterStatus === STATUS.READY;
            if (hasCompleteSelection) {
              selectionEntry.allSelected = true;
              selectionEntry.selectedVerses = [];
            } else {
              selectionEntry.allSelected = false;
              selectionEntry.selectedVerses = Array.from(set);
            }
            handleVerseSelectionChange(chapterKey, bookKey);
            updateChapterToggleState(chapterKey);
            updateBookToggleState(bookKey);
          });
        });
      }

      wrapper.appendChild(grid);
      group.appendChild(wrapper);

      chapterCheckbox.addEventListener('change', (event) => {
        if (event.target.checked) {
          appState.verseSelections[chapterKey] = { allSelected: true, selectedVerses: [] };
        } else {
          delete appState.verseSelections[chapterKey];
        }
        verseCheckboxes.forEach(({ input }) => {
          input.checked = event.target.checked;
        });
        handleVerseSelectionChange(chapterKey, bookKey);
        updateChapterToggleState(chapterKey);
        updateBookToggleState(bookKey);
      });

      const chapterEntry = {
        chapterCheckbox,
        verseCheckboxes,
        verseStatusEls,
        statusSpan,
        verseNumbers,
        chapterKey,
        bookKey,
      };
      verseChapterToggleMap.set(chapterKey, chapterEntry);
      verseChapterToBook.set(chapterKey, bookKey);
      bookChapters.push(chapterEntry);
    });

    verseBookToggleMap.set(bookKey, { checkbox: bookCheckbox, chapters: bookChapters });
    bookCheckbox.addEventListener('change', (event) => {
      const shouldCheck = event.target.checked;
      bookChapters.forEach(({ chapterKey }) => {
        if (shouldCheck) {
          appState.verseSelections[chapterKey] = { allSelected: true, selectedVerses: [] };
        } else {
          delete appState.verseSelections[chapterKey];
        }
        const chapterEntry = verseChapterToggleMap.get(chapterKey);
        if (chapterEntry?.chapterCheckbox) {
          chapterEntry.chapterCheckbox.checked = shouldCheck;
          chapterEntry.chapterCheckbox.indeterminate = false;
        }
        if (chapterEntry?.verseCheckboxes?.length) {
          chapterEntry.verseCheckboxes.forEach(({ input }) => {
            input.checked = shouldCheck;
          });
        }
      });
      handleVerseSelectionChange(null, bookKey);
      bookChapters.forEach(({ chapterKey }) => {
        updateChapterToggleState(chapterKey);
      });
      updateBookToggleState(bookKey);
    });

    verseOptionsContainer.appendChild(group);
  });

  updateVerseToggleStates();
  updateVerseIndicators();
  updateStartState();
};

const syncVerseSelectorToState = (chapterKeys = null) => {
  const targetKeys = chapterKeys ? new Set(chapterKeys) : null;
  const touchedBooks = new Set();
  verseChapterToggleMap.forEach((entry, chapterKey) => {
    if (targetKeys && !targetKeys.has(chapterKey)) return;
    const selection = appState.verseSelections?.[chapterKey];
    const chapterSelected = appState.activeChapters.includes(chapterKey);
    const selectAll = selection?.allSelected || (!selection && chapterSelected);
    const verseSet = new Set(selection?.selectedVerses || []);

    if (entry.verseCheckboxes?.length) {
      entry.verseCheckboxes.forEach(({ input, verseNum }) => {
        input.checked = selectAll || verseSet.has(verseNum);
      });
    }

    if (entry.chapterCheckbox) {
      entry.chapterCheckbox.checked = selectAll || verseSet.size > 0;
      entry.chapterCheckbox.indeterminate = !entry.chapterCheckbox.checked && verseSet.size > 0;
    }
    updateChapterToggleState(chapterKey);
    const bookKey = verseChapterToBook.get(chapterKey);
    if (bookKey) touchedBooks.add(bookKey);
  });

  touchedBooks.forEach((bookKey) => updateBookToggleState(bookKey));
};

const syncChapterSelectorToState = () => {
  // Sync chapter checkboxes based on appState.activeChapters
  chapterOptions.forEach((option) => {
    const chapterKey = option.value;
    option.checked = appState.activeChapters.includes(chapterKey);
  });
  updateBookToggleStates();
};

const updateVerseToggleStates = () => {
  verseChapterToggleMap.forEach(({ chapterCheckbox, verseCheckboxes, chapterKey }) => {
    const selection = appState.verseSelections?.[chapterKey];
    const chapterSelected = appState.activeChapters.includes(chapterKey);
    const allSelected = selection?.allSelected || (!selection && chapterSelected);
    const totalVerses = verseCheckboxes.length;
    const checkedVerses = verseCheckboxes.filter((v) => v.input.checked).length;
    if (chapterCheckbox) {
      chapterCheckbox.checked =
        allSelected || (totalVerses > 0 && checkedVerses > 0 && checkedVerses === totalVerses);
      chapterCheckbox.indeterminate = !chapterCheckbox.checked && checkedVerses > 0;
    }
  });

  verseBookToggleMap.forEach(({ checkbox, chapters }) => {
    const total = chapters.length;
    const checkedCount = chapters.filter(({ chapterCheckbox }) => chapterCheckbox?.checked).length;
    const hasPartial = chapters.some(({ chapterCheckbox }) => chapterCheckbox?.indeterminate);
    checkbox.checked = total > 0 && checkedCount === total;
    checkbox.indeterminate = !checkbox.checked && (checkedCount > 0 || hasPartial);
  });
};

const updateVerseIndicators = () => {
  verseChapterToggleMap.forEach(({ statusSpan, verseStatusEls, chapterKey }) => {
    const chapterStatus = getChapterStatus(chapterKey);
    const chapterLabel = statusLabelFor(chapterStatus);

    if (statusSpan) {
      statusSpan.textContent = chapterLabel;
      statusSpan.className = `chapter-status${chapterStatus ? ` ${chapterStatus}` : ''}`;
    }
    if (verseStatusEls) {
      verseStatusEls.forEach((el, idx) => {
        const verseNum = verseChapterToggleMap.get(chapterKey)?.verseNumbers?.[idx];
        const verseId = Number.isFinite(verseNum) ? `${chapterKey},${verseNum}` : null;
        const status = verseId ? verseStatusFor(chapterKey, verseId) : chapterStatus;
        const label = statusLabelFor(status);
        el.textContent = label;
        el.className = `chapter-status${status ? ` ${status}` : ''}`;
      });
    }
  });
};

const updateVerseStatusForChapter = (chapterKey) => {
  const entry = verseChapterToggleMap.get(chapterKey);
  if (!entry) return;
  const chapterStatus = getChapterStatus(chapterKey);
  const { statusSpan, verseStatusEls, verseNumbers } = entry;
  const chapterLabel = statusLabelFor(chapterStatus);
  if (statusSpan) {
    statusSpan.textContent = chapterLabel;
    statusSpan.className = `chapter-status${chapterStatus ? ` ${chapterStatus}` : ''}`;
  }
  if (verseStatusEls && verseNumbers) {
    verseStatusEls.forEach((el, idx) => {
      const verseNum = verseNumbers[idx];
      const verseId = Number.isFinite(verseNum) ? `${chapterKey},${verseNum}` : null;
      const status = verseId ? verseStatusFor(chapterKey, verseId) : chapterStatus;
      const label = statusLabelFor(status);
      el.textContent = label;
      el.className = `chapter-status${status ? ` ${status}` : ''}`;
    });
  }
};

const updateChapterToggleState = (chapterKey) => {
  const entry = verseChapterToggleMap.get(chapterKey);
  if (!entry) return;
  const { chapterCheckbox, verseCheckboxes } = entry;
  const selection = appState.verseSelections?.[chapterKey];
  const allSelected = selection?.allSelected;
  const totalVerses = verseCheckboxes.length;
  const checkedVerses = verseCheckboxes.filter((v) => v.input.checked).length;
  if (chapterCheckbox) {
    chapterCheckbox.checked = allSelected || (totalVerses > 0 && checkedVerses > 0 && checkedVerses === totalVerses);
    chapterCheckbox.indeterminate = !chapterCheckbox.checked && checkedVerses > 0;
  }
};

const updateBookToggleState = (bookKey) => {
  const entry = verseBookToggleMap.get(bookKey);
  if (!entry) return;
  const { checkbox, chapters } = entry;
  const total = chapters.length;
  const checkedCount = chapters.filter(({ chapterCheckbox }) => chapterCheckbox?.checked).length;
  const hasPartial = chapters.some(({ chapterCheckbox }) => chapterCheckbox?.indeterminate);
  checkbox.checked = total > 0 && checkedCount === total;
  checkbox.indeterminate = !checkbox.checked && (checkedCount > 0 || hasPartial);
};

const getChapterMeta = (chapterKey) => {
  const [bookIdStr, chapterStr] = chapterKey.split(',');
  const bookId = Number(bookIdStr);
  const chapter = Number(chapterStr);
  return { bookId, chapter };
};

const getMetaVerseCount = (bookId, chapter) => {
  const bookMeta = Object.values(books).find((b) => b.id === bookId);
  const count = bookMeta?.verseCounts?.[chapter - 1];
  return Number.isFinite(count) && count > 0 ? count : null;
};

const getChapterKeyFromVerseId = (verseId) => {
  if (!verseId) return null;
  const [bookIdStr, chapterStr] = verseId.split(',');
  const bookId = Number(bookIdStr);
  const chapter = Number(chapterStr);
  if (!Number.isFinite(bookId) || !Number.isFinite(chapter)) return null;
  return `${bookId},${chapter}`;
};

const computeVerseCountFromData = (verseIds = [], existingCount, metaCount) => {
  const numbers = verseIds
    .map((id) => Number(id?.split?.(',')?.[2]))
    .filter((n) => Number.isFinite(n));
  const observedMax = numbers.length ? Math.max(...numbers) : 0;
  const observedCount = numbers.length > 0 ? observedMax : 0;

  const candidates = [existingCount, metaCount, observedCount]
    .map((n) => (Number.isFinite(n) && n > 0 ? n : null))
    .filter((n) => n !== null);

  if (candidates.length === 0) return null;
  return Math.max(...candidates);
};

const getChapterStatus = (chapterKey) => appState.chapterIndex[chapterKey]?.status || STATUS.NOT_DOWNLOADED;

const getChapterExclusions = (chapterKey) => {
  const list = appState.chapterExclusions?.[chapterKey] || [];
  return new Set(Array.isArray(list) ? list : []);
};

const getChapterInclusions = (chapterKey) => {
  const { bookId, chapter } = getChapterMeta(chapterKey);
  const selections = chaptersByYear[appState.year] || [];
  const matching = selections.find((sel) => {
    const meta = books[sel.bookKey];
    if (!meta || meta.id !== bookId) return false;
    if (chapter < sel.start || chapter > sel.end) return false;
    return Array.isArray(sel.include);
  });
  return matching?.include || null;
};

const getCommentarySectionCount = (chapterKey) => {
  const { bookId, chapter } = getChapterMeta(chapterKey);
  if (chapter !== 0) return null;
  const bookMeta = Object.values(books).find((b) => b.id === bookId);
  if (!bookMeta?.commentary) return null;
  return bookMeta.commentary.reduce((acc, section) => acc + (section.parts?.length || 0), 0);
};

const getCommentaryLabelForPart = (chapterKey, partIndex) => {
  const { bookId, chapter } = getChapterMeta(chapterKey);
  if (chapter !== 0 || !Number.isFinite(partIndex) || partIndex < 1) return null;
  const bookMeta = Object.values(books).find((b) => b.id === bookId);
  if (!bookMeta?.commentary) return null;

  let idx = 0;
  for (const section of bookMeta.commentary) {
    const parts = Array.isArray(section?.parts) ? section.parts : [];
    for (let i = 0; i < parts.length; i += 1) {
      idx += 1;
      if (idx === partIndex) {
        const title = section?.title || 'Intro';
        // Only show part number if there is more than one part
        if (parts.length > 1) return `${title} (Part ${i + 1}/${parts.length})`;
        return title;
      }
    }
  }
  return null;
};

const allowedVersesFromInclusions = (totalVerses, includeRanges = []) => {
  const allowed = new Set();
  includeRanges.forEach(([start, end]) => {
    for (let v = start; v <= end; v += 1) {
      if (v >= 1 && v <= totalVerses) allowed.add(v);
    }
  });
  return Array.from(allowed).sort((a, b) => a - b);
};

const getVerseNumbersForChapter = (chapterKey) => {
  const entry = appState.chapterIndex[chapterKey];
  const { bookId, chapter } = getChapterMeta(chapterKey);
  const commentaryCount = getCommentarySectionCount(chapterKey);
  if (chapter === 0 && Number.isFinite(commentaryCount) && commentaryCount > 0) {
    return Array.from({ length: commentaryCount }, (_, idx) => idx + 1);
  }
  const metaCount = getMetaVerseCount(bookId, chapter);
  const cached = appState.chapterVerseCounts?.[chapterKey];
  const verseIds = entry?.verseIds || [];
  const count = computeVerseCountFromData(verseIds, entry?.verseCount ?? cached, metaCount);

  if (entry) {
    entry.verseCount = count || entry?.verseCount;
  }

  const inclusionRanges = getChapterInclusions(chapterKey);
  if (inclusionRanges && Number.isFinite(count) && count > 0) {
    return allowedVersesFromInclusions(count, inclusionRanges);
  }

  const exclusionSet = getChapterExclusions(chapterKey);

  if (Number.isFinite(count) && count > 0) {
    appState.chapterVerseCounts[chapterKey] = count;
    const verses = Array.from({ length: count }, (_, idx) => idx + 1);
    return verses.filter((v) => !exclusionSet.has(v));
  }

  return verseIds
    .map((id) => Number(id.split(',')[2]))
    .filter((num) => Number.isFinite(num) && !exclusionSet.has(num));
};

const hasVerseSelection = (selection) =>
  !!(selection && (selection.allSelected || (selection.selectedVerses && selection.selectedVerses.length > 0)));

const updateVerseOptionsForChapter = (chapterKey) => {
  const entry = verseChapterToggleMap.get(chapterKey);
  if (!entry) return; // Chapter not in verse selector UI

  const verseNumbers = getVerseNumbersForChapter(chapterKey);
  const selection = appState.verseSelections?.[chapterKey];
  const chapterSelected = appState.activeChapters.includes(chapterKey);
  const allSelected = selection?.allSelected || (!selection && chapterSelected);
  const selectedVerses = new Set(selection?.selectedVerses || []);

  // If the chapter already has verse checkboxes rendered, just update their state
  if (entry.verseCheckboxes?.length > 0) {
    entry.verseCheckboxes.forEach(({ input, verseNum }) => {
      input.checked = allSelected || selectedVerses.has(verseNum);
    });
    updateChapterToggleState(chapterKey);
    const bookKey = verseChapterToBook.get(chapterKey);
    if (bookKey) updateBookToggleState(bookKey);
    return;
  }

  // Chapter was just downloaded and needs verse checkboxes created
  // Find the grid element in the DOM
  const grid = entry.chapterCheckbox?.parentElement?.parentElement?.querySelector('.verse-grid');
  if (!grid) return;

  // Clear placeholder
  grid.innerHTML = '';

  // Create verse checkboxes
  const verseCheckboxes = [];
  const verseStatusEls = [];
  const status = getChapterStatus(chapterKey);

  verseNumbers.forEach((verseNum) => {
    const verseId = `${chapterKey},${verseNum}`;
    const verseLabel = document.createElement('label');
    verseLabel.className = 'chapter-check verse-check';

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'verse-option';
    input.value = verseId;
    input.checked = allSelected || selectedVerses.has(verseNum);

    const number = document.createElement('span');
    number.className = 'chapter-number';
    number.textContent = verseNum;

    const verseStatus = document.createElement('span');
    verseStatus.className = `chapter-status${status ? ` ${status}` : ''}`;
    verseStatus.textContent = statusLabelFor(status);

    verseLabel.appendChild(input);
    verseLabel.appendChild(number);
    verseLabel.appendChild(verseStatus);
    grid.appendChild(verseLabel);

    verseCheckboxes.push({ input, verseNum });
    verseStatusEls.push(verseStatus);

    const bookKey = verseChapterToBook.get(chapterKey);
    input.addEventListener('change', () => {
      ensureVerseSelectionEntry(chapterKey);
      const selectionEntry = appState.verseSelections[chapterKey];
      const set = new Set(selectionEntry.selectedVerses || []);
      if (input.checked) {
        set.add(verseNum);
      } else {
        set.delete(verseNum);
      }
      if (verseNumbers.length > 0 && set.size === verseNumbers.length) {
        selectionEntry.allSelected = true;
        selectionEntry.selectedVerses = [];
      } else {
        selectionEntry.allSelected = false;
        selectionEntry.selectedVerses = Array.from(set);
      }
      handleVerseSelectionChange(chapterKey, bookKey);
      updateChapterToggleState(chapterKey);
      updateBookToggleState(bookKey);
    });
  });

  // Update the entry with the new checkboxes
  entry.verseCheckboxes = verseCheckboxes;
  entry.verseStatusEls = verseStatusEls;
  entry.verseNumbers = verseNumbers;

  updateChapterToggleState(chapterKey);
  const bookKey = verseChapterToBook.get(chapterKey);
  if (bookKey) updateBookToggleState(bookKey);
};

const storeChapterData = async (chapterKey, verses, source) => {
  const verseIds = [];
  const versesToSave = [];

  verses.forEach(({ verse, text }) => {
    const id = `${chapterKey},${verse}`;
    verseIds.push(id);
    const { bookId, chapter } = getChapterMeta(chapterKey);

    // Pre-calculate term frequency for TF-IDF
    const plainText = stripHtml(text);
    const words = tokenizeText(plainText);
    const termFrequency = calculateTermFrequency(words);
    const wordList = Array.from(new Set(words));

    // Update in-memory state
    appState.verseBank[id] = {
      bookId,
      chapter,
      verse,
      text,
      source,
      termFrequency,
      wordList,
    };

    // Prepare verse for IndexedDB
    versesToSave.push({
      verseId: id,
      chapterKey,
      bookId,
      chapter,
      verse,
      text,
      source,
      termFrequency,
      wordList,
      downloadedAt: new Date().toISOString()
    });
  });

  // Update in-memory chapter index with sorted verse IDs
  appState.chapterIndex[chapterKey] = {
    verseIds: sortVerseIds(verseIds),
    lastUpdated: new Date().toISOString(),
    status: STATUS.READY,
  };
  appState.chapterVerseCounts[chapterKey] = verseIds.length;

  // Save to IndexedDB
  try {
    const [bookId, chapter] = chapterKey.split(',').map(Number);
    await saveChapter({
      chapterKey,
      bookId,
      chapter,
      status: STATUS.READY,
      lastUpdated: new Date().toISOString(),
      verseCount: verseIds.length
    });
    await saveVerses(versesToSave);
  } catch (err) {
    console.warn('Failed to save chapter to IndexedDB:', err);
  }

  // Update verse selector for this chapter if it exists in the UI
  updateVerseOptionsForChapter(chapterKey);
};

const parseVerses = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) {
    return data
      .map((entry) => ({
        verse: Number(entry.verse || entry.verse_nr || entry.nr),
        text: entry.text || entry.text_nr || entry.text_clean || entry.content || '',
      }))
      .filter((v) => Number.isFinite(v.verse) && v.text);
  }
  if (Array.isArray(data.verses)) {
    return data.verses
      .map((entry) => ({
        verse: Number(entry.verse || entry.verse_nr || entry.nr),
        text: entry.text || entry.text_nr || entry.text_clean || entry.content || '',
      }))
      .filter((v) => Number.isFinite(v.verse) && v.text);
  }
  if (data.verses && typeof data.verses === 'object') {
    return Object.entries(data.verses)
      .map(([k, v]) => ({
        verse: Number(k),
        text: typeof v === 'string' ? v : v.text || '',
      }))
      .filter((v) => Number.isFinite(v.verse) && v.text);
  }

  // Some endpoints (like get-verse) return a single object instead of a list/verses hash
  if (typeof data === 'object') {
    // Prefer explicit numeric verse fields so textual "verse" data doesn't get coerced to NaN
    const verseNumber = Number(data.verse_nr ?? data.nr ?? data.verse);
    // Prefer explicit text fields; fall back to the verse field only when it's not numeric
    const verseText =
      data.text ||
      data.text_nr ||
      data.text_clean ||
      data.content ||
      (typeof data.verse === 'string' && !/^\d+$/.test(data.verse) ? data.verse : '');

    if (Number.isFinite(verseNumber) && verseText) {
      return [{ verse: verseNumber, text: verseText }];
    }
  }

  return [];
};

const markChapterStatus = (chapterKey, status) => {
  if (!appState.chapterIndex[chapterKey]) {
    appState.chapterIndex[chapterKey] = { verseIds: [], lastUpdated: null, status };
  } else {
    appState.chapterIndex[chapterKey].status = status;
  }
  updateChapterIndicators();
  updateVerseStatusForChapter(chapterKey);
  updateStartState();
  saveState();
};

const uncheckChapter = (chapterKey) => {
  chapterOptions.forEach((option) => {
    if (option.value === chapterKey) {
      option.checked = false;
    }
  });
  appState.activeChapters = appState.activeChapters.filter((key) => key !== chapterKey);
  delete appState.verseSelections[chapterKey];
  updateBookToggleStates();
};

const fetchChapter = async (chapterKey) => {
  const { bookId, chapter } = getChapterMeta(chapterKey);
  const url = `https://bolls.life/get-text/NKJV/${bookId}/${chapter}/`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${chapterKey}: ${response.status}`);
  }
  return response.json();
};

const fetchVerse = async (verseId) => {
  const [bookId, chapter, verse] = verseId.split(',').map(Number);
  const url = `https://bolls.life/get-verse/NKJV/${bookId}/${chapter}/${verse}/`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${verseId}: ${response.status}`);
  }
  return response.json();
};

const storeVerseData = async (verseId, text, source) => {
  try {
    const [bookId, chapter, verse] = verseId.split(',').map(Number);
    const chapterKey = `${bookId},${chapter}`;
    const metaCount = getMetaVerseCount(bookId, chapter);

    // Pre-calculate term frequency for TF-IDF
    const plainText = stripHtml(text);
    const words = tokenizeText(plainText);
    const termFrequency = calculateTermFrequency(words);
    const wordList = Array.from(new Set(words));

    // Update in-memory state
    appState.verseBank[verseId] = {
      bookId,
      chapter,
      verse,
      text,
      source,
      termFrequency,
      wordList,
    };

    // Save verse to IndexedDB
    await saveVerse({
      verseId,
      chapterKey,
      bookId,
      chapter,
      verse,
      text,
      source,
      termFrequency,
      wordList,
      downloadedAt: new Date().toISOString()
    });

    // Update chapter index to include this verse
    if (!appState.chapterIndex[chapterKey]) {
      appState.chapterIndex[chapterKey] = {
        verseIds: [],
        lastUpdated: new Date().toISOString(),
        status: STATUS.PARTIAL
      };
    }

    if (!appState.chapterIndex[chapterKey].verseIds.includes(verseId)) {
      appState.chapterIndex[chapterKey].verseIds.push(verseId);
      appState.chapterIndex[chapterKey].verseIds = sortVerseIds(appState.chapterIndex[chapterKey].verseIds);
    }

    appState.chapterIndex[chapterKey].lastUpdated = new Date().toISOString();
    const computedCount = computeVerseCountFromData(
      appState.chapterIndex[chapterKey].verseIds,
      appState.chapterIndex[chapterKey].verseCount,
      metaCount
    );
    if (Number.isFinite(computedCount) && computedCount > 0) {
      appState.chapterIndex[chapterKey].verseCount = computedCount;
      appState.chapterVerseCounts[chapterKey] = computedCount;
    }

    // Save chapter metadata
    await saveChapter({
      chapterKey,
      bookId,
      chapter,
      status: appState.chapterIndex[chapterKey].status || STATUS.PARTIAL,
      lastUpdated: appState.chapterIndex[chapterKey].lastUpdated,
      verseCount: appState.chapterIndex[chapterKey].verseCount || appState.chapterIndex[chapterKey].verseIds.length
    });

    return { verseId, text };
  } catch (err) {
    console.error('Error saving verse data:', err);
    throw err;
  }
};

const downloadVerseIfNeeded = (verseId) => {
  // Check if verse is already downloaded
  if (appState.verseBank[verseId]) {
    return Promise.resolve();
  }

  if (downloadsInFlight.has(verseId)) {
    return downloadsInFlight.get(verseId);
  }

  const chapterKey = getChapterKeyFromVerseId(verseId);
  delete appState.verseErrors[verseId];

  const downloadPromise = fetchVerse(verseId)
    .then(async (data) => {
      const verses = parseVerses(data);
      if (!verses.length || !verses[0].text) {
        appState.verseErrors[verseId] = true;
        throw new Error(`No text found for ${verseId}`);
      }
      await storeVerseData(verseId, verses[0].text, 'NKJV');
      delete appState.verseErrors[verseId];
      if (chapterKey) {
        const currentStatus = appState.chapterIndex[chapterKey]?.status;
        const nextStatus = currentStatus === STATUS.READY ? STATUS.READY : STATUS.PARTIAL;
        markChapterStatus(chapterKey, nextStatus);
      }
      recomputeActiveVerseIds();
      saveState();
      updateStartState();
    })
    .catch((err) => {
      console.warn(err);
      appState.verseErrors[verseId] = true;
      // Don't uncheck on individual verse errors
    })
    .finally(() => {
      downloadsInFlight.delete(verseId);
      updateStartState();
      updateChapterIndicators();
      updateVerseIndicators();
    });

  downloadsInFlight.set(verseId, downloadPromise);
  updateStartState();
  updateVerseIndicators();
  return downloadPromise;
};

const downloadChapterIfNeeded = (chapterKey) => {
  const existing = appState.chapterIndex[chapterKey];
  if (existing && existing.status === STATUS.READY && existing.verseIds?.length) {
    return Promise.resolve();
  }

  if (downloadsInFlight.has(chapterKey)) {
    return downloadsInFlight.get(chapterKey);
  }

  markChapterStatus(chapterKey, STATUS.DOWNLOADING);

  const downloadPromise = fetchChapter(chapterKey)
    .then(async (data) => {
      const verses = parseVerses(data);
      if (!verses.length) {
        throw new Error(`No verses found for ${chapterKey}`);
      }
      await storeChapterData(chapterKey, verses, 'NKJV');
      markChapterStatus(chapterKey, STATUS.READY);
      recomputeActiveVerseIds();
      saveState();
      updateStartState();
    })
    .catch((err) => {
      console.warn(err);
      markChapterStatus(chapterKey, STATUS.ERROR);
      uncheckChapter(chapterKey);
      handleChapterSelectionChange();
    })
    .finally(() => {
      downloadsInFlight.delete(chapterKey);
      updateStartState();
      updateChapterIndicators();
    });

  downloadsInFlight.set(chapterKey, downloadPromise);
  updateStartState();
  return downloadPromise;
};

const shouldDownloadFullChapter = (selection, chapterEntry) => {
  if (selection && selection.allSelected === false && selection.all !== true && (selection.selectedVerses || selection.verses)) {
    // Explicit verse-only selection: do NOT download the whole chapter
    return false;
  }

  const ready = chapterEntry?.status === STATUS.READY && Array.isArray(chapterEntry?.verseIds) && chapterEntry.verseIds.length > 0;
  return !ready;
};

const startDownloadsForSelection = () => {
  const needed = appState.activeChapters.filter((chapterKey) => {
    const [, chapterStr] = chapterKey.split(',');
    if (Number(chapterStr) === 0) return false;
    const entry = appState.chapterIndex[chapterKey];
    const selection = appState.verseSelections?.[chapterKey];
    return shouldDownloadFullChapter(selection, entry);
  });
  needed.forEach((chapterKey) => {
    downloadChapterIfNeeded(chapterKey);
  });
};

const startVerseDownloadsForSelection = () => {
  const plan = buildVerseDownloadPlan(appState.activeChapters, appState.verseSelections || {});

  plan.chapterDownloads.forEach((chapterKey) => downloadChapterIfNeeded(chapterKey));
  plan.verseDownloads.forEach((verseId) => downloadVerseIfNeeded(verseId));
};

const handleChapterSelectionChange = () => {
  const selectedChapters = chapterOptions.filter((option) => option.checked).map((opt) => opt.value);
  const selectedSet = new Set(selectedChapters);

  // For newly selected chapters, create allSelected entry if no verse selection exists
  if (appState.activeSelector === 'chapter') {
    selectedChapters.forEach((chapterKey) => {
      if (!appState.verseSelections[chapterKey]) {
        appState.verseSelections[chapterKey] = { allSelected: true, selectedVerses: [] };
      }
    });
  }

  // Remove verse selections for unchecked chapters
  Object.keys(appState.verseSelections || {}).forEach((chapterKey) => {
    if (!selectedSet.has(chapterKey)) {
      delete appState.verseSelections[chapterKey];
    }
  });

  // Derive active chapters based on current selector mode
  if (appState.activeSelector === 'chapter') {
    appState.activeChapters = sortChapterKeys(selectedChapters);
  } else {
    const verseSelectedChapters = Object.entries(appState.verseSelections || {})
      .filter(([, selection]) => hasVerseSelection(selection))
      .map(([chapterKey]) => chapterKey);
    appState.activeChapters = sortChapterKeys(verseSelectedChapters);
  }

  updateBookToggleStates();
  saveState();
  if (appState.activeSelector === 'chapter') {
    startDownloadsForSelection();
  } else {
    startVerseDownloadsForSelection();
  }
  updateStartState();
  syncVerseSelectorToState();
  updateVerseToggleStates();
  updateVerseIndicators();
  if (sessionActive) {
    // Recalculate TF-IDF for new selection
    calculateSessionTFIDF();

    // Rebuild the question order if the selection changed while in session.
    questionOrder = shuffle(appState.activeVerseIds);
    const seedPoints = questionOrder.map((id) => randomPointsValue(id));
    const blanksData = questionOrder.map((id, idx) =>
      applyBlanks(appState.verseBank[id]?.text || '', seedPoints[idx], id)
    );
    questionPointsList = blanksData.map((data) => data.blankedWords.length);
    questionBlanksList = blanksData.map(data => data.blanked);
    questionAnswersList = blanksData.map(data => data.answer);
    questionBlankedWordsList = blanksData.map(data => data.blankedWords);
    hintsRevealedList = blanksData.map(() => 0);
    questionIndex = 0;
    updateQuestionView();
  }
};

const handleVerseSelectionChange = (changedChapterKey = null, changedBookKey = null) => {
  // In verse selector mode, use verseSelections as the source of truth
  const verseSelectedChapters = Object.entries(appState.verseSelections || {})
    .filter(([, selection]) => hasVerseSelection(selection))
    .map(([chapterKey]) => chapterKey);

  // Sort chapter keys numerically to ensure proper order
  appState.activeChapters = sortChapterKeys(verseSelectedChapters);

  // Clean up any verse selections that have no actual selection
  Object.keys(appState.verseSelections || {}).forEach((chapterKey) => {
    const selection = appState.verseSelections[chapterKey];
    if (!hasVerseSelection(selection)) {
      delete appState.verseSelections[chapterKey];
    }
  });

  saveState();
  startVerseDownloadsForSelection(); // Use verse-level downloads for verse selector
  recomputeActiveVerseIds();
  updateStartState();
  syncChapterSelectorToState();
  updateBookToggleStates();
  if (changedChapterKey) {
    updateChapterToggleState(changedChapterKey);
    const bookKey = changedBookKey || verseChapterToBook.get(changedChapterKey);
    if (bookKey) updateBookToggleState(bookKey);
  } else if (changedBookKey) {
    updateBookToggleState(changedBookKey);
  }
  if (sessionActive) {
    // Recalculate TF-IDF for new selection
    calculateSessionTFIDF();

    // Rebuild the question order if the selection changed while in session.
    questionOrder = shuffle(appState.activeVerseIds);
    const seedPoints = questionOrder.map((id) => randomPointsValue(id));
    const blanksData = questionOrder.map((id, idx) =>
      applyBlanks(appState.verseBank[id]?.text || '', seedPoints[idx], id)
    );
    questionPointsList = blanksData.map((data) => data.blankedWords.length);
    questionBlanksList = blanksData.map(data => data.blanked);
    questionAnswersList = blanksData.map(data => data.answer);
    questionBlankedWordsList = blanksData.map(data => data.blankedWords);
    hintsRevealedList = blanksData.map(() => 0);
    questionIndex = 0;
    updateQuestionView();
  }
};

const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const verseReference = (verseId) => {
  const [bookIdStr, chapterStr, verseStr] = verseId.split(',');
  const bookId = Number(bookIdStr);
  const chapter = Number(chapterStr);
  const verse = Number(verseStr);
  const bookMeta = Object.values(books).find((b) => b.id === bookId);
  const bookLabel = bookMeta?.label || `Book ${bookId}`;

  // Handle ABC (Andrew's Bible Commentary) - chapter 0
  if (chapter === 0) {
    const chapterKey = `${bookId},${chapter}`;
    const commentaryLabel = getCommentaryLabelForPart(chapterKey, verse);
    return commentaryLabel ? `ABC - ${commentaryLabel}` : `ABC - ${bookLabel}`;
  }

  return `${bookLabel} ${chapter}:${verse} (NKJV)`;
};

const randomPointsValue = (verseId) => {
  const verse = appState.verseBank[verseId];
  const plain = verse?.text ? stripHtml(verse.text).trim() : '';
  const wordCount = plain ? plain.split(/\s+/).filter(Boolean).length : 1;
  const percentCap = Math.max(1, Math.floor((appState.maxBlankPercentage / 100) * wordCount));
  const maxAllowed = Math.max(1, Math.min(appState.maxBlanks, wordCount, percentCap));
  const minAllowed = Math.max(1, Math.min(appState.minBlanks, maxAllowed));
  return Math.floor(Math.random() * (maxAllowed - minAllowed + 1)) + minAllowed;
};

const calculateVerseLevelTFIDF = (verseIds, verseBank) => {
  const idf = calculateIDF(verseIds, verseBank);
  const verseTfidf = {};

  verseIds.forEach(id => {
    const verse = verseBank[id];
    if (!verse || !verse.termFrequency) return;
    verseTfidf[id] = combineTfIdf(verse.termFrequency, idf);
  });

  return verseTfidf;
};

const calculateChapterLevelTFIDF = (verseIds, verseBank) => {
  // Group verses by chapter
  const chapterGroups = {};
  verseIds.forEach(id => {
    const verse = verseBank[id];
    if (!verse) return;
    const chapterKey = `${verse.bookId},${verse.chapter}`;
    if (!chapterGroups[chapterKey]) {
      chapterGroups[chapterKey] = [];
    }
    chapterGroups[chapterKey].push(id);
  });

  // Calculate TF for each chapter (aggregate all verses)
  const chapterTF = {};
  Object.entries(chapterGroups).forEach(([chapterKey, chapterVerseIds]) => {
    const allWords = [];
    chapterVerseIds.forEach(id => {
      const verse = verseBank[id];
      if (verse && verse.wordList) {
        allWords.push(...verse.wordList);
      }
    });
    chapterTF[chapterKey] = calculateTermFrequency(allWords);
  });

  // Calculate IDF across chapters
  const documentFrequency = {};
  const totalChapters = Object.keys(chapterGroups).length;

  Object.values(chapterTF).forEach(tf => {
    const uniqueWords = new Set(Object.keys(tf));
    uniqueWords.forEach(word => {
      documentFrequency[word] = (documentFrequency[word] || 0) + 1;
    });
  });

  const chapterIDF = {};
  Object.keys(documentFrequency).forEach(word => {
    chapterIDF[word] = Math.log(totalChapters / documentFrequency[word]);
  });

  // Calculate TF-IDF for each chapter
  const chapterTfidf = {};
  Object.entries(chapterTF).forEach(([chapterKey, tf]) => {
    chapterTfidf[chapterKey] = combineTfIdf(tf, chapterIDF);
  });

  return chapterTfidf;
};

const calculateSessionTFIDF = () => {
  if (appState.activeVerseIds.length === 0) {
    appState.tfidfCache = { verseLevel: {}, chapterLevel: {} };
    return;
  }

  // Calculate verse-level TF-IDF
  const verseLevelRaw = calculateVerseLevelTFIDF(appState.activeVerseIds, appState.verseBank);

  // Normalize verse-level scores
  const allVerseScores = {};
  Object.values(verseLevelRaw).forEach(verseScores => {
    Object.entries(verseScores).forEach(([word, score]) => {
      if (!allVerseScores[word]) allVerseScores[word] = [];
      allVerseScores[word].push(score);
    });
  });

  const verseLevelNormalized = {};
  Object.entries(verseLevelRaw).forEach(([verseId, scores]) => {
    verseLevelNormalized[verseId] = normalizeScores(scores);
  });

  // Calculate chapter-level TF-IDF
  const chapterLevelRaw = calculateChapterLevelTFIDF(appState.activeVerseIds, appState.verseBank);

  // Normalize chapter-level scores
  const allChapterScores = {};
  Object.values(chapterLevelRaw).forEach(chapterScores => {
    Object.entries(chapterScores).forEach(([word, score]) => {
      if (!allChapterScores[word]) allChapterScores[word] = [];
      allChapterScores[word].push(score);
    });
  });

  const chapterLevelNormalized = {};
  Object.entries(chapterLevelRaw).forEach(([chapterKey, scores]) => {
    chapterLevelNormalized[chapterKey] = normalizeScores(scores);
  });

  appState.tfidfCache = {
    verseLevel: verseLevelNormalized,
    chapterLevel: chapterLevelNormalized,
  };
};

const normalizeTextForNlp = (text) => {
  // Remove capitalization from words following punctuation, except for priority_words
  const PRIORITY_WORDS = new Set([
    // Divine names and titles
    'lord', 'god', 'jesus', 'christ', 'messiah', 'savior', 'redeemer', 'spirit', 'father', 'holy', 'almighty', 'yahweh', 'jehovah',
    // Patriarchs and early figures
    'adam', 'eve', 'noah', 'abraham', 'sarah', 'isaac', 'rebekah', 'jacob', 'rachel', 'leah', 'joseph',
    // Moses and Exodus era
    'moses', 'aaron', 'miriam', 'pharaoh', 'joshua', 'caleb',
    // Judges and early Israel
    'gideon', 'samson', 'deborah', 'samuel', 'eli',
    // Kings and prophets
    'saul', 'david', 'solomon', 'elijah', 'elisha', 'isaiah', 'jeremiah', 'ezekiel', 'daniel',
    'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi',
    // New Testament figures
    'mary', 'joseph', 'john', 'peter', 'paul', 'matthew', 'mark', 'luke', 'james', 'andrew', 'philip', 'bartholomew', 'thomas', 'judas', 'simon', 'thaddaeus',
    'stephen', 'barnabas', 'timothy', 'titus', 'silas', 'apollos', 'priscilla', 'aquila',
    'pilate', 'herod', 'caesar', 'caiaphas',
    // Places
    'israel', 'jerusalem', 'zion', 'bethlehem', 'nazareth', 'galilee', 'judea', 'samaria', 'egypt', 'babylon', 'assyria',
    'canaan', 'jordan', 'sinai', 'horeb', 'carmel', 'olivet', 'gethsemane', 'calvary', 'golgotha',
    'eden', 'babel', 'sodom', 'gomorrah', 'jericho', 'damascus', 'nineveh', 'tarsus', 'corinth', 'ephesus', 'rome', 'macedonia', 'athens',
    // Peoples and groups
    'israelites', 'hebrews', 'jews', 'gentiles', 'pharisees', 'sadducees', 'levites', 'priests', 'disciples', 'apostles',
    'philistines', 'egyptians', 'babylonians', 'assyrians', 'romans', 'persians', 'medes',
  ]);

  // Use a regex to find all punctuation followed by whitespace and capture what follows
  // This handles: . ! ? , ; : and any whitespace after them
  return text.replace(/([.!?,;:])\s+(\S)/g, (match, punct, firstChar) => {
    // Get the full word following the punctuation
    const restOfText = text.substring(text.indexOf(match) + match.length - 1);
    const wordMatch = restOfText.match(/^(\S+)/);

    if (wordMatch) {
      const fullWord = wordMatch[1];
      const lowerWord = fullWord.toLowerCase();

      // Only lowercase if it's not a priority word
      if (!PRIORITY_WORDS.has(lowerWord)) {
        return punct + ' ' + firstChar.toLowerCase();
      }
    }

    return match;
  });
};

const applyBlanks = (htmlText, blanks, verseId) => {
  const raw = (htmlText || '').trim();
  if (!raw) return { blanked: '', answer: '', blankedWords: [] };

  // Parse plain text with NLP, but keep track of original HTML
  const plainText = stripHtml(raw);
  const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
  // Never request more blanks than there are words in the verse and percentage cap
  const blanksRequested = Math.max(0, blanks);
  const percentCap = Math.max(1, Math.floor((appState.maxBlankPercentage / 100) * wordCount));
  const maxBlanksAllowed = Math.max(0, Math.min(blanksRequested, wordCount, percentCap));
  const normalizedText = normalizeTextForNlp(plainText);
  const doc = typeof nlp !== 'undefined' ? nlp(normalizedText) : null;
  const termJson =
    doc && doc.json
      ? doc
          .json({ terms: true })
          .flatMap((s) => s.terms || [])
          .map((t, idx) => ({ ...t, idx }))
      : plainText.split(/\s+/).map((w, idx) => ({ text: w, idx, tags: [] }));

  // Get TF-IDF scores for this verse
  const verse = appState.verseBank[verseId];
  const verseTfidf = appState.tfidfCache?.verseLevel?.[verseId] || {};
  const chapterKey = verse ? `${verse.bookId},${verse.chapter}` : null;
  const chapterTfidf = chapterKey ? (appState.tfidfCache?.chapterLevel?.[chapterKey] || {}) : {};

  const hasTag = (term, tags) => term.tags?.some((tag) => tags.includes(tag));

  // Common function words that should always be low priority, even when capitalized
  const FUNCTION_WORDS = new Set([
    'and', 'or', 'but', 'nor', 'yet', 'so', 'for', // conjunctions
    'the', 'a', 'an', // articles
    'in', 'on', 'at', 'to', 'from', 'by', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'up', 'down', 'of', 'off', 'over', 'under', 'upon', // prepositions
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'their', 'our', // pronouns
    'this', 'that', 'these', 'those', // demonstratives
    'am', 'is', 'are', 'was', 'were', 'be', 'being', 'been', // state-of-being verbs
    'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must', 'do', 'does', 'did', 'have', 'has', 'had', // modal and auxiliary verbs
  ]);

  // Biblical proper names and important terms that should be high priority
  const PRIORITY_WORDS = new Set([
    // Divine names and titles
    'lord', 'god', 'jesus', 'christ', 'messiah', 'savior', 'redeemer', 'spirit', 'father', 'holy', 'almighty', 'yahweh', 'jehovah',
    // Patriarchs and early figures
    'adam', 'eve', 'noah', 'abraham', 'sarah', 'isaac', 'rebekah', 'jacob', 'rachel', 'leah', 'joseph',
    // Moses and Exodus era
    'moses', 'aaron', 'miriam', 'pharaoh', 'joshua', 'caleb',
    // Judges and early Israel
    'gideon', 'samson', 'deborah', 'samuel', 'eli',
    // Kings and prophets
    'saul', 'david', 'solomon', 'elijah', 'elisha', 'isaiah', 'jeremiah', 'ezekiel', 'daniel',
    'hosea', 'joel', 'amos', 'obadiah', 'jonah', 'micah', 'nahum', 'habakkuk', 'zephaniah', 'haggai', 'zechariah', 'malachi',
    // New Testament figures
    'mary', 'joseph', 'john', 'peter', 'paul', 'matthew', 'mark', 'luke', 'james', 'andrew', 'philip', 'bartholomew', 'thomas', 'judas', 'simon', 'thaddaeus',
    'stephen', 'barnabas', 'timothy', 'titus', 'silas', 'apollos', 'priscilla', 'aquila',
    'pilate', 'herod', 'caesar', 'caiaphas',
    // Places
    'israel', 'jerusalem', 'zion', 'bethlehem', 'nazareth', 'galilee', 'judea', 'samaria', 'egypt', 'babylon', 'assyria',
    'canaan', 'jordan', 'sinai', 'horeb', 'carmel', 'olivet', 'gethsemane', 'calvary', 'golgotha',
    'eden', 'babel', 'sodom', 'gomorrah', 'jericho', 'damascus', 'nineveh', 'tarsus', 'corinth', 'ephesus', 'rome', 'macedonia', 'athens',
    // Peoples and groups
    'israelites', 'hebrews', 'jews', 'gentiles', 'pharisees', 'sadducees', 'levites', 'priests', 'disciples', 'apostles',
    'philistines', 'egyptians', 'babylonians', 'assyrians', 'romans', 'persians', 'medes',
  ]);

  // Assign priority to each term and calculate combined TF-IDF + priority score
  const termsWithPriority = termJson.map((t) => {
    const isPunct = hasTag(t, ['Punctuation']);
    const lowerText = (t.text || '').toLowerCase();
    let priority = 5;

    // Check for function words first (overrides tag-based classification)
    if (FUNCTION_WORDS.has(lowerText)) {
      priority = 4;
    } else if (PRIORITY_WORDS.has(lowerText) || hasTag(t, ['Person', 'Place', 'Organization', 'Date', 'Value', 'Cardinal', 'Ordinal'])) {
      priority = 1;
    } else if (hasTag(t, ['Noun', 'Verb', 'Gerund'])) {
      priority = 2;
    } else if (hasTag(t, ['Interjection', 'Expression', 'Adjective', 'Adverb', 'ProperNoun'])) {
      priority = 3;
    } else if (hasTag(t, ['Preposition', 'Conjunction', 'Determiner', 'Pronoun', 'Articles', 'StatesofBeingVerbs'])) {
      priority = 4;
    }

    // Calculate combined TF-IDF score (verse-level + chapter-level)
    const verseTfidfScore = verseTfidf[lowerText] || 0;
    const chapterTfidfScore = chapterTfidf[lowerText] || 0;
    const combinedTfidf = (verseTfidfScore * TFIDF_CONFIG.verseWeight) + (chapterTfidfScore * TFIDF_CONFIG.chapterWeight);

    // Convert priority to score (1-5 -> 1.0-0.2)
    const priorityScore = (6 - priority) / 5;

    // Calculate final weighted score
    const finalScore = (combinedTfidf * TFIDF_CONFIG.tfidfWeight) + (priorityScore * TFIDF_CONFIG.priorityWeight);

    return { ...t, isPunct, priority, tfidfScore: combinedTfidf, finalScore };
  });

  // Filter to get only non-punctuation candidates
  const candidates = termsWithPriority.filter((t) => !t.isPunct);

  // Sort candidates by finalScore (descending - higher score = more important)
  const sortedCandidates = [...candidates].sort((a, b) => b.finalScore - a.finalScore);

  // Calculate target number of blanks
  const target = Math.min(maxBlanksAllowed, candidates.length);

  // Select a larger pool of candidate words (up to 2x target or all candidates)
  // This gives us more words to choose from when we have duplicates
  const poolSize = Math.min(target * 2, candidates.length);
  const wordsInPriorityOrder = sortedCandidates
    .slice(0, poolSize)
    .map(c => termsWithPriority[c.idx]?.text?.toLowerCase())
    .filter(Boolean);

  // Replace words in the original HTML, preserving tags
  // First, find all matches grouped by word
  const matchesByWord = new Map();
  wordsInPriorityOrder.forEach(word => {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'ig');
    let match;
    const matches = [];
    while ((match = regex.exec(raw)) !== null) {
      matches.push({
        word: match[0],
        index: match.index,
        lowerWord: word
      });
      // Prevent infinite loop on zero-width matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
    if (matches.length > 0) {
      matchesByWord.set(word, matches);
    }
  });

  // Now select blanks in priority order, randomly choosing occurrences
  // Shuffle occurrences for each word once
  const shuffledOccurrencesByWord = new Map();
  wordsInPriorityOrder.forEach(word => {
    const occurrences = matchesByWord.get(word);
    if (occurrences && occurrences.length > 0) {
      shuffledOccurrencesByWord.set(word, [...occurrences].sort(() => Math.random() - 0.5));
    }
  });

  // Select blanks round-robin: one occurrence from each word in priority order
  const blanksToApply = [];
  let blanksRemaining = target;
  let round = 0;

  while (blanksRemaining > 0) {
    let addedThisRound = false;

    for (const word of wordsInPriorityOrder) {
      if (blanksRemaining <= 0) break;

      const occurrences = shuffledOccurrencesByWord.get(word);
      if (!occurrences || round >= occurrences.length) continue;

      // Take one occurrence from this word for this round
      blanksToApply.push(occurrences[round]);
      blanksRemaining--;
      addedThisRound = true;
    }

    // If we didn't add any blanks this round, we've exhausted all words
    if (!addedThisRound) break;
    round++;
  }

  // Sort by position in text to apply in order
  blanksToApply.sort((a, b) => a.index - b.index);

  // Apply blanks in order and collect the blanked words
  let blankedResult = '';
  let answerResult = '';
  const blankedWords = [];
  let cursor = 0;

  blanksToApply.forEach(({ word, lowerWord, index }) => {
    // Append text up to the word, then the replacement. Use indices to avoid touching injected markup.
    const idx = typeof index === 'number' ? index : raw.indexOf(word, cursor);
    if (idx < cursor || idx === -1) {
      return;
    }
    blankedResult += raw.slice(cursor, idx);
    answerResult += raw.slice(cursor, idx);

    blankedWords.push(word);
    blankedResult += '_________';
    answerResult += `<span class="blanked-word">${word}</span>`;
    cursor = idx + word.length;
  });

  // Append any remaining text after the last replacement
  blankedResult += raw.slice(cursor);
  answerResult += raw.slice(cursor);

  return { blanked: blankedResult, answer: answerResult, blankedWords };
};

const updateQuestionView = () => {
  if (!sessionActive || questionOrder.length === 0) {
    questionArea.style.display = 'none';
    return;
  }
  questionArea.style.display = 'block';
  answerArea.style.display = 'none';
  const verseId = questionOrder[questionIndex];
  const verseData = appState.verseBank[verseId];
  questionTitle.textContent = `Question ${questionIndex + 1}`;
  questionReference.textContent = verseReference(verseId);
  let pointsValue =
    questionPointsList[questionIndex] ?? (questionPointsList[questionIndex] = randomPointsValue(verseId));
  if (!questionBlanksList[questionIndex]) {
    const blanksData = applyBlanks(verseData?.text || '', pointsValue, verseId);
    questionBlanksList[questionIndex] = blanksData.blanked;
    questionAnswersList[questionIndex] = blanksData.answer;
    questionBlankedWordsList[questionIndex] = blanksData.blankedWords;
    // Sync points to actual blank count
    pointsValue = blanksData.blankedWords.length;
    questionPointsList[questionIndex] = pointsValue;
    hintsRevealedList[questionIndex] = 0;
  }
  questionPointsEl.textContent = `${questionPointsList[questionIndex]} Points`;

  // Apply hints if any have been revealed
  const hintsRevealed = hintsRevealedList[questionIndex] || 0;
  const blankedWords = questionBlankedWordsList[questionIndex] || [];
  let displayText = questionBlanksList[questionIndex];

  for (let i = 0; i < hintsRevealed && i < blankedWords.length; i++) {
    const word = blankedWords[i];
    const blankRegex = new RegExp('_________', '');
    displayText = displayText.replace(blankRegex, `<span class="blanked-word">${word}</span>`);
  }

  questionText.innerHTML = displayText;
  prevButton.disabled = questionIndex === 0;

  // Update hint button state
  if (hintsRevealed >= blankedWords.length) {
    hintButton.disabled = true;
    hintButton.textContent = 'No more hints';
  } else {
    hintButton.disabled = false;
    hintButton.textContent = `Hint (${hintsRevealed}/${blankedWords.length})`;
  }
};

const startSession = () => {
  if (appState.activeVerseIds.length === 0) return;
  sessionActive = true;

  // Calculate TF-IDF for current selection
  calculateSessionTFIDF();

  questionOrder = shuffle(appState.activeVerseIds);
  const seedPoints = questionOrder.map((id) => randomPointsValue(id));
  const blanksData = questionOrder.map((id, idx) =>
    applyBlanks(appState.verseBank[id]?.text || '', seedPoints[idx], id)
  );
  questionPointsList = blanksData.map((data) => data.blankedWords.length);
  questionBlanksList = blanksData.map(data => data.blanked);
  questionAnswersList = blanksData.map(data => data.answer);
  questionBlankedWordsList = blanksData.map(data => data.blankedWords);
  hintsRevealedList = blanksData.map(() => 0);
  questionIndex = 0;
  toggleSelectors(true);
  updateQuestionView();
};

const showAnswer = () => {
  if (!sessionActive || questionOrder.length === 0) return;
  // Reset hints for current question when leaving question screen
  hintsRevealedList[questionIndex] = 0;

  questionArea.style.display = 'none';
  answerArea.style.display = 'block';

  const verseId = questionOrder[questionIndex];
  answerTitle.textContent = `Answer ${questionIndex + 1}`;
  answerReference.textContent = verseReference(verseId);
  const pointsValue = questionPointsList[questionIndex];
  answerPointsEl.textContent = `${pointsValue} Points`;
  answerText.innerHTML = questionAnswersList[questionIndex];
  answerPrevButton.disabled = false;
};

const goNext = () => {
  if (!sessionActive || questionOrder.length === 0) return;
  if (questionIndex < questionOrder.length - 1) {
    questionIndex += 1;
  } else {
    questionOrder = shuffle(appState.activeVerseIds);
    const seedPoints = questionOrder.map((id) => randomPointsValue(id));
    const blanksData = questionOrder.map((id, idx) => applyBlanks(appState.verseBank[id]?.text || '', seedPoints[idx], id));
    questionPointsList = blanksData.map((data) => data.blankedWords.length);
    questionBlanksList = blanksData.map(data => data.blanked);
    questionAnswersList = blanksData.map(data => data.answer);
    questionBlankedWordsList = blanksData.map(data => data.blankedWords);
    hintsRevealedList = blanksData.map(() => 0);
    questionIndex = 0;
  }
  updateQuestionView();
};

const goPrev = () => {
  if (!sessionActive || questionOrder.length === 0) return;
  if (questionIndex > 0) {
    // Reset hints for current question before navigating away
    hintsRevealedList[questionIndex] = 0;
    questionIndex -= 1;
    updateQuestionView();
  }
};

const goNextFromAnswer = () => {
  if (!sessionActive || questionOrder.length === 0) return;
  if (questionIndex < questionOrder.length - 1) {
    questionIndex += 1;
  } else {
    questionOrder = shuffle(appState.activeVerseIds);
    const seedPoints = questionOrder.map((id) => randomPointsValue(id));
    const blanksData = questionOrder.map((id, idx) => applyBlanks(appState.verseBank[id]?.text || '', seedPoints[idx], id));
    questionPointsList = blanksData.map((data) => data.blankedWords.length);
    questionBlanksList = blanksData.map(data => data.blanked);
    questionAnswersList = blanksData.map(data => data.answer);
    questionBlankedWordsList = blanksData.map(data => data.blankedWords);
    hintsRevealedList = blanksData.map(() => 0);
    questionIndex = 0;
  }
  updateQuestionView();
};

const goPrevFromAnswer = () => {
  if (!sessionActive || questionOrder.length === 0) return;
  updateQuestionView();
};

const revealHint = () => {
  if (!sessionActive || questionOrder.length === 0) return;
  const currentHints = hintsRevealedList[questionIndex] || 0;
  const blankedWords = questionBlankedWordsList[questionIndex] || [];

  if (currentHints < blankedWords.length) {
    hintsRevealedList[questionIndex] = currentHints + 1;
    updateQuestionView();
  }
};

const showSelectorView = (mode) => {
  activeSelector = mode === 'verse' ? 'verse' : 'chapter';
  appState.activeSelector = activeSelector;
  saveState();
  const hasSelection = seasonSelect.value.trim().length > 0;
  const chapterDisplay = hasSelection && activeSelector === 'chapter' ? 'block' : 'none';
  const verseDisplay = hasSelection && activeSelector === 'verse' ? 'block' : 'none';
  chapterSelector.style.display = chapterDisplay;
  verseSelector.style.display = verseDisplay;
  if (activeSelector === 'verse') {
    updateVerseIndicators();
  } else if (activeSelector === 'chapter') {
    syncChapterSelectorToState();
  }
};

const computeCurrentYearKey = (yearKeys, now = new Date()) => {
  const month = now.getMonth() + 1;
  const calendarYear = now.getFullYear();
  const matchPart = month <= 5 ? 'end' : 'start';
  const parsed = (yearKeys || [])
    .map((key) => {
      const match = /^(\d{4})-(\d{4})$/.exec(key);
      if (!match) return null;
      return { key, start: Number(match[1]), end: Number(match[2]) };
    })
    .filter(Boolean);
  const found = parsed.find((p) => p[matchPart] === calendarYear);
  if (found) return found.key;
  const altPart = matchPart === 'start' ? 'end' : 'start';
  const alt = parsed.find((p) => p[altPart] === calendarYear);
  return alt ? alt.key : null;
};

const toggleChapterSelector = () => {
  const hasSelection = seasonSelect.value.trim().length > 0;
  const blanksDisplay = hasSelection ? 'block' : 'none';
  document.getElementById('blank-selector').style.display = blanksDisplay;
  startButton.style.display = hasSelection ? 'inline-flex' : 'none';

  if (!hasSelection) {
    renderChapterOptions(null, new Set());
    renderVerseOptions(null, new Set());
    startButton.disabled = true;
    // Clear active selections but preserve downloaded data
    appState.year = '';
    appState.chapterExclusions = {};
    appState.activeChapters = [];
    appState.activeVerseIds = [];
    appState.verseSelections = {};
    saveState();
    updateChapterIndicators();
    showSelectorView(activeSelector);
    return;
  }

  appState.year = seasonSelect.value;
  applyYearExclusions(appState.year);
  const selectedValues = new Set(appState.activeChapters || []);
  renderChapterOptions(seasonSelect.value, selectedValues);
  renderVerseOptions(seasonSelect.value, selectedValues);
  handleChapterSelectionChange();
  showSelectorView(activeSelector);
};

seasonSelect.addEventListener('change', () => {
  toggleChapterSelector();
});

startButton.addEventListener('click', startSession);
selectorsToggle.addEventListener('click', () => toggleSelectors());
nextButton.addEventListener('click', showAnswer);
prevButton.addEventListener('click', goPrev);
hintButton.addEventListener('click', revealHint);
answerNextButton.addEventListener('click', goNextFromAnswer);
answerPrevButton.addEventListener('click', goPrevFromAnswer);

toggleToVerseLink.addEventListener('click', (event) => {
  event.preventDefault();
  showSelectorView('verse');
});

toggleToChapterLink.addEventListener('click', (event) => {
  event.preventDefault();
  showSelectorView('chapter');
});

const handleMinBlanksChange = (evt) => {
  if (minBlanksInput.value === '') return; // allow clearing before entering a new number
  const value = Math.max(1, toInt(minBlanksInput.value, 1));
  appState.minBlanks = value;
  const maxWords = computeMaxWordsInActiveSelection();
  const percentVal = Math.max(1, Math.min(toInt(appState.maxBlankPercentage, 100), 100));
  const percentCap = Math.max(1, Math.floor((percentVal / 100) * maxWords));
  const allowedMax = Math.min(maxWords, percentCap);
  if (appState.maxBlanks < value) {
    appState.maxBlanks = Math.min(value, allowedMax);
  }
  // Only update UI if this is not an 'input' event (i.e., user is still typing)
  if (evt.type !== 'input') {
    updateBlankInputs();
  }
};

const handleMaxBlanksChange = (evt) => {
  if (maxBlanksInput.value === '') return; // allow clearing before entering a new number
  const value = Math.max(1, toInt(maxBlanksInput.value, 1));
  const maxWords = computeMaxWordsInActiveSelection();
  const percentVal = Math.max(1, Math.min(toInt(appState.maxBlankPercentage, 100), 100));
  const percentCap = Math.max(1, Math.floor((percentVal / 100) * maxWords));
  const allowedMax = Math.min(maxWords, percentCap);
  appState.maxBlanks = Math.min(value, allowedMax);
  // Only update UI if this is not an 'input' event (i.e., user is still typing)
  if (evt.type !== 'input') {
    updateBlankInputs();
  }
};

const handleMaxPercentChange = (evt) => {
  if (maxBlankPercentageInput.value === '') return; // allow clearing before entering a new number
  const value = Math.max(1, toInt(maxBlankPercentageInput.value, 100));
  appState.maxBlankPercentage = Math.min(value, 100);
  // Only update UI if this is not an 'input' event (i.e., user is still typing)
  if (evt.type !== 'input') {
    updateBlankInputs();
  }
};

['input', 'change'].forEach((evt) => {
  minBlanksInput.addEventListener(evt, handleMinBlanksChange);
  maxBlanksInput.addEventListener(evt, handleMaxBlanksChange);
  maxBlankPercentageInput.addEventListener(evt, handleMaxPercentChange);
});

// Normalize blank fields on blur so typing isn't interrupted by live validation
[minBlanksInput, maxBlanksInput, maxBlankPercentageInput].forEach((input) => {
  input.addEventListener('blur', () => {
    updateBlankInputs();
  });
});

// Initialize app with async state loading
(async () => {
  await loadBooksData();
  await loadChaptersByYear();
  const initialState = await loadState();
  if (initialState) {
    appState = initialState;
    // Save the migrated state back to IndexedDB
    await saveState();
  }

  // Apply default year for new users if no year is selected
  if (!appState.year) {
  const yearKeys = Object.keys(chaptersByYear);
  const currentKey = computeCurrentYearKey(yearKeys);
  appState.year = currentKey || yearKeys[0] || '';
  }

  if (appState.year) {
    applyYearExclusions(appState.year);
  }
  await seedCommentaryContent();

  activeSelector = appState.activeSelector === 'verse' ? 'verse' : 'chapter';
  renderYearOptions(appState.year);
  if (appState.year) {
    seasonSelect.value = appState.year;
  }

  installCompromisePlugin();
  toggleChapterSelector();
  requestPersistentStorage();
})();
