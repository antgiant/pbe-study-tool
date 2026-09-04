import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * Regression test for a bug where selecting a chapter whose downloaded verse
 * count is lower than the book metadata's declared verseCounts value (e.g.
 * 3 John's metadata claiming 15 verses when the real text only has 14) left
 * the Start button permanently disabled ("nothing selected"), even though the
 * chapter fully downloaded successfully. This reproduced most visibly when
 * the affected chapter was the ONLY thing selected, since no other chapter's
 * verses were available to mask the empty activeVerseIds list.
 */

const fixtureBooks = {
  '3john': { id: 64, label: '3 John', totalChapters: 1, verseCounts: [15] }, // intentionally overstated
};

const fixtureChaptersByYear = {
  '2026-2027': [{ bookKey: '3john', start: 1, end: 1 }],
};

const buildDom = () => {
  const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
  const sanitized = html
    .replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<link[^>]*href="[^"]*"[^>]*>/gi, '');
  document.documentElement.innerHTML = sanitized;
};

const stubMatchMedia = () => {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: true,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};

const stubStorage = () => {
  Object.defineProperty(global.navigator, 'storage', {
    value: { persist: vi.fn().mockResolvedValue(true) },
    configurable: true,
  });
};

const mockFetch = () => {
  global.fetch = vi.fn((url) => {
    if (url === 'books.json') {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(fixtureBooks)), json: () => Promise.resolve(fixtureBooks) });
    }
    if (url === 'chaptersByYear.json') {
      return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify(fixtureChaptersByYear)), json: () => Promise.resolve(fixtureChaptersByYear) });
    }
    // Simulate the real NKJV API returning 14 verses for 3 John chapter 1,
    // one fewer than the (wrong) book metadata claims.
    if (typeof url === 'string' && url.includes('/get-text/NKJV/64/1/')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ verses: Array.from({ length: 14 }, (_, i) => ({ verse: i + 1, text: `3 John verse ${i + 1}` })) }),
      });
    }
    return Promise.resolve({ ok: false, status: 404, text: () => Promise.resolve(''), json: () => Promise.reject(new Error('Not found')) });
  });
};

describe('Chapter selection with mismatched verse count metadata', () => {
  let testApi;

  beforeAll(async () => {
    globalThis.__PBE_SKIP_INIT__ = true;
    globalThis.__PBE_EXPOSE_TEST_API__ = true;
    buildDom();
    stubMatchMedia();
    stubStorage();
    Object.defineProperty(HTMLElement.prototype, 'draggable', { value: false, configurable: true });
    mockFetch();
    global.alert = vi.fn();
    global.confirm = vi.fn().mockReturnValue(true);
    const nlpMock = vi.fn(() => ({ json: () => [{ terms: [] }] }));
    nlpMock.plugin = vi.fn();
    global.nlp = nlpMock;

    await import('../script.js');
    testApi = globalThis.__pbeTestApi;
  });

  afterAll(() => {
    delete globalThis.__PBE_SKIP_INIT__;
    delete globalThis.__PBE_EXPOSE_TEST_API__;
    delete globalThis.__pbeTestApi;
    delete global.fetch;
    delete global.alert;
    delete global.confirm;
    delete global.nlp;
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    Object.assign(testApi.appState, {
      year: '',
      activeChapters: [],
      activeVerseIds: [],
      verseSelections: {},
      chapterVerseCounts: {},
      chapterExclusions: {},
      chapterIndex: {},
      verseBank: {},
      verseErrors: {},
      minBlanks: 1,
      maxBlanks: 1,
      maxBlankPercentage: 100,
      useOnlyPercentage: false,
      fillInBlankPercentage: 100,
      activeSelector: 'chapter',
      currentPresetId: null,
      presetModified: false,
    });
  });

  it('enables the Start button once the only selected chapter fully downloads, even if metadata overstates its verse count', async () => {
    await testApi.loadBooksData();
    await testApi.loadChaptersByYear();

    testApi.appState.year = '2026-2027';
    testApi.applyYearExclusions('2026-2027');
    testApi.renderChapterOptions('2026-2027', new Set());

    const chapterInput = Array.from(document.querySelectorAll('.chapter-option'))
      .find((input) => input.value === '64,1');
    expect(chapterInput).toBeTruthy();

    chapterInput.checked = true;
    chapterInput.dispatchEvent(new Event('change'));

    await testApi.downloadChapterIfNeeded('64,1');

    const entry = testApi.appState.chapterIndex['64,1'];
    expect(entry.status).toBe('ready');
    expect(entry.verseIds.length).toBe(14);

    expect(testApi.appState.activeVerseIds.length).toBe(14);
    expect(document.getElementById('start-button').disabled).toBe(false);
  });
});
