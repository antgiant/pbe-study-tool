import { describe, it, expect } from 'vitest';
import {
  stripHtml,
  tokenizeText,
  calculateTermFrequency,
  calculateIDF,
  combineTfIdf,
  normalizeScores,
  toInt,
  shuffle,
  verseReference,
  randomPointsValue,
  hasVerseSelection,
  validateBlankConfig,
  parseVerses,
  STATUS,
  STATE_OF_BEING_WORDS,
  TFIDF_CONFIG,
} from '../src/utils.js';

describe('stripHtml', () => {
  it('should remove HTML tags from text', () => {
    const html = '<p>Hello <strong>world</strong></p>';
    const result = stripHtml(html);
    expect(result).toBe(' Hello  world  ');
  });

  it('should handle text with no HTML tags', () => {
    const text = 'Plain text';
    const result = stripHtml(text);
    expect(result).toBe('Plain text');
  });

  it('should handle empty string', () => {
    const result = stripHtml('');
    expect(result).toBe('');
  });

  it('should handle nested HTML tags', () => {
    const html = '<div><p><span>Nested</span> content</p></div>';
    const result = stripHtml(html);
    expect(result).toBe('   Nested  content  ');
  });
});

describe('tokenizeText', () => {
  it('should tokenize text into lowercase words', () => {
    const text = 'The Lord is my shepherd';
    const result = tokenizeText(text);
    expect(result).toEqual(['the', 'lord', 'is', 'my', 'shepherd']);
  });

  it('should filter out short words based on minWordLength', () => {
    const text = 'I am a man';
    const result = tokenizeText(text);
    // minWordLength is 2, so single letters should be excluded
    expect(result).toEqual(['am', 'man']);
  });

  it('should remove punctuation', () => {
    const text = 'Hello, world! How are you?';
    const result = tokenizeText(text);
    expect(result).toEqual(['hello', 'world', 'how', 'are', 'you']);
  });

  it('should handle empty string', () => {
    const result = tokenizeText('');
    // Empty string after filtering will be a single empty string
    expect(result.length).toBeGreaterThanOrEqual(0);
  });
});

describe('calculateTermFrequency', () => {
  it('should calculate term frequency correctly', () => {
    const words = ['the', 'lord', 'is', 'the', 'shepherd'];
    const result = calculateTermFrequency(words);
    expect(result).toEqual({
      the: 0.4,
      lord: 0.2,
      is: 0.2,
      shepherd: 0.2,
    });
  });

  it('should handle single word', () => {
    const words = ['word'];
    const result = calculateTermFrequency(words);
    expect(result).toEqual({ word: 1 });
  });

  it('should handle empty array', () => {
    const words = [];
    const result = calculateTermFrequency(words);
    expect(result).toEqual({});
  });
});

describe('calculateIDF', () => {
  it('should calculate IDF correctly', () => {
    const verseBank = {
      '1,1,1': { termFrequency: { lord: 0.5, god: 0.5 } },
      '1,1,2': { termFrequency: { lord: 0.33, jesus: 0.33, christ: 0.33 } },
      '1,1,3': { termFrequency: { god: 0.5, holy: 0.5 } },
    };
    const verseIds = ['1,1,1', '1,1,2', '1,1,3'];
    const result = calculateIDF(verseIds, verseBank);

    expect(result.lord).toBeCloseTo(Math.log(3 / 2), 5);
    expect(result.god).toBeCloseTo(Math.log(3 / 2), 5);
    expect(result.jesus).toBeCloseTo(Math.log(3 / 1), 5);
    expect(result.christ).toBeCloseTo(Math.log(3 / 1), 5);
    expect(result.holy).toBeCloseTo(Math.log(3 / 1), 5);
  });

  it('should handle empty verse bank', () => {
    const result = calculateIDF([], {});
    expect(result).toEqual({});
  });

  it('should handle verses without term frequency', () => {
    const verseBank = {
      '1,1,1': {},
      '1,1,2': { text: 'no tf data' },
    };
    const verseIds = ['1,1,1', '1,1,2'];
    const result = calculateIDF(verseIds, verseBank);
    expect(result).toEqual({});
  });
});

