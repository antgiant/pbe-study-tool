import {
  openDatabase,
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
  updateSelections,
  getChapter,
  getAllChapters,
  saveChapter,
  deleteChapter,
  getVerse,
  getVersesByChapter,
  getVersesByChapters,
  saveVerse,
  saveVerses,
  deleteVersesByChapter,
  getAllPresets,
  getPreset,
  getPresetByName,
  savePreset,
  deletePreset,
  ensureNonePreset,
  NONE_PRESET_ID,
  NONE_PRESET_NAME,
} from './src/database.js';

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
const minBlanksError = document.getElementById('min-blanks-error');
const maxBlanksError = document.getElementById('max-blanks-error');
const maxBlankPercentageInput = document.getElementById('max-blank-percentage');
const maxBlankPercentageLabel = document.querySelector('label[for="max-blank-percentage"]');
const useOnlyPercentageInput = document.getElementById('use-only-percentage');
const blankLimitHint = document.getElementById('blank-limit');
const minBlanksLabel = document.querySelector('label[for="min-blanks"]');
const maxBlanksLabel = document.querySelector('label[for="max-blanks"]');
const fillInBlankPercentageInput = document.getElementById('fill-in-blank-percentage');
const questionTypeTotalValue = document.getElementById('question-type-total-value');
const presetOptionsContainer = document.getElementById('preset-options');
const presetManageButton = document.getElementById('preset-manage-button');
const presetSaveStatus = document.getElementById('preset-save-status');
const presetModal = document.getElementById('preset-modal');
const presetModalClose = document.getElementById('preset-modal-close');
const presetListContainer = document.getElementById('preset-list-container');
const presetNameModal = document.getElementById('preset-name-modal');
const presetNameModalClose = document.getElementById('preset-name-modal-close');
const presetNameInput = document.getElementById('preset-name-input');
const presetNameSave = document.getElementById('preset-name-save');
const presetNameCancel = document.getElementById('preset-name-cancel');
const presetNameError = document.getElementById('preset-name-error');

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
    useOnlyPercentage: appState.useOnlyPercentage,
    fillInBlankPercentage: appState.fillInBlankPercentage,
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
  useOnlyPercentage: false,
  fillInBlankPercentage: 100,
  currentPresetId: null,
  presetModified: false,
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
    await checkAndMigrateSchema({
      stateVersion: STATE_VERSION,
      statusNotDownloaded: STATUS.NOT_DOWNLOADED,
    });

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
      useOnlyPercentage: settings.useOnlyPercentage || false,
      fillInBlankPercentage: settings.fillInBlankPercentage || 100,
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
      useOnlyPercentage: appState.useOnlyPercentage,
      fillInBlankPercentage: appState.fillInBlankPercentage,
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

