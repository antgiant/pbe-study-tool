/**
 * Utility functions for the PBE Practice Engine
 * These are pure functions extracted for testing purposes
 */

export const STATUS = {
  READY: 'ready',
  DOWNLOADING: 'downloading',
  ERROR: 'error',
  NOT_DOWNLOADED: 'not-downloaded',
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
  return Boolean(selection.all === true || (selection.verses && selection.verses.length > 0));
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

/**
 * Parses verse data from API response
 * @param {Array} data - API response data
 * @returns {Array} Parsed verses
 */
export const parseVerses = (data) => {
  if (!Array.isArray(data)) return [];

  return data.map(item => {
    if (!item || !item.reference) return null;

    const ref = item.reference;
    return {
      bookId: ref.book_id,
      chapter: ref.chapter,
      verse: ref.verse,
      text: item.content || '',
      verseId: `${ref.book_id},${ref.chapter},${ref.verse}`
    };
  }).filter(Boolean);
};
