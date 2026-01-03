import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

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
    value: {
      persist: vi.fn().mockResolvedValue(true),
    },
    configurable: true,
  });
};

const setupUi = async (fetchImpl) => {
  globalThis.__PBE_SKIP_INIT__ = true;
  globalThis.__PBE_EXPOSE_TEST_API__ = true;
  buildDom();
  stubMatchMedia();
  stubStorage();
  global.fetch = fetchImpl;
  global.alert = vi.fn();
  global.confirm = vi.fn().mockReturnValue(true);
  const nlpMock = vi.fn(() => ({ json: () => [{ terms: [] }] }));
  nlpMock.plugin = vi.fn();
  global.nlp = nlpMock;

  await import('../script.js');
  return globalThis.__pbeTestApi;
};

describe('UI load errors', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete globalThis.__PBE_SKIP_INIT__;
    delete globalThis.__PBE_EXPOSE_TEST_API__;
    delete globalThis.__pbeTestApi;
    delete global.fetch;
    delete global.alert;
    delete global.confirm;
    delete global.nlp;
    vi.restoreAllMocks();
  });

  it('surfaces errors when books.json fails to load', async () => {
    const testApi = await setupUi((url) => {
      if (url === 'books.json') {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve(''),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{}'),
      });
    });

    await expect(testApi.loadBooksData()).rejects.toThrow('Failed to load books.json');
  });

  it('surfaces errors when chaptersByYear.json fails to load', async () => {
    const testApi = await setupUi((url) => {
      if (url === 'chaptersByYear.json') {
        return Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve(''),
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        text: () => Promise.resolve('{}'),
      });
    });

    await expect(testApi.loadChaptersByYear()).rejects.toThrow('Failed to load chaptersByYear.json');
  });
});