// Preset Management Functions
function generatePresetId() {
  return `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getCurrentPresetState() {
  return {
    year: appState.year,
    activeChapters: [...appState.activeChapters],
    verseSelections: JSON.parse(JSON.stringify(appState.verseSelections)),
    activeSelector: appState.activeSelector,
    minBlanks: appState.minBlanks,
    maxBlanks: appState.maxBlanks,
    maxBlankPercentage: appState.maxBlankPercentage,
    useOnlyPercentage: appState.useOnlyPercentage,
    fillInBlankPercentage: appState.fillInBlankPercentage
  };
}

async function applyPresetState(presetData) {
  // Update state
  appState.year = presetData.year;
  appState.activeChapters = [...presetData.activeChapters];
  appState.verseSelections = JSON.parse(JSON.stringify(presetData.verseSelections));
  appState.activeSelector = presetData.activeSelector;
  appState.minBlanks = presetData.minBlanks;
  appState.maxBlanks = presetData.maxBlanks;
  appState.maxBlankPercentage = presetData.maxBlankPercentage;
  appState.useOnlyPercentage = presetData.useOnlyPercentage;
  appState.fillInBlankPercentage = presetData.fillInBlankPercentage;

  // Update UI
  seasonSelect.value = presetData.year;
  minBlanksInput.value = presetData.minBlanks;
  maxBlanksInput.value = presetData.maxBlanks;
  maxBlankPercentageInput.value = presetData.maxBlankPercentage;
  useOnlyPercentageInput.checked = presetData.useOnlyPercentage;
  fillInBlankPercentageInput.value = presetData.fillInBlankPercentage;

  // Apply year exclusions and render selections
  applyYearExclusions(presetData.year);

  const selectedValues = new Set(appState.activeChapters || []);

  // Show correct selector
  if (presetData.activeSelector === 'verse') {
    chapterSelector.style.display = 'none';
    verseSelector.style.display = 'block';
    await renderVerseOptions(presetData.year, selectedValues);
  } else {
    chapterSelector.style.display = 'block';
    verseSelector.style.display = 'none';
    renderChapterOptions(presetData.year, selectedValues);
  }

  // Recompute active verses
  recomputeActiveVerseIds();

  // Save state
  await saveState();
}

let presetAutoSaveTimer = null;
let presetAutoSavePromise = null;
let presetSaveStatusTimer = null;
const PRESET_AUTOSAVE_DELAY = 500;
let presetNameMode = 'create';
let presetNameTargetId = null;
let presetListCache = [];
let presetDragState = null;

const isNonePreset = (preset) => preset?.id === NONE_PRESET_ID;

const ensureNonePresetExists = async () => {
  const preset = await ensureNonePreset(getCurrentPresetState());
  if (!appState.currentPresetId) {
    appState.currentPresetId = preset.id;
    appState.presetModified = false;
  }
  return preset;
};

const getNativeDndSupport = () => {
  if (typeof window === 'undefined') return false;
  const supportsDrag = 'draggable' in document.createElement('div');
  const prefersFinePointer = window.matchMedia?.('(pointer: fine)')?.matches ?? true;
  return supportsDrag && prefersFinePointer;
};

const reorderPresets = async (draggedId, targetId) => {
  if (draggedId === NONE_PRESET_ID || targetId === NONE_PRESET_ID) return;
  if (!draggedId || !targetId || draggedId === targetId) return;

  const fromIndex = presetListCache.findIndex(p => p.id === draggedId);
  const toIndex = presetListCache.findIndex(p => p.id === targetId);
  if (fromIndex === -1 || toIndex === -1) return;

  const reordered = [...presetListCache];
  const [moved] = reordered.splice(fromIndex, 1);
  reordered.splice(toIndex, 0, moved);

  await Promise.all(
    reordered.map((preset, index) => savePreset({
      ...preset,
      order: index
    }))
  );

  presetListCache = reordered;
  await loadPresetList();
  await renderPresetList();
  showPresetSaveStatus('Reordered');
};

function showPresetSaveStatus(message = 'Saved') {
  if (!presetSaveStatus) return;
  presetSaveStatus.textContent = message;
  presetSaveStatus.style.display = 'block';
  if (presetSaveStatusTimer) {
    clearTimeout(presetSaveStatusTimer);
  }
  presetSaveStatusTimer = setTimeout(() => {
    presetSaveStatus.style.display = 'none';
  }, 1500);
}

async function saveCurrentPreset() {
  if (!appState.currentPresetId) return;

  try {
    const existing = await getPreset(appState.currentPresetId);
    if (!existing) return;

    const preset = {
      ...existing,
      lastModified: new Date().toISOString(),
      ...getCurrentPresetState()
    };

    await savePreset(preset);
    appState.presetModified = false;
    showPresetSaveStatus();
  } catch (err) {
    console.error('Error auto-saving preset:', err);
  }
}

async function flushPresetAutoSave() {
  if (presetAutoSaveTimer) {
    clearTimeout(presetAutoSaveTimer);
    presetAutoSaveTimer = null;
    await saveCurrentPreset();
    return;
  }
  if (presetAutoSavePromise) {
    await presetAutoSavePromise;
  }
}

function markPresetModified() {
  if (!appState.currentPresetId) return;
  appState.presetModified = true;
  if (presetAutoSaveTimer) {
    clearTimeout(presetAutoSaveTimer);
  }
  presetAutoSaveTimer = setTimeout(() => {
    presetAutoSaveTimer = null;
    presetAutoSavePromise = saveCurrentPreset().finally(() => {
      presetAutoSavePromise = null;
    });
  }, PRESET_AUTOSAVE_DELAY);
}

function setSelectedPreset(presetId) {
  const presetRadios = presetOptionsContainer.querySelectorAll('.preset-option');
  presetRadios.forEach(radio => {
    radio.checked = radio.value === presetId;
  });
}

async function loadPresetList() {
  try {
    await ensureNonePresetExists();
    const presets = await getAllPresets();

    // Clear existing options
    presetOptionsContainer.innerHTML = '';

    // Add preset options
    presets.forEach(preset => {
    const label = document.createElement('label');
    label.className = 'preset-radio-label';
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'preset';
    input.value = preset.id;
    input.className = 'preset-option';
    const span = document.createElement('span');
    span.textContent = preset.name;
    label.appendChild(input);
    label.appendChild(span);
    presetOptionsContainer.appendChild(label);
  });

  if (presets.length === 0) {
    const emptyNote = document.createElement('div');
    emptyNote.className = 'preset-empty-option';
    emptyNote.textContent = 'No presets yet. Click "New" to create one.';
    presetOptionsContainer.appendChild(emptyNote);
  }

  const newLabel = document.createElement('label');
  newLabel.className = 'preset-radio-label preset-new-option';
  const newInput = document.createElement('input');
  newInput.type = 'radio';
  newInput.name = 'preset';
  newInput.value = '__new__';
  newInput.className = 'preset-option';
  const newSpan = document.createElement('span');
  newSpan.textContent = 'New';
  newLabel.appendChild(newInput);
  newLabel.appendChild(newSpan);
  presetOptionsContainer.appendChild(newLabel);

  // Add event listeners to all radio buttons
  const presetRadios = presetOptionsContainer.querySelectorAll('.preset-option');
  presetRadios.forEach(radio => {
    radio.addEventListener('change', async () => {
      const presetId = radio.value;
      if (presetId === '__new__') {
        showPresetNameModal('create');
        setSelectedPreset(appState.currentPresetId || '');
        return;
      }
      await loadPresetById(presetId);
    });
  });
  } catch (err) {
    console.warn('Error loading preset list:', err);
    presetOptionsContainer.innerHTML = '';
    const emptyNote = document.createElement('div');
    emptyNote.className = 'preset-empty-option';
    emptyNote.textContent = 'No presets yet. Click "New" to create one.';
    presetOptionsContainer.appendChild(emptyNote);

    const newLabel = document.createElement('label');
    newLabel.className = 'preset-radio-label preset-new-option';
    const newInput = document.createElement('input');
    newInput.type = 'radio';
    newInput.name = 'preset';
    newInput.value = '__new__';
    newInput.className = 'preset-option';
    const newSpan = document.createElement('span');
    newSpan.textContent = 'New';
    newLabel.appendChild(newInput);
    newLabel.appendChild(newSpan);
    presetOptionsContainer.appendChild(newLabel);

    const presetRadios = presetOptionsContainer.querySelectorAll('.preset-option');
    presetRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        showPresetNameModal('create');
        setSelectedPreset(appState.currentPresetId || '');
      });
    });
  }
}

async function createPreset(name) {
  try {
    const now = new Date();
    const preset = {
      id: generatePresetId(),
      name: name.trim(),
      createdAt: now.toISOString(),
      lastModified: now.toISOString(),
      order: now.getTime(),
      ...getCurrentPresetState()
    };

    await savePreset(preset);

    // Update state
    appState.currentPresetId = preset.id;
    appState.presetModified = false;

    // Update UI
    await loadPresetList();
    setSelectedPreset(preset.id);

  } catch (err) {
    console.error('Error creating preset:', err);
    alert('Failed to save preset. Please try again.');
  }
}

async function loadPresetById(presetId) {
  if (!presetId) return;

  await flushPresetAutoSave();

  try {
    const preset = await getPreset(presetId);
    if (!preset) {
      alert('Preset not found. It may have been deleted.');
      await loadPresetList();
      return;
    }

    // Apply preset
    await applyPresetState(preset);

    // Update tracking
    appState.currentPresetId = preset.id;
    appState.presetModified = false;

  } catch (err) {
    console.error('Error loading preset:', err);
    alert('Failed to load preset. Please try again.');
  }
}

async function deletePresetById(id) {
  try {
    const preset = await getPreset(id);
    if (!preset) return;
    if (isNonePreset(preset)) return;

    const confirmed = confirm(`Delete preset "${preset.name}"? This cannot be undone.`);
    if (!confirmed) return;

    await deletePreset(id);

    // If this was the current preset, clear tracking
    if (appState.currentPresetId === id) {
      appState.currentPresetId = null;
      appState.presetModified = false;
      setSelectedPreset('');
    }

    // Refresh lists
    await loadPresetList();
    await renderPresetList();
  } catch (err) {
    console.error('Error deleting preset:', err);
    alert('Failed to delete preset. Please try again.');
  }
}

async function renamePreset(id, newName) {
  try {
    const existing = await getPreset(id);
    if (!existing) {
      alert('Preset not found. It may have been deleted.');
      return;
    }
    if (isNonePreset(existing)) return;

    const updated = {
      ...existing,
      name: newName.trim(),
      lastModified: new Date().toISOString()
    };

    await savePreset(updated);
    await loadPresetList();
    await renderPresetList();
    setSelectedPreset(appState.currentPresetId || updated.id);
    showPresetSaveStatus('Renamed');
  } catch (err) {
    console.error('Error renaming preset:', err);
    alert('Failed to rename preset. Please try again.');
  }
}

function showPresetNameModal(mode = 'create', currentName = '', presetId = null) {
  presetNameMode = mode;
  presetNameTargetId = presetId;
  presetNameInput.value = currentName;
  presetNameError.textContent = '';
  presetNameModal.querySelector('h2').textContent = mode === 'create' ? 'New Preset' : 'Rename Preset';
  presetNameModal.style.display = 'flex';
  presetNameInput.focus();
}

async function renderPresetList() {
  await ensureNonePresetExists();
  const presets = await getAllPresets();
  presetListCache = presets;

  if (presets.length === 0) {
    presetListContainer.innerHTML = `
      <div class="preset-empty-state">
        <p>No presets saved yet.</p>
        <p>Click "New" to create one.</p>
      </div>
    `;
    return;
  }

  presetListContainer.innerHTML = presets.map(preset => {
    const isActive = preset.id === appState.currentPresetId;
    const locked = isNonePreset(preset);
    const date = new Date(preset.lastModified);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();

    return `
      <div class="preset-list-item ${isActive ? 'active' : ''}" data-preset-id="${preset.id}">
        <button class="drag-handle" type="button" aria-label="Reorder preset ${preset.name}" ${locked ? 'disabled aria-disabled="true"' : ''}>
          <span class="drag-handle-icon" aria-hidden="true"></span>
        </button>
        <div class="preset-item-info">
          <div class="preset-item-name">${preset.name}</div>
          <div class="preset-item-meta">Last modified: ${dateStr}</div>
        </div>
        <div class="preset-item-actions">
          <button class="load-preset-btn" data-preset-id="${preset.id}">Load</button>
          <button class="rename-preset-btn" data-preset-id="${preset.id}" ${locked ? 'disabled aria-disabled="true"' : ''}>Rename</button>
          <button class="delete-preset-btn delete-btn" data-preset-id="${preset.id}" ${locked ? 'disabled aria-disabled="true"' : ''}>Delete</button>
        </div>
      </div>
    `;
  }).join('');

  // Add event listeners
  presetListContainer.querySelectorAll('.load-preset-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.presetId;
      await loadPresetById(id);
      presetModal.style.display = 'none';
    });
  });

  presetListContainer.querySelectorAll('.delete-preset-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.presetId;
      await deletePresetById(id);
    });
  });

  presetListContainer.querySelectorAll('.rename-preset-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const id = e.target.dataset.presetId;
      const preset = await getPreset(id);
      if (!preset) return;
      showPresetNameModal('rename', preset.name, id);
    });
  });

  const useNativeDnd = getNativeDndSupport();
  if (useNativeDnd) {
    presetListContainer.querySelectorAll('.preset-list-item').forEach(item => {
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });

      item.addEventListener('drop', async (e) => {
        e.preventDefault();
        const draggedId = e.dataTransfer.getData('text/plain');
        const targetId = item.dataset.presetId;
        await reorderPresets(draggedId, targetId);
      });
    });

    presetListContainer.querySelectorAll('.drag-handle:not([disabled])').forEach(handle => {
      handle.setAttribute('draggable', 'true');
      handle.addEventListener('dragstart', (e) => {
        const item = handle.closest('.preset-list-item');
        if (!item) return;
        item.classList.add('dragging');
        e.dataTransfer.setData('text/plain', item.dataset.presetId);
        e.dataTransfer.effectAllowed = 'move';
      });

      handle.addEventListener('dragend', () => {
        const item = handle.closest('.preset-list-item');
        if (item) item.classList.remove('dragging');
      });
    });
    return;
  }

  const clearDropTargets = () => {
    presetListContainer.querySelectorAll('.preset-list-item.drop-target')
      .forEach(item => item.classList.remove('drop-target'));
  };

  const finishPresetReorder = async () => {
    if (!presetDragState) return;
    const { draggedId, targetId, draggedItem } = presetDragState;
    presetDragState = null;
    clearDropTargets();
    if (draggedItem) draggedItem.classList.remove('dragging');
    if (!draggedId || !targetId || draggedId === targetId) return;
    await reorderPresets(draggedId, targetId);
  };

  const autoScrollOnDrag = (clientY) => {
    const rect = presetListContainer.getBoundingClientRect();
    const edgeDistance = 40;
    const scrollSpeed = 10;
    if (clientY < rect.top + edgeDistance) {
      presetListContainer.scrollTop -= scrollSpeed;
    } else if (clientY > rect.bottom - edgeDistance) {
      presetListContainer.scrollTop += scrollSpeed;
    }
  };

  presetListContainer.querySelectorAll('.drag-handle:not([disabled])').forEach(handle => {
    handle.addEventListener('pointerdown', (e) => {
      const item = e.currentTarget.closest('.preset-list-item');
      if (!item) return;
      presetDragState = {
        draggedId: item.dataset.presetId,
        targetId: null,
        draggedItem: item
      };
      item.classList.add('dragging');
      handle.setPointerCapture(e.pointerId);
    });

    handle.addEventListener('pointermove', (e) => {
      if (!presetDragState) return;
      const hovered = document.elementFromPoint(e.clientX, e.clientY);
      const targetItem = hovered?.closest('.preset-list-item');
      if (!targetItem) {
        clearDropTargets();
        presetDragState.targetId = null;
        autoScrollOnDrag(e.clientY);
        return;
      }
      if (targetItem.dataset.presetId === presetDragState.draggedId) {
        clearDropTargets();
        presetDragState.targetId = null;
        autoScrollOnDrag(e.clientY);
        return;
      }
      clearDropTargets();
      targetItem.classList.add('drop-target');
      presetDragState.targetId = targetItem.dataset.presetId;
      autoScrollOnDrag(e.clientY);
    });

    handle.addEventListener('pointerup', async () => {
      await finishPresetReorder();
    });

    handle.addEventListener('pointercancel', async () => {
      await finishPresetReorder();
    });
  });
}

async function openPresetManager() {
  await renderPresetList();
  presetModal.style.display = 'flex';
}


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
  const percentVal = Math.max(1, Math.min(toInt(appState.maxBlankPercentage, 100), 100));
  const hasSelection = appState.activeVerseIds.length > 0;

  if (!hasSelection) {
    const maxVal = Math.max(1, toInt(appState.maxBlanks, 1));
    const minVal = Math.max(1, Math.min(toInt(appState.minBlanks, 1), maxVal));

    appState.minBlanks = minVal;
    appState.maxBlanks = maxVal;
    appState.maxBlankPercentage = percentVal;

    minBlanksInput.min = 1;
    minBlanksInput.removeAttribute('max');
    maxBlanksInput.min = 1;
    maxBlanksInput.removeAttribute('max');
    maxBlankPercentageInput.min = 1;
    maxBlankPercentageInput.max = 100;

    minBlanksInput.value = appState.minBlanks;
    maxBlanksInput.value = appState.maxBlanks;
    maxBlankPercentageInput.value = appState.maxBlankPercentage;

    if (appState.useOnlyPercentage) {
      // Hide min/max blanks inputs and labels
      minBlanksInput.disabled = true;
      maxBlanksInput.disabled = true;
      minBlanksInput.style.display = 'none';
      maxBlanksInput.style.display = 'none';
      if (minBlanksLabel) minBlanksLabel.style.display = 'none';
      if (maxBlanksLabel) maxBlanksLabel.style.display = 'none';
      if (minBlanksError) minBlanksError.style.display = 'none';
      if (maxBlanksError) maxBlanksError.style.display = 'none';

      // Hide the hint
      if (blankLimitHint) blankLimitHint.style.display = 'none';

      // Change label to "Percent Blank"
      if (maxBlankPercentageLabel) {
        maxBlankPercentageLabel.textContent = 'Percent Blank';
      }
    } else {
      // Show min/max blanks inputs and labels
      minBlanksInput.disabled = false;
      maxBlanksInput.disabled = false;
      minBlanksInput.style.display = '';
      maxBlanksInput.style.display = '';
      if (minBlanksLabel) minBlanksLabel.style.display = '';
      if (maxBlanksLabel) maxBlanksLabel.style.display = '';
      if (minBlanksError) minBlanksError.style.display = '';
      if (maxBlanksError) maxBlanksError.style.display = '';

      // Show the hint
      if (blankLimitHint) blankLimitHint.style.display = '';

      // Change label back to "Max percentage blank"
      if (maxBlankPercentageLabel) {
        maxBlankPercentageLabel.textContent = 'Max percentage blank';
      }
    }

    blankLimitHint.textContent = 'Select at least one verse or chapter to compute blank limits.';
    saveState();
    return;
  }

  const maxWords = computeMaxWordsInActiveSelection();
  const percentCap = Math.max(1, Math.floor((percentVal / 100) * maxWords));
  const allowedMax = Math.min(maxWords, percentCap);

  // If use-only-percentage is enabled, set both min and max to the allowed maximum
  if (appState.useOnlyPercentage) {
    appState.minBlanks = allowedMax;
    appState.maxBlanks = allowedMax;
  }

  // Ensure appState values are at least 1 if not set
  if (!appState.minBlanks || appState.minBlanks < 1) {
    appState.minBlanks = 1;
  }
  if (!appState.maxBlanks || appState.maxBlanks < 1) {
    appState.maxBlanks = 1;
  }

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

  // Reflect the checkbox state in the UI
  if (useOnlyPercentageInput) {
    useOnlyPercentageInput.checked = !!appState.useOnlyPercentage;
  }

  if (appState.useOnlyPercentage) {
    // Hide min/max blanks inputs and labels
    minBlanksInput.disabled = true;
    maxBlanksInput.disabled = true;
    minBlanksInput.style.display = 'none';
    maxBlanksInput.style.display = 'none';
    if (minBlanksLabel) minBlanksLabel.style.display = 'none';
    if (maxBlanksLabel) maxBlanksLabel.style.display = 'none';
    if (minBlanksError) minBlanksError.style.display = 'none';
    if (maxBlanksError) maxBlanksError.style.display = 'none';

    // Hide the hint
    if (blankLimitHint) blankLimitHint.style.display = 'none';

    // Change label to "Percent Blank"
    if (maxBlankPercentageLabel) {
      maxBlankPercentageLabel.textContent = 'Percent Blank';
    }
  } else {
    // Show min/max blanks inputs and labels
    minBlanksInput.disabled = false;
    maxBlanksInput.disabled = false;
    minBlanksInput.style.display = '';
    maxBlanksInput.style.display = '';
    if (minBlanksLabel) minBlanksLabel.style.display = '';
    if (maxBlanksLabel) maxBlanksLabel.style.display = '';
    if (minBlanksError) minBlanksError.style.display = '';
    if (maxBlanksError) maxBlanksError.style.display = '';

    // Show the hint
    if (blankLimitHint) blankLimitHint.style.display = '';

    // Change label back to "Max percentage blank"
    if (maxBlankPercentageLabel) {
      maxBlankPercentageLabel.textContent = 'Max percentage blank';
    }
  }

  blankLimitHint.textContent = `Max allowed is ${allowedMax} based on selected verses and ${appState.maxBlankPercentage}% cap.`;

  // Validate the current blank settings (which may now be invalid due to verse selection change)
  validateBlankInputs();

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
  const percentagesValid = validateQuestionTypePercentages();
  const blanksValid = validateBlankInputs();
  const isDisabled = !anySelected || anyDownloads || !allReady || !hasVerses || !percentagesValid || !blanksValid;

  startButton.disabled = isDisabled;

  // Update aria-label to provide helpful feedback
  if (isDisabled) {
    if (!anySelected || !hasVerses) {
      startButton.setAttribute('aria-label', 'Start quiz - disabled until verses are selected');
    } else if (anyDownloads) {
      startButton.setAttribute('aria-label', 'Start quiz - disabled while downloading verses');
    } else if (!blanksValid) {
      startButton.setAttribute('aria-label', 'Start quiz - disabled until blank settings are valid');
    } else if (!percentagesValid) {
      startButton.setAttribute('aria-label', 'Start quiz - disabled until question type percentages total 100%');
    } else {
      startButton.setAttribute('aria-label', 'Start quiz - disabled until all verses are ready');
    }
  } else {
    startButton.setAttribute('aria-label', 'Start quiz');
  }
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
  selectorsToggle.setAttribute('aria-expanded', shouldCollapse ? 'false' : 'true');
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
  markPresetModified();
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
  markPresetModified();
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

  // Pool of candidate words to consider, maintaining priority order
  const prioritizedCandidates = sortedCandidates.slice(0, Math.min(target * 2, candidates.length));

  // Find all occurrences of each unique candidate word in the original text
  const uniqueWords = [...new Set(prioritizedCandidates.map(c => c.text.toLowerCase()))];
  const matchesByWord = new Map();
  uniqueWords.forEach(word => {
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
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
    if (matches.length > 0) {
      matchesByWord.set(word, matches);
    }
  });

  // Shuffle the occurrences of each word to ensure random selection
  const availableOccurrences = new Map();
  matchesByWord.forEach((matches, word) => {
    availableOccurrences.set(word, [...matches].sort(() => Math.random() - 0.5));
  });

  // Select words to blank based on priority, handling duplicates correctly.
  const blanksToApply = [];
  const appliedIndices = new Set();

  // First pass: iterate through prioritized candidates and pick one occurrence for each
  for (const candidate of prioritizedCandidates) {
    if (blanksToApply.length >= target) break;

    const lowerWord = candidate.text.toLowerCase();
    const occurrences = availableOccurrences.get(lowerWord);

    if (occurrences && occurrences.length > 0) {
      const occurrence = occurrences.shift(); // Take the next available occurrence
      if (occurrence && !appliedIndices.has(occurrence.index)) {
        blanksToApply.push(occurrence);
        appliedIndices.add(occurrence.index);
      }
    }
  }

  // Second pass: if we still don't have enough blanks (e.g., due to duplicates),
  // keep taking from available occurrences until the target is met.
  while (blanksToApply.length < target) {
    let addedInPass = false;
    for (const candidate of prioritizedCandidates) {
      if (blanksToApply.length >= target) break;

      const lowerWord = candidate.text.toLowerCase();
      const occurrences = availableOccurrences.get(lowerWord);

      if (occurrences && occurrences.length > 0) {
        const occurrence = occurrences.shift();
        if (occurrence && !appliedIndices.has(occurrence.index)) {
          blanksToApply.push(occurrence);
          appliedIndices.add(occurrence.index);
          addedInPass = true;
        }
      }
    }
    // If a full pass adds nothing, we're out of options.
    if (!addedInPass) break;
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
    // Use fixed-width blanks to avoid giving hints about word length
    blankedResult += `<span class="blank" data-word="${word}">_________</span>`;
    answerResult += `<span class="blank revealed" data-word="${word}">${word}</span>`;
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

  if (hintsRevealed > 0) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = displayText;
    const blanks = tempDiv.querySelectorAll('.blank:not(.revealed)');
    for (let i = 0; i < hintsRevealed && i < blanks.length; i++) {
      blanks[i].textContent = blanks[i].dataset.word;
      blanks[i].classList.add('revealed', 'hint-revealed');
    }
    displayText = tempDiv.innerHTML;
  }

  questionText.innerHTML = displayText;
  
  // Scale any revealed blanks to fit
  questionText.querySelectorAll('.blank.revealed').forEach(scaleToFit);
  
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

  // Check if all blanks are revealed in question mode (either via hints or direct clicks)
  const blankedWords = questionBlankedWordsList[questionIndex] || [];
  const totalBlanks = questionText.querySelectorAll('.blank').length;
  const revealedBlanks = questionText.querySelectorAll('.blank.revealed').length;
  if (blankedWords.length > 0 && totalBlanks > 0 && revealedBlanks >= totalBlanks) {
    // All answers are revealed, skip answer screen and go to next question
    goNextFromAnswer();
    return;
  }

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
  const blankedWords = questionBlankedWordsList[questionIndex] || [];

  // Find the next unrevealed blank in the DOM
  const nextUnrevealed = questionText.querySelector('.blank:not(.revealed)');
  if (nextUnrevealed) {
    nextUnrevealed.textContent = nextUnrevealed.dataset.word;
    nextUnrevealed.classList.add('revealed', 'hint-revealed');
    // Update the hint count
    const revealedCount = questionText.querySelectorAll('.blank.revealed').length;
    hintsRevealedList[questionIndex] = revealedCount;
    // Update hint button state
    if (revealedCount >= blankedWords.length) {
      hintButton.disabled = true;
      hintButton.textContent = 'No more hints';
    } else {
      hintButton.textContent = `Hint (${revealedCount}/${blankedWords.length})`;
    }
  }
};

const scaleToFit = (element) => {
  // Reset any previous scaling
  element.style.fontSize = '';
  
  // Lock the width in pixels before any font-size changes
  // (since CSS 'em' width would shrink with font-size)
  const containerWidth = element.getBoundingClientRect().width;
  element.style.width = `${containerWidth}px`;
  
  // Get the computed styles from the element's parent context
  const computedStyle = window.getComputedStyle(element);
  const baseFontSize = parseFloat(computedStyle.fontSize);
  
  // Create a temporary span to measure the actual text width
  const tempSpan = document.createElement('span');
  tempSpan.style.cssText = `
    position: absolute;
    visibility: hidden;
    white-space: nowrap;
    font-family: ${computedStyle.fontFamily};
    font-size: ${baseFontSize}px;
    font-weight: bold;
    letter-spacing: ${computedStyle.letterSpacing};
  `;
  tempSpan.textContent = element.textContent;
  document.body.appendChild(tempSpan);
  const textWidth = tempSpan.getBoundingClientRect().width;
  document.body.removeChild(tempSpan);
  
  if (textWidth > containerWidth && containerWidth > 0) {
    // Scale by reducing font-size - this affects actual layout
    const scale = containerWidth / textWidth;
    const newFontSize = baseFontSize * scale * 0.95; // 0.95 for small safety margin
    element.style.fontSize = `${newFontSize}px`;
  }
};

const toggleBlank = (event) => {
  const target = event.target;
  if (!target.classList.contains('blank')) return;

  const word = target.dataset.word;
  if (target.classList.contains('revealed')) {
    target.textContent = '_________';
    target.style.fontSize = '';
    target.style.width = '';
    target.classList.remove('revealed');
  } else {
    target.textContent = word;
    target.classList.add('revealed');
    // Scale down long words to fit within the blank width
    scaleToFit(target);
  }

  // Sync hint count with actual revealed blanks
  const blankedWords = questionBlankedWordsList[questionIndex] || [];
  const revealedCount = questionText.querySelectorAll('.blank.revealed').length;
  hintsRevealedList[questionIndex] = revealedCount;

  // Update hint button state
  if (revealedCount >= blankedWords.length) {
    hintButton.disabled = true;
    hintButton.textContent = 'No more hints';
  } else {
    hintButton.disabled = false;
    hintButton.textContent = `Hint (${revealedCount}/${blankedWords.length})`;
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
  markPresetModified();
});

startButton.addEventListener('click', startSession);
selectorsToggle.addEventListener('click', () => toggleSelectors());
answerText.addEventListener('click', (e) => {
  e.stopPropagation();
});
questionText.addEventListener('click', toggleBlank);
nextButton.addEventListener('click', showAnswer);
prevButton.addEventListener('click', goPrev);
hintButton.addEventListener('click', revealHint);
answerNextButton.addEventListener('click', goNextFromAnswer);
answerPrevButton.addEventListener('click', goPrevFromAnswer);

toggleToVerseLink.addEventListener('click', () => {
  appState.activeSelector = 'verse';
  showSelectorView('verse');
  markPresetModified();
});

toggleToChapterLink.addEventListener('click', () => {
  appState.activeSelector = 'chapter';
  showSelectorView('chapter');
  markPresetModified();
});

// Preset event listeners (only if elements exist)
// Preset radio event listeners are now added in loadPresetList()

if (presetManageButton) {
  presetManageButton.addEventListener('click', () => {
    openPresetManager();
  });
}

if (presetModalClose) {
  presetModalClose.addEventListener('click', () => {
    if (presetModal) presetModal.style.display = 'none';
  });
}

if (presetNameModalClose) {
  presetNameModalClose.addEventListener('click', () => {
    if (presetNameModal) presetNameModal.style.display = 'none';
    if (presetNameInput) presetNameInput.value = '';
    if (presetNameError) presetNameError.textContent = '';
    presetNameMode = 'create';
    presetNameTargetId = null;
  });
}

if (presetNameSave) {
  presetNameSave.addEventListener('click', async () => {
    const name = presetNameInput?.value.trim();
    if (!name) {
      if (presetNameError) presetNameError.textContent = 'Please enter a preset name';
      return;
    }
    if (name.toLowerCase() === NONE_PRESET_NAME.toLowerCase()) {
      if (presetNameError) presetNameError.textContent = '"None" is reserved';
      return;
    }
    if (name.length > 50) {
      if (presetNameError) presetNameError.textContent = 'Name must be 50 characters or less';
      return;
    }

    // Check for duplicate
    const existing = await getPresetByName(name);
    if (existing && (presetNameMode !== 'rename' || existing.id !== presetNameTargetId)) {
      if (presetNameError) presetNameError.textContent = 'A preset with this name already exists';
      return;
    }

    if (presetNameMode === 'rename' && presetNameTargetId) {
      await renamePreset(presetNameTargetId, name);
    } else {
      await createPreset(name);
    }
    if (presetNameModal) presetNameModal.style.display = 'none';
    if (presetNameInput) presetNameInput.value = '';
    if (presetNameError) presetNameError.textContent = '';
    presetNameMode = 'create';
    presetNameTargetId = null;
  });
}

if (presetNameCancel) {
  presetNameCancel.addEventListener('click', () => {
    if (presetNameModal) presetNameModal.style.display = 'none';
    if (presetNameInput) presetNameInput.value = '';
    if (presetNameError) presetNameError.textContent = '';
    presetNameMode = 'create';
    presetNameTargetId = null;
  });
}

// Close modals on background click
if (presetModal) {
  presetModal.addEventListener('click', (e) => {
    if (e.target === presetModal) {
      presetModal.style.display = 'none';
    }
  });
}

if (presetNameModal) {
  presetNameModal.addEventListener('click', (e) => {
    if (e.target === presetNameModal) {
      presetNameModal.style.display = 'none';
      if (presetNameInput) presetNameInput.value = '';
      if (presetNameError) presetNameError.textContent = '';
      presetNameMode = 'create';
      presetNameTargetId = null;
    }
  });
}

// Enable Enter key to save in name modal
if (presetNameInput) {
  presetNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      if (presetNameSave) presetNameSave.click();
    }
  });
}

const handleMinBlanksChange = () => {
  if (minBlanksInput.value === '') return; // allow clearing before entering a new number
  const value = parseInt(minBlanksInput.value, 10);
  if (!isNaN(value)) {
    appState.minBlanks = value;
  }

  // Validate inputs
  const blanksValid = validateBlankInputs();
  const percentagesValid = validateQuestionTypePercentages();

  // Update start button disabled state without calling updateStartState
  // (which would call updateBlankInputs and overwrite user input)
  const anySelected = appState.activeChapters.length > 0;
  const anyDownloads = downloadsInFlight.size > 0;
  const hasVerses = appState.activeVerseIds.length > 0;
  const allReady =
    appState.activeChapters.length > 0 &&
    appState.activeChapters.every((chapterKey) => {
      const entry = appState.chapterIndex[chapterKey];
      const selection = appState.verseSelections?.[chapterKey];
      return entry && isSelectionComplete(selection, entry);
    });

  const isDisabled = !anySelected || anyDownloads || !allReady || !hasVerses || !percentagesValid || !blanksValid;
  startButton.disabled = isDisabled;

  // Update aria-label
  if (isDisabled) {
    if (!anySelected || !hasVerses) {
      startButton.setAttribute('aria-label', 'Start quiz - disabled until verses are selected');
    } else if (anyDownloads) {
      startButton.setAttribute('aria-label', 'Start quiz - disabled while downloading verses');
    } else if (!blanksValid) {
      startButton.setAttribute('aria-label', 'Start quiz - disabled until blank settings are valid');
    } else if (!percentagesValid) {
      startButton.setAttribute('aria-label', 'Start quiz - disabled until question type percentages total 100%');
    } else {
      startButton.setAttribute('aria-label', 'Start quiz - disabled until all verses are ready');
    }
  } else {
    startButton.setAttribute('aria-label', 'Start quiz');
  }

  saveState();
  markPresetModified();
};

const handleMaxBlanksChange = () => {
  if (maxBlanksInput.value === '') return; // allow clearing before entering a new number
  const value = parseInt(maxBlanksInput.value, 10);
  if (!isNaN(value)) {
    appState.maxBlanks = value;
  }

  // Validate inputs
  const blanksValid = validateBlankInputs();
  const percentagesValid = validateQuestionTypePercentages();

  // Update start button disabled state without calling updateStartState
  // (which would call updateBlankInputs and overwrite user input)
  const anySelected = appState.activeChapters.length > 0;
  const anyDownloads = downloadsInFlight.size > 0;
  const hasVerses = appState.activeVerseIds.length > 0;
  const allReady =
    appState.activeChapters.length > 0 &&
    appState.activeChapters.every((chapterKey) => {
      const entry = appState.chapterIndex[chapterKey];
      const selection = appState.verseSelections?.[chapterKey];
      return entry && isSelectionComplete(selection, entry);
    });

  const isDisabled = !anySelected || anyDownloads || !allReady || !hasVerses || !percentagesValid || !blanksValid;
  startButton.disabled = isDisabled;

  // Update aria-label
  if (isDisabled) {
    if (!anySelected || !hasVerses) {
      startButton.setAttribute('aria-label', 'Start quiz - disabled until verses are selected');
    } else if (anyDownloads) {
      startButton.setAttribute('aria-label', 'Start quiz - disabled while downloading verses');
    } else if (!blanksValid) {
      startButton.setAttribute('aria-label', 'Start quiz - disabled until blank settings are valid');
    } else if (!percentagesValid) {
      startButton.setAttribute('aria-label', 'Start quiz - disabled until question type percentages total 100%');
    } else {
      startButton.setAttribute('aria-label', 'Start quiz - disabled until all verses are ready');
    }
  } else {
    startButton.setAttribute('aria-label', 'Start quiz');
  }

  saveState();
  markPresetModified();
};

const handleMaxPercentChange = (evt) => {
  if (maxBlankPercentageInput.value === '') return; // allow clearing before entering a new number
  const value = Math.max(1, toInt(maxBlankPercentageInput.value, 100));
  appState.maxBlankPercentage = Math.min(value, 100);
  // Only update UI if this is not an 'input' event (i.e., user is still typing)
  if (evt.type !== 'input') {
    updateBlankInputs();
  }
  markPresetModified();
};

// Validate blank inputs (min/max blanks)
const validateBlankInputs = () => {
  // Skip validation if inputs are disabled (e.g., when "use only percentage" is checked)
  if (minBlanksInput.disabled || maxBlanksInput.disabled) {
    minBlanksInput.setCustomValidity('');
    maxBlanksInput.setCustomValidity('');
    if (minBlanksError) minBlanksError.textContent = '';
    if (maxBlanksError) maxBlanksError.textContent = '';
    return true;
  }

  const minValue = parseInt(minBlanksInput.value, 10);
  const maxValue = parseInt(maxBlanksInput.value, 10);
  const hasSelection = appState.activeVerseIds.length > 0;

  let isValid = true;

  // Validate min is at least 1
  if (isNaN(minValue) || minValue < 1) {
    minBlanksInput.setCustomValidity('Min blanks must be at least 1');
    if (minBlanksError) minBlanksError.textContent = 'Min blanks must be at least 1';
    isValid = false;
  } else {
    minBlanksInput.setCustomValidity('');
    if (minBlanksError) minBlanksError.textContent = '';
  }

  // Validate max is at least 1
  if (isNaN(maxValue) || maxValue < 1) {
    maxBlanksInput.setCustomValidity('Max blanks must be at least 1');
    if (maxBlanksError) maxBlanksError.textContent = 'Max blanks must be at least 1';
    isValid = false;
  } else if (maxValue < minValue) {
    // Validate max >= min
    maxBlanksInput.setCustomValidity(`Max blanks (${maxValue}) must be at least Min blanks (${minValue})`);
    if (maxBlanksError) maxBlanksError.textContent = `Max must be at least ${minValue}`;
    isValid = false;
  } else if (hasSelection) {
    // Validate against allowed max based on verse selection
    const maxWords = computeMaxWordsInActiveSelection();
    const percentVal = Math.max(1, Math.min(toInt(appState.maxBlankPercentage, 100), 100));
    const percentCap = Math.max(1, Math.floor((percentVal / 100) * maxWords));
    const allowedMax = Math.min(maxWords, percentCap);

    if (maxValue > allowedMax) {
      maxBlanksInput.setCustomValidity(`Max blanks (${maxValue}) exceeds allowed maximum of ${allowedMax} based on selected verses`);
      if (maxBlanksError) maxBlanksError.textContent = `Max allowed is ${allowedMax}`;
      isValid = false;
    } else {
      maxBlanksInput.setCustomValidity('');
      if (maxBlanksError) maxBlanksError.textContent = '';
    }

    if (minValue > allowedMax) {
      minBlanksInput.setCustomValidity(`Min blanks (${minValue}) exceeds allowed maximum of ${allowedMax} based on selected verses`);
      if (minBlanksError) minBlanksError.textContent = `Max allowed is ${allowedMax}`;
      isValid = false;
    }
  } else {
    maxBlanksInput.setCustomValidity('');
    if (maxBlanksError) maxBlanksError.textContent = '';
  }

  return isValid;
};

// Validate that all question type percentages total 100%
const validateQuestionTypePercentages = () => {
  const inputs = document.querySelectorAll('[data-question-type-percentage]');
  const values = Array.from(inputs).map(input => parseFloat(input.value) || 0);
  const total = values.reduce((sum, val) => sum + val, 0);
  const isValid = Math.abs(total - 100) < 0.01;

  // Update total display
  if (questionTypeTotalValue) {
    questionTypeTotalValue.textContent = total.toFixed(0);
  }

  // Set custom validity on all question type inputs
  inputs.forEach(input => {
    if (isValid) {
      input.setCustomValidity('');
    } else {
      input.setCustomValidity(
        `Question type distribution must total 100% (currently ${total.toFixed(0)}%)`
      );
    }
  });

  return isValid;
};

const handleFillInBlankPercentageChange = () => {
  if (fillInBlankPercentageInput.value === '') return; // allow clearing before entering a new number
  const value = Math.max(0, Math.min(toInt(fillInBlankPercentageInput.value, 100), 100));
  appState.fillInBlankPercentage = value;

  // Validate the total distribution and update start button state
  validateQuestionTypePercentages();
  updateStartState();
  saveState();
  markPresetModified();
};

['input', 'change'].forEach((evt) => {
  minBlanksInput.addEventListener(evt, handleMinBlanksChange);
  maxBlanksInput.addEventListener(evt, handleMaxBlanksChange);
  maxBlankPercentageInput.addEventListener(evt, handleMaxPercentChange);
  fillInBlankPercentageInput.addEventListener(evt, handleFillInBlankPercentageChange);
});

// Wire up the "use only percentage" checkbox
if (useOnlyPercentageInput) {
  useOnlyPercentageInput.addEventListener('change', () => {
    appState.useOnlyPercentage = useOnlyPercentageInput.checked;
    updateBlankInputs();
    markPresetModified();
  });
}

// Normalize blank fields on blur so typing isn't interrupted by live validation
[minBlanksInput, maxBlanksInput, maxBlankPercentageInput].forEach((input) => {
  input.addEventListener('blur', () => {
    updateBlankInputs();
  });
});

if (typeof window !== 'undefined' && window.__PBE_EXPOSE_TEST_API__) {
  window.__pbeTestApi = {
    get appState() {
      return appState;
    },
    updateBlankInputs,
    recomputeActiveVerseIds,
    handleMinBlanksChange,
    handleMaxBlanksChange,
    validateBlankInputs,
    validateQuestionTypePercentages,
    saveState,
    loadState,
    renderYearOptions,
    renderChapterOptions,
    renderVerseOptions,
    toggleChapterSelector,
    showSelectorView,
    computeCurrentYearKey,
    applyYearExclusions,
    seedCommentaryContent,
    buildVerseDownloadPlan,
    openPresetManager,
    loadPresetList,
    createPreset,
    loadPresetById,
    deletePresetById,
    renamePreset,
    renderPresetList,
    setSelectedPreset,
    handleChapterSelectionChange,
    handleVerseSelectionChange,
    startSession,
    showAnswer,
    goNext,
    goPrev,
    goNextFromAnswer,
    goPrevFromAnswer,
    revealHint,
    openDatabase,
    checkDatabaseHealth,
    resetDatabase,
    getFromIndexedDB,
    setToIndexedDB,
    migrateFromLocalStorage,
    migrateToOptimizedSchema,
    checkAndMigrateSchema,
    buildPersistableState,
    saveState,
    saveChapterData,
    reorderPresets,
    showPresetSaveStatus,
    saveCurrentPreset,
    flushPresetAutoSave,
    markPresetModified,
    buildPersistableState,
    sortVerseIds,
    buildFullBibleSelections,
    getSelectionsForYear,
    chaptersToRender,
    requestPersistentStorage,
    migrateTFIDFData,
    getSettings,
    updateSettings,
    getSelections,
    updateSelections,
    getChapter,
    getAllChapters,
    saveChapter,
    deleteChapter,
    getVerse,
    getVersesByChapter,
    getVersesByChapters,
    saveVerse,
    saveVerses,
    deleteVersesByChapter,
    getAllPresets,
    getPreset,
    getPresetByName,
    savePreset,
    deletePreset,
    downloadChapterIfNeeded,
    downloadVerseIfNeeded,
    parseVerses,
    markChapterStatus,
    uncheckChapter,
    applyBlanks,
    computeMinWordsInActiveSelection,
    computeMaxWordsInActiveSelection,
    updateChapterIndicators,
    updateVerseIndicators,
    updateVerseOptionsForChapter,
    getVerseNumbersForChapter,
    getCommentaryLabelForPart,
    get chaptersByYear() {
      return chaptersByYear;
    },
    loadChaptersByYear,
    get books() {
      return books;
    },
    loadBooksData,
  };
}

const shouldAutoInit = typeof window === 'undefined' || !window.__PBE_SKIP_INIT__;

// Rogue Sheep Easter Egg
const rogueSheepCheckbox = document.getElementById('rogue-sheep');
let rogueSheepInterval = null;
let activeSheep = [];

// Sheep action definitions
const sheepActions = [
  { name: 'sing', weight: 1 },
  { name: 'eat', weight: 1 },
  { name: 'jump', weight: 1 },
  { name: 'sleep', weight: 1 },
  { name: 'love', weight: 1 },
  { name: 'rain', weight: 1 },
  { name: 'think', weight: 1 },
  { name: 'sparkle', weight: 1 },
  { name: 'sneeze', weight: 1 },
  { name: 'baa', weight: 1 },
  { name: 'read', weight: 2 },
  { name: 'church', weight: 1 },
  { name: 'glasses', weight: 1 },
  // Nature/Weather
  { name: 'sunny', weight: 1 },
  { name: 'snowy', weight: 1 },
  { name: 'windy', weight: 1 },
  { name: 'rainbow', weight: 1 },
  // Activities
  { name: 'dance', weight: 1 },
  { name: 'exercise', weight: 1 },
  { name: 'paint', weight: 1 },
  { name: 'garden', weight: 1 },
  { name: 'cook', weight: 1 },
  { name: 'fish', weight: 1 },
  // Social/Emotional
  { name: 'wave', weight: 1 },
  { name: 'celebrate', weight: 1 },
  { name: 'cry', weight: 1 },
  { name: 'laugh', weight: 1 },
  { name: 'scared', weight: 1 },
  { name: 'angry', weight: 1 },
  // Whimsical
  { name: 'dream', weight: 1 },
  { name: 'coffee', weight: 1 },
  { name: 'photo', weight: 1 },
  { name: 'music', weight: 1 },
  { name: 'butterfly', weight: 1 },
  { name: 'countingSheep', weight: 1 },
  { name: 'crown', weight: 1 },
  { name: 'birthday', weight: 1 },
  // Sports/Games
  { name: 'soccer', weight: 1 },
  { name: 'basketball', weight: 1 },
  { name: 'golf', weight: 1 },
  { name: 'tennis', weight: 1 },
  { name: 'bowling', weight: 1 },
  { name: 'videoGames', weight: 1 },
  // Food/Drink
  { name: 'pizza', weight: 1 },
  { name: 'iceCream', weight: 1 },
  { name: 'picnic', weight: 1 },
  { name: 'bbq', weight: 1 },
  // Seasonal/Holiday
  { name: 'christmas', weight: 1 },
  { name: 'valentine', weight: 1 },
  { name: 'fireworks', weight: 1 },
  // Occupations
  { name: 'detective', weight: 1 },
  { name: 'astronaut', weight: 1 },
  { name: 'doctor', weight: 1 },
  { name: 'pirate', weight: 1 },
  { name: 'wizard', weight: 1 },
  { name: 'superhero', weight: 1 },
  // Nature/Animals
  { name: 'bee', weight: 1 },
  { name: 'birdWatching', weight: 1 },
  { name: 'frog', weight: 1 },
  { name: 'ladybug', weight: 1 },
  // Tech/Modern
  { name: 'texting', weight: 1 },
  { name: 'streaming', weight: 1 },
  { name: 'working', weight: 1 },
  { name: 'podcast', weight: 1 },
  // Misc Fun
  { name: 'balloon', weight: 1 },
  { name: 'dizzy', weight: 1 },
  { name: 'hiccup', weight: 1 },
  { name: 'yawn', weight: 1 },
  { name: 'whistle', weight: 1 },
  { name: 'treasure', weight: 1 },
  { name: 'timeTravel', weight: 1 },
  { name: 'clone', weight: 1 },
];

function createSheepParticle(x, y, emoji, type = 'rise') {
  const particle = document.createElement('div');
  particle.className = 'sheep-particle' + (type === 'fall' ? ' falling' : type === 'eat' ? ' eating' : '');
  particle.textContent = emoji;
  particle.style.left = `${x + (Math.random() - 0.5) * 20}px`;
  particle.style.top = `${y - 20}px`;
  particle.setAttribute('aria-hidden', 'true');
  document.body.appendChild(particle);
  
  setTimeout(() => particle.remove(), type === 'fall' ? 1500 : type === 'eat' ? 1000 : 2000);
}

function performSheepAction(sheep, actionName, isBlackSheep, currentX, currentY) {
  const x = currentX;
  const y = currentY;
  
  switch (actionName) {
    case 'sing': {
      // Black sheep sings different notes
      const notes = isBlackSheep ? ['🎶', '🎵', '🎶', '🎵'] : ['♩', '♪', '♫', '♬'];
      let noteIndex = 0;
      const singInterval = setInterval(() => {
        if (noteIndex < 6) {
          createSheepParticle(x, y, notes[noteIndex % notes.length]);
          noteIndex++;
        } else {
          clearInterval(singInterval);
        }
      }, 600);
      break;
    }
    case 'eat': {
      const foods = ['🌾', '🌿', '🍀', '🌱', '☘️'];
      let eatCount = 0;
      const eatInterval = setInterval(() => {
        if (eatCount < 4) {
          createSheepParticle(x + 15, y + 10, foods[Math.floor(Math.random() * foods.length)], 'eat');
          eatCount++;
        } else {
          clearInterval(eatInterval);
        }
      }, 800);
      break;
    }
    case 'jump': {
      const obstacles = ['🚧', '🪨', '🪵', '🌵', '📦', '🧱'];
      const obstacle = document.createElement('div');
      obstacle.className = 'sheep-jump-obstacle';
      obstacle.textContent = obstacles[Math.floor(Math.random() * obstacles.length)];
      obstacle.style.left = `${x + (sheep.classList.contains('flipped') ? 40 : -40)}px`;
      obstacle.style.top = `${y + 10}px`;
      obstacle.setAttribute('aria-hidden', 'true');
      document.body.appendChild(obstacle);
      
      // Jump after a moment
      setTimeout(() => {
        sheep.classList.add('jumping');
        setTimeout(() => sheep.classList.remove('jumping'), 600);
      }, 1500);
      
      setTimeout(() => obstacle.remove(), 5000);
      break;
    }
    case 'sleep': {
      let zzCount = 0;
      const sleepInterval = setInterval(() => {
        if (zzCount < 5) {
          createSheepParticle(x, y, '💤');
          zzCount++;
        } else {
          clearInterval(sleepInterval);
        }
      }, 800);
      break;
    }
    case 'love': {
      const hearts = ['💖', '💕', '💗', '❤️', '💓'];
      let heartCount = 0;
      const loveInterval = setInterval(() => {
        if (heartCount < 5) {
          createSheepParticle(x, y, hearts[Math.floor(Math.random() * hearts.length)]);
          heartCount++;
        } else {
          clearInterval(loveInterval);
        }
      }, 700);
      break;
    }
    case 'rain': {
      sheep.classList.add('rained-on');
      let dropCount = 0;
      const rainInterval = setInterval(() => {
        if (dropCount < 15) {
          createSheepParticle(x + (Math.random() - 0.5) * 30, y - 30, '💧', 'fall');
          dropCount++;
        } else {
          clearInterval(rainInterval);
        }
      }, 250);
      // Remove rain effect after action completes
      setTimeout(() => sheep.classList.remove('rained-on'), 5500);
      break;
    }
    case 'think': {
      const thoughts = ['💭', '❓', '💡', '🤔', '❔'];
      let thoughtCount = 0;
      const thinkInterval = setInterval(() => {
        if (thoughtCount < 3) {
          createSheepParticle(x, y, thoughts[Math.floor(Math.random() * thoughts.length)]);
          thoughtCount++;
        } else {
          clearInterval(thinkInterval);
        }
      }, 1200);
      break;
    }
    case 'sparkle': {
      const sparkles = ['✨', '⭐', '🌟', '💫'];
      let sparkleCount = 0;
      const sparkleInterval = setInterval(() => {
        if (sparkleCount < 8) {
          createSheepParticle(
            x + (Math.random() - 0.5) * 40,
            y + (Math.random() - 0.5) * 20,
            sparkles[Math.floor(Math.random() * sparkles.length)]
          );
          sparkleCount++;
        } else {
          clearInterval(sparkleInterval);
        }
      }, 400);
      break;
    }
    case 'sneeze': {
      setTimeout(() => {
        createSheepParticle(x + (sheep.classList.contains('flipped') ? 20 : -20), y, '💨');
        createSheepParticle(x + (sheep.classList.contains('flipped') ? 30 : -30), y + 5, '💨');
        createSheepParticle(x + (sheep.classList.contains('flipped') ? 25 : -25), y - 5, '✨');
      }, 1500);
      break;
    }
    case 'baa': {
      const speechBubbles = ['🗯️', '💬'];
      let baaCount = 0;
      const baaInterval = setInterval(() => {
        if (baaCount < 3) {
          createSheepParticle(x, y, speechBubbles[baaCount % 2]);
          baaCount++;
        } else {
          clearInterval(baaInterval);
        }
      }, 1000);
      break;
    }
    case 'read': {
      // Show book and reading particles
      createSheepParticle(x + (sheep.classList.contains('flipped') ? 15 : -15), y + 5, '📖', 'eat');
      const readEmojis = ['📚', '📕', '📗', '📘', '📙', '✨', '💭'];
      let readCount = 0;
      const readInterval = setInterval(() => {
        if (readCount < 6) {
          createSheepParticle(x, y, readEmojis[Math.floor(Math.random() * readEmojis.length)]);
          readCount++;
        } else {
          clearInterval(readInterval);
        }
      }, 600);
      break;
    }
    case 'church': {
      // Going to church - show church and holy symbols
      createSheepParticle(x, y - 10, '⛪');
      const holySymbols = ['✝️', '🙏', '👼', '✨', '🕊️', '📿'];
      let churchCount = 0;
      const churchInterval = setInterval(() => {
        if (churchCount < 5) {
          createSheepParticle(x, y, holySymbols[Math.floor(Math.random() * holySymbols.length)]);
          churchCount++;
        } else {
          clearInterval(churchInterval);
        }
      }, 700);
      break;
    }
    case 'glasses': {
      // Put on glasses - show glasses appearing
      const glassesEmojis = ['👓', '🤓', '🧐', '✨'];
      setTimeout(() => {
        createSheepParticle(x, y - 5, '👓');
      }, 500);
      setTimeout(() => {
        createSheepParticle(x, y, '✨');
        createSheepParticle(x - 10, y, '✨');
        createSheepParticle(x + 10, y, '✨');
      }, 1500);
      setTimeout(() => {
        createSheepParticle(x, y, '🤓');
      }, 2500);
      break;
    }
    // Nature/Weather actions
    case 'sunny': {
      createSheepParticle(x, y - 30, '☀️');
      const sunnyEmojis = ['😎', '✨', '🌞', '💦'];
      let sunnyCount = 0;
      const sunnyInterval = setInterval(() => {
        if (sunnyCount < 5) {
          createSheepParticle(x, y, sunnyEmojis[Math.floor(Math.random() * sunnyEmojis.length)]);
          sunnyCount++;
        } else {
          clearInterval(sunnyInterval);
        }
      }, 600);
      break;
    }
    case 'snowy': {
      const snowEmojis = ['❄️', '☃️', '🌨️', '🥶'];
      let snowCount = 0;
      const snowInterval = setInterval(() => {
        if (snowCount < 12) {
          createSheepParticle(x + (Math.random() - 0.5) * 40, y - 20, '❄️', 'fall');
          snowCount++;
        } else {
          clearInterval(snowInterval);
        }
      }, 300);
      setTimeout(() => createSheepParticle(x, y, '🥶'), 2000);
      break;
    }
    case 'windy': {
      const windEmojis = ['💨', '🍃', '🍂', '🍁'];
      let windCount = 0;
      const windInterval = setInterval(() => {
        if (windCount < 8) {
          createSheepParticle(x + (sheep.classList.contains('flipped') ? -20 : 20), y, windEmojis[Math.floor(Math.random() * windEmojis.length)]);
          windCount++;
        } else {
          clearInterval(windInterval);
        }
      }, 350);
      break;
    }
    case 'rainbow': {
      createSheepParticle(x, y - 30, '🌈');
      const rainbowEmojis = ['✨', '🌟', '💖', '🤩'];
      let rainbowCount = 0;
      const rainbowInterval = setInterval(() => {
        if (rainbowCount < 5) {
          createSheepParticle(x + (Math.random() - 0.5) * 30, y, rainbowEmojis[Math.floor(Math.random() * rainbowEmojis.length)]);
          rainbowCount++;
        } else {
          clearInterval(rainbowInterval);
        }
      }, 500);
      break;
    }
    // Activity actions
    case 'dance': {
      const danceEmojis = ['💃', '🕺', '🎵', '🎶', '✨'];
      let danceCount = 0;
      const danceInterval = setInterval(() => {
        if (danceCount < 8) {
          createSheepParticle(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 20, danceEmojis[Math.floor(Math.random() * danceEmojis.length)]);
          danceCount++;
        } else {
          clearInterval(danceInterval);
        }
      }, 400);
      break;
    }
    case 'exercise': {
      const exerciseEmojis = ['💪', '🏃‍♂️', '🩽', '😤', '💦'];
      let exerciseCount = 0;
      const exerciseInterval = setInterval(() => {
        if (exerciseCount < 6) {
          createSheepParticle(x, y, exerciseEmojis[Math.floor(Math.random() * exerciseEmojis.length)]);
          exerciseCount++;
        } else {
          clearInterval(exerciseInterval);
        }
      }, 500);
      break;
    }
    case 'paint': {
      createSheepParticle(x + 15, y, '🎨');
      const paintEmojis = ['🖌️', '🟥', '🟧', '🟦', '🟩', '🟪', '✨'];
      let paintCount = 0;
      const paintInterval = setInterval(() => {
        if (paintCount < 6) {
          createSheepParticle(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 30, paintEmojis[Math.floor(Math.random() * paintEmojis.length)]);
          paintCount++;
        } else {
          clearInterval(paintInterval);
        }
      }, 450);
      break;
    }
    case 'garden': {
      const gardenEmojis = ['🌷', '🌻', '🌹', '🌺', '🌼', '🌱'];
      let gardenCount = 0;
      const gardenInterval = setInterval(() => {
        if (gardenCount < 5) {
          createSheepParticle(x + (Math.random() - 0.5) * 30, y + 10, gardenEmojis[Math.floor(Math.random() * gardenEmojis.length)], 'eat');
          gardenCount++;
        } else {
          clearInterval(gardenInterval);
        }
      }, 600);
      break;
    }
    case 'cook': {
      createSheepParticle(x, y + 5, '🍳');
      const cookEmojis = ['👨‍🍳', '🔥', '✨', '💨', '🧂'];
      let cookCount = 0;
      const cookInterval = setInterval(() => {
        if (cookCount < 5) {
          createSheepParticle(x, y, cookEmojis[Math.floor(Math.random() * cookEmojis.length)]);
          cookCount++;
        } else {
          clearInterval(cookInterval);
        }
      }, 550);
      break;
    }
    case 'fish': {
      createSheepParticle(x + (sheep.classList.contains('flipped') ? 25 : -25), y + 15, '🎣');
      setTimeout(() => {
        createSheepParticle(x + (sheep.classList.contains('flipped') ? 30 : -30), y + 10, '🐟');
        createSheepParticle(x, y, '🎉');
      }, 2500);
      break;
    }
    // Social/Emotional actions
    case 'wave': {
      const waveEmojis = ['👋', '😊', '✨'];
      let waveCount = 0;
      const waveInterval = setInterval(() => {
        if (waveCount < 4) {
          createSheepParticle(x, y, waveEmojis[waveCount % waveEmojis.length]);
          waveCount++;
        } else {
          clearInterval(waveInterval);
        }
      }, 600);
      break;
    }
    case 'celebrate': {
      const celebrateEmojis = ['🎉', '🥳', '🎊', '🎈', '✨', '🎆'];
      let celebrateCount = 0;
      const celebrateInterval = setInterval(() => {
        if (celebrateCount < 8) {
          createSheepParticle(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 20, celebrateEmojis[Math.floor(Math.random() * celebrateEmojis.length)]);
          celebrateCount++;
        } else {
          clearInterval(celebrateInterval);
        }
      }, 350);
      break;
    }
    case 'cry': {
      const cryEmojis = ['😢', '💧', '😭'];
      let cryCount = 0;
      const cryInterval = setInterval(() => {
        if (cryCount < 6) {
          createSheepParticle(x + (Math.random() - 0.5) * 15, y, cryEmojis[Math.floor(Math.random() * cryEmojis.length)], 'fall');
          cryCount++;
        } else {
          clearInterval(cryInterval);
        }
      }, 500);
      break;
    }
    case 'laugh': {
      const laughEmojis = ['😂', '🤣', '😄', '😆'];
      let laughCount = 0;
      const laughInterval = setInterval(() => {
        if (laughCount < 5) {
          createSheepParticle(x, y, laughEmojis[Math.floor(Math.random() * laughEmojis.length)]);
          laughCount++;
        } else {
          clearInterval(laughInterval);
        }
      }, 500);
      break;
    }
    case 'scared': {
      createSheepParticle(x + (sheep.classList.contains('flipped') ? -30 : 30), y, '👻');
      const scaredEmojis = ['😱', '😨', '💦', '❗'];
      let scaredCount = 0;
      const scaredInterval = setInterval(() => {
        if (scaredCount < 4) {
          createSheepParticle(x, y, scaredEmojis[Math.floor(Math.random() * scaredEmojis.length)]);
          scaredCount++;
        } else {
          clearInterval(scaredInterval);
        }
      }, 400);
      break;
    }
    case 'angry': {
      const angryEmojis = ['😤', '💢', '😡', '💯'];
      let angryCount = 0;
      const angryInterval = setInterval(() => {
        if (angryCount < 5) {
          createSheepParticle(x + (Math.random() - 0.5) * 20, y - 10, angryEmojis[Math.floor(Math.random() * angryEmojis.length)]);
          angryCount++;
        } else {
          clearInterval(angryInterval);
        }
      }, 450);
      break;
    }
    // Whimsical actions
    case 'dream': {
      const dreamEmojis = ['💭', '🦄', '🌙', '✨', '🌟', '🌈'];
      let dreamCount = 0;
      const dreamInterval = setInterval(() => {
        if (dreamCount < 6) {
          createSheepParticle(x, y, dreamEmojis[Math.floor(Math.random() * dreamEmojis.length)]);
          dreamCount++;
        } else {
          clearInterval(dreamInterval);
        }
      }, 600);
      break;
    }
    case 'coffee': {
      createSheepParticle(x + (sheep.classList.contains('flipped') ? 15 : -15), y + 5, '☕');
      const coffeeEmojis = ['😊', '💨', '✨', '💪'];
      let coffeeCount = 0;
      const coffeeInterval = setInterval(() => {
        if (coffeeCount < 4) {
          createSheepParticle(x, y, coffeeEmojis[coffeeCount]);
          coffeeCount++;
        } else {
          clearInterval(coffeeInterval);
        }
      }, 700);
      break;
    }
    case 'photo': {
      setTimeout(() => {
        createSheepParticle(x, y, '✌️');
      }, 500);
      setTimeout(() => {
        createSheepParticle(x + 30, y, '📸');
        createSheepParticle(x, y, '✨');
        createSheepParticle(x - 10, y - 10, '✨');
        createSheepParticle(x + 10, y - 10, '✨');
      }, 1500);
      break;
    }
    case 'music': {
      const instruments = ['🎸', '🎹', '🥁', '🎺', '🎻'];
      createSheepParticle(x + (sheep.classList.contains('flipped') ? 15 : -15), y + 5, instruments[Math.floor(Math.random() * instruments.length)], 'eat');
      const musicEmojis = ['🎵', '🎶', '✨'];
      let musicCount = 0;
      const musicInterval = setInterval(() => {
        if (musicCount < 6) {
          createSheepParticle(x + (Math.random() - 0.5) * 30, y, musicEmojis[Math.floor(Math.random() * musicEmojis.length)]);
          musicCount++;
        } else {
          clearInterval(musicInterval);
        }
      }, 450);
      break;
    }
    case 'butterfly': {
      createSheepParticle(x, y, '🦋');
      const butterflyEmojis = ['✨', '🌸', '🌼', '😊'];
      let butterflyCount = 0;
      const butterflyInterval = setInterval(() => {
        if (butterflyCount < 4) {
          createSheepParticle(x + (Math.random() - 0.5) * 20, y, butterflyEmojis[Math.floor(Math.random() * butterflyEmojis.length)]);
          butterflyCount++;
        } else {
          clearInterval(butterflyInterval);
        }
      }, 600);
      break;
    }
    case 'countingSheep': {
      const countEmojis = ['🐑', '1️⃣', '🐑', '2️⃣', '🐑', '3️⃣', '💤'];
      let countIndex = 0;
      const countInterval = setInterval(() => {
        if (countIndex < countEmojis.length) {
          createSheepParticle(x, y, countEmojis[countIndex]);
          countIndex++;
        } else {
          clearInterval(countInterval);
        }
      }, 500);
      break;
    }
    case 'crown': {
      setTimeout(() => createSheepParticle(x, y - 15, '👑'), 500);
      const crownEmojis = ['✨', '🌟', '💎'];
      let crownCount = 0;
      const crownInterval = setInterval(() => {
        if (crownCount < 5) {
          createSheepParticle(x + (Math.random() - 0.5) * 30, y, crownEmojis[Math.floor(Math.random() * crownEmojis.length)]);
          crownCount++;
        } else {
          clearInterval(crownInterval);
        }
      }, 500);
      break;
    }
    case 'birthday': {
      createSheepParticle(x, y - 10, '🎂');
      const birthdayEmojis = ['🎁', '🎈', '🎉', '🎊', '✨'];
      let birthdayCount = 0;
      const birthdayInterval = setInterval(() => {
        if (birthdayCount < 6) {
          createSheepParticle(x + (Math.random() - 0.5) * 40, y, birthdayEmojis[Math.floor(Math.random() * birthdayEmojis.length)]);
          birthdayCount++;
        } else {
          clearInterval(birthdayInterval);
        }
      }, 450);
      break;
    }
    // Sports/Games
    case 'soccer': {
      createSheepParticle(x + (sheep.classList.contains('flipped') ? 25 : -25), y + 10, '⚽');
      const soccerEmojis = ['🥅', '✨', '💪', '🏆'];
      let soccerCount = 0;
      const soccerInterval = setInterval(() => {
        if (soccerCount < 4) {
          createSheepParticle(x, y, soccerEmojis[Math.floor(Math.random() * soccerEmojis.length)]);
          soccerCount++;
        } else {
          clearInterval(soccerInterval);
        }
      }, 600);
      break;
    }
    case 'basketball': {
      createSheepParticle(x, y - 20, '🏀');
      setTimeout(() => createSheepParticle(x + 20, y - 30, '🏀'), 800);
      setTimeout(() => {
        createSheepParticle(x + 25, y - 35, '🏆');
        createSheepParticle(x, y, '✨');
      }, 1600);
      break;
    }
    case 'golf': {
      createSheepParticle(x + (sheep.classList.contains('flipped') ? 20 : -20), y + 5, '⛳');
      setTimeout(() => {
        createSheepParticle(x, y, '🏌️');
      }, 800);
      setTimeout(() => {
        createSheepParticle(x + (sheep.classList.contains('flipped') ? 40 : -40), y - 20, '✨');
      }, 1500);
      break;
    }
    case 'tennis': {
      const tennisEmojis = ['🎾', '🏸', '✨'];
      let tennisCount = 0;
      const tennisInterval = setInterval(() => {
        if (tennisCount < 5) {
          const side = tennisCount % 2 === 0 ? 25 : -25;
          createSheepParticle(x + side, y, tennisEmojis[Math.floor(Math.random() * tennisEmojis.length)]);
          tennisCount++;
        } else {
          clearInterval(tennisInterval);
        }
      }, 500);
      break;
    }
    case 'bowling': {
      createSheepParticle(x + (sheep.classList.contains('flipped') ? 30 : -30), y, '🎳');
      setTimeout(() => {
        createSheepParticle(x + (sheep.classList.contains('flipped') ? 40 : -40), y, '🎳');
        createSheepParticle(x + (sheep.classList.contains('flipped') ? 35 : -35), y - 10, '🎳');
        createSheepParticle(x, y, '✨');
      }, 1500);
      break;
    }
    case 'videoGames': {
      createSheepParticle(x + (sheep.classList.contains('flipped') ? 15 : -15), y, '🎮');
      const gameEmojis = ['👾', '🕹️', '✨', '🏆', '💯'];
      let gameCount = 0;
      const gameInterval = setInterval(() => {
        if (gameCount < 5) {
          createSheepParticle(x, y, gameEmojis[Math.floor(Math.random() * gameEmojis.length)]);
          gameCount++;
        } else {
          clearInterval(gameInterval);
        }
      }, 500);
      break;
    }
    // Food/Drink
    case 'pizza': {
      createSheepParticle(x + (sheep.classList.contains('flipped') ? 15 : -15), y + 5, '🍕');
      const pizzaEmojis = ['😋', '🤤', '✨', '👌'];
      let pizzaCount = 0;
      const pizzaInterval = setInterval(() => {
        if (pizzaCount < 4) {
          createSheepParticle(x, y, pizzaEmojis[pizzaCount]);
          pizzaCount++;
        } else {
          clearInterval(pizzaInterval);
        }
      }, 600);
      break;
    }
    case 'iceCream': {
      createSheepParticle(x + (sheep.classList.contains('flipped') ? 15 : -15), y, '🍦');
      const iceCreamEmojis = ['🍨', '😋', '✨', '💕'];
      let iceCreamCount = 0;
      const iceCreamInterval = setInterval(() => {
        if (iceCreamCount < 4) {
          createSheepParticle(x, y, iceCreamEmojis[iceCreamCount]);
          iceCreamCount++;
        } else {
          clearInterval(iceCreamInterval);
        }
      }, 600);
      break;
    }
    case 'picnic': {
      createSheepParticle(x, y + 15, '🧂');
      const picnicEmojis = ['🥪', '🍎', '🧃', '🍓', '✨'];
      let picnicCount = 0;
      const picnicInterval = setInterval(() => {
        if (picnicCount < 5) {
          createSheepParticle(x + (Math.random() - 0.5) * 30, y + 10, picnicEmojis[Math.floor(Math.random() * picnicEmojis.length)], 'eat');
          picnicCount++;
        } else {
          clearInterval(picnicInterval);
        }
      }, 550);
      break;
    }
    case 'bbq': {
      createSheepParticle(x + 20, y + 5, '🔥');
      const bbqEmojis = ['🍖', '🍗', '💨', '✨', '😋'];
      let bbqCount = 0;
      const bbqInterval = setInterval(() => {
        if (bbqCount < 5) {
          createSheepParticle(x, y, bbqEmojis[Math.floor(Math.random() * bbqEmojis.length)]);
          bbqCount++;
        } else {
          clearInterval(bbqInterval);
        }
      }, 550);
      break;
    }
    // Seasonal/Holiday
    case 'christmas': {
      createSheepParticle(x, y - 15, '🎄');
      const christmasEmojis = ['🎅', '🎁', '❄️', '✨', '🔔'];
      let christmasCount = 0;
      const christmasInterval = setInterval(() => {
        if (christmasCount < 6) {
          createSheepParticle(x + (Math.random() - 0.5) * 30, y, christmasEmojis[Math.floor(Math.random() * christmasEmojis.length)]);
          christmasCount++;
        } else {
          clearInterval(christmasInterval);
        }
      }, 500);
      break;
    }
    case 'valentine': {
      const valentineEmojis = ['💘', '💌', '💝', '💗', '🌹'];
      let valentineCount = 0;
      const valentineInterval = setInterval(() => {
        if (valentineCount < 6) {
          createSheepParticle(x + (Math.random() - 0.5) * 30, y, valentineEmojis[Math.floor(Math.random() * valentineEmojis.length)]);
          valentineCount++;
        } else {
          clearInterval(valentineInterval);
        }
      }, 500);
      break;
    }
    case 'fireworks': {
      const fireworkEmojis = ['🎆', '🎇', '✨', '🌟'];
      let fireworkCount = 0;
      const fireworkInterval = setInterval(() => {
        if (fireworkCount < 8) {
          createSheepParticle(x + (Math.random() - 0.5) * 50, y - 20 - Math.random() * 30, fireworkEmojis[Math.floor(Math.random() * fireworkEmojis.length)]);
          fireworkCount++;
        } else {
          clearInterval(fireworkInterval);
        }
      }, 400);
      break;
    }
    // Occupations
    case 'detective': {
      createSheepParticle(x + (sheep.classList.contains('flipped') ? 15 : -15), y, '🔍');
      const detectiveEmojis = ['🕵️', '🔎', '🧐', '❓'];
      let detectiveCount = 0;
      const detectiveInterval = setInterval(() => {
        if (detectiveCount < 4) {
          createSheepParticle(x, y, detectiveEmojis[Math.floor(Math.random() * detectiveEmojis.length)]);
          detectiveCount++;
        } else {
          clearInterval(detectiveInterval);
        }
      }, 650);
      break;
    }
    case 'astronaut': {
      createSheepParticle(x, y - 25, '🚀');
      const spaceEmojis = ['🌙', '⭐', '🌟', '🪐', '✨'];
      let spaceCount = 0;
      const spaceInterval = setInterval(() => {
        if (spaceCount < 6) {
          createSheepParticle(x + (Math.random() - 0.5) * 40, y - 10, spaceEmojis[Math.floor(Math.random() * spaceEmojis.length)]);
          spaceCount++;
        } else {
          clearInterval(spaceInterval);
        }
      }, 450);
      break;
    }
    case 'doctor': {
      createSheepParticle(x + (sheep.classList.contains('flipped') ? 15 : -15), y, '🩺');
      const doctorEmojis = ['💊', '❤️‍🩹', '✨', '🧪'];
      let doctorCount = 0;
      const doctorInterval = setInterval(() => {
        if (doctorCount < 4) {
          createSheepParticle(x, y, doctorEmojis[doctorCount]);
          doctorCount++;
        } else {
          clearInterval(doctorInterval);
        }
      }, 650);
      break;
    }
    case 'pirate': {
      createSheepParticle(x, y - 15, '🏴‍☠️');
      const pirateEmojis = ['⚓', '🗺️', '💎', '🤜', '✨'];
      let pirateCount = 0;
      const pirateInterval = setInterval(() => {
        if (pirateCount < 5) {
          createSheepParticle(x + (Math.random() - 0.5) * 30, y, pirateEmojis[Math.floor(Math.random() * pirateEmojis.length)]);
          pirateCount++;
        } else {
          clearInterval(pirateInterval);
        }
      }, 550);
      break;
    }
    case 'wizard': {
      createSheepParticle(x, y - 15, '🧙‍♂️');
      const wizardEmojis = ['🪄', '📜', '✨', '🌟', '🔮'];
      let wizardCount = 0;
      const wizardInterval = setInterval(() => {
        if (wizardCount < 5) {
          createSheepParticle(x + (Math.random() - 0.5) * 30, y, wizardEmojis[Math.floor(Math.random() * wizardEmojis.length)]);
          wizardCount++;
        } else {
          clearInterval(wizardInterval);
        }
      }, 500);
      break;
    }
    case 'superhero': {
      createSheepParticle(x, y - 15, '🦸');
      const heroEmojis = ['💥', '⚡', '✨', '💪', '🌟'];
      let heroCount = 0;
      const heroInterval = setInterval(() => {
        if (heroCount < 5) {
          createSheepParticle(x + (Math.random() - 0.5) * 35, y, heroEmojis[Math.floor(Math.random() * heroEmojis.length)]);
          heroCount++;
        } else {
          clearInterval(heroInterval);
        }
      }, 450);
      break;
    }
    // Nature/Animals
    case 'bee': {
      const beeEmojis = ['🐝', '🌻', '🌸', '🌼'];
      let beeCount = 0;
      const beeInterval = setInterval(() => {
        if (beeCount < 5) {
          createSheepParticle(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 20, beeEmojis[Math.floor(Math.random() * beeEmojis.length)]);
          beeCount++;
        } else {
          clearInterval(beeInterval);
        }
      }, 450);
      setTimeout(() => createSheepParticle(x, y, '🍯'), 2500);
      break;
    }
    case 'birdWatching': {
      createSheepParticle(x + (sheep.classList.contains('flipped') ? 20 : -20), y, '🔭');
      const birdEmojis = ['🐦', '🦜', '🦆', '🦉', '✨'];
      let birdCount = 0;
      const birdInterval = setInterval(() => {
        if (birdCount < 5) {
          createSheepParticle(x + (Math.random() - 0.5) * 50, y - 20, birdEmojis[Math.floor(Math.random() * birdEmojis.length)]);
          birdCount++;
        } else {
          clearInterval(birdInterval);
        }
      }, 550);
      break;
    }
    case 'frog': {
      createSheepParticle(x + (sheep.classList.contains('flipped') ? 25 : -25), y + 10, '🐸');
      const frogEmojis = ['💚', '✨', '🌿'];
      let frogCount = 0;
      const frogInterval = setInterval(() => {
        if (frogCount < 3) {
          createSheepParticle(x, y, frogEmojis[frogCount]);
          frogCount++;
        } else {
          clearInterval(frogInterval);
        }
      }, 700);
      break;
    }
    case 'ladybug': {
      createSheepParticle(x, y, '🐞');
      const ladybugEmojis = ['🍀', '✨', '😊'];
      let ladybugCount = 0;
      const ladybugInterval = setInterval(() => {
        if (ladybugCount < 3) {
          createSheepParticle(x + (Math.random() - 0.5) * 20, y, ladybugEmojis[ladybugCount]);
          ladybugCount++;
        } else {
          clearInterval(ladybugInterval);
        }
      }, 700);
      break;
    }
    // Tech/Modern
    case 'texting': {
      createSheepParticle(x + (sheep.classList.contains('flipped') ? 15 : -15), y + 5, '📱');
      const textEmojis = ['💬', '😊', '👍', '❤️', '😂'];
      let textCount = 0;
      const textInterval = setInterval(() => {
        if (textCount < 5) {
          createSheepParticle(x, y, textEmojis[Math.floor(Math.random() * textEmojis.length)]);
          textCount++;
        } else {
          clearInterval(textInterval);
        }
      }, 500);
      break;
    }
    case 'streaming': {
      createSheepParticle(x + 25, y, '📺');
      createSheepParticle(x + (sheep.classList.contains('flipped') ? 15 : -15), y + 5, '🍿');
      const streamEmojis = ['😂', '😮', '🤩', '✨'];
      let streamCount = 0;
      const streamInterval = setInterval(() => {
        if (streamCount < 4) {
          createSheepParticle(x, y, streamEmojis[streamCount]);
          streamCount++;
        } else {
          clearInterval(streamInterval);
        }
      }, 650);
      break;
    }
    case 'working': {
      createSheepParticle(x + (sheep.classList.contains('flipped') ? 15 : -15), y + 5, '💻');
      const workEmojis = ['📊', '📈', '⌨️', '💡', '☕'];
      let workCount = 0;
      const workInterval = setInterval(() => {
        if (workCount < 5) {
          createSheepParticle(x, y, workEmojis[Math.floor(Math.random() * workEmojis.length)]);
          workCount++;
        } else {
          clearInterval(workInterval);
        }
      }, 550);
      break;
    }
    case 'podcast': {
      createSheepParticle(x + (sheep.classList.contains('flipped') ? 15 : -15), y - 5, '🎧');
      const podcastEmojis = ['🎙️', '💬', '🤔', '👍', '✨'];
      let podcastCount = 0;
      const podcastInterval = setInterval(() => {
        if (podcastCount < 4) {
          createSheepParticle(x, y, podcastEmojis[podcastCount]);
          podcastCount++;
        } else {
          clearInterval(podcastInterval);
        }
      }, 650);
      break;
    }
    // Misc Fun
    case 'balloon': {
      createSheepParticle(x, y - 20, '🎈');
      setTimeout(() => createSheepParticle(x, y - 30, '🎈'), 500);
      setTimeout(() => {
        createSheepParticle(x, y, '😮');
        createSheepParticle(x, y - 40, '🎈');
      }, 1000);
      setTimeout(() => createSheepParticle(x, y, '😄'), 2000);
      break;
    }
    case 'dizzy': {
      const dizzyEmojis = ['😵‍💫', '💫', '🌀', '✨'];
      let dizzyCount = 0;
      const dizzyInterval = setInterval(() => {
        if (dizzyCount < 6) {
          createSheepParticle(x + (Math.random() - 0.5) * 30, y + (Math.random() - 0.5) * 20, dizzyEmojis[Math.floor(Math.random() * dizzyEmojis.length)]);
          dizzyCount++;
        } else {
          clearInterval(dizzyInterval);
        }
      }, 400);
      break;
    }
    case 'hiccup': {
      const hiccupEmojis = ['🫨', '😯', '💨'];
      let hiccupCount = 0;
      const hiccupInterval = setInterval(() => {
        if (hiccupCount < 5) {
          createSheepParticle(x, y, hiccupEmojis[hiccupCount % hiccupEmojis.length]);
          hiccupCount++;
        } else {
          clearInterval(hiccupInterval);
        }
      }, 600);
      break;
    }
    case 'yawn': {
      const yawnEmojis = ['🥱', '😴', '💤'];
      let yawnCount = 0;
      const yawnInterval = setInterval(() => {
        if (yawnCount < 4) {
          createSheepParticle(x, y, yawnEmojis[Math.floor(Math.random() * yawnEmojis.length)]);
          yawnCount++;
        } else {
          clearInterval(yawnInterval);
        }
      }, 700);
      break;
    }
    case 'whistle': {
      const whistleEmojis = ['🎶', '😙', '💨', '🎵'];
      let whistleCount = 0;
      const whistleInterval = setInterval(() => {
        if (whistleCount < 5) {
          createSheepParticle(x + (sheep.classList.contains('flipped') ? 15 : -15), y - 5, whistleEmojis[Math.floor(Math.random() * whistleEmojis.length)]);
          whistleCount++;
        } else {
          clearInterval(whistleInterval);
        }
      }, 450);
      break;
    }
    case 'treasure': {
      createSheepParticle(x + (sheep.classList.contains('flipped') ? 20 : -20), y + 10, '💰');
      const treasureEmojis = ['💎', '🪙', '✨', '🌟', '🤩'];
      let treasureCount = 0;
      const treasureInterval = setInterval(() => {
        if (treasureCount < 6) {
          createSheepParticle(x + (Math.random() - 0.5) * 30, y, treasureEmojis[Math.floor(Math.random() * treasureEmojis.length)]);
          treasureCount++;
        } else {
          clearInterval(treasureInterval);
        }
      }, 450);
      break;
    }
    case 'timeTravel': {
      const timeEmojis = ['⏰', '🌀', '✨', '🕰️', '🌟'];
      let timeCount = 0;
      const timeInterval = setInterval(() => {
        if (timeCount < 6) {
          createSheepParticle(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 30, timeEmojis[Math.floor(Math.random() * timeEmojis.length)]);
          timeCount++;
        } else {
          clearInterval(timeInterval);
        }
      }, 400);
      break;
    }
    case 'clone': {
      const cloneEmojis = ['🐑', '🐑', '🐑', '✨'];
      let cloneCount = 0;
      const cloneInterval = setInterval(() => {
        if (cloneCount < 4) {
          createSheepParticle(x + (cloneCount - 1.5) * 25, y, cloneEmojis[cloneCount]);
          cloneCount++;
        } else {
          clearInterval(cloneInterval);
        }
      }, 500);
      break;
    }
  }
}

function pickRandomAction() {
  const totalWeight = sheepActions.reduce((sum, a) => sum + a.weight, 0);
  let random = Math.random() * totalWeight;
  for (const action of sheepActions) {
    random -= action.weight;
    if (random <= 0) return action.name;
  }
  return sheepActions[0].name;
}

function createRogueSheep() {
  const sheep = document.createElement('div');
  sheep.className = 'rogue-sheep';
  sheep.textContent = Math.random() < 0.5 ? '🐑' : '🐏';
  
  // 1% chance of being a black sheep
  const isBlackSheep = Math.random() < 0.01;
  if (isBlackSheep) {
    sheep.classList.add('black-sheep');
  }
  
  sheep.setAttribute('aria-hidden', 'true');
  document.body.appendChild(sheep);

  const viewWidth = window.innerWidth;
  const viewHeight = window.innerHeight;

  // Random starting position (off-screen)
  const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
  let x, y;

  switch (side) {
    case 0: // Enter from top
      x = Math.random() * viewWidth;
      y = -40;
      break;
    case 1: // Enter from right
      x = viewWidth + 40;
      y = Math.random() * viewHeight;
      break;
    case 2: // Enter from bottom
      x = Math.random() * viewWidth;
      y = viewHeight + 40;
      break;
    case 3: // Enter from left
    default:
      x = -40;
      y = Math.random() * viewHeight;
      break;
  }

  sheep.style.left = `${x}px`;
  sheep.style.top = `${y}px`;

  // Random speed (pixels per step) - varied speeds
  const speed = 1 + Math.random() * 4; // 1-5 pixels per step
  const stepInterval = 30 + Math.random() * 70; // 30-100ms per step (slower = more leisurely)

  // Random initial direction (angle in radians)
  let angle = Math.random() * Math.PI * 2;
  let currentX = x;
  let currentY = y;

  // Track direction for flipping
  let lastX = x;

  // Wandering parameters
  const turnRate = 0.1 + Math.random() * 0.2; // How much the sheep can turn each step
  const wanderStrength = 0.3 + Math.random() * 0.4; // Randomness in direction changes

  // Maximum time on screen (15-45 seconds)
  const maxDuration = 15000 + Math.random() * 30000;
  const startTime = Date.now();

  // Action state
  let isPaused = false;
  let hasPerformedAction = false;
  const willPerformAction = Math.random() < 0.1; // 10% chance

  const moveInterval = setInterval(() => {
    // Check if sheep has been wandering too long
    if (Date.now() - startTime > maxDuration) {
      clearInterval(moveInterval);
      sheep.remove();
      activeSheep = activeSheep.filter(s => s !== sheep);
      return;
    }

    // Check if we should pause for an action (10% chance, only once, after being on screen a bit)
    if (willPerformAction && !hasPerformedAction && !isPaused && Date.now() - startTime > 3000) {
      // Only perform action if sheep is visible on screen
      if (currentX > 50 && currentX < viewWidth - 50 && currentY > 50 && currentY < viewHeight - 50) {
        isPaused = true;
        hasPerformedAction = true;
        const action = pickRandomAction();
        performSheepAction(sheep, action, isBlackSheep, currentX, currentY);
        
        // Resume after random duration (3-8 seconds)
        const pauseDuration = 3000 + Math.random() * 5000;
        setTimeout(() => {
          isPaused = false;
        }, pauseDuration);
        return;
      }
    }

    // Skip movement if paused
    if (isPaused) return;

    // Add random wandering to direction
    angle += (Math.random() - 0.5) * turnRate * wanderStrength;

    // Occasionally make bigger direction changes
    if (Math.random() < 0.02) {
      angle += (Math.random() - 0.5) * Math.PI * 0.5;
    }

    // Gently steer away from edges
    const edgeMargin = 100;
    if (currentX < edgeMargin) angle += 0.1;
    if (currentX > viewWidth - edgeMargin) angle -= 0.1;
    if (currentY < edgeMargin) angle += (angle > 0 && angle < Math.PI) ? 0.1 : -0.1;
    if (currentY > viewHeight - edgeMargin) angle += (angle > Math.PI) ? 0.1 : -0.1;

    // Move in current direction
    currentX += Math.cos(angle) * speed;
    currentY += Math.sin(angle) * speed;

    // Add slight wobble for natural walking
    const wobbleX = (Math.random() - 0.5) * 2;
    const wobbleY = (Math.random() - 0.5) * 2;

    sheep.style.left = `${currentX + wobbleX}px`;
    sheep.style.top = `${currentY + wobbleY}px`;

    // Flip sheep based on movement direction (sheep emoji faces left by default)
    if (currentX > lastX + 0.5) {
      sheep.classList.add('flipped');
    } else if (currentX < lastX - 0.5) {
      sheep.classList.remove('flipped');
    }
    lastX = currentX;

    // Remove if sheep wanders off screen
    if (currentX < -60 || currentX > viewWidth + 60 ||
        currentY < -60 || currentY > viewHeight + 60) {
      clearInterval(moveInterval);
      sheep.remove();
      activeSheep = activeSheep.filter(s => s !== sheep);
    }
  }, stepInterval);

  activeSheep.push(sheep);
}

function startRogueSheep() {
  if (rogueSheepInterval) return;

  // Spawn a sheep at random intervals (30-90 seconds)
  const scheduleNextSheep = () => {
    const delay = 30000 + Math.random() * 60000;
    rogueSheepInterval = setTimeout(() => {
      if (rogueSheepCheckbox && rogueSheepCheckbox.checked) {
        createRogueSheep();
        scheduleNextSheep();
      }
    }, delay);
  };

  // Spawn first sheep after a short delay (5-15 seconds)
  rogueSheepInterval = setTimeout(() => {
    if (rogueSheepCheckbox && rogueSheepCheckbox.checked) {
      createRogueSheep();
      scheduleNextSheep();
    }
  }, 5000 + Math.random() * 10000);
}

function stopRogueSheep() {
  if (rogueSheepInterval) {
    clearTimeout(rogueSheepInterval);
    rogueSheepInterval = null;
  }
  // Remove any active sheep
  activeSheep.forEach(sheep => sheep.remove());
  activeSheep = [];
}

if (rogueSheepCheckbox) {
  rogueSheepCheckbox.addEventListener('change', () => {
    if (rogueSheepCheckbox.checked) {
      startRogueSheep();
    } else {
      stopRogueSheep();
    }
  });
}

// Initialize app with async state loading
if (shouldAutoInit) {
  (async () => {
    // Ensure database is initialized and upgraded first
    try {
      const db = await openDatabase();
      db.close();

      // Check database health
      const isHealthy = await checkDatabaseHealth();
      if (!isHealthy) {
        console.error('Database is in an inconsistent state. You may need to reset it.');
        console.error('To reset: await window.dbUtils.reset() then reload the page.');
      }
    } catch (err) {
      console.error('Failed to initialize database:', err);
    }

    // Expose utility functions globally for debugging
    window.dbUtils = {
      checkHealth: checkDatabaseHealth,
      reset: resetDatabase,
      getVersion: async () => {
        const db = await openDatabase();
        const version = db.version;
        db.close();
        return version;
      },
      getStores: async () => {
        const db = await openDatabase();
        const stores = Array.from(db.objectStoreNames);
        db.close();
        return stores;
      }
    };

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
    // Explicitly set the select value to ensure it's set before rendering chapters
    seasonSelect.value = appState.year;

    // Load preset list into dropdown
    await loadPresetList();

    // If there was a current preset, select it in radio buttons
    if (appState.currentPresetId) {
      setSelectedPreset(appState.currentPresetId);
    }

    installCompromisePlugin();
    toggleChapterSelector();
    validateQuestionTypePercentages();
    requestPersistentStorage();
  })();
}
