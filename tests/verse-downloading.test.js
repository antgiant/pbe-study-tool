import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveChapter,
  saveVerse,
  saveVerses,
  getChapter,
  getAllChapters,
  getVersesByChapter,
  getVerse,
  updateSelections,
  getSelections,
} from '../src/database.js';

/**
 * Helper function to get verses for multiple chapters
 */
const getVersesByChapters = async (chapterKeys) => {
  const allVerses = [];
  for (const chapterKey of chapterKeys) {
    const verses = await getVersesByChapter(chapterKey);
    allVerses.push(...verses);
  }
  return allVerses;
};

/**
 * Tests for individual verse downloading functionality
 *
 * Feature: Verse selector mode should download only selected verses,
 * not the entire chapter, to save bandwidth and storage.
 *
 * Requirements:
 * 1. Individual verses can be downloaded and stored
 * 2. Verses persist across reloads
 * 3. Chapter downloading still works correctly
 * 4. Partially downloaded chapters are tracked properly
 */
describe('Verse Downloading', () => {
  beforeEach(async () => {
    const databases = await indexedDB.databases();
    for (const db of databases) {
      indexedDB.deleteDatabase(db.name);
    }
  });

  describe('Individual Verse Storage', () => {
    it('should store and retrieve individual verses', async () => {
      const verse = {
        verseId: '23,53,5',
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        verse: 5,
        text: 'But He was wounded for our transgressions',
        source: 'NKJV',
        termFrequency: {},
        wordList: [],
        downloadedAt: new Date().toISOString(),
      };

      await saveVerse(verse);

      const retrieved = await getVerse('23,53,5');
      expect(retrieved).toBeDefined();
      expect(retrieved.verseId).toBe('23,53,5');
      expect(retrieved.text).toBe('But He was wounded for our transgressions');
      expect(retrieved.bookId).toBe(23);
      expect(retrieved.chapter).toBe(53);
      expect(retrieved.verse).toBe(5);
    });

    it('should store multiple individual verses from same chapter', async () => {
      const verses = [
        {
          verseId: '23,53,4',
          chapterKey: '23,53',
          bookId: 23,
          chapter: 53,
          verse: 4,
          text: 'Surely He has borne our griefs',
          source: 'NKJV',
          termFrequency: {},
          wordList: [],
          downloadedAt: new Date().toISOString(),
        },
        {
          verseId: '23,53,5',
          chapterKey: '23,53',
          bookId: 23,
          chapter: 53,
          verse: 5,
          text: 'But He was wounded for our transgressions',
          source: 'NKJV',
          termFrequency: {},
          wordList: [],
          downloadedAt: new Date().toISOString(),
        },
        {
          verseId: '23,53,6',
          chapterKey: '23,53',
          bookId: 23,
          chapter: 53,
          verse: 6,
          text: 'All we like sheep have gone astray',
          source: 'NKJV',
          termFrequency: {},
          wordList: [],
          downloadedAt: new Date().toISOString(),
        },
      ];

      for (const verse of verses) {
        await saveVerse(verse);
      }

      const chapterVerses = await getVersesByChapter('23,53');
      expect(chapterVerses).toHaveLength(3);
      expect(chapterVerses[0].verse).toBe(4);
      expect(chapterVerses[1].verse).toBe(5);
      expect(chapterVerses[2].verse).toBe(6);
    });

    it('should store individual verses from different chapters', async () => {
      const verses = [
        {
          verseId: '23,53,5',
          chapterKey: '23,53',
          bookId: 23,
          chapter: 53,
          verse: 5,
          text: 'But He was wounded for our transgressions',
          source: 'NKJV',
          termFrequency: {},
          wordList: [],
          downloadedAt: new Date().toISOString(),
        },
        {
          verseId: '43,3,16',
          chapterKey: '43,3',
          bookId: 43,
          chapter: 3,
          verse: 16,
          text: 'For God so loved the world',
          source: 'NKJV',
          termFrequency: {},
          wordList: [],
          downloadedAt: new Date().toISOString(),
        },
      ];

      for (const verse of verses) {
        await saveVerse(verse);
      }

      const verse1 = await getVerse('23,53,5');
      const verse2 = await getVerse('43,3,16');

      expect(verse1).toBeDefined();
      expect(verse2).toBeDefined();
      expect(verse1.chapterKey).toBe('23,53');
      expect(verse2.chapterKey).toBe('43,3');
    });
  });

  describe('Verse Persistence Across Reloads', () => {
    it('should persist individual verses across reload simulation', async () => {
      // Simulate downloading individual verses
      const verses = [
        {
          verseId: '23,53,1',
          chapterKey: '23,53',
          bookId: 23,
          chapter: 53,
          verse: 1,
          text: 'Who has believed our report?',
          source: 'NKJV',
          termFrequency: {},
          wordList: [],
          downloadedAt: new Date().toISOString(),
        },
        {
          verseId: '23,53,12',
          chapterKey: '23,53',
          bookId: 23,
          chapter: 53,
          verse: 12,
          text: 'Therefore I will divide Him a portion with the great',
          source: 'NKJV',
          termFrequency: {},
          wordList: [],
          downloadedAt: new Date().toISOString(),
        },
      ];

      for (const verse of verses) {
        await saveVerse(verse);
      }

      // Save chapter metadata as partial
      await saveChapter({
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        status: 'partial',
        lastUpdated: new Date().toISOString(),
        verseCount: 2,
      });

      // Save selection
      await updateSelections({
        activeChapters: ['23,53'],
        verseSelections: {
          '23,53': { allSelected: false, selectedVerses: [1, 12] },
        },
      });

      // Simulate reload: load data back
      const selections = await getSelections();
      expect(selections.activeChapters).toContain('23,53');
      expect(selections.verseSelections['23,53'].selectedVerses).toEqual([1, 12]);

      const chapterVerses = await getVersesByChapter('23,53');
      expect(chapterVerses).toHaveLength(2);
      expect(chapterVerses.map((v) => v.verse)).toEqual([1, 12]);

      const chapter = await getChapter('23,53');
      expect(chapter.status).toBe('partial');
      expect(chapter.verseCount).toBe(2);
    });

    it('should maintain verse data when switching between verse and chapter selection', async () => {
      // Start with individual verse download
      await saveVerse({
        verseId: '23,53,5',
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        verse: 5,
        text: 'But He was wounded for our transgressions',
        source: 'NKJV',
        termFrequency: {},
        wordList: [],
        downloadedAt: new Date().toISOString(),
      });

      await saveChapter({
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        status: 'partial',
        lastUpdated: new Date().toISOString(),
        verseCount: 1,
      });

      // Verify verse exists
      let verse = await getVerse('23,53,5');
      expect(verse).toBeDefined();

      // Now download full chapter (simulating user selecting all)
      const fullChapterVerses = Array.from({ length: 12 }, (_, i) => ({
        verseId: `23,53,${i + 1}`,
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        verse: i + 1,
        text: `Isaiah 53:${i + 1} text`,
        source: 'NKJV',
        termFrequency: {},
        wordList: [],
        downloadedAt: new Date().toISOString(),
      }));

      await saveVerses(fullChapterVerses);

      await saveChapter({
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        status: 'ready',
        lastUpdated: new Date().toISOString(),
        verseCount: 12,
      });

      // Original verse should still exist and be part of full chapter
      verse = await getVerse('23,53,5');
      expect(verse).toBeDefined();

      const allVerses = await getVersesByChapter('23,53');
      expect(allVerses).toHaveLength(12);

      const chapter = await getChapter('23,53');
      expect(chapter.status).toBe('ready');
    });
  });

  describe('Chapter vs Verse Download Compatibility', () => {
    it('should handle full chapter download correctly', async () => {
      const verses = Array.from({ length: 5 }, (_, i) => ({
        verseId: `60,1,${i + 1}`,
        chapterKey: '60,1',
        bookId: 60,
        chapter: 1,
        verse: i + 1,
        text: `1 Peter 1:${i + 1} text`,
        source: 'NKJV',
        termFrequency: {},
        wordList: [],
        downloadedAt: new Date().toISOString(),
      }));

      await saveVerses(verses);

      await saveChapter({
        chapterKey: '60,1',
        bookId: 60,
        chapter: 1,
        status: 'ready',
        lastUpdated: new Date().toISOString(),
        verseCount: 5,
      });

      await updateSelections({
        activeChapters: ['60,1'],
        verseSelections: { '60,1': { allSelected: true, selectedVerses: [] } },
      });

      const chapter = await getChapter('60,1');
      expect(chapter.status).toBe('ready');
      expect(chapter.verseCount).toBe(5);

      const chapterVerses = await getVersesByChapter('60,1');
      expect(chapterVerses).toHaveLength(5);
    });

    it('should differentiate between full chapter and partial chapter status', async () => {
      // Full chapter
      await saveChapter({
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        status: 'ready',
        lastUpdated: new Date().toISOString(),
        verseCount: 12,
      });

      // Partial chapter
      await saveChapter({
        chapterKey: '23,54',
        bookId: 23,
        chapter: 54,
        status: 'partial',
        lastUpdated: new Date().toISOString(),
        verseCount: 3,
      });

      const fullChapter = await getChapter('23,53');
      const partialChapter = await getChapter('23,54');

      expect(fullChapter.status).toBe('ready');
      expect(partialChapter.status).toBe('partial');
    });

    it('should allow mixed chapter and verse downloads in same session', async () => {
      // Download full chapter for one book
      const isaiah53Verses = Array.from({ length: 12 }, (_, i) => ({
        verseId: `23,53,${i + 1}`,
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        verse: i + 1,
        text: `Isaiah 53:${i + 1}`,
        source: 'NKJV',
        termFrequency: {},
        wordList: [],
        downloadedAt: new Date().toISOString(),
      }));

      await saveVerses(isaiah53Verses);
      await saveChapter({
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        status: 'ready',
        lastUpdated: new Date().toISOString(),
        verseCount: 12,
      });

      // Download individual verses for another book
      await saveVerse({
        verseId: '43,3,16',
        chapterKey: '43,3',
        bookId: 43,
        chapter: 3,
        verse: 16,
        text: 'For God so loved the world',
        source: 'NKJV',
        termFrequency: {},
        wordList: [],
        downloadedAt: new Date().toISOString(),
      });

      await saveChapter({
        chapterKey: '43,3',
        bookId: 43,
        chapter: 3,
        status: 'partial',
        lastUpdated: new Date().toISOString(),
        verseCount: 1,
      });

      await updateSelections({
        activeChapters: ['23,53', '43,3'],
        verseSelections: {
          '23,53': { allSelected: true, selectedVerses: [] },
          '43,3': { allSelected: false, selectedVerses: [16] },
        },
      });

      const allChapters = await getAllChapters();
      expect(allChapters).toHaveLength(2);

      const isaiah = await getChapter('23,53');
      const john = await getChapter('43,3');

      expect(isaiah.status).toBe('ready');
      expect(john.status).toBe('partial');

      const isaiahVerses = await getVersesByChapter('23,53');
      const johnVerses = await getVersesByChapter('43,3');

      expect(isaiahVerses).toHaveLength(12);
      expect(johnVerses).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle downloading same verse multiple times', async () => {
      const verse = {
        verseId: '23,53,5',
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        verse: 5,
        text: 'But He was wounded for our transgressions',
        source: 'NKJV',
        termFrequency: {},
        wordList: [],
        downloadedAt: new Date().toISOString(),
      };

      await saveVerse(verse);
      await saveVerse(verse); // Save again

      const verses = await getVersesByChapter('23,53');
      expect(verses).toHaveLength(1); // Should not duplicate
    });

    it('should handle empty verse selection gracefully', async () => {
      await updateSelections({
        activeChapters: ['23,53'],
        verseSelections: {
          '23,53': { allSelected: false, selectedVerses: [] },
        },
      });

      const selections = await getSelections();
      expect(selections.verseSelections['23,53'].selectedVerses).toEqual([]);
    });

    it('should maintain verse order when downloading out of sequence', async () => {
      // Download verses out of order
      const verses = [
        {
          verseId: '23,53,10',
          chapterKey: '23,53',
          bookId: 23,
          chapter: 53,
          verse: 10,
          text: 'Verse 10',
          source: 'NKJV',
          termFrequency: {},
          wordList: [],
          downloadedAt: new Date().toISOString(),
        },
        {
          verseId: '23,53,2',
          chapterKey: '23,53',
          bookId: 23,
          chapter: 53,
          verse: 2,
          text: 'Verse 2',
          source: 'NKJV',
          termFrequency: {},
          wordList: [],
          downloadedAt: new Date().toISOString(),
        },
        {
          verseId: '23,53,5',
          chapterKey: '23,53',
          bookId: 23,
          chapter: 53,
          verse: 5,
          text: 'Verse 5',
          source: 'NKJV',
          termFrequency: {},
          wordList: [],
          downloadedAt: new Date().toISOString(),
        },
      ];

      for (const verse of verses) {
        await saveVerse(verse);
      }

      const retrieved = await getVersesByChapter('23,53');
      // Verses should be retrieved in numerical order by verse number
      expect(retrieved.map((v) => v.verse)).toEqual([2, 5, 10]);
    });
  });
});