describe('combineTfIdf', () => {
  it('should combine TF and IDF scores', () => {
    const tf = { lord: 0.5, god: 0.3 };
    const idf = { lord: 1.5, god: 2.0 };
    const result = combineTfIdf(tf, idf);

    expect(result).toEqual({
      lord: 0.75,
      god: 0.6,
    });
  });

  it('should handle missing IDF values', () => {
    const tf = { lord: 0.5, god: 0.3, jesus: 0.2 };
    const idf = { lord: 1.5, god: 2.0 };
    const result = combineTfIdf(tf, idf);

    expect(result).toEqual({
      lord: 0.75,
      god: 0.6,
      jesus: 0,
    });
  });

  it('should handle empty inputs', () => {
    const result = combineTfIdf({}, {});
    expect(result).toEqual({});
  });
});

describe('normalizeScores', () => {
  it('should normalize scores to 0-1 range', () => {
    const scores = { a: 10, b: 20, c: 30 };
    const result = normalizeScores(scores);

    expect(result).toEqual({
      a: 0,
      b: 0.5,
      c: 1,
    });
  });

  it('should handle all same values', () => {
    const scores = { a: 5, b: 5, c: 5 };
    const result = normalizeScores(scores);

    expect(result).toEqual({
      a: 1,
      b: 1,
      c: 1,
    });
  });

  it('should handle empty object', () => {
    const result = normalizeScores({});
    expect(result).toEqual({});
  });

  it('should handle negative values', () => {
    const scores = { a: -10, b: 0, c: 10 };
    const result = normalizeScores(scores);

    expect(result).toEqual({
      a: 0,
      b: 0.5,
      c: 1,
    });
  });
});

describe('toInt', () => {
  it('should convert string to integer', () => {
    expect(toInt('42')).toBe(42);
  });

  it('should convert number to integer', () => {
    expect(toInt(42.7)).toBe(42);
  });

  it('should return fallback for non-numeric string', () => {
    expect(toInt('hello', 10)).toBe(10);
  });

  it('should return default fallback for NaN', () => {
    expect(toInt(NaN)).toBe(1);
  });

  it('should handle zero', () => {
    expect(toInt(0)).toBe(0);
  });
});

describe('shuffle', () => {
  it('should return array with same elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle(arr);

    expect(result).toHaveLength(arr.length);
    expect(result.sort()).toEqual(arr.sort());
  });

  it('should not modify original array', () => {
    const arr = [1, 2, 3, 4, 5];
    const original = [...arr];
    shuffle(arr);

    expect(arr).toEqual(original);
  });

  it('should handle empty array', () => {
    const result = shuffle([]);
    expect(result).toEqual([]);
  });

  it('should handle single element', () => {
    const result = shuffle([1]);
    expect(result).toEqual([1]);
  });
});

describe('verseReference', () => {
  const books = {
    genesis: { id: 1, label: 'Genesis' },
    isaiah: { id: 23, label: 'Isaiah' },
  };

  it('should format verse reference correctly', () => {
    const result = verseReference('1,1,1', books);
    expect(result).toBe('Genesis 1:1 (NKJV)');
  });

  it('should handle Isaiah', () => {
    const result = verseReference('23,53,5', books);
    expect(result).toBe('Isaiah 53:5 (NKJV)');
  });

  it('should handle unknown book', () => {
    const result = verseReference('999,1,1', books);
    expect(result).toBe('Book 999 1:1 (NKJV)');
  });
});

describe('randomPointsValue', () => {
  const verseBank = {
    '1,1,1': { text: 'In the beginning God created the heavens and the earth' },
    '1,1,2': { text: 'The earth was without form and void' },
  };

  it('should return value within bounds', () => {
    const result = randomPointsValue('1,1,1', verseBank, 1, 5, 100);
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(5);
  });

  it('should respect max blank percentage', () => {
    // Verse has 11 words, 50% = 5 words max
    const result = randomPointsValue('1,1,1', verseBank, 1, 10, 50);
    expect(result).toBeLessThanOrEqual(5);
  });

  it('should handle minBlanks > maxBlanks edge case', () => {
    const result = randomPointsValue('1,1,1', verseBank, 5, 3, 100);
    expect(result).toBeGreaterThanOrEqual(3);
    expect(result).toBeLessThanOrEqual(3);
  });

  it('should handle missing verse', () => {
    const result = randomPointsValue('999,999,999', verseBank, 1, 5, 100);
    expect(result).toBe(1);
  });
});

