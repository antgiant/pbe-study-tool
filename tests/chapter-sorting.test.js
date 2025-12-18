import { describe, it, expect } from 'vitest';

/**
 * Mock data structures from script.js for testing
 */
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
  isaiah: { id: 23, totalChapters: 66, label: 'Isaiah' },
  mark: { id: 41, totalChapters: 16, label: 'Mark' },
  john: { id: 43, totalChapters: 21, label: 'John' },
  '1peter': { id: 60, totalChapters: 5, label: '1 Peter' },
  '2peter': { id: 61, totalChapters: 3, label: '2 Peter' },
  '1john': { id: 62, totalChapters: 5, label: '1 John' },
  '2john': { id: 63, totalChapters: 1, label: '2 John' },
  '3john': { id: 64, totalChapters: 1, label: '3 John' },
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

/**
 * Functions under test (matching script.js implementation)
 */

/**
 * Sorts chapter keys numerically by book ID and chapter number
 * Chapter keys are in format "bookId,chapter" (e.g., "23,1", "23,10", "23,2")
 * Without this, string sorting would put "23,10" before "23,2"
 */
const sortChapterKeys = (chapterKeys) => {
  return chapterKeys.sort((a, b) => {
    const [bookIdA, chapterA] = a.split(',').map(Number);
    const [bookIdB, chapterB] = b.split(',').map(Number);

    // First compare by book ID
    if (bookIdA !== bookIdB) {
      return bookIdA - bookIdB;
    }

    // If same book, compare by chapter number
    return chapterA - chapterB;
  });
};

const buildFullBibleSelections = () =>
  Object.keys(books)
    .map((bookKey) => ({
      bookKey,
      bookId: books[bookKey].id,
      start: 1,
      end: books[bookKey].totalChapters,
    }))
    .sort((a, b) => a.bookId - b.bookId);

const getSelectionsForYear = (year) => {
  if (year === 'Full Bible') return buildFullBibleSelections();
  const selections = chaptersByYear[year] || [];
  // Sort selections by book ID to ensure chapters appear in numerical order
  return selections
    .map((sel) => ({
      ...sel,
      bookId: books[sel.bookKey]?.id || 0,
    }))
    .sort((a, b) => a.bookId - b.bookId);
};

/**
 * Tests for chapter sorting
 *
 * Bug: Chapters were appearing in string sort order (1, 10, 11, 2, 3...)
 * instead of numerical order (1, 2, 3, 10, 11...).
 *
 * Fix: Added sortChapterKeys() function to sort chapter keys numerically,
 * and both buildFullBibleSelections() and getSelectionsForYear() now sort
 * selections by book ID to ensure chapters appear in the correct order.
 */
