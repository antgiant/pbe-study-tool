const seasonSelect = document.getElementById('year');
const chapterSelector = document.getElementById('chapter-selector');
const selectAll = document.getElementById('select-all');
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

const defaultState = {
  version: STATE_VERSION,
  year: '',
  activeChapters: [],
  activeVerseIds: [],
  chapterIndex: {},
  verseBank: {},
  minBlanks: 1,
  maxBlanks: 1,
};

let appState = { ...defaultState };
let chapterOptions = [];
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
  const minWords = computeMinWordsInActiveSelection();
  const maxWords = computeMaxWordsInActiveSelection();
  const minVal = Math.max(1, Math.min(toInt(appState.minBlanks, 1), minWords));
  const maxVal = Math.max(minVal, Math.min(toInt(appState.maxBlanks, maxWords), maxWords));

  appState.minBlanks = minVal;
  appState.maxBlanks = maxVal;

  minBlanksInput.min = 1;
  minBlanksInput.max = minWords;
  maxBlanksInput.min = 1;
  maxBlanksInput.max = maxWords;

  minBlanksInput.value = appState.minBlanks;
  maxBlanksInput.value = appState.maxBlanks;

  blankLimitHint.textContent = `Min capped at ${minWords} words; max allowed is ${maxWords} based on selected verses.`;
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

const syncSelectAllState = () => {
  if (chapterOptions.length === 0) {
    selectAll.checked = false;
    return;
  }
  const allChecked = chapterOptions.every((option) => option.checked);
  selectAll.checked = allChecked;
};