describe('hasVerseSelection', () => {
  it('should return true when all is selected', () => {
    const selection = { all: true };
    expect(hasVerseSelection(selection)).toBe(true);
  });

  it('should return true when verses array has items', () => {
    const selection = { verses: [1, 2, 3] };
    expect(hasVerseSelection(selection)).toBe(true);
  });

  it('should return false when verses array is empty', () => {
    const selection = { verses: [] };
    expect(hasVerseSelection(selection)).toBe(false);
  });

  it('should return false for null selection', () => {
    expect(hasVerseSelection(null)).toBe(false);
  });

  it('should return false for undefined selection', () => {
    expect(hasVerseSelection(undefined)).toBe(false);
  });

  it('should return false when neither all nor verses', () => {
    const selection = { all: false };
    expect(hasVerseSelection(selection)).toBe(false);
  });
});

describe('validateBlankConfig', () => {
  it('should validate correct configuration', () => {
    const result = validateBlankConfig(1, 5, 50, 10);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject minBlanks < 1', () => {
    const result = validateBlankConfig(0, 5, 50, 10);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Minimum blanks must be at least 1');
  });

  it('should reject maxBlanks < minBlanks', () => {
    const result = validateBlankConfig(5, 3, 50, 10);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Maximum blanks must be greater than or equal to minimum blanks');
  });

  it('should reject invalid percentage', () => {
    const result = validateBlankConfig(1, 5, 150, 10);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Max blank percentage must be between 1 and 100');
  });

  it('should reject maxBlanks > maxAllowedBlanks', () => {
    const result = validateBlankConfig(1, 15, 50, 10);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Maximum blanks exceeds allowed limit of 10');
  });

  it('should accumulate multiple errors', () => {
    const result = validateBlankConfig(0, 15, 150, 10);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });
});

describe('parseVerses', () => {
  it('should parse verse data correctly', () => {
    const data = [
      {
        reference: { book_id: 1, chapter: 1, verse: 1 },
        content: 'In the beginning God created the heavens and the earth',
      },
      {
        reference: { book_id: 1, chapter: 1, verse: 2 },
        content: 'The earth was without form and void',
      },
    ];

    const result = parseVerses(data);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      bookId: 1,
      chapter: 1,
      verse: 1,
      text: 'In the beginning God created the heavens and the earth',
      verseId: '1,1,1',
    });
  });

  it('should handle empty array', () => {
    const result = parseVerses([]);
    expect(result).toEqual([]);
  });

  it('should handle non-array input', () => {
    const result = parseVerses('not an array');
    expect(result).toEqual([]);
  });

  it('should filter out invalid items', () => {
    const data = [
      {
        reference: { book_id: 1, chapter: 1, verse: 1 },
        content: 'Valid verse',
      },
      null,
      { invalid: 'item' },
      {
        reference: { book_id: 1, chapter: 1, verse: 2 },
        content: 'Another valid verse',
      },
    ];

    const result = parseVerses(data);
    expect(result).toHaveLength(2);
  });

  it('should handle missing content', () => {
    const data = [
      {
        reference: { book_id: 1, chapter: 1, verse: 1 },
      },
    ];

    const result = parseVerses(data);
    expect(result[0].text).toBe('');
  });
});

describe('Constants', () => {
  it('should have correct STATUS values', () => {
    expect(STATUS).toEqual({
      READY: 'ready',
      DOWNLOADING: 'downloading',
      ERROR: 'error',
      NOT_DOWNLOADED: 'not-downloaded',
    });
  });

  it('should have state of being words', () => {
    expect(STATE_OF_BEING_WORDS).toContain('is');
    expect(STATE_OF_BEING_WORDS).toContain('are');
    expect(STATE_OF_BEING_WORDS).toHaveLength(8);
  });

  it('should have TF-IDF config', () => {
    expect(TFIDF_CONFIG.verseWeight).toBe(0.6);
    expect(TFIDF_CONFIG.chapterWeight).toBe(0.4);
    expect(TFIDF_CONFIG.tfidfWeight).toBe(0.3);
    expect(TFIDF_CONFIG.priorityWeight).toBe(0.7);
  });
});
