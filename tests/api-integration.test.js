import { describe, it, expect } from 'vitest';

/**
 * API Integration Tests
 *
 * These tests verify that the actual Bible API endpoints are functional.
 * They make real HTTP requests to bolls.life API.
 */
describe('Bible API Integration', () => {
  describe('Chapter API (get-text)', () => {
    it('should fetch a complete chapter from the API', async () => {
      // Test with Isaiah 53
      const bookId = 23;
      const chapter = 53;
      const url = `https://bolls.life/get-text/NKJV/${bookId}/${chapter}/`;

      const response = await fetch(url);
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toBeDefined();

      // The API should return verse data
      // Format may vary, but should contain verses
      expect(data).toBeTruthy();
    });

    it('should fetch Mark 1 from the API', async () => {
      const bookId = 41; // Mark
      const chapter = 1;
      const url = `https://bolls.life/get-text/NKJV/${bookId}/${chapter}/`;

      const response = await fetch(url);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toBeDefined();
    });

    it('should fetch Genesis 1 from the API', async () => {
      const bookId = 1; // Genesis
      const chapter = 1;
      const url = `https://bolls.life/get-text/NKJV/${bookId}/${chapter}/`;

      const response = await fetch(url);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toBeDefined();
    });

    it('should handle invalid chapter gracefully', async () => {
      const bookId = 23;
      const chapter = 999; // Invalid chapter number
      const url = `https://bolls.life/get-text/NKJV/${bookId}/${chapter}/`;

      const response = await fetch(url);
      // API might return 404 or empty data for invalid chapters
      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Verse API (get-verse)', () => {
    it('should fetch a single verse from the API', async () => {
      // Test with John 3:16
      const bookId = 43;
      const chapter = 3;
      const verse = 16;
      const url = `https://bolls.life/get-verse/NKJV/${bookId}/${chapter}/${verse}/`;

      const response = await fetch(url);
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toBeDefined();
      expect(data).toBeTruthy();
    });

    it('should fetch Isaiah 53:5 from the API', async () => {
      const bookId = 23;
      const chapter = 53;
      const verse = 5;
      const url = `https://bolls.life/get-verse/NKJV/${bookId}/${chapter}/${verse}/`;

      const response = await fetch(url);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toBeDefined();
    });

    it('should fetch Genesis 1:1 from the API', async () => {
      const bookId = 1;
      const chapter = 1;
      const verse = 1;
      const url = `https://bolls.life/get-verse/NKJV/${bookId}/${chapter}/${verse}/`;

      const response = await fetch(url);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toBeDefined();
    });

    it('should fetch 1 Peter 1:1 from the API', async () => {
      const bookId = 60; // 1 Peter
      const chapter = 1;
      const verse = 1;
      const url = `https://bolls.life/get-verse/NKJV/${bookId}/${chapter}/${verse}/`;

      const response = await fetch(url);
      expect(response.ok).toBe(true);

      const data = await response.json();
      expect(data).toBeDefined();
    });

    it('should fetch multiple verses sequentially', async () => {
      // Test fetching Isaiah 53:4-6
      const bookId = 23;
      const chapter = 53;
      const verses = [4, 5, 6];

      for (const verse of verses) {
        const url = `https://bolls.life/get-verse/NKJV/${bookId}/${chapter}/${verse}/`;
        const response = await fetch(url);
        expect(response.ok).toBe(true);

        const data = await response.json();
        expect(data).toBeDefined();
      }
    });

    it('should handle invalid verse number gracefully', async () => {
      const bookId = 23;
      const chapter = 53;
      const verse = 999; // Invalid verse number
      const url = `https://bolls.life/get-verse/NKJV/${bookId}/${chapter}/${verse}/`;

      try {
        const response = await fetch(url);
        // API might return 404 or error status for invalid verses
        expect([200, 404, 500]).toContain(response.status);
      } catch (error) {
        // Network errors or CORS errors are also acceptable for invalid requests
        expect(error).toBeDefined();
      }
    });
  });

  describe('API Response Format', () => {
    it('should return parseable JSON for chapter request', async () => {
      const url = 'https://bolls.life/get-text/NKJV/23/53/';
      const response = await fetch(url);
      const data = await response.json();

      // Data should be parseable as JSON
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });

    it('should return parseable JSON for verse request', async () => {
      const url = 'https://bolls.life/get-verse/NKJV/43/3/16/';
      const response = await fetch(url);
      const data = await response.json();

      // Data should be parseable as JSON
      expect(data).toBeDefined();
      expect(typeof data).toBe('object');
    });
  });

  describe('API Endpoint Consistency', () => {
    it('should use consistent URL format for chapters', () => {
      const bookId = 23;
      const chapter = 53;
      const url = `https://bolls.life/get-text/NKJV/${bookId}/${chapter}/`;

      // URL should be properly formatted
      expect(url).toMatch(/^https:\/\/bolls\.life\/get-text\/NKJV\/\d+\/\d+\/$/);
    });

    it('should use consistent URL format for verses', () => {
      const bookId = 23;
      const chapter = 53;
      const verse = 5;
      const url = `https://bolls.life/get-verse/NKJV/${bookId}/${chapter}/${verse}/`;

      // URL should be properly formatted
      expect(url).toMatch(/^https:\/\/bolls\.life\/get-verse\/NKJV\/\d+\/\d+\/\d+\/$/);
    });

    it('should differentiate between chapter and verse endpoints', () => {
      const chapterUrl = 'https://bolls.life/get-text/NKJV/23/53/';
      const verseUrl = 'https://bolls.life/get-verse/NKJV/23/53/5/';

      expect(chapterUrl).toContain('get-text');
      expect(verseUrl).toContain('get-verse');
      expect(chapterUrl).not.toContain('get-verse');
      expect(verseUrl).not.toContain('get-text');
    });
  });

  describe('Network Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      // Use an invalid URL to simulate network error
      const url = 'https://bolls.life/invalid-endpoint/NKJV/23/53/';

      try {
        const response = await fetch(url);
        // If fetch succeeds, response should indicate error
        expect(response.ok).toBe(false);
      } catch (error) {
        // If fetch throws, that's also acceptable
        expect(error).toBeDefined();
      }
    });
  });
});
