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
  };
};

const books = {
  genesis: {
    id: 1,
    totalChapters: 50,
    label: 'Genesis',
    verseCounts: [
      31, 25, 24, 26, 32, 22, 24, 22, 29, 32, 32, 20, 18, 24, 21, 16, 27, 33, 38, 18, 34, 24, 20,
      67, 34, 35, 46, 22, 35, 43, 55, 32, 20, 31, 29, 43, 36, 30, 23, 23, 57, 38, 34, 34, 28, 34,
      31, 22, 33, 26,
    ],
  },
  exodus: {
    id: 2,
    totalChapters: 40,
    label: 'Exodus',
    verseCounts: [
      22, 25, 22, 31, 23, 30, 25, 32, 35, 29, 10, 51, 22, 31, 27, 36, 16, 27, 25, 26, 36, 31, 33,
      18, 40, 37, 21, 43, 46, 38, 18, 35, 23, 35, 35, 38, 29, 31, 43, 38,
    ],
  },
  leviticus: {
    id: 3,
    totalChapters: 27,
    label: 'Leviticus',
    verseCounts: [
      17, 16, 17, 35, 19, 30, 38, 36, 24, 20, 47, 8, 59, 57, 33, 34, 16, 30, 37, 27, 24, 33, 44, 23,
      55, 46, 34,
    ],
  },
  numbers: {
    id: 4,
    totalChapters: 36,
    label: 'Numbers',
    verseCounts: [
      54, 34, 51, 49, 31, 27, 89, 26, 23, 36, 35, 16, 33, 45, 41, 50, 13, 32, 22, 29, 35, 41, 30,
      25, 18, 65, 23, 31, 40, 16, 54, 42, 56, 29, 34, 13,
    ],
  },
  deuteronomy: {
    id: 5,
    totalChapters: 34,
    label: 'Deuteronomy',
    verseCounts: [
      46, 37, 29, 49, 33, 25, 26, 20, 29, 22, 32, 32, 18, 29, 23, 22, 20, 22, 21, 20, 23, 30, 25,
      22, 19, 19, 26, 68, 29, 20, 30, 52, 29, 12,
    ],
  },
  joshua: {
    id: 6,
    totalChapters: 24,
    label: 'Joshua',
    verseCounts: [
      18, 24, 17, 24, 15, 27, 26, 35, 27, 43, 23, 24, 33, 15, 63, 10, 18, 28, 51, 9, 45, 34, 16,
      33,
    ],
  },
  judges: {
    id: 7,
    totalChapters: 21,
    label: 'Judges',
    verseCounts: [
      36, 23, 31, 24, 31, 40, 25, 35, 57, 18, 40, 15, 25, 20, 20, 31, 13, 31, 30, 48, 25,
    ],
  },
  ruth: {
    id: 8,
    totalChapters: 4,
    label: 'Ruth',
    verseCounts: [22, 23, 18, 22],
  },
  '1samuel': {
    id: 9,
    totalChapters: 31,
    label: '1 Samuel',
    verseCounts: [
      28, 36, 21, 22, 12, 21, 17, 22, 27, 27, 15, 25, 23, 52, 35, 23, 58, 30, 24, 43, 15, 23, 29,
      22, 44, 25, 12, 25, 11, 31, 13,
    ],
  },
  '2samuel': {
    id: 10,
    totalChapters: 24,
    label: '2 Samuel',
    verseCounts: [
      27, 32, 39, 12, 25, 23, 29, 18, 13, 19, 27, 31, 39, 33, 37, 23, 29, 33, 43, 26, 22, 51, 39,
      25,
    ],
  },
  '1kings': {
    id: 11,
    totalChapters: 22,
    label: '1 Kings',
    verseCounts: [
      53, 46, 28, 34, 18, 38, 51, 66, 28, 29, 43, 33, 34, 31, 34, 34, 24, 46, 21, 43, 29, 54,
    ],
  },
  '2kings': {
    id: 12,
    totalChapters: 25,
    label: '2 Kings',
    verseCounts: [
      18, 25, 27, 44, 27, 33, 20, 29, 37, 36, 21, 21, 25, 29, 38, 20, 41, 37, 37, 21, 26, 20, 37,
      20, 30,
    ],
  },
  '1chronicles': {
    id: 13,
    totalChapters: 29,
    label: '1 Chronicles',
    verseCounts: [
      54, 55, 24, 43, 26, 81, 40, 40, 44, 14, 47, 40, 14, 17, 29, 43, 27, 17, 19, 8, 30, 19, 32,
      31, 31, 32, 34, 21, 30,
    ],
  },
  '2chronicles': {
    id: 14,
    totalChapters: 36,
    label: '2 Chronicles',
    verseCounts: [
      17, 18, 17, 22, 14, 42, 22, 18, 31, 19, 23, 16, 22, 15, 19, 14, 19, 34, 11, 37, 20, 12, 21,
      27, 28, 23, 9, 27, 36, 27, 21, 33, 25, 33, 27, 23,
    ],
  },
  ezra: {
    id: 15,
    totalChapters: 10,
    label: 'Ezra',
    verseCounts: [11, 70, 13, 24, 17, 22, 28, 36, 15, 44],
  },
  nehemiah: {
    id: 16,
    totalChapters: 13,
    label: 'Nehemiah',
    verseCounts: [11, 20, 32, 23, 19, 19, 73, 18, 38, 39, 36, 47, 31],
  },
  esther: {
    id: 17,
    totalChapters: 10,
    label: 'Esther',
    verseCounts: [22, 23, 15, 17, 14, 14, 10, 17, 32, 3],
  },
  job: {
    id: 18,
    totalChapters: 42,
    label: 'Job',
    verseCounts: [
      22, 13, 26, 21, 27, 30, 21, 22, 35, 22, 20, 25, 28, 22, 35, 22, 16, 21, 29, 29, 34, 30, 17,
      25, 6, 14, 23, 28, 25, 31, 40, 22, 33, 37, 16, 33, 24, 41, 30, 24, 34, 17,
    ],
  },
  psalms: {
    id: 19,
    totalChapters: 150,
    label: 'Psalms',
    verseCounts: [
      6, 12, 8, 8, 12, 10, 17, 9, 20, 18, 7, 8, 6, 7, 5, 11, 15, 50, 14, 9, 13, 31, 6, 10, 22, 12,
      14, 9, 11, 12, 24, 11, 22, 22, 28, 12, 40, 22, 13, 17, 13, 11, 5, 26, 17, 11, 9, 14, 20, 23,
      19, 9, 6, 7, 23, 13, 11, 11, 17, 12, 8, 12, 11, 10, 13, 20, 7, 35, 36, 5, 24, 20, 28, 23, 10,
      12, 20, 72, 13, 19, 16, 8, 18, 12, 13, 17, 7, 18, 52, 17, 16, 15, 5, 23, 11, 13, 12, 9, 9, 5,
      8, 28, 22, 35, 45, 48, 43, 13, 31, 7, 10, 10, 9, 8, 18, 19, 2, 29, 176, 7, 8, 9, 4, 8, 5, 6,
      5, 6, 8, 8, 3, 18, 3, 3, 21, 26, 9, 8, 24, 13, 10, 7, 12, 15, 21, 10, 20, 14, 9, 6,
    ],
  },
  proverbs: {
    id: 20,
    totalChapters: 31,
    label: 'Proverbs',
    verseCounts: [
      33, 22, 35, 27, 23, 35, 27, 36, 18, 32, 31, 28, 25, 35, 33, 33, 28, 24, 29, 30, 31, 29, 35,
      34, 28, 28, 27, 28, 27, 33, 31,
    ],
  },
  ecclesiastes: {
    id: 21,
    totalChapters: 12,
    label: 'Ecclesiastes',
    verseCounts: [18, 26, 22, 16, 20, 12, 29, 17, 18, 20, 10, 14],
  },
  songofsolomon: {
    id: 22,
    totalChapters: 8,
    label: 'Song of Solomon',
    verseCounts: [17, 17, 11, 16, 16, 13, 13, 14],
  },
  isaiah: {
    id: 23,
    totalChapters: 66,
    label: 'Isaiah',
    verseCounts: [
      31, 22, 26, 6, 30, 13, 25, 22, 21, 34, 16, 6, 22, 32, 9, 14, 14, 7, 25, 6, 17, 25, 18, 23,
      12, 21, 13, 29, 24, 33, 9, 20, 24, 17, 10, 22, 38, 22, 8, 31, 29, 25, 28, 28, 25, 13, 15, 22,
      26, 11, 23, 15, 12, 17, 13, 12, 21, 22, 22, 11, 12, 19, 12, 25, 24,
    ],
  },
  jeremiah: {
    id: 24,
    totalChapters: 52,
    label: 'Jeremiah',
    verseCounts: [
      19, 37, 25, 31, 31, 30, 34, 22, 26, 25, 23, 17, 27, 22, 21, 21, 27, 23, 15, 18, 14, 30, 40,
      10, 38, 24, 22, 17, 32, 24, 40, 44, 26, 22, 19, 32, 21, 28, 18, 16, 18, 22, 13, 30, 5, 28, 7,
      47, 39, 46, 64, 34,
    ],
  },
  lamentations: {
    id: 25,
    totalChapters: 5,
    label: 'Lamentations',
    verseCounts: [22, 22, 66, 22, 22],
  },
  ezekiel: {
    id: 26,
    totalChapters: 48,
    label: 'Ezekiel',
    verseCounts: [
      28, 10, 27, 17, 17, 14, 27, 18, 11, 22, 25, 28, 23, 23, 8, 63, 24, 32, 14, 49, 32, 31, 49,
      27, 17, 21, 36, 26, 21, 26, 18, 32, 33, 31, 15, 38, 28, 23, 29, 49, 26, 20, 27, 31, 25, 24,
      23, 35,
    ],
  },
  daniel: {
    id: 27,
    totalChapters: 12,
    label: 'Daniel',
    verseCounts: [21, 49, 30, 37, 31, 28, 28, 27, 27, 21, 45, 13],
  },
  hosea: {
    id: 28,
    totalChapters: 14,
    label: 'Hosea',
    verseCounts: [11, 23, 5, 19, 15, 11, 16, 14, 17, 15, 12, 14, 16, 9],
  },
  joel: {
    id: 29,
    totalChapters: 3,
    label: 'Joel',
    verseCounts: [20, 32, 21],
  },
  amos: {
    id: 30,
    totalChapters: 9,
    label: 'Amos',
    verseCounts: [15, 16, 15, 13, 27, 14, 17, 14, 15],
  },
  obadiah: {
    id: 31,
    totalChapters: 1,
    label: 'Obadiah',
    verseCounts: [21],
  },
  jonah: {
    id: 32,
    totalChapters: 4,
    label: 'Jonah',
    verseCounts: [17, 10, 10, 11],
  },
  micah: {
    id: 33,
    totalChapters: 7,
    label: 'Micah',
    verseCounts: [16, 13, 12, 13, 15, 16, 20],
  },
  nahum: {
    id: 34,
    totalChapters: 3,
    label: 'Nahum',
    verseCounts: [15, 13, 19],
  },
  habakkuk: {
    id: 35,
    totalChapters: 3,
    label: 'Habakkuk',
    verseCounts: [17, 20, 19],
  },
  zephaniah: {
    id: 36,
    totalChapters: 3,
    label: 'Zephaniah',
    verseCounts: [18, 15, 20],
  },
  haggai: {
    id: 37,
    totalChapters: 2,
    label: 'Haggai',
    verseCounts: [15, 23],
  },
  zechariah: {
    id: 38,
    totalChapters: 14,
    label: 'Zechariah',
    verseCounts: [21, 13, 10, 14, 11, 15, 14, 23, 17, 12, 17, 14, 9, 21],
  },
  malachi: {
    id: 39,
    totalChapters: 4,
    label: 'Malachi',
    verseCounts: [14, 17, 18, 6],
  },
  matthew: {
    id: 40,
    totalChapters: 28,
    label: 'Matthew',
    verseCounts: [
      25, 22, 17, 25, 48, 34, 29, 34, 38, 42, 30, 50, 58, 36, 39, 28, 27, 35, 30, 34, 46, 45, 39,
      51, 46, 74, 66, 20,
    ],
  },
  mark: {
    id: 41,
    totalChapters: 16,
    label: 'Mark',
    verseCounts: [45, 28, 35, 40, 43, 56, 36, 37, 50, 52, 33, 44, 37, 72, 47, 20],
  },
  luke: {
    id: 42,
    totalChapters: 24,
    label: 'Luke',
    verseCounts: [
      80, 52, 38, 44, 39, 49, 50, 56, 62, 42, 54, 59, 35, 35, 32, 31, 37, 43, 48, 47, 38, 71, 56,
      53,
    ],
  },
  john: {
    id: 43,
    totalChapters: 21,
    label: 'John',
    verseCounts: [51, 25, 36, 54, 47, 71, 53, 59, 41, 42, 57, 50, 38, 31, 27, 33, 26, 40, 42, 31, 25],
  },
  acts: {
    id: 44,
    totalChapters: 28,
    label: 'Acts',
    verseCounts: [
      26, 47, 26, 37, 42, 15, 60, 40, 43, 48, 30, 25, 52, 28, 41, 40, 34, 28, 41, 38, 40, 30, 35,
      27, 27, 32, 44, 31,
    ],
  },
  romans: {
    id: 45,
    totalChapters: 16,
    label: 'Romans',
    verseCounts: [32, 29, 31, 25, 21, 23, 25, 39, 33, 21, 36, 21, 14, 23, 33, 27],
  },
  '1corinthians': {
    id: 46,
    totalChapters: 16,
    label: '1 Corinthians',
    verseCounts: [31, 16, 23, 21, 13, 20, 40, 13, 27, 33, 34, 31, 13, 40, 58, 24],
  },
  '2corinthians': {
    id: 47,
    totalChapters: 13,
    label: '2 Corinthians',
    verseCounts: [24, 17, 18, 18, 21, 18, 16, 24, 15, 18, 33, 21, 14],
  },
  galatians: {
    id: 48,
    totalChapters: 6,
    label: 'Galatians',
    verseCounts: [24, 21, 29, 31, 26, 18],
  },
  ephesians: {
    id: 49,
    totalChapters: 6,
    label: 'Ephesians',
    verseCounts: [23, 22, 21, 32, 33, 24],
  },
  philippians: {
    id: 50,
    totalChapters: 4,
    label: 'Philippians',
    verseCounts: [30, 30, 21, 23],
  },
  colossians: {
    id: 51,
    totalChapters: 4,
    label: 'Colossians',
    verseCounts: [29, 23, 25, 18],
  },
  '1thessalonians': {
    id: 52,
    totalChapters: 5,
    label: '1 Thessalonians',
    verseCounts: [10, 20, 13, 18, 28],
  },
  '2thessalonians': {
    id: 53,
    totalChapters: 3,
    label: '2 Thessalonians',
    verseCounts: [12, 17, 18],
  },
  '1timothy': {
    id: 54,
    totalChapters: 6,
    label: '1 Timothy',
    verseCounts: [20, 15, 16, 16, 25, 21],
  },
  '2timothy': {
    id: 55,
    totalChapters: 4,
    label: '2 Timothy',
    verseCounts: [18, 26, 17, 22],
  },
  titus: {
    id: 56,
    totalChapters: 3,
    label: 'Titus',
    verseCounts: [16, 15, 15],
  },
  philemon: {
    id: 57,
    totalChapters: 1,
    label: 'Philemon',
    verseCounts: [25],
  },
  hebrews: {
    id: 58,
    totalChapters: 13,
    label: 'Hebrews',
    verseCounts: [14, 18, 19, 16, 14, 20, 28, 13, 28, 39, 40, 29, 25],
  },
  james: {
    id: 59,
    totalChapters: 5,
    label: 'James',
    verseCounts: [27, 26, 18, 17, 20],
  },
  '1peter': {
    id: 60,
    totalChapters: 5,
    label: '1 Peter',
    verseCounts: [25, 25, 22, 19, 14],
  },
  '2peter': {
    id: 61,
    totalChapters: 3,
    label: '2 Peter',
    verseCounts: [21, 22, 18],
  },
  '1john': {
    id: 62,
    totalChapters: 5,
    label: '1 John',
    verseCounts: [10, 29, 24, 21, 21],
  },
  '2john': {
    id: 63,
    totalChapters: 1,
    label: '2 John',
    verseCounts: [13],
  },
  '3john': {
    id: 64,
    totalChapters: 1,
    label: '3 John',
    verseCounts: [15],
  },
  jude: {
    id: 65,
    totalChapters: 1,
    label: 'Jude',
    verseCounts: [25],
  },
  revelation: {
    id: 66,
    totalChapters: 22,
    label: 'Revelation',
    verseCounts: [
      20, 29, 22, 11, 14, 17, 17, 13, 21, 11, 19, 18, 18, 20, 8, 21, 18, 24, 21, 15, 27, 21,
    ],
  },
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
  verseSelections: {},
  chapterVerseCounts: {},
  activeSelector: 'chapter',
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

const loadState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const selectionRaw = localStorage.getItem(SELECTIONS_KEY);
    let selectionData = null;
    if (selectionRaw) {
      try {
        selectionData = JSON.parse(selectionRaw);
      } catch (e) {
        selectionData = null;
      }
    }
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.version === STATE_VERSION) {
      const normalized = { ...defaultState, ...parsed };
      if (selectionData?.verseSelections) {
        normalized.verseSelections = selectionData.verseSelections;
      }
      if (selectionData?.activeChapters) {
        normalized.activeChapters = selectionData.activeChapters;
      }
      if (!normalized.verseSelections || typeof normalized.verseSelections !== 'object') {
        normalized.verseSelections = {};
      }
      if (!normalized.chapterVerseCounts || typeof normalized.chapterVerseCounts !== 'object') {
        normalized.chapterVerseCounts = {};
      }
      if (normalized.activeSelector !== 'verse') {
        normalized.activeSelector = 'chapter';
      }
      // Clear transient/error statuses on load so retry indicators do not persist.
      Object.entries(normalized.chapterIndex || {}).forEach(([key, entry]) => {
        if (!entry) return;
        if (entry.status === STATUS.ERROR || entry.status === STATUS.DOWNLOADING) {
          entry.status = undefined;
        }
        if (entry.verseIds?.length) {
          normalized.chapterVerseCounts[key] = entry.verseIds.length;
        } else if (entry.status === STATUS.READY) {
          // If we persisted a READY flag without verseIds, force a fresh download
          entry.status = STATUS.NOT_DOWNLOADED;
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
  if (!storageWritable) return;
  try {
    const persistable = buildPersistableState(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
    localStorage.setItem(
      SELECTIONS_KEY,
      JSON.stringify({
        verseSelections: appState.verseSelections,
        activeChapters: appState.activeChapters,
      })
    );
  } catch (err) {
    if (err && err.name === 'QuotaExceededError') {
      // Retry with a minimal state (no verse text) so at least selections persist
      try {
        const minimal = buildPersistableState(false);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
        localStorage.setItem(
          SELECTIONS_KEY,
          JSON.stringify({
            verseSelections: appState.verseSelections,
            activeChapters: appState.activeChapters,
          })
        );
        console.warn('Saved settings without downloaded verses due to quota limits');
      } catch (innerErr) {
        storageWritable = false;
        console.warn('Unable to save settings - storage quota exceeded; further saves disabled');
      }
    } else {
      console.warn('Unable to save settings', err);
    }
  }
};
const recomputeActiveVerseIds = () => {
  const ids = [];
  appState.activeChapters.forEach((chapterKey) => {
    const entry = appState.chapterIndex[chapterKey];
    if (entry && entry.status === STATUS.READY && entry.verseIds?.length) {
      const selection = appState.verseSelections?.[chapterKey];
      // If selection exists and allSelected is true, include all verses
      // If selection exists with specific verses, include only those
      // If no selection exists, include all verses (chapter was selected in chapter mode)
      if (selection) {
        if (selection.allSelected) {
          ids.push(...entry.verseIds);
        } else if (selection.selectedVerses && selection.selectedVerses.length > 0) {
          const selectedSet = new Set(selection.selectedVerses);
          entry.verseIds.forEach((id) => {
            const verseNumber = Number(id.split(',')[2]);
            if (selectedSet.has(verseNumber)) {
              ids.push(id);
            }
          });
        }
        // If selection exists but has no verses selected, don't include any
      } else {
        // No selection object means chapter was selected in chapter mode - include all verses
        ids.push(...entry.verseIds);
      }
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
  updateVerseIndicators();
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

    for (let chapter = start; chapter <= cappedEnd; chapter += 1) {
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
      numberSpan.textContent = `Chapter ${chapter}`;
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
    }

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
    const status = getChapterStatus(chapterKey);
    const label = statusLabelFor(status);
    if (statusSpan) {
      statusSpan.textContent = label;
      statusSpan.className = `chapter-status${status ? ` ${status}` : ''}`;
    }
    if (verseStatusEls) {
      verseStatusEls.forEach((el) => {
        el.textContent = label;
        el.className = `chapter-status${status ? ` ${status}` : ''}`;
      });
    }
  });
};

const updateVerseStatusForChapter = (chapterKey) => {
  const entry = verseChapterToggleMap.get(chapterKey);
  if (!entry) return;
  const status = getChapterStatus(chapterKey);
  const label = statusLabelFor(status);
  const { statusSpan, verseStatusEls } = entry;
  if (statusSpan) {
    statusSpan.textContent = label;
    statusSpan.className = `chapter-status${status ? ` ${status}` : ''}`;
  }
  if (verseStatusEls) {
    verseStatusEls.forEach((el) => {
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

const getChapterStatus = (chapterKey) => appState.chapterIndex[chapterKey]?.status || STATUS.NOT_DOWNLOADED;

const getVerseNumbersForChapter = (chapterKey) => {
  const entry = appState.chapterIndex[chapterKey];
  if (entry?.verseIds?.length) {
    return entry.verseIds
      .map((id) => Number(id.split(',')[2]))
      .filter((num) => Number.isFinite(num));
  }
  const cached = appState.chapterVerseCounts?.[chapterKey];
  if (cached && Number.isFinite(cached) && cached > 0) {
    return Array.from({ length: cached }, (_, idx) => idx + 1);
  }
  const { bookId, chapter } = getChapterMeta(chapterKey);
  const bookMeta = Object.values(books).find((b) => b.id === bookId);
  const count = bookMeta?.verseCounts?.[chapter - 1];
  if (Number.isFinite(count) && count > 0) {
    return Array.from({ length: count }, (_, idx) => idx + 1);
  }
  return [];
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
  appState.chapterVerseCounts[chapterKey] = verseIds.length;

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
  const selectedChapters = chapterOptions.filter((option) => option.checked).map((opt) => opt.value);
  const selectedSet = new Set(selectedChapters);

  // For newly selected chapters, create allSelected entry if no verse selection exists
  selectedChapters.forEach((chapterKey) => {
    if (!appState.verseSelections[chapterKey]) {
      appState.verseSelections[chapterKey] = { allSelected: true, selectedVerses: [] };
    }
  });

  // Remove verse selections for unchecked chapters
  Object.keys(appState.verseSelections || {}).forEach((chapterKey) => {
    if (!selectedSet.has(chapterKey)) {
      delete appState.verseSelections[chapterKey];
    }
  });

  // Combine chapters selected in chapter mode with those having verse selections
  const verseSelectedChapters = Object.entries(appState.verseSelections || {})
    .filter(([, selection]) => hasVerseSelection(selection))
    .map(([chapterKey]) => chapterKey);

  const combined = Array.from(new Set([...selectedChapters, ...verseSelectedChapters]));
  appState.activeChapters = combined;

  updateBookToggleStates();
  saveState();
  startDownloadsForSelection();
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

  appState.activeChapters = verseSelectedChapters;

  // Clean up any verse selections that have no actual selection
  Object.keys(appState.verseSelections || {}).forEach((chapterKey) => {
    const selection = appState.verseSelections[chapterKey];
    if (!hasVerseSelection(selection)) {
      delete appState.verseSelections[chapterKey];
    }
  });

  saveState();
  startDownloadsForSelection();
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
    appState.activeChapters = [];
    appState.activeVerseIds = [];
    appState.verseSelections = {};
    saveState();
    updateChapterIndicators();
    showSelectorView(activeSelector);
    return;
  }

  appState.year = seasonSelect.value;
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

const initialState = loadState();
if (initialState) {
  appState = initialState;
  // Save the migrated state back to localStorage
  saveState();
}
activeSelector = appState.activeSelector === 'verse' ? 'verse' : 'chapter';
renderYearOptions(appState.year);
if (appState.year) {
  seasonSelect.value = appState.year;
}

installCompromisePlugin();
toggleChapterSelector();
requestPersistentStorage();