const statusLabelFor = (status) => {
  if (status === STATUS.DOWNLOADING) return ' (downloading...)';
  if (status === STATUS.ERROR) return ' ⚠ retry needed';
  if (status === STATUS.READY) return ' (ready)';
  return ' (not downloaded)';
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

const renderChapterOptions = (year, selectedValues = new Set()) => {
  optionsContainer.innerHTML = '';
  const selections = chaptersByYear[year] || [];

  selections.forEach(({ bookKey, start, end }) => {
    const meta = books[bookKey];
    if (!meta) return;
    const cappedEnd = Math.min(end, meta.totalChapters);

    for (let chapter = start; chapter <= cappedEnd; chapter += 1) {
      const chapterKey = `${meta.id},${chapter}`;
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.className = 'chapter-option';
      input.value = chapterKey;
      input.checked = selectedValues.has(input.value);

      const textNode = document.createTextNode(` ${meta.label} ${chapter}`);
      const statusSpan = document.createElement('span');
      const status = appState.chapterIndex[chapterKey]?.status || STATUS.NOT_DOWNLOADED;
      statusSpan.className = `chapter-status${status ? ` ${status}` : ''}`;
      statusSpan.textContent = statusLabelFor(status);

      label.appendChild(input);
      label.appendChild(textNode);
      label.appendChild(statusSpan);
      optionsContainer.appendChild(label);
    }
  });

  chapterOptions = Array.from(optionsContainer.querySelectorAll('.chapter-option'));
  chapterOptions.forEach((option) => {
    option.addEventListener('change', () => {
      syncSelectAllState();
      handleChapterSelectionChange();
    });
  });

  syncSelectAllState();
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
    appState.verseBank[id] = { bookId, chapter, verse, text, source };
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
  syncSelectAllState();
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
  saveState();
  startDownloadsForSelection();
  updateStartState();
  if (sessionActive) {
    // Rebuild the question order if the selection changed while in session.
    questionOrder = shuffle(appState.activeVerseIds);
    questionPointsList = questionOrder.map((id) => randomPointsValue(id));
    const blanksData = questionOrder.map((id, idx) =>
      applyBlanks(appState.verseBank[id]?.text || '', questionPointsList[idx])
    );
    questionBlanksList = blanksData.map(data => data.blanked);
    questionAnswersList = blanksData.map(data => data.answer);
    questionBlankedWordsList = blanksData.map(data => data.blankedWords);
    hintsRevealedList = blanksData.map(() => 0);
    questionIndex = 0;
    updateQuestionView();
  }
};

const handleSelectAllChange = (checked) => {
  chapterOptions.forEach((option) => {
    option.checked = checked;
  });
  handleChapterSelectionChange();
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
  const maxAllowed = Math.min(appState.maxBlanks, wordCount);
  const minAllowed = Math.min(appState.minBlanks, maxAllowed);
  return Math.floor(Math.random() * (maxAllowed - minAllowed + 1)) + minAllowed;
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

const applyBlanks = (htmlText, blanks) => {
  const raw = (htmlText || '').trim();
  if (!raw) return { blanked: '', answer: '' };

  // Parse plain text with NLP, but keep track of original HTML
  const plainText = stripHtml(raw);
  const normalizedText = normalizeTextForNlp(plainText);
  const doc = typeof nlp !== 'undefined' ? nlp(normalizedText) : null;
  const termJson =
    doc && doc.json
      ? doc
          .json({ terms: true })
          .flatMap((s) => s.terms || [])
          .map((t, idx) => ({ ...t, idx }))
      : plainText.split(/\s+/).map((w, idx) => ({ text: w, idx, tags: [] }));

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

  // Assign priority to each term but keep all terms (including punctuation)
  const termsWithPriority = termJson.map((t) => {
    const isPunct = hasTag(t, ['Punctuation']);
    const lowerText = (t.text || '').toLowerCase();
    let priority = 5;

    // Check for function words first (overrides tag-based classification)
    if (FUNCTION_WORDS.has(lowerText)) {
      priority = 4;
    } else if (PRIORITY_WORDS.has(lowerText) || hasTag(t, ['Person', 'Place', 'Organization', 'ProperNoun', 'Date', 'Value', 'Cardinal', 'Ordinal'])) {
      priority = 1;
    } else if (hasTag(t, ['Noun', 'Verb', 'Gerund'])) {
      priority = 2;
    } else if (hasTag(t, ['Interjection', 'Expression', 'Adjective', 'Adverb'])) {
      priority = 3;
    } else if (hasTag(t, ['Preposition', 'Conjunction', 'Determiner', 'Pronoun', 'Articles', 'StatesofBeingVerbs'])) {
      priority = 4;
    }
    return { ...t, isPunct, priority };
  });

  // Filter to get only non-punctuation candidates
  const candidates = termsWithPriority.filter((t) => !t.isPunct);

  const chosen = new Set();
  const target = Math.min(blanks, candidates.length);
  for (let p = 1; p <= 5 && chosen.size < target; p += 1) {
    const bucket = candidates.filter((c) => c.priority === p && !chosen.has(c.idx));
    shuffle(bucket).forEach((c) => {
      if (chosen.size < target) chosen.add(c.idx);
    });
  }

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
  let blankedResult = raw;
  let answerResult = raw;
  const blankedWords = [];

  blanksToApply.forEach(({ word, lowerWord }) => {
    const escapedWord = lowerWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
    blankedWords.push(word);
    blankedResult = blankedResult.replace(regex, '_________');
    answerResult = answerResult.replace(regex, `<span class="blanked-word">${word}</span>`);
  });

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
  const pointsValue =
    questionPointsList[questionIndex] ?? (questionPointsList[questionIndex] = randomPointsValue(verseId));
  questionPointsEl.textContent = `${pointsValue} Points`;
  if (!questionBlanksList[questionIndex]) {
    const blanksData = applyBlanks(verseData?.text || '', pointsValue);
    questionBlanksList[questionIndex] = blanksData.blanked;
    questionAnswersList[questionIndex] = blanksData.answer;
    questionBlankedWordsList[questionIndex] = blanksData.blankedWords;
    hintsRevealedList[questionIndex] = 0;
  }

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
  questionOrder = shuffle(appState.activeVerseIds);
  questionPointsList = questionOrder.map((id) => randomPointsValue(id));
  const blanksData = questionOrder.map((id, idx) =>
    applyBlanks(appState.verseBank[id]?.text || '', questionPointsList[idx])
  );
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
    questionPointsList = questionOrder.map((id) => randomPointsValue(id));
    const blanksData = questionOrder.map((id, idx) => applyBlanks(appState.verseBank[id]?.text || '', questionPointsList[idx]));
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
    questionPointsList = questionOrder.map((id) => randomPointsValue(id));
    const blanksData = questionOrder.map((id, idx) => applyBlanks(appState.verseBank[id]?.text || '', questionPointsList[idx]));
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
    selectAll.checked = false;
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

selectAll.addEventListener('change', (event) => {
  handleSelectAllChange(event.target.checked);
});

startButton.addEventListener('click', startSession);
selectorsToggle.addEventListener('click', () => toggleSelectors());
nextButton.addEventListener('click', showAnswer);
prevButton.addEventListener('click', goPrev);
hintButton.addEventListener('click', revealHint);
answerNextButton.addEventListener('click', goNextFromAnswer);
answerPrevButton.addEventListener('click', goPrevFromAnswer);

minBlanksInput.addEventListener('input', () => {
  const value = Math.max(1, toInt(minBlanksInput.value, 1));
  appState.minBlanks = value;
  if (appState.maxBlanks < value) {
    appState.maxBlanks = value;
  }
  updateBlankInputs();
});

maxBlanksInput.addEventListener('input', () => {
  const value = Math.max(1, toInt(maxBlanksInput.value, 1));
  const maxWords = computeMaxWordsInActiveSelection();
  appState.maxBlanks = Math.min(value, maxWords);
  if (appState.maxBlanks < appState.minBlanks) {
    appState.minBlanks = appState.maxBlanks;
  }
  updateBlankInputs();
});

const initialState = loadState();
if (initialState) {
  appState = initialState;
}
if (appState.year) {
  seasonSelect.value = appState.year;
}

installCompromisePlugin();
toggleChapterSelector();
requestPersistentStorage();
