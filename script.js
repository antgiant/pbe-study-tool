const seasonSelect = document.getElementById('year');
const chapterSelector = document.getElementById('chapter-selector');
const optionsContainer = document.getElementById('chapter-options');
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
const STATE_VERSION = 1;
const STATUS = {
  READY: 'ready',
  DOWNLOADING: 'downloading',
  ERROR: 'error',
  NOT_DOWNLOADED: 'not-downloaded',
};
const STATE_OF_BEING_WORDS = ['am', 'is', 'are', 'was', 'were', 'be', 'being', 'been'];
const TFIDF_CONFIG = {
  verseWeight: 0.6,        // How much to weight verse-level TF-IDF
  chapterWeight: 0.4,      // How much to weight chapter-level TF-IDF
  tfidfWeight: 0.5,        // How much TF-IDF influences final score
  priorityWeight: 0.5,     // How much priority influences final score
  minWordLength: 2,        // Ignore very short words in TF-IDF
};
const FULL_BIBLE_KEY = 'custom-all';

const books = {
  genesis: { id: 1, totalChapters: 50, label: 'Genesis' },
  exodus: { id: 2, totalChapters: 40, label: 'Exodus' },
  leviticus: { id: 3, totalChapters: 27, label: 'Leviticus' },
  numbers: { id: 4, totalChapters: 36, label: 'Numbers' },
  deuteronomy: { id: 5, totalChapters: 34, label: 'Deuteronomy' },
  joshua: { id: 6, totalChapters: 24, label: 'Joshua' },
  judges: { id: 7, totalChapters: 21, label: 'Judges' },
  ruth: { id: 8, totalChapters: 4, label: 'Ruth' },
  '1samuel': { id: 9, totalChapters: 31, label: '1 Samuel' },
  '2samuel': { id: 10, totalChapters: 24, label: '2 Samuel' },
  '1kings': { id: 11, totalChapters: 22, label: '1 Kings' },
  '2kings': { id: 12, totalChapters: 25, label: '2 Kings' },
  '1chronicles': { id: 13, totalChapters: 29, label: '1 Chronicles' },
  '2chronicles': { id: 14, totalChapters: 36, label: '2 Chronicles' },
  ezra: { id: 15, totalChapters: 10, label: 'Ezra' },
  nehemiah: { id: 16, totalChapters: 13, label: 'Nehemiah' },
  esther: { id: 17, totalChapters: 10, label: 'Esther' },
  job: { id: 18, totalChapters: 42, label: 'Job' },
  psalms: { id: 19, totalChapters: 150, label: 'Psalms' },
  proverbs: { id: 20, totalChapters: 31, label: 'Proverbs' },
  ecclesiastes: { id: 21, totalChapters: 12, label: 'Ecclesiastes' },
  songofsolomon: { id: 22, totalChapters: 8, label: 'Song of Solomon' },
  isaiah: { id: 23, totalChapters: 66, label: 'Isaiah' },
  jeremiah: { id: 24, totalChapters: 52, label: 'Jeremiah' },
  lamentations: { id: 25, totalChapters: 5, label: 'Lamentations' },
  ezekiel: { id: 26, totalChapters: 48, label: 'Ezekiel' },
  daniel: { id: 27, totalChapters: 12, label: 'Daniel' },
  hosea: { id: 28, totalChapters: 14, label: 'Hosea' },
  joel: { id: 29, totalChapters: 3, label: 'Joel' },
  amos: { id: 30, totalChapters: 9, label: 'Amos' },
  obadiah: { id: 31, totalChapters: 1, label: 'Obadiah' },
  jonah: { id: 32, totalChapters: 4, label: 'Jonah' },
  micah: { id: 33, totalChapters: 7, label: 'Micah' },
  nahum: { id: 34, totalChapters: 3, label: 'Nahum' },
  habakkuk: { id: 35, totalChapters: 3, label: 'Habakkuk' },
  zephaniah: { id: 36, totalChapters: 3, label: 'Zephaniah' },
  haggai: { id: 37, totalChapters: 2, label: 'Haggai' },
  zechariah: { id: 38, totalChapters: 14, label: 'Zechariah' },
  malachi: { id: 39, totalChapters: 4, label: 'Malachi' },
  matthew: { id: 40, totalChapters: 28, label: 'Matthew' },
  mark: { id: 41, totalChapters: 16, label: 'Mark' },
  luke: { id: 42, totalChapters: 24, label: 'Luke' },
  john: { id: 43, totalChapters: 21, label: 'John' },
  acts: { id: 44, totalChapters: 28, label: 'Acts' },
  romans: { id: 45, totalChapters: 16, label: 'Romans' },
  '1corinthians': { id: 46, totalChapters: 16, label: '1 Corinthians' },
  '2corinthians': { id: 47, totalChapters: 13, label: '2 Corinthians' },
  galatians: { id: 48, totalChapters: 6, label: 'Galatians' },
  ephesians: { id: 49, totalChapters: 6, label: 'Ephesians' },
  philippians: { id: 50, totalChapters: 4, label: 'Philippians' },
  colossians: { id: 51, totalChapters: 4, label: 'Colossians' },
  '1thessalonians': { id: 52, totalChapters: 5, label: '1 Thessalonians' },
  '2thessalonians': { id: 53, totalChapters: 3, label: '2 Thessalonians' },
  '1timothy': { id: 54, totalChapters: 6, label: '1 Timothy' },
  '2timothy': { id: 55, totalChapters: 4, label: '2 Timothy' },
  titus: { id: 56, totalChapters: 3, label: 'Titus' },
  philemon: { id: 57, totalChapters: 1, label: 'Philemon' },
  hebrews: { id: 58, totalChapters: 13, label: 'Hebrews' },
  james: { id: 59, totalChapters: 5, label: 'James' },
  '1peter': { id: 60, totalChapters: 5, label: '1 Peter' },
  '2peter': { id: 61, totalChapters: 3, label: '2 Peter' },
  '1john': { id: 62, totalChapters: 5, label: '1 John' },
  '2john': { id: 63, totalChapters: 1, label: '2 John' },
  '3john': { id: 64, totalChapters: 1, label: '3 John' },
  jude: { id: 65, totalChapters: 1, label: 'Jude' },
  revelation: { id: 66, totalChapters: 22, label: 'Revelation' },
};

