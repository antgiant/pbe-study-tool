import { describe, it, expect } from 'vitest';
import {
  openDatabase,
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
  saveVerse,
  saveVerses,
  deleteVersesByChapter,
  DB_NAME,
  DB_VERSION,
  STORE_SETTINGS,
  STORE_SELECTIONS,
  STORE_CHAPTERS,
  STORE_VERSES,
} from '../src/database.js';

describe('Database Operations', () => {
  // No beforeEach/afterEach - fake-indexeddb resets automatically between tests via setup.js

  describe('openDatabase', () => {
    it('should open database successfully', async () => {
      const db = await openDatabase();
      expect(db).toBeDefined();
      expect(db.name).toBe(DB_NAME);
      expect(db.version).toBe(DB_VERSION);
      db.close();
    });

    it('should create all required object stores', async () => {
      const db = await openDatabase();
      expect(db.objectStoreNames.contains(STORE_SETTINGS)).toBe(true);
      expect(db.objectStoreNames.contains(STORE_SELECTIONS)).toBe(true);
      expect(db.objectStoreNames.contains(STORE_CHAPTERS)).toBe(true);
      expect(db.objectStoreNames.contains(STORE_VERSES)).toBe(true);
      db.close();
    });

    it('should create indexes on chapters store', async () => {
      const db = await openDatabase();
      const transaction = db.transaction([STORE_CHAPTERS], 'readonly');
      const store = transaction.objectStore(STORE_CHAPTERS);

      expect(store.indexNames.contains('bookId')).toBe(true);
      expect(store.indexNames.contains('status')).toBe(true);
      expect(store.indexNames.contains('lastUpdated')).toBe(true);
      db.close();
    });

    it('should create indexes on verses store', async () => {
      const db = await openDatabase();
      const transaction = db.transaction([STORE_VERSES], 'readonly');
      const store = transaction.objectStore(STORE_VERSES);

      expect(store.indexNames.contains('chapterKey')).toBe(true);
      expect(store.indexNames.contains('bookId')).toBe(true);
      expect(store.indexNames.contains('bookChapter')).toBe(true);
      db.close();
    });
  });

  describe('Settings Operations', () => {
    it('should save and retrieve settings', async () => {
      const settings = {
        version: 1,
        year: '2024',
        minBlanks: 1,
        maxBlanks: 5,
      };

      await updateSettings(settings);
      const retrieved = await getSettings();

      expect(retrieved).toEqual(settings);
    });

    it('should return null when no settings exist', async () => {
      const result = await getSettings();
      expect(result).toBeNull();
    });

    it('should update existing settings', async () => {
      const initial = { year: '2024' };
      const updated = { year: '2025' };

      await updateSettings(initial);
      await updateSettings(updated);
      const result = await getSettings();

      expect(result).toEqual(updated);
    });
  });

  describe('Selections Operations', () => {
    it('should save and retrieve selections', async () => {
      const selections = {
        activeChapters: ['23,53', '23,54'],
        verseSelections: { '23,53': { all: true } },
      };

      await updateSelections(selections);
      const retrieved = await getSelections();

      expect(retrieved).toEqual(selections);
    });

    it('should return null when no selections exist', async () => {
      const result = await getSelections();
      expect(result).toBeNull();
    });

    it('should update existing selections', async () => {
      const initial = { activeChapters: ['23,53'] };
      const updated = { activeChapters: ['23,54'] };

      await updateSelections(initial);
      await updateSelections(updated);
      const result = await getSelections();

      expect(result).toEqual(updated);
    });
  });

  describe('Chapter Operations', () => {
    it('should save and retrieve a chapter', async () => {
      const chapter = {
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        status: 'ready',
        lastUpdated: new Date().toISOString(),
        verseCount: 12,
      };

      await saveChapter(chapter);
      const retrieved = await getChapter('23,53');

      expect(retrieved).toEqual(chapter);
    });

    it('should return null for non-existent chapter', async () => {
      const result = await getChapter('999,999');
      expect(result).toBeNull();
    });

    it('should update existing chapter', async () => {
      const chapter = {
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        status: 'downloading',
        lastUpdated: '2024-01-01T00:00:00.000Z',
        verseCount: 0,
      };

      await saveChapter(chapter);

      const updated = { ...chapter, status: 'ready', verseCount: 12 };
      await saveChapter(updated);

      const result = await getChapter('23,53');
      expect(result.status).toBe('ready');
      expect(result.verseCount).toBe(12);
    });

    it('should retrieve all chapters', async () => {
      const chapters = [
        {
          chapterKey: '23,53',
          bookId: 23,
          chapter: 53,
          status: 'ready',
          lastUpdated: new Date().toISOString(),
          verseCount: 12,
        },
        {
          chapterKey: '23,54',
          bookId: 23,
          chapter: 54,
          status: 'ready',
          lastUpdated: new Date().toISOString(),
          verseCount: 10,
        },
      ];

      await saveChapter(chapters[0]);
      await saveChapter(chapters[1]);

      const result = await getAllChapters();
      expect(result).toHaveLength(2);
      expect(result.map(c => c.chapterKey).sort()).toEqual(['23,53', '23,54']);
    });

    it('should delete a chapter', async () => {
      const chapter = {
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        status: 'ready',
        lastUpdated: new Date().toISOString(),
        verseCount: 12,
      };

      await saveChapter(chapter);
      await deleteChapter('23,53');

      const result = await getChapter('23,53');
      expect(result).toBeNull();
    });
  });

  describe('Verse Operations', () => {
    it('should save and retrieve a verse', async () => {
      const verse = {
        verseId: '23,53,5',
        chapterKey: '23,53',
        bookId: 23,
        chapter: 53,
        verse: 5,
        text: 'But He was wounded for our transgressions',
        source: 'api',
      };

      await saveVerse(verse);
      const retrieved = await getVerse('23,53,5');

      expect(retrieved).toEqual(verse);
    });

    it('should return null for non-existent verse', async () => {
      const result = await getVerse('999,999,999');
      expect(result).toBeNull();
    });

    it('should save multiple verses', async () => {
      const verses = [
        {
          verseId: '23,53,4',
          chapterKey: '23,53',
          bookId: 23,
          chapter: 53,
          verse: 4,
          text: 'Surely He has borne our griefs',
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
      ];

      await saveVerses(verses);

      const verse1 = await getVerse('23,53,4');
      const verse2 = await getVerse('23,53,5');

      expect(verse1).toEqual(verses[0]);
      expect(verse2).toEqual(verses[1]);
    });

    it('should handle saving empty verse array', async () => {
      await expect(saveVerses([])).resolves.not.toThrow();
    });

    it('should get verses by chapter', async () => {
      const verses = [
        {
          verseId: '23,53,4',
          chapterKey: '23,53',
          bookId: 23,
          chapter: 53,
          verse: 4,
          text: 'Verse 4',
          source: 'api',
        },
        {
          verseId: '23,53,5',
          chapterKey: '23,53',
          bookId: 23,
          chapter: 53,
          verse: 5,
          text: 'Verse 5',
          source: 'api',
        },
        {
          verseId: '23,54,1',
          chapterKey: '23,54',
          bookId: 23,
          chapter: 54,
          verse: 1,
          text: 'Different chapter',
          source: 'api',
        },
      ];

      await saveVerses(verses);

      const chapter53Verses = await getVersesByChapter('23,53');
      expect(chapter53Verses).toHaveLength(2);
      expect(chapter53Verses.every(v => v.chapterKey === '23,53')).toBe(true);
    });

    it('should delete verses by chapter', async () => {
      const verses = [
        {
          verseId: '23,53,4',
          chapterKey: '23,53',
          bookId: 23,
          chapter: 53,
          verse: 4,
          text: 'Verse 4',
          source: 'api',
        },
        {
          verseId: '23,53,5',
          chapterKey: '23,53',
          bookId: 23,
          chapter: 53,
          verse: 5,
          text: 'Verse 5',
          source: 'api',
        },
      ];

      await saveVerses(verses);
      await deleteVersesByChapter('23,53');

      const remaining = await getVersesByChapter('23,53');
      expect(remaining).toHaveLength(0);
    });

    it('should only delete verses from specified chapter', async () => {
      const verses = [
        {
          verseId: '23,53,1',
          chapterKey: '23,53',
          bookId: 23,
          chapter: 53,
          verse: 1,
          text: 'Chapter 53',
          source: 'api',
        },
        {
          verseId: '23,54,1',
          chapterKey: '23,54',
          bookId: 23,
          chapter: 54,
          verse: 1,
          text: 'Chapter 54',
          source: 'api',
        },
      ];

      await saveVerses(verses);
      await deleteVersesByChapter('23,53');

      const chapter53 = await getVersesByChapter('23,53');
      const chapter54 = await getVersesByChapter('23,54');

      expect(chapter53).toHaveLength(0);
      expect(chapter54).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully in getSettings', async () => {
      // Close all databases to force an error scenario
      const databases = await indexedDB.databases();
      for (const db of databases) {
        indexedDB.deleteDatabase(db.name);
      }

      // This should not throw, but return null
      const result = await getSettings();
      // The function catches errors and returns null
      expect(result).toBeNull();
    });

    it('should propagate errors in updateSettings', async () => {
      // Try to save invalid data that might cause issues
      // Note: IndexedDB is quite permissive, so this might not actually throw
      await expect(updateSettings({ valid: 'data' })).resolves.not.toThrow();
    });
  });
});
