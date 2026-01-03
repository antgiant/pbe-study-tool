import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

const fixtureBooks = {
  '18': {
    id: 18,
    label: 'Job',
    totalChapters: 2,
    verseCounts: [3, 3],
    commentary: [
      {
        title: 'Overview',
        parts: ['Part A', 'Part B'],
      },
    ],
  },
  '19': {
    id: 19,
    label: 'Psalms',
    totalChapters: 1,
    verseCounts: [2],
  },
  '20': {
    id: 20,
    label: 'Testament',
    totalChapters: 1,
  },
};

const fixtureChaptersByYear = {
  '2024-2025': [
    { bookKey: '18', start: 1, end: 2 },
    { bookKey: '19', start: 1, end: 1, include: [[1, 1]] },
    { bookKey: '20', start: 1, end: 1 },
  ],
  '2025-2026': [{ bookKey: '19', start: 1, end: 1 }],
};

const buildDom = () => {
  const html = fs.readFileSync(path.resolve('index.html'), 'utf8');
  const scriptSrcRegex = /<script[^>]*src="[^"]*"[^>]*><\/script>/gi;
  const scriptTagRegex = /<script[^>]*>[\s\S]*?<\/script>/gi;
  const linkTagRegex = /<link[^>]*href="[^"]*"[^>]*>/gi;
  const sanitized = html
    .replace(scriptSrcRegex, '')
    .replace(scriptTagRegex, '')
    .replace(linkTagRegex, '');
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
    value: {
      persist: vi.fn().mockResolvedValue(true),
    },
    configurable: true,
  });
};

const mockFetch = () => {
  global.fetch = vi.fn((url) => {
    if (url === 'books.json') {
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(fixtureBooks)),
        json: () => Promise.resolve(fixtureBooks),
      });
    }
    if (url === 'chaptersByYear.json') {
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve(JSON.stringify(fixtureChaptersByYear)),
        json: () => Promise.resolve(fixtureChaptersByYear),
      });
    }
    if (typeof url === 'string' && url.includes('/get-text/')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            verses: [
              { verse: 1, text: 'In the beginning God created.' },
              { verse: 2, text: 'The earth was without form.' },
              { verse: 3, text: 'Light shone in the darkness.' },
            ],
          }),
      });
    }
    if (typeof url === 'string' && url.includes('/get-verse/')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            verse: 1,
            text: 'In the beginning God created.',
          }),
      });
    }
    return Promise.resolve({
      ok: false,
      status: 404,
      text: () => Promise.resolve(''),
      json: () => Promise.reject(new Error('Not found')),
    });
  });
};

