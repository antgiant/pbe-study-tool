import { describe, it, expect, beforeEach } from 'vitest';
import {
  openDatabase,
  saveChapter,
  saveVerses,
  getChapter,
  getVersesByChapter,
  updateSettings,
  updateSelections,
  getSettings,
  getSelections,
  saveVerse,
  getVerse,
} from '../src/database.js';
import {
  calculateTermFrequency,
  calculateIDF,
  combineTfIdf,
  tokenizeText,
  stripHtml,
  verseReference,
  hasVerseSelection,
} from '../src/utils.js';

/**
 * Integration tests that verify multiple components working together
 */
describe('Integration Tests', () => {
  beforeEach(async () => {
    const databases = await indexedDB.databases();
    for (const db of databases) {
      indexedDB.deleteDatabase(db.name);
    }
  });

  describe('Complete Workflow: Settings + Selections + Data', () => {
    it('should handle a complete user session workflow', async () => {
      // 1. User sets up their preferences
      const settings = {
        version: 1,
        year: '2024-2025',
        activeSelector: 'chapter',
        minBlanks: 1,
        maxBlanks: 3,
        maxBlankPercentage: 50,
        lastUpdated: new Date().toISOString(),
      };

      await updateSettings(settings);

      // 2. User selects chapters to study
      const selections = {
        activeChapters: ['23,53'],
        verseSelections: {},
      };

      await updateSelections(selections);

      // 3. System downloads chapter data
      const chapter = {
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        status: 'ready',
        lastUpdated: new Date().toISOString(),
        verseCount: 3,
      };

      await saveChapter(chapter);

      // 4. System downloads verses
      const verses = [
        {
          verseId: '23,53,4',
          chapterKey: '23,53',
          bookId: 23,
          chapter: 53,
          verse: 4,
          text: 'Surely He has borne our griefs and carried our sorrows',
          source: 'api',
        },
        {
          verseId: '23,53,5',
          chapterKey: '23,53',
          bookId: 23,
          chapter: 53,
          verse: 5,
          text: 'But He was wounded for our transgressions',
          source: 'api',
        },
        {
          verseId: '23,53,6',
          chapterKey: '23,53',
          bookId: 23,
          chapter: 53,
          verse: 6,
          text: 'All we like sheep have gone astray',
          source: 'api',
        },
      ];

      await saveVerses(verses);

      // 5. Verify everything was stored correctly
      const storedSettings = await getSettings();
      const storedSelections = await getSelections();
      const storedChapter = await getChapter('23,53');
      const storedVerses = await getVersesByChapter('23,53');

      expect(storedSettings.year).toBe('2024-2025');
      expect(storedSelections.activeChapters).toContain('23,53');
      expect(storedChapter.status).toBe('ready');
      expect(storedVerses).toHaveLength(3);

      // 6. Verify we can access individual verses
      const verse5 = storedVerses.find((v) => v.verse === 5);
      expect(verse5.text).toContain('wounded');
    });
  });

  describe('TF-IDF Pipeline', () => {
    it('should calculate TF-IDF scores for a set of verses', async () => {
      // Setup verses with known content
      const verses = [
        {
          verseId: '23,53,4',
          text: 'The Lord is good and the Lord is great',
        },
        {
          verseId: '23,53,5',
          text: 'The Lord has risen from the dead',
        },
        {
          verseId: '23,53,6',
          text: 'Jesus Christ is Lord of all',
        },
      ];

      // Calculate term frequencies for each verse
      const verseBank = {};
      verses.forEach((verse) => {
        const words = tokenizeText(stripHtml(verse.text));
        const tf = calculateTermFrequency(words);
        verseBank[verse.verseId] = {
          ...verse,
          termFrequency: tf,
          wordList: words,
        };
      });

      // Calculate IDF across all verses
      const verseIds = verses.map((v) => v.verseId);
      const idf = calculateIDF(verseIds, verseBank);

      // Verify IDF values
      // 'lord' appears in all 3 verses
      expect(idf.lord).toBeCloseTo(Math.log(3 / 3), 5);

      // 'jesus' appears in only 1 verse
      expect(idf.jesus).toBeCloseTo(Math.log(3 / 1), 5);

      // Calculate TF-IDF for first verse
      const tf = verseBank['23,53,4'].termFrequency;
      const tfidf = combineTfIdf(tf, idf);

      // Verify TF-IDF structure
      expect(tfidf).toHaveProperty('lord');
      expect(tfidf).toHaveProperty('good');
      expect(tfidf).toHaveProperty('great');

      // Words that appear in all documents should have lower TF-IDF
      // Words unique to this document should have higher TF-IDF
      expect(tfidf.good).toBeGreaterThan(tfidf.lord);
    });
  });

  describe('Verse Selection Logic', () => {
    it('should correctly identify valid verse selections', () => {
      const validSelections = [
        { all: true },
        { verses: [1, 2, 3] },
        { all: false, verses: [5] },
      ];

      const invalidSelections = [
        { all: false },
        { verses: [] },
        { all: false, verses: [] },
        null,
        undefined,
        {},
      ];

      validSelections.forEach((sel) => {
        expect(hasVerseSelection(sel)).toBe(true);
      });

      invalidSelections.forEach((sel) => {
        expect(hasVerseSelection(sel)).toBe(false);
      });
    });

    it('should handle verse selection persistence', async () => {
      const selections = {
        activeChapters: ['23,53', '23,54'],
        verseSelections: {
          '23,53': { all: true },
          '23,54': { verses: [1, 2, 3, 4, 5] },
        },
      };

      await updateSelections(selections);
      const retrieved = await getSelections();

      expect(hasVerseSelection(retrieved.verseSelections['23,53'])).toBe(true);
      expect(hasVerseSelection(retrieved.verseSelections['23,54'])).toBe(true);
      expect(retrieved.verseSelections['23,54'].verses).toHaveLength(5);
    });
  });

  describe('Chapter and Verse Relationship', () => {
    it('should maintain referential integrity between chapters and verses', async () => {
      // Save a chapter
      const chapter = {
        chapterKey: '1,1',
        bookId: 1,
        chapter: 1,
        status: 'ready',
        lastUpdated: new Date().toISOString(),
        verseCount: 31,
      };

      await saveChapter(chapter);

      // Save verses for that chapter
      const verses = Array.from({ length: 31 }, (_, i) => ({
        verseId: `1,1,${i + 1}`,
        chapterKey: '1,1',
        bookId: 1,
        chapter: 1,
        verse: i + 1,
        text: `Genesis 1:${i + 1} text`,
        source: 'api',
      }));

      await saveVerses(verses);

      // Verify relationships
      const storedChapter = await getChapter('1,1');
      const storedVerses = await getVersesByChapter('1,1');

      expect(storedChapter.verseCount).toBe(31);
      expect(storedVerses).toHaveLength(31);
      expect(storedVerses.every((v) => v.chapterKey === '1,1')).toBe(true);
      expect(storedVerses.every((v) => v.bookId === 1)).toBe(true);
      expect(storedVerses.every((v) => v.chapter === 1)).toBe(true);
    });
  });

  describe('Verse Reference Formatting', () => {
    it('should format verse references correctly in context', () => {
      const books = {
        genesis: { id: 1, label: 'Genesis' },
        isaiah: { id: 23, label: 'Isaiah' },
        john: { id: 43, label: 'John' },
      };

      const testCases = [
        { verseId: '1,1,1', expected: 'Genesis 1:1 (NKJV)' },
        { verseId: '23,53,5', expected: 'Isaiah 53:5 (NKJV)' },
        { verseId: '43,3,16', expected: 'John 3:16 (NKJV)' },
      ];

      testCases.forEach(({ verseId, expected }) => {
        expect(verseReference(verseId, books)).toBe(expected);
      });
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data consistency across multiple operations', async () => {
      // Initial setup
      const settings1 = { year: '2024', minBlanks: 1 };
      const selections1 = { activeChapters: ['23,53'] };

      await updateSettings(settings1);
      await updateSelections(selections1);

      // Update settings
      const settings2 = { year: '2025', minBlanks: 2 };
      await updateSettings(settings2);

      // Add more selections
      const selections2 = { activeChapters: ['23,53', '23,54'] };
      await updateSelections(selections2);

      // Verify final state
      const finalSettings = await getSettings();
      const finalSelections = await getSelections();

      expect(finalSettings.year).toBe('2025');
      expect(finalSettings.minBlanks).toBe(2);
      expect(finalSelections.activeChapters).toHaveLength(2);
    });
  });

  describe('Edge Cases and Error Scenarios', () => {
    it('should handle querying non-existent data gracefully', async () => {
      const chapter = await getChapter('999,999');
      const verses = await getVersesByChapter('999,999');
      const settings = await getSettings();
      const selections = await getSelections();

      expect(chapter).toBeNull();
      expect(verses).toEqual([]);
      expect(settings).toBeNull();
      expect(selections).toBeNull();
    });

    it('should handle empty verse text', async () => {
      const verse = {
        verseId: '1,1,1',
        chapterKey: '1,1',
        bookId: 1,
        chapter: 1,
        verse: 1,
        text: '',
        source: 'api',
      };

      await saveVerse(verse);
      const retrieved = await getVerse('1,1,1');

      expect(retrieved.text).toBe('');

      const words = tokenizeText(stripHtml(retrieved.text));
      const tf = calculateTermFrequency(words);

      // Should handle empty text gracefully - tokenizeText filters by minWordLength
      expect(words).toEqual([]);
      expect(Object.keys(tf)).toHaveLength(0);
    });

    it('should handle HTML in verse text', async () => {
      const verse = {
        verseId: '1,1,1',
        chapterKey: '1,1',
        bookId: 1,
        chapter: 1,
        verse: 1,
        text: '<p>In the <strong>beginning</strong> God created</p>',
        source: 'api',
      };

      await saveVerse(verse);
      const retrieved = await getVerse('1,1,1');

      const plainText = stripHtml(retrieved.text);
      expect(plainText).not.toContain('<p>');
      expect(plainText).not.toContain('<strong>');
      expect(plainText).toContain('beginning');
      expect(plainText).toContain('created');
    });
  });

  describe('Bulk Operations Performance', () => {
    it('should handle saving many verses efficiently', async () => {
      const verseCount = 100;
      const verses = Array.from({ length: verseCount }, (_, i) => ({
        verseId: `1,${Math.floor(i / 31) + 1},${(i % 31) + 1}`,
        chapterKey: `1,${Math.floor(i / 31) + 1}`,
        bookId: 1,
        chapter: Math.floor(i / 31) + 1,
        verse: (i % 31) + 1,
        text: `Sample text for verse ${i + 1}`,
        source: 'api',
      }));

      const startTime = Date.now();
      await saveVerses(verses);
      const endTime = Date.now();

      // Should complete in reasonable time (< 1 second for 100 verses)
      expect(endTime - startTime).toBeLessThan(1000);

      // Verify all verses were saved
      const chapter1Verses = await getVersesByChapter('1,1');
      expect(chapter1Verses.length).toBeGreaterThan(0);
    });
  });
});
