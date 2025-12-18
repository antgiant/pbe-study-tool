/**
 * Utility functions for the PBE Practice Engine
 * These are pure functions extracted for testing purposes
 */

export const STATUS = {
  READY: 'ready',
  DOWNLOADING: 'downloading',
  ERROR: 'error',
  NOT_DOWNLOADED: 'not-downloaded',
  PARTIAL: 'partial',
};

export const STATE_OF_BEING_WORDS = ['am', 'is', 'are', 'was', 'were', 'be', 'being', 'been'];

export const TFIDF_CONFIG = {
  verseWeight: 0.6,
  chapterWeight: 0.4,
  tfidfWeight: 0.3,
  priorityWeight: 0.7,
  minWordLength: 2,
};

/**
 * Strips HTML tags from text
 * @param {string} html - HTML string to strip
 * @returns {string} Plain text
 */
export const stripHtml = (html) => html.replace(/<[^>]*>/g, ' ');

/**
 * Tokenizes text into words
 * @param {string} text - Text to tokenize
 * @returns {string[]} Array of lowercase words
 */
export const tokenizeText = (text) => {
  const { minWordLength } = TFIDF_CONFIG;
  const words = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= minWordLength);
  return words;
};

/**
 * Calculates term frequency for words
 * @param {string[]} words - Array of words
 * @returns {Object.<string, number>} Term frequency map
 */
export const calculateTermFrequency = (words) => {
  const frequency = {};
  const total = words.length;
  words.forEach((word) => {
    frequency[word] = (frequency[word] || 0) + 1;
  });
  Object.keys(frequency).forEach((word) => {
    frequency[word] = frequency[word] / total;
  });
  return frequency;
};

/**
 * Calculates inverse document frequency
 * @param {string[]} verseIds - Array of verse IDs
 * @param {Object} verseBank - Verse data bank
 * @returns {Object.<string, number>} IDF scores
 */
export const calculateIDF = (verseIds, verseBank) => {
  const documentFrequency = {};
  const totalDocs = verseIds.length;

  verseIds.forEach((id) => {
    const verse = verseBank[id];
    if (!verse || !verse.termFrequency) return;
    const uniqueWords = new Set(Object.keys(verse.termFrequency));
    uniqueWords.forEach((word) => {
      documentFrequency[word] = (documentFrequency[word] || 0) + 1;
    });
  });

  const idf = {};
  Object.entries(documentFrequency).forEach(([word, freq]) => {
    idf[word] = Math.log(totalDocs / freq);
  });

  return idf;
};

/**
 * Combines TF and IDF scores
 * @param {Object.<string, number>} tf - Term frequency map
 * @param {Object.<string, number>} idf - IDF map
 * @returns {Object.<string, number>} TF-IDF scores
 */
export const combineTfIdf = (tf, idf) => {
  const tfidf = {};
  Object.keys(tf).forEach((word) => {
    const idfScore = idf[word] || 0;
    tfidf[word] = tf[word] * idfScore;
  });
  return tfidf;
};

/**
 * Normalizes scores to 0-1 range
 * @param {Object.<string, number>} scores - Score map
 * @returns {Object.<string, number>} Normalized scores
 */
export const normalizeScores = (scores) => {
  const values = Object.values(scores);
  if (values.length === 0) return {};

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  if (range === 0) {
    const normalized = {};
    Object.keys(scores).forEach((key) => {
      normalized[key] = 1;
    });
    return normalized;
  }

  const normalized = {};
  Object.entries(scores).forEach(([key, value]) => {
    normalized[key] = (value - min) / range;
  });
  return normalized;
};

/**
 * Converts value to integer with fallback
 * @param {*} value - Value to convert
 * @param {number} fallback - Fallback value
 * @returns {number} Integer value
 */
export const toInt = (value, fallback = 1) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

/**
 * Shuffles an array (Fisher-Yates)
 * @param {Array} arr - Array to shuffle
 * @returns {Array} Shuffled copy
 */
export const shuffle = (arr) => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

/**
 * Formats a verse reference
 * @param {string} verseId - Verse ID (bookId,chapter,verse)
 * @param {Object} books - Books data
 * @returns {string} Formatted reference
 */