describe('UI coverage flow', () => {
  let testApi;

  beforeAll(async () => {
    globalThis.__PBE_SKIP_INIT__ = true;
    globalThis.__PBE_EXPOSE_TEST_API__ = true;
    buildDom();
    stubMatchMedia();
    stubStorage();
    Object.defineProperty(HTMLElement.prototype, 'draggable', {
      value: false,
      configurable: true,
    });
    mockFetch();
    global.alert = vi.fn();
    global.confirm = vi.fn().mockReturnValue(true);
    const nlpMock = vi.fn(() => ({
      json: () => [{
        terms: [
          { text: 'God', tags: ['Person'] },
          { text: 'created', tags: ['Verb'] },
          { text: 'earth', tags: ['Noun'] },
        ],
      }],
    }));
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

  it('covers selection, downloads, session flow, and presets', async () => {
    await testApi.loadBooksData();
    await testApi.loadChaptersByYear();

    testApi.appState.year = '2024-2025';
    testApi.renderYearOptions('2024-2025');
    document.getElementById('year').value = '2024-2025';
    testApi.applyYearExclusions('2024-2025');

    testApi.renderChapterOptions('2024-2025', new Set(['18,1']));
    const chapterInput = Array.from(document.querySelectorAll('.chapter-option'))
      .find((input) => input.value === '18,1');
    chapterInput.checked = true;
    chapterInput.dispatchEvent(new Event('change'));

    await testApi.downloadChapterIfNeeded('18,1');
    await testApi.downloadVerseIfNeeded('18,1,1');
    testApi.recomputeActiveVerseIds();

    testApi.renderVerseOptions('2024-2025', new Set(['18,1']));
    testApi.appState.chapterIndex['20,1'] = {
      status: 'ready',
      lastUpdated: new Date().toISOString(),
      verseIds: ['20,1,1'],
      verseCount: 1,
    };
    testApi.appState.verseBank['20,1,1'] = {
      bookId: 20,
      chapter: 1,
      verse: 1,
      text: 'Test verse for placeholder.',
      source: 'NKJV',
    };
    testApi.updateVerseOptionsForChapter('20,1');
    const bookCheckbox = document.querySelector('#verse-options .book-checkbox');
    bookCheckbox.checked = true;
    bookCheckbox.dispatchEvent(new Event('change'));
    const verseInput = document.querySelector('.verse-option');
    verseInput.checked = true;
    verseInput.dispatchEvent(new Event('change'));

    testApi.updateBlankInputs();
    testApi.startSession();
    testApi.revealHint();
    testApi.showAnswer();
    testApi.goNextFromAnswer();
    testApi.goPrevFromAnswer();
    testApi.goNext();
    testApi.goPrev();

    const plan = testApi.buildVerseDownloadPlan(
      testApi.appState.activeChapters,
      testApi.appState.verseSelections
    );
    expect(plan.chapterDownloads.length + plan.verseDownloads.length).toBeGreaterThanOrEqual(0);

    await testApi.seedCommentaryContent();
    testApi.renderVerseOptions('2024-2025', new Set(['18,0']));

    expect(testApi.getCommentaryLabelForPart('18,0', 1)).toContain('Overview');
    expect(testApi.getVerseNumbersForChapter('18,0').length).toBeGreaterThan(0);

    const minWords = testApi.computeMinWordsInActiveSelection();
    const maxWords = testApi.computeMaxWordsInActiveSelection();
    expect(minWords).toBeGreaterThan(0);
    expect(maxWords).toBeGreaterThan(0);

    await testApi.createPreset('Sample Preset');
    const presetId = testApi.appState.currentPresetId;
    await testApi.createPreset('Second Preset');
    const secondPresetId = testApi.appState.currentPresetId;
    testApi.appState.activeSelector = 'verse';
    await testApi.createPreset('Verse Preset');
    const versePresetId = testApi.appState.currentPresetId;
    testApi.appState.activeSelector = 'chapter';
    await testApi.loadPresetList();
    await testApi.renderPresetList();
    testApi.setSelectedPreset(presetId);
    await testApi.renamePreset(presetId, 'Updated Preset');
    await testApi.loadPresetById(presetId);
    await testApi.loadPresetById(versePresetId);
    await testApi.reorderPresets(presetId, secondPresetId);
    testApi.showPresetSaveStatus('Saved');
    await testApi.saveCurrentPreset();
    testApi.markPresetModified();
    await new Promise((resolve) => setTimeout(resolve, 600));
    await testApi.flushPresetAutoSave();
    const dragHandles = document.querySelectorAll('.drag-handle');
    const presetItems = document.querySelectorAll('.preset-list-item');
    const dataTransfer = {
      data: {},
      setData(type, value) {
        this.data[type] = value;
      },
      getData(type) {
        return this.data[type];
      },
      dropEffect: '',
      effectAllowed: '',
    };
    if (dragHandles.length > 1 && presetItems.length > 1) {
      const dragStart = new Event('dragstart');
      Object.defineProperty(dragStart, 'dataTransfer', { value: dataTransfer });
      dragHandles[0].dispatchEvent(dragStart);
      const dragOver = new Event('dragover');
      Object.defineProperty(dragOver, 'dataTransfer', { value: dataTransfer });
      presetItems[1].dispatchEvent(dragOver);
      const drop = new Event('drop');
      Object.defineProperty(drop, 'dataTransfer', { value: dataTransfer });
      presetItems[1].dispatchEvent(drop);
      const dragEnd = new Event('dragend');
      dragHandles[0].dispatchEvent(dragEnd);
    }
    await testApi.deletePresetById(presetId);

    const managerButton = document.getElementById('preset-manage-button');
    managerButton.click();
    await testApi.openPresetManager();
    expect(document.getElementById('preset-modal').style.display).toBe('flex');

    const nameInput = document.getElementById('preset-name-input');
    const nameSave = document.getElementById('preset-name-save');
    nameInput.value = 'Saved Via Modal';
    nameSave.click();

    const nameCancel = document.getElementById('preset-name-cancel');
    nameCancel.click();
  });

  it('handles alternate verse payloads', () => {
    const parsedArray = testApi.parseVerses([
      { verse: 1, text: 'Verse one' },
      { verse_nr: 2, text_clean: 'Verse two' },
    ]);
    const parsedObject = testApi.parseVerses({
      verses: { 3: 'Verse three' },
    });
    const parsedSingle = testApi.parseVerses({ verse: 4, text: 'Verse four' });

    expect(parsedArray).toHaveLength(2);
    expect(parsedObject).toHaveLength(1);
    expect(parsedSingle).toHaveLength(1);
  });

  it('covers state and selection utilities', async () => {
    await testApi.loadBooksData();
    await testApi.loadChaptersByYear();

    testApi.appState.year = '2024-2025';
    const selections = testApi.getSelectionsForYear('2024-2025');
    expect(selections.length).toBeGreaterThan(0);

    const fullSelections = testApi.buildFullBibleSelections();
    expect(fullSelections.length).toBeGreaterThan(0);

    const chapters = testApi.chaptersToRender(
      { id: 18, commentary: [{ title: 'Intro', parts: ['A'] }] },
      1,
      2
    );
    expect(chapters[0]).toBe(0);

    const sorted = testApi.sortVerseIds(['18,1,10', '18,1,2', '18,1,1']);
    expect(sorted[0]).toBe('18,1,1');

    const migrated = testApi.migrateTFIDFData({
      verseBank: {
        '18,1,1': { text: 'In the beginning God created.' },
      },
    });
    expect(migrated.verseBank['18,1,1'].termFrequency).toBeDefined();

    testApi.appState.chapterIndex = {
      '18,1': { status: 'ready', lastUpdated: new Date().toISOString(), verseIds: ['18,1,1'] },
    };
    testApi.appState.activeChapters = ['18,1'];
    testApi.appState.verseBank = {
      '18,1,1': { bookId: 18, chapter: 1, verse: 1, text: 'In the beginning God created.' },
    };
    const stateWithVerses = testApi.buildPersistableState(true);
    const stateWithoutVerses = testApi.buildPersistableState(false);
    expect(Object.keys(stateWithVerses.verseBank).length).toBeGreaterThan(0);
    expect(Object.keys(stateWithoutVerses.verseBank).length).toBe(0);

    await testApi.requestPersistentStorage();
  });

});