const chaptersByYear = {
  '2025-2026': [{ bookKey: 'isaiah', start: 1, end: 33 }],
  '2026-2027': [
    { bookKey: 'mark', start: 1, end: 16 },
    { bookKey: '1peter', start: 1, end: 5 },
    { bookKey: '2peter', start: 1, end: 3 },
    { bookKey: '1john', start: 1, end: 5 },
    { bookKey: '2john', start: 1, end: 1 },
    { bookKey: '3john', start: 1, end: 1 },
  ],
  '2027-2028': [{ bookKey: 'isaiah', start: 34, end: 66 }],
};

const buildFullBibleSelections = () =>
  Object.keys(books).map((bookKey) => ({
    bookKey,
    start: 1,
    end: books[bookKey].totalChapters,
  }));

const getSelectionsForYear = (year) => {
  if (year === FULL_BIBLE_KEY) return buildFullBibleSelections();
  return chaptersByYear[year] || [];
};

const defaultState = {
  version: STATE_VERSION,
  year: '',
  activeChapters: [],
  activeVerseIds: [],
  chapterIndex: {},
  verseBank: {},
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

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version === STATE_VERSION) {
      const normalized = { ...defaultState, ...parsed };
      // Clear transient/error statuses on load so retry indicators do not persist.
      Object.entries(normalized.chapterIndex || {}).forEach(([key, entry]) => {
        if (!entry) return;
        if (entry.status === STATUS.ERROR || entry.status === STATUS.DOWNLOADING) {
          entry.status = undefined;
        }
      });
      // Migrate old verses to include TF-IDF data
      migrateTFIDFData(normalized);
      return normalized;
    }
    // Backward compatibility with the earlier shape.
    if (parsed.year || parsed.chapters) {
      return {
        ...defaultState,
        year: parsed.year || '',
        activeChapters: parsed.chapters || [],
      };
    }
    return null;
  } catch (err) {
    console.warn('Unable to load saved settings', err);
    return null;
  }
};