export const verseReference = (verseId, books) => {
  const [bookIdStr, chapterStr, verseStr] = verseId.split(',');
  const bookId = Number(bookIdStr);
  const chapter = Number(chapterStr);
  const verse = Number(verseStr);
  const bookLabel = Object.values(books).find((b) => b.id === bookId)?.label || `Book ${bookId}`;
  return `${bookLabel} ${chapter}:${verse} (NKJV)`;
};

/**
 * Calculates random points value for a verse
 * @param {string} verseId - Verse ID
 * @param {Object} verseBank - Verse data
 * @param {number} minBlanks - Minimum blanks
 * @param {number} maxBlanks - Maximum blanks
 * @param {number} maxBlankPercentage - Max percentage of words to blank
 * @returns {number} Number of blanks
 */
export const randomPointsValue = (verseId, verseBank, minBlanks, maxBlanks, maxBlankPercentage) => {
  const verse = verseBank[verseId];
  const plain = verse?.text ? stripHtml(verse.text).trim() : '';
  const wordCount = plain ? plain.split(/\s+/).filter(Boolean).length : 1;
  const percentCap = Math.max(1, Math.floor((maxBlankPercentage / 100) * wordCount));
  const maxAllowed = Math.max(1, Math.min(maxBlanks, wordCount, percentCap));
  const minAllowed = Math.max(1, Math.min(minBlanks, maxAllowed));
  return Math.floor(Math.random() * (maxAllowed - minAllowed + 1)) + minAllowed;
};

/**
 * Checks if a verse selection has any verses selected
 * @param {Object} selection - Verse selection object
 * @returns {boolean} True if has selection
 */
export const hasVerseSelection = (selection) => {
  if (!selection) return false;
  const allFlag = selection.all === true || selection.allSelected === true;
  const versesArray = selection.verses || selection.selectedVerses;
  return Boolean(allFlag || (versesArray && versesArray.length > 0));
};

/**
 * Returns the total verse count for a chapter using meta data
 * @param {Object} books - Books map
 * @param {number} bookId - Book ID
 * @param {number} chapter - Chapter number (1-based)
 * @returns {number|null} Verse count or null if unknown
 */
export const getMetaVerseCount = (books, bookId, chapter) => {
  if (!books || !Number.isFinite(bookId) || !Number.isFinite(chapter)) return null;
  const bookMeta = Object.values(books).find((b) => b.id === bookId);
  const count = bookMeta?.verseCounts?.[chapter - 1];
  return Number.isFinite(count) && count > 0 ? count : null;
};

/**
 * Computes the most reliable verse count for a chapter
 * @param {string[]} verseIds - Array of verseIds (book,chapter,verse)
 * @param {number|null|undefined} existingCount - Existing stored count
 * @param {number|null|undefined} metaCount - Count from meta data
 * @returns {number|null} Total verse count if known
 */