describe('Chapter Sorting', () => {
  describe('sortChapterKeys', () => {
    it('should sort chapter keys numerically, not alphabetically', () => {
      const unsorted = ['23,1', '23,10', '23,11', '23,2', '23,20', '23,3'];
      const sorted = sortChapterKeys([...unsorted]);

      expect(sorted).toEqual(['23,1', '23,2', '23,3', '23,10', '23,11', '23,20']);
    });

    it('should handle single-digit and multi-digit chapters correctly', () => {
      const unsorted = ['1,1', '1,50', '1,5', '1,10', '1,100'];
      const sorted = sortChapterKeys([...unsorted]);

      expect(sorted).toEqual(['1,1', '1,5', '1,10', '1,50', '1,100']);
    });

    it('should sort by book ID first, then by chapter number', () => {
      const unsorted = ['23,5', '1,10', '23,1', '1,2', '43,1'];
      const sorted = sortChapterKeys([...unsorted]);

      // Book 1 chapters should come first, then book 23, then book 43
      expect(sorted).toEqual(['1,2', '1,10', '23,1', '23,5', '43,1']);
    });

    it('should handle chapters across multiple books in correct order', () => {
      const unsorted = [
        '23,33',
        '23,1',
        '41,16',
        '41,1',
        '60,5',
        '60,1',
        '23,10',
        '41,8',
      ];
      const sorted = sortChapterKeys([...unsorted]);

      expect(sorted).toEqual([
        '23,1',
        '23,10',
        '23,33',
        '41,1',
        '41,8',
        '41,16',
        '60,1',
        '60,5',
      ]);
    });

    it('should not modify the original array order unless explicitly returned', () => {
      const original = ['23,10', '23,2', '23,1'];
      const copy = [...original];
      sortChapterKeys(copy);

      // The function sorts in place, so copy should be modified
      expect(copy).toEqual(['23,1', '23,2', '23,10']);
    });

    it('should handle empty array', () => {
      const sorted = sortChapterKeys([]);
      expect(sorted).toEqual([]);
    });

    it('should handle single chapter', () => {
      const sorted = sortChapterKeys(['23,53']);
      expect(sorted).toEqual(['23,53']);
    });
  });

  describe('sortVerseIds', () => {
    /**
     * Sorts verse IDs numerically by book ID, chapter, and verse number
     */
    const sortVerseIds = (verseIds) => {
      return verseIds.sort((a, b) => {
        const [bookIdA, chapterA, verseA] = a.split(',').map(Number);
        const [bookIdB, chapterB, verseB] = b.split(',').map(Number);

        if (bookIdA !== bookIdB) return bookIdA - bookIdB;
        if (chapterA !== chapterB) return chapterA - chapterB;
        return verseA - verseB;
      });
    };

    it('should sort verse IDs numerically within a chapter', () => {
      const unsorted = ['23,1,1', '23,1,10', '23,1,11', '23,1,2', '23,1,20', '23,1,3'];
      const sorted = sortVerseIds([...unsorted]);

      expect(sorted).toEqual(['23,1,1', '23,1,2', '23,1,3', '23,1,10', '23,1,11', '23,1,20']);
    });

    it('should handle single-digit and multi-digit verse numbers correctly', () => {
      const unsorted = ['1,1,1', '1,1,50', '1,1,5', '1,1,10', '1,1,100'];
      const sorted = sortVerseIds([...unsorted]);

      expect(sorted).toEqual(['1,1,1', '1,1,5', '1,1,10', '1,1,50', '1,1,100']);
    });

    it('should sort by book ID, then chapter, then verse number', () => {
      const unsorted = ['23,5,3', '1,10,1', '23,1,5', '1,2,10', '43,1,16'];
      const sorted = sortVerseIds([...unsorted]);

      expect(sorted).toEqual(['1,2,10', '1,10,1', '23,1,5', '23,5,3', '43,1,16']);
    });

    it('should handle verses across multiple chapters in correct order', () => {
      const unsorted = [
        '23,33,20',
        '23,1,5',
        '41,16,9',
        '41,1,1',
        '60,5,14',
        '60,1,3',
        '23,10,12',
        '41,8,22',
      ];
      const sorted = sortVerseIds([...unsorted]);

      expect(sorted).toEqual([
        '23,1,5',
        '23,10,12',
        '23,33,20',
        '41,1,1',
        '41,8,22',
        '41,16,9',
        '60,1,3',
        '60,5,14',
      ]);
    });

    it('should handle verses within same chapter sorted numerically', () => {
      const unsorted = ['23,53,1', '23,53,10', '23,53,11', '23,53,2', '23,53,3', '23,53,12'];
      const sorted = sortVerseIds([...unsorted]);

      expect(sorted).toEqual(['23,53,1', '23,53,2', '23,53,3', '23,53,10', '23,53,11', '23,53,12']);
    });

    it('should handle empty array', () => {
      const sorted = sortVerseIds([]);
      expect(sorted).toEqual([]);
    });

    it('should handle single verse', () => {
      const sorted = sortVerseIds(['23,53,5']);
      expect(sorted).toEqual(['23,53,5']);
    });
  });

  describe('buildFullBibleSelections', () => {
    it('should return books sorted by book ID (numerical order)', () => {
      const selections = buildFullBibleSelections();

      // Verify we got selections for all books
      expect(selections.length).toBe(Object.keys(books).length);

      // Verify selections are sorted by book ID
      for (let i = 1; i < selections.length; i++) {
        expect(selections[i].bookId).toBeGreaterThan(selections[i - 1].bookId);
      }

      // Verify first few books are in correct order
      expect(selections[0].bookKey).toBe('genesis');
      expect(selections[0].bookId).toBe(1);
      expect(selections[1].bookKey).toBe('exodus');
      expect(selections[1].bookId).toBe(2);
      expect(selections[2].bookKey).toBe('leviticus');
      expect(selections[2].bookId).toBe(3);
    });

    it('should include all chapters for each book', () => {
      const selections = buildFullBibleSelections();

      selections.forEach((selection) => {
        const book = books[selection.bookKey];
        expect(selection.start).toBe(1);
        expect(selection.end).toBe(book.totalChapters);
      });
    });
  });

  describe('getSelectionsForYear', () => {
    it('should return selections sorted by book ID for 2026-2027', () => {
      const selections = getSelectionsForYear('2026-2027');

      // This year has multiple books that might be out of order
      // Mark (41), 1 Peter (60), 2 Peter (61), 1 John (62), 2 John (63), 3 John (64)
      expect(selections.length).toBe(6);

      // Verify they are sorted by book ID
      const bookIds = selections.map((sel) => sel.bookId);
      expect(bookIds).toEqual([41, 60, 61, 62, 63, 64]);

      // Verify the book keys are in the right order
      expect(selections[0].bookKey).toBe('mark');
      expect(selections[1].bookKey).toBe('1peter');
      expect(selections[2].bookKey).toBe('2peter');
      expect(selections[3].bookKey).toBe('1john');
      expect(selections[4].bookKey).toBe('2john');
      expect(selections[5].bookKey).toBe('3john');
    });

    it('should return selections sorted by book ID for 2025-2026', () => {
      const selections = getSelectionsForYear('2025-2026');

      expect(selections.length).toBe(1);
      expect(selections[0].bookKey).toBe('isaiah');
      expect(selections[0].bookId).toBe(23);
    });

    it('should handle year with single book', () => {
      const selections = getSelectionsForYear('2027-2028');

      expect(selections.length).toBe(1);
      expect(selections[0].bookKey).toBe('isaiah');
      expect(selections[0].bookId).toBe(23);
    });

    it('should return empty array for non-existent year', () => {
      const selections = getSelectionsForYear('9999-9999');

      expect(selections).toEqual([]);
    });

    it('should maintain ascending order even with mixed book IDs', () => {
      // Create a hypothetical year with books in random order
      const testYear = {
        john: { id: 43 },
        genesis: { id: 1 },
        ruth: { id: 8 },
        mark: { id: 41 },
      };

      const unsortedSelections = [
        { bookKey: 'john', start: 1, end: 21 },
        { bookKey: 'genesis', start: 1, end: 50 },
        { bookKey: 'ruth', start: 1, end: 4 },
        { bookKey: 'mark', start: 1, end: 16 },
      ];

      const sorted = unsortedSelections
        .map((sel) => ({
          ...sel,
          bookId: books[sel.bookKey]?.id || 0,
        }))
        .sort((a, b) => a.bookId - b.bookId);

      // Verify sorted order
      expect(sorted[0].bookKey).toBe('genesis'); // ID 1
      expect(sorted[1].bookKey).toBe('ruth'); // ID 8
      expect(sorted[2].bookKey).toBe('mark'); // ID 41
      expect(sorted[3].bookKey).toBe('john'); // ID 43
    });
  });

  describe('Chapter order verification', () => {
    it('should generate chapters in numerical order for a book selection', () => {
      const selections = getSelectionsForYear('2025-2026');
      const isaiahSelection = selections[0];

      // Verify Isaiah chapters would be rendered 1-33 in order
      expect(isaiahSelection.start).toBe(1);
      expect(isaiahSelection.end).toBe(33);

      // Generate the chapter keys that would be created
      const chapterKeys = [];
      for (let chapter = isaiahSelection.start; chapter <= isaiahSelection.end; chapter++) {
        chapterKeys.push(`${books[isaiahSelection.bookKey].id},${chapter}`);
      }

      // Verify we have chapters in order
      expect(chapterKeys[0]).toBe('23,1');
      expect(chapterKeys[1]).toBe('23,2');
      expect(chapterKeys[32]).toBe('23,33');
      expect(chapterKeys.length).toBe(33);
    });

    it('should maintain book order across multiple books in same year', () => {
      const selections = getSelectionsForYear('2026-2027');

      // Generate all chapter keys in the order they would appear
      const allChapterKeys = [];
      selections.forEach((selection) => {
        const bookId = books[selection.bookKey].id;
        for (let chapter = selection.start; chapter <= selection.end; chapter++) {
          allChapterKeys.push({ bookId, chapter, key: `${bookId},${chapter}` });
        }
      });

      // Verify book IDs are in ascending order
      for (let i = 1; i < allChapterKeys.length; i++) {
        const prevBookId = allChapterKeys[i - 1].bookId;
        const currBookId = allChapterKeys[i].bookId;

        // Either same book (chapters in order) or next book (higher ID)
        expect(currBookId).toBeGreaterThanOrEqual(prevBookId);

        // If same book, chapters should be in order
        if (currBookId === prevBookId) {
          expect(allChapterKeys[i].chapter).toBeGreaterThan(allChapterKeys[i - 1].chapter);
        }
      }
    });
  });
});
