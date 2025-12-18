import { describe, it, expect, beforeEach } from 'vitest';
import {
  saveChapter,
  saveVerses,
  getChapter,
  getAllChapters,
  getVersesByChapter,
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
 * Tests for ensuring downloaded chapters persist even when unselected
 *
 * Bug: Previously, when a chapter was unselected, its downloaded data would
 * be lost on reload because the app only loaded verses for active chapters.
 *
 * Fix: Now the app loads verses for ALL downloaded chapters, not just active ones.
 */
describe('Chapter Persistence When Unselected', () => {
  beforeEach(async () => {
    const databases = await indexedDB.databases();
    for (const db of databases) {
      indexedDB.deleteDatabase(db.name);
    }
  });

  it('should persist downloaded chapter data even when chapter is unselected', async () => {
    // Step 1: User downloads a chapter
    const chapterKey = '23,53'; // Isaiah 53
    const chapter = {
      chapterKey,
      bookId: 23,
      chapter: 53,
      status: 'ready',
      lastUpdated: new Date().toISOString(),
      verseCount: 3,
    };

    await saveChapter(chapter);

    const verses = [
      {
        verseId: '23,53,4',
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        verse: 4,
        text: 'Surely He has borne our griefs and carried our sorrows',
        source: 'NKJV',
      },
      {
        verseId: '23,53,5',
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        verse: 5,
        text: 'But He was wounded for our transgressions',
        source: 'NKJV',
      },
      {
        verseId: '23,53,6',
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        verse: 6,
        text: 'All we like sheep have gone astray',
        source: 'NKJV',
      },
    ];

    await saveVerses(verses);

    // Step 2: User selects the chapter
    await updateSelections({
      activeChapters: ['23,53'],
      verseSelections: { '23,53': { allSelected: true, selectedVerses: [] } },
    });

    // Verify chapter is selected and data exists
    let selections = await getSelections();
    expect(selections.activeChapters).toContain('23,53');

    let storedChapter = await getChapter('23,53');
    expect(storedChapter.status).toBe('ready');

    let storedVerses = await getVersesByChapter('23,53');
    expect(storedVerses).toHaveLength(3);

    // Step 3: User unselects the chapter (simulating handleChapterSelectionChange)
    await updateSelections({
      activeChapters: [], // Chapter removed from active list
      verseSelections: {}, // Verse selection removed
    });

    // Verify chapter is no longer in active selection
    selections = await getSelections();
    expect(selections.activeChapters).not.toContain('23,53');
    expect(selections.verseSelections['23,53']).toBeUndefined();

    // Step 4: Simulate app reload - verify chapter data is still in database
    // This is the key test: even though the chapter is not in activeChapters,
    // the downloaded data should still be available
    const allChapters = await getAllChapters();
    const persistedChapter = allChapters.find((ch) => ch.chapterKey === '23,53');

    expect(persistedChapter).toBeDefined();
    expect(persistedChapter.status).toBe('ready');
    expect(persistedChapter.verseCount).toBe(3);

    // Verify verses are still in database
    storedVerses = await getVersesByChapter('23,53');
    expect(storedVerses).toHaveLength(3);
    expect(storedVerses[0].text).toContain('griefs');
    expect(storedVerses[1].text).toContain('wounded');
    expect(storedVerses[2].text).toContain('sheep');

    // Step 5: User re-selects the chapter
    await updateSelections({
      activeChapters: ['23,53'],
      verseSelections: { '23,53': { allSelected: true, selectedVerses: [] } },
    });

    // Verify we can immediately access the data without re-downloading
    storedChapter = await getChapter('23,53');
    expect(storedChapter.status).toBe('ready');

    storedVerses = await getVersesByChapter('23,53');
    expect(storedVerses).toHaveLength(3);
  });

  it('should load verses for all downloaded chapters on app initialization', async () => {
    // Simulate multiple downloaded chapters
    const chapters = [
      {
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        status: 'ready',
        lastUpdated: new Date().toISOString(),
        verseCount: 2,
      },
      {
        chapterKey: '23,54',
        bookId: 23,
        chapter: 54,
        status: 'ready',
        lastUpdated: new Date().toISOString(),
        verseCount: 2,
      },
      {
        chapterKey: '1,1',
        bookId: 1,
        chapter: 1,
        status: 'ready',
        lastUpdated: new Date().toISOString(),
        verseCount: 2,
      },
    ];

    for (const chapter of chapters) {
      await saveChapter(chapter);
    }

    const allVerses = [
      {
        verseId: '23,53,1',
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        verse: 1,
        text: 'Isaiah 53:1 text',
        source: 'NKJV',
      },
      {
        verseId: '23,53,2',
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        verse: 2,
        text: 'Isaiah 53:2 text',
        source: 'NKJV',
      },
      {
        verseId: '23,54,1',
        chapterKey: '23,54',
        bookId: 23,
        chapter: 54,
        verse: 1,
        text: 'Isaiah 54:1 text',
        source: 'NKJV',
      },
      {
        verseId: '23,54,2',
        chapterKey: '23,54',
        bookId: 23,
        chapter: 54,
        verse: 2,
        text: 'Isaiah 54:2 text',
        source: 'NKJV',
      },
      {
        verseId: '1,1,1',
        chapterKey: '1,1',
        bookId: 1,
        chapter: 1,
        verse: 1,
        text: 'Genesis 1:1 text',
        source: 'NKJV',
      },
      {
        verseId: '1,1,2',
        chapterKey: '1,1',
        bookId: 1,
        chapter: 1,
        verse: 2,
        text: 'Genesis 1:2 text',
        source: 'NKJV',
      },
    ];

    await saveVerses(allVerses);

    // User has only selected one chapter
    await updateSelections({
      activeChapters: ['23,53'],
      verseSelections: { '23,53': { allSelected: true, selectedVerses: [] } },
    });

    // Simulate loadState behavior: load ALL downloaded chapters
    const downloadedChapters = await getAllChapters();
    const chapterKeys = downloadedChapters.map((ch) => ch.chapterKey);

    expect(chapterKeys).toContain('23,53');
    expect(chapterKeys).toContain('23,54');
    expect(chapterKeys).toContain('1,1');

    // Load verses for ALL downloaded chapters (not just active ones)
    const versesForAllChapters = await getVersesByChapters(chapterKeys);

    // Should get all 6 verses (2 per chapter × 3 chapters)
    expect(versesForAllChapters).toHaveLength(6);

    // Verify we have verses from all three chapters
    const chapter53Verses = versesForAllChapters.filter((v) => v.chapterKey === '23,53');
    const chapter54Verses = versesForAllChapters.filter((v) => v.chapterKey === '23,54');
    const chapter11Verses = versesForAllChapters.filter((v) => v.chapterKey === '1,1');

    expect(chapter53Verses).toHaveLength(2);
    expect(chapter54Verses).toHaveLength(2);
    expect(chapter11Verses).toHaveLength(2);
  });

  it('should maintain chapter status as ready when verses are loaded', async () => {
    // Download a chapter
    const chapterKey = '43,3'; // John 3
    await saveChapter({
      chapterKey,
      bookId: 43,
      chapter: 3,
      status: 'ready',
      lastUpdated: new Date().toISOString(),
      verseCount: 1,
    });

    await saveVerses([
      {
        verseId: '43,3,16',
        chapterKey: '43,3',
        bookId: 43,
        chapter: 3,
        verse: 16,
        text: 'For God so loved the world',
        source: 'NKJV',
      },
    ]);

    // Unselect the chapter
    await updateSelections({
      activeChapters: [],
      verseSelections: {},
    });

    // Simulate reload: get all chapters
    const allChapters = await getAllChapters();
    const chapterIndex = {};

    allChapters.forEach((chapter) => {
      chapterIndex[chapter.chapterKey] = {
        status: chapter.status,
        lastUpdated: chapter.lastUpdated,
        verseIds: [],
      };
    });

    // Load verses for all downloaded chapters
    const downloadedChapterKeys = Object.keys(chapterIndex);
    const verses = await getVersesByChapters(downloadedChapterKeys);

    verses.forEach((verse) => {
      if (chapterIndex[verse.chapterKey]) {
        chapterIndex[verse.chapterKey].verseIds.push(verse.verseId);
      }
    });

    // Verify the chapter has loaded verses and maintains ready status
    expect(chapterIndex['43,3']).toBeDefined();
    expect(chapterIndex['43,3'].status).toBe('ready');
    expect(chapterIndex['43,3'].verseIds).toHaveLength(1);
    expect(chapterIndex['43,3'].verseIds).toContain('43,3,16');

    // The bug would have caused the status to become 'not_downloaded' here
    // because verses wouldn't have been loaded for inactive chapters
  });
});