export const computeVerseCount = (verseIds = [], existingCount, metaCount) => {
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

/**
 * Builds a list of verse numbers for display
 * @param {string[]} verseIds - Array of verseIds (book,chapter,verse)
 * @param {number|null|undefined} existingCount - Existing stored count
 * @param {number|null|undefined} metaCount - Count from meta data
 * @returns {number[]} Array of verse numbers (1-based)
 */
export const buildVerseNumbers = (verseIds = [], existingCount, metaCount) => {
  const count = computeVerseCount(verseIds, existingCount, metaCount);
  if (Number.isFinite(count) && count > 0) {
    return Array.from({ length: count }, (_, idx) => idx + 1);
  }

  // Fall back to numbers derived from verseIds
  return verseIds
    .map((id) => Number(id?.split?.(',')?.[2]))
    .filter((n) => Number.isFinite(n));
};

/**
 * Creates a download plan for verse mode based on active chapters and verse selections
 * @param {string[]} activeChapters
 * @param {Object} verseSelections
 * @returns {{chapterDownloads: string[], verseDownloads: string[]}}
 */
export const buildVerseDownloadPlan = (activeChapters = [], verseSelections = {}) => {
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

/**
 * Determines if the required verses for a selection are already downloaded
 * @param {Object|null} selection - verse selection for a chapter
 * @param {string[]} verseIds - downloaded verse ids for the chapter
 * @param {string} status - chapter status
 * @param {number|null|undefined} verseCount - known verse count (optional)
 * @returns {boolean}
 */
export const isSelectionComplete = (selection, verseIds = [], status, verseCount) => {
  const downloaded = new Set(
    verseIds
      .map((id) => Number(id?.split?.(',')?.[2]))
      .filter((n) => Number.isFinite(n))
  );

  // Chapter mode or allSelected requires the full chapter to be ready
  if (!selection || selection.allSelected === true || selection.all === true) {
    if (status !== STATUS.READY) return false;
    const hasAny = downloaded.size > 0;
    if (!hasAny) return false;
    if (Number.isFinite(verseCount)) {
      return downloaded.size >= verseCount;
    }
    return true;
  }

  const selected = selection.selectedVerses || selection.verses || [];
  if (!selected.length) return false;
  return selected.every((verseNum) => downloaded.has(verseNum));
};

/**
 * Determines whether a chapter download should be triggered for a given selection/state
 * @param {Object|null} selection - verse selection for the chapter
 * @param {Object|null} chapterEntry - chapter index entry containing status/verseIds
 * @returns {boolean}
 */
export const shouldDownloadFullChapter = (selection, chapterEntry) => {
  if (selection && selection.allSelected === false && selection.all !== true && (selection.selectedVerses || selection.verses)) {
    // Explicit verse-only selection: do NOT download the whole chapter
    return false;
  }

  const ready = chapterEntry?.status === STATUS.READY && Array.isArray(chapterEntry?.verseIds) && chapterEntry.verseIds.length > 0;
  return !ready;
};

/**
 * Computes the status for an individual verse based on downloads and chapter state
 * @param {Object} params
 * @param {string} params.verseId
 * @param {string} params.chapterKey
 * @param {Map<string, Promise>|Set<string>} params.downloadsInFlight
 * @param {Object} params.verseBank
 * @param {string} params.chapterStatus
 * @returns {string} STATUS value
 */
export const computeVerseStatus = ({
  verseId,
  chapterKey,
  downloadsInFlight,
  verseBank,
  chapterStatus,
  verseErrors = {},
}) => {
  if (verseErrors && verseErrors[verseId]) return STATUS.ERROR;
  const inFlight = Boolean(downloadsInFlight?.has?.(verseId) || downloadsInFlight?.has?.(chapterKey));
  if (inFlight) return STATUS.DOWNLOADING;
  if (verseBank && verseBank[verseId]) return STATUS.READY;
  return chapterStatus || STATUS.NOT_DOWNLOADED;
};

/**
 * Formats selection descriptions for the year dropdown
 * @param {string} yearKey
 * @param {Object} chaptersByYear
 * @param {Object} books
 * @returns {string} description string (e.g., "Job 1, 3-4, 7:1-15; Exodus 2:10-30")
 */
export const formatYearSelectionDescription = (yearKey, chaptersByYear, books) => {
  const selections = chaptersByYear[yearKey] || [];
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
    const bookMeta = books[sel.bookKey];
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

/**
 * Builds an exclusion set from a list of allowed ranges (inclusive)
 * @param {number} totalVerses - Total verses in the chapter
 * @param {Array<[number, number]>} includeRanges - Allowed ranges (inclusive)
 * @returns {Set<number>} Excluded verse numbers
 */
export const buildExclusionSetFromInclusions = (totalVerses, includeRanges = []) => {
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

/**
 * Returns allowed verse numbers from inclusions
 * @param {number} totalVerses
 * @param {Array<[number, number]>} includeRanges
 * @returns {number[]}
 */
export const allowedVersesFromInclusions = (totalVerses, includeRanges = []) => {
  const allowed = new Set();
  includeRanges.forEach(([start, end]) => {
    for (let v = start; v <= end; v += 1) {
      if (v >= 1 && v <= totalVerses) allowed.add(v);
    }
  });
  return Array.from(allowed).sort((a, b) => a - b);
};

/**
 * Returns the chapterKey (bookId,chapter) for a verseId
 * @param {string} verseId - Verse ID in the form bookId,chapter,verse
 * @returns {string|null} chapterKey or null when invalid
 */
export const chapterKeyFromVerseId = (verseId) => {
  if (!verseId) return null;
  const [bookIdStr, chapterStr] = `${verseId}`.split(',');
  const bookId = Number(bookIdStr);
  const chapter = Number(chapterStr);
  if (!Number.isFinite(bookId) || !Number.isFinite(chapter)) return null;
  return `${bookId},${chapter}`;
};

/**
 * Computes the chapter status transition for single-verse downloads
 * @param {string|undefined} currentStatus - Current status for the chapter
 * @param {'start'|'success'|'error'} phase - Download phase
 * @returns {string} Next status
 */
export const nextChapterStatusForVerseDownload = (currentStatus, phase) => {
  if (phase === 'start') return STATUS.DOWNLOADING;
  if (phase === 'error') return STATUS.ERROR;
  if (phase === 'success') {
    return currentStatus === STATUS.READY ? STATUS.READY : STATUS.PARTIAL;
  }
  return currentStatus || STATUS.NOT_DOWNLOADED;
};

/**
 * Validates blank configuration
 * @param {number} minBlanks - Minimum blanks
 * @param {number} maxBlanks - Maximum blanks
 * @param {number} maxBlankPercentage - Max percentage
 * @param {number} maxAllowedBlanks - Maximum allowed based on content
 * @returns {Object} Validation result with valid flag and errors
 */
export const validateBlankConfig = (minBlanks, maxBlanks, maxBlankPercentage, maxAllowedBlanks) => {
  const errors = [];

  if (minBlanks < 1) {
    errors.push('Minimum blanks must be at least 1');
  }

  if (maxBlanks < minBlanks) {
    errors.push('Maximum blanks must be greater than or equal to minimum blanks');
  }

  if (maxBlankPercentage < 1 || maxBlankPercentage > 100) {
    errors.push('Max blank percentage must be between 1 and 100');
  }

  if (maxBlanks > maxAllowedBlanks) {
    errors.push(`Maximum blanks exceeds allowed limit of ${maxAllowedBlanks}`);
  }

 return {
    valid: errors.length === 0,
    errors
  };
};

const toNumberOrNull = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const isNonNumericString = (value) => typeof value === 'string' && !/^\d+$/.test(value);

const normalizeVerseEntry = (entry, defaults = {}) => {
  if (!entry) return null;

  const ref = entry.reference || {};
  const bookId = toNumberOrNull(entry.bookId ?? entry.book_id ?? ref.book_id ?? defaults.bookId);
  const chapter = toNumberOrNull(entry.chapter ?? entry.chapter_nr ?? ref.chapter ?? defaults.chapter);
  const verse = toNumberOrNull(
    entry.verse_nr ?? entry.nr ?? ref.verse_nr ?? ref.nr ?? entry.verse ?? ref.verse ?? entry.verse_nr_alt
  );

  let text =
    entry.content ??
    entry.text ??
    entry.text_nr ??
    entry.text_clean ??
    entry.verseText ??
    entry.verse_content ??
    (isNonNumericString(entry.verse) ? entry.verse : '');

  text = text ?? '';

  if (!Number.isFinite(verse)) return null;

  const result = {
    bookId,
    chapter,
    verse,
    text,
  };

  if (Number.isFinite(bookId) && Number.isFinite(chapter)) {
    result.verseId = `${bookId},${chapter},${verse}`;
  }

  return result;
};

/**
 * Parses verse data from API response
 * @param {Array} data - API response data
 * @returns {Array} Parsed verses
 */
export const parseVerses = (data) => {
  if (!data) return [];

  const defaults = {
    bookId: toNumberOrNull(data.book_id ?? data.bookId),
    chapter: toNumberOrNull(data.chapter ?? data.chapter_nr),
  };

  const normalizeWithDefaults = (entry) => normalizeVerseEntry(entry, defaults);

  if (Array.isArray(data)) {
    return data.map(normalizeWithDefaults).filter(Boolean);
  }

  if (Array.isArray(data.verses)) {
    return data.verses.map(normalizeWithDefaults).filter(Boolean);
  }

  if (data.verses && typeof data.verses === 'object') {
    return Object.entries(data.verses)
      .map(([verseNum, value]) => {
        if (typeof value === 'string') {
          return { verse: verseNum, text: value };
        }
        return { verse: verseNum, ...value };
      })
      .map(normalizeWithDefaults)
      .filter(Boolean);
  }

  if (typeof data === 'object') {
    const single = normalizeWithDefaults(data);
    return single ? [single] : [];
  }

  return [];
};