const saveState = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (err) {
    console.warn('Unable to save settings', err);
  }
};
const recomputeActiveVerseIds = () => {
  const ids = [];
  appState.activeChapters.forEach((chapterKey) => {
    const entry = appState.chapterIndex[chapterKey];
    if (entry && entry.status === STATUS.READY && entry.verseIds?.length) {
      ids.push(...entry.verseIds);
    }
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

  let maxVal = Math.max(1, Math.min(toInt(appState.maxBlanks, maxWords), allowedMax));
  let minVal = Math.max(1, toInt(appState.minBlanks, 1));

  // If min surpasses max, lift max up to min (capped by allowed maximum)
  if (minVal > maxVal) {
    maxVal = Math.min(minVal, allowedMax);
  }

  // After lifting max, ensure min does not exceed it
  minVal = Math.min(minVal, maxVal);

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

  blankLimitHint.textContent = `Min can go up to current max (${maxVal}); max allowed is ${allowedMax} based on selected verses and ${appState.maxBlankPercentage}% cap.`;
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
      return entry && entry.status === STATUS.READY && entry.verseIds && entry.verseIds.length > 0;
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
};

const renderYearOptions = (selectedYear = '') => {
  seasonSelect.innerHTML = '';

  const yearKeys = Object.keys(chaptersByYear);

  yearKeys.forEach((yearKey) => {
    const option = document.createElement('option');
    option.value = yearKey;
    const parts = (getSelectionsForYear(yearKey) || [])
      .map(({ bookKey, start, end }) => {
        const meta = books[bookKey];
        if (!meta) return null;
        const cappedEnd = Math.min(end, meta.totalChapters);
        const bookLabel = meta.label || bookKey;
        // If the selection covers the whole book, show only the book name.
        if (start === 1 && cappedEnd === meta.totalChapters) {
          return `${bookLabel}`;
        }
        return `${bookLabel} ${start}-${cappedEnd}`;
      })
      .filter(Boolean);
    const description = parts.length ? ` - ${parts.join('; ')}` : '';
    option.textContent = `${yearKey}${description}`;
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

    for (let chapter = start; chapter <= cappedEnd; chapter += 1) {
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
      numberSpan.textContent = chapter;

      const status = appState.chapterIndex[chapterKey]?.status || STATUS.NOT_DOWNLOADED;
      const statusSpan = document.createElement('span');
      statusSpan.className = `chapter-status${status ? ` ${status}` : ''}`;
      statusSpan.textContent = statusLabelFor(status);

      label.appendChild(input);
      label.appendChild(numberSpan);
      label.appendChild(statusSpan);
      grid.appendChild(label);
      chapterCheckboxes.push(input);
    }

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

const getChapterMeta = (chapterKey) => {
  const [bookIdStr, chapterStr] = chapterKey.split(',');
  const bookId = Number(bookIdStr);
  const chapter = Number(chapterStr);
  return { bookId, chapter };
};

const storeChapterData = (chapterKey, verses, source) => {
  const verseIds = [];
  verses.forEach(({ verse, text }) => {
    const id = `${chapterKey},${verse}`;
    verseIds.push(id);
    const { bookId, chapter } = getChapterMeta(chapterKey);

    // Pre-calculate term frequency for TF-IDF
    const plainText = stripHtml(text);
    const words = tokenizeText(plainText);
    const termFrequency = calculateTermFrequency(words);
    const wordList = Array.from(new Set(words));

    appState.verseBank[id] = {
      bookId,
      chapter,
      verse,
      text,
      source,
      termFrequency,
      wordList,
    };
  });
  appState.chapterIndex[chapterKey] = {
    verseIds,
    lastUpdated: new Date().toISOString(),
    status: STATUS.READY,
  };
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
  return [];
};

const markChapterStatus = (chapterKey, status) => {
  if (!appState.chapterIndex[chapterKey]) {
    appState.chapterIndex[chapterKey] = { verseIds: [], lastUpdated: null, status };
  } else {
    appState.chapterIndex[chapterKey].status = status;
  }
  updateChapterIndicators();
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
    .then((data) => {
      const verses = parseVerses(data);
      if (!verses.length) {
        throw new Error(`No verses found for ${chapterKey}`);
      }
      storeChapterData(chapterKey, verses, 'NKJV');
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

const startDownloadsForSelection = () => {
  const needed = appState.activeChapters.filter((chapterKey) => {
    const entry = appState.chapterIndex[chapterKey];
    return !(entry && entry.status === STATUS.READY && entry.verseIds?.length);
  });
  needed.forEach((chapterKey) => {
    downloadChapterIfNeeded(chapterKey);
  });
};

const handleChapterSelectionChange = () => {
  appState.activeChapters = chapterOptions.filter((option) => option.checked).map((opt) => opt.value);
  updateBookToggleStates();
  saveState();
  startDownloadsForSelection();
  updateStartState();
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
  const bookLabel = Object.values(books).find((b) => b.id === bookId)?.label || `Book ${bookId}`;
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
  // Remove capitalization from words following commas, except for priority_words
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

  // Split text into segments at commas
  const parts = text.split(/,\s*/);

  // Process each part after a comma (skip the first part)
  for (let i = 1; i < parts.length; i++) {
    // Get the first word after the comma
    const words = parts[i].split(/\s+/);
    if (words.length > 0 && words[0]) {
      const firstWord = words[0];
      const lowerFirstWord = firstWord.toLowerCase();

      // Only lowercase if it's not a priority word
      if (!PRIORITY_WORDS.has(lowerFirstWord)) {
        // Replace the first word with lowercase version
        words[0] = firstWord.charAt(0).toLowerCase() + firstWord.slice(1);
        parts[i] = words.join(' ');
      }
    }
  }

  return parts.join(', ');
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

  // Select top N candidates
  const chosen = new Set();
  const target = Math.min(maxBlanksAllowed, candidates.length);
  sortedCandidates.slice(0, target).forEach((c) => chosen.add(c.idx));

  // Build a set of plain text words to blank
  const wordsToBlank = new Set(
    Array.from(chosen).map(idx => termsWithPriority[idx]?.text?.toLowerCase()).filter(Boolean)
  );

  // Replace words in the original HTML, preserving tags
  // First, find all matches in order of appearance
  const matchesInOrder = [];
  wordsToBlank.forEach(word => {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'ig');
    let match;
    while ((match = regex.exec(raw)) !== null) {
      matchesInOrder.push({
        word: match[0],
        index: match.index,
        lowerWord: word
      });
      // Prevent infinite loop on zero-width matches
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }
  });

  // Sort by position in text to get order of appearance
  matchesInOrder.sort((a, b) => a.index - b.index);

  // Take only the target number of matches and track which lowercase words we're using
  const usedWords = new Set();
  const blanksToApply = [];
  for (const match of matchesInOrder) {
    if (blanksToApply.length >= target) break;
    // Only use each unique word once (first occurrence)
    if (!usedWords.has(match.lowerWord)) {
      blanksToApply.push(match);
      usedWords.add(match.lowerWord);
    }
  }

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

const toggleChapterSelector = () => {
  const hasSelection = seasonSelect.value.trim().length > 0;
  const fieldsetDisplay = hasSelection ? 'block' : 'none';
  chapterSelector.style.display = fieldsetDisplay;
  const blanksDisplay = hasSelection ? 'block' : 'none';
  document.getElementById('blank-selector').style.display = blanksDisplay;
  startButton.style.display = hasSelection ? 'inline-flex' : 'none';

  if (!hasSelection) {
    renderChapterOptions(null, new Set());
    startButton.disabled = true;
    // Clear active selections but preserve downloaded data
    appState.year = '';
    appState.activeChapters = [];
    appState.activeVerseIds = [];
    saveState();
    updateChapterIndicators();
    return;
  }

  appState.year = seasonSelect.value;
  const selectedValues = new Set(appState.activeChapters || []);
  renderChapterOptions(seasonSelect.value, selectedValues);
  handleChapterSelectionChange();
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

const handleMinBlanksChange = () => {
  if (minBlanksInput.value === '') return; // allow clearing before entering a new number
  const value = Math.max(1, toInt(minBlanksInput.value, 1));
  appState.minBlanks = value;
  const maxWords = computeMaxWordsInActiveSelection();
  if (appState.maxBlanks < value) {
    appState.maxBlanks = Math.min(value, maxWords);
  }
  updateBlankInputs();
};

const handleMaxBlanksChange = () => {
  if (maxBlanksInput.value === '') return; // allow clearing before entering a new number
  const value = Math.max(1, toInt(maxBlanksInput.value, 1));
  const maxWords = computeMaxWordsInActiveSelection();
  appState.maxBlanks = Math.min(value, maxWords);
  if (appState.maxBlanks < appState.minBlanks) {
    appState.minBlanks = appState.maxBlanks;
  }
  updateBlankInputs();
};

const handleMaxPercentChange = () => {
  if (maxBlankPercentageInput.value === '') return; // allow clearing before entering a new number
  const value = Math.max(1, toInt(maxBlankPercentageInput.value, 100));
  appState.maxBlankPercentage = Math.min(value, 100);
  updateBlankInputs();
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

const initialState = loadState();
if (initialState) {
  appState = initialState;
  // Save the migrated state back to localStorage
  saveState();
}
renderYearOptions(appState.year);
if (appState.year) {
  seasonSelect.value = appState.year;
}

installCompromisePlugin();
toggleChapterSelector();
requestPersistentStorage();
